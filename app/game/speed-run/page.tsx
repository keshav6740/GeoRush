'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CountdownTimer } from '@/components/game/CountdownTimer';
import { GameTimer } from '@/components/game/GameTimer';
import { InputBox } from '@/components/game/InputBox';
import { ResultsCard } from '@/components/results/ResultsCard';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { useGame } from '@/hooks/useGame';
import { calculateAccuracy } from '@/lib/gameLogic';

export default function SpeedRunPage() {
  const GAME_DURATION = 60;
  const { gameState, startGame, endGame, addAnswer } = useGame('Speed Run', GAME_DURATION);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [displayedAnswers, setDisplayedAnswers] = useState<string[]>([]);
  const [challengeScore, setChallengeScore] = useState<number | null>(null);
  const [challengeFrom, setChallengeFrom] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const parsedScore = Number.parseInt(params.get('score') ?? '', 10);
    setChallengeScore(Number.isFinite(parsedScore) && parsedScore > 0 ? parsedScore : null);
    setChallengeFrom(params.get('from') ?? '');
  }, []);

  // Handle countdown completion
  const handleCountdownComplete = () => {
    setShowCountdown(false);
    startGame();
  };

  // Handle game end when timer reaches 0
  useEffect(() => {
    if (gameState.timeRemaining === 0 && !showResults) {
      endGame();
      setShowResults(true);
    }
  }, [gameState.timeRemaining, endGame, showResults]);

  // Track displayed answers for live feedback
  useEffect(() => {
    setDisplayedAnswers(gameState.answers);
  }, [gameState.answers]);

  const handleAnswerSubmit = (answer: string): boolean => {
    if (!gameState.isRunning) return false;
    return addAnswer(answer);
  };

  if (showCountdown) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full px-4">
          <h1 className="text-4xl font-bold text-center mb-12 text-[#5a6b7a]">
            Speed Run Challenge
          </h1>
          <CountdownTimer onComplete={handleCountdownComplete} />
        </div>
      </main>
    );
  }

  if (showResults) {
    const totalAttempts = gameState.correct + gameState.incorrect;
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-6 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <ResultsCard
              gameMode="Speed Run"
              score={gameState.score}
              correct={gameState.correct}
              total={totalAttempts}
              durationSeconds={GAME_DURATION}
              timeRemainingSeconds={gameState.timeRemaining}
              countriesGuessed={displayedAnswers}
            />
            <WorldGuessMap guessedCountries={displayedAnswers} title="World Map Highlights" />
          </div>
          <div className="text-center">
            <Link href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors">
              Back to Modes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Speed Run Challenge</h1>
          <p className="text-[#5a6b7a]">Name as many countries as you can!</p>
          {challengeScore !== null && (
            <p className="text-sm text-[#9a3412] mt-2">
              Challenge from {challengeFrom || 'a friend'}: beat {challengeScore}
            </p>
          )}
        </div>

        {/* Timer */}
        <div className="mb-12">
          <GameTimer timeRemaining={gameState.timeRemaining} duration={GAME_DURATION} />
        </div>

        {/* Score Display */}
        <div className="neon-card p-6 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[#9aa6b2] text-sm mb-1">Correct</p>
              <p className="text-3xl font-bold text-[#2a9d8f]">{gameState.correct}</p>
            </div>
            <div>
              <p className="text-[#9aa6b2] text-sm mb-1">Score</p>
              <p className="text-3xl font-bold text-[#1f6feb]">{gameState.score}</p>
            </div>
            <div>
              <p className="text-[#9aa6b2] text-sm mb-1">Accuracy</p>
              <p className="text-3xl font-bold text-[#f4a261]">
                {calculateAccuracy(gameState.correct, gameState.correct + gameState.incorrect)}%
              </p>
            </div>
          </div>
        </div>

        {/* Input Box */}
        <div className="mb-8">
          <InputBox
            onSubmit={handleAnswerSubmit}
            placeholder="Type a country name..."
            disabled={!gameState.isRunning}
          />
        </div>

        {/* Answered Countries List */}
        {displayedAnswers.length > 0 && (
          <div className="neon-card p-6">
            <h3 className="text-lg font-bold text-[#2a9d8f] mb-4">
              Countries Named ({displayedAnswers.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {displayedAnswers.map((country, idx) => (
                <div
                  key={idx}
                  className="bg-[#ffffff] px-3 py-2 rounded-lg text-sm text-[#5a6b7a] border border-[#2a9d8f] border-opacity-30"
                >
                  {country}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
