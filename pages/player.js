// pages/player.js - v0.44 FIXED - No duplicate modals
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { calculateLevel, checkBadgeUnlocks, check67EasterEgg, getLevelTier } from '../lib/gamification';
import ShareModal from '../components/ShareModal';

export default function PlayerDrill({ user, userProfile }) {
  const router = useRouter();
  const { drillId } = router.query;

  const [drill, setDrill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [reps, setReps] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyCompletedToday, setAlreadyCompletedToday] = useState(false);
  const [show67Animation, setShow67Animation] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [leveledUp, setLeveledUp] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [stats, setStats] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamColors, setTeamColors] = useState({ primary: '#3B82F6', secondary: '#1E40AF' });

  const countdownInterval = useRef(null);
  const timerInterval = useRef(null);
  const stopwatchInterval = useRef(null);
  const countdownBeep = useRef(null);
  const startBeep = useRef(null);
  const endBuzzer = useRef(null);
  const wakeLock = useRef(null);

  useEffect(() => {
    countdownBeep.current = new Audio('/sounds/beep.wav');
    startBeep.current = new Audio('/sounds/start_beep.wav');
    endBuzzer.current = new Audio('/sounds/buzzer.wav');
  }, []);

  useEffect(() => {
    if (!drillId || !user) return;
    fetchDrill();
    fetchStats();

    return () => {
      clearInterval(countdownInterval.current);
      clearInterval(timerInterval.current);
      clearInterval(stopwatchInterval.current);
    };
  }, [drillId, user]);

  // Add this useEffect to handle wake lock
  useEffect(() => {
    // Request wake lock when drill starts
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && (running || countdown > 0)) {
        try {
          wakeLock.current = await navigator.wakeLock.request('screen');
          console.log('Screen wake lock activated');

          wakeLock.current.addEventListener('release', () => {
            console.log('Screen wake lock released');
          });
        } catch (err) {
          console.error('Wake lock error:', err);
        }
      }
    };

    // Release wake lock when drill stops
    const releaseWakeLock = async () => {
      if (wakeLock.current) {
        try {
          await wakeLock.current.release();
          wakeLock.current = null;
        } catch (err) {
          console.error('Wake lock release error:', err);
        }
      }
    };

    if (running || countdown > 0) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Cleanup on unmount
    return () => {
      releaseWakeLock();
    };
  }, [running, countdown]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLock.current !== null && document.visibilityState === 'visible' && running) {
        try {
          wakeLock.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.error('Wake lock reacquisition error:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [running]);
  

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDrill = async () => {
    try {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .eq('id', drillId)
        .single();

      if (error) throw error;

      if (!data) {
        alert('Drill not found');
        router.push('/drills');
        return;
      }

      setDrill(data);

      if (userProfile?.active_team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('name, primary_color, secondary_color')  // ADD COLOR FIELDS
          .eq('id', userProfile.active_team_id)
          .single();

        if (teamData) {
          setTeamName(teamData.name);
          setTeamColors({
            primary: teamData.primary_color || '#3B82F6',
            secondary: teamData.secondary_color || '#1E40AF'
          });
        }
      }


      if (data.daily_limit) {
        const today = new Date().toISOString().split('T')[0];
        const { data: completion } = await supabase
          .from('drill_completions_daily')
          .select('id')
          .eq('user_id', user.id)
          .eq('drill_id', drillId)
          .eq('completed_date', today)
          .maybeSingle();

        if (completion) {
          setAlreadyCompletedToday(true);
        }
      }

      if (data.type === 'timer') {
        setTimeLeft(data.duration);
      }
    } catch (err) {
      console.error('Error fetching drill:', err);
      alert('Failed to load drill');
      router.push('/drills');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    let count = 3;

    countdownInterval.current = setInterval(() => {
      if (count > 1) {
        countdownBeep.current?.play();
        count--;
        setCountdown(count);
      } else {
        clearInterval(countdownInterval.current);
        startBeep.current?.play();
        setCountdown(0);

        if (drill.type === 'timer') {
          startTimer();
        } else if (drill.type === 'stopwatch') {
          startStopwatch();
        }
      }
    }, 1000);
  };

  const startTimer = () => {
    setRunning(true);

    timerInterval.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval.current);
          endBuzzer.current?.play();
          setRunning(false);
          setCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startStopwatch = () => {
    setRunning(true);
    setStopwatchTime(0);

    stopwatchInterval.current = setInterval(() => {
      setStopwatchTime(prev => prev + 1);
    }, 1000);
  };

  const stopStopwatch = () => {
    clearInterval(stopwatchInterval.current);
    setRunning(false);
    setCompleted(true);
  };

  const handleCheckboxSubmit = async (didComplete) => {
    setSubmitting(true);

    try {
      const pointsEarned = didComplete ? drill.points_for_completion : 0;

      const { error: insertError1 } = await supabase.from('drill_results').insert({
        user_id: user.id,
        drill_id: drill.id,
        drill_name: drill.name,
        reps: didComplete ? 1 : 0,
        points: pointsEarned,
        timestamp: new Date().toISOString(),
        team_id: userProfile.active_team_id  // ADD THIS LINE
      });

      if (insertError1) {
        console.error("Error inserting drill result:", insertError1);
        throw new Error(`Failed to save drill result: ${insertError1.message}`);
      }

      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', user.id)
        .single();

      const newTotalPoints = (userData.total_points || 0) + pointsEarned;
      const oldLevel = calculateLevel(userData.total_points || 0);
      const newLevel = calculateLevel(newTotalPoints);

      await supabase
        .from('users')
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      const today = new Date().toISOString().split('T')[0];
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const isNewDay = !currentStats || currentStats.last_activity_date !== today;
      const newStreak = isNewDay ? (currentStats?.current_streak || 0) + 1 : (currentStats?.current_streak || 1);

      const updatedStats = {
        user_id: user.id,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, currentStats?.longest_streak || 0),
        last_activity_date: today,
        total_reps: (currentStats?.total_reps || 0) + (didComplete ? 1 : 0),
        sessions_completed: (currentStats?.sessions_completed || 0) + 1,
        total_points: newTotalPoints
      };

      await supabase.from('user_stats').upsert(updatedStats);
      setStats(updatedStats);

      if (newLevel > oldLevel) {
        setLeveledUp(newLevel);
      }

      if (check67EasterEgg(newTotalPoints)) {
        setShow67Animation(true);
        setTimeout(() => setShow67Animation(false), 3000);
      }

      const newBadges = await checkBadgeUnlocks(supabase, user.id, updatedStats);
      if (newBadges.length > 0) {
        setUnlockedBadges(newBadges);
      }

      if (drill.daily_limit) {
        await supabase.from('drill_completions_daily').insert({
          user_id: user.id,
          drill_id: drill.id,
          completed_date: today
        });
      }

      // Only redirect if no modals
      if (!newLevel || newLevel <= oldLevel) {
        if (newBadges.length === 0) {
          setTimeout(() => router.push('/drills'), 1500);
        }
      }
    } catch (err) {
      console.error('Error submitting:', err);
      alert('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const repsInt = drill.type === 'stopwatch' ? 0 : parseInt(reps || 0);
    const duration = drill.type === 'stopwatch' ? stopwatchTime : null;

    if (drill.type !== 'stopwatch' && (!reps || repsInt <= 0)) {
      alert('Please enter a valid number');
      return;
    }

    setSubmitting(true);

    try {
      const totalPoints = drill.type === 'stopwatch'
        ? drill.points_for_completion
        : (repsInt * drill.points_per_rep) + drill.points_for_completion;

      const { error: insertError } = await supabase.from('drill_results').insert({
        user_id: user.id,
        drill_id: drill.id,
        drill_name: drill.name,
        reps: repsInt,
        duration_seconds: duration,
        points: totalPoints,
        timestamp: new Date().toISOString(),
        team_id: userProfile.active_team_id
      });

      if (insertError) {
        console.error('Error inserting drill result:', insertError);
        throw new Error(`Failed to save drill result: ${insertError.message}`);
      }

      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', user.id)
        .single();

      const newTotalPoints = (userData.total_points || 0) + totalPoints;
      const oldLevel = calculateLevel(userData.total_points || 0);
      const newLevel = calculateLevel(newTotalPoints);

      await supabase
        .from('users')
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      const today = new Date().toISOString().split('T')[0];
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const isNewDay = !currentStats || currentStats.last_activity_date !== today;
      const newStreak = isNewDay ? (currentStats?.current_streak || 0) + 1 : (currentStats?.current_streak || 1);

      const updatedStats = {
        user_id: user.id,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, currentStats?.longest_streak || 0),
        last_activity_date: today,
        total_reps: (currentStats?.total_reps || 0) + repsInt,
        sessions_completed: (currentStats?.sessions_completed || 0) + 1,
        total_points: newTotalPoints
      };

      await supabase.from('user_stats').upsert(updatedStats);
      setStats(updatedStats);

      if (newLevel > oldLevel) {
        setLeveledUp(newLevel);
      }

      if (check67EasterEgg(repsInt) || check67EasterEgg(totalPoints) || check67EasterEgg(newTotalPoints)) {
        setShow67Animation(true);
        setTimeout(() => setShow67Animation(false), 3000);
      }

      const newBadges = await checkBadgeUnlocks(supabase, user.id, updatedStats);
      if (newBadges.length > 0) {
        setUnlockedBadges(newBadges);
      }

      if (drill.daily_limit) {
        await supabase.from('drill_completions_daily').insert({
          user_id: user.id,
          drill_id: drill.id,
          completed_date: today
        });
      }

      // Only redirect if no modals
      if (!newLevel || newLevel <= oldLevel) {
        if (newBadges.length === 0) {
          setTimeout(() => {
            if (userProfile?.role === 'coach') {
              router.push('/dashboard');
            } else {
              router.push('/drills');
            }
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Error submitting:', err);
      alert('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedPoints = reps && drill
    ? (parseInt(reps) * drill.points_per_rep) + drill.points_for_completion
    : drill?.points_for_completion || 0;

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!drill) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Drill not found</div>;
  }

  if (alreadyCompletedToday) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md text-center border border-gray-700">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">Already Completed!</h2>
          <p className="text-gray-400 mb-6">You've already completed this drill today. Come back tomorrow!</p>
          <button
            onClick={() => router.push('/drills')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Back to Drills
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-2">{drill.name}</h1>
          {drill.description && (
            <p className="text-gray-400 mb-4">{drill.description}</p>
          )}
          {drill.video_url && (
            <a
              href={drill.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              📹 Watch Video
            </a>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          {countdown > 0 && (
            <div className="text-9xl font-bold text-yellow-400 animate-pulse">
              {countdown}
            </div>
          )}

          {drill.type === 'timer' && countdown === 0 && !completed && (
            <div>
              <div className="text-7xl font-bold text-white mb-6">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              {!running && (
                <button
                  onClick={startCountdown}
                  className="bg-green-600 hover:bg-green-700 text-white text-xl px-8 py-4 rounded-lg font-semibold"
                >
                  Start Timer
                </button>
              )}
              {running && (
                <div className="text-yellow-400 text-xl animate-pulse">Timer running...</div>
              )}
            </div>
          )}

          {drill.type === 'stopwatch' && countdown === 0 && !completed && (
            <div>
              <div className="text-7xl font-bold text-white mb-6">
                {Math.floor(stopwatchTime / 60)}:{(stopwatchTime % 60).toString().padStart(2, '0')}
              </div>
              {!running && stopwatchTime === 0 && (
                <button
                  onClick={startCountdown}
                  className="bg-green-600 hover:bg-green-700 text-white text-xl px-8 py-4 rounded-lg font-semibold"
                >
                  Start Stopwatch
                </button>
              )}
              {running && (
                <button
                  onClick={stopStopwatch}
                  className="bg-red-600 hover:bg-red-700 text-white text-xl px-8 py-4 rounded-lg font-semibold"
                >
                  Stop
                </button>
              )}
            </div>
          )}

          {drill.type === 'reps' && !completed && (
            <div>
              <div className="text-gray-300 text-xl mb-4">How many reps did you complete?</div>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Enter reps"
                min="0"
                max="999999"
                className="w-full max-w-xs px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl text-center mb-4 focus:outline-none focus:border-blue-500"
                autoFocus
              />

              {reps && parseInt(reps) > 0 && (
                <div className="text-3xl font-bold text-green-400 mb-4">
                  = {calculatedPoints.toLocaleString()} points
                </div>
              )}

              <div className="text-gray-400 text-sm mb-6">
                💎 {drill.points_per_rep} pts/rep + 🎁 {drill.points_for_completion} bonus
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !reps || parseInt(reps) <= 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xl px-8 py-4 rounded-lg font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          )}

          {drill.type === 'check' && !completed && (
            <div>
              <div className="text-gray-300 text-xl mb-6">Did you complete this drill?</div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleCheckboxSubmit(true)}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xl px-12 py-6 rounded-lg font-semibold"
                >
                  ✓ Yes
                </button>
                <button
                  onClick={() => handleCheckboxSubmit(false)}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xl px-12 py-6 rounded-lg font-semibold"
                >
                  ✗ No
                </button>
              </div>
              <div className="text-gray-400 text-sm mt-4">
                🎁 {drill.points_for_completion} points for completion
              </div>
            </div>
          )}

          {completed && drill.type === 'timer' && (
            <div>
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-2xl font-bold text-white mb-4">Timer Complete!</div>
              <div className="text-gray-300 text-lg mb-4">How many reps did you complete?</div>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Enter reps"
                min="0"
                max="999999"
                className="w-full max-w-xs px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl text-center mb-4 focus:outline-none focus:border-blue-500"
                autoFocus
              />

              {reps && parseInt(reps) > 0 && (
                <div className="text-3xl font-bold text-green-400 mb-4">
                  = {calculatedPoints.toLocaleString()} points
                </div>
              )}

              <div className="text-gray-400 text-sm mb-6">
                💎 {drill.points_per_rep} pts/rep + 🎁 {drill.points_for_completion} bonus
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !reps || parseInt(reps) <= 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xl px-8 py-4 rounded-lg font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          )}

          {completed && drill.type === 'stopwatch' && (
            <div>
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-2xl font-bold text-white mb-4">Stopwatch Complete!</div>
              <div className="text-gray-400 mb-4">
                Time: {Math.floor(stopwatchTime / 60)}:{(stopwatchTime % 60).toString().padStart(2, '0')}
              </div>

              <div className="text-3xl font-bold text-green-400 mb-4">
                = {drill.points_for_completion} points
              </div>

              <div className="text-gray-400 text-sm mb-6">
                🎁 {drill.points_for_completion} completion bonus
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xl px-8 py-4 rounded-lg font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/drills')}
            className="text-gray-400 hover:text-white"
          >
            ← Back to Drills
          </button>
        </div>
      </div>

      {/* 67 Easter Egg Animation */}
      {show67Animation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="text-center animate-bounce">
            <div className="text-9xl font-bold text-yellow-400 mb-4">6️⃣ 7️⃣</div>
            <div className="text-4xl font-bold text-white">SIX SEVEN!</div>
            <div className="text-xl text-yellow-300 mt-2">🎰 Lucky Number! 🎰</div>
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {leveledUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-8 max-w-md border-4 border-yellow-300 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-5xl font-bold text-white mb-2">LEVEL UP!</h2>
            <div className="text-8xl font-bold text-white mb-4">{leveledUp}</div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setLeveledUp(null);
                  if (unlockedBadges.length === 0) {
                    router.push('/drills');
                  }
                }}
                className="bg-white text-yellow-600 px-8 py-3 rounded-lg font-bold text-xl hover:bg-gray-100"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  const tier = getLevelTier(leveledUp);
                  setShareData({
                    type: 'levelup',
                    title: 'LEVEL UP!',
                    level: leveledUp,
                    tierName: tier.name,
                    emoji: tier.emoji,
                    totalPoints: userProfile?.total_points || 0,
                    totalReps: stats?.total_reps || 0,
                    shareText: `I just reached Level ${leveledUp} on RepQuest! 🎉`
                  });
                  setShowShareModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-xl"
              >
                📤 Share Achievement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Unlock Modal */}
      {unlockedBadges.length > 0 && !showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md border-4 border-yellow-500">
            <h2 className="text-3xl font-bold text-yellow-400 mb-4 text-center">🎉 Badge Unlocked!</h2>
            {unlockedBadges.map(badge => (
              <div key={badge.id} className="text-center mb-4">
                <div className="text-6xl mb-2">{badge.icon}</div>
                <div className="text-xl font-bold text-white">{badge.name}</div>
                <div className="text-gray-400 text-sm">{badge.description}</div>
              </div>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => {
                  setUnlockedBadges([]);
                  if (!leveledUp) {
                    router.push('/drills');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  const badge = unlockedBadges[0];
                  setShareData({
                    type: 'badge',
                    title: 'Badge Unlocked!',
                    badgeIcon: badge.icon,
                    badgeName: badge.name,
                    badgeDescription: badge.description,
                    level: calculateLevel(userProfile?.total_points || 0),
                    totalBadges: 1,
                    shareText: `I just earned the "${badge.name}" badge on RepQuest! 🏆`
                  });
                  setShowShareModal(true);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                📤 Share Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setLeveledUp(null);
          setUnlockedBadges([]);
          router.push('/drills');
        }}
        shareData={shareData}
        teamColors={teamColors}  // Use state instead of hardcoded
        userName={userProfile?.display_name || 'Player'}
        teamName={teamName || 'Team'}
      />
    </div>
  );
}