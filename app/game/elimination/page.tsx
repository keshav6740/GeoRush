'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { normalizeText, COUNTRY_NAMES } from '@/lib/countries';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
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

  const prompt = pool[idx];
  const exactPrompt = useMemo(() => (prompt ? normalizeText(prompt) : ''), [prompt]);

  const onSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!prompt || finished) return;
    const exactInput = normalizeText(input);
    if (exactInput === exactPrompt) {
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
          <a href="/modes" className="neon-btn px-6 py-3">Back to Modes</a>
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
              <a href="/modes" className="neon-btn px-5 py-2.5">Back</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div className="neon-card p-5">
            <h1 className="text-3xl font-bold text-[#1f2937]">Elimination Mode</h1>
            <p className="text-sm text-[#5a6b7a] mt-1">Prompt {idx + 1}/100</p>
            <p className="text-sm text-[#5a6b7a] mt-2">Guess the highlighted country exactly by name. One mistake ends the run.</p>
          </div>
          <WorldGuessMap
            guessedCountries={[]}
            focusCountries={prompt ? [prompt] : []}
            title="Country Outline Prompt"
            mapHeightClass="h-[320px] md:h-[520px]"
            cropToFocus
            focusPaddingRatio={0.14}
            minFocusViewportRatio={0.28}
            hideNonScopeCountries={false}
          />
        </div>
        <div className="neon-card p-8 space-y-4">
          <p className="text-sm text-[#5a6b7a]">Type this country exactly:</p>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type country name..."
              className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="neon-btn-primary w-full py-3">Submit</button>
          </form>
          <p className="text-sm text-[#5a6b7a]">Exact mode: abbreviations/aliases are not accepted here.</p>
          {status && <p className="text-sm text-[#5a6b7a]">{status}</p>}
        </div>
      </div>
    </main>
  );
}


