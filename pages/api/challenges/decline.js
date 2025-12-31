// pages/api/challenges/decline.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { challenge_id, decline_message } = req.body;

    if (!challenge_id) {
        return res.status(400).json({ error: 'Challenge ID is required' });
    }

    try {
        const supabase = supabaseAdmin;

        // Get user from session
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get challenge details
        const { data: challenge, error: challengeError } = await supabase
            .from('team_challenges')
            .select('*, challenged_team:teams!challenged_team_id(coach_id)')
            .eq('id', challenge_id)
            .single();

        if (challengeError || !challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Verify user is coach of challenged team
        if (challenge.challenged_team.coach_id !== user.id) {
            return res.status(403).json({ error: 'Only the challenged team coach can decline' });
        }

        // Verify challenge is pending
        if (challenge.status !== 'pending') {
            return res.status(400).json({ error: 'Challenge is not pending' });
        }

        // Update challenge status to declined
        const { error: updateError } = await supabase
            .from('team_challenges')
            .update({
                status: 'declined',
                decline_message: decline_message || null
            })
            .eq('id', challenge_id);

        if (updateError) throw updateError;

        // TODO: Send notification to challenger coach

        return res.status(200).json({
            success: true,
            message: 'Challenge declined'
        });

    } catch (error) {
        console.error('Error declining challenge:', error);
        return res.status(500).json({ error: error.message });
    }
}