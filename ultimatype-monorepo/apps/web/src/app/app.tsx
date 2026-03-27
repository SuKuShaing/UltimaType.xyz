import { Route, Routes, Link } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { AuthButtons } from '../components/ui/auth-buttons';
import { AuthCallback } from '../components/auth/auth-callback';
import { ProtectedRoute } from '../components/auth/protected-route';
import { ProfilePage } from '../components/profile/profile-page';
import { LobbyPage } from '../components/lobby/lobby-page';
import { CreateRoomButton } from '../components/lobby/create-room-button';

export function App() {
  const { user, isAuthenticated, isFetchingProfile, logout } = useAuth();

  return (
    <div>
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
        <Route
          path="/room/:code"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                UltimaType
              </h1>

              {isFetchingProfile && (
                <span style={{ opacity: 0.5 }}>_</span>
              )}

              {!isFetchingProfile && !isAuthenticated && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '24px', color: '#999' }}>
                    Inicia sesión para competir
                  </p>
                  <AuthButtons />
                </div>
              )}

              {isAuthenticated && user && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                    ¡Hola, {user.displayName}!
                  </p>
                  <p style={{ color: '#999', marginBottom: '24px' }}>
                    {user.email}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                    <CreateRoomButton />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Link
                      to="/profile"
                      style={{
                        padding: '8px 24px',
                        fontSize: '14px',
                        borderRadius: '8px',
                        backgroundColor: '#FF9B51',
                        color: '#0F1F29',
                        fontWeight: 600,
                        textDecoration: 'none',
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                      aria-label="Ver mi perfil"
                    >
                      Mi Perfil
                    </Link>
                    <button
                      id="logout"
                      onClick={logout}
                      style={{
                        padding: '8px 24px',
                        fontSize: '14px',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        color: '#999',
                        cursor: 'pointer',
                      }}
                      aria-label="Cerrar sesión"
                    >
                      Cerrar sesión
                    </button>
                  </div>
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
