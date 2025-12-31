// pages/challenges/[id].js - Challenge detail and leaderboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ChallengeDetail({ user, userProfile }) {
    const router = useRouter();
    const { id } = router.query;
    const [challenge, setChallenge] = useState(null);
    const [drills, setDrills] = useState([]);
    const [teamStats, setTeamStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (id && userProfile) {
            fetchChallengeDetails();
            fetchLeaderboard();

            // Auto-refresh every 30 seconds for active challenges
            const interval = setInterval(() => {
                fetchChallengeDetails();
                fetchLeaderboard();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [id, userProfile]);

    const fetchChallengeDetails = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/challenges/${id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setChallenge(result.challenge);
                setDrills(result.drills);
                setTeamStats(result.team_stats);
            }
        } catch (err) {
            console.error('Error fetching challenge:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/challenges/${id}/leaderboard`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setLeaderboard(result);
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        }
    };

    const manuallyCompleteChallenge = async () => {
        if (!confirm('Manually complete this challenge and determine the winner?')) return;

        setCompleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const { data, error } = await supabase.rpc('complete_challenge', {
                p_challenge_id: id
            });

            if (error) throw error;

            alert('Challenge completed! 🏆');
            fetchChallengeDetails();
            fetchLeaderboard();
        } catch (err) {
            console.error('Error completing challenge:', err);
            alert('Failed to complete challenge: ' + err.message);
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading challenge...</div>
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Challenge Not Found</h2>
                        <button
                            onClick={() => router.push('/challenges')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            Back to Challenges
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isChallenger = challenge.challenger_team_id === userProfile.active_team_id;
    const myTeam = isChallenger ? challenge.challenger_team : challenge.challenged_team;
    const opponentTeam = isChallenger ? challenge.challenged_team : challenge.challenger_team;
    const myStats = teamStats?.[isChallenger ? 'challenger' : 'challenged'];
    const opponentStats = teamStats?.[isChallenger ? 'challenged' : 'challenger'];

    const isActive = challenge.status === 'active';
    const isCompleted = challenge.status === 'completed';
    const canManuallyComplete = isActive && userProfile.role === 'coach';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/challenges')}
                        className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
                    >
                        ← Back to Challenges
                    </button>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {myTeam.name} vs {opponentTeam.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${challenge.status === 'active' ? 'bg-green-600 text-white' :
                                        challenge.status === 'scheduled' ? 'bg-blue-600 text-white' :
                                            challenge.status === 'pending' ? 'bg-yellow-600 text-white' :
                                                challenge.status === 'completed' ? 'bg-gray-600 text-white' :
                                                    'bg-red-600 text-white'
                                    }`}>
                                    {challenge.status.toUpperCase()}
                                </span>
                                <div className="text-sm text-gray-400">
                                    <span className="font-semibold">Duration:</span> {challenge.duration_days} days
                                </div>
                                <div className="text-sm text-gray-400">
                                    <span className="font-semibold">Start:</span> {new Date(challenge.start_time).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-400">
                                    <span className="font-semibold">End:</span> {new Date(challenge.end_time).toLocaleString()}
                                </div>
                                {isActive && challenge.time_remaining_formatted && (
                                    <span className="text-yellow-400 font-semibold">
                                        ⏱️ {challenge.time_remaining_formatted} remaining
                                    </span>
                                )}
                            </div>
                        </div>

                        {canManuallyComplete && (
                            <button
                                onClick={manuallyCompleteChallenge}
                                disabled={completing}
                                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                            >
                                {completing ? 'Completing...' : '🏁 Manually Complete'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Challenge Message */}
                {challenge.challenger_message && (
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
                        <p className="text-yellow-200 italic">"{challenge.challenger_message}"</p>
                        <p className="text-xs text-yellow-400 mt-1">- {challenge.challenger_team.name}</p>
                    </div>
                )}

                {/* Score Display */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4 text-center">Current Score</h2>

                    <div className="grid grid-cols-2 gap-6">
                        {/* My Team */}
                        <div className="text-center">
                            <div className="text-gray-400 text-sm mb-2">{myTeam.name}</div>
                            <div className="text-5xl font-bold text-white mb-2">
                                {myStats?.average_points?.toFixed(1) || '0.0'}
                            </div>
                            <div className="text-sm text-gray-400">
                                {myStats?.participant_count || 0} players participating
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {myStats?.total_points || 0} total points
                            </div>
                        </div>

                        {/* Opponent Team */}
                        <div className="text-center">
                            <div className="text-gray-400 text-sm mb-2">{opponentTeam.name}</div>
                            <div className="text-5xl font-bold text-white mb-2">
                                {opponentStats?.average_points?.toFixed(1) || '0.0'}
                            </div>
                            <div className="text-sm text-gray-400">
                                {opponentStats?.participant_count || 0} players participating
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {opponentStats?.total_points || 0} total points
                            </div>
                        </div>
                    </div>

                    {/* Winner Announcement */}
                    {isCompleted && (
                        <div className={`mt-6 p-4 rounded-lg border-2 text-center ${challenge.is_tie
                                ? 'bg-gray-700/50 border-gray-500'
                                : challenge.winner_team_id === myTeam.id
                                    ? 'bg-green-900/30 border-green-500'
                                    : 'bg-red-900/30 border-red-500'
                            }`}>
                            <div className="text-2xl font-bold text-white">
                                {challenge.is_tie
                                    ? '🤝 TIE GAME!'
                                    : challenge.winner_team_id === myTeam.id
                                        ? '🏆 YOUR TEAM WON!'
                                        : `😞 ${opponentTeam.name.toUpperCase()} WON`
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* Challenge Drills */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Challenge Drills</h2>

                    {drills.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No drills in this challenge</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {drills.map(drill => {
                                const DrillWrapper = userProfile?.role === 'player' ? 'button' : 'div';

                                return (
                                    <DrillWrapper
                                        key={drill.id}
                                        onClick={userProfile?.role === 'player' ? () => router.push(`/player?drillId=${drill.original_drill_id}`) : undefined}
                                        className={`bg-gray-700/50 rounded-lg p-4 border border-gray-600 ${userProfile?.role === 'player'
                                                ? 'cursor-pointer hover:border-blue-500 hover:bg-gray-700 transition'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-white font-semibold">{drill.name}</h3>
                                            <div className="flex gap-1">
                                                <span className="text-xs bg-gray-600 px-2 py-1 rounded capitalize">
                                                    {drill.type}
                                                </span>
                                                {userProfile?.role === 'player' && (
                                                    <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                                                        ▶️ Start
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {drill.description && (
                                            <p className="text-gray-400 text-sm mb-2 line-clamp-2">{drill.description}</p>
                                        )}

                                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                                            <span>
                                                {myTeam.name}: {drill.team1_completed_by || 0} completed
                                            </span>
                                            <span>
                                                {opponentTeam.name}: {drill.team2_completed_by || 0} completed
                                            </span>
                                        </div>
                                    </DrillWrapper>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Player Leaderboard */}
                {leaderboard && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">Player Leaderboard</h2>

                        {leaderboard.players.all.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">
                                No players have completed drills yet. Be the first!
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-gray-300 text-sm">Rank</th>
                                            <th className="px-4 py-3 text-left text-gray-300 text-sm">Player</th>
                                            <th className="px-4 py-3 text-left text-gray-300 text-sm">Team</th>
                                            <th className="px-4 py-3 text-right text-gray-300 text-sm">Points</th>
                                            <th className="px-4 py-3 text-right text-gray-300 text-sm hidden sm:table-cell">Reps</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaderboard.players.all.map((player, index) => {
                                            const isMyTeam = player.team_id === myTeam.id;
                                            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                                            return (
                                                <tr
                                                    key={player.user_id}
                                                    className={`border-b border-gray-700 ${isMyTeam ? 'bg-blue-900/20' : 'bg-gray-750'
                                                        }`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {rankEmoji && <span className="text-xl">{rankEmoji}</span>}
                                                            <span className="text-white font-semibold">#{index + 1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            {player.profile_picture_url ? (
                                                                <img
                                                                    src={player.profile_picture_url}
                                                                    alt={player.display_name}
                                                                    className="w-8 h-8 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 text-xs">
                                                                    👤
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-white font-medium">{player.display_name}</div>
                                                                {player.jersey_number && (
                                                                    <div className="text-xs text-gray-400">#{player.jersey_number}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-sm ${isMyTeam ? 'text-blue-400' : 'text-gray-400'}`}>
                                                            {isMyTeam ? myTeam.name : opponentTeam.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-white font-bold">{player.total_points}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                                                        <span className="text-gray-400">{player.total_reps}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}