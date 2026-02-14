'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrCreatePlayerIdentity } from '@/lib/playerId';
import { PlayerProgressPanel } from '@/components/profile/PlayerProgressPanel';

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  accuracy: number;
  gameMode: string;
  modeKey: string;
}

interface LeaderboardPayload {
  entries: LeaderboardEntry[];
  stats: {
    players: number;
    topScore: number;
    userRank: number | null;
  };
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [mode, setMode] = useState<string>('all');

  useEffect(() => {
    const { playerId } = getOrCreatePlayerIdentity();
    const query = new URLSearchParams({
      limit: '100',
      playerId,
    });
    if (mode !== 'all') {
      query.set('mode', mode);
    }

    void fetch(`/api/leaderboard?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as LeaderboardPayload;
      })
      .then((payload) => {
        if (payload) {
          setData(payload);
        }
      })
      .catch(() => undefined);
  }, [mode]);

  const entries = data?.entries ?? [];
  const activePlayers = data?.stats.players ?? 0;
  const highestScore = data?.stats.topScore ?? 0;
  const yourRank = data?.stats.userRank;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 animate-float-up">
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-3">
            Global Leaderboard
          </h1>
          <p className="text-xl text-[#5a6b7a]">
            Real scores from actual runs
          </p>
        </div>

        <div className="neon-card p-6 mb-8">
          <div className="mb-4 flex justify-end">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className="bg-white border border-[#d8e0eb] rounded-lg px-3 py-2 text-sm text-[#1f2937]"
            >
              <option value="all">All Modes</option>
              <option value="Speed Run">Speed Run</option>
              <option value="Neighbour Chain">Neighbour Chain</option>
              <option value="Country to Capital">Country to Capital</option>
              <option value="Daily Challenge">Daily Challenge</option>
              <option value="Continent Quiz">Continent Quiz</option>
              <option value="World Quiz">World Quiz</option>
            </select>
          </div>
          <div className="grid grid-cols-5 gap-4 pb-4 border-b border-[#ffd166] border-opacity-60 text-sm text-[#5a6b7a] font-bold">
            <div>Rank</div>
            <div>Player</div>
            <div>Score</div>
            <div>Accuracy</div>
            <div>Mode</div>
          </div>
          <div className="space-y-3 pt-4">
            {entries.length > 0 ? (
              entries.map((entry, idx) => (
                <div
                  key={`${entry.playerId}-${entry.rank}`}
                  className={`grid grid-cols-5 gap-4 py-4 px-4 rounded-xl ${
                    idx < 3 ? 'bg-white/80 border border-[#ffd166]' : 'bg-white/60'
                  }`}
                >
                  <div className="flex items-center font-bold">#{entry.rank}</div>
                  <div className="text-[#1f2937] font-semibold flex items-center gap-2">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={`${entry.name} avatar`}
                        className="h-7 w-7 rounded-full object-cover border border-[#d8e0eb]"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-[#edf2f7] border border-[#d8e0eb] flex items-center justify-center text-[10px] text-[#5a6b7a] font-bold">
                        {entry.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {entry.name}
                  </div>
                  <div className="text-[#2a9d8f] font-bold">{entry.score}</div>
                  <div className="text-[#1f6feb] font-bold">{entry.accuracy}%</div>
                  <div className="text-[#f4a261] text-sm">{entry.gameMode}</div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[#5a6b7a]">
                No scores yet. Play a game to create the first leaderboard entry.
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <PlayerProgressPanel />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="neon-card p-6 text-center">
            <p className="text-4xl font-bold text-[#1f6feb] mb-2">
              {activePlayers}
            </p>
            <p className="text-[#5a6b7a]">Active Players</p>
          </div>
          <div className="neon-card p-6 text-center">
            <p className="text-4xl font-bold text-[#2a9d8f] mb-2">
              {highestScore}
            </p>
            <p className="text-[#5a6b7a]">Highest Score</p>
          </div>
          <div className="neon-card p-6 text-center">
            <p className="text-4xl font-bold text-[#f4a261] mb-2">
              {yourRank ? `#${yourRank}` : '-'}
            </p>
            <p className="text-[#5a6b7a]">Your Rank</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Link href="/modes" className="neon-btn-primary px-8 py-3 inline-block">
              Play Now
            </Link>
            <Link href="/profile" className="neon-btn px-8 py-3 inline-block">
              Open Profile
            </Link>
          </div>
          <div>
            <Link href="/" className="text-[#5a6b7a] hover:text-[#1f6feb] transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
