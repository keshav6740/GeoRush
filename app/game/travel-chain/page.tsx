'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { getAutocomplete } from '@/lib/countries';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import {
  getDailyTravelChallenge,
  getPathWithinCountries,
  getRandomTravelChallenge,
  getShortestPath,
  resolveCountryName,
  type TravelChallenge,
} from '@/lib/travelChain';

type TravelMode = 'daily' | 'practice';

export default function TravelChainPage() {
  const [mode, setMode] = useState<TravelMode>('daily');
  const [challenge, setChallenge] = useState<TravelChallenge>(() => getDailyTravelChallenge());
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [chain, setChain] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [completedPath, setCompletedPath] = useState<string[] | null>(null);

  const timeSpentSeconds = startedAt && endedAt ? Math.max(1, Math.round((endedAt - startedAt) / 1000)) : 0;
  const mapResetKey = `${mode}:${challenge.start}->${challenge.end}`;
  const guessesUsed = Math.max(0, chain.length - 1);
  const edgesUsed = Math.max(0, (completedPath?.length ?? 1) - 1);
  const solved = isFinished && Boolean(completedPath);
  const optimalPath = useMemo(() => getShortestPath(challenge.start, challenge.end), [challenge.start, challenge.end]);
  const isOptimal = solved && edgesUsed === challenge.minSteps;

  const startChallenge = (nextMode: TravelMode, forceRefresh = false) => {
    const nextChallenge =
      nextMode === 'daily'
        ? getDailyTravelChallenge()
        : forceRefresh || nextMode !== mode
          ? getRandomTravelChallenge()
          : getRandomTravelChallenge();

    setMode(nextMode);
    setChallenge(nextChallenge);
    setChain([nextChallenge.start]);
    setStartedAt(Date.now());
    setEndedAt(null);
    setIsFinished(false);
    setCompletedPath(null);
    setHintsUsed(0);
    setHintText(null);
    setMessage(null);
    setInput('');
    setSuggestions([]);
  };

  const submitCountry = (answer: string) => {
    if (isFinished) return false;
    if (chain.length === 0) return false;

    const resolved = resolveCountryName(answer);
    if (!resolved) {
      setMessage('That country was not recognized.');
      return false;
    }

    const current = chain[chain.length - 1];
    if (resolved === current || resolved === challenge.start) {
      setMessage('That country is already in your route.');
      return false;
    }
    if (chain.includes(resolved)) {
      setMessage('Already guessed in this route.');
      return false;
    }

    const nextChain = [...chain, resolved];
    setChain(nextChain);
    setMessage(null);
    setHintText(null);
    setInput('');
    setSuggestions([]);

    const path = getPathWithinCountries(challenge.start, challenge.end, [...nextChain, challenge.end]);
    if (path) {
      setCompletedPath(path);
      setEndedAt(Date.now());
      setIsFinished(true);
      setMessage('Route connected.');
    }
    return true;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    void submitCountry(input);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    const clean = value.trim();
    if (!clean) {
      setSuggestions([]);
      return;
    }
    setSuggestions(getAutocomplete(clean).slice(0, 6));
  };

  const handleHintNextCountry = () => {
    if (isFinished || chain.length === 0) return;
    if (hintsUsed >= 3) {
      setHintText('No hints left.');
      return;
    }

    const current = chain[chain.length - 1];
    const path = getShortestPath(current, challenge.end);
    const next = path && path.length > 1 ? path[1] : null;
    if (!next) {
      setHintText('No direct hint available for this step.');
      return;
    }
    setHintsUsed((prev) => prev + 1);
    setHintText(`Hint: try ${next}`);
  };

  const handleHintPathLength = () => {
    if (isFinished || chain.length === 0) return;
    if (hintsUsed >= 3) {
      setHintText('No hints left.');
      return;
    }
    const current = chain[chain.length - 1];
    const path = getShortestPath(current, challenge.end);
    const remaining = path ? Math.max(0, path.length - 1) : 0;
    setHintsUsed((prev) => prev + 1);
    setHintText(`Hint: minimum remaining borders from here: ${remaining}`);
  };

  const handleHintInitial = () => {
    if (isFinished || chain.length === 0) return;
    if (hintsUsed >= 3) {
      setHintText('No hints left.');
      return;
    }
    const current = chain[chain.length - 1];
    const path = getShortestPath(current, challenge.end);
    const next = path && path.length > 1 ? path[1] : null;
    if (!next) {
      setHintText('No direct hint available for this step.');
      return;
    }
    setHintsUsed((prev) => prev + 1);
    setHintText(`Hint: next country starts with "${next[0]}"`);
  };

  const handleHint = () => {
    handleHintNextCountry();
  };

  if (chain.length === 0 || !startedAt) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="neon-card p-8 space-y-6 text-center">
            <h1 className="text-4xl font-bold gradient-text">Travel Chain</h1>
            <p className="text-[#5a6b7a]">
              Travel from one country to another by entering countries that eventually connect the route in as few steps as possible.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={() => startChallenge('daily')} className="neon-btn-primary py-3">
                Start Daily Chain
              </button>
              <button onClick={() => startChallenge('practice', true)} className="neon-btn py-3">
                Start Practice Chain
              </button>
            </div>
            <a href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
              Back to Modes
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (isFinished && solved) {
    const optimal = Math.max(1, challenge.minSteps);
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-2xl border border-[#d8e0eb] bg-white p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-[#6a7c90] mb-2">Route Completed</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1f2937] mb-2">
              {isOptimal ? 'Perfect Route' : 'Route Completed'}
            </h1>
            <p className="text-[#4d6073] text-base md:text-lg">
              You traveled from <span className="font-semibold text-[#e76f51]">{challenge.start}</span> to{' '}
              <span className="font-semibold text-[#2a9d8f]">{challenge.end}</span> in{' '}
              <span className="font-semibold text-[#1f2937]">{edgesUsed}</span> step(s).
            </p>
            {isOptimal ? (
              <p className="text-[#13855e] font-semibold mt-2">That is the most optimized route.</p>
            ) : (
              <p className="text-[#1f6feb] font-semibold mt-2">
                Best possible is {optimal} step(s). You used {Math.max(0, edgesUsed - optimal)} extra step(s).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-6 items-start">
            <WorldGuessMap
              guessedCountries={Array.from(new Set([...(completedPath ?? []), ...chain, challenge.end]))}
              startCountries={[challenge.start]}
              endCountries={[challenge.end]}
              mapHeightClass="h-[380px] md:h-[620px]"
              title="Your Travel Route"
              enableZoomPan
              interactionResetKey={mapResetKey}
            />
            <div className="rounded-2xl border border-[#d8e0eb] bg-white p-4 md:p-5 space-y-4">
              <div className="rounded-xl border border-[#e4ebf5] bg-[#f7fbff] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#6a7c90] mb-1">Stats</p>
                <p className="text-[#1f2937] text-sm">Time: {timeSpentSeconds}s</p>
                <p className="text-[#1f2937] text-sm">Hints used: {hintsUsed}/3</p>
                <p className="text-[#1f2937] text-sm">Guesses entered: {guessesUsed}</p>
                <p className="text-[#1f2937] text-sm">Optimal steps: {optimal}</p>
              </div>
              <div className="rounded-xl border border-[#e4ebf5] bg-[#f7fbff] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#6a7c90] mb-2">Connected Path</p>
                <div className="flex flex-wrap gap-2">
                  {(completedPath ?? chain).map((country, idx) => (
                    <span key={`${country}-${idx}`} className="inline-flex items-center rounded-full bg-white border border-[#d7e3f5] px-3 py-1 text-xs text-[#1f2937]">
                      {country}
                    </span>
                  ))}
                </div>
              </div>
              {optimalPath && (
                <div className="rounded-xl border border-[#e4ebf5] bg-[#f7fbff] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#6a7c90] mb-2">Most Optimized Path</p>
                  <div className="flex flex-wrap gap-2">
                    {optimalPath.map((country, idx) => (
                      <span key={`${country}-${idx}`} className="inline-flex items-center rounded-full bg-white border border-[#d7e3f5] px-3 py-1 text-xs text-[#1f2937]">
                        {country}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {mode === 'practice' ? (
              <button onClick={() => startChallenge('practice', true)} className="neon-btn-primary px-6 py-3">
                New Random Route
              </button>
            ) : (
              <button onClick={() => startChallenge('daily')} className="neon-btn-primary px-6 py-3">
                Replay Today&apos;s Route
              </button>
            )}
            <button onClick={() => startChallenge(mode, true)} className="neon-btn px-6 py-3">
              Try Again
            </button>
            <a href="/modes" className="neon-btn px-6 py-3 inline-block">
              Back to Modes
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-2xl border border-[#d8e0eb] bg-white p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[#6a7c90]">Travel Chain</p>
              <h1 className="text-2xl md:text-3xl font-bold text-[#1f2937]">
                {mode === 'daily' ? "Today's route" : 'Practice route'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startChallenge('daily')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mode === 'daily' ? 'bg-[#1f6feb] text-white' : 'bg-[#f7fbff] border border-[#d8e0eb] text-[#1f2937]'
                }`}
              >
                Daily Challenge
              </button>
              <button
                onClick={() => startChallenge('practice', true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  mode === 'practice' ? 'bg-[#1f6feb] text-white' : 'bg-[#f7fbff] border border-[#d8e0eb] text-[#1f2937]'
                }`}
              >
                Practice
              </button>
            </div>
          </div>
          <p className="mt-3 text-lg text-[#334155]">
            {mode === 'daily' ? "Today I'd like to travel from " : 'Travel from '}
            <span className="font-bold text-[#e76f51]">{challenge.start}</span> to{' '}
            <span className="font-bold text-[#2a9d8f]">{challenge.end}</span>.
          </p>
          <p className="text-sm text-[#607386] mt-1">
            Minimum known route: {challenge.minSteps} border hops.
            {mode === 'daily' && challenge.dateKey ? ` Daily seed: ${challenge.dateKey}` : ' Randomized each run.'}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] gap-5 items-start">
          <div className="rounded-2xl border border-[#d8e0eb] bg-white p-4 md:p-5">
            <WorldGuessMap
              guessedCountries={chain}
              focusCountries={[challenge.start, challenge.end]}
              startCountries={[challenge.start]}
              endCountries={[challenge.end]}
              mapHeightClass="h-[360px] md:h-[600px]"
              title="Target Countries"
              enableZoomPan
              hideNonScopeCountries
              cropToFocus={false}
              interactionResetKey={mapResetKey}
            />
          </div>

          <div className="rounded-2xl border border-[#d8e0eb] bg-white p-4 md:p-5 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => handleInputChange(event.target.value)}
                  placeholder="Enter any country..."
                  className="w-full rounded-xl border border-[#d8e0eb] bg-[#fdfefe] px-3 py-2.5 text-[#1f2937] outline-none focus:border-[#1f6feb]"
                  autoComplete="off"
                />
                <button type="submit" className="neon-btn-primary px-4 py-2.5 whitespace-nowrap">
                  Guess
                </button>
              </div>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setInput(suggestion);
                        void submitCountry(suggestion);
                      }}
                      className="rounded-full border border-[#d8e0eb] bg-[#f7fbff] px-3 py-1 text-xs text-[#1f2937] hover:border-[#1f6feb]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="rounded-xl border border-[#e4ebf5] bg-[#f7fbff] p-3">
              <p className="text-sm font-semibold text-[#1f2937] mb-2">Hints ({hintsUsed}/3)</p>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={handleHint} className="neon-btn py-2 text-sm">
                  Show next country
                </button>
                <button onClick={handleHintPathLength} className="neon-btn py-2 text-sm">
                  Show min remaining steps
                </button>
                <button onClick={handleHintInitial} className="neon-btn py-2 text-sm">
                  Show next country initial
                </button>
              </div>
            </div>
            {hintText && <p className="text-sm text-[#1f6feb]">{hintText}</p>}
            {message && <p className="text-sm text-[#e76f51]">{message}</p>}

            <div className="rounded-xl border border-[#e4ebf5] bg-[#f7fbff] p-3">
              <p className="text-sm font-semibold text-[#1f2937] mb-2">Past Guesses ({guessesUsed} guess{guessesUsed === 1 ? '' : 'es'})</p>
              <div className="flex flex-wrap gap-2">
                {chain.map((country, idx) => (
                  <span key={`${country}-${idx}`} className="inline-flex items-center rounded-full bg-white border border-[#d7e3f5] px-3 py-1 text-xs text-[#1f2937]">
                    {country}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => startChallenge(mode, true)} className="neon-btn w-full py-2.5">
                Reset Route
              </button>
              <a href="/modes" className="neon-btn w-full py-2.5 text-center inline-block">
                Back
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

