import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchDetailPage } from './match-detail-page';
import type { MatchDetailDto } from '@ultimatype-monorepo/shared';
import { useMatchDetail } from '../../hooks/use-match-detail';
import { useAuth } from '../../hooks/use-auth';

const mockNavigate = vi.fn();
const mockLocation = { key: 'abc-123', pathname: '/match/ABC123' };
vi.mock('react-router-dom', () => ({
  useParams: () => ({ matchCode: 'ABC123' }),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/use-match-detail', () => ({
  useMatchDetail: vi.fn(),
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

const mockUseMatchDetail = useMatchDetail as ReturnType<typeof vi.fn>;
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const defaultMatch: MatchDetailDto = {
  matchCode: 'ABC123',
  level: 3,
  createdAt: '2026-04-02T12:00:00Z',
  participants: [
    {
      displayName: 'Player 1',
      avatarUrl: null,
      countryCode: 'AR',
      slug: 'p1-abc',
      wpm: 85.5,
      precision: 97,
      score: 829,
      missingChars: 0,
      rank: 1,
      finished: true,
      finishedAt: '2026-04-02T12:05:00Z',
    },
    {
      displayName: 'Player 2',
      avatarUrl: 'http://img.png',
      countryCode: 'CL',
      slug: 'p2-def',
      wpm: 70.2,
      precision: 92,
      score: 645,
      missingChars: 5,
      rank: 2,
      finished: true,
      finishedAt: '2026-04-02T12:06:00Z',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMatchDetail.mockReturnValue({ data: defaultMatch, isLoading: false, isError: false });
  mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
  mockLocation.key = 'abc-123';
});

describe('MatchDetailPage', () => {
  it('muestra el código de partida y nivel', () => {
    render(<MatchDetailPage />);

    expect(screen.getByText('Partida ABC123')).toBeDefined();
    expect(screen.getByText(/Puntuación/)).toBeDefined();
  });

  it('muestra todos los participantes con sus datos', () => {
    render(<MatchDetailPage />);

    expect(screen.getByText('Player 1')).toBeDefined();
    expect(screen.getByText('Player 2')).toBeDefined();
    expect(screen.getByText('829.0')).toBeDefined();
    expect(screen.getByText('645.0')).toBeDefined();
    expect(screen.getByText('85.5')).toBeDefined();
    expect(screen.getByText('97%')).toBeDefined();
  });

  it('muestra avatar con inicial si no tiene avatarUrl', () => {
    render(<MatchDetailPage />);

    expect(screen.getByText('P')).toBeDefined();
  });

  it('muestra imagen si tiene avatarUrl', () => {
    const { container } = render(<MatchDetailPage />);

    const img = container.querySelector('img[src="http://img.png"]');
    expect(img).not.toBeNull();
  });

  it('should link player names to public profiles', () => {
    render(<MatchDetailPage />);

    const p1Link = screen.getByText('Player 1').closest('a');
    expect(p1Link?.getAttribute('href')).toBe('/u/p1-abc');
    const p2Link = screen.getByText('Player 2').closest('a');
    expect(p2Link?.getAttribute('href')).toBe('/u/p2-def');
  });

  it('muestra estado "No completada" y rank para participante que no finalizó', () => {
    const match: MatchDetailDto = {
      ...defaultMatch,
      participants: [
        { ...defaultMatch.participants[0], finished: false, finishedAt: null, rank: 2 },
      ],
    };
    mockUseMatchDetail.mockReturnValue({ data: match, isLoading: false, isError: false });

    render(<MatchDetailPage />);

    expect(screen.getByText('No completada')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('muestra skeletons durante la carga', () => {
    mockUseMatchDetail.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    const { container } = render(<MatchDetailPage />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('muestra error con botón reintentar', () => {
    const refetchFn = vi.fn();
    mockUseMatchDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: refetchFn });

    render(<MatchDetailPage />);

    expect(screen.getByText('Error al cargar la partida')).toBeDefined();
    fireEvent.click(screen.getByText('Reintentar'));
    expect(refetchFn).toHaveBeenCalledTimes(1);
  });

  it('botón volver llama navigate(-1) cuando viene de otra ruta del SPA', () => {
    mockLocation.key = 'spa-nav-key-xyz';

    render(<MatchDetailPage />);

    fireEvent.click(screen.getByLabelText('Volver'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('botón volver navega a / cuando es entrada inicial al SPA (link directo externo)', () => {
    mockLocation.key = 'default';

    render(<MatchDetailPage />);

    fireEvent.click(screen.getByLabelText('Volver'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('muestra CTA para visitantes no autenticados', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });

    render(<MatchDetailPage />);

    expect(screen.getByText('Comienza a competir')).toBeDefined();
  });

  it('no muestra CTA para usuarios autenticados', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' } });

    render(<MatchDetailPage />);

    expect(screen.queryByText('Comienza a competir')).toBeNull();
  });
});
