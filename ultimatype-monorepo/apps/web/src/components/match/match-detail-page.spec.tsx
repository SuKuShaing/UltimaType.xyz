import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchDetailPage } from './match-detail-page';
import type { MatchDetailDto } from '@ultimatype-monorepo/shared';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ matchCode: 'ABC123' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../hooks/use-match-detail', () => ({
  useMatchDetail: vi.fn(),
}));

import { useMatchDetail } from '../../hooks/use-match-detail';
const mockUseMatchDetail = useMatchDetail as ReturnType<typeof vi.fn>;

const defaultMatch: MatchDetailDto = {
  matchCode: 'ABC123',
  level: 3,
  createdAt: '2026-04-02T12:00:00Z',
  participants: [
    {
      displayName: 'Player 1',
      avatarUrl: null,
      countryCode: 'AR',
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
    expect(screen.getByText('829')).toBeDefined();
    expect(screen.getByText('645')).toBeDefined();
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

  it('muestra estado "No terminó" para participante que no finalizó', () => {
    const match: MatchDetailDto = {
      ...defaultMatch,
      participants: [
        { ...defaultMatch.participants[0], finished: false, finishedAt: null },
      ],
    };
    mockUseMatchDetail.mockReturnValue({ data: match, isLoading: false, isError: false });

    render(<MatchDetailPage />);

    expect(screen.getByText('No terminó')).toBeDefined();
    expect(screen.getByText('—')).toBeDefined();
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

  it('botón volver llama navigate(-1)', () => {
    render(<MatchDetailPage />);

    fireEvent.click(screen.getByLabelText('Volver'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
