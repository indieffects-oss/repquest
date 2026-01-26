// pages/my-fundraisers.js
// Player view of their active fundraisers - NOW WITH QR CODES AND CREATE BUTTON!
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import QRCodeModal from '../components/QRCodeModal';

export default function MyFundraisers({ user, userProfile }) {
    const router = useRouter();
    const [fundraisers, setFundraisers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedFundraiser, setSelectedFundraiser] = useState(null);

    useEffect(() => {
        if (!user || !userProfile) return;

        // Redirect based on role
        if (userProfile.role === 'coach') {
            router.push('/fundraisers');
            return;
        }

        if (userProfile.role === 'fan') {
            router.push('/my-pledges');
            return;
        }

        // Player - fetch their fundraisers
        fetchMyFundraisers();
    }, [user, userProfile]);

    const fetchMyFundraisers = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Get fundraisers where this player is participating
            const { data: progressData, error: progressError } = await supabase
                .from('fundraiser_progress')
                .select(`
          *,
          fundraiser:fundraisers!fundraiser_id (
            id,
            title,
            description,
            start_date,
            end_date,
            status,
            goal_amount,
            estimated_min_levels,
            estimated_max_levels,
            fundraiser_type,
            team:teams!team_id (name, logo_url)
          )
        `)
                .eq('user_id', user.id);

            if (progressError) throw progressError;

            // Get pledges for each fundraiser
            const fundraisersWithPledges = await Promise.all(
                (progressData || []).map(async (prog) => {
                    const { data: pledges } = await supabase
                        .from('fundraiser_pledges')
                        .select('*')
                        .eq('fundraiser_id', prog.fundraiser.id)
                        .or(`player_id.eq.${user.id},player_id.is.null`);

                    return {
                        ...prog,
                        pledges: pledges || []
                    };
                })
            );

            setFundraisers(fundraisersWithPledges);
        } catch (err) {
            console.error('Error fetching fundraisers:', err);
        } finally {
            setLoading(false);
        }
    };

    // Sort fundraisers: active first, upcoming second, ended last
    const sortedFundraisers = fundraisers.sort((a, b) => {
        const today = new Date().toISOString().split('T')[0];

        const aStatus = today < a.fundraiser.start_date ? 'upcoming' :
            today > a.fundraiser.end_date ? 'ended' : 'active';
        const bStatus = today < b.fundraiser.start_date ? 'upcoming' :
            today > b.fundraiser.end_date ? 'ended' : 'active';

        const statusOrder = { active: 0, upcoming: 1, ended: 2 };
        return statusOrder[aStatus] - statusOrder[bStatus];
    });

    const calculateTotalRaised = (fundraiser) => {
        const levelsEarned = fundraiser.fundraiser_levels_earned || 0;

        return fundraiser.pledges.reduce((sum, pledge) => {
            if (pledge.pledge_type === 'flat') {
                return sum + (parseFloat(pledge.flat_amount) || 0);
            } else {
                const uncapped = levelsEarned * (parseFloat(pledge.amount_per_level) || 0);
                return sum + Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
            }
        }, 0);
    };

    const calculatePotentialTotal = (fundraiser) => {
        const estimatedLevels = fundraiser.fundraiser.estimated_max_levels || 5;

        return fundraiser.pledges.reduce((sum, pledge) => {
            if (pledge.pledge_type === 'flat') {
                return sum + (parseFloat(pledge.flat_amount) || 0);
            } else {
                const uncapped = estimatedLevels * (parseFloat(pledge.amount_per_level) || 0);
                return sum + Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
            }
        }, 0);
    };

    const getStatusBadge = (fundraiser) => {
        const today = new Date().toISOString().split('T')[0];
        const start = fundraiser.start_date;
        const end = fundraiser.end_date;

        if (today < start) {
            const daysUntil = Math.ceil((new Date(start) - new Date(today)) / (1000 * 60 * 60 * 24));
            return (
                <span className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    Starts in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                </span>
            );
        } else if (today >= start && today <= end) {
            const daysLeft = Math.ceil((new Date(end) - new Date(today)) / (1000 * 60 * 60 * 24));
            return (
                <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    ✅ Active • {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                </span>
            );
        } else {
            return (
                <span className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    🏁 Ended
                </span>
            );
        }
    };

    const copyFundraiserLink = (fundraiserId) => {
        const link = `${window.location.origin}/fundraiser/${fundraiserId}`;
        navigator.clipboard.writeText(link);
        alert('📋 Fundraiser link copied! Share this with your supporters.');
    };

    const openQRModal = (fundraiser) => {
        setSelectedFundraiser(fundraiser.fundraiser);
        setQrModalOpen(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-white text-xl">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                            💰 My Fundraisers
                        </h1>
                        <p className="text-gray-400 text-sm sm:text-base">
                            Track your progress and see who's supporting you
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/create-fundraiser')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base whitespace-nowrap"
                    >
                        + Create Fundraiser
                    </button>
                </div>

                {/* No Fundraisers */}
                {fundraisers.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">💰</div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            No Active Fundraisers
                        </h2>
                        <p className="text-gray-400 mb-4">
                            Create your own fundraiser to raise money for your team fees, or wait for your coach to start a team fundraiser.
                        </p>
                        <button
                            onClick={() => router.push('/create-fundraiser')}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                        >
                            + Create My Fundraiser
                        </button>
                    </div>
                ) : (
                    /* Fundraiser Cards */
                    <div className="grid gap-6">
                        {sortedFundraisers.map(fundraiser => {
                            const isActive = new Date().toISOString().split('T')[0] >= fundraiser.fundraiser.start_date
                                && new Date().toISOString().split('T')[0] <= fundraiser.fundraiser.end_date;
                            const isEnded = new Date().toISOString().split('T')[0] > fundraiser.fundraiser.end_date;
                            const currentRaised = calculateTotalRaised(fundraiser);
                            const potentialTotal = calculatePotentialTotal(fundraiser);

                            return (
                                <div key={fundraiser.fundraiser.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h2 className="text-2xl font-bold text-white">
                                                    {fundraiser.fundraiser.title}
                                                </h2>
                                                {getStatusBadge(fundraiser.fundraiser)}
                                            </div>
                                            {fundraiser.fundraiser.team && (
                                                <p className="text-gray-400 text-sm mb-1">
                                                    {fundraiser.fundraiser.team.name}
                                                </p>
                                            )}
                                            {fundraiser.fundraiser.description && (
                                                <p className="text-gray-400 text-sm mb-2">
                                                    {fundraiser.fundraiser.description}
                                                </p>
                                            )}
                                            <p className="text-gray-500 text-xs">
                                                {new Date(fundraiser.fundraiser.start_date).toLocaleDateString()} - {new Date(fundraiser.fundraiser.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Stats */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-gray-700/50 rounded-lg p-4">
                                            <div className="text-gray-400 text-xs mb-1">Your Levels</div>
                                            <div className="text-blue-400 text-2xl font-bold">
                                                {fundraiser.fundraiser_levels_earned}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                                Goal: {fundraiser.fundraiser.estimated_min_levels}-{fundraiser.fundraiser.estimated_max_levels}
                                            </div>
                                        </div>

                                        <div className="bg-gray-700/50 rounded-lg p-4">
                                            <div className="text-gray-400 text-xs mb-1">Points Earned</div>
                                            <div className="text-purple-400 text-2xl font-bold">
                                                {fundraiser.fundraiser_points_earned.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="bg-gray-700/50 rounded-lg p-4">
                                            <div className="text-gray-400 text-xs mb-1">Supporters</div>
                                            <div className="text-green-400 text-2xl font-bold">
                                                {fundraiser.pledges.length}
                                            </div>
                                        </div>

                                        <div className="bg-gray-700/50 rounded-lg p-4">
                                            <div className="text-gray-400 text-xs mb-1">
                                                {isEnded ? 'Total Raised' : 'Current Value'}
                                            </div>
                                            <div className="text-green-400 text-2xl font-bold">
                                                ${currentRaised.toFixed(2)}
                                            </div>
                                            {!isEnded && (
                                                <div className="text-gray-500 text-xs">
                                                    Potential: ${potentialTotal.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Next Level Progress */}
                                    {isActive && (
                                        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg p-4 mb-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-green-300 text-sm font-semibold mb-1">
                                                        Next Level Progress
                                                    </div>
                                                    <div className="text-white">
                                                        {1000 - (fundraiser.fundraiser_points_earned % 1000)} points to Level {Math.floor(fundraiser.fundraiser_points_earned / 1000) + 1}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-green-400">Worth</div>
                                                    <div className="text-2xl font-bold text-green-400">
                                                        ${fundraiser.pledges.reduce((sum, p) => {
                                                            if (p.pledge_type === 'per_level') {
                                                                const levelsEarned = fundraiser.fundraiser_levels_earned;
                                                                const nextLevel = levelsEarned + 1;
                                                                const perLevel = parseFloat(p.amount_per_level) || 0;
                                                                const max = parseFloat(p.max_amount) || 0;
                                                                if (nextLevel * perLevel <= max) {
                                                                    return sum + perLevel;
                                                                }
                                                            }
                                                            return sum;
                                                        }, 0).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${((fundraiser.fundraiser_points_earned % 1000) / 1000) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Supporters List */}
                                    {fundraiser.pledges.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="text-white font-semibold mb-3">
                                                Your Supporters ({fundraiser.pledges.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {fundraiser.pledges.map(pledge => {
                                                    const pledgeValue = pledge.pledge_type === 'flat'
                                                        ? parseFloat(pledge.flat_amount)
                                                        : Math.min(
                                                            fundraiser.fundraiser_levels_earned * parseFloat(pledge.amount_per_level),
                                                            parseFloat(pledge.max_amount)
                                                        );

                                                    return (
                                                        <div key={pledge.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                                                            <div>
                                                                <div className="text-white font-semibold">
                                                                    {pledge.donor_name}
                                                                </div>
                                                                <div className="text-gray-400 text-sm">
                                                                    {pledge.pledge_type === 'flat'
                                                                        ? `$${parseFloat(pledge.flat_amount).toFixed(2)} donation`
                                                                        : `$${parseFloat(pledge.amount_per_level).toFixed(2)}/level (max $${parseFloat(pledge.max_amount).toFixed(2)})`
                                                                    }
                                                                </div>
                                                            </div>
                                                            <div className="text-green-400 font-bold text-lg">
                                                                ${pledgeValue.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Share Options */}
                                    <div className="border-t border-gray-700 pt-4">
                                        <div className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={`${window.location.origin}/fundraiser/${fundraiser.fundraiser.id}`}
                                                readOnly
                                                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                            />
                                            <button
                                                onClick={() => copyFundraiserLink(fundraiser.fundraiser.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
                                            >
                                                📋 Copy Link
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openQRModal(fundraiser)}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                            >
                                                📱 QR Code
                                            </button>
                                            <button
                                                onClick={() => router.push(`/fundraiser/${fundraiser.fundraiser.id}`)}
                                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                            >
                                                View Page
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">
                                            💡 Share this link or QR code with family and friends so they can support you!
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* QR Code Modal */}
                <QRCodeModal
                    fundraiser={selectedFundraiser}
                    isOpen={qrModalOpen}
                    onClose={() => setQrModalOpen(false)}
                />
            </div>
        </div>
    );
}