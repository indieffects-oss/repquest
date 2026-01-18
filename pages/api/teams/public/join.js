// pages/api/teams/public/join.js
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { team_id } = req.body;

    if (!team_id) {
        return res.status(400).json({ error: 'Missing team_id' });
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

        // Verify user is a player
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('role, active_team_id')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        if (profile.role !== 'player') {
            return res.status(403).json({ error: 'Only players can join public teams' });
        }

        // Verify team is public
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .select('is_public, name')
            .eq('id', team_id)
            .single();

        if (teamError) throw teamError;

        if (!team.is_public) {
            return res.status(403).json({ error: 'This team is not public' });
        }

        // Check if already a member
        const { data: existing, error: existingError } = await supabaseAdmin
            .from('team_members')
            .select('id')
            .eq('team_id', team_id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingError) throw existingError;

        if (existing) {
            return res.status(400).json({ error: 'Already a member of this team' });
        }

        // Add to team
        const { error: joinError } = await supabaseAdmin
            .from('team_members')
            .insert({
                team_id,
                user_id: user.id
            });

        if (joinError) throw joinError;

        // Set as active team if they don't have one
        if (!profile.active_team_id) {
            await supabaseAdmin
                .from('users')
                .update({ active_team_id: team_id })
                .eq('id', user.id);
        }

        return res.status(200).json({
            success: true,
            message: `Successfully joined ${team.name}!`
        });
    } catch (error) {
        console.error('Error joining team:', error);
        return res.status(500).json({ error: error.message });
    }
}