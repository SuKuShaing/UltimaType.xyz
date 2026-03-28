import { useState, useEffect, useRef } from 'react';

const LABELS: Record<number, string> = { 3: '3', 2: '2', 1: '1', 0: '¡YA!' };

interface CountdownOverlayProps {
  onCountdownEnd: () => void;
}

export function CountdownOverlay({ onCountdownEnd }: CountdownOverlayProps) {
  const [tick, setTick] = useState(3);
  const onCountdownEndRef = useRef(onCountdownEnd);
  onCountdownEndRef.current = onCountdownEnd;

  useEffect(() => {
    let endTimeout: ReturnType<typeof setTimeout> | null = null;

    const id = setInterval(() => {
      setTick((prev) => {
        if (prev <= 0) return prev;
        const next = prev - 1;
        if (next === 0) {
          clearInterval(id);
          // Schedule end callback after "¡YA!" is visible briefly
          endTimeout = setTimeout(() => onCountdownEndRef.current(), 400);
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(id);
      if (endTimeout !== null) clearTimeout(endTimeout);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-base/80 backdrop-blur-sm">
      <span className="text-9xl font-bold text-primary">{LABELS[tick]}</span>
    </div>
  );
}
