// pages/fundraiser/[id].js
// Public fundraiser page where fans can view progress and make pledges
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function FundraiserPage({ user, userProfile }) {
    const router = useRouter();
    const { id } = router.query;

    const [fundraiser, setFundraiser] = useState(null);
    const [progress, setProgress] = useState([]);
    const [pledges, setPledges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPledgeForm, setShowPledgeForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [existingPledges, setExistingPledges] = useState([]);

    const [pledgeForm, setPledgeForm] = useState({
        pledge_type: 'per_level',
        amount_per_level: '',
        max_amount: '',
        flat_amount: '',
        player_id: ''
    });

    useEffect(() => {
        if (!id) return;
        fetchFundraiser();
    }, [id]);

    const fetchFundraiser = async () => {
        try {
            const { data: fundraiserData, error: fundraiserError } = await supabase
                .from('fundraisers')
                .select(`
          *,
          creator:users!created_by (display_name, email),
          team:teams!team_id (name, logo_url, primary_color, secondary_color)
        `)
                .eq('id', id)
                .single();

            if (fundraiserError) throw fundraiserError;

            if (!fundraiserData) {
                alert('Fundraiser not found');
                router.push('/');
                return;
            }

            setFundraiser(fundraiserData);

            const { data: progressData, error: progressError } = await supabase
                .from('fundraiser_progress')
                .select(`
          *,
          user:users!user_id (display_name, profile_picture_url)
        `)
                .eq('fundraiser_id', id);

            if (progressError) throw progressError;
            setProgress(progressData || []);

            const { data: pledgesData, error: pledgesError } = await supabase
                .from('fundraiser_pledges')
                .select('pledge_type, amount_per_level, max_amount, flat_amount, donor_name')
                .eq('fundraiser_id', id);

            if (pledgesError) throw pledgesError;
            setPledges(pledgesData || []);

            // If user is logged in, get their existing pledges
            if (user) {
                const { data: userPledges } = await supabase
                    .from('fundraiser_pledges')
                    .select('*, player:users!player_id(display_name)')
                    .eq('fundraiser_id', id)
                    .eq('donor_user_id', user.id);

                setExistingPledges(userPledges || []);
            }

        } catch (err) {
            console.error('Error fetching fundraiser:', err);
            alert('Failed to load fundraiser');
        } finally {
            setLoading(false);
        }
    };

    const handleMakePledgeClick = () => {
        // Check login IMMEDIATELY when button clicked
        // Must check BOTH user and userProfile due to async loading
        if (!user || !userProfile) {
            const shouldCreateAccount = window.confirm(
                'You need to be signed in to make a pledge.\n\n' +
                'Click OK to create a supporter account, or Cancel to sign in with an existing account.'
            );

            if (shouldCreateAccount) {
                router.push(`/fan-signup?redirect=/fundraiser/${id}`);
            } else {
                router.push(`/?redirect=/fundraiser/${id}`);
            }
            return;
        }

        // User is logged in and profile is loaded, show form
        setShowPledgeForm(true);
    };

    const handlePledgeSubmit = async (e) => {
        e.preventDefault();

        // Double-check (shouldn't be needed but just in case)
        if (!user) {
            alert('Your session expired. Please sign in again.');
            router.push(`/?redirect=/fundraiser/${id}`);
            return;
        }

        // Validation
        if (fundraiser.fundraiser_type === 'team' && !pledgeForm.player_id) {
            alert('Please select which player you want to support');
            return;
        }

        if (pledgeForm.pledge_type === 'per_level') {
            if (!pledgeForm.amount_per_level || parseFloat(pledgeForm.amount_per_level) <= 0) {
                alert('Please enter a valid amount per level');
                return;
            }
            if (!pledgeForm.max_amount || parseFloat(pledgeForm.max_amount) <= 0) {
                alert('Please enter a valid maximum amount');
                return;
            }
            if (parseFloat(pledgeForm.max_amount) < parseFloat(pledgeForm.amount_per_level)) {
                alert('Maximum amount must be at least as much as amount per level');
                return;
            }
        } else {
            if (!pledgeForm.flat_amount || parseFloat(pledgeForm.flat_amount) <= 0) {
                alert('Please enter a valid amount');
                return;
            }
        }

        // Check if user already pledged on this player
        if (fundraiser.fundraiser_type === 'team' && pledgeForm.player_id) {
            const existingOnPlayer = existingPledges.find(p => p.player_id === pledgeForm.player_id);
            if (existingOnPlayer) {
                const playerName = existingOnPlayer.player?.display_name || 'this player';
                const shouldContinue = window.confirm(
                    `⚠️ You already have a pledge for ${playerName}:\n\n` +
                    `${existingOnPlayer.pledge_type === 'flat'
                        ? `Flat: $${existingOnPlayer.flat_amount}`
                        : `$${existingOnPlayer.amount_per_level}/level (max $${existingOnPlayer.max_amount})`}\n\n` +
                    `Do you want to add ANOTHER pledge for ${playerName}? This will be separate from your existing pledge.`
                );

                if (!shouldContinue) {
                    return;
                }
            }
        }

        setSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/fundraisers/pledge', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundraiser_id: id,
                    player_id: fundraiser.fundraiser_type === 'team' ? pledgeForm.player_id : null,
                    ...pledgeForm
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create pledge');
            }

            alert(`✅ ${result.message}\n\nEstimated total: $${result.estimatedAmount.toFixed(2)}`);
            setShowPledgeForm(false);
            setPledgeForm({
                pledge_type: 'per_level',
                amount_per_level: '',
                max_amount: '',
                flat_amount: '',
                player_id: ''
            });
            fetchFundraiser();
        } catch (err) {
            console.error('Error creating pledge:', err);
            alert('Failed to create pledge: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const calculateTotalLevelsEarned = () => {
        return progress.reduce((sum, p) => sum + (p.fundraiser_levels_earned || 0), 0);
    };

    const calculateEstimatedTotal = () => {
        const isEnded = new Date().toISOString().split('T')[0] > fundraiser.end_date;
        const levelsToUse = isEnded
            ? calculateTotalLevelsEarned()
            : fundraiser.estimated_max_levels || 5;

        return pledges.reduce((sum, pledge) => {
            if (pledge.pledge_type === 'flat') {
                return sum + (parseFloat(pledge.flat_amount) || 0);
            } else {
                const uncapped = levelsToUse * (parseFloat(pledge.amount_per_level) || 0);
                return sum + Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
            }
        }, 0);
    };

    const calculateUserPledgeTotal = () => {
        if (pledgeForm.pledge_type === 'flat') {
            return parseFloat(pledgeForm.flat_amount) || 0;
        } else {
            const estimatedLevels = fundraiser.estimated_max_levels || 5;
            const uncapped = estimatedLevels * (parseFloat(pledgeForm.amount_per_level) || 0);
            return Math.min(uncapped, parseFloat(pledgeForm.max_amount) || 0);
        }
    };

    const getStatusBadge = () => {
        const today = new Date().toISOString().split('T')[0];
        const start = fundraiser.start_date;
        const end = fundraiser.end_date;

        if (today < start) {
            const daysUntil = Math.ceil((new Date(start) - new Date(today)) / (1000 * 60 * 60 * 24));
            return (
                <span className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                    🗓️ Starts in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading fundraiser...</div>
            </div>
        );
    }

    if (!fundraiser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Fundraiser not found</div>
            </div>
        );
    }

    const isActive = new Date().toISOString().split('T')[0] >= fundraiser.start_date
        && new Date().toISOString().split('T')[0] <= fundraiser.end_date;
    const isEnded = new Date().toISOString().split('T')[0] > fundraiser.end_date;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-700 mb-6">
                    <div className="flex items-start gap-4 mb-4">
                        {fundraiser.team?.logo_url && (
                            <img
                                src={fundraiser.team.logo_url}
                                alt={fundraiser.team.name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                    {fundraiser.title}
                                </h1>
                                {getStatusBadge()}
                            </div>
                            <p className="text-gray-400 text-sm">
                                {fundraiser.team?.name} • {new Date(fundraiser.start_date).toLocaleDateString()} - {new Date(fundraiser.end_date).toLocaleDateString()}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                {fundraiser.fundraiser_type === 'player' ? 'Player Fundraiser' : 'Team Fundraiser'}
                            </p>
                        </div>
                    </div>

                    {fundraiser.description && (
                        <p className="text-gray-300 mb-4 whitespace-pre-line">{fundraiser.description}</p>
                    )}

                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1">Levels Earned</div>
                            <div className="text-blue-400 text-2xl font-bold">
                                {calculateTotalLevelsEarned()}
                            </div>
                            <div className="text-gray-500 text-xs">
                                Est: {fundraiser.estimated_min_levels}-{fundraiser.estimated_max_levels}
                            </div>
                        </div>

                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <div className="text-gray-400 text-xs mb-1">Supporters</div>
                            <div className="text-purple-400 text-2xl font-bold">
                                {pledges.length}
                            </div>
                        </div>

                        <div className="bg-gray-700/50 rounded-lg p-4 sm:col-span-2">
                            <div className="text-gray-400 text-xs mb-1">
                                {isEnded ? 'Total Raised' : 'Potential Total'}
                            </div>
                            <div className="text-green-400 text-2xl font-bold">
                                ${calculateEstimatedTotal().toFixed(2)}
                            </div>
                            {fundraiser.goal_amount && (
                                <div className="text-gray-500 text-xs">
                                    Goal: ${fundraiser.goal_amount}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Player Progress (for player fundraisers) */}
                {fundraiser.fundraiser_type === 'player' && progress.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">Player Progress</h2>
                        {progress.map(p => (
                            <div key={p.user_id} className="flex items-center gap-4">
                                {p.user?.profile_picture_url ? (
                                    <img
                                        src={p.user.profile_picture_url}
                                        alt={p.user.display_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                                        {p.user?.display_name?.charAt(0) || '?'}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <div className="text-white font-semibold">{p.user?.display_name || 'Unknown'}</div>
                                    <div className="text-sm text-gray-400">
                                        Level {p.starting_level} → Level {p.current_level}
                                        <span className="text-green-400 ml-2">
                                            (+{p.fundraiser_levels_earned} levels earned!)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Team Progress (for team fundraisers) */}
                {fundraiser.fundraiser_type === 'team' && progress.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">Team Progress</h2>
                        <div className="space-y-3">
                            {progress.map(p => (
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
                                                Level {p.starting_level} → {p.current_level}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-green-400 font-bold">
                                        +{p.fundraiser_levels_earned}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Prize Tiers */}
                {fundraiser.prize_tiers && fundraiser.prize_tiers.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">🎁 Supporter Rewards</h2>
                        <div className="space-y-2">
                            {fundraiser.prize_tiers.map((tier, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                                    <span className="text-white">{tier.description}</span>
                                    <span className="text-green-400 font-bold">${tier.amount}+</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Existing Pledges Warning */}
                {existingPledges.length > 0 && !showPledgeForm && (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                        <h3 className="text-blue-300 font-semibold mb-2">💙 Your Existing Pledges</h3>
                        <div className="space-y-2">
                            {existingPledges.map(pledge => (
                                <div key={pledge.id} className="text-blue-200 text-sm">
                                    {pledge.player ? `${pledge.player.display_name}: ` : ''}
                                    {pledge.pledge_type === 'flat'
                                        ? `$${pledge.flat_amount} flat donation`
                                        : `$${pledge.amount_per_level}/level (max $${pledge.max_amount})`}
                                </div>
                            ))}
                        </div>
                        <p className="text-blue-200 text-xs mt-2">
                            You can make additional pledges below if you'd like to support more players or increase your support!
                        </p>
                    </div>
                )}

                {/* Make Pledge Button */}
                {isActive && !showPledgeForm && (
                    <div className="text-center mb-6">
                        <button
                            onClick={handleMakePledgeClick}
                            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition"
                        >
                            💰 Make a Pledge
                        </button>
                    </div>
                )}

                {/* Pledge Form */}
                {showPledgeForm && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">Make Your Pledge</h2>

                        {/* Show Rewards in Pledge Form */}
                        {fundraiser.prize_tiers && fundraiser.prize_tiers.length > 0 && (
                            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4 mb-4">
                                <h3 className="text-purple-300 font-semibold mb-2 text-sm">🎁 Unlock Rewards</h3>
                                <div className="space-y-1">
                                    {fundraiser.prize_tiers.map((tier, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="text-purple-200">{tier.description}</span>
                                            <span className="text-purple-400 font-bold">${tier.amount}+</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handlePledgeSubmit} className="space-y-4">
                            {/* Player Selection for Team Fundraisers */}
                            {fundraiser.fundraiser_type === 'team' && progress.length > 0 && (
                                <div>
                                    <label className="block text-gray-300 text-sm mb-2">
                                        Which player do you want to support? *
                                    </label>
                                    <select
                                        value={pledgeForm.player_id}
                                        onChange={(e) => setPledgeForm({ ...pledgeForm, player_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Choose a player...</option>
                                        {progress.map(p => (
                                            <option key={p.user_id} value={p.user_id}>
                                                {p.user?.display_name || 'Unknown'} (Level {p.current_level}, +{p.fundraiser_levels_earned} earned)
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Your pledge will track this player's progress. Money goes to the team fund.
                                    </p>
                                </div>
                            )}

                            {/* Pledge Type */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Pledge Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPledgeForm({ ...pledgeForm, pledge_type: 'per_level' })}
                                        className={`p-4 rounded-lg border-2 transition ${pledgeForm.pledge_type === 'per_level'
                                            ? 'border-blue-500 bg-blue-900/30'
                                            : 'border-gray-600 bg-gray-700/50'
                                            }`}
                                    >
                                        <div className="text-white font-semibold mb-1">Per Level</div>
                                        <div className="text-gray-400 text-xs">Most engaging option!</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPledgeForm({ ...pledgeForm, pledge_type: 'flat' })}
                                        className={`p-4 rounded-lg border-2 transition ${pledgeForm.pledge_type === 'flat'
                                            ? 'border-blue-500 bg-blue-900/30'
                                            : 'border-gray-600 bg-gray-700/50'
                                            }`}
                                    >
                                        <div className="text-white font-semibold mb-1">Flat Amount</div>
                                        <div className="text-gray-400 text-xs">Simple donation</div>
                                    </button>
                                </div>
                            </div>

                            {/* Per Level Fields */}
                            {pledgeForm.pledge_type === 'per_level' && (
                                <>
                                    <div>
                                        <label className="block text-gray-300 text-sm mb-2">
                                            Amount per Level ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={pledgeForm.amount_per_level}
                                            onChange={(e) => setPledgeForm({ ...pledgeForm, amount_per_level: e.target.value })}
                                            placeholder="5.00"
                                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-300 text-sm mb-2">
                                            Maximum Total ($)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={pledgeForm.max_amount}
                                            onChange={(e) => setPledgeForm({ ...pledgeForm, max_amount: e.target.value })}
                                            placeholder="50.00"
                                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Flat Amount Field */}
                            {pledgeForm.pledge_type === 'flat' && (
                                <div>
                                    <label className="block text-gray-300 text-sm mb-2">
                                        Donation Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={pledgeForm.flat_amount}
                                        onChange={(e) => setPledgeForm({ ...pledgeForm, flat_amount: e.target.value })}
                                        placeholder="25.00"
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-lg placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* Estimated Total */}
                            {((pledgeForm.pledge_type === 'per_level' && pledgeForm.amount_per_level && pledgeForm.max_amount) ||
                                (pledgeForm.pledge_type === 'flat' && pledgeForm.flat_amount)) && (
                                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                                        <div className="text-blue-300 text-sm mb-1">Estimated Total</div>
                                        <div className="text-white text-3xl font-bold">
                                            ${calculateUserPledgeTotal().toFixed(2)}
                                        </div>
                                        {pledgeForm.pledge_type === 'per_level' && (
                                            <div className="text-blue-200 text-xs mt-2">
                                                Based on {fundraiser.estimated_max_levels} estimated levels
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Submit Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold text-lg transition"
                                >
                                    {submitting ? 'Processing...' : '✓ Confirm Pledge'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPledgeForm(false)}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-yellow-200 text-sm">
                                ⚠️ Note: This is a pledge, not a payment. You'll be contacted after the fundraiser ends with collection details.
                            </div>
                        </form>
                    </div>
                )}

                {/* Share */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-center">
                    <h3 className="text-white font-semibold mb-3">Share This Fundraiser</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={typeof window !== 'undefined' ? window.location.href : ''}
                            readOnly
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                alert('Link copied to clipboard!');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                        >
                            📋 Copy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}