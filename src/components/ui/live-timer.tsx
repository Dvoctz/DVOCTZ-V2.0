import { useState, useEffect } from "react";

export type TimerState = {
  isRunning: boolean;
  startedAt: number | null;
  elapsedBeforeStart: number;
};

export function LiveTimer({ timerState, className = "" }: { timerState?: TimerState; className?: string }) {
  const [totalMs, setTotalMs] = useState(0);

  useEffect(() => {
    if (!timerState) {
      setTotalMs(0);
      return;
    }

    const computeTime = () => {
      let current = typeof timerState.elapsedBeforeStart === 'number' ? timerState.elapsedBeforeStart : 0;
      if (timerState.isRunning && timerState.startedAt) {
        current += Date.now() - timerState.startedAt;
      }
      return Math.max(0, current); // Ensure non-negative
    };

    setTotalMs(computeTime());

    if (timerState.isRunning) {
      const interval = setInterval(() => {
        setTotalMs(computeTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerState]);

  const totalSeconds = Math.floor(totalMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const display = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  return <span className={className}>{display}</span>;
}
