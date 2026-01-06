// pages/measurements/add.js - Log a new measurement with custom entry support
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function AddMeasurement({ user, userProfile }) {
    const router = useRouter();
    const { metricId, categoryId } = router.query;
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState({});
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [useCustom, setUseCustom] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);

    // Form fields
    const [customName, setCustomName] = useState('');
    const [customDistance, setCustomDistance] = useState('');
    const [distanceUnit, setDistanceUnit] = useState('yards');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [higherIsBetter, setHigherIsBetter] = useState(true);
    const [value, setValue] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Check if this is a sprint-type metric
    const isSprintMetric = selectedSuggestion?.name?.toLowerCase().includes('sprint') ||
        selectedSuggestion?.name?.toLowerCase().includes('distance run');
    const isRunMetric = selectedSuggestion?.name?.toLowerCase().includes('run');

    useEffect(() => {
        if (!user || userProfile?.role !== 'player') {
            router.push('/drills');
            return;
        }
        fetchMetrics();
    }, [user, userProfile]);

    const fetchMetrics = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/measurements/metrics', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setCategories(result.categories);
                setUnits(result.units);

                // If metricId provided (from "Log Another" button), load that specific metric
                if (metricId) {
                    const { data: existingMetric } = await supabase
                        .from('user_metrics')
                        .select(`
                            *,
                            measurement_categories (
                                id,
                                name,
                                icon
                            )
                        `)
                        .eq('id', metricId)
                        .single();

                    if (existingMetric) {
                        // Pre-fill with existing metric details
                        setSelectedCategory(existingMetric.measurement_categories);

                        // Parse sprint/run metrics to pre-fill distance
                        const nameMatch = existingMetric.name.match(/^(\d+\.?\d*)\s+(yards|meters|feet|miles|km)\s+(Sprint|Distance Run)$/i);
                        if (nameMatch) {
                            setCustomDistance(nameMatch[1]);
                            setDistanceUnit(nameMatch[2].toLowerCase());
                            setSelectedSuggestion({
                                name: nameMatch[3],
                                unit: existingMetric.unit,
                                higher_is_better: existingMetric.higher_is_better,
                                description: `Continue tracking ${existingMetric.name}`
                            });
                            setSelectedUnit(existingMetric.unit);
                        } else {
                            // Regular metric (not sprint/run)
                            setSelectedSuggestion({
                                name: existingMetric.name,
                                unit: existingMetric.unit,
                                higher_is_better: existingMetric.higher_is_better,
                                description: `Continue tracking ${existingMetric.name}`
                            });
                        }
                    }
                }

                // If categoryId provided, auto-select
                if (categoryId && !metricId) {
                    const category = result.categories.find(c => c.id === categoryId);
                    if (category) {
                        setSelectedCategory(category);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching metrics:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let name, unit, better;

        if (useCustom) {
            name = customName;
            unit = selectedUnit;
            better = higherIsBetter;
        } else if (isSprintMetric || isRunMetric) {
            // For sprints/runs, create name with distance
            if (!customDistance || !value) {
                alert('Please enter both distance and time');
                return;
            }
            name = `${customDistance} ${distanceUnit} ${selectedSuggestion.name}`;
            unit = selectedUnit || 'seconds';
            better = false; // Lower time is better
        } else {
            name = selectedSuggestion?.name;
            unit = selectedSuggestion?.unit;
            better = selectedSuggestion?.higher_is_better;
        }

        if (!name || !unit || !value) {
            alert('Please fill in all fields');
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
                    category_id: selectedCategory.id,
                    name,
                    unit,
                    value: parseFloat(value),
                    higher_is_better: better
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('✅ Measurement logged!');
                // Go to the history page for this metric
                router.push(`/measurements/history/${result.metric_id}`);
            } else {
                alert('Failed to log measurement: ' + result.error);
            }
        } catch (err) {
            console.error('Error logging measurement:', err);
            alert('Failed to log measurement');
        } finally {
            setSaving(false);
        }
    };

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        setUseCustom(false);
        setSelectedSuggestion(null);
        setValue('');
    };

    const handleSuggestionSelect = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setUseCustom(false);
        setValue('');
    };

    const handleCustom = () => {
        setUseCustom(true);
        setSelectedSuggestion(null);
        setCustomName('');
        setSelectedUnit('');
        setValue('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    // If metricId provided but still loading the metric details, show loading
    if (metricId && !selectedSuggestion && !loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading metric...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => metricId ? router.push(`/measurements/history/${metricId}`) : router.push('/measurements')}
                        className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
                    >
                        ← {metricId ? 'Back to History' : 'Back to Measurements'}
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">Log Measurement</h1>
                    <p className="text-gray-400">Track your progress over time</p>
                </div>

                {/* Step 1: Select Category - Hide if metricId provided or category selected */}
                {!selectedCategory && !metricId && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">1. Choose Category</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategorySelect(category)}
                                    className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-center transition border-2 border-transparent hover:border-blue-500"
                                >
                                    <div className="text-3xl mb-2">{category.icon}</div>
                                    <div className="text-white font-semibold">{category.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Choose Suggestion or Custom - Hide if metricId provided */}
                {selectedCategory && !selectedSuggestion && !useCustom && !metricId && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">
                                2. Choose {selectedCategory.name} Type
                            </h2>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="text-gray-400 hover:text-white text-sm"
                            >
                                Change Category
                            </button>
                        </div>

                        {/* User's Existing Metrics */}
                        {selectedCategory.userMetrics && selectedCategory.userMetrics.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-2">Your Tracked Metrics</h3>
                                <div className="space-y-2">
                                    {selectedCategory.userMetrics.map(metric => (
                                        <button
                                            key={metric.id}
                                            onClick={() => router.push(`/measurements/add?metricId=${metric.id}`)}
                                            className="w-full bg-blue-700 hover:bg-blue-600 rounded-lg p-4 text-left transition border-2 border-transparent hover:border-blue-400"
                                        >
                                            <div className="font-semibold text-white">{metric.name}</div>
                                            <div className="text-xs text-blue-300 mt-1">Click to log another • Unit: {metric.unit}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="my-4 border-t border-gray-700"></div>
                            </div>
                        )}

                        {/* Suggestions */}
                        <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-2">New Metrics</h3>
                        <div className="space-y-2 mb-4">
                            {selectedCategory.suggestions.map(suggestion => (
                                <button
                                    key={suggestion.id}
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition border-2 border-transparent hover:border-blue-500"
                                >
                                    <div className="font-semibold text-white">{suggestion.name}</div>
                                    <div className="text-sm text-gray-400">{suggestion.description}</div>
                                    <div className="text-xs text-blue-400 mt-1">Unit: {suggestion.unit}</div>
                                </button>
                            ))}
                        </div>

                        {/* Custom Option */}
                        <button
                            onClick={handleCustom}
                            className="w-full bg-purple-700 hover:bg-purple-600 rounded-lg p-4 text-center transition border-2 border-transparent hover:border-purple-400"
                        >
                            <div className="font-semibold text-white">✨ Custom / Other</div>
                            <div className="text-sm text-purple-200">Enter your own measurement</div>
                        </button>
                    </div>
                )}

                {/* Step 3: Custom Entry Form */}
                {useCustom && (
                    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">3. Custom Measurement</h2>
                            <button
                                type="button"
                                onClick={() => setUseCustom(false)}
                                className="text-gray-400 hover:text-white text-sm"
                            >
                                Back to Suggestions
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Name</label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="e.g., Dumbbell Curl, 200m Sprint"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Unit</label>
                                <select
                                    value={selectedUnit}
                                    onChange={(e) => setSelectedUnit(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select unit...</option>
                                    <optgroup label="Time">
                                        {units.time?.map(u => <option key={u} value={u}>{u}</option>)}
                                    </optgroup>
                                    <optgroup label="Distance">
                                        {units.distance?.map(u => <option key={u} value={u}>{u}</option>)}
                                    </optgroup>
                                    <optgroup label="Weight">
                                        {units.weight?.map(u => <option key={u} value={u}>{u}</option>)}
                                    </optgroup>
                                    <optgroup label="Other">
                                        {units.reps?.map(u => <option key={u} value={u}>{u}</option>)}
                                        {units.percentage?.map(u => <option key={u} value={u}>{u}</option>)}
                                        {units.speed?.map(u => <option key={u} value={u}>{u}</option>)}
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">
                                    Higher is better?
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={higherIsBetter === true}
                                            onChange={() => setHigherIsBetter(true)}
                                            className="w-4 h-4"
                                        />
                                        <span>Yes (more is better)</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={higherIsBetter === false}
                                            onChange={() => setHigherIsBetter(false)}
                                            className="w-4 h-4"
                                        />
                                        <span>No (less is better)</span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    For time-based measurements, choose "No"
                                </p>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Value</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="Enter value"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl font-bold focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg transition"
                            >
                                {saving ? 'Saving...' : '✅ Log Measurement'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/measurements')}
                                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: Enter Value (for suggestions) */}
                {selectedSuggestion && (
                    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">3. Enter Details</h2>
                            <button
                                type="button"
                                onClick={() => setSelectedSuggestion(null)}
                                className="text-gray-400 hover:text-white text-sm"
                            >
                                Change Metric
                            </button>
                        </div>

                        <div className="bg-gray-700 rounded-lg p-4 mb-4">
                            <div className="text-sm text-gray-400 mb-1">Selected Metric</div>
                            <div className="text-white font-bold text-lg">{selectedSuggestion.name}</div>
                            <div className="text-xs text-gray-400 mt-1">{selectedSuggestion.description}</div>
                        </div>

                        {/* Sprint/Run Distance Input */}
                        {(isSprintMetric || isRunMetric) && (
                            <div className="mb-4">
                                <label className="block text-gray-300 text-sm mb-2">Distance</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={customDistance}
                                        onChange={(e) => setCustomDistance(e.target.value)}
                                        placeholder="Enter distance"
                                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                        required
                                    />
                                    <select
                                        value={distanceUnit}
                                        onChange={(e) => setDistanceUnit(e.target.value)}
                                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="yards">yards</option>
                                        <option value="meters">meters</option>
                                        <option value="feet">feet</option>
                                        <option value="miles">miles</option>
                                        <option value="km">km</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Value Input */}
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                                {(isSprintMetric || isRunMetric) ? 'Time' : `Value (${selectedSuggestion.unit})`}
                            </label>
                            {(isSprintMetric || isRunMetric) ? (
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        placeholder="Enter time"
                                        className="col-span-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl font-bold focus:outline-none focus:border-blue-500"
                                        autoFocus
                                        required
                                    />
                                    <select
                                        value={selectedUnit || 'seconds'}
                                        onChange={(e) => setSelectedUnit(e.target.value)}
                                        className="px-2 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                                    >
                                        <option value="seconds">sec</option>
                                        <option value="minutes">min</option>
                                    </select>
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    step="0.01"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={`Enter value`}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl font-bold focus:outline-none focus:border-blue-500"
                                    autoFocus
                                    required
                                />
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={saving || !value || ((isSprintMetric || isRunMetric) && !customDistance)}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg transition"
                            >
                                {saving ? 'Saving...' : '✅ Log Measurement'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/measurements')}
                                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}