// pages/dashboard.js
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
    points_for_completion: 10
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
      points_for_completion: 10
    });
    setEditingDrill(null);
  };

  const handleEdit = (drill) => {
    setForm({
      name: drill.name,
      type: drill.type,
      description: drill.description || '',
      video_url: drill.video_url || '',
      duration: drill.duration || 60,
      points_per_rep: drill.points_per_rep || 1,
      points_for_completion: drill.points_for_completion || 10
    });
    setEditingDrill(drill.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
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
        points_per_rep: form.type !== 'check' && form.type !== 'stopwatch' ? parseInt(form.points_per_rep) : 0,
        points_for_completion: parseInt(form.points_for_completion),
        created_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (editingDrill) {
        const { error } = await supabase
          .from('drills')
          .update(drillData)
          .eq('id', editingDrill);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('drills')
          .insert({
            ...drillData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      resetForm();
      await fetchDrills();
    } catch (err) {
      console.error('Error saving drill:', err);
      alert('Failed to save drill');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (drillId) => {
    if (!confirm('Are you sure you want to delete this drill?')) return;

    try {
      const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);

      if (error) throw error;
      await fetchDrills();
    } catch (err) {
      console.error('Error deleting drill:', err);
      alert('Failed to delete drill');
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Coach Dashboard</h1>
          <p className="text-gray-400">Create and manage training drills</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingDrill ? 'Edit Drill' : 'Create New Drill'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Drill Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Push-ups"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="timer">Timer</option>
                    <option value="stopwatch">Stopwatch</option>
                    <option value="reps">Rep Count</option>
                    <option value="check">Checkbox</option>
                  </select>
                </div>

                {form.type === 'timer' && (
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Duration (sec)</label>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Describe how to perform this drill..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Video URL (optional)</label>
                <input
                  type="url"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {form.type !== 'check' && form.type !== 'stopwatch' && (
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Points per Rep</label>
                    <input
                      type="number"
                      value={form.points_per_rep}
                      onChange={(e) => setForm({ ...form, points_per_rep: e.target.value })}
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
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  {saving ? 'Saving...' : editingDrill ? 'Update Drill' : 'Create Drill'}
                </button>
                {editingDrill && (
                  <button
                    onClick={resetForm}
                    className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Drills List */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Your Drills</h2>
            
            {drills.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-400">No drills yet</p>
                <p className="text-gray-500 text-sm mt-2">Create your first drill to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drills.map(drill => (
                  <div key={drill.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{drill.name}</h3>
                        <p className="text-gray-400 text-sm mb-2">{drill.description}</p>
                        <div className="flex gap-2 flex-wrap text-xs">
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {drill.type}
                          </span>
                          {drill.type === 'timer' && (
                            <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded">
                              {drill.duration}s
                            </span>
                          )}
                          {drill.type !== 'check' && drill.type !== 'stopwatch' && (
                            <span className="bg-green-900 text-green-300 px-2 py-1 rounded">
                              {drill.points_per_rep}pts/rep
                            </span>
                          )}
                          <span className="bg-purple-900 text-purple-300 px-2 py-1 rounded">
                            +{drill.points_for_completion}pts bonus
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => router.push(`/player?drillId=${drill.id}`)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                          title="Test this drill"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleEdit(drill)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(drill.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}