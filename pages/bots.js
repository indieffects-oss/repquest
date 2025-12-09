// pages/bots.js - v0.2 with Edit and Result Generation
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Bots({ user, userProfile }) {
    const router = useRouter();
    const [bots, setBots] = useState([]);
    const [teamPlayers, setTeamPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingBot, setEditingBot] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [newBot, setNewBot] = useState({
        name: '',
        avatar_emoji: '🤖',
        difficulty_mode: 'dynamic',
        target_user_id: null,
        performance_multiplier: 1.0
    });

    const avatarOptions = ['🤖', '🦾', '⚡', '🎯', '🔥', '⭐', '👾', '🎮'];

    const difficultyModes = [
        { value: 'easy', label: 'Easy', description: '70% of target player', multiplier: 0.7 },
        { value: 'medium', label: 'Medium', description: '90% of target player', multiplier: 0.9 },
        { value: 'hard', label: 'Hard', description: '110% of target player', multiplier: 1.1 },
        { value: 'dynamic', label: 'Dynamic', description: 'Stays competitive', multiplier: 1.0 }
    ];

    useEffect(() => {
        if (userProfile?.role !== 'coach') {
            router.push('/drills');
            return;
        }
        fetchBots();
        fetchTeamPlayers();
    }, [userProfile]);

    const fetchBots = async () => {
        try {
            const teamId = userProfile?.active_team_id;
            if (!teamId) return;

            const { data, error } = await supabase
                .from('bot_players')
                .select(`
          *,
          target_user:target_user_id (
            id,
            display_name,
            jersey_number
          ),
          bot_stats (
            total_points,
            total_reps,
            sessions_completed
          )
        `)
                .eq('team_id', teamId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBots(data || []);
        } catch (err) {
            console.error('Error fetching bots:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamPlayers = async () => {
        try {
            const teamId = userProfile?.active_team_id;
            if (!teamId) return;

            const { data, error } = await supabase
                .from('team_members')
                .select(`
          user_id,
          users (
            id,
            display_name,
            jersey_number,
            total_points
          )
        `)
                .eq('team_id', teamId);

            if (error) throw error;
            setTeamPlayers(data?.map(m => m.users) || []);
        } catch (err) {
            console.error('Error fetching team players:', err);
        }
    };

    const createBot = async () => {
        if (!newBot.name.trim()) {
            alert('Bot name is required');
            return;
        }

        try {
            const teamId = userProfile?.active_team_id;
            if (!teamId) throw new Error('No active team');

            const { error } = await supabase
                .from('bot_players')
                .insert({
                    team_id: teamId,
                    name: newBot.name.trim(),
                    avatar_emoji: newBot.avatar_emoji,
                    difficulty_mode: newBot.difficulty_mode,
                    target_user_id: newBot.target_user_id || null,
                    performance_multiplier: parseFloat(newBot.performance_multiplier),
                    created_by: user.id
                });

            if (error) throw error;

            setNewBot({
                name: '',
                avatar_emoji: '🤖',
                difficulty_mode: 'dynamic',
                target_user_id: null,
                performance_multiplier: 1.0
            });
            setShowCreateForm(false);
            fetchBots();
            alert('Bot created successfully!');
        } catch (err) {
            console.error('Error creating bot:', err);
            alert('Failed to create bot');
        }
    };

    const updateBot = async (botId, updates) => {
        try {
            const { error } = await supabase
                .from('bot_players')
                .update(updates)
                .eq('id', botId);

            if (error) throw error;
            fetchBots();
            setEditingBot(null);
        } catch (err) {
            console.error('Error updating bot:', err);
            alert('Failed to update bot');
        }
    };

    const deleteBot = async (botId, botName) => {
        if (!confirm(`Delete bot "${botName}"? This will also delete all its results.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('bot_players')
                .delete()
                .eq('id', botId);

            if (error) throw error;
            fetchBots();
            alert('Bot deleted successfully');
        } catch (err) {
            console.error('Error deleting bot:', err);
            alert('Failed to delete bot');
        }
    };

    const generateBotResults = async (botId) => {
        try {
            setGenerating(true);

            // Call the SQL function to generate results for this bot
            const { data, error } = await supabase.rpc('generate_bot_result', {
                p_bot_id: botId,
                p_drill_id: null // Will pick random drill
            });

            if (error) throw error;

            alert('Bot results generated! Check the leaderboard.');
            fetchBots();
        } catch (err) {
            console.error('Error generating bot results:', err);
            alert('Failed to generate results. Make sure the bot has a target player with drill history.');
        } finally {
            setGenerating(false);
        }
    };

    const generateAllBotResults = async () => {
        try {
            setGenerating(true);

            const { data, error } = await supabase.rpc('generate_all_bot_results');

            if (error) throw error;

            const count = data?.generated_count || 0;
            alert(`Generated results for ${count} bot(s)! Check the leaderboard.`);
            fetchBots();
        } catch (err) {
            console.error('Error generating all bot results:', err);
            alert('Failed to generate results');
        } finally {
            setGenerating(false);
        }
    };

    const openEditModal = (bot) => {
        setEditingBot({
            id: bot.id,
            name: bot.name,
            avatar_emoji: bot.avatar_emoji,
            difficulty_mode: bot.difficulty_mode,
            target_user_id: bot.target_user_id,
            performance_multiplier: bot.performance_multiplier
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
                    >
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-white mb-2">🤖 Bot Players</h1>
                    <p className="text-gray-400">
                        Create AI competitors to challenge your team and keep them motivated
                    </p>
                </div>

                {/* Info Card */}
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-6">
                    <h3 className="text-blue-300 font-semibold mb-2">ℹ️ How Bots Work</h3>
                    <ul className="text-sm text-blue-200 space-y-1">
                        <li>• Bots are AI players that compete alongside your team</li>
                        <li>• They're marked with 🤖 on leaderboards (players know they're bots)</li>
                        <li>• Choose difficulty or let the bot dynamically adjust to stay competitive</li>
                        <li>• Click "Generate Results" to have bots complete drills</li>
                        <li>• Perfect for teams with a dominant player who needs more challenge</li>
                    </ul>
                </div>

                {/* Generate All Results Button */}
                {bots.length > 0 && (
                    <button
                        onClick={generateAllBotResults}
                        disabled={generating}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg mb-6 transition"
                    >
                        {generating ? '⏳ Generating...' : '🎲 Generate Results for All Bots'}
                    </button>
                )}

                {/* Create Bot Button */}
                {!showCreateForm && !editingBot && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-lg font-semibold text-lg mb-6 transition"
                    >
                        + Create New Bot
                    </button>
                )}

                {/* Create/Edit Bot Form */}
                {(showCreateForm || editingBot) && (
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingBot ? 'Edit Bot Player' : 'Create Bot Player'}
                        </h2>

                        <div className="space-y-4">
                            {/* Bot Name */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Bot Name *</label>
                                <input
                                    type="text"
                                    value={editingBot ? editingBot.name : newBot.name}
                                    onChange={(e) => editingBot
                                        ? setEditingBot({ ...editingBot, name: e.target.value })
                                        : setNewBot({ ...newBot, name: e.target.value })
                                    }
                                    placeholder="Training Bot, Challenge Bot, etc."
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Avatar Selection */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Avatar</label>
                                <div className="flex gap-2 flex-wrap">
                                    {avatarOptions.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => editingBot
                                                ? setEditingBot({ ...editingBot, avatar_emoji: emoji })
                                                : setNewBot({ ...newBot, avatar_emoji: emoji })
                                            }
                                            className={`text-3xl p-2 rounded-lg transition ${(editingBot ? editingBot.avatar_emoji : newBot.avatar_emoji) === emoji
                                                    ? 'bg-blue-600'
                                                    : 'bg-gray-700 hover:bg-gray-600'
                                                }`}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Target Player */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">
                                    Competing Against (Optional)
                                </label>
                                <select
                                    value={(editingBot ? editingBot.target_user_id : newBot.target_user_id) || ''}
                                    onChange={(e) => editingBot
                                        ? setEditingBot({ ...editingBot, target_user_id: e.target.value || null })
                                        : setNewBot({ ...newBot, target_user_id: e.target.value || null })
                                    }
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Any player (team average)</option>
                                    {teamPlayers.map(player => (
                                        <option key={player.id} value={player.id}>
                                            #{player.jersey_number || '?'} {player.display_name} ({player.total_points} pts)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Difficulty Mode */}
                            <div>
                                <label className="block text-gray-300 text-sm mb-2">Difficulty Mode</label>
                                <div className="space-y-2">
                                    {difficultyModes.map(mode => (
                                        <label
                                            key={mode.value}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${(editingBot ? editingBot.difficulty_mode : newBot.difficulty_mode) === mode.value
                                                    ? 'bg-blue-900/30 border-blue-500'
                                                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="difficulty"
                                                value={mode.value}
                                                checked={(editingBot ? editingBot.difficulty_mode : newBot.difficulty_mode) === mode.value}
                                                onChange={(e) => editingBot
                                                    ? setEditingBot({ ...editingBot, difficulty_mode: e.target.value })
                                                    : setNewBot({ ...newBot, difficulty_mode: e.target.value })
                                                }
                                                className="text-blue-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-white font-medium">{mode.label}</div>
                                                <div className="text-gray-400 text-sm">{mode.description}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced: Performance Multiplier */}
                            <details className="bg-gray-700/50 rounded-lg p-3">
                                <summary className="text-gray-300 cursor-pointer">Advanced Settings</summary>
                                <div className="mt-3">
                                    <label className="block text-gray-300 text-sm mb-2">
                                        Performance Multiplier (0.5 - 2.0)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.5"
                                        max="2.0"
                                        value={editingBot ? editingBot.performance_multiplier : newBot.performance_multiplier}
                                        onChange={(e) => editingBot
                                            ? setEditingBot({ ...editingBot, performance_multiplier: e.target.value })
                                            : setNewBot({ ...newBot, performance_multiplier: e.target.value })
                                        }
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Fine-tune bot performance. 1.0 = normal, 0.5 = 50% weaker, 2.0 = 2x stronger
                                    </p>
                                </div>
                            </details>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => editingBot
                                        ? updateBot(editingBot.id, {
                                            name: editingBot.name,
                                            avatar_emoji: editingBot.avatar_emoji,
                                            difficulty_mode: editingBot.difficulty_mode,
                                            target_user_id: editingBot.target_user_id || null,
                                            performance_multiplier: parseFloat(editingBot.performance_multiplier)
                                        })
                                        : createBot()
                                    }
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                                >
                                    {editingBot ? 'Save Changes' : 'Create Bot'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setEditingBot(null);
                                        setNewBot({
                                            name: '',
                                            avatar_emoji: '🤖',
                                            difficulty_mode: 'dynamic',
                                            target_user_id: null,
                                            performance_multiplier: 1.0
                                        });
                                    }}
                                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bot List */}
                {bots.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                        <div className="text-6xl mb-4">🤖</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Bots Yet</h3>
                        <p className="text-gray-400">
                            Create your first bot to add AI competition to your team
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bots.map(bot => (
                            <div key={bot.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">{bot.avatar_emoji}</div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{bot.name}</h3>
                                            {bot.target_user && (
                                                <p className="text-sm text-gray-400">
                                                    Competing against: {bot.target_user.display_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(bot)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => updateBot(bot.id, { is_active: !bot.is_active })}
                                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${bot.is_active
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                                                }`}
                                        >
                                            {bot.is_active ? '✓ Active' : '⏸ Inactive'}
                                        </button>
                                        <button
                                            onClick={() => deleteBot(bot.id, bot.name)}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Bot Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-white">
                                            {bot.bot_stats?.[0]?.total_points || 0}
                                        </div>
                                        <div className="text-xs text-gray-400">Total Points</div>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-white">
                                            {bot.bot_stats?.[0]?.total_reps || 0}
                                        </div>
                                        <div className="text-xs text-gray-400">Total Reps</div>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                                        <div className="text-2xl font-bold text-white">
                                            {bot.bot_stats?.[0]?.sessions_completed || 0}
                                        </div>
                                        <div className="text-xs text-gray-400">Sessions</div>
                                    </div>
                                </div>

                                {/* Bot Settings */}
                                <div className="flex gap-2 text-sm mb-3">
                                    <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full">
                                        {difficultyModes.find(m => m.value === bot.difficulty_mode)?.label || bot.difficulty_mode}
                                    </span>
                                    <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
                                        Multiplier: {bot.performance_multiplier}x
                                    </span>
                                </div>

                                {/* Generate Results Button */}
                                <button
                                    onClick={() => generateBotResults(bot.id)}
                                    disabled={generating}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                >
                                    {generating ? '⏳ Generating...' : '🎲 Generate Results'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}/ /   t r i g g e r   d e p l o y  
 