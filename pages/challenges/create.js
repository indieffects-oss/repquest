// pages/challenges/create.js - No minimum drill requirement
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function CreateChallenge({ user, userProfile }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [teams, setTeams] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [myDrills, setMyDrills] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sportFilter, setSportFilter] = useState('all');

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
        let filtered = teams;

        if (searchTerm) {
            filtered = filtered.filter(team =>
                team.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sportFilter !== 'all') {
            filtered = filtered.filter(team => team.sport === sportFilter);
        }

        setFilteredTeams(filtered);
    }, [searchTerm, sportFilter, teams]);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('id, name, sport')
                .neq('id', userProfile.active_team_id)
                .order('name');

            if (error) throw error;
            setTeams(data || []);
            setFilteredTeams(data || []);
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

        // No drill requirement - you can create a challenge with 0 drills
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
                alert('🏆 Challenge sent! The other coach will add their drills when they accept.');
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

    const sports = [...new Set(teams.map(t => t.sport).filter(Boolean))].sort();

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
                    <p className="text-gray-400">Challenge another team - you pick your drills, they pick theirs</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Select Opponent Team */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">1. Select Opponent Team</h2>

                        {teams.length === 0 ? (
                            <p className="text-gray-400 text-sm">No other teams available to challenge</p>
                        ) : (
                            <>
                                {/* Search and Filter */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                    <input
                                        type="text"
                                        placeholder="🔍 Search teams..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                    />
                                    <select
                                        value={sportFilter}
                                        onChange={(e) => setSportFilter(e.target.value)}
                                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="all">All Sports</option>
                                        {sports.map(sport => (
                                            <option key={sport} value={sport}>{sport}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Team List */}
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {filteredTeams.length === 0 ? (
                                        <p className="text-gray-400 text-sm text-center py-4">No teams match your filters</p>
                                    ) : (
                                        filteredTeams.map(team => (
                                            <button
                                                key={team.id}
                                                type="button"
                                                onClick={() => setSelectedTeamId(team.id)}
                                                className={`w-full p-4 rounded-lg text-left transition border-2 ${selectedTeamId === team.id
                                                    ? 'bg-blue-600 border-blue-400'
                                                    : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                                                    }`}
                                            >
                                                <div className="font-semibold text-white">{team.name}</div>
                                                {team.sport && (
                                                    <div className="text-xs text-gray-400 mt-1">{team.sport}</div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
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
                        <h2 className="text-xl font-bold text-white mb-2">3. Select Your Drills</h2>
                        <p className="text-gray-400 text-sm mb-4">
                            Choose your team's drills. The other coach will add their drills when they accept.
                        </p>

                        <div className="text-sm mb-4">
                            <span className="text-blue-400 font-semibold">
                                Selected: {form.selected_drill_ids.length}
                            </span>
                            <span className="text-gray-400 ml-2">(optional - other coach will add their drills)</span>
                        </div>

                        {myDrills.length === 0 ? (
                            <p className="text-gray-400 text-sm">No active drills available</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
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
                            disabled={creating || !selectedTeamId}
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