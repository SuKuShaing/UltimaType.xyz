import { useRef, useEffect } from 'react';
import { arenaStore } from '../../hooks/use-arena-store';

interface FocusWPMCounterProps {
  matchStatus: 'countdown' | 'playing' | 'finished';
}

export function FocusWPMCounter({ matchStatus }: FocusWPMCounterProps) {
  const wpmRef = useRef<HTMLSpanElement>(null);
  const errorRef = useRef<HTMLSpanElement>(null);

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

      const error =
        totalKeystrokes > 0
          ? Math.round((errorKeystrokes / totalKeystrokes) * 100)
          : 0;

      if (wpmRef.current) wpmRef.current.textContent = String(wpm);
      if (errorRef.current) errorRef.current.textContent = `${error}%`;
    }, 200);

    return () => clearInterval(id);
  }, [matchStatus]);

  const opacity = matchStatus === 'playing' ? 0.5 : 1;

  return (
    <div
      className="mb-6 flex items-center justify-center gap-4"
      style={{ opacity, transition: 'opacity 0.5s ease' }}
    >
      {/* PPM Badge */}
      <div className="flex flex-col items-center rounded-3xl bg-surface-container-lowest px-12 py-6">
        <span
          ref={wpmRef}
          data-wpm
          className="font-sans text-6xl font-bold leading-none text-primary"
        >
          0
        </span>
        <span className="mt-1.5 text-sm font-semibold uppercase tracking-wider text-text-muted">
          PPM
        </span>
      </div>

      {/* Error Badge */}
      <div className="flex flex-col items-center rounded-3xl bg-surface-container-lowest px-12 py-6">
        <span
          ref={errorRef}
          data-error
          className="font-sans text-6xl font-bold leading-none text-primary"
        >
          0%
        </span>
        <span className="mt-1.5 text-sm font-semibold uppercase tracking-wider text-text-muted">
          ERROR
        </span>
      </div>
    </div>
  );
}
