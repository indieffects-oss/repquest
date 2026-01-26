// pages/api/fundraisers/update-progress.js
// FIXED: Use full URL for email notification
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { user_id, points_earned } = req.body;

        if (!user_id || !points_earned) {
            return res.status(400).json({ error: 'Missing user_id or points_earned' });
        }

        // Only allow users to update their own progress
        if (user_id !== user.id) {
            return res.status(403).json({ error: 'Can only update your own progress' });
        }

        // Get current date
        const today = new Date().toISOString().split('T')[0];

        // Find active fundraisers for this user
        const { data: activeFundraisers, error: fundraisersError } = await supabaseAdmin
            .from('fundraisers')
            .select(`
        id,
        start_date,
        end_date,
        fundraiser_type,
        owner_id,
        owner_type
      `)
            .eq('status', 'active')
            .lte('start_date', today)
            .gte('end_date', today);

        if (fundraisersError) throw fundraisersError;

        if (!activeFundraisers || activeFundraisers.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No active fundraisers',
                updated: []
            });
        }

        // Filter to fundraisers this user is part of
        const relevantFundraisers = activeFundraisers.filter(f => {
            if (f.fundraiser_type === 'player' && f.owner_type === 'user') {
                return f.owner_id === user_id;
            }
            return true;
        });

        const updated = [];

        for (const fundraiser of relevantFundraisers) {
            // Get current progress
            const { data: progress, error: progressError } = await supabaseAdmin
                .from('fundraiser_progress')
                .select('*')
                .eq('fundraiser_id', fundraiser.id)
                .eq('user_id', user_id)
                .maybeSingle();

            if (progressError || !progress) {
                console.log(`No progress record for user ${user_id} in fundraiser ${fundraiser.id}`);
                continue;
            }

            // Calculate new totals
            const newFundraiserPoints = progress.fundraiser_points_earned + points_earned;
            const newLevel = Math.floor(newFundraiserPoints / 1000);
            const oldLevel = Math.floor(progress.fundraiser_points_earned / 1000);
            const levelsEarned = newLevel;

            // Update progress
            const { error: updateError } = await supabaseAdmin
                .from('fundraiser_progress')
                .update({
                    current_points: progress.starting_points + newFundraiserPoints,
                    current_level: progress.starting_level + newLevel,
                    fundraiser_points_earned: newFundraiserPoints,
                    fundraiser_levels_earned: levelsEarned,
                    last_updated: new Date().toISOString()
                })
                .eq('fundraiser_id', fundraiser.id)
                .eq('user_id', user_id);

            if (updateError) {
                console.error('Error updating progress:', updateError);
                continue;
            }

            updated.push({
                fundraiser_id: fundraiser.id,
                new_level: newLevel,
                old_level: oldLevel,
                leveled_up: newLevel > oldLevel
            });

            // If player leveled up, notify donors via email
            if (newLevel > oldLevel) {
                console.log(`Player ${user_id} leveled up in fundraiser ${fundraiser.id}: ${oldLevel} -> ${newLevel}`);

                // Get the host URL
                const protocol = req.headers['x-forwarded-proto'] || 'http';
                const host = req.headers['host'];
                const baseUrl = `${protocol}://${host}`;

                // Send level-up notification emails (don't await - let it happen in background)
                fetch(`${baseUrl}/api/fundraisers/send-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fundraiser_id: fundraiser.id,
                        user_id: user_id,
                        notification_type: 'level_up',
                        data: { new_level: newLevel }
                    })
                }).catch(err => console.error('Email notification failed:', err));
            }
        }

        return res.status(200).json({
            success: true,
            message: `Updated ${updated.length} fundraiser(s)`,
            updated
        });
    } catch (error) {
        console.error('Error updating fundraiser progress:', error);
        return res.status(500).json({ error: error.message });
    }
}

// Helper function for client-side usage
export async function updateFundraiserProgress(userId, pointsEarned) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await fetch('/api/fundraisers/update-progress', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                points_earned: pointsEarned
            })
        });
    } catch (error) {
        console.error('Error updating fundraiser progress:', error);
    }
}