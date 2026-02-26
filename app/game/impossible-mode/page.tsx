'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SporcleCountryQuiz } from '@/components/game/SporcleCountryQuiz';
import {
  getCountriesBySuffix,
  getLandlockedCountries,
  getMicrostateCountries,
  getOneNeighborCountries,
} from '@/lib/challengePools';

type ChallengeKey = 'landlocked' | 'stan' | 'one-neighbor' | 'microstates' | 'no-map';

const CHALLENGES: Array<{
  key: ChallengeKey;
  title: string;
  subtitle: string;
  durationSeconds: number;
  countries: string[];
  hideMap?: boolean;
}> = [
  {
    key: 'landlocked',
    title: 'Impossible: Landlocked Only',
    subtitle: 'Name only landlocked countries.',
    durationSeconds: 8 * 60,
    countries: getLandlockedCountries(),
  },
  {
    key: 'stan',
    title: 'Impossible: -stan Countries',
    subtitle: 'Only countries that end with "stan".',
    durationSeconds: 3 * 60,
    countries: getCountriesBySuffix('stan'),
  },
  {
    key: 'one-neighbor',
    title: 'Impossible: One-Neighbor Countries',
    subtitle: 'Only countries with exactly one land neighbor.',
    durationSeconds: 5 * 60,
    countries: getOneNeighborCountries(),
  },
  {
    key: 'microstates',
    title: 'Impossible: Microstates',
    subtitle: 'Small states challenge.',
    durationSeconds: 6 * 60,
    countries: getMicrostateCountries(),
  },
  {
    key: 'no-map',
    title: 'Impossible: No-Map World Quiz',
    subtitle: 'Classic world quiz without map assistance.',
    durationSeconds: 15 * 60,
    countries: getLandlockedCountries().concat(getMicrostateCountries()).slice(0, 120),
    hideMap: true,
  },
];

export default function ImpossibleModePage() {
  const [active, setActive] = useState<ChallengeKey | null>(null);

  const challenge = useMemo(
    () => CHALLENGES.find((item) => item.key === active) ?? null,
    [active]
  );

  if (challenge) {
    return (
      <SporcleCountryQuiz
        gameMode={challenge.title}
        title={challenge.title}
        subtitle={challenge.subtitle}
        targetCountries={challenge.countries}
      durationSeconds={challenge.durationSeconds}
      backHref="/game/impossible-mode"
      inputFirst
      showRecentGuesses
      emphasizeMap={!challenge.hideMap}
      hideMap={Boolean(challenge.hideMap)}
    />
  );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="neon-card p-6 md:p-8 text-center">
          <h1 className="text-3xl md:text-5xl font-black gradient-text">Impossible Mode</h1>
          <p className="text-[#5a6b7a] mt-2">Hardcore challenge presets for serious players and creators.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHALLENGES.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className="neon-card p-5 text-left hover:-translate-y-0.5 transition-transform"
            >
              <p className="text-xl font-bold text-[#1f2937]">{item.title}</p>
              <p className="text-sm text-[#5a6b7a] mt-1">{item.subtitle}</p>
              <p className="text-xs text-[#607386] mt-2">
                {item.countries.length} countries • {Math.round(item.durationSeconds / 60)} min
              </p>
            </button>
          ))}
        </div>

        <div className="text-center">
          <Link href="/modes" className="neon-btn px-6 py-3">
            Back to Modes
          </Link>
        </div>
      </div>
    </main>
  );
}
