import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicProfilePage } from './public-profile-page';
import type { PublicUserProfileDto, MatchStatsDto, PaginatedResponse, MatchResultDto } from '@ultimatype-monorepo/shared';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'ss-abc' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-public-profile', () => ({
  usePublicProfile: vi.fn(),
}));

vi.mock('../../hooks/use-user-matches', () => ({
  useUserMatches: vi.fn(),
}));

vi.mock('../../hooks/use-user-stats', () => ({
  useUserStats: vi.fn(),
}));

vi.mock('../ui/country-flag', () => ({
  CountryFlag: ({ countryCode }: { countryCode: string | null }) =>
    countryCode ? <span data-testid="flag">{countryCode}</span> : null,
}));

import { useAuth } from '../../hooks/use-auth';
import { usePublicProfile } from '../../hooks/use-public-profile';
import { useUserMatches } from '../../hooks/use-user-matches';
import { useUserStats } from '../../hooks/use-user-stats';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUsePublicProfile = usePublicProfile as ReturnType<typeof vi.fn>;
const mockUseUserMatches = useUserMatches as ReturnType<typeof vi.fn>;
const mockUseUserStats = useUserStats as ReturnType<typeof vi.fn>;

const defaultProfile: PublicUserProfileDto = {
  id: 'user-1',
  displayName: 'Seba Sanhueza',
  avatarUrl: 'http://img.png',
  countryCode: 'CL',
  slug: 'ss-abc',
  createdAt: '2026-01-15T00:00:00Z',
};

const defaultStats: MatchStatsDto = {
  avgScore: 150.5,
  avgPrecision: 92,
  bestScore: 210,
  totalMatches: 15,
};

const emptyMatches: PaginatedResponse<MatchResultDto> = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: false });
  mockUsePublicProfile.mockReturnValue({ data: defaultProfile, isLoading: false, isError: false });
  mockUseUserStats.mockReturnValue({ data: defaultStats, isLoading: false });
  mockUseUserMatches.mockReturnValue({ data: emptyMatches, isLoading: false });
});

describe('PublicProfilePage', () => {
  it('should show loading spinner while profile loads', () => {
    mockUsePublicProfile.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    const { container } = render(<PublicProfilePage />);

    expect(container.textContent).toContain('_');
  });

  it('should show 404 when profile not found', () => {
    mockUsePublicProfile.mockReturnValue({ data: null, isLoading: false, isError: true });

    render(<PublicProfilePage />);

    expect(screen.getByText('Usuario no encontrado')).toBeTruthy();
  });

  it('should display profile hero with displayName, avatar, and country', () => {
    render(<PublicProfilePage />);

    expect(screen.getByText('Seba Sanhueza')).toBeTruthy();
    expect(screen.getByTestId('flag')).toBeTruthy();
    expect(screen.getByText(/Jugador desde enero 2026/)).toBeTruthy();
  });

  it('should display stats cards', () => {
    render(<PublicProfilePage />);

    expect(screen.getByText('210')).toBeTruthy();
    expect(screen.getByText('150.5')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('Mejor Puntaje')).toBeTruthy();
    expect(screen.getByText('Puntaje Promedio')).toBeTruthy();
    expect(screen.getByText('Total Partidas')).toBeTruthy();
  });

  it('should show CTA for unauthenticated visitors', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    render(<PublicProfilePage />);

    const cta = screen.getByTestId('cta-login');
    expect(cta).toBeTruthy();
    expect(cta.textContent).toBe('Comienza a competir');
  });

  it('should NOT show CTA for authenticated visitors', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    render(<PublicProfilePage />);

    expect(screen.queryByTestId('cta-login')).toBeNull();
  });

  it('should show empty state when no matches', () => {
    render(<PublicProfilePage />);

    expect(screen.getByText('Sin partidas registradas')).toBeTruthy();
  });

  it('should show initials when no avatar', () => {
    mockUsePublicProfile.mockReturnValue({
      data: { ...defaultProfile, avatarUrl: null },
      isLoading: false,
      isError: false,
    });

    render(<PublicProfilePage />);

    expect(screen.getByText('SS')).toBeTruthy();
  });
});
