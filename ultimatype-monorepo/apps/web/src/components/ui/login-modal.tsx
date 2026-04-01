import { useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { loginWithGoogle, loginWithGithub } = useAuth();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface-base px-8 py-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-center text-xl font-bold text-text-main">
          Iniciar sesión
        </h2>
        <p className="mb-6 text-center text-sm text-text-muted">
          Elegí cómo querés ingresar
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={loginWithGoogle}
            className="flex items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-shadow hover:shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.11a7.12 7.12 0 010-4.22V7.05H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.27l3.66-3.16z" fill="#FBBC05" />
              <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335" />
            </svg>
            Continuar con Google
          </button>

          <button
            onClick={loginWithGithub}
            className="flex items-center justify-center gap-3 rounded-lg bg-[#24292e] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continuar con GitHub
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full text-center text-sm text-text-muted transition-colors hover:text-text-main"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
