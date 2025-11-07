// components/Timer.js
import { useState, useEffect } from 'react';

export default function Timer({ duration = 60, onFinish }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let timer;
    if (running && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (running && timeLeft === 0) {
      setRunning(false);
      onFinish && onFinish();
    }
    return () => clearTimeout(timer);
  }, [running, timeLeft, onFinish]);

  return (
    <div className="mb-4">
      <div className="text-3xl font-bold">{timeLeft}s</div>
      <button
        onClick={() => {
          setRunning(!running);
          if (!running) setTimeLeft(duration);
        }}
        className="bg-green-500 text-white px-4 py-2 mt-2"
      >
        {running ? 'Stop' : 'Start'}
      </button>
    </div>
  );
}
