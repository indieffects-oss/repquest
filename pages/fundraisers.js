// pages/fundraisers.js
// Coach interface for creating and managing fundraisers - WITH QR CODES
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import QRCodeModal from '../components/QRCodeModal';
import InfoTooltip from '../components/InfoTooltip';

export default function Fundraisers({ user, userProfile }) {
    const router = useRouter();
    const [fundraisers, setFundraisers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [teams, setTeams] = useState([]);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedFundraiser, setSelectedFundraiser] = useState(null);

    const [form, setForm] = useState({
        owner_id: '',
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        goal_amount: '',
        estimated_min_levels: 5,
        estimated_max_levels: 10,
        prize_tiers: []
    });

    const [newPrizeTier, setNewPrizeTier] = useState({ amount: '', description: '' });

    useEffect(() => {
        if (!user || !userProfile) return;

        if (userProfile.role !== 'coach') {
            router.push('/drills');
            return;
        }

        fetchFundraisers();
        fetchTeams();
    }, [user, userProfile]);

    const fetchFundraisers = async () => {
        try {
            const { data, error } = await supabase
                .from('fundraisers')
                .select(`
          *,
          fundraiser_progress (
            user_id,
            fundraiser_points_earned,
            fundraiser_levels_earned
          ),
          fundraiser_pledges (
            id,
            pledge_type,
            amount_per_level,
            max_amount,
            flat_amount,
            donor_name
          )
        `)
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFundraisers(data || []);
        } catch (err) {
            console.error('Error fetching fundraisers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeams = async () => {
        try {
            // Get coach's teams
            const { data: coachTeams, error: teamsError } = await supabase
                .from('teams')
                .select('id, name')
                .eq('coach_id', user.id);

            if (teamsError) throw teamsError;
            setTeams(coachTeams || []);
        } catch (err) {
            console.error('Error fetching teams:', err);
        }
    };

    const addPrizeTier = () => {
        if (!newPrizeTier.amount || !newPrizeTier.description) {
            alert('Please fill in both amount and description');
            return;
        }

        const tier = {
            amount: parseInt(newPrizeTier.amount),
            description: newPrizeTier.description.trim()
        };

        setForm(prev => ({
            ...prev,
            prize_tiers: [...prev.prize_tiers, tier].sort((a, b) => a.amount - b.amount)
        }));

        setNewPrizeTier({ amount: '', description: '' });
    };

    const removePrizeTier = (index) => {
        setForm(prev => ({
            ...prev,
            prize_tiers: prev.prize_tiers.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.owner_id || !form.title || !form.start_date || !form.end_date) {
            alert('Please fill in all required fields');
            return;
        }

        const startDate = new Date(form.start_date);
        const endDate = new Date(form.end_date);

        if (endDate <= startDate) {
            alert('End date must be after start date');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/fundraisers/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundraiser_type: 'team', // Coach always creates team fundraisers
                    ...form,
                    goal_amount: form.goal_amount ? parseInt(form.goal_amount) : null,
                    estimated_min_levels: parseInt(form.estimated_min_levels),
                    estimated_max_levels: parseInt(form.estimated_max_levels)
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create fundraiser');
            }

            alert('✅ Fundraiser created successfully!');
            setShowCreateForm(false);
            resetForm();
            fetchFundraisers();
        } catch (err) {
            console.error('Error creating fundraiser:', err);
            alert('Failed to create fundraiser: ' + err.message);
        }
    };

    const resetForm = () => {
        setForm({
            owner_id: '',
            title: '',
            description: '',
            start_date: '',
            end_date: '',
            goal_amount: '',
            estimated_min_levels: 5,
            estimated_max_levels: 10,
            prize_tiers: []
        });
        setNewPrizeTier({ amount: '', description: '' });
    };

    const copyFundraiserLink = (fundraiserId) => {
        const link = `${window.location.origin}/fundraiser/${fundraiserId}`;
        navigator.clipboard.writeText(link);
        alert('Fundraiser link copied to clipboard!');
    };

    const openQRModal = (fundraiser) => {
        setSelectedFundraiser(fundraiser);
        setQrModalOpen(true);
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

    const calculateTotalRaised = (fundraiser) => {
        if (!fundraiser.fundraiser_pledges || fundraiser.fundraiser_pledges.length === 0) {
            return 0;
        }

        const isEnded = new Date().toISOString().split('T')[0] > fundraiser.end_date;

        if (isEnded) {
            const totalLevels = fundraiser.fundraiser_progress?.reduce(
                (sum, p) => sum + (p.fundraiser_levels_earned || 0),
                0
            ) || 0;

            return fundraiser.fundraiser_pledges.reduce((sum, pledge) => {
                if (pledge.pledge_type === 'flat') {
                    return sum + (pledge.flat_amount || 0);
                } else {
                    const uncapped = totalLevels * (pledge.amount_per_level || 0);
                    return sum + Math.min(uncapped, pledge.max_amount || 0);
                }
            }, 0);
        } else {
            const estimatedLevels = fundraiser.estimated_max_levels || 5;

            return fundraiser.fundraiser_pledges.reduce((sum, pledge) => {
                if (pledge.pledge_type === 'flat') {
                    return sum + (pledge.flat_amount || 0);
                } else {
                    const uncapped = estimatedLevels * (pledge.amount_per_level || 0);
                    return sum + Math.min(uncapped, pledge.max_amount || 0);
                }
            }, 0);
        }
    };

    if (loading) {
        return <div className="p-6 text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Fundraiser Management</h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        Create team fundraisers to connect player progress with donor support
                    </p>
                </div>

                {/* Create Button */}
                <div className="mb-6">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                    >
                        {showCreateForm ? '✕ Cancel' : '+ Create Team Fundraiser'}
                    </button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">Create Team Fundraiser</h2>

                        {/* Important Notice */}
                        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                            <div className="flex gap-3">
                                <span className="text-2xl">ℹ️</span>
                                <div className="flex-1">
                                    <h3 className="text-blue-300 font-semibold mb-2">How RepQuest Fundraising Works</h3>
                                    <p className="text-blue-200 text-sm mb-2">
                                        Donors can pledge per level a player earns during the fundraiser or a flat amount. RepQuest tracks pledges and notifies supporters.
                                        <strong> We do not process payments.</strong>
                                    </p>
                                    <p className="text-blue-200 text-sm mb-2">
                                        When your fundraiser ends, you'll receive a detailed report of all pledges via email and can export a spreadsheet to manage collections yourself.
                                    </p>
                                    <p className="text-green-300 text-sm font-semibold">
                                        💯 100% of funds go directly to your team—no percentage is taken by RepQuest!
                                    </p>                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Team Selection */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Select Team *</label>
                                <select
                                    value={form.owner_id}
                                    onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Choose a team...</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Fundraiser Title *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g., 2025 State Championship Fund"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Tell supporters why this fundraiser matters..."
                                    rows="4"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-300 text-sm mb-2">Start Date *</label>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm mb-2">End Date *</label>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Goal Amount */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Goal Amount (optional)</label>
                                <input
                                    type="number"
                                    value={form.goal_amount}
                                    onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
                                    placeholder="e.g., 1000"
                                    min="0"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Estimated Levels */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-300 text-sm mb-2 flex items-center">
                                        Estimated Min Levels
                                        <InfoTooltip text="The minimum number of levels (1000 pts each) you expect players to earn during this fundraiser. This helps supporters estimate their pledge amount." />
                                    </label>
                                    <input
                                        type="number"
                                        value={form.estimated_min_levels}
                                        onChange={(e) => setForm({ ...form, estimated_min_levels: e.target.value })}
                                        min="0"
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-300 text-sm mb-2 flex items-center">
                                        Estimated Max Levels
                                        <InfoTooltip text="The maximum number of levels you expect players to reach. Supporters can set a pledge cap based on this estimate to control their total contribution." />
                                    </label>
                                    <input
                                        type="number"
                                        value={form.estimated_max_levels}
                                        onChange={(e) => setForm({ ...form, estimated_max_levels: e.target.value })}
                                        min="0"
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Prize Tiers */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2 flex items-center gap-2">
                                    Supporter Rewards (optional)
                                    <InfoTooltip text="Offer optional thank you rewards to supporters based on their total pledge amount. For example: '$50 - Team Photo' or '$100 - Signed Jersey'. Donors will automatically see which rewards they qualify for based on their final total pledge. All rewards are fulfilled and managed by the coach, team parent, or designated fundraiser organizer. RepQuest tracks qualification only. Distribution and delivery are handled by the team." />
                                </label>
                                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="number"
                                            value={newPrizeTier.amount}
                                            onChange={(e) => setNewPrizeTier({ ...newPrizeTier, amount: e.target.value })}
                                            placeholder="Amount ($)"
                                            min="0"
                                            className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={newPrizeTier.description}
                                            onChange={(e) => setNewPrizeTier({ ...newPrizeTier, description: e.target.value })}
                                            placeholder="Reward description"
                                            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={addPrizeTier}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {form.prize_tiers.length > 0 && (
                                        <div className="space-y-2">
                                            {form.prize_tiers.map((tier, index) => (
                                                <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-2">
                                                    <span className="text-white text-sm">
                                                        ${tier.amount} - {tier.description}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePrizeTier(index)}
                                                        className="text-red-400 hover:text-red-300 text-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                                >
                                    Create Fundraiser
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Fundraisers List */}
                {fundraisers.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">💰</div>
                        <p className="text-gray-400 text-lg">No fundraisers yet. Create your first one above!</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {fundraisers.map(fundraiser => (
                            <div key={fundraiser.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-xl font-bold text-white">{fundraiser.title}</h3>
                                            {getStatusBadge(fundraiser)}
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            {new Date(fundraiser.start_date + 'T12:00:00').toLocaleDateString()} - {new Date(fundraiser.end_date + 'T12:00:00').toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {fundraiser.description && (
                                    <p className="text-gray-300 mb-4">{fundraiser.description}</p>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">Total Pledges</div>
                                        <div className="text-white text-2xl font-bold">
                                            {fundraiser.fundraiser_pledges?.length || 0}
                                        </div>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">Potential Raised</div>
                                        <div className="text-green-400 text-2xl font-bold">
                                            ${calculateTotalRaised(fundraiser).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-3">
                                        <div className="text-gray-400 text-xs mb-1">Levels Earned</div>
                                        <div className="text-blue-400 text-2xl font-bold">
                                            {fundraiser.fundraiser_progress?.reduce((sum, p) => sum + (p.fundraiser_levels_earned || 0), 0) || 0}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyFundraiserLink(fundraiser.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                                    >
                                        📋 Copy Link
                                    </button>
                                    <button
                                        onClick={() => openQRModal(fundraiser)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                                    >
                                        📱 QR Code
                                    </button>
                                    <button
                                        onClick={() => router.push(`/fundraiser/${fundraiser.id}`)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm"
                                    >
                                        View Dashboard
                                    </button>
                                </div>
                            </div>
                        ))}
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