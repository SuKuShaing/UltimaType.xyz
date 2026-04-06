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

function phaseClass(phase: Phase): string {
  if (phase === 'critical') return 'match-timer-critical text-error';
  if (phase === 'warning') return 'match-timer-warning text-primary';
  return 'text-text-muted';
}

export function MatchCountdownTimer({ matchStatus }: MatchCountdownTimerProps) {
  const { timeLimit } = arenaStore.getState();
  const totalSeconds = Math.ceil(timeLimit / 1000);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [prev, setPrev] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (matchStatus !== 'playing') {
      setRemaining(totalSeconds);
      setPrev(null);
      return;
    }

    intervalRef.current = setInterval(() => {
      const { matchStartTime } = arenaStore.getState();
      if (!matchStartTime) return;

      const elapsedMs = Date.now() - matchStartTime;
      const left = Math.max(0, Math.ceil((timeLimit - elapsedMs) / 1000));
      setRemaining((cur) => {
        if (cur !== left) setPrev(cur);
        return left;
      });

      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matchStatus, timeLimit, totalSeconds]);

  // Clear prev after exit animation completes
  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), 400);
    return () => clearTimeout(t);
  }, [prev]);

  if (timeLimit <= 0) return null;

  const phase = getPhase(remaining);
  const opacity = matchStatus === 'playing' ? 0.5 : 1;

  return (
    <div
      className="flex flex-col items-center"
      style={{ opacity, transition: 'opacity 0.5s ease' }}
    >
      <div className="relative h-[4.5rem] w-28 overflow-hidden">
        {/* Outgoing number — slides down and fades out */}
        {prev !== null && (
          <span
            key={`out-${prev}`}
            className={`match-timer-exit absolute inset-0 flex items-center justify-center font-sans text-6xl font-bold ${phaseClass(getPhase(prev))}`}
          >
            {prev}
          </span>
        )}
        {/* Incoming number — slides in from top */}
        <span
          key={remaining}
          className={`match-timer-enter absolute inset-0 flex items-center justify-center font-sans text-6xl font-bold ${phaseClass(phase)}`}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
}
