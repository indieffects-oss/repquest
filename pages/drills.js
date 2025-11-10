// pages/drills.js - v0.43 with team-specific drills
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function DrillsList({ user, userProfile }) {
  const router = useRouter();
  const [drills, setDrills] = useState([]);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    if (!user || !userProfile) return;
    fetchDrills();
    fetchTodayCompletions();
  }, [user, userProfile]);

 const fetchDrills = async () => {
  try {
    const activeTeamId = userProfile.active_team_id;
    console.log('1. Player active_team_id:', activeTeamId);
    
    if (!activeTeamId) {
      setDrills([]);
      setLoading(false);
      return;
    }

    // Get team info including coach_id
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('name, coach_id')
      .eq('id', activeTeamId)
      .single();

    console.log('2. Team data:', teamData);
    console.log('2. Team error:', teamError);

    if (teamError) throw teamError;
    
    if (!teamData) {
      setDrills([]);
      setLoading(false);
      return;
    }

    setTeamName(teamData.name);

    console.log('3. Fetching drills for coach_id:', teamData.coach_id);

    // Fetch drills created by this team's coach
    const { data, error } = await supabase
      .from('drills')
      .select('*')
      .eq('created_by', teamData.coach_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    console.log('4. Drills found:', data?.length || 0);
    console.log('4. All drill data:', JSON.stringify(data, null, 2));
    console.log('4. Drill names:', data?.map(d => d.name));
    console.log('4. Fetch error:', error);

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

  console.log('5. Drills state:', drills);
  console.log('6. Loading state:', loading);

  const startDrill = (drill) => {
    if (drill.daily_limit && completedToday.has(drill.id)) {
      alert('⏰ You\'ve already completed this drill today! Come back tomorrow for more points.');
      return;
    }
    
    router.push(`/player?drillId=${drill.id}`);
  };

  if (loading) {
    return <div className="p-6 text-white">Loading drills...</div>;
  }

  if (!userProfile?.active_team_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏃</div>
            <p className="text-white text-lg mb-2">No Active Team</p>
            <p className="text-gray-400 text-sm mb-4">
              You need to join a team to access drills
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {teamName ? `${teamName} Drills` : 'Available Drills'}
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Select a drill to start training</p>
        </div>

        {drills.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
            <div className="text-6xl mb-4">🏃</div>
            <p className="text-white text-lg mb-2">No drills available yet</p>
            <p className="text-gray-400 text-sm">
              Your coach hasn't created any drills for this team yet
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {drills.map(drill => {
              const isCompletedToday = drill.daily_limit && completedToday.has(drill.id);
              
              return (
                <button
                  key={drill.id}
                  onClick={() => startDrill(drill)}
                  disabled={isCompletedToday}
                  className={`bg-gray-800 hover:bg-gray-750 border-2 rounded-xl p-6 text-left transition group ${
                    isCompletedToday
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
                        isCompletedToday
                          ? 'bg-gray-600 text-gray-400'
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {isCompletedToday ? '✓ DONE TODAY' : '1/DAY'}
                      </span>
                    )}
                  </div>

                  {drill.description && (
                    <p className="text-gray-300 text-sm mb-4">{drill.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 capitalize">
                      {drill.type === 'timer' && drill.duration ? `⏱️ ${drill.duration}s` : 
                       drill.type === 'stopwatch' ? '⏱️ Stopwatch' :
                       drill.type === 'check' ? '✓ Checkbox' : '🔢 Rep Counter'}
                    </span>
                    {drill.type !== 'check' && drill.type !== 'stopwatch' && (
                      <span className="text-blue-400 font-semibold">
                        💎 {drill.points_per_rep} pts/rep
                      </span>
                    )}
                    {drill.points_for_completion > 0 && (
                      <span className="text-green-400 font-semibold">
                        🎁 +{drill.points_for_completion}
                      </span>
                    )}
                  </div>

                  {isCompletedToday && (
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