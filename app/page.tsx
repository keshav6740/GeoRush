'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Compass, Globe2, Mountain, Sparkles, UserRound } from 'lucide-react';
import { getAuthSession, getOrCreatePlayerIdentity } from '@/lib/playerId';

interface HomeStats {
  players: number;
  topScore: number;
  userRank: number | null;
}

const QUICK_CHALLENGES = [
  { country: 'Japan', capital: 'Tokyo', hint: 'Island nation in East Asia' },
  { country: 'Brazil', capital: 'Brasilia', hint: 'Largest country in South America' },
  { country: 'Egypt', capital: 'Cairo', hint: 'Nile and pyramids' },
  { country: 'Canada', capital: 'Ottawa', hint: 'Second-largest country by area' },
  { country: 'Kenya', capital: 'Nairobi', hint: 'East African safari hub' },
  { country: 'Australia', capital: 'Canberra', hint: 'Country and continent' },
];

function shuffleChallenges() {
  const shuffled = [...QUICK_CHALLENGES];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Page() {
  const [stats, setStats] = useState<HomeStats>({
    players: 0,
    topScore: 0,
    userRank: null,
  });
  const [shuffledChallenges, setShuffledChallenges] = useState(() => shuffleChallenges());
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState<string>('');
  const [streak, setStreak] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { playerId } = getOrCreatePlayerIdentity();
    setIsAuthenticated(getAuthSession().isAuthenticated);
    void fetch(`/api/leaderboard?limit=100&playerId=${encodeURIComponent(playerId)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as { stats: HomeStats };
        return payload.stats;
      })
      .then((nextStats) => {
        if (nextStats) setStats(nextStats);
      })
      .catch(() => undefined);
  }, []);

  const activeChallenge = shuffledChallenges[challengeIndex];

  const handleCheck = () => {
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedAnswer = activeChallenge.capital.toLowerCase();
    if (!normalizedGuess) return;

    if (normalizedGuess === normalizedAnswer) {
      setFeedback('Correct');
      setStreak((prev) => prev + 1);
    } else {
      setFeedback(`Not quite. Answer: ${activeChallenge.capital}`);
      setStreak(0);
    }
  };

  const handleNextChallenge = () => {
    setChallengeIndex((prev) => {
      const nextIndex = prev + 1;
      if (nextIndex >= shuffledChallenges.length) {
        setShuffledChallenges(shuffleChallenges());
        return 0;
      }
      return nextIndex;
    });
    setGuess('');
    setFeedback('');
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7fbff] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-96 w-96 rounded-full bg-[#6ec1ff]/35 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#9ce6b2]/35 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-80 w-80 rounded-full bg-[#ffd79b]/35 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(31,111,235,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(31,111,235,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4deea] bg-white/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-[#5d6f82]">
              <Sparkles size={14} />
              Geography Arcade
            </div>
            <h1 className="mt-3 text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[0.9] tracking-tight bg-gradient-to-r from-[#0f5bd8] via-[#17a06f] to-[#f18a3d] bg-clip-text text-transparent">
              GeoRush
            </h1>
          </div>
          <Link
            href={isAuthenticated ? '/profile' : '/signin'}
            className="h-12 w-12 rounded-full border border-[#d4deea] bg-white/90 text-[#1f2937] hover:bg-white grid place-items-center shadow-sm"
            aria-label={isAuthenticated ? 'Profile' : 'Sign in or sign up'}
            title={isAuthenticated ? 'Profile' : 'Sign in or sign up'}
          >
            <UserRound size={20} />
          </Link>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 items-stretch">
          <div className="rounded-[1.5rem] border border-[#d4deea] bg-white/75 backdrop-blur-sm p-7 md:p-8 shadow-[0_16px_50px_rgba(24,66,130,0.10)]">
            <div className="space-y-6">
              <p className="text-xl sm:text-2xl md:text-4xl font-bold text-[#1d2a3a] leading-tight">
                Turn map knowledge into reflex.
                <br />
                Fast rounds. Real ranks. Daily streaks.
              </p>
              <p className="text-base md:text-lg text-[#516375] max-w-2xl">
                GeoRush is built like a game show for geography. Jump in instantly, pick your mode, and chase cleaner runs every day.
              </p>

              {isAuthenticated ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Link href="/modes" className="neon-btn-primary text-center py-3.5 text-base font-semibold">
                    Play
                  </Link>
                  <Link href="/profile" className="neon-btn text-center py-3.5 text-base font-semibold">
                    Open Profile
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <Link href="/signin" className="neon-btn-primary text-center py-3.5 text-base font-semibold">
                    Sign In / Sign Up
                  </Link>
                  <Link href="/modes" className="neon-btn text-center py-3.5 text-base font-semibold">
                    Continue as Guest
                  </Link>
                  <Link href="/signin" className="neon-btn text-center py-3.5 text-base font-semibold">
                    Open Account
                  </Link>
                </div>
              )}

              <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[#d4deea] bg-white/90 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6b7f92] mb-2">Players</div>
                  <div className="text-3xl font-extrabold text-[#1f2937]">{stats.players}</div>
                </div>
                <div className="rounded-2xl border border-[#d4deea] bg-white/90 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6b7f92] mb-2">Top Score</div>
                  <div className="text-3xl font-extrabold text-[#1f2937]">{stats.topScore}</div>
                </div>
                <div className="rounded-2xl border border-[#d4deea] bg-white/90 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6b7f92] mb-2">Your Rank</div>
                  <div className="text-3xl font-extrabold text-[#1f2937]">{stats.userRank ? `#${stats.userRank}` : '-'}</div>
                </div>
              </div>

              <div className="mt-2 rounded-2xl border border-[#d4deea] bg-white/92 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1f2937]">Quick Geo Challenge</p>
                  <p className="text-xs text-[#5a6b7a]">Streak: {streak}</p>
                </div>
                <p className="text-sm text-[#5a6b7a]">{activeChallenge.hint}</p>
                <p className="text-lg font-bold text-[#1f2937]">Capital of {activeChallenge.country}?</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    placeholder="Type capital..."
                    className="flex-1 min-w-[160px] rounded-lg border border-[#d4deea] bg-white px-3 py-2 text-[#1f2937] outline-none focus:border-[#1f6feb]"
                  />
                  <button onClick={handleCheck} className="neon-btn-primary px-4 py-2 text-sm">
                    Check
                  </button>
                  <button onClick={handleNextChallenge} className="neon-btn px-4 py-2 text-sm">
                    Next
                  </button>
                </div>
                {feedback && (
                  <p className={`text-sm ${feedback.startsWith('Correct') ? 'text-[#2a9d8f]' : 'text-[#e76f51]'}`}>
                    {feedback}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#d4deea] bg-[#0f1f35] text-white p-7 md:p-8 relative overflow-hidden shadow-[0_20px_60px_rgba(8,24,56,0.28)]">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#1f6feb]/35 blur-2xl" />
            <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#2a9d8f]/30 blur-2xl" />

            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">Choose Your Route</h2>
              <p className="text-[#b8c7da] mt-2 mb-8">Each mode trains a different part of your geography brain.</p>

              <div className="space-y-4">
                <Link href="/game/speed-run" className="block rounded-2xl bg-white/10 border border-white/20 p-4 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe2 size={18} className="text-[#8ec5ff]" />
                    <div>
                      <div className="font-semibold text-base">Speed Run</div>
                      <div className="text-sm text-[#bdd0e5]">Name as many countries as possible in 60 seconds</div>
                    </div>
                  </div>
                </Link>

                <Link href="/game/travel-chain" className="block rounded-2xl bg-white/10 border border-white/20 p-4 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <Compass size={18} className="text-[#9ee2bf]" />
                    <div>
                      <div className="font-semibold text-base">Travel Chain</div>
                      <div className="text-sm text-[#bdd0e5]">Travel between two countries using the shortest border path</div>
                    </div>
                  </div>
                </Link>

                <Link href="/game/world-quiz" className="block rounded-2xl bg-white/10 border border-white/20 p-4 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <Compass size={18} className="text-[#ffd7a6]" />
                    <div>
                      <div className="font-semibold text-base">World Quiz</div>
                      <div className="text-sm text-[#bdd0e5]">Full-map marathon for serious runs</div>
                    </div>
                  </div>
                </Link>

                <Link href="/game/continent-quiz" className="block rounded-2xl bg-white/10 border border-white/20 p-4 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <Globe2 size={18} className="text-[#a9f0dd]" />
                    <div>
                      <div className="font-semibold text-base">Continent Quiz</div>
                      <div className="text-sm text-[#bdd0e5]">Sporcle-style regional mastery</div>
                    </div>
                  </div>
                </Link>

                <Link href="/game/daily" className="block rounded-2xl bg-white/10 border border-white/20 p-4 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-3">
                    <Mountain size={18} className="text-[#b7e3ff]" />
                    <div>
                      <div className="font-semibold text-base">Daily Challenge</div>
                      <div className="text-sm text-[#bdd0e5]">New daily puzzle for everyone</div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <Mountain size={18} className="text-[#b7e3ff]" />
                <Link href="/leaderboard" className="text-[#b7e3ff] hover:text-white font-semibold text-lg">
                  Open Leaderboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
