'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InputBox } from '@/components/game/InputBox';
import { ResultsCard } from '@/components/results/ResultsCard';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { COUNTRIES, getCapital, normalizeText } from '@/lib/countries';

type QuizMode = 'country-to-capital' | 'capital-to-country';

interface RoundResult {
  country: string;
  prompt: string;
  expectedAnswer: string;
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
  const [mode, setMode] = useState<QuizMode>('country-to-capital');
  const [gameStarted, setGameStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [countries, setCountries] = useState<typeof COUNTRIES>([]);
  const [showCountry, setShowCountry] = useState(true);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string; expectedAnswer: string; bonus: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const ROUNDS = 10;
  const [challengeScore, setChallengeScore] = useState<number | null>(null);
  const [challengeFrom, setChallengeFrom] = useState('');
  const modeConfig = {
    'country-to-capital': {
      title: 'Country to Capital',
      subtitle: 'Instant recall challenge',
      formatBlurb: 'Countries flash briefly, then type the capital. Faster = more points!',
      promptPrefix: 'What is the capital of:',
      hiddenPromptText: 'Type the capital from memory.',
      inputPlaceholder: 'Type the capital...',
    },
    'capital-to-country': {
      title: 'Capital to Country',
      subtitle: 'Reverse recall challenge',
      formatBlurb: 'Capitals flash briefly, then type the country. Faster = more points!',
      promptPrefix: 'Which country has this capital:',
      hiddenPromptText: 'Type the country from memory.',
      inputPlaceholder: 'Type the country...',
    },
  } as const;

  // Initialize game with shuffled countries
  useEffect(() => {
    setCountries(pickRandomCountries(ROUNDS));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parsedScore = Number.parseInt(params.get('score') ?? '', 10);
    setChallengeScore(Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : null);
    setChallengeFrom(params.get('from') ?? '');
  }, []);

  const handleStartGame = () => {
    setGameStarted(true);
    setRoundStartTime(Date.now());
  };

  const currentCountry = countries[currentRoundIdx];
  const currentCapital = currentCountry ? getCapital(currentCountry.name) || '' : '';
  const currentPrompt =
    mode === 'country-to-capital' ? currentCountry?.name ?? '' : currentCapital;
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

    const correctCapital = getCapital(currentCountry.name) || '';
    const expectedAnswer = mode === 'country-to-capital' ? correctCapital : currentCountry.name;
    const prompt = mode === 'country-to-capital' ? currentCountry.name : correctCapital;
    const isCorrect =
      normalizeText(answer) === normalizeText(expectedAnswer);
    const timeToAnswer = (Date.now() - roundStartTime) / 1000;
    const bonus = isCorrect ? Math.max(10, 100 - Math.round(timeToAnswer) * 5) : 0;

    const newRoundResult: RoundResult = {
      country: currentCountry.name,
      prompt,
      expectedAnswer,
      correct: isCorrect,
      userAnswer: answer,
      capital: correctCapital,
      timeToAnswer: Math.round(timeToAnswer),
    };

    const updatedResults = [...roundResults, newRoundResult];
    setRoundResults(updatedResults);
    setFeedback({
      correct: isCorrect,
      answer,
      expectedAnswer,
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
            <h1 className="text-4xl font-bold gradient-text mb-3">Capital Guess</h1>
            <p className="text-[#5a6b7a]">{modeConfig[mode].subtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#d8e0eb] bg-white p-2">
            <button
              onClick={() => setMode('country-to-capital')}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === 'country-to-capital' ? 'bg-[#1f6feb] text-white' : 'text-[#1f2937] hover:bg-[#f5f8fc]'
              }`}
            >
              Country -&gt; Capital
            </button>
            <button
              onClick={() => setMode('capital-to-country')}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                mode === 'capital-to-country' ? 'bg-[#1f6feb] text-white' : 'text-[#1f2937] hover:bg-[#f5f8fc]'
              }`}
            >
              Capital -&gt; Country
            </button>
          </div>
          <div className="bg-[#ffffff] rounded-lg p-6 border border-[#e76f51] border-opacity-30">
            <p className="text-[#9aa6b2] text-sm mb-2">Game Format</p>
            <p className="text-lg font-bold text-[#1f2937] mb-3">{ROUNDS} Countries</p>
            <p className="text-[#5a6b7a] text-sm">
              {modeConfig[mode].formatBlurb}
            </p>
          </div>
          {challengeScore !== null && (
            <div className="rounded-lg border border-[#f4a261] bg-[#fff7ed] p-4 text-left">
              <p className="text-sm font-semibold text-[#9a3412]">Challenge from {challengeFrom || 'a friend'}</p>
              <p className="text-sm text-[#7c2d12]">Target score to beat: {challengeScore}</p>
            </div>
          )}
          <button
            onClick={handleStartGame}
            className="neon-btn-primary w-full py-3 text-lg"
          >
            Start Challenge
          </button>
          <a href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
            Back to Modes
          </a>
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
              gameMode={modeConfig[mode].title}
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
                        <p className="font-bold text-[#1f2937]">{result.prompt}</p>
                        <p className="text-sm text-[#5a6b7a]">
                          Answer: {result.userAnswer}
                        </p>
                        <p className="text-xs text-[#9aa6b2]">
                          Correct: {result.expectedAnswer} ({result.timeToAnswer}s)
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
              <a href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors">
                Back to Modes
              </a>
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
          <h1 className="text-3xl font-bold text-[#1f2937] mb-2">{modeConfig[mode].title}</h1>
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
          <p className="text-[#9aa6b2] text-sm mb-4">{modeConfig[mode].promptPrefix}</p>
          <p className="text-5xl font-bold text-[#1f6feb] mb-4">
            {showCountry ? currentPrompt : '???'}
          </p>
          <p className="text-[#5a6b7a] text-sm">
            {showCountry ? 'This prompt will hide in 2 seconds...' : modeConfig[mode].hiddenPromptText}
          </p>
        </div>

        {/* Input */}
        <div className="mb-8">
          <InputBox
            onSubmit={handleAnswerSubmit}
            placeholder={modeConfig[mode].inputPlaceholder}
            disabled={locked}
          />
        </div>

        {feedback && (
          <div className="neon-card p-4 text-center">
            <p className={`text-lg font-bold ${feedback.correct ? 'text-[#2a9d8f]' : 'text-[#e76f51]'}`}>
              {feedback.correct ? 'Correct!' : 'Not quite'}
            </p>
            <p className="text-sm text-[#5a6b7a]">
              {feedback.correct ? `+${feedback.bonus} pts` : `Correct answer: ${feedback.expectedAnswer}`}
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

