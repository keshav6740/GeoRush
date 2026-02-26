'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { resolveGuessToCountry, buildCountryLookup } from '@/lib/countryNameUtils';
import { COUNTRY_NAMES } from '@/lib/countries';
import { ResultsCard } from '@/components/results/ResultsCard';

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function EliminationPage() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pool] = useState(() => shuffle(COUNTRY_NAMES).slice(0, 100));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const lookup = useMemo(() => buildCountryLookup(COUNTRY_NAMES), []);

  const prompt = pool[idx];

  const onSubmit = () => {
    if (!prompt || finished) return;
    const resolved = resolveGuessToCountry(input, lookup);
    if (resolved === prompt) {
      setCorrect((prev) => prev + 1);
      setIdx((prev) => prev + 1);
      setInput('');
      setStatus('Correct');
      if (idx + 1 >= pool.length) {
        setFinished(true);
      }
    } else {
      setStatus(`Eliminated. Correct was ${prompt}`);
      setFinished(true);
    }
  };

  if (!started) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-xl mx-auto neon-card p-8 text-center space-y-4">
          <h1 className="text-4xl font-bold gradient-text">Elimination Mode</h1>
          <p className="text-[#5a6b7a]">One mistake and your run ends. 100 prompts, no mercy.</p>
          <button className="neon-btn-primary px-6 py-3" onClick={() => setStarted(true)}>
            Start Elimination
          </button>
          <Link href="/modes" className="neon-btn px-6 py-3">Back to Modes</Link>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ResultsCard gameMode="Elimination Mode" score={correct * 25} correct={correct} total={100} durationSeconds={600} />
          <div className="neon-card p-6 space-y-4">
            <h2 className="text-2xl font-bold text-[#1f2937]">Run Summary</h2>
            <p className="text-[#5a6b7a]">{status ?? 'Run ended.'}</p>
            <p className="text-[#1f2937] font-semibold">Final streak: {correct}</p>
            <div className="flex gap-2">
              <Link href="/game/elimination" className="neon-btn-primary px-5 py-2.5">Try Again</Link>
              <Link href="/modes" className="neon-btn px-5 py-2.5">Back</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-xl mx-auto neon-card p-8 space-y-4">
        <h1 className="text-3xl font-bold text-[#1f2937]">Elimination Mode</h1>
        <p className="text-sm text-[#5a6b7a]">Prompt {idx + 1}/100</p>
        <div className="rounded-xl border border-[#d8e0eb] bg-white p-4">
          <p className="text-sm text-[#5a6b7a]">Type this country exactly:</p>
          <p className="text-2xl font-black text-[#1f6feb] mt-1">{prompt}</p>
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type country..."
          className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3"
        />
        <button onClick={onSubmit} className="neon-btn-primary w-full py-3">Submit</button>
        {status && <p className="text-sm text-[#5a6b7a]">{status}</p>}
      </div>
    </main>
  );
}

