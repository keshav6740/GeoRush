'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { calculateAccuracy, calculateRank, getComparisonMessage } from '@/lib/gameLogic';
import { savePendingScore } from '@/lib/pendingScore';
import { getAuthSession, getOrCreatePlayerIdentity } from '@/lib/playerId';

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
  const [xpAward, setXpAward] = useState<number | null>(null);
  const [showGuestSavePrompt, setShowGuestSavePrompt] = useState(false);
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
    rank: String(rank),
    accuracy: String(accuracy),
    correct: String(correct),
    total: String(total),
    streak: String(liveStreak ?? 0),
    badges: String(liveBadges ?? 0),
    date: dateKey,
  });
  if (Array.isArray(countriesGuessed) && countriesGuessed.length > 0) {
    shareParams.set('countries', JSON.stringify(countriesGuessed.slice(0, 240)));
  }
  const shareUrl = `/api/share?${shareParams.toString()}`;
  const playerIdentity = getOrCreatePlayerIdentity();
  const challengeModePath =
    gameMode === 'Speed Run'
      ? '/game/speed-run'
      : gameMode === 'Daily Challenge'
      ? '/game/daily'
      : gameMode === 'Country to Capital' || gameMode === 'Capital to Country'
      ? '/game/capital-guess'
      : gameMode === 'Flag Guess'
      ? '/game/flag-guess'
      : gameMode === 'World Quiz'
      ? '/game/world-quiz'
      : gameMode === 'Continent Quiz'
      ? '/game/continent-quiz'
      : '/modes';
  const challengeLink = `${typeof window !== 'undefined' ? window.location.origin : ''}${challengeModePath}?challenge=1&mode=${encodeURIComponent(
    gameMode
  )}&score=${encodeURIComponent(String(liveScore))}&from=${encodeURIComponent(playerIdentity.playerName)}&date=${encodeURIComponent(dateKey)}`;
  const challengeText = `I scored ${liveScore} in GeoRush ${gameMode}. Can you beat me? ${challengeLink}`;
  const reachedMilestone =
    liveStreak && liveStreak >= 100
      ? 100
      : liveStreak && liveStreak >= 30
      ? 30
      : liveStreak && liveStreak >= 7
      ? 7
      : null;

  useEffect(() => {
    const signature = `${gameMode}|${score}|${correct}|${total}|${dateKey}`;
    if (submittedRef.current === signature) return;
    const session = getAuthSession();
    if (!session.isAuthenticated) {
      setShowGuestSavePrompt(true);
      return;
    }

    setShowGuestSavePrompt(false);
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
          xpAward?: number;
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
        if (typeof payload.xpAward === 'number') {
          setXpAward(payload.xpAward);
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

  const handleSignInToSave = () => {
    savePendingScore({
      gameMode,
      score,
      correct,
      total,
      durationSeconds,
      timeRemainingSeconds,
      timeSpentSeconds,
      countriesGuessed,
    });
    window.location.href = '/signin?next=/profile&saveScore=1';
  };

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

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(challengeText)}`, '_blank');
  };

  const handleCopyInstagram = async () => {
    try {
      await navigator.clipboard.writeText(challengeText);
      alert('Challenge text copied. Paste it in Instagram.');
    } catch {
      window.prompt('Copy this challenge text for Instagram:', challengeText);
    }
  };

  const handleCopyChallengeLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeLink);
      alert('Challenge link copied.');
    } catch {
      window.prompt('Copy this challenge link:', challengeLink);
    }
  };

  return (
    <div className="neon-card p-5 md:p-8 max-w-md w-full space-y-5 md:space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold gradient-text">Game Over!</h1>
        <p className="text-[#5a6b7a]">{gameMode}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#2a9d8f] border-opacity-30">
          <p className="text-[#9aa6b2] text-sm mb-2">Countries Named</p>
          <p className="text-2xl md:text-3xl font-bold text-[#2a9d8f]">{correct}</p>
        </div>
        <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#1f6feb] border-opacity-30">
          <p className="text-[#9aa6b2] text-sm mb-2">Score</p>
          <p className="text-2xl md:text-3xl font-bold text-[#1f6feb]">{liveScore}</p>
        </div>
      </div>

      <div className="bg-[#ffffff] rounded-lg p-4 text-center border border-[#f4a261] border-opacity-30">
        <p className="text-[#9aa6b2] text-sm mb-2">Daily Rank</p>
        <p className="text-2xl font-bold text-[#f4a261]">#{rank}</p>
        {xpAward !== null && <p className="text-xs text-[#5a6b7a] mt-1">XP gained: +{xpAward}</p>}
      </div>

      <div className="bg-[#fef6e4] rounded-lg p-4 text-center border border-[#8b5cf6] border-opacity-30">
        <p className="text-[#8b5cf6] font-semibold">{comparisonMessage}</p>
        <p className="text-[#5a6b7a] text-sm mt-1">You're better than {betterThanPercentage}% of players today!</p>
        <p className="text-[#5a6b7a] text-sm mt-1">Accuracy: {accuracy}%</p>
        {liveStreak !== null && <p className="text-[#5a6b7a] text-sm mt-1">Current streak: {liveStreak} day(s)</p>}
        {reachedMilestone && (
          <p className="text-[#2a9d8f] text-sm mt-1 font-semibold">Streak milestone reached: {reachedMilestone} days</p>
        )}
        {liveBadges !== null && <p className="text-[#5a6b7a] text-sm mt-1">Badges earned: {liveBadges}</p>}
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

      <div className="neon-card p-4 text-center">
        <p className="text-lg font-bold text-[#1f2937] mb-2">Beat your high score?</p>
        <p className="text-sm text-[#5a6b7a] mb-3">Daily Challenge available</p>
        <Link href="/game/daily" className="neon-btn-primary w-full text-center block py-2">
          Play Daily Challenge
        </Link>
      </div>

      <div className="space-y-2 pt-4">
        <a href="/modes" className="neon-btn-primary w-full text-center block py-3">
          Play Again
        </a>
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

      <div className="neon-card p-4 space-y-2">
        <p className="text-sm font-semibold text-[#1f2937]">Challenge a Friend</p>
        <p className="text-xs text-[#5a6b7a]">
          {playerIdentity.playerName} scored {liveScore} (rank #{rank}, streak {liveStreak ?? 0}).
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button onClick={handleWhatsAppShare} className="neon-btn w-full py-2.5">
            Share on WhatsApp
          </button>
          <button onClick={handleCopyInstagram} className="neon-btn w-full py-2.5">
            Copy for Instagram
          </button>
          <button onClick={handleCopyChallengeLink} className="neon-btn w-full py-2.5">
            Copy Beat-My-Score Link
          </button>
        </div>
      </div>
    </div>
  );
}

