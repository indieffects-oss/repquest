// pages/api/challenges/[id].js - Updated to include drill counts
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'Challenge ID is required' });
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

        // Get challenge details
        const { data: challenge, error: challengeError } = await supabase
            .from('team_challenges')
            .select(`
                *,
                challenger_team:teams!challenger_team_id(id, name, sport, logo_url, primary_color, secondary_color),
                challenged_team:teams!challenged_team_id(id, name, sport, logo_url, primary_color, secondary_color),
                winner_team:teams!winner_team_id(id, name)
            `)
            .eq('id', id)
            .single();

        if (challengeError) throw challengeError;

        // Get challenge drills
        const { data: drills, error: drillsError } = await supabase
            .from('challenge_drills')
            .select('*')
            .eq('challenge_id', id)
            .order('created_at');

        if (drillsError) throw drillsError;

        // Count drills by team
        const challengerDrillCount = drills.filter(d => d.source_team_id === challenge.challenger_team_id).length;
        const challengedDrillCount = drills.filter(d => d.source_team_id === challenge.challenged_team_id).length;

        // Get team stats
        const { data: teamStats, error: statsError } = await supabase
            .from('challenge_team_stats')
            .select('*')
            .eq('challenge_id', id);

        if (statsError) throw statsError;

        // Get drill completion counts per team
        const { data: completions, error: completionsError } = await supabase
            .from('challenge_results')
            .select('drill_id, team_id, user_id')
            .eq('challenge_id', id);

        if (completionsError) throw completionsError;

        // Process drill completion stats
        const drillStats = drills.map(drill => {
            const drillCompletions = completions.filter(c => c.drill_id === drill.original_drill_id);
            const team1Completions = drillCompletions.filter(c => c.team_id === challenge.challenger_team_id);
            const team2Completions = drillCompletions.filter(c => c.team_id === challenge.challenged_team_id);

            return {
                ...drill,
                team1_completed_by: [...new Set(team1Completions.map(c => c.user_id))].length,
                team2_completed_by: [...new Set(team2Completions.map(c => c.user_id))].length
            };
        });

        // Calculate time remaining
        const now = new Date();
        const endTime = new Date(challenge.end_time);
        const timeRemaining = challenge.status === 'active' ? endTime - now : null;

        return res.status(200).json({
            success: true,
            challenge: {
                ...challenge,
                challenger_drill_count: challengerDrillCount,
                challenged_drill_count: challengedDrillCount,
                time_remaining: timeRemaining,
                time_remaining_formatted: timeRemaining ? formatTimeRemaining(timeRemaining) : null
            },
            drills: drillStats,
            team_stats: {
                challenger: teamStats.find(s => s.team_id === challenge.challenger_team_id) || {
                    total_points: 0,
                    total_reps: 0,
                    participant_count: 0,
                    average_points: 0
                },
                challenged: teamStats.find(s => s.team_id === challenge.challenged_team_id) || {
                    total_points: 0,
                    total_reps: 0,
                    participant_count: 0,
                    average_points: 0
                }
            }
        });

    } catch (error) {
        console.error('Error fetching challenge details:', error);
        return res.status(500).json({ error: error.message });
    }
}

function formatTimeRemaining(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}