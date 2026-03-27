import { describe, it, expect, beforeEach } from 'vitest';
import { arenaStore } from './use-arena-store';

describe('arenaStore', () => {
  beforeEach(() => {
    arenaStore.getState().reset();
  });

  it('inicializa con estado vacio', () => {
    const state = arenaStore.getState();
    expect(state.textContent).toBe('');
    expect(state.players).toEqual({});
    expect(state.localPosition).toBe(0);
    expect(state.matchStatus).toBe('countdown');
  });

  it('initArena configura texto, jugadores y status playing', () => {
    arenaStore.getState().initArena('Test text', [
      { id: 'p1', displayName: 'Alice', colorIndex: 1 },
      { id: 'p2', displayName: 'Bob', colorIndex: 3 },
    ]);

    const state = arenaStore.getState();
    expect(state.textContent).toBe('Test text');
    expect(state.matchStatus).toBe('playing');
    expect(state.players['p1']).toEqual({ position: 0, displayName: 'Alice', colorIndex: 1 });
    expect(state.players['p2']).toEqual({ position: 0, displayName: 'Bob', colorIndex: 3 });
  });

  it('updatePlayerPosition actualiza la posicion de un jugador', () => {
    arenaStore.getState().initArena('Test', [
      { id: 'p1', displayName: 'Alice', colorIndex: 0 },
    ]);

    arenaStore.getState().updatePlayerPosition('p1', 5);

    expect(arenaStore.getState().players['p1'].position).toBe(5);
  });

  it('setLocalPosition actualiza la posicion local', () => {
    arenaStore.getState().setLocalPosition(10);
    expect(arenaStore.getState().localPosition).toBe(10);
  });

  it('reset vuelve al estado inicial', () => {
    arenaStore.getState().initArena('Test', [
      { id: 'p1', displayName: 'Alice', colorIndex: 0 },
    ]);
    arenaStore.getState().setLocalPosition(5);

    arenaStore.getState().reset();

    const state = arenaStore.getState();
    expect(state.textContent).toBe('');
    expect(state.players).toEqual({});
    expect(state.localPosition).toBe(0);
  });
});
