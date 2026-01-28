// pages/api/fundraisers/create.js
// Creates a new fundraiser (player or team level)
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Auth check
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user profile
        const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('role, active_team_id')
            .eq('id', user.id)
            .single();

        if (!userProfile) {
            return res.status(403).json({ error: 'User profile not found' });
        }

        const {
            fundraiser_type, // 'player' or 'team'
            owner_id, // user_id for player, team_id for team
            title,
            description,
            start_date,
            end_date,
            goal_amount,
            estimated_min_levels,
            estimated_max_levels,
            prize_tiers
        } = req.body;

        // Validation
        if (!fundraiser_type || !owner_id || !title || !start_date || !end_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['player', 'team'].includes(fundraiser_type)) {
            return res.status(400).json({ error: 'Invalid fundraiser type' });
        }

        // Role-based validation
        if (fundraiser_type === 'team' && userProfile.role !== 'coach') {
            return res.status(403).json({ error: 'Only coaches can create team fundraisers' });
        }

        if (fundraiser_type === 'player' && userProfile.role !== 'player') {
            return res.status(403).json({ error: 'Only players can create player fundraisers' });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (endDate <= startDate) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        // Determine owner_type and validate ownership
        let owner_type;
        let team_id;

        if (fundraiser_type === 'player') {
            owner_type = 'user';

            // Verify player is creating for themselves
            if (owner_id !== user.id) {
                return res.status(403).json({ error: 'You can only create fundraisers for yourself' });
            }

            // Verify player has an active team
            if (!userProfile.active_team_id) {
                return res.status(400).json({ error: 'You must be on a team to create a fundraiser' });
            }

            team_id = userProfile.active_team_id;
        } else {
            // Team fundraiser
            owner_type = 'team';

            // Verify team exists and coach owns it
            const { data: team, error: teamError } = await supabaseAdmin
                .from('teams')
                .select('id, coach_id')
                .eq('id', owner_id)
                .single();

            if (teamError || !team) {
                return res.status(404).json({ error: 'Team not found' });
            }

            if (team.coach_id !== user.id) {
                return res.status(403).json({ error: 'You do not own this team' });
            }

            team_id = owner_id;
        }

        // Create fundraiser
        const { data: fundraiser, error: createError } = await supabaseAdmin
            .from('fundraisers')
            .insert({
                fundraiser_type,
                owner_type,
                owner_id,
                title: title.trim(),
                description: description?.trim() || null,
                start_date,
                end_date,
                goal_amount: goal_amount || null,
                estimated_min_levels: estimated_min_levels || 0,
                estimated_max_levels: estimated_max_levels || 0,
                prize_tiers: prize_tiers || [],
                created_by: user.id,
                team_id,
                status: 'active'
            })
            .select()
            .single();

        if (createError) throw createError;

        // Initialize progress tracking
        if (fundraiser_type === 'player') {
            // Get player's current points FOR THIS TEAM ONLY
            const { data: playerResults } = await supabaseAdmin
                .from('drill_results')
                .select('points_earned')
                .eq('user_id', owner_id)
                .eq('team_id', team_id);

            const teamPoints = playerResults?.reduce((sum, r) => sum + (r.points_earned || 0), 0) || 0;
            const currentLevel = Math.floor(teamPoints / 1000);

            await supabaseAdmin
                .from('fundraiser_progress')
                .insert({
                    fundraiser_id: fundraiser.id,
                    user_id: owner_id,
                    starting_points: teamPoints,
                    starting_level: currentLevel,
                    current_points: teamPoints,
                    current_level: currentLevel,
                    fundraiser_points_earned: 0,
                    fundraiser_levels_earned: 0
                });
        } else {
            // For team fundraisers, initialize progress for all team members
            const { data: teamMembers } = await supabaseAdmin
                .from('team_members')
                .select('user_id')
                .eq('team_id', owner_id);

            if (teamMembers && teamMembers.length > 0) {
                // Get points for each member FOR THIS TEAM ONLY
                const progressEntries = await Promise.all(teamMembers.map(async member => {
                    const { data: memberResults } = await supabaseAdmin
                        .from('drill_results')
                        .select('points_earned')
                        .eq('user_id', member.user_id)
                        .eq('team_id', team_id);

                    const teamPoints = memberResults?.reduce((sum, r) => sum + (r.points_earned || 0), 0) || 0;
                    const currentLevel = Math.floor(teamPoints / 1000);

                    return {
                        fundraiser_id: fundraiser.id,
                        user_id: member.user_id,
                        starting_points: teamPoints,
                        starting_level: currentLevel,
                        current_points: teamPoints,
                        current_level: currentLevel,
                        fundraiser_points_earned: 0,
                        fundraiser_levels_earned: 0
                    };
                }));

                await supabaseAdmin
                    .from('fundraiser_progress')
                    .insert(progressEntries);
            }
        }

        return res.status(201).json({
            success: true,
            fundraiser
        });
    } catch (error) {
        console.error('Error creating fundraiser:', error);
        return res.status(500).json({ error: error.message });
    }
}