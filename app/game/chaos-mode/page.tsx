'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { COUNTRY_NAMES } from '@/lib/countries';
import { buildCountryLookup, resolveGuessToCountry } from '@/lib/countryNameUtils';
import { getCountriesBySuffix, getMicrostateCountries, getOneNeighborCountries } from '@/lib/challengePools';
import { ResultsCard } from '@/components/results/ResultsCard';

type ChaosRule = {
  key: string;
  label: string;
  allow: Set<string>;
};

export default function ChaosModePage() {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [ruleTick, setRuleTick] = useState(10);
  const [ruleIdx, setRuleIdx] = useState(0);
  const [input, setInput] = useState('');
  const [correctSet, setCorrectSet] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const lookup = useMemo(() => buildCountryLookup(COUNTRY_NAMES), []);

  const rules = useMemo<ChaosRule[]>(
    () => [
      { key: 'islands', label: 'Only islands/microstates', allow: new Set(getMicrostateCountries()) },
      { key: 'stan', label: 'Only countries ending with -stan', allow: new Set(getCountriesBySuffix('stan')) },
      { key: 'one-neighbor', label: 'Only one-neighbor countries', allow: new Set(getOneNeighborCountries()) },
      { key: 'a-letter', label: 'Only countries starting with A', allow: new Set(COUNTRY_NAMES.filter((name) => name.startsWith('A'))) },
    ],
    []
  );
  const activeRule = rules[ruleIdx % rules.length];

  useEffect(() => {
    if (!started || finished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
      setRuleTick((prev) => {
        if (prev <= 1) {
          setRuleIdx((idx) => idx + 1);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, finished]);

  const submit = () => {
    if (!started || finished) return;
    const resolved = resolveGuessToCountry(input, lookup);
    if (!resolved) {
      setWrong((v) => v + 1);
      setInput('');
      return;
    }
    if (!activeRule.allow.has(resolved)) {
      setWrong((v) => v + 1);
      setInput('');
      return;
    }
    if (!correctSet.has(resolved)) {
      setCorrectSet((prev) => new Set(prev).add(resolved));
    }
    setInput('');
  };

  if (!started) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-xl mx-auto neon-card p-8 text-center space-y-4">
          <h1 className="text-4xl font-bold gradient-text">Chaos Mode</h1>
          <p className="text-[#5a6b7a]">Rules change every 10 seconds. Adapt fast.</p>
          <button className="neon-btn-primary px-6 py-3" onClick={() => setStarted(true)}>
            Start Chaos
          </button>
          <a href="/modes" className="neon-btn px-6 py-3">Back to Modes</a>
        </div>
      </main>
    );
  }

  if (finished) {
    const correct = correctSet.size;
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ResultsCard gameMode="Chaos Mode" score={correct * 20 - wrong * 5} correct={correct} total={correct + wrong} durationSeconds={60} />
          <div className="neon-card p-6 space-y-3">
            <h2 className="text-2xl font-bold text-[#1f2937]">Chaos Complete</h2>
            <p className="text-[#5a6b7a]">Correct: {correct}</p>
            <p className="text-[#5a6b7a]">Wrong: {wrong}</p>
            <div className="flex gap-2">
              <Link href="/game/chaos-mode" className="neon-btn-primary px-5 py-2.5">Play Again</Link>
              <a href="/modes" className="neon-btn px-5 py-2.5">Back</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-xl mx-auto neon-card p-8 space-y-4">
        <h1 className="text-3xl font-bold text-[#1f2937]">Chaos Mode</h1>
        <p className="text-sm text-[#5a6b7a]">Time left: {timeLeft}s</p>
        <div className="rounded-xl border border-[#d8e0eb] bg-white p-4">
          <p className="text-sm text-[#5a6b7a]">Current rule ({ruleTick}s):</p>
          <p className="text-2xl font-black text-[#e76f51] mt-1">{activeRule.label}</p>
        </div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type country..."
          className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3"
        />
        <button onClick={submit} className="neon-btn-primary w-full py-3">Submit</button>
        <p className="text-sm text-[#5a6b7a]">Correct: {correctSet.size} | Wrong: {wrong}</p>
      </div>
    </main>
  );
}


