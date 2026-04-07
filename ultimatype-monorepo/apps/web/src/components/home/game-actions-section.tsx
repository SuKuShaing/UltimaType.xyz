import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { LoginModal } from '../ui/login-modal';
import { apiClient } from '../../lib/api-client';
import { CreateRoomResponse } from '@ultimatype-monorepo/shared';

const ROOM_CODE_REGEX = /^[A-Z2-9]{6}$/;

function JoinRoomInput() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError('Ingresá un código de partida');
      return;
    }
    if (!ROOM_CODE_REGEX.test(normalized)) {
      setError('Código inválido (6 caracteres, letras y números)');
      return;
    }
    setError('');
    navigate(`/room/${normalized}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().slice(0, 6));
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="Código de partida"
          maxLength={6}
          className="min-w-0 flex-1 rounded-full bg-surface-raised px-4 py-2 text-center text-sm uppercase tracking-widest text-text-main font-mono focus:outline-none"
          aria-label="Código de partida para unirse"
        />
        <button
          type="button"
          onClick={handleJoin}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-surface-base font-sans"
        >
          Unirse
        </button>
      </div>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}

export function GameActionsSection() {
  const { isAuthenticated, isFetchingProfile } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleCreateRoom = async () => {
    if (isFetchingProfile) return;
    if (!isAuthenticated) {
      localStorage.setItem('returnAfterLogin', window.location.pathname);
      setShowLogin(true);
      return;
    }
    if (isCreating) return;
    setIsCreating(true);
    try {
      const { code } = await apiClient<CreateRoomResponse>('/rooms', {
        method: 'POST',
      });
      navigate(`/room/${code}`);
    } catch {
      setIsCreating(false);
    }
  };

  return (
    <section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
        Modo de juego
      </h2>
      <p className="mt-1 text-sm text-text-muted font-sans">
        Elige cómo quieres competir hoy
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Card 1: Crear partida */}
        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={isCreating || isFetchingProfile}
          className={`group flex w-full items-center gap-4 rounded-card bg-surface-container-low p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-surface-container hover:shadow-md disabled:cursor-wait disabled:opacity-50${isFetchingProfile ? ' opacity-50 pointer-events-none' : ''}`}
          aria-label="Crear una nueva partida"
        >
          <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
            keyboard
          </span>
          <div className="flex-1">
            <p className="font-semibold text-text-main font-sans">
              Crear partida
            </p>
            <p className="text-sm text-text-muted font-sans">
              {isCreating ? 'Creando sala...' : 'Sé el anfitrión de una nueva sala'}
            </p>
          </div>
          <span className="material-symbols-outlined text-text-muted transition-colors group-hover:text-primary" aria-hidden="true">
            arrow_forward
          </span>
        </button>

        {/* Card 2: Unirse a una partida */}
        <div className="group rounded-card bg-surface-container-low p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
          <div className="mb-3 flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
              login
            </span>
            <p className="flex-1 font-semibold text-text-main font-sans">
              Unirse a una partida
            </p>
            <span className="material-symbols-outlined text-text-muted transition-colors group-hover:text-primary" aria-hidden="true">
              arrow_forward
            </span>
          </div>
          <JoinRoomInput />
        </div>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </section>
  );
}
