import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
});
