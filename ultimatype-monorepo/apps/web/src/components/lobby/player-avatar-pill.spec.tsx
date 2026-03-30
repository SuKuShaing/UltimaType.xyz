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

  it('no tiene bordes (no-line rule)', () => {
    render(
      <PlayerAvatarPill player={basePlayer} isHost={false} isLocal={false} />,
    );
    const pill = screen.getByTestId('player-avatar-pill');
    expect(pill.className).not.toContain('border');
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
