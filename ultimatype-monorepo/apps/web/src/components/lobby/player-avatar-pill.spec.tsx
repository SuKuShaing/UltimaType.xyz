import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayerAvatarPill } from './player-avatar-pill';
import { PlayerInfo } from '@ultimatype-monorepo/shared';

describe('PlayerAvatarPill', () => {
  const basePlayer: PlayerInfo = {
    id: 'user-1',
    displayName: 'Test Player',
    avatarUrl: null,
    colorIndex: 0,
    isReady: false,
    disconnected: false,
  };

  it('renderiza el nombre del jugador', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    expect(screen.getByText('Test Player')).toBeTruthy();
  });

  it('muestra iniciales cuando no hay avatar URL', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    expect(screen.getByText('TP')).toBeTruthy();
  });

  it('muestra imagen cuando hay avatar URL', () => {
    const playerWithAvatar = {
      ...basePlayer,
      avatarUrl: 'https://example.com/avatar.png',
    };
    render(
      <PlayerAvatarPill
        player={playerWithAvatar}
        isHost={false}
        isLocal={false}
      />,
    );
    const img = screen.getByAltText('Test Player');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.png');
  });

  it('muestra badge Host cuando isHost es true', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={true} isLocal={false} />,
    );
    expect(screen.getByText('Host')).toBeTruthy();
  });

  it('no muestra badge Host cuando isHost es false', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    expect(screen.queryByText('Host')).toBeNull();
  });

  it('muestra Listo cuando el jugador esta listo', () => {
    const readyPlayer = { ...basePlayer, isReady: true };
    render(
      <PlayerAvatarPill player={readyPlayer} isHost={false} isLocal={false} />,
    );
    expect(screen.getByText('Listo')).toBeTruthy();
  });

  it('muestra Esperando cuando el jugador no esta listo', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    expect(screen.getByText('Esperando')).toBeTruthy();
  });

  it('usa border-l como indicador de color de jugador (excepcion no-line rule)', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    const pill = screen.getByTestId('player-avatar-pill');
    expect(pill.classList.contains('border-l-[3px]')).toBe(true);
    // No debe tener border-b, border-t, border-r (no-line rule)
    expect(pill.className).not.toContain('border-b');
    expect(pill.className).not.toContain('border-t');
    expect(pill.className).not.toContain('border-r');
  });

  it('muestra Saliendo y aplica grayscale cuando el jugador esta desconectado', () => {
    const disconnectedPlayer = { ...basePlayer, disconnected: true };
    render(
      <PlayerAvatarPill player={disconnectedPlayer} isHost={false} isLocal={false} />,
    );
    expect(screen.getByText('Saliendo...')).toBeTruthy();
    const pill = screen.getByTestId('player-avatar-pill');
    expect(pill.className).toContain('grayscale');
    expect(pill.className).toContain('opacity-50');
  });

  it('muestra iniciales como fallback cuando la imagen falla al cargar', () => {
    const playerWithAvatar = { ...basePlayer, avatarUrl: 'https://example.com/broken.png' };
    render(
      <PlayerAvatarPill player={playerWithAvatar} isHost={false} isLocal={false} />,
    );
    const img = screen.getByAltText('Test Player');
    fireEvent.error(img);
    expect(screen.getByText('TP')).toBeTruthy();
  });

  it('usa design system tokens: rounded-card y bg-surface-container-lowest', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    const pill = screen.getByTestId('player-avatar-pill');
    expect(pill.classList.contains('rounded-card')).toBe(true);
    expect(pill.classList.contains('bg-surface-container-lowest')).toBe(true);
  });

  it('aplica borderLeftColor con el color del jugador', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    const pill = screen.getByTestId('player-avatar-pill');
    expect(pill.style.borderLeftColor).toBeTruthy();
  });

  it('aplica borderLeftColor distinto cuando esta desconectado', () => {
    // Connected player uses PLAYER_COLORS[colorIndex] as borderLeftColor
    const { unmount } = render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    const connectedPill = screen.getByTestId('player-avatar-pill');
    const connectedColor = connectedPill.style.borderLeftColor;
    expect(connectedColor).toBeTruthy();
    unmount();

    // Disconnected player uses var(--color-text-muted) — jsdom can't resolve
    // CSS custom properties, so borderLeftColor is empty. We verify it differs
    // from the connected color (production uses the design token).
    const disconnectedPlayer = { ...basePlayer, disconnected: true };
    render(
      <PlayerAvatarPill player={disconnectedPlayer} isHost={false} isLocal={false} />,
    );
    const disconnectedPill = screen.getByTestId('player-avatar-pill');
    expect(disconnectedPill.style.borderLeftColor).not.toBe(connectedColor);
  });

  it('renderiza menuContent cuando se proporciona', () => {
    render(
      <PlayerAvatarPill
        player={basePlayer}
        isHost={false}
        isLocal={false}
        menuContent={<button>Opciones</button>}
      />,
    );
    expect(screen.getByText('Opciones')).toBeTruthy();
  });
});
