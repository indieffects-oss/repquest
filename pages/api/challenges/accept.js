// pages/api/challenges/accept.js - No drill count restrictions
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { challenge_id, drill_ids } = req.body;

    if (!challenge_id) {
        return res.status(400).json({ error: 'Challenge ID is required' });
    }

    // Allow accepting with no drills (optional participation)
    if (!drill_ids || drill_ids.length === 0) {
        // Just update status without adding drills
        try {
            const supabase = supabaseAdmin;
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);

            if (authError || !user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { data: challenge } = await supabase
                .from('team_challenges')
                .select('*')
                .eq('id', challenge_id)
                .single();

            if (!challenge) {
                return res.status(404).json({ error: 'Challenge not found' });
            }

            const { data: profile } = await supabase
                .from('users')
                .select('active_team_id, role')
                .eq('id', user.id)
                .single();

            if (!profile || profile.role !== 'coach' || profile.active_team_id !== challenge.challenged_team_id) {
                return res.status(403).json({ error: 'Only the challenged coach can accept' });
            }

            if (challenge.status !== 'pending') {
                return res.status(400).json({ error: 'Challenge already responded to' });
            }

            const now = new Date();
            const startTime = new Date(challenge.start_time);
            const newStatus = startTime <= now ? 'active' : 'scheduled';

            await supabase
                .from('team_challenges')
                .update({ status: newStatus })
                .eq('id', challenge_id);

            await supabase
                .from('challenge_team_stats')
                .insert([
                    {
                        challenge_id: challenge.id,
                        team_id: challenge.challenger_team_id,
                        total_points: 0,
                        total_reps: 0,
                        participant_count: 0,
                        average_points: 0
                    },
                    {
                        challenge_id: challenge.id,
                        team_id: challenge.challenged_team_id,
                        total_points: 0,
                        total_reps: 0,
                        participant_count: 0,
                        average_points: 0
                    }
                ]);

            return res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error accepting challenge:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    try {
        const supabase = supabaseAdmin;

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get challenge
        const { data: challenge, error: challengeError } = await supabase
            .from('team_challenges')
            .select('*')
            .eq('id', challenge_id)
            .single();

        if (challengeError || !challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        // Get user's profile
        const { data: profile } = await supabase
            .from('users')
            .select('active_team_id, role')
            .eq('id', user.id)
            .single();

        // Verify user is the challenged team's coach
        if (!profile || profile.role !== 'coach' || profile.active_team_id !== challenge.challenged_team_id) {
            return res.status(403).json({ error: 'Only the challenged coach can accept' });
        }

        // Verify challenge is pending
        if (challenge.status !== 'pending') {
            return res.status(400).json({ error: 'Challenge already responded to' });
        }

        // Verify all drills belong to challenged team (NO count restrictions)
        const { data: drills, error: drillsError } = await supabase
            .from('drills')
            .select('*')
            .in('id', drill_ids)
            .eq('team_id', challenge.challenged_team_id);

        if (drillsError || !drills || drills.length !== drill_ids.length) {
            return res.status(400).json({ error: 'Invalid drills selected - all drills must belong to your team' });
        }

        // Add challenged team's drills
        const challengeDrills = drills.map(drill => ({
            challenge_id: challenge.id,
            original_drill_id: drill.id,
            name: drill.name,
            type: drill.type,
            description: drill.description,
            video_url: drill.video_url,
            duration: drill.duration,
            points_per_rep: drill.points_per_rep,
            points_for_completion: drill.points_for_completion,
            skip_rep_input: drill.skip_rep_input,
            source_team_id: challenge.challenged_team_id
        }));

        const { error: drillsInsertError } = await supabase
            .from('challenge_drills')
            .insert(challengeDrills);

        if (drillsInsertError) throw drillsInsertError;

        // Determine status based on start time
        const now = new Date();
        const startTime = new Date(challenge.start_time);
        const newStatus = startTime <= now ? 'active' : 'scheduled';

        // Update challenge status
        const { error: updateError } = await supabase
            .from('team_challenges')
            .update({ status: newStatus })
            .eq('id', challenge_id);

        if (updateError) throw updateError;

        // Initialize team stats
        await supabase
            .from('challenge_team_stats')
            .insert([
                {
                    challenge_id: challenge.id,
                    team_id: challenge.challenger_team_id,
                    total_points: 0,
                    total_reps: 0,
                    participant_count: 0,
                    average_points: 0
                },
                {
                    challenge_id: challenge.id,
                    team_id: challenge.challenged_team_id,
                    total_points: 0,
                    total_reps: 0,
                    participant_count: 0,
                    average_points: 0
                }
            ]);

        return res.status(200).json({
            success: true
        });

    } catch (error) {
        console.error('Error accepting challenge:', error);
        return res.status(500).json({ error: error.message });
    }
}