// pages/api/challenges/create.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        challenged_team_id,
        duration_days,
        start_time,
        drill_ids,
        challenge_message
    } = req.body;

    // Validation
    if (!challenged_team_id || !duration_days || !start_time || !drill_ids || drill_ids.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
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

        // Get user's profile to find active team
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('active_team_id, role')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            return res.status(403).json({ error: 'User profile not found' });
        }

        if (userProfile.role !== 'coach') {
            return res.status(403).json({ error: 'You must be a coach to create challenges' });
        }

        if (!userProfile.active_team_id) {
            return res.status(403).json({ error: 'Please select an active team first' });
        }

        // Verify user is coach of the active team
        const { data: userTeam, error: teamError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('id', userProfile.active_team_id)
            .eq('coach_id', user.id)
            .single();

        if (teamError || !userTeam) {
            return res.status(403).json({ error: 'You are not the coach of the selected team' });
        }

        const challenger_team_id = userTeam.id;


        // Validate teams are different
        if (challenger_team_id === challenged_team_id) {
            return res.status(400).json({ error: 'Cannot challenge your own team' });
        }

        // Calculate end_time
        const startDate = new Date(start_time);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + parseInt(duration_days));

        // Determine initial status
        const now = new Date();
        const status = startDate <= now ? 'active' : 'pending';

        // Create challenge
        const { data: challenge, error: challengeError } = await supabase
            .from('team_challenges')
            .insert({
                challenger_team_id,
                challenged_team_id,
                duration_days: parseInt(duration_days),
                start_time: startDate.toISOString(),
                end_time: endDate.toISOString(),
                status,
                challenger_message: challenge_message || null,
                created_by: user.id
            })
            .select()
            .single();

        if (challengeError) throw challengeError;

        // Get drill details and create challenge_drills
        const { data: drills, error: drillsError } = await supabase
            .from('drills')
            .select('*')
            .in('id', drill_ids);

        if (drillsError) throw drillsError;

        // Create challenge_drills entries
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
            source_team_id: drill.team_id,
            skip_rep_input: drill.skip_rep_input
        }));

        const { error: drillInsertError } = await supabase
            .from('challenge_drills')
            .insert(challengeDrills);

        if (drillInsertError) throw drillInsertError;

        // Get challenged team coach info for notification
        const { data: challengedTeam } = await supabase
            .from('teams')
            .select('name, coach_id, users!teams_coach_id_fkey(email, display_name)')
            .eq('id', challenged_team_id)
            .single();

        // TODO: Send email notification to challenged coach
        // You can integrate with your Resend setup here

        return res.status(200).json({
            success: true,
            challenge_id: challenge.id,
            message: 'Challenge created successfully'
        });

    } catch (error) {
        console.error('Error creating challenge:', error);
        return res.status(500).json({ error: error.message });
    }
}