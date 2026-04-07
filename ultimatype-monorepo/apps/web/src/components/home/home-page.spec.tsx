import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomePage } from './home-page';
import { useAuth } from '../../hooks/use-auth';

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

vi.mock('../../lib/api-client', () => ({
  apiClient: vi.fn().mockResolvedValue({ code: 'TESTCD' }),
}));

vi.mock('../ui/login-modal', () => ({
  LoginModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="login-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../../hooks/use-active-rooms', () => ({
  useActiveRooms: vi.fn(() => ({ data: { rooms: [] }, isLoading: false })),
}));

vi.mock('../../hooks/use-leaderboard-preview', () => ({
  useLeaderboardPreview: vi.fn(() => ({ data: { data: [], meta: { total: 0, page: 1, limit: 5, totalPages: 0 } }, isLoading: false })),
}));

vi.mock('../../hooks/use-leaderboard-position', () => ({
  useLeaderboardPosition: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock('../ui/country-flag', () => ({
  CountryFlag: () => null,
}));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => {
    const extractTitle = (nodes: React.ReactNode): string => {
      if (!nodes) return '';
      if (Array.isArray(nodes)) return nodes.map(extractTitle).join('');
      if (typeof nodes === 'object' && nodes !== null && 'props' in nodes) {
        const el = nodes as React.ReactElement<any>;
        if (el.type === 'title') return el.props.children || '';
        return extractTitle(el.props.children);
      }
      return String(nodes);
    };
    return <div data-testid="helmet" data-title={extractTitle(children)} />;
  },
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

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

function setup(overrides?: Partial<ReturnType<typeof useAuth>>) {
  mockUseAuth.mockReturnValue({
    user: undefined,
    isAuthenticated: false,
    isFetchingProfile: false,
    loginWithGoogle: vi.fn(),
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
  return render(<HomePage />);
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  describe('Grid layout', () => {
    it('renders 12-column grid container', () => {
      setup();
      const grid = document.querySelector('.grid-cols-12');
      expect(grid).toBeTruthy();
      expect(grid!.classList.contains('gap-6')).toBe(true);
      expect(grid!.classList.contains('max-w-6xl')).toBe(true);
    });

    it('renders all 4 sections', () => {
      setup();
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBe(4);
    });

    it('GameActionsSection has correct responsive grid classes', () => {
      setup();
      const gameActions = screen.getByText('Modo de juego').closest('section');
      expect(gameActions).toBeTruthy();
      expect(gameActions!.classList.contains('col-span-12')).toBe(true);
      expect(gameActions!.classList.contains('lg:col-span-8')).toBe(true);
    });

    it('LiveMatchesSection has correct responsive grid classes', () => {
      setup();
      const liveMatches = screen.getByText('Partidas en Vivo').closest('section');
      expect(liveMatches).toBeTruthy();
      expect(liveMatches!.classList.contains('col-span-12')).toBe(true);
      expect(liveMatches!.classList.contains('lg:col-span-4')).toBe(true);
    });

    it('LeaderboardPreviewSection has correct responsive grid classes', () => {
      setup();
      const leaderboard = screen
        .getByText('Clasificación Global')
        .closest('section');
      expect(leaderboard).toBeTruthy();
      expect(leaderboard!.classList.contains('col-span-12')).toBe(true);
      expect(leaderboard!.classList.contains('lg:col-span-8')).toBe(true);
    });

    it('PlayerProfileSection has correct responsive grid classes', () => {
      setup();
      const profile = screen.getByText('Tu Perfil').closest('section');
      expect(profile).toBeTruthy();
      expect(profile!.classList.contains('col-span-12')).toBe(true);
      expect(profile!.classList.contains('lg:col-span-4')).toBe(true);
    });
  });

  describe('Design system alignment', () => {
    it('sections use rounded-card and bg-surface-sunken', () => {
      setup();
      const sections = document.querySelectorAll('section');
      sections.forEach((section) => {
        expect(section.classList.contains('rounded-card')).toBe(true);
        expect(section.classList.contains('bg-surface-sunken')).toBe(true);
      });
    });

    it('section headers use label-md typography', () => {
      setup();
      const headers = document.querySelectorAll('h2');
      headers.forEach((header) => {
        expect(header.classList.contains('text-xs')).toBe(true);
        expect(header.classList.contains('font-bold')).toBe(true);
        expect(header.classList.contains('uppercase')).toBe(true);
        expect(header.classList.contains('tracking-widest')).toBe(true);
        expect(header.classList.contains('text-text-muted')).toBe(true);
      });
    });

    it('no border classes on any section', () => {
      setup();
      const sections = document.querySelectorAll('section');
      sections.forEach((section) => {
        const classes = section.className;
        expect(classes.includes('border')).toBe(false);
      });
    });
  });

  describe('Helmet', () => {
    it('sets page title', () => {
      setup();
      const helmet = screen.getByTestId('helmet');
      expect(
        helmet.getAttribute('data-title')
      ).toBe('UltimaType — Competencias de mecanografía en tiempo real');
    });
  });

  describe('Authenticated user', () => {
    it('renders "Crear partida" card', () => {
      setup({ isAuthenticated: true, user: authenticatedUser });
      expect(screen.getAllByText('Crear partida').length).toBeGreaterThan(0);
    });

    it('renders JoinRoomInput', () => {
      setup({ isAuthenticated: true, user: authenticatedUser });
      expect(
        screen.getByLabelText('Código de partida para unirse')
      ).toBeTruthy();
    });

    it('does not show greeting or logout button', () => {
      setup({ isAuthenticated: true, user: authenticatedUser });
      expect(screen.queryByText(/¡Hola/)).toBeNull();
      expect(screen.queryByText('Cerrar sesión')).toBeNull();
    });
  });

  describe('Unauthenticated user', () => {
    it('renders "Crear partida" card (not dimmed)', () => {
      setup();
      expect(screen.getAllByText('Crear partida').length).toBeGreaterThan(0);
    });

    it('renders JoinRoomInput', () => {
      setup();
      expect(
        screen.getByLabelText('Código de partida para unirse')
      ).toBeTruthy();
    });

    it('shows LoginModal when clicking "Crear partida"', () => {
      setup();
      expect(screen.queryByTestId('login-modal')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Crear una nueva partida' }));
      expect(screen.getByTestId('login-modal')).toBeTruthy();
    });
  });

  describe('JoinRoomInput', () => {
    it('validates room code format and shows error', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      const joinButton = screen.getByText('Unirse');

      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.click(joinButton);

      expect(
        screen.getByText('Código inválido (6 caracteres, letras y números)')
      ).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to room on valid code', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      const joinButton = screen.getByText('Unirse');

      fireEvent.change(input, { target: { value: 'ABC234' } });
      fireEvent.click(joinButton);

      expect(mockNavigate).toHaveBeenCalledWith('/room/ABC234');
    });

    it('navigates on Enter key press', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'XYZ789' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockNavigate).toHaveBeenCalledWith('/room/XYZ789');
    });

    it('uppercases input value', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'abc234' } });
      expect(input.value).toBe('ABC234');
    });

    it('clears error on input change', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      const joinButton = screen.getByText('Unirse');

      fireEvent.change(input, { target: { value: 'x' } });
      fireEvent.click(joinButton);
      expect(
        screen.getByText('Código inválido (6 caracteres, letras y números)')
      ).toBeTruthy();

      fireEvent.change(input, { target: { value: 'AB' } });
      expect(
        screen.queryByText('Código inválido (6 caracteres, letras y números)')
      ).toBeNull();
    });
  });

  describe('Placeholder sections', () => {
    it('LiveMatchesSection shows empty state when no active rooms', () => {
      setup();
      const section = screen.getByText('Partidas en Vivo').closest('section');
      expect(section!.textContent).toContain('No hay partidas en vivo');
    });

    it('LeaderboardPreviewSection shows navigation link to leaderboard', () => {
      setup();
      const section = screen
        .getByText('Clasificación Global')
        .closest('section');
      expect(section!.textContent).toContain('Ver clasificación completa');
    });

    it('PlayerProfileSection shows login CTA for unauthenticated user', () => {
      setup();
      const section = screen.getByText('Tu Perfil').closest('section');
      expect(section!.textContent).toContain('Inicia sesión para ver tu ranking');
    });
  });
});
