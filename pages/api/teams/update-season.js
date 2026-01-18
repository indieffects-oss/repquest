// pages/api/teams/update-season.js
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { team_id, season_start_date, season_end_date } = req.body;

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

        // Verify coach owns this team
        const { data: team, error: teamError } = await supabaseAdmin
            .from('teams')
            .select('coach_id')
            .eq('id', team_id)
            .single();

        if (teamError) throw teamError;

        if (!team || team.coach_id !== user.id) {
            return res.status(403).json({ error: 'Not authorized for this team' });
        }

        // Validate dates if both provided
        if (season_start_date && season_end_date) {
            const start = new Date(season_start_date);
            const end = new Date(season_end_date);

            if (end <= start) {
                return res.status(400).json({ error: 'End date must be after start date' });
            }
        }

        // Update season dates
        const { error: updateError } = await supabaseAdmin
            .from('teams')
            .update({
                season_start_date: season_start_date || null,
                season_end_date: season_end_date || null
            })
            .eq('id', team_id);

        if (updateError) throw updateError;

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating season dates:', error);
        return res.status(500).json({ error: error.message });
    }
}