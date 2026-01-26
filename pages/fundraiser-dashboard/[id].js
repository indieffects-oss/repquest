// pages/fundraiser-dashboard/[id].js
// Coach-only detailed dashboard for managing a specific fundraiser
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function FundraiserDashboard({ user, userProfile }) {
    const router = useRouter();
    const { id } = router.query;

    const [fundraiser, setFundraiser] = useState(null);
    const [progress, setProgress] = useState([]);
    const [pledges, setPledges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingEmails, setSendingEmails] = useState(false);

    useEffect(() => {
        if (!user || !userProfile) return;

        if (userProfile.role !== 'coach' && userProfile.role !== 'player') {
            router.push('/drills');
            return;
        }

        if (!id) return;
        fetchDashboard();
    }, [id, user, userProfile]);

    const fetchDashboard = async () => {
        try {
            // Fetch fundraiser
            const { data: fundraiserData, error: fundraiserError } = await supabase
                .from('fundraisers')
                .select(`
          *,
          team:teams!team_id (name, logo_url)
        `)
                .eq('id', id)
                .single();

            if (fundraiserError) throw fundraiserError;

            // Verify user owns this fundraiser
            const isOwner = fundraiserData.created_by === user.id ||
                (fundraiserData.fundraiser_type === 'player' && fundraiserData.owner_id === user.id);

            if (!isOwner) {
                alert('You do not have access to this fundraiser');
                router.push('/drills');
                return;
            }

            setFundraiser(fundraiserData);

            // Fetch progress
            const { data: progressData, error: progressError } = await supabase
                .from('fundraiser_progress')
                .select(`
          *,
          user:users!user_id (display_name, email, profile_picture_url)
        `)
                .eq('fundraiser_id', id)
                .order('fundraiser_levels_earned', { ascending: false });

            if (progressError) throw progressError;
            setProgress(progressData || []);

            // Fetch pledges
            const { data: pledgesData, error: pledgesError } = await supabase
                .from('fundraiser_pledges')
                .select('*')
                .eq('fundraiser_id', id)
                .order('created_at', { ascending: false });

            if (pledgesError) throw pledgesError;
            setPledges(pledgesData || []);

        } catch (err) {
            console.error('Error fetching dashboard:', err);
            alert('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const calculatePledgeTotal = (pledge, levelsEarned) => {
        if (pledge.pledge_type === 'flat') {
            return parseFloat(pledge.flat_amount) || 0;
        } else {
            const uncapped = levelsEarned * (parseFloat(pledge.amount_per_level) || 0);
            return Math.min(uncapped, parseFloat(pledge.max_amount) || 0);
        }
    };

    const calculateTotals = () => {
        const totalLevels = progress.reduce((sum, p) => sum + (p.fundraiser_levels_earned || 0), 0);
        const totalRaised = pledges.reduce((sum, pledge) => {
            return sum + calculatePledgeTotal(pledge, totalLevels);
        }, 0);

        return { totalLevels, totalRaised };
    };

    const sendFinalEmails = async () => {
        if (!confirm('Send final fundraiser completion emails to all donors?')) return;

        setSendingEmails(true);

        try {
            const totals = calculateTotals();
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/fundraisers/send-notification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundraiser_id: id,
                    notification_type: 'fundraiser_ended',
                    data: {
                        levels_earned: totals.totalLevels,
                        final_amount: totals.totalRaised
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send emails');
            }

            alert(`✅ Sent completion emails to ${pledges.length} donor(s)!`);
        } catch (err) {
            console.error('Error sending emails:', err);
            alert('Failed to send emails: ' + err.message);
        } finally {
            setSendingEmails(false);
        }
    };

    const exportReport = () => {
        const totals = calculateTotals();

        let csv = 'Fundraiser Report\n';
        csv += `"${fundraiser.title}"\n`;
        csv += `${new Date(fundraiser.start_date).toLocaleDateString()} - ${new Date(fundraiser.end_date).toLocaleDateString()}\n\n`;

        csv += 'Summary\n';
        csv += `Total Levels Earned,${totals.totalLevels}\n`;
        csv += `Total Pledges,${pledges.length}\n`;
        csv += `Total Amount,${totals.totalRaised.toFixed(2)}\n\n`;

        csv += 'Player Progress\n';
        csv += 'Name,Email,Starting Level,Current Level,Levels Earned\n';
        progress.forEach(p => {
            csv += `"${p.user?.display_name || 'Unknown'}","${p.user?.email || ''}",${p.starting_level},${p.current_level},${p.fundraiser_levels_earned}\n`;
        });

        csv += '\nPledges\n';
        csv += 'Donor Name,Email,Type,Amount Per Level,Max Amount,Flat Amount,Final Amount,Paid\n';
        pledges.forEach(pledge => {
            const final = calculatePledgeTotal(pledge, totals.totalLevels);
            csv += `"${pledge.donor_name}","${pledge.donor_email}",${pledge.pledge_type},${pledge.amount_per_level || ''},${pledge.max_amount || ''},${pledge.flat_amount || ''},${final.toFixed(2)},\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fundraiser-report-${fundraiser.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-white text-xl">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    if (!fundraiser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-white text-xl">Fundraiser not found</div>
                </div>
            </div>
        );
    }

    const totals = calculateTotals();
    const isEnded = new Date().toISOString().split('T')[0] > fundraiser.end_date;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push(fundraiser.fundraiser_type === 'player' ? '/my-fundraisers' : '/fundraisers')}
                        className="text-blue-400 hover:text-blue-300 mb-4"
                    >
                        ← Back to Fundraisers
                    </button>

                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                                {fundraiser.title}
                            </h1>
                            <p className="text-gray-400 text-sm">
                                {fundraiser.team?.name} • {new Date(fundraiser.start_date).toLocaleDateString()} - {new Date(fundraiser.end_date).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={exportReport}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition text-sm whitespace-nowrap"
                            >
                                📊 Download CSV
                            </button>
                            {isEnded && (
                                <button
                                    onClick={sendFinalEmails}
                                    disabled={sendingEmails}
                                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition text-sm whitespace-nowrap"
                                >
                                    {sendingEmails ? 'Sending...' : '📧 Email Donors'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                        <span className="text-2xl">💡</span>
                        <div className="flex-1">
                            <h3 className="text-blue-300 font-semibold mb-2">Collection Guide</h3>
                            <p className="text-blue-200 text-sm mb-2">
                                Download the CSV above to get a spreadsheet with all pledge details. You can:
                            </p>
                            <ul className="text-blue-200 text-sm space-y-1 list-disc list-inside">
                                <li>Open it in Excel or Google Sheets</li>
                                <li>Add a "Paid" column to track who's paid</li>
                                <li>Contact donors with final amounts</li>
                                <li>Suggest payment methods (check, cash, Venmo, etc.)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">Total Levels</div>
                        <div className="text-blue-400 text-3xl font-bold">{totals.totalLevels}</div>
                        <div className="text-gray-500 text-xs mt-1">
                            Est: {fundraiser.estimated_min_levels}-{fundraiser.estimated_max_levels}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">Total Pledges</div>
                        <div className="text-purple-400 text-3xl font-bold">{pledges.length}</div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">Total Raised</div>
                        <div className="text-green-400 text-3xl font-bold">
                            ${totals.totalRaised.toFixed(2)}
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="text-gray-400 text-xs mb-1">Status</div>
                        <div className="text-2xl font-bold">
                            {isEnded ? (
                                <span className="text-gray-400">🏁 Ended</span>
                            ) : (
                                <span className="text-green-400">✅ Active</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Player Progress */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Player Progress ({progress.length} {progress.length === 1 ? 'player' : 'players'})
                    </h2>

                    {progress.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No players participating yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="text-left text-gray-400 text-sm font-semibold py-2">Player</th>
                                        <th className="text-right text-gray-400 text-sm font-semibold py-2">Starting</th>
                                        <th className="text-right text-gray-400 text-sm font-semibold py-2">Current</th>
                                        <th className="text-right text-gray-400 text-sm font-semibold py-2">Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {progress.map(p => (
                                        <tr key={p.user_id} className="border-b border-gray-700/50">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    {p.user?.profile_picture_url ? (
                                                        <img
                                                            src={p.user.profile_picture_url}
                                                            alt={p.user.display_name}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                                            {p.user?.display_name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <span className="text-white">{p.user?.display_name || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="text-right text-gray-400">Level {p.starting_level}</td>
                                            <td className="text-right text-white font-semibold">Level {p.current_level}</td>
                                            <td className="text-right text-green-400 font-bold">+{p.fundraiser_levels_earned}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pledges */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Pledges ({pledges.length})
                    </h2>

                    {pledges.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No pledges yet</p>
                    ) : (
                        <div className="space-y-3">
                            {pledges.map(pledge => {
                                const finalAmount = calculatePledgeTotal(pledge, totals.totalLevels);

                                return (
                                    <div key={pledge.id} className="bg-gray-700/50 rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="text-white font-semibold mb-1">
                                                    {pledge.donor_name}
                                                </div>
                                                <div className="text-gray-400 text-sm mb-2">
                                                    {pledge.donor_email}
                                                </div>
                                                <div className="text-sm">
                                                    {pledge.pledge_type === 'flat' ? (
                                                        <span className="text-green-400">
                                                            Flat: ${parseFloat(pledge.flat_amount).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-blue-400">
                                                            ${parseFloat(pledge.amount_per_level).toFixed(2)}/level (max ${parseFloat(pledge.max_amount).toFixed(2)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-gray-400 text-xs mb-1">Final Amount</div>
                                                <div className="text-green-400 text-2xl font-bold">
                                                    ${finalAmount.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Public Link */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mt-6">
                    <h3 className="text-white font-semibold mb-3">Share Fundraiser</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={`${window.location.origin}/fundraiser/${fundraiser.id}`}
                            readOnly
                            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/fundraiser/${fundraiser.id}`);
                                alert('Link copied!');
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