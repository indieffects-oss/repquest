// pages/challenges/[id]/add-drills.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';

export default function AddDrillsToChallenge({ user, userProfile }) {
    const router = useRouter();
    const { id } = router.query;
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [challenge, setChallenge] = useState(null);
    const [myDrills, setMyDrills] = useState([]);
    const [selectedDrillIds, setSelectedDrillIds] = useState([]);

    useEffect(() => {
        if (id && userProfile) {
            fetchChallengeAndDrills();
        }
    }, [id, userProfile]);

    const fetchChallengeAndDrills = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Get challenge details
            const challengeResponse = await fetch(`/api/challenges/${id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const challengeResult = await challengeResponse.json();
            if (!challengeResult.success) {
                throw new Error('Failed to load challenge');
            }

            setChallenge(challengeResult.challenge);

            // Verify this is the challenged coach
            if (challengeResult.challenge.challenged_team_id !== userProfile.active_team_id) {
                router.push(`/challenges/${id}`);
                return;
            }

            // Verify challenge is still pending
            if (challengeResult.challenge.status !== 'pending') {
                router.push(`/challenges/${id}`);
                return;
            }

            // Fetch my team's drills
            const { data: drills, error: drillsError } = await supabase
                .from('drills')
                .select('id, name, type, description, points_per_rep, points_for_completion, duration')
                .eq('team_id', userProfile.active_team_id)
                .eq('is_active', true)
                .order('name');

            if (drillsError) throw drillsError;
            setMyDrills(drills || []);

        } catch (err) {
            console.error('Error loading:', err);
            alert('Failed to load challenge: ' + err.message);
            router.push('/challenges');
        } finally {
            setLoading(false);
        }
    };

    const toggleDrill = (drillId) => {
        setSelectedDrillIds(prev =>
            prev.includes(drillId)
                ? prev.filter(id => id !== drillId)
                : [...prev, drillId]
        );
    };

    const handleAcceptWithDrills = async () => {
        if (selectedDrillIds.length === 0) {
            alert('Please select at least one drill to add to the challenge');
            return;
        }

        if (!confirm(`Accept challenge with ${selectedDrillIds.length} drills?`)) {
            return;
        }

        setAccepting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/challenges/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    challenge_id: id,
                    drill_ids: selectedDrillIds
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('🎉 Challenge accepted! Let the competition begin!');
                router.push(`/challenges/${id}`);
            } else {
                alert('Failed to accept challenge: ' + result.error);
            }
        } catch (err) {
            console.error('Error accepting challenge:', err);
            alert('Failed to accept challenge');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
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

    const challengerTeam = challenge.challenger_team;
    const challengedTeam = challenge.challenged_team;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/challenges')}
                        className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
                    >
                        ← Back to Challenges
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Accept Challenge from {challengerTeam.name}
                    </h1>
                    <p className="text-gray-400">
                        Select your drills to add to the challenge
                    </p>
                </div>

                {/* Challenge Info */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">Challenge Details</h2>

                    {challenge.challenger_message && (
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-4">
                            <p className="text-yellow-200 italic">"{challenge.challenger_message}"</p>
                            <p className="text-xs text-yellow-400 mt-1">- {challengerTeam.name}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Duration:</span>
                            <div className="text-white font-semibold">{challenge.duration_days} days</div>
                        </div>
                        <div>
                            <span className="text-gray-400">Starts:</span>
                            <div className="text-white font-semibold">
                                {new Date(challenge.start_time).toLocaleDateString()}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-400">Their Drills:</span>
                            <div className="text-white font-semibold">{challenge.challenger_drill_count || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Select Your Drills */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">
                        Select Your Team's Drills
                    </h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Choose drills from your team to add to the challenge. Select as many as you want!
                    </p>

                    <div className="text-sm mb-4">
                        <span className="text-blue-400 font-semibold">
                            Selected: {selectedDrillIds.length}
                        </span>
                        {selectedDrillIds.length === 0 && (
                            <span className="text-yellow-400 ml-2">(select at least 1)</span>
                        )}
                    </div>

                    {myDrills.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-400 mb-4">
                                You don't have any active drills yet
                            </p>
                            <button
                                onClick={() => router.push('/drills')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                            >
                                Create Drills
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                            {myDrills.map(drill => (
                                <label
                                    key={drill.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedDrillIds.includes(drill.id)
                                            ? 'bg-blue-900/30 border-blue-500'
                                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedDrillIds.includes(drill.id)}
                                        onChange={() => toggleDrill(drill.id)}
                                        className="w-5 h-5"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium truncate">
                                            {drill.name}
                                        </div>
                                        <div className="text-xs text-gray-400 capitalize">
                                            {drill.type}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {drill.points_for_completion}pts
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleAcceptWithDrills}
                        disabled={accepting || selectedDrillIds.length === 0 || myDrills.length === 0}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg transition"
                    >
                        {accepting ? 'Accepting...' : '✓ Accept Challenge'}
                    </button>
                    <button
                        onClick={() => router.push('/challenges')}
                        disabled={accepting}
                        className="px-6 py-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
                    >
                        Cancel
                    </button>
                </div>

                <p className="text-center text-gray-400 text-sm mt-4">
                    You can also decline this challenge from the challenges page
                </p>
            </div>
        </div>
    );
}