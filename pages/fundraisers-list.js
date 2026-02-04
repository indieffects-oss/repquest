// pages/fundraisers-list.js
// Browse all active/public fundraisers (for fans, players, anyone)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function FundraisersList({ user, userProfile }) {
    const router = useRouter();
    const [fundraisers, setFundraisers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // 'active', 'upcoming', 'ended', 'all'

    useEffect(() => {
        fetchFundraisers();
    }, [filter]);

    const fetchFundraisers = async () => {
        try {
            let query = supabase
                .from('fundraisers')
                .select(`
          *,
          team:teams!team_id (name, logo_url, sport),
          creator:users!created_by (display_name),
          fundraiser_pledges (id),
          fundraiser_progress (fundraiser_levels_earned)
        `)
                .order('created_at', { ascending: false });

            // Apply status filter
            const today = new Date().toISOString().split('T')[0];

            if (filter === 'active') {
                query = query
                    .lte('start_date', today)
                    .gte('end_date', today);
            } else if (filter === 'upcoming') {
                query = query.gt('start_date', today);
            } else if (filter === 'ended') {
                query = query.lt('end_date', today);
            }
            // 'all' = no date filter

            const { data, error } = await query;

            if (error) throw error;
            setFundraisers(data || []);
        } catch (err) {
            console.error('Error fetching fundraisers:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (fundraiser) => {
        const today = new Date().toISOString().split('T')[0];
        const start = fundraiser.start_date;
        const end = fundraiser.end_date;

        if (today < start) {
            return <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-semibold">UPCOMING</span>;
        } else if (today >= start && today <= end) {
            return <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">ACTIVE</span>;
        } else {
            return <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-semibold">ENDED</span>;
        }
    };

    const calculateStats = (fundraiser) => {
        const pledgeCount = fundraiser.fundraiser_pledges?.length || 0;
        const levelsEarned = fundraiser.fundraiser_progress?.reduce(
            (sum, p) => sum + (p.fundraiser_levels_earned || 0),
            0
        ) || 0;

        return { pledgeCount, levelsEarned };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-white text-xl">Loading fundraisers...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        💰 Support Athletes
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        Browse fundraisers and pledge to support players reaching their goals
                    </p>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${filter === 'active'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        ✅ Active
                    </button>
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${filter === 'upcoming'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        🗓️ Upcoming
                    </button>
                    <button
                        onClick={() => setFilter('ended')}
                        className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${filter === 'ended'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        🏁 Ended
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${filter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        📋 All
                    </button>
                </div>

                {/* Not signed in CTA */}
                {!user && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6 mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-white font-bold text-lg mb-2">
                                    Want to support these athletes?
                                </h3>
                                <p className="text-blue-200 text-sm">
                                    Create a free supporter account to pledge and track player progress
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/fan-signup')}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap"
                            >
                                Sign Up Free
                            </button>
                        </div>
                    </div>
                )}

                {/* Fundraisers Grid */}
                {fundraisers.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">🔍</div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            No fundraisers found
                        </h2>
                        <p className="text-gray-400">
                            {filter === 'active' && 'No active fundraisers at the moment. Check back soon!'}
                            {filter === 'upcoming' && 'No upcoming fundraisers scheduled yet.'}
                            {filter === 'ended' && 'No completed fundraisers to display.'}
                            {filter === 'all' && 'No fundraisers have been created yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fundraisers.map(fundraiser => {
                            const stats = calculateStats(fundraiser);
                            const isActive = new Date().toISOString().split('T')[0] >= fundraiser.start_date
                                && new Date().toISOString().split('T')[0] <= fundraiser.end_date;

                            return (
                                <div
                                    key={fundraiser.id}
                                    className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition cursor-pointer"
                                    onClick={() => router.push(`/fundraiser/${fundraiser.id}`)}
                                >
                                    {/* Team Info */}
                                    <div className="flex items-center gap-3 mb-4">
                                        {fundraiser.team?.logo_url ? (
                                            <img
                                                src={fundraiser.team.logo_url}
                                                alt={fundraiser.team.name}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                                                🏆
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-gray-400 truncate">
                                                {fundraiser.team?.name || 'Team'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {fundraiser.team?.sport || 'Sports'}
                                            </div>
                                        </div>
                                        {getStatusBadge(fundraiser)}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                                        {fundraiser.title}
                                    </h3>

                                    {/* Description */}
                                    {fundraiser.description && (
                                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                            {fundraiser.description}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-xs text-gray-400 mb-1">Levels</div>
                                            <div className="text-blue-400 font-bold">
                                                {stats.levelsEarned}
                                            </div>
                                        </div>
                                        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-xs text-gray-400 mb-1">Pledges</div>
                                            <div className="text-purple-400 font-bold">
                                                {stats.pledgeCount}
                                            </div>
                                        </div>
                                        <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                                            <div className="text-xs text-gray-400 mb-1">Type</div>
                                            <div className="text-gray-300 text-xs font-semibold">
                                                {fundraiser.fundraiser_type === 'player' ? 'Player' : 'Team'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="text-xs text-gray-500 mb-3">
                                        {new Date(fundraiser.start_date + 'T12:00:00').toLocaleDateString()} - {new Date(fundraiser.end_date + 'T12:00:00').toLocaleDateString()}
                                    </div>

                                    {/* CTA Button */}
                                    <button
                                        className={`w-full py-2 rounded-lg font-semibold transition ${isActive
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                            }`}
                                    >
                                        {isActive ? 'View & Pledge' : 'View Details'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}