// pages/api/challenges/create.js - No drill count restrictions
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { challenged_team_id, duration_days, start_time, drill_ids, challenge_message } = req.body;

    if (!challenged_team_id || !duration_days || !start_time) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // drill_ids is optional - can create challenge with 0 drills
    const drillIdsArray = drill_ids || [];

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

        // Get user's profile
        const { data: profile } = await supabase
            .from('users')
            .select('active_team_id, role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'coach' || !profile.active_team_id) {
            return res.status(403).json({ error: 'Must be a coach with an active team' });
        }

        const challenger_team_id = profile.active_team_id;

        // Verify all drills belong to challenger's team (if any drills provided)
        let drills = [];
        if (drillIdsArray.length > 0) {
            const { data: fetchedDrills, error: drillsError } = await supabase
                .from('drills')
                .select('*')
                .in('id', drillIdsArray)
                .eq('team_id', challenger_team_id);

            if (drillsError || !fetchedDrills || fetchedDrills.length !== drillIdsArray.length) {
                return res.status(400).json({ error: 'Invalid drills selected - all drills must belong to your team' });
            }
            drills = fetchedDrills;
        }

        // Calculate end time
        const startDate = new Date(start_time);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + parseInt(duration_days));

        // Create challenge (pending acceptance)
        const { data: challenge, error: challengeError } = await supabase
            .from('team_challenges')
            .insert({
                challenger_team_id,
                challenged_team_id,
                status: 'pending',
                duration_days: parseInt(duration_days),
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                challenger_message: challenge_message,
                created_by: user.id
            })
            .select()
            .single();

        if (challengeError) throw challengeError;

        // Create challenge_drills for challenger's drills (if any)
        if (drills.length > 0) {
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
                source_team_id: challenger_team_id
            }));

            const { error: drillsInsertError } = await supabase
                .from('challenge_drills')
                .insert(challengeDrills);

            if (drillsInsertError) throw drillsInsertError;
        }

        return res.status(200).json({
            success: true,
            challenge_id: challenge.id
        });

    } catch (error) {
        console.error('Error creating challenge:', error);
        return res.status(500).json({ error: error.message });
    }
}