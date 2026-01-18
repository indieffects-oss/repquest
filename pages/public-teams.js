// pages/public-teams.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function PublicTeams({ user, userProfile }) {
    const router = useRouter();
    const [publicTeams, setPublicTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [skillFilter, setSkillFilter] = useState('all');
    const [sportFilter, setSportFilter] = useState('all');
    const [joining, setJoining] = useState(null);

    useEffect(() => {
        fetchPublicTeams();
    }, []);

    const fetchPublicTeams = async () => {
        try {
            const response = await fetch('/api/teams/public/list');
            const result = await response.json();

            if (result.success) {
                setPublicTeams(result.teams);
            }
        } catch (err) {
            console.error('Error fetching public teams:', err);
        } finally {
            setLoading(false);
        }
    };

    const joinTeam = async (teamId, teamName) => {
        if (!user) {
            alert('Please sign in to join a team');
            router.push('/');
            return;
        }

        if (userProfile?.role !== 'player') {
            alert('Only players can join public teams');
            return;
        }

        setJoining(teamId);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/teams/public/join', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ team_id: teamId })
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ ${result.message || 'You\'ve joined the team!'}`);
                router.push('/drills');
            } else {
                alert(result.error || 'Failed to join team');
            }
        } catch (err) {
            console.error('Error joining team:', err);
            alert('Failed to join team. Please try again.');
        } finally {
            setJoining(null);
        }
    };

    const filteredTeams = publicTeams.filter(team => {
        if (skillFilter !== 'all' && team.skill_level !== skillFilter) return false;
        if (sportFilter !== 'all' && team.sport !== sportFilter) return false;
        return true;
    });

    const sports = [...new Set(publicTeams.map(t => t.sport).filter(Boolean))].sort();

    const getSkillLevelBadge = (level) => {
        switch (level) {
            case 'beginner':
                return { emoji: '🟢', color: 'bg-green-600', label: 'BEGINNER' };
            case 'intermediate':
                return { emoji: '🟡', color: 'bg-yellow-600', label: 'INTERMEDIATE' };
            case 'advanced':
                return { emoji: '🔴', color: 'bg-red-600', label: 'ADVANCED' };
            default:
                return { emoji: '⚪', color: 'bg-gray-600', label: 'ALL LEVELS' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6 flex items-center justify-center">
                <div className="text-white text-xl">Loading public teams...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">🌍 Public Teams</h1>
                    <p className="text-gray-400">Join a fitness team and compete with others at your skill level</p>
                </div>

                {/* Info Banner */}
                <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">How Public Teams Work</h3>
                            <p className="text-purple-200 text-sm">
                                Public teams are open to all players. Join one to access drills, compete on leaderboards,
                                and track your progress with others at your skill level. You can be part of multiple teams!
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Filter by Skill Level</label>
                        <select
                            value={skillFilter}
                            onChange={(e) => setSkillFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="all">All Skill Levels</option>
                            <option value="beginner">🟢 Beginner</option>
                            <option value="intermediate">🟡 Intermediate</option>
                            <option value="advanced">🔴 Advanced</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Filter by Sport</label>
                        <select
                            value={sportFilter}
                            onChange={(e) => setSportFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="all">All Sports</option>
                            {sports.map(sport => (
                                <option key={sport} value={sport}>{sport}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Results Count */}
                <div className="text-gray-400 text-sm mb-4">
                    Showing {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'}
                </div>

                {/* Teams Grid */}
                {filteredTeams.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-400 text-lg mb-2">No teams found</p>
                        <p className="text-gray-500 text-sm">
                            {publicTeams.length === 0
                                ? 'No public teams have been created yet. Check back soon!'
                                : 'Try adjusting your filters to see more teams.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTeams.map(team => {
                            const skillBadge = getSkillLevelBadge(team.skill_level);
                            const now = new Date();
                            const endDate = team.season_end_date ? new Date(team.season_end_date) : null;
                            const isOutOfSeason = endDate && now > endDate;

                            return (
                                <div
                                    key={team.id}
                                    className={`bg-gray-800 rounded-xl p-6 border-2 transition ${isOutOfSeason
                                            ? 'border-gray-700 opacity-60'
                                            : 'border-gray-700 hover:border-purple-500'
                                        }`}
                                >
                                    {/* Team Logo */}
                                    {team.logo_url ? (
                                        <img
                                            src={team.logo_url}
                                            alt={team.name}
                                            className="w-20 h-20 object-cover rounded-lg mb-4 mx-auto border-2"
                                            style={{ borderColor: team.primary_color || '#3B82F6' }}
                                        />
                                    ) : (
                                        <div
                                            className="w-20 h-20 rounded-lg mb-4 mx-auto flex items-center justify-center text-3xl"
                                            style={{ backgroundColor: team.primary_color + '20', color: team.primary_color }}
                                        >
                                            🏆
                                        </div>
                                    )}

                                    {/* Team Name */}
                                    <h3 className="text-xl font-bold text-white text-center mb-3">
                                        {team.name}
                                    </h3>

                                    {/* Badges */}
                                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                                        {team.skill_level && (
                                            <span className={`text-xs px-3 py-1 rounded font-semibold ${skillBadge.color} text-white`}>
                                                {skillBadge.emoji} {skillBadge.label}
                                            </span>
                                        )}
                                        {team.sport && (
                                            <span className="text-xs bg-blue-600 px-3 py-1 rounded font-semibold text-white">
                                                {team.sport}
                                            </span>
                                        )}
                                        {isOutOfSeason && (
                                            <span className="text-xs bg-red-600 px-3 py-1 rounded font-semibold text-white">
                                                SEASON ENDED
                                            </span>
                                        )}
                                    </div>

                                    {/* Member Count */}
                                    <p className="text-gray-400 text-sm text-center mb-4">
                                        👥 {team.member_count || 0} {team.member_count === 1 ? 'member' : 'members'}
                                    </p>

                                    {/* Join Button */}
                                    <button
                                        onClick={() => joinTeam(team.id, team.name)}
                                        disabled={joining === team.id || isOutOfSeason}
                                        className={`w-full px-4 py-3 rounded-lg font-semibold transition ${isOutOfSeason
                                                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                    >
                                        {joining === team.id ? 'Joining...' : isOutOfSeason ? 'Season Ended' : '✓ Join Team'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Back Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push(userProfile?.role === 'coach' ? '/dashboard' : '/drills')}
                        className="text-gray-400 hover:text-white transition"
                    >
                        ← Back to {userProfile?.role === 'coach' ? 'Dashboard' : 'Drills'}
                    </button>
                </div>
            </div>
        </div>
    );
}