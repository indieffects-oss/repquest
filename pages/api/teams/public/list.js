// pages/api/teams/public/list.js
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Fetch all public teams with member count
        const { data: teams, error } = await supabaseAdmin
            .from('teams')
            .select(`
        id,
        name,
        sport,
        skill_level,
        logo_url,
        primary_color,
        secondary_color,
        season_start_date,
        season_end_date,
        created_at
      `)
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get member counts for each team
        const teamsWithCounts = await Promise.all(
            teams.map(async (team) => {
                const { count, error: countError } = await supabaseAdmin
                    .from('team_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', team.id);

                if (countError) {
                    console.error('Error counting members:', countError);
                }

                return {
                    ...team,
                    member_count: count || 0
                };
            })
        );

        return res.status(200).json({ success: true, teams: teamsWithCounts });
    } catch (error) {
        console.error('Error fetching public teams:', error);
        return res.status(500).json({ error: error.message });
    }
}