// pages/player.js
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

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

  const countdownInterval = useRef(null);
  const timerInterval = useRef(null);
  const stopwatchInterval = useRef(null);
  const countdownBeep = useRef(null);
  const startBeep = useRef(null);
  const endBuzzer = useRef(null);

  // Initialize audio
  useEffect(() => {
    countdownBeep.current = new Audio('/sounds/beep.wav');
    startBeep.current = new Audio('/sounds/start_beep.wav');
    endBuzzer.current = new Audio('/sounds/buzzer.wav');
  }, []);

  useEffect(() => {
    if (!drillId || !user) return;
    fetchDrill();

    return () => {
      clearInterval(countdownInterval.current);
      clearInterval(timerInterval.current);
      clearInterval(stopwatchInterval.current);
    };
  }, [drillId, user]);

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
      await checkDailyCompletion(data);
    } catch (err) {
      console.error('Error fetching drill:', err);
      alert('Failed to load drill');
    } finally {
      setLoading(false);
    }
  };
  const checkDailyCompletion = async (drillData) => {
    if (!drillData.daily_limit) {
      setAlreadyCompletedToday(false);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('drill_completions_daily')
        .select('*')
        .eq('user_id', user.id)
        .eq('drill_id', drillData.id)
        .eq('completed_date', today)
        .maybeSingle();
      if (error) throw error;
      setAlreadyCompletedToday(!!data);
    } catch (err) {
      console.error('Error checking daily completion:', err);
      setAlreadyCompletedToday(false);
    }
  };

  const playSound = (audioRef) => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
        console.log('Trying to play:', audioRef.current.src);
      });
    } else {
      console.log('Audio ref not initialized');
    }
  };

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    playSound(countdownBeep);

    countdownInterval.current = setInterval(() => {
      count--;
      setCountdown(count);

      if (count > 0) {
        playSound(countdownBeep);
      } else {
        clearInterval(countdownInterval.current);
        playSound(startBeep);
        
        if (drill.type === 'timer') {
          startTimer();
        } else if (drill.type === 'stopwatch') {
          startStopwatch();
        } else {
          setRunning(true);
        }
      }
    }, 1000);
  };

  const startTimer = () => {
    const endTime = Date.now() + drill.duration * 1000;
    setTimeLeft(drill.duration);
    setRunning(true);

    timerInterval.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(left);

      if (left <= 0) {
        clearInterval(timerInterval.current);
        playSound(endBuzzer);
        setRunning(false);
        setCompleted(true);
      }
    }, 100);
  };

  const stopDrill = () => {
    clearInterval(timerInterval.current);
    playSound(endBuzzer);
    setRunning(false);
    setCompleted(true);
  };

  const startStopwatch = () => {
    const startTime = Date.now();
    setStopwatchTime(0);
    setRunning(true);

    stopwatchInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setStopwatchTime(elapsed);
    }, 100);
  };

  const stopStopwatch = () => {
    clearInterval(stopwatchInterval.current);
    playSound(endBuzzer);
    setRunning(false);
    setCompleted(true);
  };

  const startDrillImmediate = () => {
    playSound(startBeep);
    setRunning(true);
    setCompleted(false);
  };

// UPDATED handleSubmit function for pages/player.js
// Replace the existing handleSubmit function (around line 157) with this:

const handleSubmit = async () => {
  const repsCount = parseInt(reps) || 0;
  
if (repsCount < 0) {
      alert('Reps must be a positive number');
      return;
    }

    if (alreadyCompletedToday) {
      alert('⏰ You already completed this drill today! Come back tomorrow!');
      return;
    }

    setSubmitting(true);

  try {
    const repPoints = repsCount * (drill.points_per_rep || 0);
    const bonusPoints = drill.points_for_completion || 0;
    const totalPoints = repPoints + bonusPoints;

    // Insert drill result
    const { error: resultError } = await supabase
      .from('drill_results')
      .insert({
        user_id: user.id,
        drill_id: drill.id,
        drill_name: drill.name,
        reps: repsCount,
        points: totalPoints,
        timestamp: new Date().toISOString()
      });

    if (resultError) throw resultError;

    // Record daily completion if daily limit is enabled
    if (drill.daily_limit) {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('drill_completions_daily')
        .insert({
          user_id: user.id,
          drill_id: drill.id,
          team_id: userProfile?.selected_team_id || null,
          completed_date: today
        });
    }

    // Update user's total points
    const { error: updateError } = await supabase.rpc('increment_user_points', {
      user_id: user.id,
      points_to_add: totalPoints
    });

    // If RPC doesn't exist, fall back to manual update
    if (updateError) {
      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', user.id)
        .single();

      await supabase
        .from('users')
        .update({ total_points: (userData.total_points || 0) + totalPoints })
        .eq('id', user.id);
    }

    alert(`Great job! You earned ${totalPoints} points! 🎉`);
    router.push('/drills');
  } catch (err) {
    console.error('Error submitting result:', err);
    alert('Failed to save result');
  } finally {
    setSubmitting(false);
  }
};


  if (loading) {
    return <div className="p-6 text-white">Loading drill...</div>;
  }

  if (!drill) {
    return <div className="p-6 text-white">Drill not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{drill.name}</h1>
          {drill.description && (
            <p className="text-gray-400">{drill.description}</p>
          )}
        </div>

        {countdown > 0 && (
          <div className="text-center">
            <div className="text-9xl font-bold text-blue-400 mb-4">
              {countdown}
            </div>
            <p className="text-gray-400 text-xl">Get ready...</p>
          </div>
        )}

        {running && drill.type === 'timer' && (
          <div className="text-center">
            <div className="text-9xl font-bold text-white mb-4">
              {timeLeft}
            </div>
            <p className="text-gray-400 text-xl mb-6">seconds remaining</p>
            <button
              onClick={stopDrill}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Stop Early
            </button>
          </div>
        )}

        {running && drill.type === 'stopwatch' && (
          <div className="text-center">
            <div className="text-9xl font-bold text-white mb-4">
              {Math.floor(stopwatchTime / 60)}:{(stopwatchTime % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-gray-400 text-xl mb-6">minutes:seconds</p>
            <button
              onClick={stopStopwatch}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Stop
            </button>
          </div>
        )}

        {!running && !completed && countdown === 0 && (
          <div className="text-center">
            {drill.type === 'timer' ? (
              <button
                onClick={startCountdown}
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-lg text-xl font-bold transition"
              >
                Start Drill
              </button>
            ) : drill.type === 'stopwatch' ? (
              <button
                onClick={startCountdown}
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-lg text-xl font-bold transition"
              >
                Start Stopwatch
              </button>
            ) : drill.type === 'check' ? (
              <div className="space-y-4">
                <label className="block text-gray-300 text-lg mb-3 text-center">
                  Did you complete this drill?
                </label>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={async () => {
                      setReps('1');
                      setSubmitting(true);
                      try {
                        const totalPoints = drill.points_for_completion || 0;
                        
                        await supabase.from('drill_results').insert({
                          user_id: user.id,
                          drill_id: drill.id,
                          drill_name: drill.name,
                          reps: 1,
                          points: totalPoints,
                          timestamp: new Date().toISOString()
                        });
                        
                        const { data: userData } = await supabase
                          .from('users')
                          .select('total_points')
                          .eq('id', user.id)
                          .single();

                        await supabase
                          .from('users')
                          .update({ total_points: (userData.total_points || 0) + totalPoints })
                          .eq('id', user.id);
                        
                        alert(`Great job! You earned ${totalPoints} points! 🎉`);
                        router.push('/drills');
                      } catch (err) {
                        console.error('Error submitting result:', err);
                        alert('Failed to save result');
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="px-12 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xl rounded-lg font-bold transition"
                  >
                    ✓ Yes
                  </button>
                  <button
                    onClick={() => router.push('/drills')}
                    className="px-12 py-4 bg-gray-700 hover:bg-gray-600 text-white text-xl rounded-lg font-bold transition"
                  >
                    ✗ No
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-gray-300 text-lg mb-3 text-center">
                  How many reps did you complete?
                </label>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="0"
                  min="0"
                  autoFocus
                  className="w-full px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg text-white text-3xl text-center focus:outline-none focus:border-blue-500"
                />
                {reps && (
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-gray-400 text-sm mb-1">You'll earn:</div>
                    <div className="text-2xl font-bold text-green-400">
                      {(parseInt(reps) || 0) * (drill.points_per_rep || 0) + (drill.points_for_completion || 0)} points
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      ({parseInt(reps) || 0} reps × {drill.points_per_rep} + {drill.points_for_completion} bonus)
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!reps || submitting || alreadyCompletedToday}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg text-lg transition"
                  >
                    {alreadyCompletedToday ? '✓ Completed Today - Come Back Tomorrow' : submitting ? 'Submitting...' : 'Submit Result'}
                  </button>
                  <button
                    onClick={() => router.push('/drills')}
                    className="px-8 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(completed || (running && drill.type !== 'timer' && drill.type !== 'stopwatch')) && (
          <div className="space-y-4">
            {drill.type === 'stopwatch' ? (
              <div className="text-center">
                <div className="bg-gray-700 rounded-lg p-6 mb-4">
                  <div className="text-gray-400 text-sm mb-2">Your Time:</div>
                  <div className="text-5xl font-bold text-white mb-1">
                    {Math.floor(stopwatchTime / 60)}:{(stopwatchTime % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-gray-400 text-sm">minutes:seconds</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center mb-4">
                  <div className="text-gray-400 text-sm mb-1">You'll earn:</div>
                  <div className="text-2xl font-bold text-green-400">
                    {drill.points_for_completion || 0} points
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    (completion bonus)
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        const totalPoints = drill.points_for_completion || 0;
                        
                        await supabase.from('drill_results').insert({
                          user_id: user.id,
                          drill_id: drill.id,
                          drill_name: drill.name,
                          reps: 0,
                          time: stopwatchTime,
                          points: totalPoints,
                          timestamp: new Date().toISOString()
                        });
                        
                        const { data: userData } = await supabase
                          .from('users')
                          .select('total_points')
                          .eq('id', user.id)
                          .single();

                        await supabase
                          .from('users')
                          .update({ total_points: (userData.total_points || 0) + totalPoints })
                          .eq('id', user.id);
                        
                        alert(`Great job! You earned ${totalPoints} points! 🎉`);
                        router.push('/drills');
                      } catch (err) {
                        console.error('Error submitting result:', err);
                        alert('Failed to save result');
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting || alreadyCompletedToday}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-4 rounded-lg text-lg transition"
                  >
                    {alreadyCompletedToday ? '✓ Completed Today - Come Back Tomorrow' : submitting ? 'Submitting...' : 'Submit Result'}
                  </button>
                  <button
                    onClick={() => router.push('/drills')}
                    className="px-8 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-gray-300 text-lg mb-3 text-center">
                    How many reps did you complete?
                  </label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="0"
                    min="0"
                    autoFocus
                    className="w-full px-6 py-4 bg-gray-700 border border-gray-600 rounded-lg text-white text-3xl text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                {reps && (
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-gray-400 text-sm mb-1">You'll earn:</div>
                    <div className="text-2xl font-bold text-green-400">
                      {(parseInt(reps) || 0) * (drill.points_per_rep || 0) + (drill.points_for_completion || 0)} points
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      ({parseInt(reps) || 0} reps × {drill.points_per_rep} + {drill.points_for_completion} bonus)
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!reps || submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg text-lg transition"
                  >
                    {alreadyCompletedToday ? '✓ Completed Today - Come Back Tomorrow' : submitting ? 'Submitting...' : 'Submit Result'}
                  </button>
                  <button
                    onClick={() => router.push('/drills')}
                    className="px-8 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}