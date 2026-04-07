import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeaderboardPreviewSection } from './leaderboard-preview-section';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboardPreview } from '../../hooks/use-leaderboard-preview';
import { LeaderboardEntryDto } from '@ultimatype-monorepo/shared';

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

vi.mock('../../hooks/use-leaderboard-preview', () => ({
  useLeaderboardPreview: vi.fn(),
}));

vi.mock('../ui/country-flag', () => ({
  CountryFlag: ({ countryCode }: { countryCode: string | null }) =>
    countryCode ? <span data-testid={`flag-${countryCode}`} /> : null,
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
const mockUseLeaderboardPreview = useLeaderboardPreview as ReturnType<typeof vi.fn>;

const mockEntry: LeaderboardEntryDto = {
  userId: 'user-1',
  position: 1,
  displayName: 'TestPlayer',
  avatarUrl: null,
  countryCode: 'CL',
  slug: 'testplayer',
  bestScore: 1234.5,
  bestScoreLevel: 3,
  bestScorePrecision: 98,
  bestScoreMatchCode: 'ABC123',
};

const mockEntries: LeaderboardEntryDto[] = [
  mockEntry,
  { ...mockEntry, userId: 'user-2', position: 2, displayName: 'Jugador2', slug: 'jugador2', bestScore: 1100 },
  { ...mockEntry, userId: 'user-3', position: 3, displayName: 'Jugador3', slug: 'jugador3', bestScore: 1000 },
  { ...mockEntry, userId: 'user-4', position: 4, displayName: 'Jugador4', slug: 'jugador4', bestScore: 900, countryCode: null },
  { ...mockEntry, userId: 'user-5', position: 5, displayName: 'Jugador5', slug: 'jugador5', bestScore: 800, avatarUrl: 'https://example.com/avatar.jpg' },
];

const authenticatedUser = {
  id: '1',
  provider: 'GOOGLE' as const,
  email: 'seba@test.com',
  displayName: 'Seba Dev',
  avatarUrl: null,
  countryCode: 'CL',
  slug: 'seba-dev',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  lastLoginAt: '2026-01-01',
  providerId: '123',
};

const authenticatedUserNoCountry = { ...authenticatedUser, countryCode: null };

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

function setupPreview(overrides?: object) {
  mockUseLeaderboardPreview.mockReturnValue({
    data: { data: mockEntries, meta: { total: 5, page: 1, limit: 5, totalPages: 1 } },
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupAuth();
  setupPreview();
});

describe('LeaderboardPreviewSection', () => {
  it('renderiza el header "Clasificación Global"', () => {
    render(<LeaderboardPreviewSection />);
    expect(screen.getByText('Clasificación Global')).toBeTruthy();
  });

  it('muestra 10 filas skeleton durante la carga', () => {
    mockUseLeaderboardPreview.mockReturnValue({ isLoading: true, data: undefined });
    const { container } = render(<LeaderboardPreviewSection />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(10);
  });

  it('no muestra tabla durante la carga', () => {
    mockUseLeaderboardPreview.mockReturnValue({ isLoading: true, data: undefined });
    const { container } = render(<LeaderboardPreviewSection />);
    expect(container.querySelector('table')).toBeNull();
  });

  it('renderiza tabla con jugadores cuando hay datos', () => {
    render(<LeaderboardPreviewSection />);
    expect(screen.getByText('TestPlayer')).toBeTruthy();
    expect(screen.getByText('Jugador2')).toBeTruthy();
  });

  it('cada fila muestra la posición del jugador', () => {
    render(<LeaderboardPreviewSection />);
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('muestra puntajes en celdas con font-mono', () => {
    const { container } = render(<LeaderboardPreviewSection />);
    const monoCells = container.querySelectorAll('.font-mono');
    expect(monoCells.length).toBeGreaterThan(0);
  });

  it('el nombre del jugador NO es un link (no navega al perfil directamente)', () => {
    render(<LeaderboardPreviewSection />);
    const nameEl = screen.getByText('TestPlayer');
    expect(nameEl.closest('a')).toBeNull();
  });

  it('al hacer click en una fila navega al match result', () => {
    render(<LeaderboardPreviewSection />);
    const row = screen.getByText('TestPlayer').closest('tr');
    fireEvent.click(row!);
    expect(mockNavigate).toHaveBeenCalledWith('/match/ABC123');
  });

  it('muestra avatar como imagen cuando avatarUrl está presente', () => {
    render(<LeaderboardPreviewSection />);
    const img = screen.getByAltText('Jugador5');
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('muestra inicial como fallback cuando avatarUrl es null', () => {
    render(<LeaderboardPreviewSection />);
    expect(screen.getByText('T')).toBeTruthy(); // TestPlayer → 'T'
  });

  it('muestra CountryFlag cuando el jugador tiene countryCode', () => {
    render(<LeaderboardPreviewSection />);
    const flags = screen.getAllByTestId('flag-CL');
    expect(flags.length).toBeGreaterThan(0);
  });

  it('no muestra CountryFlag cuando countryCode es null', () => {
    render(<LeaderboardPreviewSection />);
    expect(screen.queryByTestId('flag-null')).toBeNull();
  });

  it('muestra estado vacío con emoji_events cuando no hay jugadores', () => {
    mockUseLeaderboardPreview.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 5, totalPages: 0 } },
      isLoading: false,
    });
    render(<LeaderboardPreviewSection />);
    expect(screen.getByText('No hay jugadores en el ranking aún')).toBeTruthy();
    expect(screen.getByText('emoji_events')).toBeTruthy();
  });

  it('muestra link "Ver clasificación completa →" apuntando a /leaderboard', () => {
    render(<LeaderboardPreviewSection />);
    const link = screen.getByText('Ver clasificación completa →').closest('a');
    expect(link?.getAttribute('href')).toBe('/leaderboard');
  });

  describe('toggle Mundial / Mi país', () => {
    it('NO renderiza el toggle cuando no está autenticado', () => {
      setupAuth({ isAuthenticated: false, user: undefined });
      render(<LeaderboardPreviewSection />);
      expect(screen.queryByText('Mundial')).toBeNull();
      expect(screen.queryByText('Mi país')).toBeNull();
    });

    it('NO renderiza el toggle cuando está autenticado pero sin countryCode', () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUserNoCountry });
      render(<LeaderboardPreviewSection />);
      expect(screen.queryByText('Mundial')).toBeNull();
      expect(screen.queryByText('Mi país')).toBeNull();
    });

    it('renderiza el toggle cuando está autenticado Y tiene countryCode', () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      render(<LeaderboardPreviewSection />);
      expect(screen.getByText('Mundial')).toBeTruthy();
      expect(screen.getByText('Mi país')).toBeTruthy();
    });

    it('"Mundial" está activo (aria-pressed=true) por defecto', () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      render(<LeaderboardPreviewSection />);
      const mundialBtn = screen.getByText('Mundial').closest('button');
      expect(mundialBtn?.getAttribute('aria-pressed')).toBe('true');
      const miPaisBtn = screen.getByText('Mi país').closest('button');
      expect(miPaisBtn?.getAttribute('aria-pressed')).toBe('false');
    });

    it('al hacer click en "Mi país" llama al hook con country=user.countryCode', () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      render(<LeaderboardPreviewSection />);
      fireEvent.click(screen.getByText('Mi país'));
      expect(mockUseLeaderboardPreview).toHaveBeenCalledWith({ country: 'CL' });
    });

    it('al hacer click en "Mundial" llama al hook con country=null', () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      render(<LeaderboardPreviewSection />);
      // Primero activar "Mi país"
      fireEvent.click(screen.getByText('Mi país'));
      // Luego volver a "Mundial"
      fireEvent.click(screen.getByText('Mundial'));
      expect(mockUseLeaderboardPreview).toHaveBeenLastCalledWith({ country: null });
    });
  });

  describe('CTA para no autenticados', () => {
    it('muestra "Inicia sesión para competir" cuando no autenticado', () => {
      setupAuth({ isAuthenticated: false, user: undefined });
      render(<LeaderboardPreviewSection />);
      expect(screen.getByText('Inicia sesión para competir')).toBeTruthy();
    });

    it('NO muestra CTA cuando está autenticado', () => {
      setupAuth({ isAuthenticated: true, user: authenticatedUser });
      render(<LeaderboardPreviewSection />);
      expect(screen.queryByText('Inicia sesión para competir')).toBeNull();
    });

    it('click en CTA abre LoginModal', () => {
      setupAuth({ isAuthenticated: false, user: undefined });
      render(<LeaderboardPreviewSection />);
      expect(screen.queryByTestId('login-modal')).toBeNull();
      fireEvent.click(screen.getByText('Inicia sesión para competir'));
      expect(screen.getByTestId('login-modal')).toBeTruthy();
    });

    it('LoginModal puede cerrarse', () => {
      setupAuth({ isAuthenticated: false, user: undefined });
      render(<LeaderboardPreviewSection />);
      fireEvent.click(screen.getByText('Inicia sesión para competir'));
      expect(screen.getByTestId('login-modal')).toBeTruthy();
      fireEvent.click(screen.getByText('Cerrar'));
      expect(screen.queryByTestId('login-modal')).toBeNull();
    });
  });
});
