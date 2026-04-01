import { useEffect, useRef, useState } from 'react';
import { arenaStore } from '../../hooks/use-arena-store';

interface MatchCountdownTimerProps {
  matchStatus: 'countdown' | 'playing' | 'finished';
}

type Phase = 'normal' | 'warning' | 'critical';

function getPhase(seconds: number): Phase {
  if (seconds <= 5) return 'critical';
  if (seconds <= 10) return 'warning';
  return 'normal';
}

export function MatchCountdownTimer({ matchStatus }: MatchCountdownTimerProps) {
  const { timeLimit } = arenaStore.getState();
  const totalSeconds = Math.ceil(timeLimit / 1000);
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (matchStatus !== 'playing') {
      setRemaining(totalSeconds);
      return;
    }

    intervalRef.current = setInterval(() => {
      const { matchStartTime } = arenaStore.getState();
      if (!matchStartTime) return;

      const elapsedMs = Date.now() - matchStartTime;
      const left = Math.max(0, Math.ceil((timeLimit - elapsedMs) / 1000));
      setRemaining(left);

      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matchStatus, timeLimit, totalSeconds]);

  if (timeLimit <= 0) return null;

  const phase = getPhase(remaining);
  const opacity = matchStatus === 'playing' ? 0.5 : 1;

  return (
    <div
      className="flex flex-col items-center"
      style={{ opacity, transition: 'opacity 0.5s ease' }}
    >
      <div className="relative h-[4.5rem] w-16 overflow-hidden">
        <span
          key={remaining}
          className={`match-timer-digit absolute inset-0 flex items-center justify-center font-sans text-6xl font-bold ${
            phase === 'critical'
              ? 'match-timer-critical text-error'
              : phase === 'warning'
                ? 'match-timer-warning text-primary'
                : 'text-text-muted'
          }`}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
}
