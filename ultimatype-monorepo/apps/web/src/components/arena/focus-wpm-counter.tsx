import { useRef, useEffect } from 'react';
import { arenaStore } from '../../hooks/use-arena-store';

interface FocusWPMCounterProps {
  matchStatus: 'countdown' | 'playing' | 'finished';
}

export function FocusWPMCounter({ matchStatus }: FocusWPMCounterProps) {
  const wpmRef = useRef<HTMLSpanElement>(null);
  const precisionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (matchStatus !== 'playing') return;

    const id = setInterval(() => {
      const { localPosition, matchStartTime, totalKeystrokes, errorKeystrokes } =
        arenaStore.getState();

      const elapsedMinutes = matchStartTime
        ? (Date.now() - matchStartTime) / 60_000
        : 0;

      const wpm =
        elapsedMinutes > 0 ? Math.round((localPosition / 5) / elapsedMinutes) : 0;

      const precision =
        totalKeystrokes > 0
          ? Math.round(((totalKeystrokes - errorKeystrokes) / totalKeystrokes) * 100)
          : 100;

      if (wpmRef.current) wpmRef.current.textContent = String(wpm);
      if (precisionRef.current) precisionRef.current.textContent = `${precision}%`;
    }, 200);

    return () => clearInterval(id);
  }, [matchStatus]);

  const opacity = matchStatus === 'playing' ? 0.5 : 1;

  return (
    <div
      className="mb-6 flex flex-col items-center gap-1"
      style={{ opacity, transition: 'opacity 0.5s ease' }}
    >
      <span
        ref={wpmRef}
        data-wpm
        className="font-sans text-7xl font-bold text-primary"
      >
        0
      </span>
      <span className="font-sans text-base text-text-muted">WPM</span>
      <span
        ref={precisionRef}
        data-precision
        className="font-sans text-xl text-text-muted"
      >
        100%
      </span>
    </div>
  );
}
