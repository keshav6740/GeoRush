'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { calculateAccuracy, calculateRank, getComparisonMessage } from '@/lib/gameLogic';
import { getOrCreatePlayerIdentity } from '@/lib/playerId';

interface ResultsCardProps {
  gameMode: string;
  score: number;
  correct: number;
  total: number;
  durationSeconds?: number;
  timeRemainingSeconds?: number;
  timeSpentSeconds?: number;
  countriesGuessed?: string[];
  timestamp?: Date;
}

export function ResultsCard({
  gameMode,
  score,
  correct,
  total,
  durationSeconds,
  timeRemainingSeconds,
  timeSpentSeconds,
  countriesGuessed,
  timestamp = new Date(),
}: ResultsCardProps) {
  const accuracy = calculateAccuracy(correct, total);
  const [liveRank, setLiveRank] = useState<number | null>(null);
  const [liveBetterThan, setLiveBetterThan] = useState<number | null>(null);
  const [liveScore, setLiveScore] = useState<number>(score);
  const [liveStreak, setLiveStreak] = useState<number | null>(null);
  const [liveBadges, setLiveBadges] = useState<number | null>(null);
  const submittedRef = useRef<string | null>(null);

  const fallbackRank = calculateRank(score);
  const rank = liveRank ?? fallbackRank;
  const betterThanPercentage =
    liveBetterThan ??
    Math.max(0, Math.min(99, Math.round(((10000 - fallbackRank) / 10000) * 100)));
  const comparisonMessage = getComparisonMessage(betterThanPercentage);
  const dateKey = timestamp.toISOString().slice(0, 10);
  const shareParams = new URLSearchParams({
    mode: gameMode,
    score: String(liveScore),
    accuracy: String(accuracy),
    correct: String(correct),
    total: String(total),
    streak: String(liveStreak ?? 0),
    badges: String(liveBadges ?? 0),
    date: dateKey,
  });
  const shareUrl = `/api/share?${shareParams.toString()}`;

  useEffect(() => {
    const signature = `${gameMode}|${score}|${correct}|${total}|${dateKey}`;
    if (submittedRef.current === signature) return;
    submittedRef.current = signature;

    const { playerId, playerName } = getOrCreatePlayerIdentity();
    void fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        playerName,
        gameMode,
        score,
        correct,
        total,
        durationSeconds,
        timeRemainingSeconds,
        timeSpentSeconds,
        countriesGuessed,
      }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          score: number;
          rank: number | null;
          betterThan: number;
          profile?: {
            currentStreak: number;
            badges: string[];
          };
        };
      })
      .then((payload) => {
        if (!payload) return;
        if (typeof payload.score === 'number') {
          setLiveScore(payload.score);
        }
        if (typeof payload.rank === 'number') {
          setLiveRank(payload.rank);
        }
        if (typeof payload.betterThan === 'number') {
          setLiveBetterThan(Math.max(0, Math.min(99, payload.betterThan)));
        }
        if (typeof payload.profile?.currentStreak === 'number') {
          setLiveStreak(payload.profile.currentStreak);
        }
        if (Array.isArray(payload.profile?.badges)) {
          setLiveBadges(payload.profile.badges.length);
        }
      })
      .catch(() => undefined);
  }, [correct, countriesGuessed, dateKey, durationSeconds, gameMode, score, timeRemainingSeconds, timeSpentSeconds, total]);

  const handleDownload = async () => {
    try {
      const response = await fetch(shareUrl);
      if (!response.ok) {
        throw new Error('Share image request failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `georush-${dateKey}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(shareUrl, '_blank');
    }
  };

  const handleOpenShare = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="neon-card p-8 max-w-md w-full space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold gradient-text">Game Over!</h1>
        <p className="text-[#5a6b7a]">{gameMode}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#2a9d8f] border-opacity-30">
          <p className="text-[#9aa6b2] text-sm mb-2">Countries Named</p>
          <p className="text-3xl font-bold text-[#2a9d8f]">{correct}</p>
        </div>
        <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#1f6feb] border-opacity-30">
          <p className="text-[#9aa6b2] text-sm mb-2">Score</p>
          <p className="text-3xl font-bold text-[#1f6feb]">{liveScore}</p>
        </div>
      </div>

      <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#f4a261] border-opacity-30">
        <p className="text-[#9aa6b2] text-sm mb-2">Daily Rank</p>
        <p className="text-2xl font-bold text-[#f4a261]">#{rank}</p>
      </div>

      <div className="bg-[#fef6e4] rounded-lg p-4 text-center border border-[#8b5cf6] border-opacity-30">
        <p className="text-[#8b5cf6] font-semibold">{comparisonMessage}</p>
        <p className="text-[#5a6b7a] text-sm mt-1">You're better than {betterThanPercentage}% of players today!</p>
        <p className="text-[#5a6b7a] text-sm mt-1">Accuracy: {accuracy}%</p>
        {liveStreak !== null && <p className="text-[#5a6b7a] text-sm mt-1">Current streak: {liveStreak} day(s)</p>}
        {liveBadges !== null && <p className="text-[#5a6b7a] text-sm mt-1">Badges earned: {liveBadges}</p>}
      </div>

      <div className="neon-card p-4 text-center">
        <p className="text-lg font-bold text-[#1f2937] mb-2">Beat your high score?</p>
        <p className="text-sm text-[#5a6b7a] mb-3">Daily Challenge available</p>
        <Link href="/game/daily" className="neon-btn-primary w-full text-center block py-2">
          Play Daily Challenge
        </Link>
      </div>

      <div className="space-y-2 pt-4">
        <Link href="/modes" className="neon-btn-primary w-full text-center block py-3">
          Play Again
        </Link>
        <Link href="/leaderboard" className="neon-btn w-full text-center block py-3">
          View Leaderboard
        </Link>
        <button onClick={handleOpenShare} className="neon-btn w-full py-3">
          Share Result (image)
        </button>
        <button onClick={handleDownload} className="neon-btn w-full py-3">
          Download Result PNG
        </button>
      </div>
    </div>
  );
}
