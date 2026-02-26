'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { COUNTRY_NAMES, getNeighbors } from '@/lib/countries';
import { buildCountryLookup, resolveGuessToCountry } from '@/lib/countryNameUtils';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { ResultsCard } from '@/components/results/ResultsCard';

function sampleCountries(count: number) {
  const arr = [...COUNTRY_NAMES];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

export default function ZoomRevealPage() {
  const rounds = 10;
  const [pool] = useState(() => sampleCountries(rounds));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lookup = useMemo(() => buildCountryLookup(COUNTRY_NAMES), []);
  const target = pool[idx];

  const focus = useMemo(() => {
    if (!target) return [];
    return [target, ...getNeighbors(target)];
  }, [target]);

  const submit = (rawValue?: string) => {
    if (!target || finished) return;
    const resolved = resolveGuessToCountry(rawValue ?? answer, lookup);
    const isCorrect = resolved === target;
    if (isCorrect) setCorrect((p) => p + 1);
    setFeedback(isCorrect ? 'Correct' : `Not quite. It was ${target}`);
    setAnswer('');
    setTimeout(() => {
      setFeedback(null);
      if (idx + 1 >= rounds) setFinished(true);
      else setIdx((p) => p + 1);
    }, 700);
  };

  const handleInputChange = (nextValue: string) => {
    setAnswer(nextValue);
    const resolved = resolveGuessToCountry(nextValue, lookup);
    if (resolved === target) {
      submit(nextValue);
    }
  };

  if (finished) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ResultsCard gameMode="Zoom Reveal Mode" score={correct * 60} correct={correct} total={rounds} durationSeconds={300} />
          <div className="neon-card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-[#1f2937]">Session Complete</h2>
            <p className="text-[#5a6b7a]">Guess countries from zoomed map regions.</p>
            <div className="flex gap-2">
              <Link href="/game/zoom-reveal" className="neon-btn-primary px-5 py-2.5">Play Again</Link>
              <a href="/modes" className="neon-btn px-5 py-2.5">Back</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="neon-card p-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-[#1f2937]">Map Zoom Reveal</h1>
          <p className="text-sm text-[#5a6b7a]">Round {idx + 1}/{rounds}</p>
        </div>
        <WorldGuessMap
          guessedCountries={[]}
          focusCountries={focus}
          title="Guess the highlighted region"
          mapHeightClass="h-[360px] md:h-[560px]"
          cropToFocus
          enableZoomPan
        />
        <div className="neon-card p-4 space-y-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="space-y-2"
          >
            <input
              value={answer}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type country..."
              className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3"
            />
            <button type="submit" className="neon-btn-primary w-full py-3">Submit Guess</button>
          </form>
          {feedback && <p className="text-sm text-[#5a6b7a]">{feedback}</p>}
        </div>
      </div>
    </main>
  );
}


