// pages/measurements/history/[id].js - View measurement history (FIXED quick log)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';

export default function MeasurementHistory({ user, userProfile }) {
    const router = useRouter();
    const { id } = router.query;
    const [metric, setMetric] = useState(null);
    const [measurements, setMeasurements] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQuickLog, setShowQuickLog] = useState(false);
    const [quickValue, setQuickValue] = useState('');
    const [quickDistance, setQuickDistance] = useState('');
    const [quickDistanceUnit, setQuickDistanceUnit] = useState('yards');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || userProfile?.role !== 'player') {
            router.push('/drills');
            return;
        }
        if (id) {
            fetchHistory();
        }
    }, [user, userProfile, id]);

    useEffect(() => {
        // Pre-fill distance for sprint metrics
        if (metric && metric.name) {
            const match = metric.name.match(/^(\d+\.?\d*)\s+(yards|meters|feet|miles|km)/i);
            if (match) {
                setQuickDistance(match[1]);
                setQuickDistanceUnit(match[2].toLowerCase());
            }
        }
    }, [metric]);

    const fetchHistory = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch(`/api/measurements/history/${id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setMetric(result.metric);
                setMeasurements(result.measurements);
                setStats(result.stats);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatValue = (value, unit) => {
        if (!value && value !== 0) return '--';

        if (unit === 'minutes') {
            const mins = Math.floor(value);
            const secs = Math.round((value - mins) * 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        return `${value} ${unit}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleQuickLog = async (e) => {
        e.preventDefault();

        if (!quickValue) {
            alert('Please enter a value');
            return;
        }

        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/api/measurements/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    metric_id: id, // Use metric_id instead of all fields
                    value: parseFloat(quickValue)
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('✅ Measurement logged!');
                setQuickValue('');
                setShowQuickLog(false);
                fetchHistory(); // Refresh the list
            } else {
                alert('Failed to log: ' + result.error);
            }
        } catch (err) {
            console.error('Error:', err);
            alert('Failed to log measurement');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!metric) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-2xl font-bold text-white mb-4">Metric Not Found</h2>
                        <button
                            onClick={() => router.push('/measurements')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            Back to Measurements
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/measurements')}
                        className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
                    >
                        ← Back to Measurements
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{metric.category.icon}</span>
                        <h1 className="text-3xl font-bold text-white">{metric.name}</h1>
                    </div>
                    <p className="text-gray-400">{metric.description}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {/* Latest */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Latest</div>
                        {stats.latest ? (
                            <>
                                <div className="text-3xl font-bold text-white mb-1">
                                    {formatValue(stats.latest.value, metric.unit)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {formatDate(stats.latest.logged_at)}
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500">No data</div>
                        )}
                    </div>

                    {/* Best */}
                    <div className="bg-gray-800 rounded-xl p-6 border-2 border-yellow-700">
                        <div className="text-xs text-yellow-400 uppercase tracking-wide mb-2 font-semibold">
                            🏆 Personal Best
                        </div>
                        {stats.best ? (
                            <>
                                <div className="text-3xl font-bold text-yellow-400 mb-1">
                                    {formatValue(stats.best.value, metric.unit)}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {formatDate(stats.best.logged_at)}
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500">No data</div>
                        )}
                    </div>

                    {/* Improvement */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                            Total Change
                        </div>
                        {stats.improvement !== null ? (
                            <>
                                <div className={`text-3xl font-bold mb-1 ${(metric.higher_is_better && stats.improvement > 0) ||
                                    (!metric.higher_is_better && stats.improvement < 0)
                                    ? 'text-green-400'
                                    : stats.improvement === 0
                                        ? 'text-gray-400'
                                        : 'text-red-400'
                                    }`}>
                                    {stats.improvement > 0 ? '+' : ''}{stats.improvement.toFixed(1)} {metric.unit}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Since first entry
                                </div>
                            </>
                        ) : (
                            <div className="text-gray-500">Need 2+ entries</div>
                        )}
                    </div>
                </div>

                {/* History List */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">
                        History ({stats.count} {stats.count === 1 ? 'entry' : 'entries'})
                    </h2>

                    {measurements.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">
                            No measurements logged yet
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {measurements.map((measurement, index) => {
                                const isBest = stats.best &&
                                    measurement.value === stats.best.value &&
                                    measurement.logged_at === stats.best.logged_at;

                                const prevMeasurement = measurements[index + 1];
                                let change = null;
                                if (prevMeasurement) {
                                    change = measurement.value - prevMeasurement.value;
                                }

                                return (
                                    <div
                                        key={measurement.id}
                                        className={`p-4 rounded-lg border-2 ${isBest
                                            ? 'bg-yellow-900/20 border-yellow-700'
                                            : 'bg-gray-700/50 border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-bold text-white">
                                                        {formatValue(measurement.value, metric.unit)}
                                                    </span>
                                                    {isBest && (
                                                        <span className="text-yellow-400 text-sm font-semibold">
                                                            🏆 PR
                                                        </span>
                                                    )}
                                                    {change !== null && change !== 0 && (
                                                        <span className={`text-sm font-semibold ${(metric.higher_is_better && change > 0) ||
                                                            (!metric.higher_is_better && change < 0)
                                                            ? 'text-green-400'
                                                            : 'text-red-400'
                                                            }`}>
                                                            {change > 0 ? '+' : ''}{change.toFixed(1)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-400 mt-1">
                                                    {formatDate(measurement.logged_at)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Quick Log Form or Button */}
                {showQuickLog ? (
                    <form onSubmit={handleQuickLog} className="bg-gray-800 rounded-xl p-6 border-2 border-blue-500 mt-6">
                        <h3 className="text-lg font-bold text-white mb-4">Log Another {metric.name}</h3>

                        {quickDistance && (
                            <div className="bg-gray-700 rounded-lg p-3 mb-4">
                                <div className="text-sm text-gray-400">Distance</div>
                                <div className="text-white font-semibold">{quickDistance} {quickDistanceUnit}</div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                                Value ({metric.unit})
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={quickValue}
                                onChange={(e) => setQuickValue(e.target.value)}
                                placeholder={`Enter ${metric.unit}`}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl font-bold focus:outline-none focus:border-blue-500"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                            >
                                {saving ? 'Saving...' : '✅ Log It'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowQuickLog(false);
                                    setQuickValue('');
                                }}
                                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        onClick={() => setShowQuickLog(true)}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-semibold transition"
                    >
                        + Log Another {metric.name}
                    </button>
                )}
            </div>
        </div>
    );
}