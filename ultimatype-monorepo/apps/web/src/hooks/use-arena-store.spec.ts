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
    expect(state.matchStartTime).toBeNull();
    expect(state.totalKeystrokes).toBe(0);
    expect(state.errorKeystrokes).toBe(0);
  });

  it('initArena configura texto, jugadores y status countdown', () => {
    arenaStore.getState().initArena('Test text', [
      { id: 'p1', displayName: 'Alice', colorIndex: 1 },
      { id: 'p2', displayName: 'Bob', colorIndex: 3 },
    ]);

    const state = arenaStore.getState();
    expect(state.textContent).toBe('Test text');
    expect(state.matchStatus).toBe('countdown');
    expect(state.players['p1']).toEqual({ position: 0, displayName: 'Alice', colorIndex: 1 });
    expect(state.players['p2']).toEqual({ position: 0, displayName: 'Bob', colorIndex: 3 });
  });

  it('initArena resetea metricas de carrera', () => {
    // Arrange: set some metrics first
    arenaStore.getState().initArena('Text', [{ id: 'p1', displayName: 'A', colorIndex: 0 }]);
    arenaStore.getState().setMatchStarted();
    arenaStore.getState().incrementKeystrokes(true);
    arenaStore.getState().incrementKeystrokes(false);

    // Act: re-init
    arenaStore.getState().initArena('New text', [{ id: 'p2', displayName: 'B', colorIndex: 1 }]);

    const state = arenaStore.getState();
    expect(state.matchStartTime).toBeNull();
    expect(state.totalKeystrokes).toBe(0);
    expect(state.errorKeystrokes).toBe(0);
    expect(state.matchStatus).toBe('countdown');
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

  it('setMatchStarted registra el tiempo de inicio y cambia status a playing', () => {
    const before = Date.now();
    arenaStore.getState().setMatchStarted();
    const after = Date.now();

    const state = arenaStore.getState();
    expect(state.matchStatus).toBe('playing');
    expect(state.matchStartTime).toBeGreaterThanOrEqual(before);
    expect(state.matchStartTime).toBeLessThanOrEqual(after);
  });

  it('incrementKeystrokes incrementa totalKeystrokes en cada llamada', () => {
    arenaStore.getState().incrementKeystrokes(true);
    arenaStore.getState().incrementKeystrokes(true);

    const state = arenaStore.getState();
    expect(state.totalKeystrokes).toBe(2);
    expect(state.errorKeystrokes).toBe(0);
  });

  it('incrementKeystrokes tambien incrementa errorKeystrokes si correct=false', () => {
    arenaStore.getState().incrementKeystrokes(true);
    arenaStore.getState().incrementKeystrokes(false);

    const state = arenaStore.getState();
    expect(state.totalKeystrokes).toBe(2);
    expect(state.errorKeystrokes).toBe(1);
  });

  it('resetRaceMetrics resetea matchStartTime, totalKeystrokes y errorKeystrokes', () => {
    arenaStore.getState().setMatchStarted();
    arenaStore.getState().incrementKeystrokes(true);
    arenaStore.getState().incrementKeystrokes(false);

    arenaStore.getState().resetRaceMetrics();

    const state = arenaStore.getState();
    expect(state.matchStartTime).toBeNull();
    expect(state.totalKeystrokes).toBe(0);
    expect(state.errorKeystrokes).toBe(0);
  });

  it('reset vuelve al estado inicial completo', () => {
    arenaStore.getState().initArena('Test', [
      { id: 'p1', displayName: 'Alice', colorIndex: 0 },
    ]);
    arenaStore.getState().setMatchStarted();
    arenaStore.getState().setLocalPosition(5);
    arenaStore.getState().incrementKeystrokes(false);

    arenaStore.getState().reset();

    const state = arenaStore.getState();
    expect(state.textContent).toBe('');
    expect(state.players).toEqual({});
    expect(state.localPosition).toBe(0);
    expect(state.matchStartTime).toBeNull();
    expect(state.totalKeystrokes).toBe(0);
    expect(state.errorKeystrokes).toBe(0);
    expect(state.matchStatus).toBe('countdown');
  });
});
