import { PlayerInfo, PLAYER_COLORS } from '@ultimatype-monorepo/shared';
import { CountryFlag } from '../ui/country-flag';

interface PlayerAvatarPillProps {
  player: PlayerInfo;
  isHost: boolean;
  isLocal: boolean;
}

export function PlayerAvatarPill({
  player,
  isHost,
  isLocal,
}: PlayerAvatarPillProps) {
  const color = PLAYER_COLORS[player.colorIndex] ?? PLAYER_COLORS[0];
  const initials = player.displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-surface-raised px-4 py-3"
      data-testid="player-avatar-pill"
    >
      {/* Color indicator */}
      <div
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Avatar */}
      {player.avatarUrl ? (
        <img
          src={player.avatarUrl}
          alt={player.displayName}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-surface-base"
          style={{ backgroundColor: color }}
        >
          {initials}
        </div>
      )}

      {/* Name and badges */}
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        {player.countryCode && (
          <span className="shrink-0">
            <CountryFlag countryCode={player.countryCode} size={16} />
          </span>
        )}
        <span
          className={`truncate text-sm font-medium ${isLocal ? 'text-primary' : 'text-text-main'}`}
        >
          {player.displayName}
        </span>
        {isHost && (
          <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">
            Host
          </span>
        )}
      </div>

      {/* Ready state */}
      <span
        className={`shrink-0 text-xs font-semibold ${player.isReady ? 'text-success' : 'text-text-muted'}`}
      >
        {player.isReady ? 'Listo' : 'Esperando'}
      </span>
    </div>
  );
}
