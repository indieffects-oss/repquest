// pages/dashboard.js - v0.41 with drill management features
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Dashboard({ user, userProfile }) {
  const router = useRouter();
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDrill, setEditingDrill] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'timer',
    description: '',
    video_url: '',
    duration: 60,
    points_per_rep: 1,
    points_for_completion: 10,
    is_active: true,
    daily_limit: false
  });

  useEffect(() => {
    if (userProfile && userProfile.role !== 'coach') {
      router.push('/drills');
      return;
    }
    fetchDrills();
  }, [userProfile]);

  const fetchDrills = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
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
      daily_limit: false
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
      if (editingDrill) {
        const { error } = await supabase
          .from('drills')
          .update({
            name: form.name.trim(),
            type: form.type,
            description: form.description.trim(),
            video_url: form.video_url.trim(),
            duration: form.type === 'timer' ? parseInt(form.duration) : null,
            points_per_rep: parseInt(form.points_per_rep),
            points_for_completion: parseInt(form.points_for_completion),
            is_active: form.is_active,
            daily_limit: form.daily_limit
          })
          .eq('id', editingDrill.id);

        if (error) throw error;
        alert('Drill updated!');
      } else {
        // Get max sort_order for new drill
        const { data: maxData } = await supabase
          .from('drills')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1);
        
        const nextSortOrder = (maxData && maxData[0]?.sort_order) ? maxData[0].sort_order + 1 : 0;

        const { error } = await supabase.from('drills').insert({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim(),
          video_url: form.video_url.trim(),
          duration: form.type === 'timer' ? parseInt(form.duration) : null,
          points_per_rep: parseInt(form.points_per_rep),
          points_for_completion: parseInt(form.points_for_completion),
          coach_id: user.id,
          is_active: form.is_active,
          daily_limit: form.daily_limit,
          sort_order: nextSortOrder
        });

        if (error) throw error;
        alert('Drill created!');
      }

      resetForm();
      fetchDrills();
    } catch (err) {
      console.error('Error saving drill:', err);
      alert('Failed to save drill');
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
      points_per_rep: drill.points_per_rep,
      points_for_completion: drill.points_for_completion,
      is_active: drill.is_active !== false,
      daily_limit: drill.daily_limit || false
    });
  };

  const toggleActive = async (drill) => {
    try {
      const { error } = await supabase
        .from('drills')
        .update({ is_active: !drill.is_active })
        .eq('id', drill.id);

      if (error) throw error;
      fetchDrills();
    } catch (err) {
      console.error('Error toggling drill:', err);
      alert('Failed to update drill');
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
    } catch (err) {
      console.error('Error deleting drill:', err);
      alert('Failed to delete drill');
    }
  };

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">Drill Management</h1>

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
                <label className="block text-gray-300 text-sm mb-2">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="timer">Timer</option>
                  <option value="reps">Rep Counter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Make 10 free throws in a row"
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

              <div>
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

            {/* New Toggle Options */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Active (visible to players)</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={form.daily_limit}
                  onChange={(e) => setForm({ ...form, daily_limit: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Limit to once per day</span>
              </label>
            </div>

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
                        className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed text-white"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDrill(drill, 'down')}
                        disabled={index === drills.length - 1}
                        className="p-1 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed text-white"
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
                          </h3>
                          <p className="text-gray-400 text-sm capitalize">{drill.type}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleActive(drill)}
                            className={`px-3 py-1 rounded text-sm font-semibold transition ${
                              drill.is_active === false
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                          >
                            {drill.is_active === false ? 'Activate' : 'Deactivate'}
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
                        {drill.type === 'timer' && (
                          <span>⏱️ {drill.duration}s</span>
                        )}
                        <span>💎 {drill.points_per_rep} pts/rep</span>
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