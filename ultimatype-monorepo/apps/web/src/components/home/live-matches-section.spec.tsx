import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiveMatchesSection } from './live-matches-section';
import { useAuth } from '../../hooks/use-auth';
import { useActiveRooms } from '../../hooks/use-active-rooms';
import { ActiveRoomDto } from '@ultimatype-monorepo/shared';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-active-rooms', () => ({
  useActiveRooms: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../ui/login-modal', () => ({
  LoginModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="login-modal">
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
    </div>
  ),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseActiveRooms = useActiveRooms as ReturnType<typeof vi.fn>;

const waitingRoom: ActiveRoomDto = {
  code: 'ABC123',
  status: 'waiting',
  level: 1,
  playerCount: 2,
  players: [
    { displayName: 'Jugador Uno', colorIndex: 0, avatarUrl: null },
    { displayName: 'Jugador Dos', colorIndex: 1, avatarUrl: null },
  ],
};

const playingRoom: ActiveRoomDto = {
  code: 'XYZ789',
  status: 'playing',
  level: 3,
  playerCount: 3,
  players: [
    { displayName: 'Rápido', colorIndex: 2, avatarUrl: null, position: 150 },
    { displayName: 'Medio', colorIndex: 3, avatarUrl: null, position: 80 },
    { displayName: 'Lento', colorIndex: 4, avatarUrl: null, position: 30 },
  ],
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  textLength: 300,
};

const authenticatedUser = {
  id: '1',
  provider: 'GOOGLE' as const,
  email: 'seba@test.com',
  displayName: 'Seba Dev',
  avatarUrl: 'https://example.com/avatar.jpg',
  countryCode: 'CL',
  slug: 'seba-dev',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  lastLoginAt: '2026-01-01',
};

function setupAuth(overrides?: Partial<ReturnType<typeof useAuth>>) {
  mockUseAuth.mockReturnValue({
    user: undefined,
    isAuthenticated: false,
    isFetchingProfile: false,
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupAuth();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

describe('LiveMatchesSection', () => {
  it('renderiza el header "Partidas en Vivo"', () => {
    mockUseActiveRooms.mockReturnValue({ data: { rooms: [] }, isLoading: false });
    render(<LiveMatchesSection />);
    expect(screen.getByText('Partidas en Vivo')).toBeTruthy();
  });

  it('muestra nada mientras carga por primera vez', () => {
    mockUseActiveRooms.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<LiveMatchesSection />);
    // No empty state ni cards mientras isLoading es true
    expect(container.querySelector('[data-testid="login-modal"]')).toBeNull();
    expect(screen.queryByText('No hay partidas en vivo')).toBeNull();
  });

  it('muestra estado vacío cuando no hay rooms activos', () => {
    mockUseActiveRooms.mockReturnValue({ data: { rooms: [] }, isLoading: false });
    render(<LiveMatchesSection />);
    expect(screen.getByText('No hay partidas en vivo')).toBeTruthy();
    expect(screen.getByText('¡Crea una partida y sé el primero!')).toBeTruthy();
  });

  it('muestra el ícono sports_esports en el estado vacío', () => {
    mockUseActiveRooms.mockReturnValue({ data: { rooms: [] }, isLoading: false });
    render(<LiveMatchesSection />);
    const icon = screen.getByText('sports_esports');
    expect(icon.classList.contains('material-symbols-outlined')).toBe(true);
  });

  it('renderiza tarjetas de rooms activos', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [waitingRoom, playingRoom] },
      isLoading: false,
    });
    render(<LiveMatchesSection />);
    expect(screen.getByText('Jugador Uno')).toBeTruthy();
    expect(screen.getByText('Rápido')).toBeTruthy();
  });

  it('muestra el nivel de dificultad en cada card', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [waitingRoom] },
      isLoading: false,
    });
    render(<LiveMatchesSection />);
    // Nivel 1 = "Minúscula"
    expect(screen.getByText('Minúscula')).toBeTruthy();
  });

  it('botón "Observar" navega a /room/:code', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [waitingRoom] },
      isLoading: false,
    });
    render(<LiveMatchesSection />);
    const btn = screen.getByRole('button', { name: /observar/i });
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/room/ABC123');
  });

  it('muestra WPM para rooms en estado playing con jugadores con posición > 0', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [playingRoom] },
      isLoading: false,
    });
    render(<LiveMatchesSection />);
    // El jugador "Rápido" con position=150, elapsed ~1min → WPM estimado
    const wpmElements = screen.getAllByText(/\d+ wpm/);
    expect(wpmElements.length).toBeGreaterThan(0);
  });

  it('muestra barras de progreso para rooms en estado playing', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [playingRoom] },
      isLoading: false,
    });
    const { container } = render(<LiveMatchesSection />);
    const progressBars = container.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('barra de progreso tiene ancho proporcional a position/textLength', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [playingRoom] },
      isLoading: false,
    });
    const { container } = render(<LiveMatchesSection />);
    // Jugador con position=150, textLength=300 → 50%
    const fills = container.querySelectorAll('[role="progressbar"] > div');
    const widths = Array.from(fills).map((el) =>
      (el as HTMLElement).style.width,
    );
    expect(widths).toContain('50%');
  });

  it('no muestra WPM para rooms en estado waiting', () => {
    mockUseActiveRooms.mockReturnValue({
      data: { rooms: [waitingRoom] },
      isLoading: false,
    });
    render(<LiveMatchesSection />);
    expect(screen.queryByText(/\d+ wpm/)).toBeNull();
  });

  describe('empty state CTA', () => {
    it('usuario autenticado: click en "Crear partida" llama apiClient POST /rooms', async () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      const { apiClient } = await import('../../lib/api-client');
      vi.mocked(apiClient).mockResolvedValueOnce({ code: 'NEW123' });
      mockUseActiveRooms.mockReturnValue({ data: { rooms: [] }, isLoading: false });

      render(<LiveMatchesSection />);
      const btn = screen.getByRole('button', { name: /crear partida/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(apiClient).toHaveBeenCalledWith('/rooms', { method: 'POST' });
      });
    });

    it('usuario autenticado: navega a /room/:code tras crear partida', async () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      const { apiClient } = await import('../../lib/api-client');
      vi.mocked(apiClient).mockResolvedValueOnce({ code: 'NEW123' });
      mockUseActiveRooms.mockReturnValue({ data: { rooms: [] }, isLoading: false });

      render(<LiveMatchesSection />);
      fireEvent.click(screen.getByRole('button', { name: /crear partida/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/room/NEW123');
      });
    });

    it('usuario no autenticado: guarda returnAfterLogin y abre LoginModal', () => {
      setupAuth({ isAuthenticated: false });
      mockUseActiveRooms.mockReturnValue({ data: { rooms: [] }, isLoading: false });

      render(<LiveMatchesSection />);
      fireEvent.click(screen.getByRole('button', { name: /crear partida/i }));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'returnAfterLogin',
        expect.any(String),
      );
      expect(screen.getByTestId('login-modal')).toBeTruthy();
    });
  });
});
