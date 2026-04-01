import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MultiplayerCaret } from './multiplayer-caret';
import { arenaStore } from '../../hooks/use-arena-store';
import { PLAYER_COLORS } from '@ultimatype-monorepo/shared';
import { createRef } from 'react';

describe('MultiplayerCaret', () => {
  beforeEach(() => {
    arenaStore.getState().reset();
    arenaStore.getState().initArena('Hola mundo', [
      { id: 'player-1', displayName: 'Alice', colorIndex: 1 },
      { id: 'player-2', displayName: 'Bob', colorIndex: 3 },
    ]);
  });

  it('renderiza una barra vertical con el color del jugador', () => {
    const containerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={containerRef}>
        <MultiplayerCaret playerId="player-1" containerRef={containerRef} />
      </div>,
    );

    const caret = container.querySelector('div[style*="width: 2px"]') as HTMLElement;
    expect(caret).toBeTruthy();
    // jsdom converts hex to rgb
    expect(caret.style.backgroundColor).toBeTruthy();
    expect(caret.style.height).toBe('1.2em');
  });

  it('muestra el nombre del jugador encima del caret', () => {
    const containerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={containerRef}>
        <MultiplayerCaret playerId="player-1" containerRef={containerRef} />
      </div>,
    );

    expect(container.textContent).toContain('Alice');
  });

  it('usa el color correcto para cada jugador diferente', () => {
    const containerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={containerRef}>
        <MultiplayerCaret playerId="player-2" containerRef={containerRef} />
      </div>,
    );

    const caret = container.querySelector('div[style*="width: 2px"]') as HTMLElement;
    expect(caret.style.backgroundColor).toBeTruthy();
    expect(container.textContent).toContain('Bob');
  });

  it('aplica opacidad reducida y animate-pulse cuando el jugador esta desconectado', () => {
    arenaStore.getState().markPlayerDisconnected('player-1');

    const containerRef = createRef<HTMLDivElement>();
    const { container } = render(
      <div ref={containerRef}>
        <MultiplayerCaret playerId="player-1" containerRef={containerRef} />
      </div>,
    );

    const caret = container.querySelector('div[style*="width: 2px"]') as HTMLElement;
    expect(caret.style.opacity).toBe('0.4');
    expect(caret.className).toContain('animate-pulse');
  });

  it('muestra el label (desconectado) cuando el jugador esta desconectado', () => {
    arenaStore.getState().markPlayerDisconnected('player-1');

    const containerRef = createRef<HTMLDivElement>();
    const { getByTestId } = render(
      <div ref={containerRef}>
        <MultiplayerCaret playerId="player-1" containerRef={containerRef} />
      </div>,
    );

    const label = getByTestId('disconnected-label-player-1') as HTMLElement;
    expect(label.style.display).not.toBe('none');
    expect(label.textContent).toContain('desconectado');
  });

  it('actualiza visuals cuando el jugador reconecta (store update)', () => {
    arenaStore.getState().markPlayerDisconnected('player-1');

    const containerRef = createRef<HTMLDivElement>();
    const { container, getByTestId } = render(
      <div ref={containerRef}>
        <MultiplayerCaret playerId="player-1" containerRef={containerRef} />
      </div>,
    );

    act(() => {
      arenaStore.getState().markPlayerReconnected('player-1');
    });

    const caret = container.querySelector('div[style*="width: 2px"]') as HTMLElement;
    expect(caret.style.opacity).toBe('0.65');
    expect(caret.className).not.toContain('animate-pulse');

    const label = getByTestId('disconnected-label-player-1') as HTMLElement;
    expect(label.style.display).toBe('none');
  });
});
