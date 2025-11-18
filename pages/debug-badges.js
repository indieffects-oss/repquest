// pages/debug-badges.js - Debug page for badge system
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { checkBadgeUnlocks } from '../lib/gamification';

export default function DebugBadges() {
    const router = useRouter();
    const [debugInfo, setDebugInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);
        loadDebugInfo(user.id);
    };

    const loadDebugInfo = async (userId) => {
        try {
            // Get user stats
            const { data: stats, error: statsError } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            // Get drill results
            const { data: drillResults, error: drillError } = await supabase
                .from('drill_results')
                .select('*')
                .eq('user_id', userId);

            // Get all badges
            const { data: allBadges, error: badgesError } = await supabase
                .from('badges')
                .select('*');

            // Get user badges
            const { data: userBadges, error: userBadgesError } = await supabase
                .from('user_badges')
                .select('*, badges(*)')
                .eq('user_id', userId);

            setDebugInfo({
                stats,
                statsError,
                drillResults: drillResults || [],
                drillError,
                allBadges: allBadges || [],
                badgesError,
                userBadges: userBadges || [],
                userBadgesError,
                userId
            });

            setLoading(false);
        } catch (err) {
            console.error('Debug error:', err);
            setLoading(false);
        }
    };

    const manuallyCheckBadges = async () => {
        try {
            console.log('🔍 Manually checking badges...');
            const newBadges = await checkBadgeUnlocks(supabase, user.id, debugInfo.stats);
            console.log('✅ Badge check complete. New badges:', newBadges);
            alert(`Badge check complete! Unlocked ${newBadges.length} new badges: ${newBadges.map(b => b.name).join(', ') || 'none'}`);
            loadDebugInfo(user.id); // Reload to see changes
        } catch (err) {
            console.error('Error checking badges:', err);
            alert('Error: ' + err.message);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
    if (!debugInfo) return <div className="min-h-screen bg-gray-900 text-white p-8">Error loading debug info</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">🔍 Badge System Debug</h1>

                <button
                    onClick={manuallyCheckBadges}
                    className="mb-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                >
                    🎯 Manually Check & Award Badges
                </button>

                {/* User Info */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-2">User ID</h2>
                    <pre className="text-sm bg-gray-900 p-2 rounded overflow-x-auto">{debugInfo.userId}</pre>
                </div>

                {/* User Stats */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-2">User Stats</h2>
                    {debugInfo.statsError ? (
                        <div className="text-red-400">Error: {debugInfo.statsError.message}</div>
                    ) : debugInfo.stats ? (
                        <div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-gray-400 text-sm">Sessions Completed</div>
                                    <div className="text-2xl font-bold">{debugInfo.stats.sessions_completed || 0}</div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-gray-400 text-sm">Total Reps</div>
                                    <div className="text-2xl font-bold">{debugInfo.stats.total_reps || 0}</div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-gray-400 text-sm">Current Streak</div>
                                    <div className="text-2xl font-bold">{debugInfo.stats.current_streak || 0}</div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-gray-400 text-sm">Total Points</div>
                                    <div className="text-2xl font-bold">{debugInfo.stats.total_points || 0}</div>
                                </div>
                            </div>
                            <details className="cursor-pointer">
                                <summary className="text-blue-400 hover:text-blue-300">View Raw Stats</summary>
                                <pre className="text-sm bg-gray-900 p-2 rounded overflow-x-auto mt-2">
                                    {JSON.stringify(debugInfo.stats, null, 2)}
                                </pre>
                            </details>
                        </div>
                    ) : (
                        <div className="text-yellow-400">⚠️ No stats found for this user</div>
                    )}
                </div>

                {/* Drill Results */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-2">Drill Results ({debugInfo.drillResults.length})</h2>
                    {debugInfo.drillError ? (
                        <div className="text-red-400">Error: {debugInfo.drillError.message}</div>
                    ) : debugInfo.drillResults.length > 0 ? (
                        <div>
                            <div className="mb-4 space-y-2">
                                <div className="text-sm text-gray-400">Special Rep Counts:</div>
                                {debugInfo.drillResults
                                    .filter(r => r.reps === 67 || r.reps === 77)
                                    .map((r, i) => (
                                        <div key={i} className="text-green-400 bg-gray-900 p-2 rounded">
                                            ✓ {r.reps} reps on {new Date(r.completed_at).toLocaleString()}
                                        </div>
                                    ))}
                                {debugInfo.drillResults.filter(r => r.reps === 67 || r.reps === 77).length === 0 && (
                                    <div className="text-gray-500 bg-gray-900 p-2 rounded">No drills with 67 or 77 reps yet</div>
                                )}
                            </div>
                            <details className="cursor-pointer">
                                <summary className="text-blue-400 hover:text-blue-300">View All Drill Results</summary>
                                <pre className="text-sm bg-gray-900 p-2 rounded overflow-x-auto max-h-60 mt-2">
                                    {JSON.stringify(debugInfo.drillResults, null, 2)}
                                </pre>
                            </details>
                        </div>
                    ) : (
                        <div className="text-yellow-400">⚠️ No drill results found</div>
                    )}
                </div>

                {/* All Badges */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-2">All Available Badges ({debugInfo.allBadges.length})</h2>
                    {debugInfo.badgesError ? (
                        <div className="text-red-400">Error: {debugInfo.badgesError.message}</div>
                    ) : debugInfo.allBadges.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {debugInfo.allBadges.map(badge => (
                                <div key={badge.id} className="bg-gray-900 p-3 rounded text-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{badge.icon}</span>
                                            <span className="font-semibold">{badge.name}</span>
                                        </div>
                                        {debugInfo.userBadges.some(ub => ub.badge_id === badge.id) && (
                                            <span className="text-green-400">✓ Earned</span>
                                        )}
                                    </div>
                                    <div className="text-gray-400 text-xs mt-1">
                                        {badge.unlock_type}: {badge.unlock_value}
                                    </div>
                                    <div className="text-gray-500 text-xs">{badge.description}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-red-400 bg-red-900/20 p-4 rounded">
                            ❌ No badges in database! Run your SQL insert script first.
                        </div>
                    )}
                </div>

                {/* User Badges */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-2">User's Earned Badges ({debugInfo.userBadges.length})</h2>
                    {debugInfo.userBadgesError ? (
                        <div className="text-red-400">Error: {debugInfo.userBadgesError.message}</div>
                    ) : debugInfo.userBadges.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {debugInfo.userBadges.map(ub => (
                                <div key={ub.badge_id} className="bg-gray-900 p-3 rounded text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl">{ub.badges.icon}</span>
                                        <span className="font-semibold">{ub.badges.name}</span>
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                        Earned: {new Date(ub.earned_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-yellow-400">⚠️ No badges earned yet - click the button above to check eligibility!</div>
                    )}
                </div>

                {/* Badge Eligibility Check */}
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <h2 className="text-xl font-bold mb-2">Badge Eligibility Analysis</h2>
                    {debugInfo.stats ? (
                        <div className="space-y-3 text-sm">
                            <div className="bg-gray-900 p-3 rounded">
                                <div className="font-semibold mb-2">Drill Count Badges:</div>
                                <div className="space-y-1 text-gray-300">
                                    <div>• First Steps (1): {debugInfo.stats.sessions_completed >= 1 ? '✅ Eligible' : '❌ Need ' + (1 - debugInfo.stats.sessions_completed) + ' more'}</div>
                                    <div>• Getting Started (5): {debugInfo.stats.sessions_completed >= 5 ? '✅ Eligible' : '❌ Need ' + (5 - debugInfo.stats.sessions_completed) + ' more'}</div>
                                    <div>• Drill Master (50): {debugInfo.stats.sessions_completed >= 50 ? '✅ Eligible' : '❌ Need ' + (50 - debugInfo.stats.sessions_completed) + ' more'}</div>
                                    <div>• Century Club (100): {debugInfo.stats.sessions_completed >= 100 ? '✅ Eligible' : '❌ Need ' + (100 - debugInfo.stats.sessions_completed) + ' more'}</div>
                                </div>
                            </div>

                            <div className="bg-gray-900 p-3 rounded">
                                <div className="font-semibold mb-2">Rep Count Badges:</div>
                                <div className="space-y-1 text-gray-300">
                                    <div>• Rep Rookie (100): {debugInfo.stats.total_reps >= 100 ? '✅ Eligible' : '❌ Need ' + (100 - debugInfo.stats.total_reps) + ' more'}</div>
                                    <div>• Rep Warrior (500): {debugInfo.stats.total_reps >= 500 ? '✅ Eligible' : '❌ Need ' + (500 - debugInfo.stats.total_reps) + ' more'}</div>
                                    <div>• Rep Legend (1000): {debugInfo.stats.total_reps >= 1000 ? '✅ Eligible' : '❌ Need ' + (1000 - debugInfo.stats.total_reps) + ' more'}</div>
                                    <div>• Rep Goat (5000): {debugInfo.stats.total_reps >= 5000 ? '✅ Eligible' : '❌ Need ' + (5000 - debugInfo.stats.total_reps) + ' more'}</div>
                                </div>
                            </div>

                            <div className="bg-gray-900 p-3 rounded">
                                <div className="font-semibold mb-2">Special Badges:</div>
                                <div className="space-y-1 text-gray-300">
                                    <div>• 6 7 (67 reps): {debugInfo.drillResults.some(r => r.reps === 67) ? '✅ Eligible' : '❌ Not yet'}</div>
                                    <div>• Lucky 77 (77 reps): {debugInfo.drillResults.some(r => r.reps === 77) ? '✅ Eligible' : '❌ Not yet'}</div>
                                    <div>• Early Bird (before 6 AM): {debugInfo.drillResults.some(r => new Date(r.completed_at).getHours() < 6) ? '✅ Eligible' : '❌ Not yet'}</div>
                                    <div>• Night Owl (after 10 PM): {debugInfo.drillResults.some(r => new Date(r.completed_at).getHours() >= 22) ? '✅ Eligible' : '❌ Not yet'}</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-yellow-400">No stats available to check eligibility</div>
                    )}
                </div>
            </div>
        </div>
    );
}