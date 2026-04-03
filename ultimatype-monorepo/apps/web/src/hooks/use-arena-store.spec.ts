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
    expect(state.players['p1']).toEqual({ position: 0, displayName: 'Alice', colorIndex: 1, disconnected: false });
    expect(state.players['p2']).toEqual({ position: 0, displayName: 'Bob', colorIndex: 3, disconnected: false });
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

  it('decrementErrorKeystrokes decrementa errorKeystrokes', () => {
    arenaStore.getState().incrementKeystrokes(false);
    arenaStore.getState().incrementKeystrokes(false);
    expect(arenaStore.getState().errorKeystrokes).toBe(2);

    arenaStore.getState().decrementErrorKeystrokes();
    expect(arenaStore.getState().errorKeystrokes).toBe(1);
  });

  it('decrementErrorKeystrokes no baja de 0', () => {
    expect(arenaStore.getState().errorKeystrokes).toBe(0);
    arenaStore.getState().decrementErrorKeystrokes();
    expect(arenaStore.getState().errorKeystrokes).toBe(0);
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

  it('setLocalFinished pone localFinished en true', () => {
    expect(arenaStore.getState().localFinished).toBe(false);
    arenaStore.getState().setLocalFinished();
    expect(arenaStore.getState().localFinished).toBe(true);
  });

  it('setLocalFinishStats guarda wpm, precision y score', () => {
    arenaStore.getState().setLocalFinishStats(76.27, 92, 701.68);
    const state = arenaStore.getState();
    expect(state.localFinishStats).toEqual({ wpm: 76.27, precision: 92, score: 701.68 });
  });

  it('setMatchFinished transiciona a finished con resultados y reason', () => {
    const mockResults = [
      {
        playerId: 'p1',
        displayName: 'Alice',
        colorIndex: 0,
        rank: 1,
        wpm: 60,
        precision: 95,
        score: 570,
        finished: true,
        finishedAt: '2026-03-28T00:00:00Z',
      },
    ];

    arenaStore.getState().setMatchFinished(mockResults, 'all_finished');

    const state = arenaStore.getState();
    expect(state.matchStatus).toBe('finished');
    expect(state.matchResults).toEqual(mockResults);
    expect(state.matchEndReason).toBe('all_finished');
  });

  it('initArena resetea localFinished, localFinishStats, matchResults y matchEndReason', () => {
    arenaStore.getState().setLocalFinished();
    arenaStore.getState().setLocalFinishStats(60, 90, 540);
    arenaStore.getState().setMatchFinished([], 'timeout');

    arenaStore.getState().initArena('New', [{ id: 'p1', displayName: 'A', colorIndex: 0 }]);

    const state = arenaStore.getState();
    expect(state.localFinished).toBe(false);
    expect(state.localFinishStats).toBeNull();
    expect(state.matchResults).toBeNull();
    expect(state.matchEndReason).toBeNull();
  });

  it('setConnectionStatus actualiza connectionStatus y reconnectAttempt', () => {
    expect(arenaStore.getState().connectionStatus).toBe('connected');
    expect(arenaStore.getState().reconnectAttempt).toBe(0);

    arenaStore.getState().setConnectionStatus('reconnecting', 2);
    expect(arenaStore.getState().connectionStatus).toBe('reconnecting');
    expect(arenaStore.getState().reconnectAttempt).toBe(2);

    arenaStore.getState().setConnectionStatus('disconnected');
    expect(arenaStore.getState().connectionStatus).toBe('disconnected');
    expect(arenaStore.getState().reconnectAttempt).toBe(2); // unchanged
  });

  it('markPlayerDisconnected marca al jugador como desconectado', () => {
    arenaStore.getState().initArena('Test', [
      { id: 'p1', displayName: 'Alice', colorIndex: 0 },
    ]);

    arenaStore.getState().markPlayerDisconnected('p1');
    expect(arenaStore.getState().players['p1'].disconnected).toBe(true);
  });

  it('markPlayerReconnected marca al jugador como conectado', () => {
    arenaStore.getState().initArena('Test', [
      { id: 'p1', displayName: 'Alice', colorIndex: 0 },
    ]);
    arenaStore.getState().markPlayerDisconnected('p1');
    arenaStore.getState().markPlayerReconnected('p1');
    expect(arenaStore.getState().players['p1'].disconnected).toBe(false);
  });

  it('restoreFromRejoin restaura estado completo del match', () => {
    arenaStore.getState().restoreFromRejoin({
      textContent: 'hello world',
      textId: '42',
      startedAt: '2026-03-28T12:00:00Z',
      localPosition: 5,
      localErrors: 1,
      localTotalKeystrokes: 6,
      localErrorKeystrokes: 1,
      localFinished: false,
      localFinishedAt: null,
      players: [
        { playerId: 'p1', displayName: 'Alice', colorIndex: 0, position: 3, finished: false, disconnected: false },
        { playerId: 'p2', displayName: 'Bob', colorIndex: 1, position: 7, finished: true, disconnected: false },
      ],
    });

    const state = arenaStore.getState();
    expect(state.textContent).toBe('hello world');
    expect(state.localPosition).toBe(5);
    expect(state.matchStatus).toBe('playing');
    expect(state.totalKeystrokes).toBe(6);
    expect(state.errorKeystrokes).toBe(1);
    expect(state.connectionStatus).toBe('connected');
    expect(state.players['p1']).toEqual({ position: 3, displayName: 'Alice', colorIndex: 0, disconnected: false });
    expect(state.players['p2']).toEqual({ position: 7, displayName: 'Bob', colorIndex: 1, disconnected: false });
  });

  it('initArena resetea connectionStatus y reconnectAttempt', () => {
    arenaStore.getState().setConnectionStatus('reconnecting', 3);
    arenaStore.getState().initArena('New', [{ id: 'p1', displayName: 'A', colorIndex: 0 }]);
    expect(arenaStore.getState().connectionStatus).toBe('connected');
    expect(arenaStore.getState().reconnectAttempt).toBe(0);
  });

  it('resetRaceMetrics resetea localFinished, localFinishStats y matchResults', () => {
    arenaStore.getState().setLocalFinished();
    arenaStore.getState().setLocalFinishStats(60, 90, 540);
    arenaStore.getState().setMatchFinished([], 'all_finished');

    arenaStore.getState().resetRaceMetrics();

    const state = arenaStore.getState();
    expect(state.localFinished).toBe(false);
    expect(state.localFinishStats).toBeNull();
    expect(state.matchResults).toBeNull();
    expect(state.matchEndReason).toBeNull();
  });
});
