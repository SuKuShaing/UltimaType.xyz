import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameActionsSection } from './game-actions-section';
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
  apiClient: vi.fn(),
}));

vi.mock('../../lib/guest', () => ({
  getGuestId: () => 'guest_test-uuid',
  getGuestName: () => 'Invitado #1234',
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
  return render(<GameActionsSection />);
}

describe('GameActionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  describe('Layout y estructura', () => {
    it('renderiza la sección con contenedor exterior correcto', () => {
      setup();
      const section = document.querySelector('section');
      expect(section).toBeTruthy();
      expect(section!.classList.contains('col-span-12')).toBe(true);
      expect(section!.classList.contains('md:col-span-6')).toBe(true);
      expect(section!.classList.contains('lg:col-span-8')).toBe(true);
      expect(section!.classList.contains('rounded-card')).toBe(true);
      expect(section!.classList.contains('bg-surface-sunken')).toBe(true);
    });

    it('renderiza el header "Modo de juego"', () => {
      setup();
      expect(screen.getByText('Modo de juego')).toBeTruthy();
    });

    it('renderiza el subtítulo descriptivo', () => {
      setup();
      expect(screen.getByText('Elige cómo quieres competir hoy')).toBeTruthy();
    });

    it('renderiza las dos cards de acción', () => {
      setup();
      expect(screen.getByText('Crear partida')).toBeTruthy();
      expect(screen.getByText('Unirse a una partida')).toBeTruthy();
    });

    it('renderiza los íconos Material Symbols', () => {
      const { container } = setup();
      const icons = container.querySelectorAll('.material-symbols-outlined');
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });

    it('card "Crear partida" tiene clases de hover animation', () => {
      setup();
      const btn = screen.getByRole('button', { name: 'Crear una nueva partida' });
      expect(btn.className.includes('hover:scale-[1.02]')).toBe(true);
      expect(btn.className.includes('transition-all')).toBe(true);
    });

    it('no hay bordes 1px en la sección', () => {
      const { container } = setup();
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        expect(el.className.includes(' border ')).toBe(false);
        expect(el.className.includes('border-b')).toBe(false);
      });
    });
  });

  describe('Usuario autenticado — Crear partida', () => {
    it('llama apiClient con POST /rooms y navega al crear', async () => {
      const { apiClient } = await import('../../lib/api-client');
      vi.mocked(apiClient).mockResolvedValueOnce({ code: 'ABC234' });

      setup({ isAuthenticated: true, user: authenticatedUser });
      const btn = screen.getByRole('button', { name: 'Crear una nueva partida' });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(apiClient).toHaveBeenCalledWith('/rooms', { method: 'POST', body: undefined });
        expect(mockNavigate).toHaveBeenCalledWith('/room/ABC234');
      });
    });

    it('muestra "Creando sala..." durante la creación', async () => {
      const { apiClient } = await import('../../lib/api-client');
      let resolveCreate: (value: any) => void;
      vi.mocked(apiClient).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
      );

      setup({ isAuthenticated: true, user: authenticatedUser });
      fireEvent.click(screen.getByRole('button', { name: 'Crear una nueva partida' }));

      await waitFor(() => {
        expect(screen.getByText('Creando sala...')).toBeTruthy();
      });

      resolveCreate!({ code: 'XYZ789' });
    });

    it('en error de API quita el estado loading', async () => {
      const { apiClient } = await import('../../lib/api-client');
      vi.mocked(apiClient).mockRejectedValueOnce(new Error('Network error'));

      setup({ isAuthenticated: true, user: authenticatedUser });
      const btn = screen.getByRole('button', { name: 'Crear una nueva partida' });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(btn.hasAttribute('disabled')).toBe(false);
      });
    });

    it('no abre LoginModal', async () => {
      const { apiClient } = await import('../../lib/api-client');
      vi.mocked(apiClient).mockResolvedValueOnce({ code: 'ABC234' });

      setup({ isAuthenticated: true, user: authenticatedUser });
      fireEvent.click(screen.getByRole('button', { name: 'Crear una nueva partida' }));
      expect(screen.queryByTestId('login-modal')).toBeNull();
    });
  });

  describe('Usuario no autenticado — Crear partida', () => {
    it('llama apiClient con guestId y guestName en el body', async () => {
      const { apiClient } = await import('../../lib/api-client');
      vi.mocked(apiClient).mockResolvedValueOnce({ code: 'GHI567' });

      setup({ isAuthenticated: false });
      const btn = screen.getByRole('button', { name: 'Crear una nueva partida' });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(apiClient).toHaveBeenCalledWith('/rooms', {
          method: 'POST',
          body: JSON.stringify({ guestId: 'guest_test-uuid', guestName: 'Invitado #1234' }),
        });
        expect(mockNavigate).toHaveBeenCalledWith('/room/GHI567');
      });
    });

    it('card "Crear partida" NO está dimmed (sin opacity-50 por default)', () => {
      setup({ isAuthenticated: false });
      const btn = screen.getByRole('button', { name: 'Crear una nueva partida' });
      expect(btn.classList.contains('opacity-50')).toBe(false);
    });
  });

  describe('Double-click guard', () => {
    it('ignora segundo click mientras se está creando la sala', async () => {
      const { apiClient } = await import('../../lib/api-client');
      let resolveCreate: (value: any) => void;
      vi.mocked(apiClient).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
      );

      setup({ isAuthenticated: true, user: authenticatedUser });
      const btn = screen.getByRole('button', { name: 'Crear una nueva partida' });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(btn.hasAttribute('disabled')).toBe(true);
      });

      fireEvent.click(btn);
      expect(apiClient).toHaveBeenCalledTimes(1);

      resolveCreate!({ code: 'ABC234' });
    });
  });

  describe('JoinRoomInput', () => {
    it('renderiza el input con aria-label correcto', () => {
      setup();
      expect(screen.getByLabelText('Código de partida para unirse')).toBeTruthy();
    });

    it('convierte a mayúsculas y limita a 6 caracteres', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'abc234xyz' } });
      expect(input.value).toBe('ABC234');
    });

    it('navega a la sala en código válido', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'ABC234' } });
      fireEvent.click(screen.getByText('Unirse'));
      expect(mockNavigate).toHaveBeenCalledWith('/room/ABC234');
    });

    it('navega con Enter en código válido', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'XYZ789' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith('/room/XYZ789');
    });

    it('muestra error en código inválido (menos de 6 chars)', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'AB' } });
      fireEvent.click(screen.getByText('Unirse'));
      expect(
        screen.getByText('Código inválido (6 caracteres, letras y números)')
      ).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('muestra error en código vacío', () => {
      setup();
      fireEvent.click(screen.getByText('Unirse'));
      expect(screen.getByText('Ingresá un código de partida')).toBeTruthy();
    });

    it('limpia el error al escribir', () => {
      setup();
      const input = screen.getByLabelText(
        'Código de partida para unirse'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'x' } });
      fireEvent.click(screen.getByText('Unirse'));
      expect(
        screen.getByText('Código inválido (6 caracteres, letras y números)')
      ).toBeTruthy();

      fireEvent.change(input, { target: { value: 'AB' } });
      expect(
        screen.queryByText('Código inválido (6 caracteres, letras y números)')
      ).toBeNull();
    });

    it('botón "Unirse" usa rounded-full (pill style)', () => {
      setup();
      const btn = screen.getByText('Unirse');
      expect(btn.classList.contains('rounded-full')).toBe(true);
    });

    it('input usa rounded-full (pill style)', () => {
      setup();
      const input = screen.getByLabelText('Código de partida para unirse');
      expect(input.classList.contains('rounded-full')).toBe(true);
    });
  });
});
