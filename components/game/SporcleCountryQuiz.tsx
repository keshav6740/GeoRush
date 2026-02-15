'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResultsCard } from '@/components/results/ResultsCard';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { buildCountryLookup, resolveGuessToCountry } from '@/lib/countryNameUtils';
import { formatTime } from '@/lib/gameLogic';

interface SporcleCountryQuizProps {
  gameMode: string;
  title: string;
  subtitle: string;
  targetCountries: string[];
  durationSeconds: number;
  backHref?: string;
  onBack?: () => void;
  focusRegion?: 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';
  emphasizeMap?: boolean;
  mapHeightClass?: string;
  inputFirst?: boolean;
  showRecentGuesses?: boolean;
}

export function SporcleCountryQuiz({
  gameMode,
  title,
  subtitle,
  targetCountries,
  durationSeconds,
  backHref = '/modes',
  onBack,
  focusRegion,
  emphasizeMap = false,
  mapHeightClass,
  inputFirst = false,
  showRecentGuesses = true,
}: SporcleCountryQuizProps) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [input, setInput] = useState('');
  const [guessedCountries, setGuessedCountries] = useState<string[]>([]);
  const [revealedCountries, setRevealedCountries] = useState<string[]>([]);
  const [gaveUp, setGaveUp] = useState(false);

  const targetList = useMemo(() => Array.from(new Set(targetCountries)), [targetCountries]);
  const targetSet = useMemo(() => new Set(targetList), [targetList]);
  const guessedSet = useMemo(() => new Set(guessedCountries), [guessedCountries]);
  const lookup = useMemo(() => buildCountryLookup(targetList), [targetList]);

  const missedCountries = useMemo(
    () => targetList.filter((country) => !guessedSet.has(country)),
    [targetList, guessedSet]
  );

  const score = guessedCountries.length * 10 + Math.floor(timeRemaining / 6);

  useEffect(() => {
    if (!started || finished) return;
    if (timeRemaining <= 0) {
      setFinished(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [started, finished, timeRemaining]);

  useEffect(() => {
    if (started && guessedCountries.length >= targetList.length && targetList.length > 0) {
      setFinished(true);
    }
  }, [started, guessedCountries.length, targetList.length]);

  const tryGuess = (rawValue: string) => {
    const matched = resolveGuessToCountry(rawValue, lookup);
    if (!matched) return false;
    if (!targetSet.has(matched)) return false;
    if (guessedSet.has(matched)) return false;

    setGuessedCountries((prev) => [...prev, matched]);
    return true;
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!value.trim()) return;
    if (tryGuess(value)) {
      setInput('');
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    if (tryGuess(input)) {
      setInput('');
    }
  };

  const handleRestart = () => {
    setInput('');
    setGuessedCountries([]);
    setRevealedCountries([]);
    setGaveUp(false);
    setTimeRemaining(durationSeconds);
    setStarted(true);
    setFinished(false);
  };

  const handleGiveUp = () => {
    const remaining = targetList.filter((country) => !guessedSet.has(country));
    setRevealedCountries(remaining);
    setGaveUp(true);
    setFinished(true);
  };

  if (!started) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="neon-card p-8 max-w-xl w-full text-center space-y-6 animate-float-up">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-3">{title}</h1>
            <p className="text-[#5a6b7a]">{subtitle}</p>
          </div>
          <div className="bg-[#ffffff] rounded-lg p-6 border border-[#1f6feb] border-opacity-30">
            <p className="text-[#9aa6b2] text-sm mb-2">Rules</p>
            <p className="text-lg font-bold text-[#1f2937] mb-3">
              {targetList.length} countries in {formatTime(durationSeconds)}
            </p>
            <p className="text-[#5a6b7a] text-sm">
              No hints, no autocomplete. Type exact country names and they fill live on the map.
            </p>
          </div>
          <button onClick={() => setStarted(true)} className="neon-btn-primary w-full py-3 text-lg">
            Start Quiz
          </button>
          {onBack ? (
            <button onClick={onBack} className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
              Back
            </button>
          ) : (
            <Link href={backHref} className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
              Back
            </Link>
          )}
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {emphasizeMap ? (
            <WorldGuessMap
              guessedCountries={guessedCountries}
              revealedCountries={revealedCountries}
              focusCountries={targetList}
              focusRegion={focusRegion}
              mapHeightClass={mapHeightClass ?? 'h-[420px] md:h-[760px]'}
              title="Guessed Countries"
            />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <ResultsCard
                gameMode={gameMode}
                score={score}
                correct={guessedCountries.length}
                total={targetList.length}
                durationSeconds={durationSeconds}
                timeRemainingSeconds={timeRemaining}
                countriesGuessed={guessedCountries}
              />
              <WorldGuessMap
                guessedCountries={guessedCountries}
                revealedCountries={revealedCountries}
                focusCountries={targetList}
                focusRegion={focusRegion}
                mapHeightClass={mapHeightClass}
                title="Guessed Countries"
              />
            </div>
          )}

          {emphasizeMap && (
            <ResultsCard
              gameMode={gameMode}
              score={score}
              correct={guessedCountries.length}
              total={targetList.length}
              durationSeconds={durationSeconds}
              timeRemainingSeconds={timeRemaining}
              countriesGuessed={guessedCountries}
            />
          )}

          <div className="neon-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#1f2937]">Missed Countries</h3>
              <span className="badge">{missedCountries.length} missed</span>
            </div>
            {gaveUp && (
              <p className="text-sm text-[#e76f51] mb-3">
                You gave up. Remaining countries were revealed in red on the map.
              </p>
            )}
            {missedCountries.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {missedCountries.map((country) => (
                  <div
                    key={country}
                    className="bg-[#ffffff] px-3 py-2 rounded-lg text-sm text-[#e76f51] border border-[#e76f51] border-opacity-40"
                  >
                    {country}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#2a9d8f] font-semibold">Perfect run. You got every country.</p>
            )}
          </div>

          <div className="text-center flex items-center justify-center gap-3">
            <button onClick={handleRestart} className="neon-btn-primary px-6 py-3">
              Play Again
            </button>
            {onBack ? (
              <button onClick={onBack} className="neon-btn px-6 py-3">
                Back
              </button>
            ) : (
              <Link href={backHref} className="neon-btn px-6 py-3">
                Back
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${emphasizeMap ? 'min-h-screen md:h-screen md:overflow-hidden' : 'min-h-screen'} px-4 py-3 md:py-4`}>
      <div className={`max-w-7xl mx-auto ${emphasizeMap ? 'h-full space-y-3' : 'grid grid-cols-1 xl:grid-cols-2 gap-6 items-start'}`}>
        {emphasizeMap && (
          <div className="neon-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[200px]">
                <h1 className="text-2xl font-bold text-[#1f2937] leading-tight">{title}</h1>
                <p className="text-[#5a6b7a] text-xs">{subtitle}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:min-w-[320px]">
                <div className="stat-card !p-2">
                  <div className="stat-title">Guessed</div>
                  <div className="stat-value !text-base">{guessedCountries.length}</div>
                </div>
                <div className="stat-card !p-2">
                  <div className="stat-title">Remaining</div>
                  <div className="stat-value !text-base">{Math.max(0, targetList.length - guessedCountries.length)}</div>
                </div>
                <div className="stat-card !p-2">
                  <div className="stat-title">Time</div>
                  <div className="stat-value !text-base">{formatTime(timeRemaining)}</div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => handleInputChange(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Type country name..."
                  className="input-neon w-full text-lg"
                />
              </form>
              <button onClick={handleGiveUp} className="neon-btn px-4 py-2 text-sm whitespace-nowrap">
                Give Up
              </button>
            </div>
          </div>
        )}

        {emphasizeMap && (
          <WorldGuessMap
            guessedCountries={guessedCountries}
            focusCountries={targetList}
            focusRegion={focusRegion}
            mapHeightClass={mapHeightClass ?? 'h-[52vh] md:h-[calc(100vh-190px)]'}
            title="Live Fill Map"
          />
        )}

        {!emphasizeMap && (
        <div className="neon-card p-6 space-y-5 min-h-[620px]">
          {inputFirst && (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={input}
                onChange={(event) => handleInputChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Type country name..."
                className="input-neon w-full text-lg"
              />
            </form>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#1f2937]">{title}</h1>
              <p className="text-[#5a6b7a] text-sm">{subtitle}</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#9aa6b2]">Time Left</div>
              <div className="text-3xl font-bold text-[#1f6feb]">{formatTime(timeRemaining)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="stat-title">Guessed</div>
              <div className="stat-value">{guessedCountries.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Remaining</div>
              <div className="stat-value">{Math.max(0, targetList.length - guessedCountries.length)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Score</div>
              <div className="stat-value">{score}</div>
            </div>
          </div>

          {!inputFirst && (
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={input}
                onChange={(event) => handleInputChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Type country name..."
                className="input-neon w-full text-lg"
              />
            </form>
          )}

          {showRecentGuesses && (
            <div className="min-h-[130px]">
              <p className="text-sm text-[#9aa6b2] mb-2">Recent Guesses</p>
              {guessedCountries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {guessedCountries
                    .slice(-20)
                    .reverse()
                    .map((country) => (
                      <span key={country} className="pill !py-1 !px-3 text-xs">
                        {country}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-[#5a6b7a]">Start typing to fill the map live.</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleGiveUp} className="neon-btn px-4 py-2 text-sm">
              Give Up
            </button>
          </div>
        </div>
        )}

        {!emphasizeMap && (
          <WorldGuessMap
            guessedCountries={guessedCountries}
            focusCountries={targetList}
            focusRegion={focusRegion}
            mapHeightClass={mapHeightClass}
            title="Live Fill Map"
          />
        )}
      </div>
    </main>
  );
}
