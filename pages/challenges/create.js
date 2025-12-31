// pages/challenges/create.js - Create new challenge form
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function CreateChallenge({ user, userProfile }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [teams, setTeams] = useState([]);
    const [myDrills, setMyDrills] = useState([]);
    const [theirDrills, setTheirDrills] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const [form, setForm] = useState({
        duration_days: 7,
        start_time: new Date().toISOString().slice(0, 16),
        challenge_message: '',
        selected_drill_ids: []
    });

    useEffect(() => {
        if (userProfile?.role !== 'coach') {
            router.push('/drills');
            return;
        }

        if (!userProfile?.active_team_id) {
            setLoading(false);
            return;
        }

        fetchTeams();
        fetchMyDrills();
    }, [userProfile]);

    useEffect(() => {
        if (selectedTeamId) {
            fetchTheirDrills(selectedTeamId);
        } else {
            setTheirDrills([]);
        }
    }, [selectedTeamId]);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('id, name, sport')
                .neq('id', userProfile.active_team_id)
                .order('name');

            if (error) throw error;
            setTeams(data || []);
        } catch (err) {
            console.error('Error fetching teams:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyDrills = async () => {
        try {
            const { data, error } = await supabase
                .from('drills')
                .select('id, name, type, points_per_rep, points_for_completion, duration')
                .eq('team_id', userProfile.active_team_id)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setMyDrills(data || []);
        } catch (err) {
            console.error('Error fetching drills:', err);
        }
    };

    const fetchTheirDrills = async (teamId) => {
        try {
            const { data, error } = await supabase
                .from('drills')
                .select('id, name, type, points_per_rep, points_for_completion, duration')
                .eq('team_id', teamId)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setTheirDrills(data || []);
        } catch (err) {
            console.error('Error fetching their drills:', err);
        }
    };

    const toggleDrill = (drillId) => {
        setForm(prev => ({
            ...prev,
            selected_drill_ids: prev.selected_drill_ids.includes(drillId)
                ? prev.selected_drill_ids.filter(id => id !== drillId)
                : [...prev.selected_drill_ids, drillId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedTeamId) {
            alert('Please select a team to challenge');
            return;
        }

        if (form.selected_drill_ids.length === 0) {
            alert('Please select at least one drill');
            return;
        }

        if (form.selected_drill_ids.length > 20) {
            alert('Maximum 20 drills per challenge');
            return;
        }

        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/challenges/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    challenged_team_id: selectedTeamId,
                    duration_days: parseInt(form.duration_days),
                    start_time: new Date(form.start_time).toISOString(),
                    drill_ids: form.selected_drill_ids,
                    challenge_message: form.challenge_message.trim() || null
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('🏆 Challenge sent! Waiting for their response...');
                router.push('/challenges');
            } else {
                alert('Failed to create challenge: ' + result.error);
            }
        } catch (err) {
            console.error('Error creating challenge:', err);
            alert('Failed to create challenge');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
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

    const mySelectedCount = form.selected_drill_ids.filter(id =>
        myDrills.some(d => d.id === id)
    ).length;

    const theirSelectedCount = form.selected_drill_ids.filter(id =>
        theirDrills.some(d => d.id === id)
    ).length;

    const isUnbalanced = Math.abs(mySelectedCount - theirSelectedCount) > 2;

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
                    <h1 className="text-3xl font-bold text-white mb-2">Create New Challenge</h1>
                    <p className="text-gray-400">Challenge another team to compete on specific drills</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Select Opponent Team */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">1. Select Opponent Team</h2>
                        {teams.length === 0 ? (
                            <p className="text-gray-400 text-sm">No other teams available to challenge</p>
                        ) : (
                            <select
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                required
                            >
                                <option value="">Choose a team...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} {team.sport ? `(${team.sport})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Duration and Start Time */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">2. Set Duration & Start Time</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Duration (days)</label>
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, duration_days: 3 })}
                                        className={`px-4 py-2 rounded-lg font-semibold transition ${form.duration_days === 3
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        3 days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, duration_days: 7 })}
                                        className={`px-4 py-2 rounded-lg font-semibold transition ${form.duration_days === 7
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        7 days
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={form.duration_days}
                                    onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                                    min="1"
                                    max="30"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Start Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={form.start_time}
                                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Select Drills */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-2">3. Select Drills</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            Select 1-20 drills. Players from both teams will compete on these drills during the challenge.
                        </p>

                        {/* Balance Warning */}
                        {isUnbalanced && form.selected_drill_ids.length > 0 && (
                            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                                <p className="text-yellow-200 text-sm">
                                    ⚠️ Unbalanced selection: You have {mySelectedCount} from your team and {theirSelectedCount} from theirs.
                                    Consider selecting equal amounts for fairness.
                                </p>
                            </div>
                        )}

                        {/* Selection Summary */}
                        <div className="flex gap-4 mb-4 text-sm">
                            <span className="text-blue-400">
                                Your drills: {mySelectedCount}
                            </span>
                            <span className="text-green-400">
                                Their drills: {theirSelectedCount}
                            </span>
                            <span className="text-gray-400">
                                Total: {form.selected_drill_ids.length}/20
                            </span>
                        </div>

                        {/* My Drills */}
                        <div className="mb-4">
                            <h3 className="text-white font-semibold mb-2">Your Team's Drills</h3>
                            {myDrills.length === 0 ? (
                                <p className="text-gray-400 text-sm">No active drills</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {myDrills.map(drill => (
                                        <label
                                            key={drill.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${form.selected_drill_ids.includes(drill.id)
                                                    ? 'bg-blue-900/30 border-blue-500'
                                                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.selected_drill_ids.includes(drill.id)}
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

                        {/* Their Drills */}
                        {selectedTeamId && (
                            <div>
                                <h3 className="text-white font-semibold mb-2">Opponent's Drills</h3>
                                {theirDrills.length === 0 ? (
                                    <p className="text-gray-400 text-sm">This team has no active drills</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {theirDrills.map(drill => (
                                            <label
                                                key={drill.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${form.selected_drill_ids.includes(drill.id)
                                                        ? 'bg-green-900/30 border-green-500'
                                                        : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.selected_drill_ids.includes(drill.id)}
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
                        )}
                    </div>

                    {/* Challenge Message */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">4. Challenge Message (Optional)</h2>
                        <textarea
                            value={form.challenge_message}
                            onChange={(e) => setForm({ ...form, challenge_message: e.target.value })}
                            placeholder="Add some friendly trash talk... 😎"
                            rows="3"
                            maxLength="500"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">{form.challenge_message.length}/500</p>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={creating || !selectedTeamId || form.selected_drill_ids.length === 0}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg transition"
                        >
                            {creating ? 'Sending Challenge...' : '🏆 Send Challenge'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/challenges')}
                            className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}