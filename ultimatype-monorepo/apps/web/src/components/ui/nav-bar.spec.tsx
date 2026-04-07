import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavBar } from './nav-bar';
import { useAuth } from '../../hooks/use-auth';

let mockPathname = '/';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

vi.mock('./login-modal', () => ({
  LoginModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="login-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./logo', () => ({
  Logo: () => <span data-testid="logo">UltimaType</span>,
}));

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

const authenticatedUser = {
  id: '1',
  provider: 'GOOGLE' as const,
  providerId: '123',
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
    handleCallback: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  mockPathname = '/';
  vi.clearAllMocks();
});

describe('NavBar', () => {
  describe('unauthenticated user', () => {
    it('renders Logo, tabs, ThemeToggle, and login button', () => {
      setup();
      render(<NavBar />);

      expect(screen.getByTestId('logo')).toBeTruthy();
      expect(screen.getByText('Principal')).toBeTruthy();
      expect(screen.getByText('Leaderboard')).toBeTruthy();
      expect(screen.getByTestId('theme-toggle')).toBeTruthy();
      expect(screen.getByText('Iniciar sesión')).toBeTruthy();
    });

    it('does not render avatar', () => {
      setup();
      render(<NavBar />);

      expect(screen.queryByAltText('Seba Dev')).toBeNull();
    });

    it('opens LoginModal when "Iniciar sesión" is clicked', () => {
      setup();
      render(<NavBar />);

      expect(screen.queryByTestId('login-modal')).toBeNull();
      fireEvent.click(screen.getByText('Iniciar sesión'));
      expect(screen.getByTestId('login-modal')).toBeTruthy();
    });
  });

  describe('authenticated user', () => {
    it('renders avatar button that opens user menu', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      const avatar = screen.getByAltText('Seba Dev');
      expect(avatar).toBeTruthy();
      expect(avatar.closest('button')).toBeTruthy();
    });

    it('opens dropdown with "Perfil" and "Cerrar sesión" on avatar click', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      expect(screen.queryByText('Perfil')).toBeNull();
      expect(screen.queryByText('Cerrar sesión')).toBeNull();

      fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));

      expect(screen.getByText('Perfil')).toBeTruthy();
      expect(screen.getByText('Cerrar sesión')).toBeTruthy();
    });

    it('"Perfil" links to /u/{slug}', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));

      const profileLink = screen.getByRole('menuitem', { name: 'Perfil' });
      expect(profileLink.closest('a')?.getAttribute('href')).toBe('/u/seba-dev');
    });

    it('"Cerrar sesión" calls logout', () => {
      const logoutFn = vi.fn();
      setup({ user: authenticatedUser, isAuthenticated: true, logout: logoutFn });
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

      expect(logoutFn).toHaveBeenCalledOnce();
    });

    it('closes dropdown on Escape key', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));
      expect(screen.getByText('Perfil')).toBeTruthy();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('closes dropdown on second avatar click', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú de usuario'));
      expect(screen.getByText('Perfil')).toBeTruthy();

      fireEvent.click(screen.getByLabelText('Cerrar menú de usuario'));
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('shows initials fallback when avatarUrl is null', () => {
      setup({
        user: { ...authenticatedUser, avatarUrl: null },
        isAuthenticated: true,
      });
      render(<NavBar />);

      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.getByText('SD')).toBeTruthy();
    });

    it('does not show "Iniciar sesión" button', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      expect(screen.queryByText('Iniciar sesión')).toBeNull();
    });

    it('shows initials fallback when avatar image fails to load', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      const img = screen.getByAltText('Seba Dev');
      expect(img).toBeTruthy();

      fireEvent.error(img);

      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.getByText('SD')).toBeTruthy();
    });

    it('resets imgError when avatarUrl changes', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      const { rerender } = render(<NavBar />);

      fireEvent.error(screen.getByAltText('Seba Dev'));
      expect(screen.queryByRole('img')).toBeNull();

      setup({
        user: { ...authenticatedUser, avatarUrl: 'https://example.com/new-avatar.jpg' },
        isAuthenticated: true,
      });
      rerender(<NavBar />);

      expect(screen.getByAltText('Seba Dev')).toBeTruthy();
    });
  });

  describe('active tab detection', () => {
    it('"Principal" tab has active styling when on home route', () => {
      mockPathname = '/';
      setup();
      render(<NavBar />);

      const principalLinks = screen.getAllByText('Principal');
      const desktopTab = principalLinks[0];
      expect(desktopTab.className).toContain('font-semibold');
      expect(desktopTab.className).toContain('text-text-main');
    });

    it('"Leaderboard" tab has active styling when on /leaderboard', () => {
      mockPathname = '/leaderboard';
      setup();
      render(<NavBar />);

      const leaderboardLinks = screen.getAllByText('Leaderboard');
      const desktopTab = leaderboardLinks[0];
      expect(desktopTab.className).toContain('font-semibold');
      expect(desktopTab.className).toContain('text-text-main');
    });

    it('"Principal" tab is inactive when on /leaderboard', () => {
      mockPathname = '/leaderboard';
      setup();
      render(<NavBar />);

      const principalLinks = screen.getAllByText('Principal');
      const desktopTab = principalLinks[0];
      expect(desktopTab.className).toContain('text-text-muted');
      expect(desktopTab.className).not.toContain('font-semibold');
    });

    it('neither tab highlighted on other routes', () => {
      mockPathname = '/u/seba-dev';
      setup();
      render(<NavBar />);

      const principalLinks = screen.getAllByText('Principal');
      const leaderboardLinks = screen.getAllByText('Leaderboard');
      expect(principalLinks[0].className).toContain('text-text-muted');
      expect(leaderboardLinks[0].className).toContain('text-text-muted');
    });
  });

  describe('Focus Fade contract', () => {
    it('nav element has nav-bar-global class', () => {
      setup();
      render(<NavBar />);

      const nav = screen.getByRole('navigation');
      expect(nav.classList.contains('nav-bar-global')).toBe(true);
    });
  });

  describe('hamburger menu', () => {
    it('hamburger button has md:hidden class (mobile-only)', () => {
      setup();
      render(<NavBar />);

      const hamburger = screen.getByLabelText('Abrir menú');
      expect(hamburger.classList.contains('md:hidden')).toBe(true);
    });

    it('desktop tabs container has hidden and md:flex classes', () => {
      setup();
      render(<NavBar />);

      const principalLinks = screen.getAllByText('Principal');
      const desktopContainer = principalLinks[0].parentElement!;
      expect(desktopContainer.classList.contains('hidden')).toBe(true);
      expect(desktopContainer.classList.contains('md:flex')).toBe(true);
    });

    it('opens mobile menu with nav links on hamburger click', () => {
      setup();
      render(<NavBar />);

      // Before click: only desktop tabs
      expect(screen.getAllByText('Principal')).toHaveLength(1);

      fireEvent.click(screen.getByLabelText('Abrir menú'));

      // After click: desktop + mobile tabs
      expect(screen.getAllByText('Principal')).toHaveLength(2);
      expect(screen.getByLabelText('Cerrar menú')).toBeTruthy();
    });

    it('closes mobile menu on second hamburger click', () => {
      setup();
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú'));
      expect(screen.getAllByText('Principal')).toHaveLength(2);

      fireEvent.click(screen.getByLabelText('Cerrar menú'));
      expect(screen.getAllByText('Principal')).toHaveLength(1);
    });

    it('closes mobile menu on Escape key', () => {
      setup();
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú'));
      expect(screen.getAllByText('Principal')).toHaveLength(2);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getAllByText('Principal')).toHaveLength(1);
    });

    it('mobile menu dropdown has md:hidden class', () => {
      setup();
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú'));

      const allPrincipal = screen.getAllByText('Principal');
      const mobileMenu = allPrincipal[1].parentElement!;
      expect(mobileMenu.classList.contains('md:hidden')).toBe(true);
    });

    it('shows "Perfil" and "Cerrar sesión" in mobile menu when authenticated', () => {
      setup({ user: authenticatedUser, isAuthenticated: true });
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú'));

      const allPerfil = screen.getAllByText('Perfil');
      // At least one "Perfil" in mobile menu
      expect(allPerfil.length).toBeGreaterThanOrEqual(1);

      const allCerrar = screen.getAllByText('Cerrar sesión');
      expect(allCerrar.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show "Perfil" or "Cerrar sesión" in mobile menu when not authenticated', () => {
      setup();
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú'));

      expect(screen.queryByText('Perfil')).toBeNull();
      expect(screen.queryByText('Cerrar sesión')).toBeNull();
    });

    it('calls logout from mobile menu "Cerrar sesión"', () => {
      const logoutFn = vi.fn();
      setup({ user: authenticatedUser, isAuthenticated: true, logout: logoutFn });
      render(<NavBar />);

      fireEvent.click(screen.getByLabelText('Abrir menú'));

      const allCerrar = screen.getAllByText('Cerrar sesión');
      // Click the one in the mobile menu (last one if avatar menu is not open)
      fireEvent.click(allCerrar[0]);

      expect(logoutFn).toHaveBeenCalledOnce();
    });
  });
});
