import { useState, useEffect } from 'react';
import { useArenaStore } from '../../hooks/use-arena-store';
import { PLAYER_COLORS } from '@ultimatype-monorepo/shared';

export function SpectatorLeaderboard() {
  const players = useArenaStore((s) => s.players);
  const textLength = useArenaStore((s) => s.textContent.length);
  const matchStartTime = useArenaStore((s) => s.matchStartTime);
  const [now, setNow] = useState(Date.now());

  // Tick every second to update WPM estimates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sorted = Object.entries(players)
    .filter(([, p]) => !p.disconnected)
    .sort(([, a], [, b]) => b.position - a.position);

  if (sorted.length === 0) return null;

  const elapsedMinutes = matchStartTime ? Math.max((now - matchStartTime) / 60_000, 0.01) : 0;

  return (
    <div className="mb-4 w-full max-w-3xl rounded-xl bg-surface-raised px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold text-text-muted">Clasificación en vivo</h3>
      <div className="flex flex-col gap-1.5">
        {sorted.map(([id, player], index) => {
          const progress = textLength > 0 ? Math.min(Math.round((player.position / textLength) * 100), 100) : 0;
          const estimatedWpm = elapsedMinutes > 0 ? Math.min(Math.round(((player.position ?? 0) / 5) / elapsedMinutes), 500) : 0;
          const color = PLAYER_COLORS[player.colorIndex] ?? PLAYER_COLORS[0];
          return (
            <div key={id} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-right text-xs text-text-muted">{index + 1}</span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="flex-1 truncate text-xs text-text-main">{player.displayName}</span>
              <span className="w-12 shrink-0 text-right text-xs font-medium text-text-main">{estimatedWpm} wpm</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-base">
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{ width: `${progress}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-text-muted">{progress}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
