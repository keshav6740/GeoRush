'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InputBox } from '@/components/game/InputBox';
import { ResultsCard } from '@/components/results/ResultsCard';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { COUNTRIES, getCapital, normalizeText } from '@/lib/countries';

interface RoundResult {
  country: string;
  correct: boolean;
  userAnswer?: string;
  capital: string;
  timeToAnswer: number;
}

function pickRandomCountries(count: number) {
  const shuffled = [...COUNTRIES];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default function CapitalGuessPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [countries, setCountries] = useState<typeof COUNTRIES>([]);
  const [showCountry, setShowCountry] = useState(true);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string; capital: string; bonus: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const ROUNDS = 10;

  // Initialize game with shuffled countries
  useEffect(() => {
    setCountries(pickRandomCountries(ROUNDS));
  }, []);

  const handleStartGame = () => {
    setGameStarted(true);
    setRoundStartTime(Date.now());
  };

  const currentCountry = countries[currentRoundIdx];
  const progress = currentRoundIdx + 1;

  useEffect(() => {
    if (!gameStarted || !currentCountry) return;
    setShowCountry(true);
    const timer = setTimeout(() => setShowCountry(false), 2000);
    return () => clearTimeout(timer);
  }, [gameStarted, currentCountry, currentRoundIdx]);

  const handleAnswerSubmit = (answer: string): boolean => {
    if (!currentCountry) return false;
    if (locked) return false;

    const correctCapital = getCapital(currentCountry.name);
    const isCorrect =
      normalizeText(answer) === normalizeText(correctCapital || '');
    const timeToAnswer = (Date.now() - roundStartTime) / 1000;
    const bonus = isCorrect ? Math.max(10, 100 - Math.round(timeToAnswer) * 5) : 0;

    const newRoundResult: RoundResult = {
      country: currentCountry.name,
      correct: isCorrect,
      userAnswer: answer,
      capital: correctCapital || '',
      timeToAnswer: Math.round(timeToAnswer),
    };

    const updatedResults = [...roundResults, newRoundResult];
    setRoundResults(updatedResults);
    setFeedback({
      correct: isCorrect,
      answer,
      capital: correctCapital || '',
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
            <h1 className="text-4xl font-bold gradient-text mb-3">Country to Capital</h1>
            <p className="text-[#5a6b7a]">Instant recall challenge</p>
          </div>
          <div className="bg-[#ffffff] rounded-lg p-6 border border-[#e76f51] border-opacity-30">
            <p className="text-[#9aa6b2] text-sm mb-2">Game Format</p>
            <p className="text-lg font-bold text-[#1f2937] mb-3">{ROUNDS} Countries</p>
            <p className="text-[#5a6b7a] text-sm">
              Countries flash briefly, then type the capital. Faster = more points!
            </p>
          </div>
          <button
            onClick={handleStartGame}
            className="neon-btn-primary w-full py-3 text-lg"
          >
            Start Challenge
          </button>
          <Link href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
            Back to Modes
          </Link>
        </div>
      </main>
    );
  }

  if (showResults) {
    const correctCount = roundResults.filter(r => r.correct).length;
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
              gameMode="Country to Capital"
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
                        <p className="text-sm text-[#5a6b7a]">
                          Answer: {result.userAnswer}
                        </p>
                        <p className="text-xs text-[#9aa6b2]">
                          Correct: {result.capital} ({result.timeToAnswer}s)
                        </p>
                      </div>
                      <span className="text-xl">
                        {result.correct ? 'Correct' : 'Wrong'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-6">
              <Link href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors">
                Back to Modes
              </Link>
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Country to Capital</h1>
          <p className="text-[#5a6b7a]">Round {progress}/{ROUNDS}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-[#f8fafc] rounded-full h-2 border border-[#1f6feb] border-opacity-30">
            <div
              className="h-full rounded-full bg-[#1f6feb] transition-all duration-300"
              style={{ width: `${(progress / ROUNDS) * 100}%` }}
            />
          </div>
        </div>

        {/* Country Display */}
        <div className="neon-card p-8 mb-8 text-center animate-float-up">
          <p className="text-[#9aa6b2] text-sm mb-4">What is the capital of:</p>
          <p className="text-5xl font-bold text-[#1f6feb] mb-4">
            {showCountry ? currentCountry.name : '???'}
          </p>
          <p className="text-[#5a6b7a] text-sm">
            {showCountry ? 'This country will hide in 2 seconds...' : 'Type the capital from memory.'}
          </p>
        </div>

        {/* Input */}
        <div className="mb-8">
          <InputBox
            onSubmit={handleAnswerSubmit}
            placeholder="Type the capital..."
            disabled={locked}
          />
        </div>

        {feedback && (
          <div className="neon-card p-4 text-center">
            <p className={`text-lg font-bold ${feedback.correct ? 'text-[#2a9d8f]' : 'text-[#e76f51]'}`}>
              {feedback.correct ? 'Correct!' : 'Not quite'}
            </p>
            <p className="text-sm text-[#5a6b7a]">
              {feedback.correct ? `+${feedback.bonus} pts` : `Correct answer: ${feedback.capital}`}
            </p>
          </div>
        )}

        {/* Hint */}
        <div className="text-center">
          <p className="text-sm text-[#9aa6b2]">
            Faster answers earn more points!
          </p>
        </div>
      </div>
    </main>
  );
}
