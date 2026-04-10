import { render, act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArenaPage } from './arena-page';
import { arenaStore } from '../../hooks/use-arena-store';
import { MatchStartPayload } from '@ultimatype-monorepo/shared';

vi.mock('../../lib/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
  })),
}));

vi.mock('../../hooks/use-caret-sync', () => ({
  useCaretSync: vi.fn(() => ({ emitCaretUpdate: vi.fn() })),
}));

const MATCH_DATA: MatchStartPayload = {
  code: 'ABC123',
  textId: 1,
  textContent: 'Hello world',
  players: [
    { id: 'u1', displayName: 'Alice', colorIndex: 0, isReady: true, disconnected: false, avatarUrl: null },
  ],
};

const LOCAL_USER_ID = 'u1';

beforeEach(() => {
  arenaStore.getState().reset();
  document.body.classList.remove('arena-active');
});

afterEach(() => {
  document.body.classList.remove('arena-active');
});

describe('ArenaPage — Focus Fade para espectadores', () => {
  it('NO agrega arena-active al body cuando isSpectator=true durante playing', async () => {
    render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={true}
      />,
    );

    // Trigger playing state
    await act(async () => {
      arenaStore.getState().setMatchStarted();
    });

    expect(document.body.classList.contains('arena-active')).toBe(false);
  });

  it('agrega arena-active al body cuando isSpectator=false (jugador normal) durante playing', async () => {
    render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={false}
      />,
    );

    await act(async () => {
      arenaStore.getState().setMatchStarted();
    });

    expect(document.body.classList.contains('arena-active')).toBe(true);
  });

  it('NO renderiza FocusWPMCounter cuando isSpectator=true', () => {
    const { container } = render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={true}
      />,
    );

    const wpmEl = container.querySelector('[data-wpm]');
    expect(wpmEl).toBeNull();
  });

  it('NO renderiza SpectatorLeaderboard cuando matchStatus es countdown', () => {
    render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={true}
      />,
    );

    // matchStatus === 'countdown' — leaderboard solo aparece en 'playing'
    expect(screen.queryByText('Clasificación en vivo')).toBeNull();
  });

  it('renderiza FocusWPMCounter cuando isSpectator=false', () => {
    const { container } = render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={false}
      />,
    );

    const wpmEl = container.querySelector('[data-wpm]');
    expect(wpmEl).toBeTruthy();
  });
});

describe('ArenaPage — Botón DETENER', () => {
  it('muestra botón SALIR con rounded-full y bg-error durante playing', async () => {
    const { container } = render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={false}
      />,
    );

    await act(async () => {
      arenaStore.getState().setMatchStarted();
    });

    const btn = container.querySelector('[aria-label="Salir de la partida"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.classList.contains('rounded-full')).toBe(true);
    expect(btn.classList.contains('bg-error/15')).toBe(true);
  });

  it('botón SALIR contiene icono logout de Material Symbols', async () => {
    const { container } = render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={false}
      />,
    );

    await act(async () => {
      arenaStore.getState().setMatchStarted();
    });

    const icon = container.querySelector('[aria-label="Salir de la partida"] .material-symbols-outlined') as HTMLElement;
    expect(icon).toBeTruthy();
    expect(icon.textContent).toBe('logout');
  });

  it('NO muestra botón SALIR cuando isSpectator=true', async () => {
    const { container } = render(
      <ArenaPage
        matchData={MATCH_DATA}
        localUserId={LOCAL_USER_ID}
        isSpectator={true}
      />,
    );

    await act(async () => {
      arenaStore.getState().setMatchStarted();
    });

    const btn = container.querySelector('[aria-label="Salir de la partida"]');
    expect(btn).toBeNull();
  });
});
