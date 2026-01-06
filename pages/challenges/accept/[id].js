// pages/challenges/accept/[id].js - Accept challenge and add your drills
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';

export default function AcceptChallenge({ user, userProfile }) {
    const router = useRouter();
    const { id } = router.query;
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [challenge, setChallenge] = useState(null);
    const [theirDrills, setTheirDrills] = useState([]);
    const [myDrills, setMyDrills] = useState([]);
    const [selectedDrillIds, setSelectedDrillIds] = useState([]);

    useEffect(() => {
        if (!user || userProfile?.role !== 'coach') {
            router.push('/drills');
            return;
        }

        if (id) {
            fetchChallengeDetails();
        }
    }, [user, userProfile, id]);

    const fetchChallengeDetails = async () => {
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
                alert('Challenge not found');
                router.push('/challenges');
                return;
            }

            setChallenge(challengeResult.challenge);
            setTheirDrills(challengeResult.drills || []);

            // Fetch my team's drills
            const { data: drills, error } = await supabase
                .from('drills')
                .select('id, name, type, points_per_rep, points_for_completion, duration')
                .eq('team_id', userProfile.active_team_id)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setMyDrills(drills || []);
        } catch (err) {
            console.error('Error fetching challenge:', err);
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

    const handleAccept = async () => {
        if (selectedDrillIds.length < 3 || selectedDrillIds.length > 10) {
            alert('Please select between 3-10 drills');
            return;
        }

        if (!confirm(`Accept this challenge with ${selectedDrillIds.length} drills?`)) return;

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
                alert('🏆 Challenge accepted! Let the competition begin!');
                router.push(`/challenges/${id}`);
            } else {
                alert('Failed to accept: ' + result.error);
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
                <div className="max-w-4xl mx-auto text-center">
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
        );
    }

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
                    <h1 className="text-3xl font-bold text-white mb-2">Accept Challenge</h1>
                    <p className="text-gray-400">Add your drills to complete the challenge setup</p>
                </div>

                {/* Challenge Info */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Challenge from {challenge.challenger_team?.name || 'Unknown Team'}
                    </h2>
                    {challenge.challenger_message && (
                        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-4">
                            <p className="text-yellow-200 italic">"{challenge.challenger_message}"</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Duration:</span>
                            <span className="text-white ml-2">{challenge.duration_days} days</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Starts:</span>
                            <span className="text-white ml-2">{new Date(challenge.start_time).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Their Drills */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Their Drills ({theirDrills.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {theirDrills.map(drill => (
                            <div key={drill.id} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                                <div className="text-white font-semibold">{drill.name}</div>
                                <div className="text-xs text-gray-400 capitalize mt-1">{drill.type}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Your Drills */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">Select Your Drills (3-10)</h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Choose your team's drills to compete with
                    </p>

                    <div className="text-sm mb-4">
                        <span className="text-blue-400 font-semibold">
                            Selected: {selectedDrillIds.length}/10
                        </span>
                        {selectedDrillIds.length < 3 && (
                            <span className="text-yellow-400 ml-2">(minimum 3 required)</span>
                        )}
                    </div>

                    {myDrills.length === 0 ? (
                        <p className="text-gray-400 text-sm">No active drills available</p>
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
                                        <div className="text-white font-medium truncate">{drill.name}</div>
                                        <div className="text-xs text-gray-400 capitalize">{drill.type}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleAccept}
                        disabled={accepting || selectedDrillIds.length < 3 || selectedDrillIds.length > 10}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg transition"
                    >
                        {accepting ? 'Accepting...' : '✓ Accept Challenge'}
                    </button>
                    <button
                        onClick={() => router.push('/challenges')}
                        className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}