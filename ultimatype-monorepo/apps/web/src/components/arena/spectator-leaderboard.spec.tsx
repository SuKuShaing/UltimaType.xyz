import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SpectatorLeaderboard } from './spectator-leaderboard';
import { arenaStore } from '../../hooks/use-arena-store';

const PLAYERS = [
  { id: 'p1', displayName: 'Alice', colorIndex: 0 },
  { id: 'p2', displayName: 'Bob', colorIndex: 1 },
  { id: 'p3', displayName: 'Carol', colorIndex: 2 },
];

const TEXT = 'abcdefghij'; // length = 10

beforeEach(() => {
  arenaStore.getState().reset();
});

describe('SpectatorLeaderboard', () => {
  it('renderiza jugadores ordenados por posición descendente', () => {
    arenaStore.getState().initArena(TEXT, PLAYERS);
    arenaStore.getState().updatePlayerPosition('p1', 7); // 70%
    arenaStore.getState().updatePlayerPosition('p2', 3); // 30%
    arenaStore.getState().updatePlayerPosition('p3', 9); // 90%

    render(<SpectatorLeaderboard />);

    const rows = screen.getAllByText(/Alice|Bob|Carol/);
    // Orden esperado: Carol (90%), Alice (70%), Bob (30%)
    expect(rows[0].textContent).toBe('Carol');
    expect(rows[1].textContent).toBe('Alice');
    expect(rows[2].textContent).toBe('Bob');
  });

  it('muestra porcentaje de progreso correcto', () => {
    arenaStore.getState().initArena(TEXT, [PLAYERS[0]]);
    arenaStore.getState().updatePlayerPosition('p1', 5); // 5/10 = 50%

    render(<SpectatorLeaderboard />);

    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('excluye jugadores desconectados del ranking', () => {
    arenaStore.getState().initArena(TEXT, PLAYERS);
    arenaStore.getState().updatePlayerPosition('p1', 8);
    arenaStore.getState().updatePlayerPosition('p2', 5);
    arenaStore.getState().markPlayerDisconnected('p1');

    render(<SpectatorLeaderboard />);

    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('no renderiza nada cuando no hay jugadores activos', () => {
    // Store vacío después de reset
    const { container } = render(<SpectatorLeaderboard />);
    expect(container.firstChild).toBeNull();
  });
});
