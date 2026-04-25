import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { WS_EVENTS, ROOM_ERROR_CODES } from '@ultimatype-monorepo/shared';

const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
const socketMock = {
  connected: false,
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    const arr = listeners.get(event) ?? [];
    arr.push(handler);
    listeners.set(event, arr);
  }),
  off: vi.fn((event: string) => {
    listeners.delete(event);
  }),
  once: vi.fn(),
  emit: vi.fn(),
  io: { on: vi.fn(), off: vi.fn() },
};

const connectSocketMock = vi.fn(() => socketMock);
const disconnectSocketMock = vi.fn();

vi.mock('../lib/socket', () => ({
  connectSocket: () => connectSocketMock(),
  disconnectSocket: () => disconnectSocketMock(),
  getSocket: () => socketMock,
}));

function fireEvent(event: string, payload: unknown) {
  const handlers = listeners.get(event) ?? [];
  for (const h of handlers) h(payload);
}

let currentPath = '';

function PathSpy() {
  currentPath = useLocation().pathname;
  return null;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/room/ABC234']}>
      <PathSpy />
      <Routes>
        <Route path="/room/:code" element={<>{children}</>} />
        <Route path="*" element={<>{children}</>} />
      </Routes>
    </MemoryRouter>
  );
}

import { useLobby } from './use-lobby';

describe('useLobby — ROOM_MIGRATED', () => {
  beforeEach(() => {
    listeners.clear();
    connectSocketMock.mockClear();
    disconnectSocketMock.mockClear();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    socketMock.connected = false;
    currentPath = '/room/ABC234';
  });

  it('navega a /room/:newCode al recibir ROOM_MIGRATED', () => {
    renderHook(() => useLobby('ABC234', 'user-1'), { wrapper });

    act(() => {
      fireEvent(WS_EVENTS.ROOM_MIGRATED, { oldCode: 'ABC234', newCode: 'XYZ987' });
    });

    expect(currentPath).toBe('/room/XYZ987');
  });

  it('ignora ROOM_MIGRATED si oldCode no coincide con el code actual', () => {
    renderHook(() => useLobby('ABC234', 'user-1'), { wrapper });

    act(() => {
      fireEvent(WS_EVENTS.ROOM_MIGRATED, { oldCode: 'OTHER1', newCode: 'XYZ987' });
    });

    expect(currentPath).toBe('/room/ABC234');
  });

  it('NO desconecta el socket durante la migración (mantiene conexión viva)', () => {
    const { rerender, unmount } = renderHook(
      ({ code }: { code: string }) => useLobby(code, 'user-1'),
      { initialProps: { code: 'ABC234' }, wrapper },
    );

    act(() => {
      fireEvent(WS_EVENTS.ROOM_MIGRATED, { oldCode: 'ABC234', newCode: 'XYZ987' });
    });

    // Simulate URL change propagating to the hook (LobbyPage re-renders with new code from useParams)
    rerender({ code: 'XYZ987' });

    // Cleanup of the previous effect ran with isMigratingRef=true → skipped disconnect
    expect(disconnectSocketMock).not.toHaveBeenCalled();

    // Now a real unmount (no migration) should disconnect
    unmount();
    expect(disconnectSocketMock).toHaveBeenCalled();
  });

  it('resetea matchStarted y matchData en migración', () => {
    const { result } = renderHook(() => useLobby('ABC234', 'user-1'), { wrapper });

    // Simular MATCH_START antes de la revancha
    act(() => {
      fireEvent(WS_EVENTS.MATCH_START, {
        code: 'ABC234',
        textId: 1,
        textContent: 'hola mundo',
        players: [],
      });
    });
    expect(result.current.matchStarted).toBe(true);

    act(() => {
      fireEvent(WS_EVENTS.ROOM_MIGRATED, { oldCode: 'ABC234', newCode: 'XYZ987' });
    });

    expect(result.current.matchStarted).toBe(false);
    expect(result.current.matchData).toBeNull();
  });
});

describe('useLobby — LOBBY_ERROR ROOM_NOT_FOUND', () => {
  beforeEach(() => {
    listeners.clear();
    connectSocketMock.mockClear();
    disconnectSocketMock.mockClear();
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    socketMock.connected = false;
    currentPath = '/room/ABC234';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navega a / cuando llega ROOM_NOT_FOUND antes de cualquier LOBBY_STATE', () => {
    renderHook(() => useLobby('ABC234', 'user-1'), { wrapper });

    act(() => {
      fireEvent(WS_EVENTS.LOBBY_ERROR, {
        code: ROOM_ERROR_CODES.ROOM_NOT_FOUND,
        message: ROOM_ERROR_CODES.ROOM_NOT_FOUND,
      });
    });

    // Aún no navega — espera 2s para mostrar el error
    expect(currentPath).toBe('/room/ABC234');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(currentPath).toBe('/');
  });

  it('NO navega si ya recibió un LOBBY_STATE válido (room mid-life error)', () => {
    renderHook(() => useLobby('ABC234', 'user-1'), { wrapper });

    act(() => {
      fireEvent(WS_EVENTS.LOBBY_STATE, {
        code: 'ABC234',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [],
        spectators: [],
        maxPlayers: 20,
        timeLimit: 0,
      });
    });

    act(() => {
      fireEvent(WS_EVENTS.LOBBY_ERROR, {
        code: ROOM_ERROR_CODES.ROOM_NOT_FOUND,
        message: ROOM_ERROR_CODES.ROOM_NOT_FOUND,
      });
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(currentPath).toBe('/room/ABC234');
  });

  it('NO navega ante otros tipos de error', () => {
    renderHook(() => useLobby('ABC234', 'user-1'), { wrapper });

    act(() => {
      fireEvent(WS_EVENTS.LOBBY_ERROR, {
        message: 'Otro error genérico',
      });
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(currentPath).toBe('/room/ABC234');
  });
});
