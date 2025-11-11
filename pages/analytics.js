// pages/analytics.js - v0.44 Coach Analytics Dashboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calculateLevel } from '../lib/gamification';

export default function Analytics({ user, userProfile }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [dateRange, setDateRange] = useState('7'); // days
    const [analyticsData, setAnalyticsData] = useState({
        totalSessions: 0,
        totalReps: 0,
        totalPoints: 0,
        activePlayers: 0,
        topPerformers: [],
        drillPopularity: [],
        dailyActivity: [],
        playerComparison: [],
        drillCompletionRates: []
    });

    useEffect(() => {
        if (userProfile?.role !== 'coach') {
            router.push('/drills');
            return;
        }
        fetchTeams();
    }, [userProfile]);

    useEffect(() => {
        if (selectedTeam) {
            fetchAnalytics();
        }
    }, [selectedTeam, dateRange]);

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('id, name, sport')
                .eq('coach_id', user.id)
                .order('name');

            if (error) throw error;

            setTeams(data || []);

            if (data && data.length > 0) {
                setSelectedTeam(data[0].id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('Error fetching teams:', err);
            setLoading(false);
        }
    };

    const fetchAnalytics = async () => {
        if (!selectedTeam) return;

        setLoading(true);

        try {
            const daysAgo = parseInt(dateRange);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysAgo);
            const startDateStr = startDate.toISOString();

            // Get team members
            const { data: teamMembers, error: membersError } = await supabase
                .from('team_members')
                .select('user_id, users(id, display_name, total_points)')
                .eq('team_id', selectedTeam);

            if (membersError) throw membersError;

            const userIds = teamMembers.map(tm => tm.user_id);

            if (userIds.length === 0) {
                setAnalyticsData({
                    totalSessions: 0,
                    totalReps: 0,
                    totalPoints: 0,
                    activePlayers: 0,
                    topPerformers: [],
                    drillPopularity: [],
                    dailyActivity: [],
                    playerComparison: [],
                    drillCompletionRates: []
                });
                setLoading(false);
                return;
            }

            // Fetch drill results for date range
            const { data: results, error: resultsError } = await supabase
                .from('drill_results')
                .select('*')
                .in('user_id', userIds)
                .gte('timestamp', startDateStr)
                .order('timestamp', { ascending: true });

            if (resultsError) throw resultsError;

            // Fetch all drills by this coach
            const { data: drills, error: drillsError } = await supabase
                .from('drills')
                .select('id, name')
                .eq('created_by', user.id);

            if (drillsError) throw drillsError;

            // Process analytics
            const totalSessions = results.length;
            const totalReps = results.reduce((sum, r) => sum + (r.reps || 0), 0);
            const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0);
            const uniquePlayers = new Set(results.map(r => r.user_id)).size;

            // Top performers
            const playerStats = {};
            results.forEach(result => {
                if (!playerStats[result.user_id]) {
                    playerStats[result.user_id] = {
                        userId: result.user_id,
                        sessions: 0,
                        reps: 0,
                        points: 0
                    };
                }
                playerStats[result.user_id].sessions++;
                playerStats[result.user_id].reps += result.reps || 0;
                playerStats[result.user_id].points += result.points || 0;
            });

            const topPerformers = Object.values(playerStats)
                .sort((a, b) => b.points - a.points)
                .slice(0, 10)
                .map(stat => {
                    const member = teamMembers.find(tm => tm.user_id === stat.userId);
                    return {
                        name: member?.users?.display_name || 'Unknown',
                        sessions: stat.sessions,
                        reps: stat.reps,
                        points: stat.points,
                        level: calculateLevel(member?.users?.total_points || 0)
                    };
                });

            // Drill popularity
            const drillStats = {};
            results.forEach(result => {
                const drillName = result.drill_name || 'Unknown';
                if (!drillStats[drillName]) {
                    drillStats[drillName] = {
                        name: drillName,
                        completions: 0,
                        totalReps: 0,
                        totalPoints: 0
                    };
                }
                drillStats[drillName].completions++;
                drillStats[drillName].totalReps += result.reps || 0;
                drillStats[drillName].totalPoints += result.points || 0;
            });

            const drillPopularity = Object.values(drillStats)
                .sort((a, b) => b.completions - a.completions)
                .slice(0, 10);

            // Daily activity (last 7/30 days)
            const dailyStats = {};
            results.forEach(result => {
                const date = new Date(result.timestamp).toISOString().split('T')[0];
                if (!dailyStats[date]) {
                    dailyStats[date] = {
                        date: date,
                        sessions: 0,
                        reps: 0,
                        points: 0,
                        players: new Set()
                    };
                }
                dailyStats[date].sessions++;
                dailyStats[date].reps += result.reps || 0;
                dailyStats[date].points += result.points || 0;
                dailyStats[date].players.add(result.user_id);
            });

            const dailyActivity = Object.values(dailyStats)
                .map(stat => ({
                    date: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    sessions: stat.sessions,
                    reps: stat.reps,
                    points: stat.points,
                    players: stat.players.size
                }))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            // Player comparison (all players)
            const playerComparison = teamMembers.map(tm => ({
                name: tm.users?.display_name || 'Unknown',
                points: playerStats[tm.user_id]?.points || 0,
                reps: playerStats[tm.user_id]?.reps || 0,
                sessions: playerStats[tm.user_id]?.sessions || 0,
                level: calculateLevel(tm.users?.total_points || 0)
            })).sort((a, b) => b.points - a.points);

            // Drill completion rates (active drills)
            const drillCompletionRates = drills.map(drill => {
                const completions = results.filter(r => r.drill_id === drill.id).length;
                const avgReps = results
                    .filter(r => r.drill_id === drill.id)
                    .reduce((sum, r) => sum + (r.reps || 0), 0) / (completions || 1);

                return {
                    name: drill.name,
                    completions: completions,
                    avgReps: Math.round(avgReps),
                    participationRate: Math.round((completions / (userIds.length || 1)) * 100)
                };
            }).sort((a, b) => b.completions - a.completions).slice(0, 10);

            setAnalyticsData({
                totalSessions,
                totalReps,
                totalPoints,
                activePlayers: uniquePlayers,
                topPerformers,
                drillPopularity,
                dailyActivity,
                playerComparison,
                drillCompletionRates
            });

        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6 flex items-center justify-center">
                <div className="text-white text-xl">Loading analytics...</div>
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-white text-lg mb-2">No Teams Yet</p>
                        <p className="text-gray-400 text-sm mb-4">
                            Create a team to see analytics
                        </p>
                        <button
                            onClick={() => router.push('/teams')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                        >
                            Go to Teams
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">📊 Team Analytics</h1>
                    <p className="text-gray-400">Performance insights and trends</p>
                </div>

                {/* Filters */}
                <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Team:</label>
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} {team.sport && `(${team.sport})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Time Range:</label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="7">Last 7 days</option>
                                <option value="14">Last 14 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-3xl mb-2">🎯</div>
                        <div className="text-2xl font-bold text-white">{analyticsData.totalSessions}</div>
                        <div className="text-sm text-gray-400">Total Sessions</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-3xl mb-2">💪</div>
                        <div className="text-2xl font-bold text-white">{analyticsData.totalReps.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">Total Reps</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-3xl mb-2">💎</div>
                        <div className="text-2xl font-bold text-white">{analyticsData.totalPoints.toLocaleString()}</div>
                        <div className="text-sm text-gray-400">Points Earned</div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-2xl font-bold text-white">{analyticsData.activePlayers}</div>
                        <div className="text-sm text-gray-400">Active Players</div>
                    </div>
                </div>

                {/* Daily Activity Chart */}
                {analyticsData.dailyActivity.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
                        <h3 className="text-white font-semibold mb-4">📈 Daily Activity</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analyticsData.dailyActivity}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    labelStyle={{ color: '#F3F4F6' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="sessions" stroke="#3B82F6" strokeWidth={2} name="Sessions" />
                                <Line type="monotone" dataKey="players" stroke="#10B981" strokeWidth={2} name="Active Players" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Performers */}
                {analyticsData.topPerformers.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
                        <h3 className="text-white font-semibold mb-4">🏆 Top Performers</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-300 text-sm">Rank</th>
                                        <th className="px-4 py-3 text-left text-gray-300 text-sm">Player</th>
                                        <th className="px-4 py-3 text-right text-gray-300 text-sm">Sessions</th>
                                        <th className="px-4 py-3 text-right text-gray-300 text-sm">Reps</th>
                                        <th className="px-4 py-3 text-right text-gray-300 text-sm">Points</th>
                                        <th className="px-4 py-3 text-right text-gray-300 text-sm">Level</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analyticsData.topPerformers.map((player, index) => (
                                        <tr key={index} className="border-b border-gray-700">
                                            <td className="px-4 py-3 text-white">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                            </td>
                                            <td className="px-4 py-3 text-white font-semibold">{player.name}</td>
                                            <td className="px-4 py-3 text-right text-white">{player.sessions}</td>
                                            <td className="px-4 py-3 text-right text-white">{player.reps.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-blue-400 font-bold">{player.points.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-white">{player.level}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                    {/* Most Popular Drills */}
                    {analyticsData.drillPopularity.length > 0 && (
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-white font-semibold mb-4">🔥 Most Popular Drills</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analyticsData.drillPopularity}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                        labelStyle={{ color: '#F3F4F6' }}
                                    />
                                    <Bar dataKey="completions" fill="#3B82F6" name="Completions" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Drill Completion Rates */}
                    {analyticsData.drillCompletionRates.length > 0 && (
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-white font-semibold mb-4">✅ Drill Participation</h3>
                            <div className="space-y-3">
                                {analyticsData.drillCompletionRates.slice(0, 8).map((drill, index) => (
                                    <div key={index}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-white truncate flex-1">{drill.name}</span>
                                            <span className="text-gray-400 ml-2">{drill.completions} times</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                style={{ width: `${Math.min(drill.participationRate, 100)}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {drill.participationRate}% participation • Avg {drill.avgReps} reps
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Player Comparison */}
                {analyticsData.playerComparison.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-white font-semibold mb-4">👥 Player Comparison</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={analyticsData.playerComparison.slice(0, 15)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                                <YAxis stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                    labelStyle={{ color: '#F3F4F6' }}
                                />
                                <Legend />
                                <Bar dataKey="points" fill="#3B82F6" name="Points" />
                                <Bar dataKey="sessions" fill="#10B981" name="Sessions" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}