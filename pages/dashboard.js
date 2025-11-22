// pages/dashboard.js - v0.47 with Multi-Team Support
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

  // Library filters
  const [sportFilter, setSportFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    is_public: false,
    sport: 'Other',
    tags: []
  });

  // Sport options
  const sports = [
    'Basketball', 'Soccer', 'Baseball', 'Football', 'Volleyball',
    'Tennis', 'Swimming', 'Track & Field', 'Hockey', 'Lacrosse',
    'Wrestling', 'Cross Country', 'Golf', 'Softball', 'Gymnastics',
    'Cheerleading', 'Dance', 'Martial Arts', 'Rugby', 'Other'
  ];

  // Tag options
  const commonTags = [
    'Speed & Agility', 'Strength', 'Endurance', 'Dribbling', 'Shooting',
    'Passing', 'Defense', 'Ball Control', 'Footwork', 'Conditioning',
    'Technique', 'Power', 'Balance', 'Coordination', 'Flexibility',
    'Core', 'Upper Body', 'Lower Body', 'Cardio', 'Warmup', 'Cooldown'
  ];

  useEffect(() => {
    if (!user || !userProfile) {
      return; // Wait for user and profile to load
    }

    if (userProfile.role !== 'coach') {
      router.push('/drills');
      return;
    }

    if (!userProfile.active_team_id) {
      setLoading(false);
      return; // Don't fetch drills if no active team
    }

    // Fetch drills whenever active team changes
    fetchDrills();
    fetchLibraryDrills();
  }, [user, userProfile, userProfile?.active_team_id]);

  const fetchDrills = async () => {
    try {
      if (!user || !user.id || !userProfile?.active_team_id) {
        setDrills([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('created_by', user.id)
        .eq('team_id', userProfile.active_team_id)
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
      if (!user || !user.id) {
        console.log('User not ready, skipping library fetch');
        return;
      }

      // Fetch ALL public drills (including from this coach's other teams)
      const { data, error } = await supabase
        .from('drills')
        .select(`
          *,
          creator:users!created_by (display_name, email)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out drills from the CURRENT team
      // Keep drills from: other coaches OR this coach's other teams
      const filteredData = (data || []).filter(drill => {
        // If from another coach, always include
        if (drill.created_by !== user.id) return true;

        // If from this coach but different team, include
        if (drill.team_id !== userProfile?.active_team_id) return true;

        // If from this coach AND current team, exclude (it's in "Your Drills")
        return false;
      });

      console.log(`Loaded ${filteredData.length} library drills (${data?.length || 0} total public)`);
      setLibraryDrills(filteredData);
    } catch (err) {
      console.error('Error fetching library drills:', err);
      setLibraryDrills([]); // Set empty array on error to prevent crashes
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
      is_public: false,
      sport: 'Other',
      tags: []
    });
    setEditingDrill(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Drill name is required');
      return;
    }

    if (!userProfile.active_team_id) {
      alert('Please select a team first');
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
        is_public: form.is_public,
        sport: form.sport || 'Other',
        tags: form.tags || []
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
          .eq('team_id', userProfile.active_team_id)
          .order('sort_order', { ascending: false })
          .limit(1);

        const nextSortOrder = (maxData?.[0]?.sort_order || 0) + 1; // Put new drills at the end

        const { error } = await supabase.from('drills').insert({
          ...drillData,
          created_by: user.id,
          team_id: userProfile.active_team_id,
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
      is_public: drill.is_public || false,
      sport: drill.sport || 'Other',
      tags: drill.tags || []
    });
  };

  const copyFromLibrary = async (libraryDrill) => {
    if (!confirm(`Copy "${libraryDrill.name}" to your drills?`)) return;

    if (!userProfile.active_team_id) {
      alert('Please select a team first');
      return;
    }

    try {
      // Get max sort_order for new drill
      const { data: maxData } = await supabase
        .from('drills')
        .select('sort_order')
        .eq('created_by', user.id)
        .eq('team_id', userProfile.active_team_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = (maxData?.[0]?.sort_order || 0) + 1; // Put copied drills at the end

      // Copy ALL relevant fields including sport and tags
      const { error } = await supabase.from('drills').insert({
        name: libraryDrill.name,
        type: libraryDrill.type,
        description: libraryDrill.description,
        video_url: libraryDrill.video_url,
        duration: libraryDrill.duration,
        points_per_rep: libraryDrill.points_per_rep,
        points_for_completion: libraryDrill.points_for_completion,
        is_active: true, // Default to active for copied drills
        daily_limit: libraryDrill.daily_limit || false,
        is_public: false, // Copied drills default to private
        sport: libraryDrill.sport || 'Other',
        tags: libraryDrill.tags || [],
        created_by: user.id, // CRITICAL: Set this coach as creator
        team_id: userProfile.active_team_id,
        sort_order: nextSortOrder
      });

      if (error) throw error;

      alert('✅ Drill copied successfully! It\'s now available to your players.');
      fetchDrills();
    } catch (err) {
      console.error('Error copying drill:', err);
      alert('Failed to copy drill: ' + err.message);
    }
  };

  const handleDelete = async (drillId) => {
    if (!confirm('Delete this drill? This cannot be undone.')) return;

    try {
      await supabase.from('drill_results').delete().eq('drill_id', drillId);
      await supabase.from('drill_completions_daily').delete().eq('drill_id', drillId);

      const { error } = await supabase.from('drills').delete().eq('id', drillId);
      if (error) throw error;

      alert('Drill deleted');
      fetchDrills();
    } catch (err) {
      console.error('Error deleting drill:', err);
      alert('Failed to delete drill: ' + err.message);
    }
  };

  const moveDrill = async (drill, direction) => {
    const currentIndex = drills.findIndex(d => d.id === drill.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === drills.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentDrill = drills[currentIndex];
    const swapDrill = drills[swapIndex];

    try {
      // Use a temporary large number to avoid conflicts
      const tempSortOrder = 999999;

      // Step 1: Set current drill to temp value
      await supabase.from('drills')
        .update({ sort_order: tempSortOrder })
        .eq('id', currentDrill.id);

      // Step 2: Set swap drill to current's old value
      await supabase.from('drills')
        .update({ sort_order: currentDrill.sort_order })
        .eq('id', swapDrill.id);

      // Step 3: Set current drill to swap's old value
      await supabase.from('drills')
        .update({ sort_order: swapDrill.sort_order })
        .eq('id', currentDrill.id);

      // Refresh the list
      await fetchDrills();
    } catch (err) {
      console.error('Error reordering drills:', err);
      alert('Failed to reorder drills. Please refresh the page and try again.');
    }
  };

  const toggleTag = (tag) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const getDrillTypeLabel = (type) => {
    const labels = {
      timer: '⏱️ Timer (countdown)',
      stopwatch: '⏱️ Stopwatch (count up)',
      reps: '🔢 Rep Counter',
      check: '✓ Checkbox'
    };
    return labels[type] || type;
  };

  // Filter library drills
  const filteredLibraryDrills = libraryDrills.filter(drill => {
    // Sport filter
    if (sportFilter !== 'all' && drill.sport !== sportFilter) {
      return false;
    }

    // Tag filter
    if (tagFilter !== 'all' && (!drill.tags || !drill.tags.includes(tagFilter))) {
      return false;
    }

    // Search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        drill.name.toLowerCase().includes(search) ||
        drill.description?.toLowerCase().includes(search) ||
        drill.sport?.toLowerCase().includes(search) ||
        drill.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return true;
  });

  // Get unique sports and tags from library
  const availableSports = [...new Set(libraryDrills.map(d => d.sport).filter(Boolean))].sort();
  const availableTags = [...new Set(libraryDrills.flatMap(d => d.tags || []))].sort();

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  if (!userProfile?.active_team_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-white mb-4">Select a Team</h2>
            <p className="text-gray-400 mb-6">
              Please select which team you want to work on from the dropdown in the navbar.
            </p>
            <button
              onClick={() => router.push('/teams')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Go to Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Drill Management</h1>
            <p className="text-gray-400 text-sm sm:text-base">Create and manage drills for your team</p>
          </div>

          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 justify-center"
          >
            📚 {showLibrary ? 'Hide' : 'Show'} Drill Library
          </button>
        </div>

        {/* Library Modal */}
        {showLibrary && (
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-purple-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">📚 Drill Library</h2>
              <button
                onClick={() => setShowLibrary(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Browse and copy drills shared by other coaches. Copied drills will be added to your team's drill list.
            </p>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="🔍 Search drills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />

              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Sports</option>
                {availableSports.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>

              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Tags</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Library Drills */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredLibraryDrills.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No drills found matching your filters.</p>
              ) : (
                filteredLibraryDrills.map(drill => (
                  <div key={drill.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{drill.name}</h3>
                        <p className="text-xs text-gray-400">
                          by {drill.creator?.display_name || 'Unknown'}
                        </p>
                      </div>
                      <button
                        onClick={() => copyFromLibrary(drill)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-semibold transition"
                      >
                        Copy
                      </button>
                    </div>

                    {drill.description && (
                      <p className="text-gray-300 text-sm mb-2 line-clamp-2">{drill.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-2">
                      {drill.sport && drill.sport !== 'Other' && (
                        <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-xs">
                          🏅 {drill.sport}
                        </span>
                      )}
                      {drill.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-green-600/30 text-green-300 px-2 py-0.5 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {drill.tags?.length > 3 && (
                        <span className="text-gray-400 text-xs px-2 py-0.5">
                          +{drill.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 text-xs text-gray-400">
                      <span>{getDrillTypeLabel(drill.type)}</span>
                      {drill.type !== 'check' && drill.type !== 'stopwatch' && (
                        <span>💎 {drill.points_per_rep} pts/rep</span>
                      )}
                      <span>🎁 {drill.points_for_completion} bonus</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Create/Edit Drill Form */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">
            {editingDrill ? 'Edit Drill' : 'Create New Drill'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-2">Drill Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Box Jumps"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Drill Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="timer">⏱️ Timer (countdown)</option>
                <option value="stopwatch">⏱️ Stopwatch (count up)</option>
                <option value="reps">🔢 Rep Counter</option>
                <option value="check">✓ Checkbox (complete task)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain how to perform this drill..."
                rows="3"
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

            {/* Sport & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Sport</label>
                <select
                  value={form.sport}
                  onChange={(e) => setForm({ ...form, sport: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {sports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Tags (click to add/remove)
                </label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-gray-700 border border-gray-600 rounded-lg">
                  {commonTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 rounded text-xs transition ${form.tags.includes(tag)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {form.tags.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Selected: {form.tags.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Timer Duration */}
            {form.type === 'timer' && (
              <div>
                <label className="block text-gray-300 text-sm mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  min="1"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Points */}
            <div className="grid grid-cols-2 gap-4">
              {form.type !== 'check' && form.type !== 'stopwatch' && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Points per Rep</label>
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
                ℹ️ Public drills can be discovered and copied by other coaches. Make sure to add relevant sport and tags for better discoverability!
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
                  className={`p-4 rounded-lg border-2 transition ${drill.is_active === false
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
                        <div className="flex-1">
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

                          {/* Sport and Tags Display */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {drill.sport && drill.sport !== 'Other' && (
                              <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-xs">
                                🏅 {drill.sport}
                              </span>
                            )}
                            {drill.tags?.slice(0, 3).map(tag => (
                              <span key={tag} className="bg-green-600/30 text-green-300 px-2 py-0.5 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {drill.tags?.length > 3 && (
                              <span className="text-gray-400 text-xs px-2 py-0.5">
                                +{drill.tags.length - 3}
                              </span>
                            )}
                          </div>
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
                        <p className="text-gray-300 text-sm mb-2 line-clamp-2" style={{ whiteSpace: 'pre-line' }}>{drill.description}</p>
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