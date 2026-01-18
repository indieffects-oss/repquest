// pages/drills.js - v0.47 with challenge banner for players
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// Season Warning Component - Shows start countdown AND end countdown
function SeasonEndWarning({ teamId }) {
  const [seasonInfo, setSeasonInfo] = useState(null);

  useEffect(() => {
    if (!teamId) {
      setSeasonInfo(null);
      return;
    }

    const fetchSeasonInfo = async () => {
      const { data } = await supabase
        .from('teams')
        .select('season_start_date, season_end_date, name')
        .eq('id', teamId)
        .single();

      if (!data || (!data.season_start_date && !data.season_end_date)) {
        setSeasonInfo(null);
        return;
      }

      const now = new Date();
      const start = data.season_start_date ? new Date(data.season_start_date) : null;
      const end = data.season_end_date ? new Date(data.season_end_date) : null;

      // Season hasn't started yet
      if (start && now < start) {
        const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
        setSeasonInfo({
          type: 'upcoming',
          daysLeft: daysUntil,
          date: start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          teamName: data.name
        });
        return;
      }

      // Season is active and ending soon (within 14 days)
      if (end && now < end) {
        const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 14) {
          setSeasonInfo({
            type: 'ending',
            daysLeft: daysLeft,
            date: end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            teamName: data.name
          });
          return;
        }
      }

      // Season has ended
      if (end && now > end) {
        setSeasonInfo({
          type: 'ended',
          date: end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          teamName: data.name
        });
        return;
      }

      // No relevant season info to show
      setSeasonInfo(null);
    };

    fetchSeasonInfo();
  }, [teamId]);

  if (!seasonInfo) return null;

  // Season upcoming (hasn't started)
  if (seasonInfo.type === 'upcoming') {
    return (
      <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-2 border-blue-500 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🗓️</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-blue-300">
              Season Starting Soon!
            </h3>
            <p className="text-white">
              <span className="font-bold">{seasonInfo.daysLeft}</span> day{seasonInfo.daysLeft !== 1 ? 's' : ''} until {seasonInfo.teamName} season begins
            </p>
            <p className="text-blue-200 text-sm mt-1">
              Starts: {seasonInfo.date}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Season ending soon
  if (seasonInfo.type === 'ending') {
    return (
      <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border-2 border-orange-500 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⏰</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-orange-300">
              Season Ending Soon!
            </h3>
            <p className="text-white">
              Only <span className="font-bold">{seasonInfo.daysLeft}</span> day{seasonInfo.daysLeft !== 1 ? 's' : ''} left to log drills this season
            </p>
            <p className="text-orange-200 text-sm mt-1">
              Ends: {seasonInfo.date}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Season ended
  if (seasonInfo.type === 'ended') {
    return (
      <div className="bg-gradient-to-r from-red-900/50 to-gray-900/50 border-2 border-red-500 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏁</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-300">
              Season Has Ended
            </h3>
            <p className="text-white">
              The {seasonInfo.teamName} season ended on {seasonInfo.date}
            </p>
            <p className="text-red-200 text-sm mt-1">
              You can view past results but cannot log new drills
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Simple Active Challenge Banner Component
function ActiveChallengeBanner({ userId, teamId }) {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!teamId) return;
    fetchActiveChallenge();
  }, [teamId]);

  const fetchActiveChallenge = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `/api/challenges/list?team_id=${teamId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        // Find first active challenge
        const active = result.challenges.find(c => c.status === 'active');
        setActiveChallenge(active);
      }
    } catch (err) {
      console.error('Error fetching challenge:', err);
    }
  };

  if (!activeChallenge) return null;

  // Calculate time remaining
  const timeRemaining = new Date(activeChallenge.end_time) - new Date();

  if (timeRemaining <= 0) {
    // Challenge has ended, don't show banner
    return null;
  }

  const hoursLeft = Math.floor(timeRemaining / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);

  let timeText = '';
  if (daysLeft > 0) {
    timeText = `${daysLeft}d ${hoursLeft % 24}h left`;
  } else if (hoursLeft > 0) {
    const minutesLeft = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    timeText = `${hoursLeft}h ${minutesLeft}m left`;
  } else {
    const minutesLeft = Math.floor(timeRemaining / (1000 * 60));
    timeText = minutesLeft > 0 ? `${minutesLeft}m left` : 'Ending soon!';
  }

  return (
    <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏆</span>
            <h3 className="text-xl font-bold text-yellow-300">
              Active Challenge!
            </h3>
            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full font-semibold animate-pulse">
              ⏰ {timeText}
            </span>
          </div>
          <p className="text-white">
            Your team is competing against <span className="font-bold">{activeChallenge.opponent_team.name}</span>
          </p>
          <div className="text-sm text-yellow-200 mt-1">
            {activeChallenge.my_team?.name}: {activeChallenge.is_challenger
              ? activeChallenge.challenger_stats?.[0]?.average_points?.toFixed(1) || '0.0'
              : activeChallenge.challenged_stats?.[0]?.average_points?.toFixed(1) || '0.0'
            } pts • {activeChallenge.opponent_team.name}: {activeChallenge.is_challenger
              ? activeChallenge.challenged_stats?.[0]?.average_points?.toFixed(1) || '0.0'
              : activeChallenge.challenger_stats?.[0]?.average_points?.toFixed(1) || '0.0'
            } pts
          </div>
        </div>
        <button
          onClick={() => router.push(`/challenges/${activeChallenge.id}`)}
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap"
        >
          View Challenge
        </button>
      </div>
    </div>
  );
}

export default function DrillsList({ user, userProfile }) {
  const router = useRouter();
  const [drills, setDrills] = useState([]);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [topScores, setTopScores] = useState({});

  useEffect(() => {
    if (!user || !userProfile) return;
    fetchDrills();
    fetchTodayCompletions();
  }, [user, userProfile, userProfile?.active_team_id]);

  const fetchDrills = async () => {
    try {
      const activeTeamId = userProfile.active_team_id;

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

      if (teamError) throw teamError;

      if (!teamData) {
        setDrills([]);
        setLoading(false);
        return;
      }

      setTeamName(teamData.name);

      // Fetch drills for this specific team
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('team_id', activeTeamId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrills(data || []);

      // Fetch top scores for each drill
      if (data && data.length > 0) {
        await fetchTopScores(data, activeTeamId);
      }
    } catch (err) {
      console.error('Error fetching drills:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopScores = async (drillsList, teamId) => {
    try {
      const scores = {};

      for (const drill of drillsList) {
        if (drill.type === 'timer' || drill.type === 'reps') {
          // Get highest reps
          const { data } = await supabase
            .from('drill_results')
            .select('reps, users(display_name)')
            .eq('drill_id', drill.id)
            .eq('team_id', teamId)
            .order('reps', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            scores[drill.id] = {
              value: data.reps,
              playerName: data.users?.display_name || 'Unknown',
              label: `${data.reps} reps`
            };
          }
        } else if (drill.type === 'stopwatch') {
          // Get fastest time
          const { data } = await supabase
            .from('drill_results')
            .select('duration_seconds, users(display_name)')
            .eq('drill_id', drill.id)
            .eq('team_id', teamId)
            .not('duration_seconds', 'is', null)
            .order('duration_seconds', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (data && data.duration_seconds) {
            const mins = Math.floor(data.duration_seconds / 60);
            const secs = data.duration_seconds % 60;
            scores[drill.id] = {
              value: data.duration_seconds,
              playerName: data.users?.display_name || 'Unknown',
              label: `${mins}:${secs.toString().padStart(2, '0')}`
            };
          }
        } else if (drill.type === 'check') {
          // Get most completions
          const { data } = await supabase
            .from('drill_results')
            .select('user_id, users(display_name)')
            .eq('drill_id', drill.id)
            .eq('team_id', teamId);

          if (data && data.length > 0) {
            // Count completions per user
            const counts = {};
            data.forEach(record => {
              const userId = record.user_id;
              counts[userId] = counts[userId] || { count: 0, name: record.users?.display_name || 'Unknown' };
              counts[userId].count++;
            });

            // Find user with most completions
            const topUser = Object.values(counts).sort((a, b) => b.count - a.count)[0];
            if (topUser) {
              scores[drill.id] = {
                value: topUser.count,
                playerName: topUser.name,
                label: `${topUser.count}x`
              };
            }
          }
        }
      }

      setTopScores(scores);
    } catch (err) {
      console.error('Error fetching top scores:', err);
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

        {/* Active Challenge Banner - Players Only */}
        {userProfile?.role === 'player' && (
          <ActiveChallengeBanner
            userId={user?.id}
            teamId={userProfile?.active_team_id}
          />
        )}

        {/* Season End Warning */}
        {userProfile?.active_team_id && (
          <SeasonEndWarning teamId={userProfile.active_team_id} />
        )}
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
              const topScore = topScores[drill.id];

              return (
                <button
                  key={drill.id}
                  onClick={() => startDrill(drill)}
                  disabled={isCompletedToday}
                  className={`bg-gray-800 hover:bg-gray-750 border-2 rounded-xl p-6 text-left transition group ${isCompletedToday
                    ? 'border-gray-600 opacity-60 cursor-not-allowed'
                    : 'border-gray-700 hover:border-blue-500'
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">
                      {drill.name}
                    </h3>
                    {drill.daily_limit && (
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${isCompletedToday
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-yellow-600 text-white'
                        }`}>
                        {isCompletedToday ? '✓ DONE TODAY' : '1/DAY'}
                      </span>
                    )}
                  </div>

                  {drill.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2" style={{ whiteSpace: 'pre-line' }}>{drill.description}</p>
                  )}


                  {topScore && (
                    <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-lg">🏆</span>
                        <div>
                          <div className="text-yellow-200 text-xs font-semibold">
                            {drill.type === 'stopwatch' ? 'FASTEST TIME' :
                              drill.type === 'check' ? 'MOST COMPLETIONS' :
                                'TOP SCORE'}
                          </div>
                          <div className="text-white font-bold">
                            {topScore.label} - {topScore.playerName}
                          </div>
                        </div>
                      </div>
                    </div>
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