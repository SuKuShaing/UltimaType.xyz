import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerProfileSection } from './player-profile-section';
import { useAuth } from '../../hooks/use-auth';
import { useLeaderboardPosition } from '../../hooks/use-leaderboard-position';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../hooks/use-leaderboard-position', () => ({
  useLeaderboardPosition: vi.fn(),
}));

vi.mock('../ui/login-modal', () => ({
  LoginModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="login-modal">
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseLeaderboardPosition = useLeaderboardPosition as ReturnType<typeof vi.fn>;

const mockUser = {
  id: 'user-1',
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

const mockUserNoAvatar = { ...mockUser, avatarUrl: null };

const mockPosition = {
  bestScore: 1234.5,
  bestScoreMatchCode: 'ABC123',
  bestScoreDate: '2026-04-01',
  globalRank: 42,
  globalTotal: 500,
  globalPercentile: 8,
  countryRank: 3,
  countryTotal: 50,
  countryPercentile: 6,
  countryCode: 'CL',
};

const mockLoginWithGoogle = vi.fn();

function setup(
  authOverrides: Partial<ReturnType<typeof useAuth>> = {},
  positionData: any = undefined,
  positionLoading = false,
  positionError = false,
) {
  mockUseAuth.mockReturnValue({
    user: undefined,
    isAuthenticated: false,
    isFetchingProfile: false,
    loginWithGoogle: mockLoginWithGoogle,
    loginWithGithub: vi.fn(),
    logout: vi.fn(),
    ...authOverrides,
  });
  mockUseLeaderboardPosition.mockReturnValue({
    data: positionData,
    isLoading: positionLoading,
    isError: positionError,
  });
  return render(<PlayerProfileSection />);
}

describe('PlayerProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Estructura base (AC5)', () => {
    it('mantiene las clases de grid col-span-12 lg:col-span-4', () => {
      setup();
      const section = document.querySelector('section');
      expect(section!.classList.contains('col-span-12')).toBe(true);
      expect(section!.classList.contains('lg:col-span-4')).toBe(true);
    });

    it('mantiene rounded-card y bg-surface-sunken', () => {
      setup();
      const section = document.querySelector('section');
      expect(section!.classList.contains('rounded-card')).toBe(true);
      expect(section!.classList.contains('bg-surface-sunken')).toBe(true);
    });

    it('muestra el encabezado "Tu Perfil" con label-md typography', () => {
      setup();
      const h2 = screen.getByText('Tu Perfil');
      expect(h2.tagName).toBe('H2');
      expect(h2.classList.contains('text-xs')).toBe(true);
      expect(h2.classList.contains('font-bold')).toBe(true);
      expect(h2.classList.contains('uppercase')).toBe(true);
      expect(h2.classList.contains('tracking-widest')).toBe(true);
      expect(h2.classList.contains('text-text-muted')).toBe(true);
    });

    it('no tiene clases border', () => {
      setup();
      const section = document.querySelector('section');
      expect(section!.className.includes('border')).toBe(false);
    });
  });

  describe('Estado de carga — auth loading (AC4)', () => {
    it('muestra skeleton cuando isFetchingProfile es true', () => {
      setup({ isFetchingProfile: true, isAuthenticated: false });
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeTruthy();
    });

    it('no muestra CTA mientras carga el perfil', () => {
      setup({ isFetchingProfile: true, isAuthenticated: false });
      expect(screen.queryByText('Inicia sesión para ver tu ranking')).toBeNull();
    });
  });

  describe('Estado de carga — position loading (AC4)', () => {
    it('muestra skeleton cuando isPositionLoading es true', () => {
      setup({ isAuthenticated: true, user: mockUser }, undefined, true);
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeTruthy();
    });

    it('no muestra contenido de tarjeta mientras carga la posición', () => {
      setup({ isAuthenticated: true, user: mockUser }, undefined, true);
      expect(screen.queryByText('Mejor Puntaje')).toBeNull();
    });
  });

  describe('Estado de error', () => {
    it('muestra mensaje de error cuando la query falla', () => {
      setup({ isAuthenticated: true, user: mockUser }, undefined, false, true);
      expect(
        screen.getByText('Error al cargar tus datos, estamos reintentando…'),
      ).toBeTruthy();
    });

    it('no muestra skeleton ni tarjeta cuando hay error', () => {
      setup({ isAuthenticated: true, user: mockUser }, undefined, false, true);
      expect(document.querySelector('.animate-pulse')).toBeNull();
      expect(screen.queryByText('Mejor Puntaje')).toBeNull();
    });
  });

  describe('CTA para no autenticados (AC3)', () => {
    it('muestra texto "Inicia sesión para ver tu ranking"', () => {
      setup();
      expect(screen.getByText('Inicia sesión para ver tu ranking')).toBeTruthy();
    });

    it('muestra botón "Iniciar sesión"', () => {
      setup();
      const btn = screen.getByRole('button', { name: 'Iniciar sesión' });
      expect(btn).toBeTruthy();
    });

    it('el botón abre LoginModal al hacer click', () => {
      setup();
      expect(screen.queryByTestId('login-modal')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
      expect(screen.getByTestId('login-modal')).toBeTruthy();
    });

    it('el botón tiene type="button"', () => {
      setup();
      const btn = screen.getByRole('button', { name: 'Iniciar sesión' });
      expect((btn as HTMLButtonElement).type).toBe('button');
    });

    it('el botón tiene aria-haspopup="dialog" y aria-expanded', () => {
      setup();
      const btn = screen.getByRole('button', { name: 'Iniciar sesión' });
      expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(btn);
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    });

    it('no muestra el mensaje de sin historial', () => {
      setup();
      expect(screen.queryByText(/primera partida/)).toBeNull();
    });
  });

  describe('Estado sin historial (AC2)', () => {
    it('muestra mensaje "Juega tu primera partida para aparecer en el ranking"', () => {
      setup({ isAuthenticated: true, user: mockUser }, null);
      expect(
        screen.getByText('Juega tu primera partida para aparecer en el ranking'),
      ).toBeTruthy();
    });

    it('muestra avatar del usuario', () => {
      setup({ isAuthenticated: true, user: mockUser }, null);
      const img = document.querySelector('img') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toBe('https://example.com/avatar.jpg');
    });

    it('muestra iniciales cuando no hay avatarUrl', () => {
      setup({ isAuthenticated: true, user: mockUserNoAvatar }, null);
      const initials = screen.getByText('S');
      expect(initials).toBeTruthy();
    });

    it('iniciales del fallback tienen bg-primary/10', () => {
      setup({ isAuthenticated: true, user: mockUserNoAvatar }, null);
      const initials = screen.getByText('S');
      expect(initials.className.includes('bg-primary/10')).toBe(true);
    });

    it('muestra el nombre del usuario', () => {
      setup({ isAuthenticated: true, user: mockUser }, null);
      expect(screen.getByText('Seba Dev')).toBeTruthy();
    });

    it('nombre es link a /u/seba-dev', () => {
      setup({ isAuthenticated: true, user: mockUser }, null);
      const link = screen.getByText('Seba Dev').closest('a');
      expect(link!.getAttribute('href')).toBe('/u/seba-dev');
    });

    it('no muestra CTA de login', () => {
      setup({ isAuthenticated: true, user: mockUser }, null);
      expect(screen.queryByText('Ingresar con Google')).toBeNull();
    });
  });

  describe('Tarjeta completa con historial (AC1)', () => {
    it('muestra la etiqueta "Mejor Puntaje"', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      expect(screen.getByText('Mejor Puntaje')).toBeTruthy();
    });

    it('muestra el puntaje en font-mono', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      const monoEls = document.querySelectorAll('.font-mono');
      const hasPuntaje = Array.from(monoEls).some((el) =>
        el.textContent!.includes('1234'),
      );
      expect(hasPuntaje).toBe(true);
    });

    it('muestra el ranking "Top X% Mundial"', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      expect(screen.getByText('Top 8% Mundial')).toBeTruthy();
    });

    it('muestra avatar con imagen cuando avatarUrl existe', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      const img = document.querySelector('img') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toBe('https://example.com/avatar.jpg');
    });

    it('muestra iniciales con bg-primary/10 cuando no hay avatarUrl', () => {
      setup({ isAuthenticated: true, user: mockUserNoAvatar }, mockPosition);
      const initials = screen.getByText('S');
      expect(initials.className.includes('bg-primary/10')).toBe(true);
    });

    it('el nombre es un link a /u/seba-dev', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      const nameLink = screen.getByText('Seba Dev').closest('a');
      expect(nameLink!.getAttribute('href')).toBe('/u/seba-dev');
    });

    it('muestra el link "Ver mi perfil →"', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      expect(screen.getByText('Ver mi perfil →')).toBeTruthy();
    });

    it('"Ver mi perfil →" navega a /u/seba-dev', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      const link = screen.getByText('Ver mi perfil →').closest('a');
      expect(link!.getAttribute('href')).toBe('/u/seba-dev');
    });

    it('no muestra el mensaje de primera partida', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      expect(screen.queryByText(/primera partida/)).toBeNull();
    });

    it('no muestra CTA de login', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      expect(screen.queryByText('Ingresar con Google')).toBeNull();
    });

    it('llama a useLeaderboardPosition con level:null y period:"all"', () => {
      setup({ isAuthenticated: true, user: mockUser }, mockPosition);
      expect(mockUseLeaderboardPosition).toHaveBeenCalledWith({
        level: null,
        period: 'all',
      });
    });
  });
});
