import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchHistorySection } from './match-history-section';
import type { PaginatedResponse, MatchResultDto, MatchStatsDto } from '@ultimatype-monorepo/shared';

vi.mock('../../hooks/use-match-history', () => ({
  useMatchHistory: vi.fn(),
}));

vi.mock('../../hooks/use-match-stats', () => ({
  useMatchStats: vi.fn(),
}));

import { useMatchHistory } from '../../hooks/use-match-history';
import { useMatchStats } from '../../hooks/use-match-stats';

const mockUseMatchHistory = useMatchHistory as ReturnType<typeof vi.fn>;
const mockUseMatchStats = useMatchStats as ReturnType<typeof vi.fn>;

const makeHistoryResult = (overrides: Partial<MatchResultDto> = {}): MatchResultDto => ({
  id: 'r1',
  matchCode: 'ABC123',
  wpm: 85.5,
  precision: 97,
  score: 829.35,
  missingChars: 0,
  level: 3,
  finished: true,
  finishedAt: '2026-04-02T12:00:00Z',
  rank: 1,
  createdAt: '2026-04-02T12:00:00Z',
  ...overrides,
});

const defaultStats: MatchStatsDto = { avgWpm: 85.5, bestWpm: 120.3, totalMatches: 10 };

const emptyHistory: PaginatedResponse<MatchResultDto> = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMatchStats.mockReturnValue({ data: defaultStats, isLoading: false });
  mockUseMatchHistory.mockReturnValue({ data: emptyHistory, isLoading: false });
});

describe('MatchHistorySection', () => {
  it('muestra las 3 tarjetas de stats', () => {
    render(<MatchHistorySection />);

    expect(screen.getByText('WPM Promedio')).toBeDefined();
    expect(screen.getByText('Mejor WPM')).toBeDefined();
    expect(screen.getByText('Partidas')).toBeDefined();
  });

  it('muestra los valores de stats', () => {
    render(<MatchHistorySection />);

    expect(screen.getByText('85.5')).toBeDefined();
    expect(screen.getByText('120.3')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
  });

  it('estado loading muestra underscore mientras carga', () => {
    mockUseMatchStats.mockReturnValue({ data: undefined, isLoading: true });
    mockUseMatchHistory.mockReturnValue({ data: undefined, isLoading: true });

    render(<MatchHistorySection />);

    const underscores = screen.getAllByText('_');
    expect(underscores.length).toBeGreaterThanOrEqual(1);
  });

  it('estado vacío sin filtros muestra mensaje general', () => {
    render(<MatchHistorySection />);

    expect(screen.getByText('Aún no tienes partidas registradas')).toBeDefined();
  });

  it('estado vacío con filtro de periodo muestra mensaje específico', () => {
    render(<MatchHistorySection />);

    const btn7d = screen.getByRole('button', { name: /Últimos 7 días/i });
    fireEvent.click(btn7d);

    expect(screen.getByText('Sin partidas en este período')).toBeDefined();
  });

  it('estado vacío con filtro de nivel muestra mensaje específico', () => {
    render(<MatchHistorySection />);

    const btnLevel = screen.getByRole('button', { name: /3 Puntuación/i });
    fireEvent.click(btnLevel);

    expect(screen.getByText('Sin partidas en este período')).toBeDefined();
  });

  it('renderiza lista de partidas con datos', () => {
    const matchData: PaginatedResponse<MatchResultDto> = {
      data: [
        makeHistoryResult({ wpm: 92.3, precision: 98, level: 2, rank: 1, finished: true }),
        makeHistoryResult({ id: 'r2', wpm: 74.1, precision: 95, level: 3, rank: 2, finished: true }),
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    };
    mockUseMatchHistory.mockReturnValue({ data: matchData, isLoading: false });

    render(<MatchHistorySection />);

    expect(screen.getByText('92.3')).toBeDefined();
    expect(screen.getByText('74.1')).toBeDefined();
    expect(screen.getByText('98%')).toBeDefined();
    expect(screen.getByText('95%')).toBeDefined();
  });

  it('muestra guión para partidas no terminadas en la columna rank', () => {
    const matchData: PaginatedResponse<MatchResultDto> = {
      data: [makeHistoryResult({ finished: false, rank: 3 })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    mockUseMatchHistory.mockReturnValue({ data: matchData, isLoading: false });

    render(<MatchHistorySection />);

    expect(screen.getByText('—')).toBeDefined();
  });

  it('muestra nombre del nivel usando DIFFICULTY_LEVELS', () => {
    const matchData: PaginatedResponse<MatchResultDto> = {
      data: [makeHistoryResult({ level: 1 })],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    mockUseMatchHistory.mockReturnValue({ data: matchData, isLoading: false });

    render(<MatchHistorySection />);

    expect(screen.getByText('Minúscula')).toBeDefined();
  });

  it('botón periodo activo tiene aria-pressed=true', () => {
    render(<MatchHistorySection />);

    const btnAll = screen.getByRole('button', { name: /Todo el tiempo/i });
    expect(btnAll.getAttribute('aria-pressed')).toBe('true');
  });

  it('clic en filtro de periodo cambia el activo', () => {
    render(<MatchHistorySection />);

    const btn7d = screen.getByRole('button', { name: /Últimos 7 días/i });
    fireEvent.click(btn7d);

    expect(btn7d.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Todo el tiempo/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('clic en filtro de nivel cambia el activo', () => {
    render(<MatchHistorySection />);

    const btnLevel3 = screen.getByRole('button', { name: /3 Puntuación/i });
    fireEvent.click(btnLevel3);

    expect(btnLevel3.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Todos los niveles/i }).getAttribute('aria-pressed')).toBe('false');
  });

  it('no muestra paginación si solo hay 1 página', () => {
    const matchData: PaginatedResponse<MatchResultDto> = {
      data: [makeHistoryResult()],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    };
    mockUseMatchHistory.mockReturnValue({ data: matchData, isLoading: false });

    render(<MatchHistorySection />);

    expect(screen.queryByLabelText('Página anterior')).toBeNull();
    expect(screen.queryByLabelText('Página siguiente')).toBeNull();
  });

  it('muestra paginación con múltiples páginas', () => {
    const matchData: PaginatedResponse<MatchResultDto> = {
      data: [makeHistoryResult()],
      meta: { total: 50, page: 1, limit: 20, totalPages: 3 },
    };
    mockUseMatchHistory.mockReturnValue({ data: matchData, isLoading: false });

    render(<MatchHistorySection />);

    expect(screen.getByLabelText('Página anterior')).toBeDefined();
    expect(screen.getByLabelText('Página siguiente')).toBeDefined();
    expect(screen.getByText('1 / 3')).toBeDefined();
  });
});
