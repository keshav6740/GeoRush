'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { InputBox } from '@/components/game/InputBox';
import { ResultsCard } from '@/components/results/ResultsCard';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { COUNTRY_NAMES, COUNTRIES } from '@/lib/countries';
import {
  buildCountryLookup,
  resolveGuessToCountry,
  toWorldMapCountryName,
} from '@/lib/countryNameUtils';

interface RoundResult {
  country: string;
  correct: boolean;
  userAnswer?: string;
  timeToAnswer: number;
}

const FLAG_CACHE = new Map<string, string | null>();

function pickRandomCountries(count: number) {
  const shuffled = [...COUNTRIES];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function getFlagNameCandidates(countryName: string) {
  const mapped = toWorldMapCountryName(countryName);
  const aliasMap: Record<string, string[]> = {
    "Cote d'Ivoire": ['Ivory Coast'],
    "Côte d'Ivoire": ['Ivory Coast'],
    Macedonia: ['North Macedonia'],
    Swaziland: ['Eswatini'],
    'Timor-Leste': ['East Timor'],
    'Republic of the Congo': ['Congo'],
    'Democratic Republic of the Congo': ['DR Congo'],
    'United States': ['United States of America'],
    Vatican: ['Vatican City', 'Holy See'],
    'Cape Verde': ['Cabo Verde'],
  };

  return Array.from(new Set([countryName, mapped, ...(aliasMap[countryName] ?? [])]));
}

async function fetchFlagUrl(countryName: string): Promise<string | null> {
  const cached = FLAG_CACHE.get(countryName);
  if (typeof cached !== 'undefined') return cached;

  const names = getFlagNameCandidates(countryName);
  for (const name of names) {
    const fullTextUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=true`;
    const fallbackUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`;
    for (const endpoint of [fullTextUrl, fallbackUrl]) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        const payload = (await response.json()) as Array<{ flags?: { svg?: string; png?: string } }>;
        const flag = payload[0]?.flags?.svg || payload[0]?.flags?.png || null;
        if (flag) {
          FLAG_CACHE.set(countryName, flag);
          return flag;
        }
      } catch {
        // Try next candidate endpoint.
      }
    }
  }

  FLAG_CACHE.set(countryName, null);
  return null;
}

export default function FlagGuessPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [countries, setCountries] = useState<typeof COUNTRIES>([]);
  const [flagByCountry, setFlagByCountry] = useState<Record<string, string | null>>({});
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; expectedCountry: string; bonus: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const ROUNDS = 10;

  const countryLookup = useMemo(() => buildCountryLookup(COUNTRY_NAMES), []);
  const currentCountry = countries[currentRoundIdx];
  const currentFlag = currentCountry ? flagByCountry[currentCountry.name] : null;
  const progress = currentRoundIdx + 1;

  useEffect(() => {
    setCountries(pickRandomCountries(ROUNDS));
  }, []);

  useEffect(() => {
    if (countries.length === 0) return;
    let active = true;
    setFlagsLoading(true);
    void Promise.all(
      countries.map(async (country) => [country.name, await fetchFlagUrl(country.name)] as const)
    )
      .then((entries) => {
        if (!active) return;
        setFlagByCountry(Object.fromEntries(entries));
      })
      .finally(() => {
        if (active) setFlagsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countries]);

  const handleStartGame = () => {
    setGameStarted(true);
    setRoundStartTime(Date.now());
  };

  const finalizeRound = (isCorrect: boolean, userAnswer: string) => {
    if (!currentCountry) return false;
    if (locked) return false;

    const timeToAnswer = (Date.now() - roundStartTime) / 1000;
    const bonus = isCorrect ? Math.max(10, 100 - Math.round(timeToAnswer) * 5) : 0;

    const newRoundResult: RoundResult = {
      country: currentCountry.name,
      correct: isCorrect,
      userAnswer,
      timeToAnswer: Math.round(timeToAnswer),
    };

    const updatedResults = [...roundResults, newRoundResult];
    setRoundResults(updatedResults);
    setFeedback({
      correct: isCorrect,
      expectedCountry: currentCountry.name,
      bonus,
    });
    setLocked(true);

    setTimeout(() => {
      setFeedback(null);
      setLocked(false);
      if (currentRoundIdx + 1 >= ROUNDS) {
        setShowResults(true);
        setGameStarted(false);
      } else {
        setCurrentRoundIdx(currentRoundIdx + 1);
        setRoundStartTime(Date.now());
      }
    }, 700);

    return true;
  };

  const handleAnswerSubmit = (answer: string): boolean => {
    if (!currentCountry) return false;
    if (locked) return false;
    const resolved = resolveGuessToCountry(answer, countryLookup);
    return finalizeRound(resolved === currentCountry.name, answer);
  };

  const handleRevealAndSkip = () => {
    if (!currentCountry) return;
    if (locked) return;
    void finalizeRound(false, 'Revealed');
  };

  const handlePlayAgain = () => {
    setCountries(pickRandomCountries(ROUNDS));
    setCurrentRoundIdx(0);
    setRoundResults([]);
    setShowResults(false);
    setGameStarted(true);
    setRoundStartTime(Date.now());
    setFeedback(null);
    setLocked(false);
  };

  if (!gameStarted && roundResults.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="neon-card p-8 max-w-md w-full text-center space-y-6 animate-float-up">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-3">Flag Guess</h1>
            <p className="text-[#5a6b7a]">See a flag, name the country</p>
          </div>
          <div className="bg-[#ffffff] rounded-lg p-6 border border-[#1f6feb] border-opacity-30">
            <p className="text-[#9aa6b2] text-sm mb-2">Game Format</p>
            <p className="text-lg font-bold text-[#1f2937] mb-3">{ROUNDS} Flags</p>
            <p className="text-[#5a6b7a] text-sm">
              Guess the country from each flag. Faster correct answers earn more points. You can reveal and skip if stuck.
            </p>
          </div>
          <button onClick={handleStartGame} className="neon-btn-primary w-full py-3 text-lg" disabled={flagsLoading}>
            {flagsLoading ? 'Loading Flags...' : 'Start Challenge'}
          </button>
          <Link href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
            Back to Modes
          </Link>
        </div>
      </main>
    );
  }

  if (showResults) {
    const correctCount = roundResults.filter((r) => r.correct).length;
    const correctCountries = roundResults.filter((r) => r.correct).map((r) => r.country);
    const totalScore = roundResults.reduce((sum, r) => {
      if (r.correct) {
        const speedBonus = Math.max(10, 100 - r.timeToAnswer * 5);
        return sum + speedBonus;
      }
      return sum;
    }, 0);

    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <ResultsCard
              gameMode="Flag Guess"
              score={totalScore}
              correct={correctCount}
              total={ROUNDS}
              durationSeconds={ROUNDS * 20}
              timeSpentSeconds={roundResults.reduce((acc, item) => acc + item.timeToAnswer, 0)}
              countriesGuessed={correctCountries}
            />
            <WorldGuessMap guessedCountries={correctCountries} title="Correct Countries on Map" />
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="neon-card p-6">
              <h3 className="text-lg font-bold text-[#1f6feb] mb-4">Detailed Results</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {roundResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      result.correct
                        ? 'bg-[#ffffff] border border-[#2a9d8f] border-opacity-30'
                        : 'bg-[#ffffff] border border-[#e76f51] border-opacity-30'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[#1f2937]">{result.country}</p>
                        <p className="text-sm text-[#5a6b7a]">Answer: {result.userAnswer}</p>
                        <p className="text-xs text-[#9aa6b2]">Time: {result.timeToAnswer}s</p>
                      </div>
                      <span className="text-xl">{result.correct ? 'Correct' : 'Wrong'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-6">
              <button onClick={handlePlayAgain} className="neon-btn-primary px-6 py-3">
                Play Again
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!currentCountry) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#5a6b7a]">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Flag Guess</h1>
          <p className="text-[#5a6b7a]">Round {progress}/{ROUNDS}</p>
        </div>

        <div className="mb-8">
          <div className="w-full bg-[#f8fafc] rounded-full h-2 border border-[#1f6feb] border-opacity-30">
            <div
              className="h-full rounded-full bg-[#1f6feb] transition-all duration-300"
              style={{ width: `${(progress / ROUNDS) * 100}%` }}
            />
          </div>
        </div>

        <div className="neon-card p-8 mb-8 text-center animate-float-up">
          <p className="text-[#9aa6b2] text-sm mb-4">Which country does this flag belong to?</p>
          {currentFlag ? (
            <div className="mx-auto w-full max-w-md rounded-xl overflow-hidden border border-[#d8e0eb] bg-white">
              <img src={currentFlag} alt="Country flag" className="w-full h-56 object-cover" />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-md rounded-xl border border-[#d8e0eb] bg-white/70 h-56 grid place-items-center text-[#5a6b7a]">
              Flag unavailable for this round.
            </div>
          )}
        </div>

        <div className="mb-8">
          <InputBox onSubmit={handleAnswerSubmit} placeholder="Type the country..." disabled={locked} />
          <div className="mt-3 flex justify-center">
            <button onClick={handleRevealAndSkip} disabled={locked} className="neon-btn px-4 py-2 text-sm disabled:opacity-60">
              Reveal &amp; Skip
            </button>
          </div>
        </div>

        {feedback && (
          <div className="neon-card p-4 text-center">
            <p className={`text-lg font-bold ${feedback.correct ? 'text-[#2a9d8f]' : 'text-[#e76f51]'}`}>
              {feedback.correct ? 'Correct!' : 'Not quite'}
            </p>
            <p className="text-sm text-[#5a6b7a]">
              {feedback.correct ? `+${feedback.bonus} pts` : `Correct answer: ${feedback.expectedCountry}`}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
