import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LeaderboardPage } from './leaderboard-page';
import type { PaginatedResponse, LeaderboardEntryDto, UserLeaderboardPositionDto } from '@ultimatype-monorepo/shared';

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-leaderboard', () => ({
  useLeaderboard: vi.fn(),
}));

vi.mock('../../hooks/use-leaderboard-position', () => ({
  useLeaderboardPosition: vi.fn(),
}));

import { useAuth } from '../../hooks/use-auth';
import { useLeaderboard } from '../../hooks/use-leaderboard';
import { useLeaderboardPosition } from '../../hooks/use-leaderboard-position';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLeaderboard = useLeaderboard as ReturnType<typeof vi.fn>;
const mockUseLeaderboardPosition = useLeaderboardPosition as ReturnType<typeof vi.fn>;

const makeEntry = (overrides: Partial<LeaderboardEntryDto> = {}): LeaderboardEntryDto => ({
  position: 1,
  displayName: 'Alice',
  avatarUrl: 'http://example.com/alice.jpg',
  countryCode: 'AR',
  bestScore: 1200,
  avgPrecision: 98.5,
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
      <MemoryRouter>
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
        makeEntry({ position: 1, displayName: 'Alice', bestScore: 1200, avgPrecision: 98.5 }),
        makeEntry({ position: 2, displayName: 'Bob', bestScore: 1100, avgPrecision: 95.0, avatarUrl: null, countryCode: 'CL' }),
      ],
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('98.5%')).toBeTruthy();
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('should show position widget when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: defaultPosition, isLoading: false });

    renderPage();

    expect(screen.getByText('Tu posición')).toBeTruthy();
    expect(screen.getByText('#5')).toBeTruthy();
    expect(screen.getByText(/Top 96% del mundo/)).toBeTruthy();
    expect(screen.getByText(/#2/)).toBeTruthy();
  });

  it('should not show position widget when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });

    renderPage();

    expect(screen.queryByText('Tu posición')).toBeNull();
  });

  it('should show empty message when position is null (no matches)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: null, isLoading: false });

    renderPage();

    expect(screen.getByText('Juega tu primera partida para aparecer en el ranking')).toBeTruthy();
  });

  it('should render level filter buttons', () => {
    renderPage();

    expect(screen.getByText('Todos los niveles')).toBeTruthy();
    expect(screen.getByText(/Minúscula/)).toBeTruthy();
  });

  it('should change level filter and reset page', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    const levelButton = screen.getByText(/Minúscula/);
    fireEvent.click(levelButton);

    expect(mockUseLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ level: 1, page: 1 }),
    );
  });

  it('should show empty state for filtered view', () => {
    mockUseLeaderboard.mockReturnValue({ data: emptyLeaderboard, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    // Click a level filter to trigger filtered empty state
    const levelButton = screen.getByText(/Minúscula/);
    fireEvent.click(levelButton);

    expect(screen.getByText('No hay jugadores registrados en este nivel')).toBeTruthy();
  });

  it('should show error state with retry button', () => {
    const refetch = vi.fn();
    mockUseLeaderboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    renderPage();

    expect(screen.getByText('Error al cargar el ranking')).toBeTruthy();
    const retryButton = screen.getByText('Reintentar');
    fireEvent.click(retryButton);
    expect(refetch).toHaveBeenCalled();
  });

  it('should render match code as link in position widget', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: defaultPosition, isLoading: false });

    renderPage();

    const link = screen.getByText('ABC123');
    expect(link.closest('a')).toBeTruthy();
    expect(link.closest('a')?.getAttribute('href')).toBe('/match/ABC123');
  });

  it('should show pagination when multiple pages exist', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry()],
      meta: { total: 250, page: 1, limit: 100, totalPages: 3 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByLabelText('Página anterior')).toBeTruthy();
    expect(screen.getByLabelText('Página siguiente')).toBeTruthy();
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

  it('should not show country row in widget when user has no country', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({
      data: { ...defaultPosition, countryCode: null, countryRank: null, countryTotal: null, countryPercentile: null },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Tu posición')).toBeTruthy();
    expect(screen.getByText('#5')).toBeTruthy();
    expect(screen.queryByText('Argentina')).toBeNull();
  });

  it('should show position loading skeletons while loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { displayName: 'Test' } });
    mockUseLeaderboardPosition.mockReturnValue({ data: null, isLoading: true });

    renderPage();

    const positionSection = screen.getByText('Tu posición').closest('div');
    const skeletons = positionSection?.querySelectorAll('.animate-pulse');
    expect(skeletons?.length).toBeGreaterThan(0);
  });

  it('should display avatar initials when avatarUrl is null', () => {
    const data: PaginatedResponse<LeaderboardEntryDto> = {
      data: [makeEntry({ displayName: 'Bob', avatarUrl: null })],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    };
    mockUseLeaderboard.mockReturnValue({ data, isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText('B')).toBeTruthy();
  });
});
