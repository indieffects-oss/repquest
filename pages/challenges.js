// pages/challenges.js - Production version (no debug logging)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Challenges({ user, userProfile }) {
    const router = useRouter();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');
    const [responding, setResponding] = useState(null);

    useEffect(() => {
        if (userProfile?.role !== 'coach') {
            router.push('/drills');
            return;
        }

        if (!userProfile?.active_team_id) {
            setLoading(false);
            return;
        }

        fetchChallenges();
    }, [userProfile, activeTab]);

    const fetchChallenges = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(
                `/api/challenges/list?team_id=${userProfile.active_team_id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                }
            );

            const result = await response.json();

            if (result.success) {
                // Check if any scheduled challenges should be activated (Backup to cron)
                const now = new Date();
                const scheduledToActivate = result.challenges.filter(c =>
                    c.status === 'scheduled' &&
                    new Date(c.start_time) <= now
                );

                if (scheduledToActivate.length > 0) {
                    // Activate them
                    for (const challenge of scheduledToActivate) {
                        await supabase
                            .from('team_challenges')
                            .update({ status: 'active' })
                            .eq('id', challenge.id)
                            .eq('status', 'scheduled');
                    }
                    // Refetch to show updated statuses
                    setTimeout(() => fetchChallenges(), 500);
                    return;
                }

                // Filter by tab
                let filtered = result.challenges;

                if (activeTab === 'active') {
                    filtered = filtered.filter(c => c.status === 'active' || c.status === 'scheduled');
                } else if (activeTab === 'pending') {
                    filtered = filtered.filter(c => c.status === 'pending');
                } else if (activeTab === 'past') {
                    filtered = filtered.filter(c => c.status === 'completed' || c.status === 'declined' || c.status === 'cancelled');
                }

                setChallenges(filtered);
            }
        } catch (err) {
            console.error('Error fetching challenges:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (challengeId) => {
        if (!confirm('Accept this challenge?')) return;

        setResponding(challengeId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/challenges/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ challenge_id: challengeId })
            });

            const result = await response.json();
            if (result.success) {
                alert('Challenge accepted! Let the competition begin! 🏆');
                fetchChallenges();
            } else {
                alert('Failed to accept challenge: ' + result.error);
            }
        } catch (err) {
            console.error('Error accepting challenge:', err);
            alert('Failed to accept challenge');
        } finally {
            setResponding(null);
        }
    };

    const handleDecline = async (challengeId) => {
        const message = prompt('Decline reason (optional):');
        if (message === null) return;

        setResponding(challengeId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/challenges/decline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ challenge_id: challengeId, decline_message: message })
            });

            const result = await response.json();
            if (result.success) {
                alert('Challenge declined');
                fetchChallenges();
            } else {
                alert('Failed to decline challenge: ' + result.error);
            }
        } catch (err) {
            console.error('Error declining challenge:', err);
            alert('Failed to decline challenge');
        } finally {
            setResponding(null);
        }
    };

    const formatTimeRemaining = (endTime) => {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h left`;
        return `${hours}h left`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading challenges...</div>
            </div>
        );
    }

    if (!userProfile?.active_team_id) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Select a Team</h2>
                        <p className="text-gray-400 mb-6">
                            Please select which team you want to manage from the dropdown in the navbar.
                        </p>
                        <button
                            onClick={() => router.push('/teams')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            Go to Teams
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">🏆 Team Challenges</h1>
                    <p className="text-gray-400">Compete against other teams</p>
                </div>

                {/* Create Challenge Button */}
                <button
                    onClick={() => router.push('/challenges/create')}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-lg font-semibold text-lg mb-6 transition"
                >
                    + Create New Challenge
                </button>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === 'active'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === 'pending'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${activeTab === 'past'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        Past
                    </button>
                </div>

                {/* Challenges List */}
                {challenges.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            No {activeTab} challenges
                        </h3>
                        <p className="text-gray-400 mb-6">
                            {activeTab === 'active' && 'Create a challenge to get started!'}
                            {activeTab === 'pending' && 'No pending challenges at the moment'}
                            {activeTab === 'past' && 'No completed challenges yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {challenges.map(challenge => {
                            const isPending = challenge.status === 'pending';
                            const isChallenger = challenge.is_challenger;
                            const needsResponse = isPending && !isChallenger;

                            return (
                                <div
                                    key={challenge.id}
                                    className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-white">
                                                    vs {challenge.opponent_team.name}
                                                </h3>
                                                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${challenge.status === 'active' ? 'bg-green-600 text-white' :
                                                    challenge.status === 'scheduled' ? 'bg-blue-600 text-white' :
                                                        challenge.status === 'pending' ? 'bg-yellow-600 text-white' :
                                                            challenge.status === 'completed' ? 'bg-gray-600 text-white' :
                                                                'bg-red-600 text-white'
                                                    }`}>
                                                    {challenge.status.toUpperCase()}
                                                </span>
                                                {isChallenger && (
                                                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                                                        YOU CHALLENGED
                                                    </span>
                                                )}
                                            </div>

                                            {challenge.challenger_message && isChallenger && (
                                                <p className="text-gray-400 text-sm mb-2 italic">
                                                    "{challenge.challenger_message}"
                                                </p>
                                            )}

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                                <span>📅 {new Date(challenge.start_time).toLocaleDateString()}</span>
                                                <span>⏱️ {challenge.duration_days} days</span>
                                                {challenge.status === 'active' && (
                                                    <span className="text-yellow-400 font-semibold">
                                                        {formatTimeRemaining(challenge.end_time)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Show scores for active/completed */}
                                            {(challenge.status === 'active' || challenge.status === 'completed') && (
                                                <div className="mt-4 grid grid-cols-2 gap-4">
                                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                                        <div className="text-xs text-gray-400 mb-1">Your Team</div>
                                                        <div className="text-2xl font-bold text-white">
                                                            {challenge.my_stats?.average_points?.toFixed(1) || '0.0'}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {challenge.my_stats?.participant_count || 0} players
                                                        </div>
                                                    </div>
                                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                                        <div className="text-xs text-gray-400 mb-1">{challenge.opponent_team.name}</div>
                                                        <div className="text-2xl font-bold text-white">
                                                            {challenge.opponent_stats?.average_points?.toFixed(1) || '0.0'}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {challenge.opponent_stats?.participant_count || 0} players
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Winner announcement */}
                                            {challenge.status === 'completed' && (
                                                <div className={`mt-4 p-3 rounded-lg border-2 ${challenge.is_tie
                                                    ? 'bg-gray-700/50 border-gray-500'
                                                    : challenge.winner_team_id === challenge.my_team.id
                                                        ? 'bg-green-900/30 border-green-500'
                                                        : 'bg-red-900/30 border-red-500'
                                                    }`}>
                                                    <div className="text-center font-bold text-white">
                                                        {challenge.is_tie
                                                            ? '🤝 TIE GAME'
                                                            : challenge.winner_team_id === challenge.my_team.id
                                                                ? '🏆 YOU WON!'
                                                                : '😞 OPPONENT WON'
                                                        }
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {needsResponse && (
                                                <>
                                                    <button
                                                        onClick={() => handleAccept(challenge.id)}
                                                        disabled={responding === challenge.id}
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                                                    >
                                                        {responding === challenge.id ? '...' : '✓ Accept'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecline(challenge.id)}
                                                        disabled={responding === challenge.id}
                                                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                                                    >
                                                        {responding === challenge.id ? '...' : '✗ Decline'}
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => router.push(`/challenges/${challenge.id}`)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}