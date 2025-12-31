// pages/api/challenges/list.js - Production version (no debug logging)
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { team_id, status } = req.query;

    if (!team_id) {
        return res.status(400).json({ error: 'Team ID is required' });
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

        // Build query - get challenges first
        let query = supabase
            .from('team_challenges')
            .select(`
                *,
                challenger_team:teams!challenger_team_id(id, name, sport, logo_url),
                challenged_team:teams!challenged_team_id(id, name, sport, logo_url),
                winner_team:teams!winner_team_id(id, name)
            `)
            .or(`challenger_team_id.eq.${team_id},challenged_team_id.eq.${team_id}`)
            .order('created_at', { ascending: false });

        // Filter by status if provided
        if (status) {
            const statuses = status.split(',');
            if (statuses.length === 1) {
                query = query.eq('status', status);
            } else {
                query = query.in('status', statuses);
            }
        }

        const { data: challenges, error: challengesError } = await query;

        if (challengesError) throw challengesError;

        // Get all stats for these challenges in one query
        const challengeIds = challenges.map(c => c.id);
        const { data: allStats, error: statsError } = await supabase
            .from('challenge_team_stats')
            .select('*')
            .in('challenge_id', challengeIds);

        if (statsError) throw statsError;

        // Process challenges to add helpful fields
        const processedChallenges = challenges.map(challenge => {
            const isChallenger = challenge.challenger_team_id === team_id;

            // Get stats for both teams
            const challengerStat = allStats?.find(s =>
                s.challenge_id === challenge.id &&
                s.team_id === challenge.challenger_team_id
            );

            const challengedStat = allStats?.find(s =>
                s.challenge_id === challenge.id &&
                s.team_id === challenge.challenged_team_id
            );

            // Determine my stats and opponent stats
            const myStats = isChallenger ? challengerStat : challengedStat;
            const opponentStats = isChallenger ? challengedStat : challengerStat;

            return {
                ...challenge,
                is_challenger: isChallenger,
                opponent_team: isChallenger
                    ? challenge.challenged_team
                    : challenge.challenger_team,
                my_team: isChallenger
                    ? challenge.challenger_team
                    : challenge.challenged_team,
                my_stats: myStats || {
                    total_points: 0,
                    total_reps: 0,
                    participant_count: 0,
                    average_points: 0
                },
                opponent_stats: opponentStats || {
                    total_points: 0,
                    total_reps: 0,
                    participant_count: 0,
                    average_points: 0
                },
                // Keep these for backward compatibility
                challenger_stats: challengerStat ? [challengerStat] : [],
                challenged_stats: challengedStat ? [challengedStat] : [],
                time_remaining: challenge.status === 'active'
                    ? new Date(challenge.end_time) - new Date()
                    : null
            };
        });

        return res.status(200).json({
            success: true,
            challenges: processedChallenges
        });

    } catch (error) {
        console.error('Error listing challenges:', error);
        return res.status(500).json({ error: error.message });
    }
}