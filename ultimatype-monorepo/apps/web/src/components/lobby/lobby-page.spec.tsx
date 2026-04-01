import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLobby } from '../../hooks/use-lobby';
import { useAuth } from '../../hooks/use-auth';
import { LobbyPage } from './lobby-page';

// Mock hooks and socket
vi.mock('../../hooks/use-lobby', () => ({
  useLobby: vi.fn(),
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

const mockUseLobby = vi.mocked(useLobby);
const mockUseAuth = vi.mocked(useAuth);

function renderLobby(code = 'ABC123') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/room/${code}`]}>
        <Routes>
          <Route path="/room/:code" element={<LobbyPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LobbyPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', displayName: 'Host', email: 'host@test.com' },
      isAuthenticated: true,
      isFetchingProfile: false,
    } as any);
  });

  it('muestra el codigo de la sala', () => {
    mockUseLobby.mockReturnValue({
      roomState: {
        code: 'ABC123',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [
          {
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            disconnected: false,
          },
        ],
        maxPlayers: 20,
        spectators: [],
      },
      error: null,
      isConnected: true,
      matchStarted: false,
      matchData: null,
      isSpectator: false,
      isSwitchingRole: false,
      autoSpectateMessage: null,
      kickedMessage: null,
      movedToSpectatorMessage: null,
      toggleReady: vi.fn(),
      selectLevel: vi.fn(),
      setTimeLimit: vi.fn(),
      setMaxPlayers: vi.fn(),
      startMatch: vi.fn(),
      leaveRoom: vi.fn(),
      resetMatch: vi.fn(),
      joinAsSpectator: vi.fn(),
      switchToSpectator: vi.fn(),
      switchToPlayer: vi.fn(),
      clearAutoSpectateMessage: vi.fn(),
      kickPlayer: vi.fn(),
      moveToSpectator: vi.fn(),
      clearKickedMessage: vi.fn(),
      clearMovedToSpectatorMessage: vi.fn(),
    } as any);

    renderLobby();
    expect(screen.getByText('ABC123')).toBeTruthy();
  });

  it('muestra la lista de jugadores', () => {
    mockUseLobby.mockReturnValue({
      roomState: {
        code: 'ABC123',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [
          {
            id: 'user-1',
            displayName: 'Host Player',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            disconnected: false,
          },
          {
            id: 'user-2',
            displayName: 'Guest Player',
            avatarUrl: null,
            colorIndex: 1,
            isReady: true,
            disconnected: false,
          },
        ],
        maxPlayers: 20,
        spectators: [],
      },
      error: null,
      isConnected: true,
      matchStarted: false,
      matchData: null,
      isSpectator: false,
      isSwitchingRole: false,
      autoSpectateMessage: null,
      kickedMessage: null,
      movedToSpectatorMessage: null,
      toggleReady: vi.fn(),
      selectLevel: vi.fn(),
      setTimeLimit: vi.fn(),
      setMaxPlayers: vi.fn(),
      startMatch: vi.fn(),
      leaveRoom: vi.fn(),
      resetMatch: vi.fn(),
      joinAsSpectator: vi.fn(),
      switchToSpectator: vi.fn(),
      switchToPlayer: vi.fn(),
      clearAutoSpectateMessage: vi.fn(),
      kickPlayer: vi.fn(),
      moveToSpectator: vi.fn(),
      clearKickedMessage: vi.fn(),
      clearMovedToSpectatorMessage: vi.fn(),
    } as any);

    renderLobby();
    expect(screen.getByText('Host Player')).toBeTruthy();
    expect(screen.getByText('Guest Player')).toBeTruthy();
  });

  it('muestra mensaje de error cuando hay error', () => {
    mockUseLobby.mockReturnValue({
      roomState: null,
      error: 'Esta partida ya terminó',
      isConnected: true,
      matchStarted: false,
      matchData: null,
      isSpectator: false,
      isSwitchingRole: false,
      autoSpectateMessage: null,
      kickedMessage: null,
      movedToSpectatorMessage: null,
      toggleReady: vi.fn(),
      selectLevel: vi.fn(),
      setTimeLimit: vi.fn(),
      setMaxPlayers: vi.fn(),
      startMatch: vi.fn(),
      leaveRoom: vi.fn(),
      resetMatch: vi.fn(),
      joinAsSpectator: vi.fn(),
      switchToSpectator: vi.fn(),
      switchToPlayer: vi.fn(),
      clearAutoSpectateMessage: vi.fn(),
      kickPlayer: vi.fn(),
      moveToSpectator: vi.fn(),
      clearKickedMessage: vi.fn(),
      clearMovedToSpectatorMessage: vi.fn(),
    } as any);

    renderLobby();
    expect(screen.getByText('Esta partida ya terminó')).toBeTruthy();
  });

  it('muestra Conectando cuando no esta conectado', () => {
    mockUseLobby.mockReturnValue({
      roomState: null,
      error: null,
      isConnected: false,
      matchStarted: false,
      matchData: null,
      isSpectator: false,
      isSwitchingRole: false,
      autoSpectateMessage: null,
      kickedMessage: null,
      movedToSpectatorMessage: null,
      toggleReady: vi.fn(),
      selectLevel: vi.fn(),
      setTimeLimit: vi.fn(),
      setMaxPlayers: vi.fn(),
      startMatch: vi.fn(),
      leaveRoom: vi.fn(),
      resetMatch: vi.fn(),
      joinAsSpectator: vi.fn(),
      switchToSpectator: vi.fn(),
      switchToPlayer: vi.fn(),
      clearAutoSpectateMessage: vi.fn(),
      kickPlayer: vi.fn(),
      moveToSpectator: vi.fn(),
      clearKickedMessage: vi.fn(),
      clearMovedToSpectatorMessage: vi.fn(),
    } as any);

    renderLobby();
    expect(screen.getByText('Conectando...')).toBeTruthy();
  });

  it('muestra selector de nivel para el host', () => {
    mockUseLobby.mockReturnValue({
      roomState: {
        code: 'ABC123',
        hostId: 'user-1',
        level: 1,
        status: 'waiting',
        players: [
          {
            id: 'user-1',
            displayName: 'Host',
            avatarUrl: null,
            colorIndex: 0,
            isReady: false,
            disconnected: false,
          },
        ],
        maxPlayers: 20,
        spectators: [],
      },
      error: null,
      isConnected: true,
      matchStarted: false,
      matchData: null,
      isSpectator: false,
      isSwitchingRole: false,
      autoSpectateMessage: null,
      kickedMessage: null,
      movedToSpectatorMessage: null,
      toggleReady: vi.fn(),
      selectLevel: vi.fn(),
      setTimeLimit: vi.fn(),
      setMaxPlayers: vi.fn(),
      startMatch: vi.fn(),
      leaveRoom: vi.fn(),
      resetMatch: vi.fn(),
      joinAsSpectator: vi.fn(),
      switchToSpectator: vi.fn(),
      switchToPlayer: vi.fn(),
      clearAutoSpectateMessage: vi.fn(),
      kickPlayer: vi.fn(),
      moveToSpectator: vi.fn(),
      clearKickedMessage: vi.fn(),
      clearMovedToSpectatorMessage: vi.fn(),
    } as any);

    renderLobby();
    expect(screen.getByText('Nivel de Dificultad')).toBeTruthy();
  });
});
