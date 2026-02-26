'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SporcleCountryQuiz } from '@/components/game/SporcleCountryQuiz';
import { COUNTRY_NAMES } from '@/lib/countries';
import { buildCountryLookup, normalizeCountryName } from '@/lib/countryNameUtils';

type ContinentKey = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';

const CONTINENTS: ContinentKey[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

const CONTINENT_TIME: Record<ContinentKey, number> = {
  Africa: 8 * 60,
  Americas: 7 * 60,
  Asia: 8 * 60,
  Europe: 7 * 60,
  Oceania: 5 * 60,
};

const CONTINENT_SUBTITLE: Record<ContinentKey, string> = {
  Africa: 'Type all African countries with no hints.',
  Americas: 'Type all countries from North and South America.',
  Asia: 'Type all Asian countries with no hints.',
  Europe: 'Type all European countries with no hints.',
  Oceania: 'Type all Oceanian countries with no hints.',
};

const REQUIRED_BY_CONTINENT: Record<ContinentKey, string[]> = {
  Africa: ['Tanzania', 'Swaziland', 'Republic of the Congo', 'Cape Verde', 'Sao Tome and Principe'],
  Americas: [
    'United States',
    'Antigua and Barbuda',
    'Barbados',
    'Saint Lucia',
    'Saint Kitts and Nevis',
    'Saint Vincent and the Grenadines',
    'Trinidad and Tobago',
    'Dominica',
  ],
  Asia: ['Russia'],
  Europe: [
    'Russia',
    'United Kingdom',
    'Kosovo',
    'Albania',
    'Bosnia and Herzegovina',
    'Macedonia',
    'Montenegro',
    'Serbia',
  ],
  Oceania: [],
};

const REST_TO_LOCAL_OVERRIDES: Record<string, string> = {
  congo: 'Republic of the Congo',
  'republic of congo': 'Republic of the Congo',
  'republic of the congo': 'Republic of the Congo',
  'congo brazzaville': 'Republic of the Congo',
  'united republic of tanzania': 'Tanzania',
  'tanzania united republic of': 'Tanzania',
  'united kingdom of great britain and northern ireland': 'United Kingdom',
  'republic of serbia': 'Serbia',
  kosovo: 'Kosovo',
  'republic of kosovo': 'Kosovo',
};

export default function ContinentQuizPage() {
  const [selected, setSelected] = useState<ContinentKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [continentCountries, setContinentCountries] = useState<Record<ContinentKey, string[]>>({
    Africa: [],
    Americas: [],
    Asia: [],
    Europe: [],
    Oceania: [],
  });

  const localLookup = useMemo(() => buildCountryLookup(COUNTRY_NAMES), []);

  useEffect(() => {
    let active = true;
    void fetch('https://restcountries.com/v3.1/all?fields=name,region')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch continents');
        return (await response.json()) as Array<{
          name?: { common?: string; official?: string };
          region?: string;
        }>;
      })
      .then((payload) => {
        if (!active) return;
        const next: Record<ContinentKey, Set<string>> = {
          Africa: new Set<string>(),
          Americas: new Set<string>(),
          Asia: new Set<string>(),
          Europe: new Set<string>(),
          Oceania: new Set<string>(),
        };

        for (const item of payload) {
          const region = item.region as ContinentKey | undefined;
          if (!region || !CONTINENTS.includes(region)) continue;

          const candidates = [item.name?.common, item.name?.official].filter(Boolean) as string[];
          for (const candidate of candidates) {
            const key = normalizeCountryName(candidate);
            const localCountry = localLookup.get(key) || REST_TO_LOCAL_OVERRIDES[key];
            if (localCountry) {
              next[region].add(localCountry);
            }
          }
        }

        setContinentCountries({
          Africa: Array.from(new Set([...next.Africa, ...REQUIRED_BY_CONTINENT.Africa])).sort(),
          Americas: Array.from(new Set([...next.Americas, ...REQUIRED_BY_CONTINENT.Americas])).sort(),
          Asia: Array.from(new Set([...next.Asia, ...REQUIRED_BY_CONTINENT.Asia])).sort(),
          Europe: Array.from(new Set([...next.Europe, ...REQUIRED_BY_CONTINENT.Europe])).sort(),
          Oceania: Array.from(new Set([...next.Oceania, ...REQUIRED_BY_CONTINENT.Oceania])).sort(),
        });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [localLookup]);

  if (selected) {
    const countries = continentCountries[selected];
    return (
      <SporcleCountryQuiz
        gameMode={`${selected} Quiz`}
        title={`${selected} Country Quiz`}
        subtitle={CONTINENT_SUBTITLE[selected]}
        targetCountries={countries}
        durationSeconds={CONTINENT_TIME[selected]}
        backHref="/game/continent-quiz"
        onBack={() => setSelected(null)}
        focusRegion={selected}
        emphasizeMap
        mapHeightClass="h-[52vh] md:h-[760px]"
        inputFirst
        showRecentGuesses={false}
      />
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 animate-float-up">
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-3">Continent Quiz</h1>
          <p className="text-[#5a6b7a] text-lg">Pick a continent and guess every country. No hints.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CONTINENTS.map((continent) => {
            const count = continentCountries[continent].length;
            return (
              <button
                key={continent}
                onClick={() => setSelected(continent)}
                disabled={loading || count === 0}
                className="neon-card p-6 text-left disabled:opacity-50"
              >
                <p className="text-2xl font-bold text-[#1f2937]">{continent}</p>
                <p className="text-[#5a6b7a] mt-2">
                  {loading ? 'Loading countries...' : `${count} countries`}
                </p>
                <p className="text-sm text-[#9aa6b2] mt-3">
                  Time limit: {Math.floor(CONTINENT_TIME[continent] / 60)} min
                </p>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <a href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors">
            Back to Modes
          </a>
        </div>
      </div>
    </main>
  );
}

