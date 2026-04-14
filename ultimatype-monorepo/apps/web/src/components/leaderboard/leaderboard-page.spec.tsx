import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LeaderboardPage } from './leaderboard-page';
import type { PaginatedResponse, LeaderboardEntryDto, UserLeaderboardPositionDto } from '@ultimatype-monorepo/shared';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboard } from '../../hooks/use-leaderboard';
import { useLeaderboardPosition } from '../../hooks/use-leaderboard-position';
import { useWeeklyRecord } from '../../hooks/use-weekly-record';

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-leaderboard', () => ({
  useLeaderboard: vi.fn(),
}));

vi.mock('../../hooks/use-leaderboard-position', () => ({
  useLeaderboardPosition: vi.fn(),
}));

vi.mock('../../hooks/use-weekly-record', () => ({
  useWeeklyRecord: vi.fn(),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLeaderboard = useLeaderboard as ReturnType<typeof vi.fn>;
const mockUseLeaderboardPosition = useLeaderboardPosition as ReturnType<typeof vi.fn>;
const mockUseWeeklyRecord = useWeeklyRecord as ReturnType<typeof vi.fn>;

const makeEntry = (overrides: Partial<LeaderboardEntryDto> = {}): LeaderboardEntryDto => ({
  userId: 'user-alice',
  position: 1,
  displayName: 'Alice',
  avatarUrl: 'http://example.com/alice.jpg',
  countryCode: 'AR',
  slug: 'al-abc',
  bestScore: 1200,
  bestScorePrecision: 98.5,
  bestScoreMatchCode: 'ABC123',
  bestScoreLevel: 1,
  ...overrides,
});

const defaultPosition: UserLeaderboardPositionDto = {
  bestScore: 800,
  bestScoreMatchCode: 'ABC123',
  bestScoreDate: '2026-04-01T12:00:00.000Z',
  globalRank: 5,
  globalTotal: 100,
  globalPercentile: 96,
  countryRank: 2,
  countryTotal: 15,
  countryPercentile: 93,
  countryCode: 'AR',
};

const emptyLeaderboard: PaginatedResponse<LeaderboardEntryDto> = {
  data: [],
  meta: { total: 0, page: 1, limit: 100, totalPages: 0 },
};

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LeaderboardPage />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
  mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });
  mockUseLeaderboardPosition.mockReturnValue({ data: null, isLoading: false });
  mockUseWeeklyRecord.mockReturnValue({ data: null, isLoading: false, isError: false });
});

describe('LeaderboardPage', () => {
  it('should show loading skeletons while data is loading', () => {
    mockUseLeaderboard.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });

    renderPage();

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display leaderboard table with data', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [
        makeEntry({ position: 1, displayName: 'Alice', bestScore: 1200, bestScorePrecision: 98.5 }),
        makeEntry({ position: 2, displayName: 'Bob', bestScore: 1100, bestScorePrecision: 95.0, avatarUrl: null, countryCode: 'CL' }),
      ],
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('98.5%')).toBeDefined();
    expect(screen.getByText('95%')).toBeDefined();
  });

  it('should show position widget when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1', displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: defaultPosition, isLoading: false });

    renderPage();

    expect(screen.getByText('Tu Posición Global')).toBeDefined();
    expect(screen.getByText('#5')).toBeDefined();
    expect(screen.getByText(/#2/)).toBeDefined();
  });

  it('should show CTA instead of position data when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });

    renderPage();

    expect(screen.getByText('Inicia sesión para ver tu ranking')).toBeDefined();
    expect(screen.queryByTestId('position-widget')).toBeNull();
  });

  it('should show empty message when position is null (no matches)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1', displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: null, isLoading: false });

    renderPage();

    expect(screen.getByText('Juega tu primera partida para aparecer en el ranking')).toBeDefined();
  });

  it('should render level filter buttons', () => {
    renderPage();

    expect(screen.getByText('Todos los niveles')).toBeDefined();
    expect(screen.getByText(/Minúscula/)).toBeDefined();
  });

  it('should change level filter and reset page', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const levelButton = screen.getAllByText(/Minúscula/)[0];
    fireEvent.click(levelButton);

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ level: 1, page: 1 }),
    );
  });

  it('should show empty state for filtered view', () => {
    mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const levelButton = screen.getByText(/Minúscula/);
    fireEvent.click(levelButton);

    expect(screen.getByText('No hay jugadores registrados en este nivel')).toBeDefined();
  });

  it('should show error state with retry button', () => {
    const refetch = vi.fn();
    mockUseLeaderboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    renderPage();

    expect(screen.getByText('Error al cargar el ranking')).toBeDefined();
    const retryButton = screen.getByText('Reintentar');
    fireEvent.click(retryButton);
    expect(refetch).toHaveBeenCalled();
  });

  it('should render match code as link in position widget', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1', displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: defaultPosition, isLoading: false });

    const { container } = renderPage();

    const matchLink = container.querySelector('a[href="/match/ABC123"]');
    expect(matchLink).toBeTruthy();
  });

  it('should NOT link player name to public profile (profile accessible from match detail)', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry({ slug: 'al-abc' })],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const nameEl = screen.getByText('Alice');
    expect(nameEl.closest('a')).toBeNull();
  });

  it('should have link in each row to navigate to match detail', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry({ bestScoreMatchCode: 'XYZ789', bestScore: 1200 })],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const row = screen.getByText('Alice').closest('tr');
    const link = row?.querySelector('a[href="/match/XYZ789"]');
    expect(link).toBeTruthy();
  });

  it('should show pagination when multiple pages exist', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 250, page: 1, limit: 100, totalPages: 3 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText('1 / 3')).toBeDefined();
    expect(screen.getByLabelText('Página anterior')).toBeDefined();
    expect(screen.getByLabelText('Página siguiente')).toBeDefined();
  });

  it('should not show pagination for single page', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.queryByLabelText('Página anterior')).toBeNull();
    expect(screen.queryByLabelText('Página siguiente')).toBeNull();
  });

  it('should render period filter buttons', () => {
    renderPage();

    expect(screen.getByText('Histórico')).toBeDefined();
    expect(screen.getByText('Último año')).toBeDefined();
    expect(screen.getByText('Último mes')).toBeDefined();
    expect(screen.getByText('Últimos 7 días')).toBeDefined();
  });

  it('should change period filter and reset page', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const periodButton = screen.getByText('Últimos 7 días');
    fireEvent.click(periodButton);

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ period: '7d', page: 1 }),
    );
  });

  it('should reflect period filter in useLeaderboardPosition call', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1', displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: defaultPosition, isLoading: false });

    renderPage();

    const periodButton = screen.getByText('Último mes');
    fireEvent.click(periodButton);

    expect(mockUseLeaderboardPosition).toHaveBeenCalledWith(
      expect.objectContaining({ period: '30d' }),
    );
  });

  it('should render country filter dropdown', () => {
    renderPage();

    const select = screen.getByLabelText('Filtrar por país');
    expect(select).toBeDefined();
    expect(screen.getByText('Todos los países')).toBeDefined();
  });

  it('should change country filter and reset page', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const select = screen.getByLabelText('Filtrar por país') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'AR' } });

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'AR', page: 1 }),
    );
  });

  it('should pass combined level and country filters to hook', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    fireEvent.click(screen.getAllByText(/Minúscula/)[0]);
    fireEvent.change(screen.getByLabelText('Filtrar por país') as HTMLSelectElement, {
      target: { value: 'CL' },
    });

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ level: 1, country: 'CL', page: 1 }),
    );
  });

  it('should show contextual empty state with country active', () => {
    mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    fireEvent.change(screen.getByLabelText('Filtrar por país') as HTMLSelectElement, {
      target: { value: 'AR' },
    });

    expect(screen.getByText('No hay jugadores de Argentina registrados')).toBeDefined();
  });

  it('should show contextual empty state with level and country active', () => {
    mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    fireEvent.click(screen.getByText(/Minúscula/));
    fireEvent.change(screen.getByLabelText('Filtrar por país') as HTMLSelectElement, {
      target: { value: 'AR' },
    });

    expect(screen.getByText('No hay jugadores de Argentina registrados en este nivel')).toBeDefined();
  });

  it('should show contextual empty state with period active', () => {
    mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    fireEvent.click(screen.getByText('Últimos 7 días'));

    expect(screen.getByText('No hay jugadores registrados en los últimos 7 días')).toBeDefined();
  });

  it('should show contextual empty state with all three filters active', () => {
    mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    fireEvent.click(screen.getByText(/Minúscula/));
    fireEvent.click(screen.getByText('Último mes'));
    fireEvent.change(screen.getByLabelText('Filtrar por país') as HTMLSelectElement, {
      target: { value: 'AR' },
    });

    expect(screen.getByText('No hay jugadores de Argentina registrados en este nivel en el último mes')).toBeDefined();
  });

  it('should pass combined level, country and period filters to hook', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    fireEvent.click(screen.getAllByText(/Minúscula/)[0]);
    fireEvent.click(screen.getByText('Últimos 7 días'));
    fireEvent.change(screen.getByLabelText('Filtrar por país') as HTMLSelectElement, {
      target: { value: 'CL' },
    });

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ level: 1, country: 'CL', period: '7d', page: 1 }),
    );
  });

  it('should reset country to null when selecting "Todos los países"', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const select = screen.getByLabelText('Filtrar por país') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'AR' } });
    fireEvent.change(select, { target: { value: '' } });

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ country: null }),
    );
  });

  it('should not show country row in widget when user has no country', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1', displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({
      data: { ...defaultPosition, countryCode: null, countryRank: null, countryTotal: null, countryPercentile: null },
      isLoading: false,
    });

    renderPage();

    const widget = screen.getByTestId('position-widget');
    expect(within(widget).getByText('#5')).toBeDefined();
    expect(within(widget).queryByText(/Top.*%.*de /)).toBeNull();
  });

  it('should show position loading skeletons while loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1', displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: null, isLoading: true });

    renderPage();

    const widget = screen.getByTestId('position-widget');
    const skeletons = widget.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display avatar initials when avatarUrl is null', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry({ displayName: 'Bob', avatarUrl: null })],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText('B')).toBeDefined();
  });

  // === NUEVOS TESTS — Design System 5-12 ===

  it('renders Rankings Globales headline', () => {
    renderPage();
    expect(screen.getByText('Rankings Globales')).toBeDefined();
  });

  it('renders Récord de la Semana card with weekly record entry', () => {
    const record = makeEntry({ displayName: 'TopPlayer', bestScore: 2500, bestScorePrecision: 99 });
    mockUseWeeklyRecord.mockReturnValue({ data: record, isLoading: false, isError: false });

    renderPage();

    expect(screen.getByText('Récord de la semana')).toBeDefined();
    expect(screen.getByText('TopPlayer')).toBeDefined();
  });

  it('renders empty state for Récord de la Semana when no data', () => {
    mockUseWeeklyRecord.mockReturnValue({ data: null, isLoading: false, isError: false });

    renderPage();

    expect(screen.getByText('Sin récord esta semana')).toBeDefined();
  });

  it('links weekly record player name to profile page', () => {
    const record = makeEntry({ displayName: 'TopPlayer', slug: 'top-abc' });
    mockUseWeeklyRecord.mockReturnValue({ data: record, isLoading: false, isError: false });

    renderPage();

    const nameEl = screen.getByText('TopPlayer');
    expect(nameEl.closest('a')).toBeTruthy();
    expect(nameEl.closest('a')?.getAttribute('href')).toBe('/u/top-abc');
  });

  it('highlights own row with bg-primary/10 when userId matches', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [
        makeEntry({ userId: 'current-user', displayName: 'Me', position: 1 }),
        makeEntry({ userId: 'other-user', displayName: 'Other', position: 2 }),
      ],
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'current-user', displayName: 'Me' } });

    const { container } = renderPage();

    const ownRow = Array.from(container.querySelectorAll('tbody tr')).find(
      (tr) => tr.className.includes('bg-primary')
    );
    expect(ownRow).toBeTruthy();
  });

  it('does not highlight rows when user is not authenticated', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry({ userId: 'some-user' })],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });

    const { container } = renderPage();

    const highlightedRow = Array.from(container.querySelectorAll('tbody tr')).find(
      (tr) => tr.className.includes('bg-primary')
    );
    expect(highlightedRow).toBeUndefined();
  });

  it('uses rounded-full for pagination buttons', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 250, page: 1, limit: 100, totalPages: 3 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const prevBtn = screen.getByLabelText('Página anterior');
    const nextBtn = screen.getByLabelText('Página siguiente');
    expect(prevBtn.className.includes('rounded-full')).toBe(true);
    expect(nextBtn.className.includes('rounded-full')).toBe(true);
  });
});
