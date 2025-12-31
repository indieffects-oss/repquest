// pages/api/challenges/[id]/leaderboard.js
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

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
            .select('*, challenger_team:teams!challenger_team_id(name), challenged_team:teams!challenged_team_id(name)')
            .eq('id', id)
            .single();

        if (challengeError) throw challengeError;

        // Get team stats
        const { data: teamStats, error: statsError } = await supabase
            .from('challenge_team_stats')
            .select('*')
            .eq('challenge_id', id);

        if (statsError) throw statsError;

        // Get all challenge results with user details
        const { data: results, error: resultsError } = await supabase
            .from('challenge_results')
            .select(`
        user_id,
        team_id,
        points,
        reps,
        users:user_id (
          display_name,
          jersey_number,
          profile_picture_url
        )
      `)
            .eq('challenge_id', id);

        if (resultsError) throw resultsError;

        // Aggregate points per user
        const userPointsMap = {};
        results.forEach(result => {
            if (!userPointsMap[result.user_id]) {
                userPointsMap[result.user_id] = {
                    user_id: result.user_id,
                    team_id: result.team_id,
                    total_points: 0,
                    total_reps: 0,
                    display_name: result.users.display_name,
                    jersey_number: result.users.jersey_number,
                    profile_picture_url: result.users.profile_picture_url
                };
            }
            userPointsMap[result.user_id].total_points += result.points;
            userPointsMap[result.user_id].total_reps += result.reps;
        });

        // Convert to array and sort by points
        const players = Object.values(userPointsMap)
            .sort((a, b) => b.total_points - a.total_points);

        // Separate by team
        const team1Players = players.filter(p => p.team_id === challenge.challenger_team_id);
        const team2Players = players.filter(p => p.team_id === challenge.challenged_team_id);

        return res.status(200).json({
            success: true,
            challenge: {
                id: challenge.id,
                status: challenge.status,
                challenger_team_name: challenge.challenger_team.name,
                challenged_team_name: challenge.challenged_team.name,
                start_time: challenge.start_time,
                end_time: challenge.end_time
            },
            team_stats: {
                challenger: teamStats.find(s => s.team_id === challenge.challenger_team_id) || {
                    total_points: 0,
                    participant_count: 0,
                    average_points: 0
                },
                challenged: teamStats.find(s => s.team_id === challenge.challenged_team_id) || {
                    total_points: 0,
                    participant_count: 0,
                    average_points: 0
                }
            },
            players: {
                all: players,
                team1: team1Players,
                team2: team2Players
            }
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return res.status(500).json({ error: error.message });
    }
}