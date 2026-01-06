// pages/measurements.js - Personal Performance Measurements Dashboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Measurements({ user, userProfile }) {
    const router = useRouter();
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || userProfile?.role !== 'player') {
            router.push('/drills');
            return;
        }
        fetchDashboard();
    }, [user, userProfile]);

    const fetchDashboard = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/measurements/dashboard', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setMetrics(result.metrics);
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatValue = (value, unit) => {
        if (!value && value !== 0) return '--';

        // Format based on unit type
        if (unit === 'minutes') {
            const mins = Math.floor(value);
            const secs = Math.round((value - mins) * 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        return `${value} ${unit}`;
    };

    const formatChange = (change, higherIsBetter) => {
        if (!change || change === 0) return null;

        const isPositive = change > 0;
        const isImprovement = higherIsBetter ? isPositive : !isPositive;

        return {
            value: Math.abs(change).toFixed(1),
            color: isImprovement ? 'text-green-400' : 'text-red-400',
            arrow: isPositive ? '↑' : '↓'
        };
    };

    const formatDate = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">📊 My Measurements</h1>
                    <p className="text-gray-400">Track your personal performance over time</p>
                </div>

                {/* Add Measurement Button */}
                <button
                    onClick={() => router.push('/measurements/add')}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-lg font-semibold text-lg mb-6 transition"
                >
                    + Log New Measurement
                </button>

                {/* Metrics Grid */}
                {metrics.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            No measurements yet
                        </h3>
                        <p className="text-gray-400 mb-6">
                            Start tracking your performance by logging your first measurement
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metrics.map(metric => {
                            const changeInfo = formatChange(metric.change, metric.higher_is_better);
                            const isBest = metric.latest && metric.best &&
                                metric.latest.value === metric.best.value;

                            return (
                                <button
                                    key={metric.id}
                                    onClick={() => router.push(`/measurements/history/${metric.id}`)}
                                    className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700 hover:border-blue-500 transition text-left"
                                >
                                    {/* Category Badge */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">{metric.category.icon}</span>
                                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                                            {metric.category.name}
                                        </span>
                                    </div>

                                    {/* Metric Name */}
                                    <h3 className="text-xl font-bold text-white mb-4">
                                        {metric.name}
                                    </h3>

                                    {/* Latest Value */}
                                    <div className="mb-3">
                                        {metric.latest ? (
                                            <>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-3xl font-bold text-white">
                                                        {formatValue(metric.latest.value, metric.unit)}
                                                    </span>
                                                    {isBest && (
                                                        <span className="text-yellow-400 text-sm font-semibold">
                                                            🏆 PR
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {formatDate(metric.latest.logged_at)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-gray-500 text-lg">
                                                No data yet
                                            </div>
                                        )}
                                    </div>

                                    {/* Change from Previous */}
                                    {changeInfo && (
                                        <div className={`text-sm font-semibold ${changeInfo.color}`}>
                                            {changeInfo.arrow} {changeInfo.value} {metric.unit} from last
                                        </div>
                                    )}

                                    {/* Best Ever (if not current) */}
                                    {metric.best && !isBest && (
                                        <div className="mt-2 pt-2 border-t border-gray-700">
                                            <div className="text-xs text-gray-400">
                                                Best: {formatValue(metric.best.value, metric.unit)}
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Info Footer */}
                <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-sm text-blue-200">
                    <p className="font-semibold mb-2">📝 About Measurements</p>
                    <p className="text-blue-300">
                        Your measurements are private and help you track your personal progress over time.
                        Log regularly to see how you improve!
                    </p>
                </div>
            </div>
        </div>
    );
}