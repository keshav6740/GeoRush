'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { SporcleCountryQuiz } from '@/components/game/SporcleCountryQuiz';
import { getDailyBossChallenge } from '@/lib/challengePools';

export default function DailyBossPage() {
  const boss = useMemo(() => getDailyBossChallenge(), []);

  if (!boss || boss.countries.length === 0) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-xl mx-auto neon-card p-8 text-center space-y-4">
          <h1 className="text-4xl font-bold gradient-text">Daily Boss</h1>
          <p className="text-[#5a6b7a]">Daily boss challenge is unavailable right now.</p>
          <a href="/modes" className="neon-btn px-6 py-3">Back to Modes</a>
        </div>
      </main>
    );
  }

  return (
    <SporcleCountryQuiz
      gameMode={`Daily Boss - ${boss.title}`}
      title={`Daily Boss: ${boss.title}`}
      subtitle={`Global reset each day (${boss.dateKey}).`}
      targetCountries={boss.countries}
      durationSeconds={10 * 60}
      backHref="/modes"
      emphasizeMap
      inputFirst
      showRecentGuesses={false}
    />
  );
}


