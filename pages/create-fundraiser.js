// pages/create-fundraiser.js
// Player interface for creating their own personal fundraiser
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function CreateFundraiser({ user, userProfile }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [hasActiveFundraiser, setHasActiveFundraiser] = useState(false);

    const [form, setForm] = useState({
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

        if (userProfile.role !== 'player') {
            router.push(userProfile.role === 'coach' ? '/fundraisers' : '/drills');
            return;
        }

        if (!userProfile.active_team_id) {
            alert('You need to be on a team to create a fundraiser');
            router.push('/profile');
            return;
        }

        checkExistingFundraiser();
    }, [user, userProfile]);

    const checkExistingFundraiser = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Check if player has any active fundraisers FOR THIS TEAM
            const { data, error } = await supabase
                .from('fundraisers')
                .select('id, team_id')
                .eq('fundraiser_type', 'player')
                .eq('owner_id', user.id)
                .eq('team_id', userProfile.active_team_id)
                .gte('end_date', today);

            if (error) throw error;

            if (data && data.length > 0) {
                setHasActiveFundraiser(true);
            }
        } catch (err) {
            console.error('Error checking fundraiser:', err);
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

        if (!form.title || !form.start_date || !form.end_date) {
            alert('Please fill in all required fields');
            return;
        }

        const startDate = new Date(form.start_date);
        const endDate = new Date(form.end_date);

        if (endDate <= startDate) {
            alert('End date must be after start date');
            return;
        }

        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/fundraisers/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundraiser_type: 'player',
                    owner_id: user.id,
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

            alert('✅ Fundraiser created successfully! Share the link with family and friends.');
            router.push('/my-fundraisers');
        } catch (err) {
            console.error('Error creating fundraiser:', err);
            alert('Failed to create fundraiser: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (hasActiveFundraiser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">💰</div>
                        <h2 className="text-2xl font-bold text-white mb-4">
                            You Already Have an Active Fundraiser for This Team
                        </h2>
                        <p className="text-gray-400 mb-6">
                            You can only have one active fundraiser per team at a time. Wait for your current fundraiser to end before creating a new one for this team, or switch to a different team to create another fundraiser.
                        </p>
                        <button
                            onClick={() => router.push('/my-fundraisers')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                        >
                            View My Fundraisers
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/my-fundraisers')}
                        className="text-blue-400 hover:text-blue-300 mb-4"
                    >
                        ← Back to My Fundraisers
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Create Your Personal Fundraiser
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">
                        Raise money for your team fees by connecting your training progress with donor support
                    </p>
                </div>

                {/* Important Notice */}
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                        <span className="text-2xl">ℹ️</span>
                        <div className="flex-1">
                            <h3 className="text-blue-300 font-semibold mb-2">How RepQuest Fundraising Works</h3>
                            <p className="text-blue-200 text-sm mb-2">
                                RepQuest handles pledge tracking and notifications throughout your fundraiser.
                                <strong> We do not process payments.</strong>
                            </p>
                            <p className="text-blue-200 text-sm mb-2">
                                When your fundraiser ends, you'll receive a detailed report of all pledges via email and can export a spreadsheet to manage collections yourself.
                            </p>
                            <p className="text-green-300 text-sm font-semibold">
                                💯 100% of funds go directly to you—no percentage taken by RepQuest!
                            </p>
                            <p className="text-blue-200 text-xs mt-2 italic">
                                (If successful, we may add payment processing in the future with a small convenience fee)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Fundraiser Title *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="e.g., Help Me Reach State Championships"
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-gray-300 text-sm mb-2">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Tell supporters why this fundraiser matters to you..."
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
                                placeholder="e.g., 500"
                                min="0"
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Estimated Levels */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Estimated Min Levels</label>
                                <input
                                    type="number"
                                    value={form.estimated_min_levels}
                                    onChange={(e) => setForm({ ...form, estimated_min_levels: e.target.value })}
                                    min="0"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Estimated Max Levels</label>
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
                            <label className="block text-gray-300 text-sm mb-2">Supporter Rewards (optional)</label>
                            <p className="text-gray-400 text-xs mb-2">
                                Offer rewards to encourage larger pledges (e.g., thank you card, team photo, etc.)
                            </p>
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
                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                            >
                                {loading ? 'Creating...' : 'Create My Fundraiser'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/my-fundraisers')}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}