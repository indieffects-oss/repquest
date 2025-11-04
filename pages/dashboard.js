// pages/dashboard.js - v0.42 with Drill Library
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard({ user, userProfile }) {
  const router = useRouter();
  const [drills, setDrills] = useState([]);
  const [libraryDrills, setLibraryDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDrill, setEditingDrill] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'timer',
    description: '',
    video_url: '',
    duration: 60,
    points_per_rep: 1,
    points_for_completion: 10,
    is_active: true,
    daily_limit: false,
    is_public: false
  });

  useEffect(() => {
    if (userProfile && userProfile.role !== 'coach') {
      router.push('/drills');
      return;
    }
    fetchDrills();
    fetchLibraryDrills();
  }, [userProfile]);

  const fetchDrills = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('created_by', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrills(data || []);
    } catch (err) {
      console.error('Error fetching drills:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryDrills = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select(`
          *,
          creator:users!created_by (display_name, email)
        `)
        .eq('is_public', true)
        .neq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLibraryDrills(data || []);
    } catch (err) {
      console.error('Error fetching library drills:', err);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'timer',
      description: '',
      video_url: '',
      duration: 60,
      points_per_rep: 1,
      points_for_completion: 10,
      is_active: true,
      daily_limit: false,
      is_public: false
    });
    setEditingDrill(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Drill name is required');
      return;
    }

    setSaving(true);
    try {
      const drillData = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        video_url: form.video_url.trim(),
        duration: form.type === 'timer' ? parseInt(form.duration) : null,
        points_per_rep: (form.type === 'check' || form.type === 'stopwatch') ? 0 : parseInt(form.points_per_rep),
        points_for_completion: parseInt(form.points_for_completion),
        is_active: form.is_active,
        daily_limit: form.daily_limit,
        is_public: form.is_public
      };

      if (editingDrill) {
        const { error } = await supabase
          .from('drills')
          .update(drillData)
          .eq('id', editingDrill.id);

        if (error) throw error;
        alert('Drill updated!');
      } else {
        // Get max sort_order for new drill
        const { data: maxData } = await supabase
          .from('drills')
          .select('sort_order')
          .eq('created_by', user.id)
          .order('sort_order', { ascending: false })
          .limit(1);
        
        const nextSortOrder = (maxData && maxData[0]?.sort_order != null) ? maxData[0].sort_order + 1 : 0;

        const { error } = await supabase.from('drills').insert({
          ...drillData,
          created_by: user.id,
          sort_order: nextSortOrder
        });

        if (error) throw error;
        alert('Drill created!');
      }

      resetForm();
      fetchDrills();
      fetchLibraryDrills();
    } catch (err) {
      console.error('Error saving drill:', err);
      alert('Failed to save drill: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (drill) => {
    setEditingDrill(drill);
    setForm({
      name: drill.name,
      type: drill.type,
      description: drill.description || '',
      video_url: drill.video_url || '',
      duration: drill.duration || 60,
      points_per_rep: drill.points_per_rep || 0,
      points_for_completion: drill.points_for_completion || 0,
      is_active: drill.is_active !== false,
      daily_limit: drill.daily_limit || false,
      is_public: drill.is_public || false
    });
  };

  const copyFromLibrary = async (libraryDrill) => {
    if (!confirm(`Copy "${libraryDrill.name}" to your drills?`)) return;

    try {
      // Get max sort_order for new drill
      const { data: maxData } = await supabase
        .from('drills')
        .select('sort_order')
        .eq('created_by', user.id)
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const nextSortOrder = (maxData && maxData[0]?.sort_order != null) ? maxData[0].sort_order + 1 : 0;

      const { error } = await supabase.from('drills').insert({
        name: libraryDrill.name,
        type: libraryDrill.type,
        description: libraryDrill.description,
        video_url: libraryDrill.video_url,
        duration: libraryDrill.duration,
        points_per_rep: libraryDrill.points_per_rep,
        points_for_completion: libraryDrill.points_for_completion,
        is_active: true,
        daily_limit: libraryDrill.daily_limit,
        is_public: false, // Copied drills default to private
        created_by: user.id,
        sort_order: nextSortOrder
      });

      if (error) throw error;
      alert('Drill copied to your list! You can now edit it as needed.');
      fetchDrills();
    } catch (err) {
      console.error('Error copying drill:', err);
      alert('Failed to copy drill: ' + err.message);
    }
  };

  const moveDrill = async (drill, direction) => {
    const currentIndex = drills.findIndex(d => d.id === drill.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === drills.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newDrills = [...drills];
    
    // Swap
    [newDrills[currentIndex], newDrills[newIndex]] = [newDrills[newIndex], newDrills[currentIndex]];

    // Update sort_order for both drills
    try {
      await supabase
        .from('drills')
        .update({ sort_order: currentIndex })
        .eq('id', newDrills[currentIndex].id);

      await supabase
        .from('drills')
        .update({ sort_order: newIndex })
        .eq('id', newDrills[newIndex].id);

      setDrills(newDrills);
    } catch (err) {
      console.error('Error reordering drills:', err);
      alert('Failed to reorder drills');
    }
  };

  const handleDelete = async (drillId) => {
    if (!confirm('Delete this drill? This will also delete all completions.')) return;

    try {
      const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);

      if (error) throw error;
      alert('Drill deleted!');
      fetchDrills();
      fetchLibraryDrills();
    } catch (err) {
      console.error('Error deleting drill:', err);
      alert('Failed to delete drill');
    }
  };

  const getDrillTypeLabel = (type) => {
    const labels = {
      'timer': '⏱️ Timer',
      'stopwatch': '⏱️ Stopwatch',
      'reps': '🔢 Rep Counter',
      'check': '✓ Checkbox'
    };
    return labels[type] || type;
  };

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Drill Management</h1>
          
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
          >
            📚 {showLibrary ? 'Hide Library' : 'Browse Library'}
            {libraryDrills.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {libraryDrills.length}
              </span>
            )}
          </button>
        </div>

        {/* Drill Library */}
        {showLibrary && (
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 mb-6 border-2 border-purple-600">
            <h2 className="text-xl font-bold text-white mb-2">
              📚 Drill Library
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Browse and copy drills shared by other coaches
            </p>

            {libraryDrills.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-white text-lg mb-2">Library is empty</p>
                <p className="text-gray-400 text-sm">
                  No public drills available yet. Be the first to share!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {libraryDrills.map((drill) => (
                  <div
                    key={drill.id}
                    className="p-4 rounded-lg border-2 bg-gray-700 border-purple-600"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-white font-bold text-lg">
                              {drill.name}
                              {drill.daily_limit && (
                                <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">1/DAY</span>
                              )}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              {getDrillTypeLabel(drill.type)}
                              {drill.creator?.display_name && (
                                <span className="ml-2">• by {drill.creator.display_name}</span>
                              )}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => copyFromLibrary(drill)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition"
                          >
                            📥 Copy to My Drills
                          </button>
                        </div>

                        {drill.description && (
                          <p className="text-gray-300 text-sm mb-2">{drill.description}</p>
                        )}

                        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                          {drill.type === 'timer' && drill.duration && (
                            <span>⏱️ {drill.duration}s</span>
                          )}
                          {drill.type !== 'check' && drill.type !== 'stopwatch' && (
                            <span>💎 {drill.points_per_rep} pts/rep</span>
                          )}
                          <span>🎁 {drill.points_for_completion} bonus</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Form */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingDrill ? 'Edit Drill' : 'Create New Drill'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Drill Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Free Throws"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="timer">Timer (countdown)</option>
                  <option value="stopwatch">Stopwatch (count up)</option>
                  <option value="reps">Rep Counter</option>
                  <option value="check">Checkbox</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Make 10 free throws in a row..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                rows="3"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Video URL (optional)</label>
              <input
                type="url"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {form.type === 'timer' && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Duration (sec)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    min="1"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {form.type !== 'check' && form.type !== 'stopwatch' && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Points/Rep</label>
                  <input
                    type="number"
                    value={form.points_per_rep}
                    onChange={(e) => setForm({ ...form, points_per_rep: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className={form.type === 'check' || form.type === 'stopwatch' ? 'col-span-2' : ''}>
                <label className="block text-gray-300 text-sm mb-2">Completion Bonus</label>
                <input
                  type="number"
                  value={form.points_for_completion}
                  onChange={(e) => setForm({ ...form, points_for_completion: e.target.value })}
                  min="0"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Toggle Options */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Active (visible to players)</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.daily_limit}
                  onChange={(e) => setForm({ ...form, daily_limit: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Limit to once per day</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">📚 Share in library (public)</span>
              </label>
            </div>

            {form.is_public && (
              <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 text-sm text-purple-200">
                ℹ️ Public drills can be copied by other coaches from the drill library
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                {saving ? 'Saving...' : editingDrill ? 'Update Drill' : 'Create Drill'}
              </button>
              
              {editingDrill && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Drills List */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Your Drills ({drills.length})</h2>

          {drills.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No drills yet. Create your first drill above!</p>
          ) : (
            <div className="space-y-3">
              {drills.map((drill, index) => (
                <div
                  key={drill.id}
                  className={`p-4 rounded-lg border-2 transition ${
                    drill.is_active === false
                      ? 'bg-gray-700/50 border-gray-600 opacity-60'
                      : 'bg-gray-700 border-gray-600 hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveDrill(drill, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDrill(drill, 'down')}
                        disabled={index === drills.length - 1}
                        className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Drill Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-white font-bold text-lg">
                            {drill.name}
                            {drill.is_active === false && (
                              <span className="ml-2 text-xs bg-gray-600 px-2 py-1 rounded">INACTIVE</span>
                            )}
                            {drill.daily_limit && (
                              <span className="ml-2 text-xs bg-yellow-600 px-2 py-1 rounded">1/DAY</span>
                            )}
                            {drill.is_public && (
                              <span className="ml-2 text-xs bg-purple-600 px-2 py-1 rounded">📚 PUBLIC</span>
                            )}
                          </h3>
                          <p className="text-gray-400 text-sm">{getDrillTypeLabel(drill.type)}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/player?drillId=${drill.id}`)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition"
                            title="Test this drill"
                          >
                            Test
                          </button>
                          
                          <button
                            onClick={() => handleEdit(drill)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition"
                          >
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleDelete(drill.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {drill.description && (
                        <p className="text-gray-300 text-sm mb-2">{drill.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                        {drill.type === 'timer' && drill.duration && (
                          <span>⏱️ {drill.duration}s</span>
                        )}
                        {drill.type !== 'check' && drill.type !== 'stopwatch' && (
                          <span>💎 {drill.points_per_rep} pts/rep</span>
                        )}
                        <span>🎁 {drill.points_for_completion} bonus</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}