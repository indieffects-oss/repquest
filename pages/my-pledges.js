// pages/my-pledges.js
// Fan/donor view of their pledges and fundraiser progress - WITH QR CODES
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import QRCodeModal from '../components/QRCodeModal';

export default function MyPledges({ user, userProfile }) {
    const router = useRouter();
    const [pledges, setPledges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedFundraiser, setSelectedFundraiser] = useState(null);

    useEffect(() => {
        if (!user || !userProfile) return;

        // Redirect non-fans
        if (userProfile.role !== 'fan') {
            router.push(userProfile.role === 'coach' ? '/fundraisers' : '/my-fundraisers');
            return;
        }

        fetchMyPledges();
    }, [user, userProfile]);

    const fetchMyPledges = async () => {
        try {
            // Get all pledges by this user
            const { data: pledgesData, error: pledgesError } = await supabase
                .from('fundraiser_pledges')
                .select(`
                    *,
                    fundraiser:fundraisers!fundraiser_id (
                        id,
                        title,
                        description,
                        start_date,
                        end_date,
                        status,
                        fundraiser_type,
                        estimated_max_levels,
                        prize_tiers,
                        team:teams!team_id (name, logo_url)
                    )
                `)
                .eq('donor_user_id', user.id)
                .order('created_at', { ascending: false });

            if (pledgesError) throw pledgesError;

            // For each pledge, get the relevant progress
            const pledgesWithProgress = await Promise.all(
                (pledgesData || []).map(async (pledge) => {
                    // If pledge is for specific player, get their progress
                    if (pledge.player_id) {
                        const { data: progress } = await supabase
                            .from('fundraiser_progress')
                            .select(`
                                *,
                                user:users!user_id (display_name, profile_picture_url)
                            `)
                            .eq('fundraiser_id', pledge.fundraiser_id)
                            .eq('user_id', pledge.player_id)
                            .single();

                        return { ...pledge, progress };
                    } else {
                        // Team fundraiser - get all progress
                        const { data: progress } = await supabase
                            .from('fundraiser_progress')
                            .select(`
                                *,
                                user:users!user_id (display_name, profile_picture_url)
                            `)
                            .eq('fundraiser_id', pledge.fundraiser_id);

                        return { ...pledge, progress };
                    }
                })
            );

            setPledges(pledgesWithProgress);
        } catch (err) {
            console.error('Error fetching pledges:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateCurrentAmount = (pledge) => {
        if (!pledge.progress) return 0;

        if (pledge.pledge_type === 'flat') {
            return parseFloat(pledge.flat_amount) || 0;
        }

        // Per-level pledge
        const levelsEarned = Array.isArray(pledge.progress)
            ? pledge.progress.reduce((sum, p) => sum + (p.fundraiser_levels_earned || 0), 0)
            : pledge.progress.fundraiser_levels_earned || 0;

        const uncapped = levelsEarned * (parseFloat(pledge.amount_per_level) || 0);
        return Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
    };

    const calculatePotentialAmount = (pledge) => {
        if (pledge.pledge_type === 'flat') {
            return parseFloat(pledge.flat_amount) || 0;
        }

        const estimatedLevels = pledge.fundraiser?.estimated_max_levels || 5;
        const uncapped = estimatedLevels * (parseFloat(pledge.amount_per_level) || 0);
        return Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
    };

    const getStatusBadge = (fundraiser) => {
        const today = new Date().toISOString().split('T')[0];
        const start = fundraiser.start_date;
        const end = fundraiser.end_date;

        if (today < start) {
            return <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">UPCOMING</span>;
        } else if (today >= start && today <= end) {
            return <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">ACTIVE</span>;
        } else {
            return <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">ENDED</span>;
        }
    };

    const openQRModal = (fundraiser) => {
        setSelectedFundraiser(fundraiser);
        setQrModalOpen(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-white text-xl">Loading your pledges...</div>
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
                        💚 My Pledges
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        Track the athletes you're supporting
                    </p>
                </div>

                {/* Summary Stats */}
                {pledges.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="text-gray-400 text-xs mb-1">Total Pledges</div>
                            <div className="text-white text-2xl font-bold">
                                {pledges.length}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                            <div className="text-gray-400 text-xs mb-1">Current Amount</div>
                            <div className="text-green-400 text-2xl font-bold">
                                ${pledges.reduce((sum, p) => sum + calculateCurrentAmount(p), 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 col-span-2 sm:col-span-1">
                            <div className="text-gray-400 text-xs mb-1">Potential Total</div>
                            <div className="text-blue-400 text-2xl font-bold">
                                ${pledges.reduce((sum, p) => sum + calculatePotentialAmount(p), 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                )}

                {/* No Pledges */}
                {pledges.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">💰</div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            No Pledges Yet
                        </h2>
                        <p className="text-gray-400 mb-4">
                            When a coach or player shares a fundraiser link with you, you can make a pledge to support them.
                        </p>
                        <p className="text-gray-500 text-sm">
                            💡 Pledges help athletes track their progress and raise money for their team goals.
                        </p>
                    </div>
                ) : (
                    /* Pledge Cards */
                    <div className="grid gap-6">
                        {pledges.map(pledge => {
                            const isActive = new Date().toISOString().split('T')[0] >= pledge.fundraiser.start_date
                                && new Date().toISOString().split('T')[0] <= pledge.fundraiser.end_date;
                            const isEnded = new Date().toISOString().split('T')[0] > pledge.fundraiser.end_date;
                            const currentAmount = calculateCurrentAmount(pledge);
                            const potentialAmount = calculatePotentialAmount(pledge);

                            return (
                                <div key={pledge.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h2 className="text-xl font-bold text-white">
                                                    {pledge.fundraiser.title}
                                                </h2>
                                                {getStatusBadge(pledge.fundraiser)}
                                            </div>
                                            {pledge.fundraiser.team && (
                                                <p className="text-gray-400 text-sm mb-1">
                                                    {pledge.fundraiser.team.name}
                                                </p>
                                            )}
                                            <p className="text-gray-500 text-xs">
                                                {new Date(pledge.fundraiser.start_date).toLocaleDateString()} - {new Date(pledge.fundraiser.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Your Pledge Info */}
                                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                                        <h3 className="text-blue-300 text-sm font-semibold mb-2">Your Pledge Details</h3>
                                        <div className="text-white space-y-2">
                                            {pledge.pledge_type === 'flat' ? (
                                                <div>
                                                    <div className="text-sm text-gray-400">Pledge Type:</div>
                                                    <div className="text-lg">
                                                        <span className="font-bold text-green-400">${parseFloat(pledge.flat_amount).toFixed(2)}</span> flat donation
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-sm text-gray-400 mb-1">Pledge Type: Per Level</div>
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        <div>
                                                            <span className="text-gray-400">Per Level:</span>
                                                            <div className="font-bold text-green-400">${parseFloat(pledge.amount_per_level).toFixed(2)}</div>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">Maximum:</span>
                                                            <div className="font-bold text-yellow-400">${parseFloat(pledge.max_amount).toFixed(2)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Prize Tiers */}
                                    {pledge.fundraiser?.prize_tiers && pledge.fundraiser.prize_tiers.length > 0 && (
                                        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-4">
                                            <h3 className="text-purple-300 text-sm font-semibold mb-3">🎁 Donor Rewards</h3>
                                            <div className="space-y-2">
                                                {pledge.fundraiser.prize_tiers.map((tier, idx) => {
                                                    const qualified = currentAmount >= tier.amount;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`flex items-center justify-between p-2 rounded ${qualified ? 'bg-green-900/30 border border-green-700' : 'bg-gray-700/30'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {qualified && <span className="text-green-400">✓</span>}
                                                                <span className="text-white text-sm">{tier.description}</span>
                                                            </div>
                                                            <span className={`font-bold text-sm ${qualified ? 'text-green-400' : 'text-gray-400'}`}>
                                                                ${tier.amount}+
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Progress */}
                                    {pledge.progress && (
                                        <div className="mb-4">
                                            <h3 className="text-white font-semibold mb-3">
                                                {Array.isArray(pledge.progress) ? 'Team Progress' : 'Player Progress'}
                                            </h3>

                                            {Array.isArray(pledge.progress) ? (
                                                // Team fundraiser - show all players
                                                <div className="space-y-2">
                                                    {pledge.progress.map(p => (
                                                        <div key={p.user_id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                                                            <div className="flex items-center gap-3">
                                                                {p.user?.profile_picture_url ? (
                                                                    <img
                                                                        src={p.user.profile_picture_url}
                                                                        alt={p.user.display_name}
                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                                        {p.user?.display_name?.charAt(0) || '?'}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="text-white font-semibold text-sm">
                                                                        {p.user?.display_name || 'Unknown'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">
                                                                        Level {p.current_level} (+{p.fundraiser_levels_earned} earned)
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-blue-400 font-bold">
                                                                +{p.fundraiser_levels_earned}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                // Individual player
                                                <div className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-4">
                                                    {pledge.progress.user?.profile_picture_url ? (
                                                        <img
                                                            src={pledge.progress.user.profile_picture_url}
                                                            alt={pledge.progress.user.display_name}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                                                            {pledge.progress.user?.display_name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="text-white font-semibold">
                                                            {pledge.progress.user?.display_name || 'Unknown'}
                                                        </div>
                                                        <div className="text-sm text-gray-400">
                                                            Level {pledge.progress.starting_level} → {pledge.progress.current_level}
                                                            <span className="text-green-400 ml-2">
                                                                (+{pledge.progress.fundraiser_levels_earned} levels earned!)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Amount Stats */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-700/50 rounded-lg p-3">
                                            <div className="text-gray-400 text-xs mb-1">
                                                {isEnded ? 'Final Amount' : 'Current Amount'}
                                            </div>
                                            <div className="text-green-400 text-xl font-bold">
                                                ${currentAmount.toFixed(2)}
                                            </div>
                                        </div>
                                        {!isEnded && (
                                            <div className="bg-gray-700/50 rounded-lg p-3">
                                                <div className="text-gray-400 text-xs mb-1">Potential</div>
                                                <div className="text-blue-400 text-xl font-bold">
                                                    ${potentialAmount.toFixed(2)}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                        <div className="text-sm">
                                            <span className="text-gray-400">Status: </span>
                                            <span className={`font-semibold ${pledge.payment_status === 'collected' ? 'text-green-400' :
                                                pledge.payment_status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                {pledge.payment_status === 'pending' ? 'Pledge Active' :
                                                    pledge.payment_status === 'collected' ? 'Payment Collected' :
                                                        'Cancelled'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openQRModal(pledge.fundraiser)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold transition text-sm"
                                            >
                                                📱 QR
                                            </button>
                                            <button
                                                onClick={() => router.push(`/fundraiser/${pledge.fundraiser_id}`)}
                                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
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

                {/* Info Box */}
                {pledges.length > 0 && (
                    <div className="mt-6 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">ℹ️</div>
                            <div className="flex-1">
                                <h3 className="text-yellow-300 font-semibold mb-1">About Your Pledges</h3>
                                <p className="text-yellow-200 text-sm">
                                    These are commitments, not payments. After each fundraiser ends, the coach will contact you
                                    with details on how to complete your pledge based on the final levels earned.
                                </p>
                            </div>
                        </div>
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