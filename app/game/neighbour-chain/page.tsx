'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { InputBox } from '@/components/game/InputBox';
import { useNeighbourChain } from '@/hooks/useGame';
import { getNeighbors, COUNTRY_NAMES } from '@/lib/countries';
import { getComparisonMessage } from '@/lib/gameLogic';
import { savePendingScore } from '@/lib/pendingScore';
import { getAuthSession, getOrCreatePlayerIdentity } from '@/lib/playerId';

export default function NeighbourChainPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [startingCountry, setStartingCountry] = useState('Germany');
  const [showResults, setShowResults] = useState(false);
  const [resultRank, setResultRank] = useState<number | null>(null);
  const [resultBetterThan, setResultBetterThan] = useState<number | null>(null);
  const [showGuestSavePrompt, setShowGuestSavePrompt] = useState(false);
  const {
    neighbors,
    answered,
    score,
    gameEnded,
    failed,
    submitAnswer,
    getMissedNeighbors,
    reset
  } = useNeighbourChain(startingCountry);

  useEffect(() => {
    if (gameEnded) {
      setShowResults(true);
    }
  }, [gameEnded]);

  useEffect(() => {
    if (!showResults) return;
    const accuracy = Math.round((answered.length / Math.max(1, neighbors.length)) * 100);
    const session = getAuthSession();
    if (!session.isAuthenticated) {
      setShowGuestSavePrompt(true);
      setResultRank(null);
      setResultBetterThan(Math.max(0, Math.min(99, Math.round(accuracy * 0.9))));
      return;
    }

    setShowGuestSavePrompt(false);
    const { playerId, playerName } = getOrCreatePlayerIdentity();
    void fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        playerName,
        gameMode: 'Border Rush',
        score,
        correct: answered.length,
        total: neighbors.length,
        durationSeconds: Math.max(20, neighbors.length * 20),
        countriesGuessed: answered,
      }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { rank: number | null; betterThan: number };
      })
      .then((payload) => {
        if (!payload) return;
        if (typeof payload.rank === 'number') {
          setResultRank(payload.rank);
        }
        if (typeof payload.betterThan === 'number') {
          setResultBetterThan(Math.max(0, Math.min(99, payload.betterThan)));
        }
      })
      .catch(() => {
        setResultRank(null);
        setResultBetterThan(Math.max(0, Math.min(99, Math.round(accuracy * 0.9))));
      });
  }, [showResults, answered.length, neighbors.length, score]);

  const handleStartGame = () => {
    setGameStarted(true);
    reset();
    setShowResults(false);
    setResultRank(null);
    setResultBetterThan(null);
  };

  const handlePlayAgain = () => {
    const eligibleCountries = COUNTRY_NAMES.filter((country) => getNeighbors(country).length > 0);
    const pool = eligibleCountries.length > 0 ? eligibleCountries : COUNTRY_NAMES;
    const randomCountry = pool[Math.floor(Math.random() * pool.length)];
    setStartingCountry(randomCountry);
    setShowResults(false);
    handleStartGame();
  };

  const handleSignInToSave = () => {
    savePendingScore({
      gameMode: 'Border Rush',
      score,
      correct: answered.length,
      total: neighbors.length,
      durationSeconds: Math.max(20, neighbors.length * 20),
      countriesGuessed: answered,
    });
    window.location.href = '/signin?next=/profile&saveScore=1';
  };

  const handleAnswerSubmit = (answer: string): boolean => {
    return submitAnswer(answer);
  };

  if (!gameStarted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="neon-card p-8 max-w-md w-full text-center space-y-6 animate-float-up">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-3">Border Rush</h1>
            <p className="text-[#5a6b7a]">Name all bordering countries</p>
          </div>
          <div className="bg-[#ffffff] rounded-lg p-6 border border-[#1f6feb] border-opacity-30">
            <p className="text-[#9aa6b2] text-sm mb-2">Starting Country</p>
            <p className="text-2xl font-bold text-[#1f6feb]">{startingCountry}</p>
            <p className="text-[#5a6b7a] text-sm mt-3">
              Name all {neighbors.length} bordering countries
            </p>
          </div>
          <button
            onClick={handleStartGame}
            className="neon-btn-primary w-full py-3 text-lg"
          >
            Start Game
          </button>
          <a href="/modes" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors text-sm">
            Back to Modes
          </a>
        </div>
      </main>
    );
  }

  if (showResults) {
    const missedNeighbors = getMissedNeighbors();
    const accuracy = Math.round((answered.length / Math.max(1, neighbors.length)) * 100);
    const betterThan =
      resultBetterThan ?? Math.max(0, Math.min(99, Math.round(accuracy * 0.9)));
    const comparisonMessage = getComparisonMessage(betterThan);
    const shareParams = new URLSearchParams({
      mode: 'Border Rush',
      score: String(score),
      accuracy: String(accuracy),
      correct: String(answered.length),
      total: String(neighbors.length),
      date: new Date().toISOString().slice(0, 10),
    });
    if (answered.length > 0) {
      shareParams.set('countries', JSON.stringify(answered.slice(0, 240)));
    }
    const shareUrl = `/api/share?${shareParams.toString()}`;
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="neon-card p-8 space-y-6 animate-float-up">
            <div className="text-center">
              <h1 className="text-4xl font-bold gradient-text mb-2">
                {!failed ? 'Perfect!' : 'Round Over'}
              </h1>
              <p className="text-[#5a6b7a]">Border Rush Challenge</p>
            </div>

            {/* Results Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#2a9d8f] border-opacity-30">
                <p className="text-[#9aa6b2] text-sm mb-2">Correct Answers</p>
                <p className="text-3xl font-bold text-[#2a9d8f]">{answered.length}/{neighbors.length}</p>
              </div>
              <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#1f6feb] border-opacity-30">
                <p className="text-[#9aa6b2] text-sm mb-2">Score</p>
                <p className="text-3xl font-bold text-[#1f6feb]">{score}</p>
              </div>
            </div>
            <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#f4a261] border-opacity-30">
              <p className="text-[#5a6b7a]">You got {answered.length}/{neighbors.length} neighbors</p>
            </div>
            <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#8b5cf6] border-opacity-30">
              <p className="text-[#8b5cf6] font-semibold">{comparisonMessage}</p>
              <p className="text-[#8b5cf6] font-semibold">You&apos;re better than {betterThan}% of players today</p>
              <p className="text-[#5a6b7a] text-sm mt-1">Rank: {resultRank ? `#${resultRank}` : '-'}</p>
              <p className="text-[#5a6b7a] text-sm mt-1">Beat your high score?</p>
            </div>

            {showGuestSavePrompt && (
              <div className="bg-[#eff6ff] rounded-lg p-4 border border-[#93c5fd] border-opacity-70 space-y-3">
                <p className="text-sm text-[#1f2937]">
                  You played as a guest. Sign in to save this score to the leaderboard.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={handleSignInToSave} className="neon-btn-primary w-full py-2.5">
                    Sign In to Save Score
                  </button>
                  <button onClick={() => setShowGuestSavePrompt(false)} className="neon-btn w-full py-2.5">
                    Not Now
                  </button>
                </div>
              </div>
            )}

            {/* Correct Answers */}
            <div>
              <h3 className="text-lg font-bold text-[#2a9d8f] mb-3">Correct Answers</h3>
              <div className="grid grid-cols-2 gap-2">
                {answered.map((country, idx) => (
                  <div
                    key={idx}
                    className="bg-[#ffffff] px-4 py-2 rounded-lg text-[#2a9d8f] border border-[#2a9d8f] border-opacity-50 text-sm"
                  >
                    OK {country}
                  </div>
                ))}
              </div>
            </div>

            {/* Missed Answers */}
            {missedNeighbors.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#e76f51] mb-3">Missed Neighbors</h3>
                <div className="grid grid-cols-2 gap-2">
                  {missedNeighbors.map((country, idx) => (
                    <div
                      key={idx}
                      className="bg-[#ffffff] px-4 py-2 rounded-lg text-[#e76f51] border border-[#e76f51] border-opacity-50 text-sm"
                    >
                      X {country}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2 pt-4">
              <button
                onClick={handlePlayAgain}
                className="neon-btn-primary w-full py-3"
              >
                Play Again
              </button>
              <a href="/modes" className="neon-btn w-full text-center block py-3">
                View Modes
              </a>
              <Link href="/game/daily" className="neon-btn w-full text-center block py-3">
                Play Daily Challenge
              </Link>
              <button onClick={() => window.open(shareUrl, '_blank')} className="neon-btn w-full py-3">
                Share Result (image)
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Border Rush</h1>
          <p className="text-[#5a6b7a]">Name all {neighbors.length} bordering countries</p>
        </div>

        {/* Current Country */}
        <div className="neon-card p-6 mb-8 text-center">
          <p className="text-[#9aa6b2] text-sm mb-2">Starting Country</p>
          <p className="text-4xl font-bold text-[#1f6feb]">{startingCountry}</p>
        </div>

        {/* Score */}
        <div className="neon-card p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-[#9aa6b2] text-sm mb-1">Found</p>
              <p className="text-3xl font-bold text-[#2a9d8f]">{answered.length}</p>
            </div>
            <div>
              <p className="text-[#9aa6b2] text-sm mb-1">Remaining</p>
              <p className="text-3xl font-bold text-[#f4a261]">{neighbors.length - answered.length}</p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="mb-8">
          <InputBox
            onSubmit={handleAnswerSubmit}
            placeholder="Type a neighboring country..."
            disabled={gameEnded}
          />
        </div>

        {/* Answered List */}
        {answered.length > 0 && (
          <div className="neon-card p-6">
            <h3 className="text-lg font-bold text-[#2a9d8f] mb-4">
              Found {answered.length}/{neighbors.length}
            </h3>
            <div className="space-y-2">
              {answered.map((country, idx) => (
                <div
                  key={idx}
                  className="bg-[#ffffff] px-4 py-2 rounded-lg text-[#2a9d8f] border border-[#2a9d8f] border-opacity-30 flex items-center gap-2"
                >
                  <span>OK</span>
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

