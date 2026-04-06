import { Helmet } from 'react-helmet-async';
import { GameActionsSection } from './game-actions-section';
import { LiveMatchesSection } from './live-matches-section';
import { LeaderboardPreviewSection } from './leaderboard-preview-section';
import { PlayerProfileSection } from './player-profile-section';

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-surface-base px-4 pt-20 pb-10 lg:px-6">
      <Helmet>
        <title>UltimaType — Competencias de mecanografía en tiempo real</title>
      </Helmet>

      <div className="grid w-full max-w-6xl grid-cols-12 gap-6">
        <GameActionsSection />
        <LiveMatchesSection />
        <LeaderboardPreviewSection />
        <PlayerProfileSection />
      </div>
    </main>
  );
}
