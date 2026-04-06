import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/use-auth';
import { CreateRoomButton } from '../lobby/create-room-button';
import { LoginModal } from '../ui/login-modal';

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
    <div className="flex flex-col items-center gap-2">
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
          className="w-36 rounded-lg bg-surface-raised px-4 py-2 text-center text-sm uppercase tracking-widest text-text-main font-mono"
          aria-label="Código de partida para unirse"
        />
        <button
          type="button"
          onClick={handleJoin}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-surface-base font-sans"
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
  const [showLogin, setShowLogin] = useState(false);

  return (
    <section className="col-span-12 lg:col-span-8 rounded-card bg-surface-sunken p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-text-muted">
        Modo de juego
      </h2>

      <div className="flex flex-col items-center gap-4">
        <div className="flex justify-center gap-3">
          {isFetchingProfile ? (
            <span className="opacity-50">_</span>
          ) : isAuthenticated ? (
            <CreateRoomButton />
          ) : (
            <div className="group relative">
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                aria-describedby="create-room-tooltip"
                className="rounded-lg bg-primary/40 px-6 py-2 text-sm font-semibold text-surface-base/60 font-sans transition-colors hover:bg-primary/60 hover:text-surface-base/80"
              >
                Crear Partida
              </button>
              <span
                id="create-room-tooltip"
                role="tooltip"
                className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-raised px-3 py-1 text-xs text-text-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              >
                Inicia sesión para crear partidas
              </span>
            </div>
          )}
        </div>

        <JoinRoomInput />
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </section>
  );
}
