// pages/player.js - v0.52 SCHEMA MATCHED - removed START button from checkbox drills
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
  const [autoSubmitted, setAutoSubmitted] = useState(false); // NEW: Track if auto-submitted

  const countdownInterval = useRef(null);
  const timerInterval = useRef(null);
  const stopwatchInterval = useRef(null);
  const countdownBeep = useRef(null);
  const startBeep = useRef(null);
  const endBuzzer = useRef(null);
  const wakeLock = useRef(null);
  const hasAutoSubmitted = useRef(false); // NEW: Prevent multiple auto-submissions

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

  // NEW: Auto-submit timer drills when skip_rep_input is true
  useEffect(() => {
    if (completed && drill?.type === 'timer' && drill?.skip_rep_input && !hasAutoSubmitted.current) {
      // Auto-submit after a brief delay to show completion animation
      const timer = setTimeout(() => {
        handleSubmitNoReps();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [completed, drill?.type, drill?.skip_rep_input]);

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
          .select('name, primary_color, secondary_color')
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

  // NEW: Handle submission without reps (for skip_rep_input drills)
  const handleSubmitNoReps = async () => {
    // Double guard: check both state and ref
    if (submitting || autoSubmitted || hasAutoSubmitted.current) {
      console.log('Submission already in progress, skipping...');
      return;
    }

    console.log('Starting handleSubmitNoReps...');

    // Set all guards immediately
    hasAutoSubmitted.current = true;
    setSubmitting(true);
    setAutoSubmitted(true);

    try {
      const teamId = userProfile?.active_team_id;
      if (!teamId) throw new Error('No active team');

      const pointsEarned = drill.points_for_completion || 0;

      // Insert result with 0 reps
      const { error: resultError } = await supabase
        .from('drill_results')
        .insert({
          user_id: user.id,
          drill_id: drill.id,
          team_id: teamId,
          drill_name: drill.name,
          team_id: teamId,
          reps: 0,
          points: pointsEarned,
          points_earned: pointsEarned,
          duration_seconds: drill.type === 'stopwatch' ? stopwatchTime : null
        });

      if (resultError) {
        console.error('Supabase drill_results error:', JSON.stringify(resultError, null, 2));
        throw resultError;
      }

      // Update user stats (sessions and reps tracking)
      const { error: statsError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_reps: stats?.total_reps || 0,
          sessions_completed: (stats?.sessions_completed || 0) + 1,
          updated_at: new Date().toISOString()
        });

      if (statsError) throw statsError;

      // Update total points in users table
      const newTotalPoints = (userProfile?.total_points || 0) + pointsEarned;
      const { error: userError } = await supabase
        .from('users')
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      if (userError) throw userError;

      // Check for level up
      const oldLevel = calculateLevel(userProfile?.total_points || 0);
      const newLevel = calculateLevel(newTotalPoints);
      if (newLevel > oldLevel) {
        setLeveledUp(newLevel);
      }

      // Check for badge unlocks
      const badges = await checkBadgeUnlocks(user.id, stats?.total_reps || 0, newTotalPoints);
      if (badges.length > 0) {
        setUnlockedBadges(badges);
      }

      // Mark as completed daily if applicable
      if (drill.daily_limit) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('drill_completions_daily')
          .insert({
            user_id: user.id,
            drill_id: drill.id,
            team_id: teamId,
            completed_date: today
          });
      }

      // If no modals to show, redirect
      if (!leveledUp && badges.length === 0) {
        setTimeout(() => router.push('/drills'), 1000);
      }
    } catch (err) {
      console.error('Error submitting drill:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      console.error('Drill data:', { drill_id: drill.id, user_id: user.id, team_id: userProfile?.active_team_id });
      alert(`Failed to submit drill. Error: ${err.message || 'Unknown error'}`);
      setAutoSubmitted(false);
      hasAutoSubmitted.current = false; // Reset ref on error
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Handle different drill types
    if (drill.type === 'reps') {
      const repsValue = parseInt(reps);
      if (!reps || repsValue <= 0) {
        alert('Please enter a valid number of reps');
        return;
      }
    }

    if (drill.type === 'timer') {
      const repsValue = parseInt(reps);
      if (!reps || repsValue <= 0) {
        alert('Please enter a valid number of reps');
        return;
      }
    }

    setSubmitting(true);

    try {
      const teamId = userProfile?.active_team_id;
      if (!teamId) throw new Error('No active team');

      let pointsEarned = 0;
      let repsValue = 0;

      if (drill.type === 'reps' || drill.type === 'timer') {
        repsValue = parseInt(reps);
        pointsEarned = (repsValue * drill.points_per_rep) + drill.points_for_completion;
      } else if (drill.type === 'stopwatch') {
        pointsEarned = drill.points_for_completion;
      }

      // Check for 67 easter egg
      if (drill.type === 'reps' && repsValue === 67) {
        setShow67Animation(true);
        setTimeout(() => setShow67Animation(false), 2000);
        const easterEggResult = await check67EasterEgg(user.id);
        if (easterEggResult.unlocked) {
          setUnlockedBadges(prev => [...prev, easterEggResult.badge]);
        }
      }

      // Insert result
      const { error: resultError } = await supabase
        .from('drill_results')
        .insert({
          user_id: user.id,
          drill_id: drill.id,
          drill_name: drill.name,
          team_id: teamId,
          reps: repsValue,
          points: pointsEarned,
          points_earned: pointsEarned,
          duration_seconds: drill.type === 'stopwatch' ? stopwatchTime : null
        });

      if (resultError) throw resultError;

      // Update user stats (sessions and reps tracking)
      const newTotalReps = (stats?.total_reps || 0) + repsValue;
      const { error: statsError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_reps: newTotalReps,
          sessions_completed: (stats?.sessions_completed || 0) + 1,
          updated_at: new Date().toISOString()
        });

      if (statsError) throw statsError;

      // Update total points in users table
      const newTotalPoints = (userProfile?.total_points || 0) + pointsEarned;
      const { error: userError } = await supabase
        .from('users')
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      if (userError) throw userError;

      // Check for level up
      const oldLevel = calculateLevel(userProfile?.total_points || 0);
      const newLevel = calculateLevel(newTotalPoints);
      if (newLevel > oldLevel) {
        setLeveledUp(newLevel);
      }

      // Check for badge unlocks
      const badges = await checkBadgeUnlocks(user.id, newTotalReps, newTotalPoints);
      if (badges.length > 0) {
        setUnlockedBadges(badges);
      }

      // Mark as completed daily if applicable
      if (drill.daily_limit) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('drill_completions_daily')
          .insert({
            user_id: user.id,
            drill_id: drill.id,
            team_id: teamId,
            completed_date: today
          });
      }

      // If no modals to show, redirect
      if (!leveledUp && badges.length === 0) {
        router.push('/drills');
      }
    } catch (err) {
      console.error('Error submitting drill:', err);
      alert('Failed to submit drill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckboxSubmit = async (completed) => {
    if (!completed) {
      router.push('/drills');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const teamId = userProfile?.active_team_id;
      if (!teamId) throw new Error('No active team');

      const pointsEarned = drill.points_for_completion;

      // Insert result
      const { error: resultError } = await supabase
        .from('drill_results')
        .insert({
          user_id: user.id,
          drill_id: drill.id,
          drill_name: drill.name,
          team_id: teamId,
          reps: 0,
          points: pointsEarned,
          points_earned: pointsEarned
        });

      if (resultError) throw resultError;

      // Update user stats (sessions and reps tracking)
      const { error: statsError } = await supabase
        .from('user_stats')
        .upsert({
          user_id: user.id,
          total_reps: stats?.total_reps || 0,
          sessions_completed: (stats?.sessions_completed || 0) + 1,
          updated_at: new Date().toISOString()
        });

      if (statsError) throw statsError;

      // Update total points in users table
      const newTotalPoints = (userProfile?.total_points || 0) + pointsEarned;
      const { error: userError } = await supabase
        .from('users')
        .update({ total_points: newTotalPoints })
        .eq('id', user.id);

      if (userError) throw userError;

      // Check for level up
      const oldLevel = calculateLevel(userProfile?.total_points || 0);
      const newLevel = calculateLevel(newTotalPoints);
      if (newLevel > oldLevel) {
        setLeveledUp(newLevel);
      }

      // Check for badge unlocks
      const badges = await checkBadgeUnlocks(user.id, stats?.total_reps || 0, newTotalPoints);
      if (badges.length > 0) {
        setUnlockedBadges(badges);
      }

      // Mark as completed daily if applicable
      if (drill.daily_limit) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('drill_completions_daily')
          .insert({
            user_id: user.id,
            drill_id: drill.id,
            team_id: teamId,
            completed_date: today
          });
      }

      // If no modals to show, redirect
      if (!leveledUp && badges.length === 0) {
        router.push('/drills');
      } else {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Error submitting drill:', err);
      alert('Failed to submit drill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate points for display
  const calculatedPoints = drill?.type === 'timer' || drill?.type === 'reps'
    ? (parseInt(reps) || 0) * drill.points_per_rep + drill.points_for_completion
    : drill?.points_for_completion || 0;

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>;
  }

  if (!drill) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-white text-xl">Drill not found</div>
    </div>;
  }

  if (alreadyCompletedToday) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md text-center border border-gray-700">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-white mb-2">Already Completed</h2>
          <p className="text-gray-300 mb-6">
            You've already completed this drill today. Come back tomorrow!
          </p>
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-6 sm:p-8 border border-gray-700 min-h-[600px] flex flex-col">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{drill.name}</h1>
            {drill.description && (
              <p className="text-gray-300 text-sm sm:text-base whitespace-pre-line">{drill.description}</p>
            )}
            {drill.video_url && (
              <a
                href={drill.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-blue-400 hover:text-blue-300 underline text-sm"
              >
                🎥 Video Link
              </a>
            )}
          </div>

          {countdown > 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-9xl sm:text-[12rem] font-bold text-yellow-400 animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {!countdown && !completed && !running && drill.type !== 'check' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {drill.type === 'timer' && '⏱️'}
                  {drill.type === 'reps' && '🔢'}
                  {drill.type === 'stopwatch' && '⏱️'}
                </div>
                <div className="text-gray-300 text-lg mb-2">
                  {drill.type === 'timer' && `${drill.duration} second timer`}
                  {drill.type === 'reps' && 'Track your reps'}
                  {drill.type === 'stopwatch' && 'Track your time'}
                </div>
                {drill.type === 'timer' && drill.skip_rep_input && (
                  <div className="text-yellow-400 text-sm font-semibold">
                    🎁 Completion bonus only
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (drill.type === 'timer' || drill.type === 'stopwatch') {
                    startCountdown();
                  }
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-2xl px-12 py-6 rounded-lg font-bold shadow-lg"
              >
                START
              </button>
            </div>
          )}

          {running && drill.type === 'timer' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl sm:text-9xl font-bold text-white mb-4">
                  {timeLeft}
                </div>
                <div className="text-gray-400 text-xl">seconds remaining</div>
              </div>
            </div>
          )}

          {running && drill.type === 'stopwatch' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-8xl sm:text-9xl font-bold text-white mb-4">
                  {Math.floor(stopwatchTime / 60)}:{(stopwatchTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-gray-400 text-xl">minutes : seconds</div>
              </div>
              <button
                onClick={stopStopwatch}
                className="bg-red-600 hover:bg-red-700 text-white text-2xl px-12 py-6 rounded-lg font-bold"
              >
                STOP
              </button>
            </div>
          )}

          {!completed && drill.type === 'reps' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🔢</div>
                <div className="text-2xl font-bold text-white mb-4">How many reps?</div>
              </div>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="Enter reps"
                min="0"
                max="999999"
                className="w-full max-w-xs px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg text-white text-2xl text-center focus:outline-none focus:border-blue-500"
                autoFocus
              />

              {reps && parseInt(reps) > 0 && (
                <div className="text-3xl font-bold text-green-400">
                  = {calculatedPoints.toLocaleString()} points
                </div>
              )}

              <div className="text-gray-400 text-sm">
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
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl mb-6">✓</div>
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

          {/* Timer completed WITH rep input (default behavior) */}
          {completed && drill.type === 'timer' && !drill.skip_rep_input && !autoSubmitted && (
            <div className="flex-1 flex flex-col items-center justify-center">
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

          {/* Timer completed WITHOUT rep input (skip_rep_input = true) */}
          {completed && drill.type === 'timer' && drill.skip_rep_input && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-2xl font-bold text-white mb-4">Timer Complete!</div>
              <div className="text-3xl font-bold text-green-400 mb-4">
                +{drill.points_for_completion} points
              </div>
              <div className="text-gray-400 text-sm mb-6">
                🎁 Completion bonus
              </div>
              {submitting && (
                <div className="text-gray-400 animate-pulse">Submitting...</div>
              )}
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
        teamColors={teamColors}
        userName={userProfile?.display_name || 'Player'}
        teamName={teamName || 'Team'}
      />
    </div>
  );
}