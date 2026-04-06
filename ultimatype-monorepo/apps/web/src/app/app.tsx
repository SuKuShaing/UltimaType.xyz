import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { AuthCallback } from '../components/auth/auth-callback';
import { PublicProfilePage } from '../components/profile/public-profile-page';
import { LobbyPage } from '../components/lobby/lobby-page';
import { MatchDetailPage } from '../components/match/match-detail-page';
import { LeaderboardPage } from '../components/leaderboard/leaderboard-page';
import { HomePage } from '../components/home/home-page';
import { NavBar } from '../components/ui/nav-bar';

function ProfileRedirect() {
  const { user, isAuthenticated, isFetchingProfile } = useAuth();

  if (isFetchingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base font-sans text-text-main">
        <span className="text-2xl opacity-50">_</span>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!user?.slug) return <Navigate to="/" replace />;

  return <Navigate to={`/u/${user.slug}`} replace />;
}

export function App() {
  const location = useLocation();
  const isCallbackRoute = location.pathname === '/auth/callback';

  return (
    <div className="font-sans">
      {!isCallbackRoute && <NavBar />}

      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/profile" element={<ProfileRedirect />} />
        <Route path="/match/:matchCode" element={<MatchDetailPage />} />
        <Route path="/u/:slug" element={<PublicProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/room/:code" element={<LobbyPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default App;
