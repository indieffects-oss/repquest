// pages/drills.js - v0.41 with daily limits and inactive filtering
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function DrillsList({ user, userProfile }) {
  const router = useRouter();
  const [drills, setDrills] = useState([]);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchDrills();
    fetchTodayCompletions();
  }, [user]);

  const fetchDrills = async () => {
    try {
      const { data, error} = await supabase
        .from('drills')
        .select('*')
        .eq('is_active', true) // Only show active drills
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

  const fetchTodayCompletions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('drill_completions_daily')
        .select('drill_id')
        .eq('user_id', user.id)
        .eq('completed_date', today);

      if (error) throw error;
      
      const completedDrillIds = new Set(data.map(c => c.drill_id));
      setCompletedToday(completedDrillIds);
    } catch (err) {
      console.error('Error fetching today completions:', err);
    }
  };

  const startDrill = (drill) => {
    // Check if daily limit and already completed today
    if (drill.daily_limit && completedToday.has(drill.id)) {
      alert('⏰ You\'ve already completed this drill today! Come back tomorrow for more points.');
      return;
    }
    
    router.push(`/player?drillId=${drill.id}`);
  };

  if (loading) {
    return <div className="p-6 text-white">Loading drills...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Available Drills</h1>
          <p className="text-gray-400 text-sm sm:text-base">Select a drill to start training</p>
        </div>

        {drills.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏃</div>
            <p className="text-white text-lg mb-2">No drills available yet</p>
            <p className="text-gray-400 text-sm">
              Ask your coach to create some training drills
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {drills.map(drill => {
              const completedToday = drill.daily_limit && completedToday.has(drill.id);
              
              return (
                <button
                  key={drill.id}
                  onClick={() => startDrill(drill)}
                  disabled={completedToday}
                  className={`bg-gray-800 hover:bg-gray-750 border-2 rounded-xl p-6 text-left transition group ${
                    completedToday
                      ? 'border-gray-600 opacity-60 cursor-not-allowed'
                      : 'border-gray-700 hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">
                      {drill.name}
                    </h3>
                    {drill.daily_limit && (
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        completedToday
                          ? 'bg-gray-600 text-gray-400'
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {completedToday ? '✓ DONE TODAY' : '1/DAY'}
                      </span>
                    )}
                  </div>

                  {drill.description && (
                    <p className="text-gray-300 text-sm mb-4">{drill.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 capitalize">
                      {drill.type === 'timer' ? `⏱️ ${drill.duration}s` : '🔢 Rep Counter'}
                    </span>
                    <span className="text-blue-400 font-semibold">
                      💎 {drill.points_per_rep} pts/rep
                    </span>
                    {drill.points_for_completion > 0 && (
                      <span className="text-green-400 font-semibold">
                        🎁 +{drill.points_for_completion}
                      </span>
                    )}
                  </div>

                  {completedToday && (
                    <div className="mt-3 text-xs text-gray-400">
                      ⏰ Available again tomorrow
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}