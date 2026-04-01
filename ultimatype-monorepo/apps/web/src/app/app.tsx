import { useState } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../hooks/use-auth';
import { AuthCallback } from '../components/auth/auth-callback';
import { ProtectedRoute } from '../components/auth/protected-route';
import { ProfilePage } from '../components/profile/profile-page';
import { LobbyPage } from '../components/lobby/lobby-page';
import { CreateRoomButton } from '../components/lobby/create-room-button';
import { NavBar } from '../components/ui/nav-bar';

const ROOM_CODE_REGEX = /^[A-Z2-9]{6}$/;

function JoinRoomInput() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    const normalized = code.trim().toUpperCase();
    if (!ROOM_CODE_REGEX.test(normalized)) {
      setError('Código inválido (6 caracteres, letras y números)');
      return;
    }
    setError('');
    navigate(`/room/${normalized}`);
  };

  return (
    <div className="mb-4 flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="Código de sala"
          maxLength={6}
          className="w-36 rounded-lg bg-surface-raised px-4 py-2 text-center text-sm uppercase tracking-widest text-text-main font-sans"
          aria-label="Código de sala para unirse"
        />
        <button
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

export function App() {
  const { user, isAuthenticated, isFetchingProfile, logout } = useAuth();
  const location = useLocation();
  const isCallbackRoute = location.pathname === '/auth/callback';

  return (
    <div className="font-sans">
      {!isCallbackRoute && <NavBar />}

      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/room/:code" element={<LobbyPage />} />
        <Route
          path="*"
          element={
            <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base font-sans text-text-main">
              <Helmet>
                <title>UltimaType — Competencias de mecanografía en tiempo real</title>
              </Helmet>
              <h1 className="mb-4 text-5xl font-bold">
                UltimaType
              </h1>

              {isFetchingProfile && (
                <span className="opacity-50">_</span>
              )}

              {!isFetchingProfile && (
                <div className="text-center">
                  {isAuthenticated && user && (
                    <p className="mb-6 text-lg">
                      ¡Hola, {user.displayName}!
                    </p>
                  )}

                  <div className="mb-4 flex justify-center gap-3">
                    {isAuthenticated ? (
                      <CreateRoomButton />
                    ) : (
                      <div className="group relative">
                        <button
                          disabled
                          className="cursor-not-allowed rounded-lg bg-primary/40 px-6 py-2 text-sm font-semibold text-surface-base/60 font-sans"
                        >
                          Crear Sala
                        </button>
                        <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-surface-raised px-3 py-1 text-xs text-text-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          Inicia sesión para crear partidas
                        </span>
                      </div>
                    )}
                  </div>

                  <JoinRoomInput />

                  {isAuthenticated && (
                    <div className="flex justify-center gap-3">
                      <button
                        id="logout"
                        onClick={logout}
                        className="rounded-lg border border-surface-raised bg-transparent px-6 py-2 text-sm text-text-muted transition-colors hover:text-text-main"
                        aria-label="Cerrar sesión"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
