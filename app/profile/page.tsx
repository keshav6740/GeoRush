'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Pencil, X } from 'lucide-react';
import {
  getAuthSession,
  getOrCreatePlayerIdentity,
  resetAllLocalAccountData,
  setPlayerAvatarUrl,
  setPlayerName,
  signOutPlayer,
} from '@/lib/playerId';

interface PlayerProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  authProvider: 'guest' | 'google';
  linkedGoogle?: {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    linkedAt: string;
  };
  gamesPlayed: number;
  bestScore: number;
  lifetimeScore: number;
  worldQuizScore: number;
  modeScores: Record<string, number>;
  countryScores: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activityHeatmap: Record<string, number>;
  badges: string[];
  xp: number;
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpToNextLevel: number;
  nextStreakMilestone: number | null;
  streakProgressToNext: number;
  dontBreakStreakReminder: boolean;
}

function toLabel(id: string) {
  return id
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function lastNDaysIso(days: number) {
  const out: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function heatColor(value: number) {
  if (value <= 0) return 'bg-[#eef2f7]';
  if (value === 1) return 'bg-[#b8f2d2]';
  if (value <= 3) return 'bg-[#72e2ad]';
  if (value <= 6) return 'bg-[#2fbb86]';
  return 'bg-[#13855e]';
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [editingName, setEditingName] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDragActive, setAvatarDragActive] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'none' | 'local' | 'google'>('none');

  const heatmapDays = useMemo(() => lastNDaysIso(365), []);
  const modeScores = useMemo(() => {
    if (!profile) return [];
    return Object.entries(profile.modeScores).sort((a, b) => b[1] - a[1]);
  }, [profile]);
  const maxModeScore = modeScores.length > 0 ? modeScores[0][1] : 1;

  useEffect(() => {
    const { playerId, playerName } = getOrCreatePlayerIdentity();
    void fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId, playerName }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { profile: PlayerProfile };
      })
      .then((payload) => {
        if (!payload?.profile) return;
        setProfile(payload.profile);
        setEditingName(payload.profile.name);
        setSessionMode(getAuthSession().mode);
      })
      .finally(() => setLoading(false));
  }, []);

  const uploadAvatarFile = async (file: File) => {
    const { playerId } = getOrCreatePlayerIdentity();
    setAvatarUploading(true);
    setAvatarMessage(null);

    try {
      const data = new FormData();
      data.append('playerId', playerId);
      data.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        throw new Error('Avatar upload failed');
      }

      const payload = (await response.json()) as { profile: PlayerProfile };
      if (payload.profile) {
        setProfile(payload.profile);
        setPlayerAvatarUrl(payload.profile.avatarUrl ?? null);
      }
      setAvatarMessage('Avatar updated.');
    } catch {
      setAvatarMessage('Upload failed. Use png/jpg/webp/gif up to 4MB.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatarFile(file);
    event.target.value = '';
  };

  const handleAvatarDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setAvatarDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await uploadAvatarFile(file);
  };

  const handleSaveProfile = async () => {
    const { playerId } = getOrCreatePlayerIdentity();
    setSavingProfile(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          name: editingName,
        }),
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      const payload = (await response.json()) as { profile: PlayerProfile };
      if (payload.profile) {
        setProfile(payload.profile);
        setEditingName(payload.profile.name);
        setPlayerName(payload.profile.name);
      }
      setSaveMessage('Profile updated.');
      setIsEditOpen(false);
    } catch {
      setSaveMessage('Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetAvatar = async () => {
    const { playerId } = getOrCreatePlayerIdentity();
    setAvatarUploading(true);
    setAvatarMessage(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId,
          avatarUrl: null,
        }),
      });
      if (!response.ok) throw new Error('Failed');
      const payload = (await response.json()) as { profile: PlayerProfile };
      if (payload.profile) {
        setProfile(payload.profile);
        setPlayerAvatarUrl(null);
      }
      setAvatarMessage('Avatar removed.');
    } catch {
      setAvatarMessage('Unable to remove avatar.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogout = () => {
    signOutPlayer();
    window.location.href = '/signin';
  };

  const handleResetAccountData = () => {
    const confirmed = window.confirm(
      'Reset all local account data on this device? This clears local sign-in, Google session cache, and saved avatar/name preferences.'
    );
    if (!confirmed) return;
    resetAllLocalAccountData();
    window.location.href = '/signin';
  };

  if (loading) {
    return <main className="min-h-screen px-4 py-12">Loading profile...</main>;
  }

  if (!profile) {
    return <main className="min-h-screen px-4 py-12">Profile unavailable.</main>;
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="rounded-2xl overflow-hidden border border-[#d8e0eb] bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-[#d4f1f4] via-[#fef6e4] to-[#fde2e4]" />
          <div className="px-4 md:px-6 pb-5 md:pb-6 pt-0">
            <div className="flex flex-wrap items-end justify-between gap-4 -mt-10">
              <div className="flex items-end gap-4">
                <div className="relative group">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt="Profile avatar"
                      className="h-20 w-20 rounded-full object-cover border-4 border-white shadow"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-[#edf2f7] border-4 border-white shadow flex items-center justify-center text-[#5a6b7a] text-2xl font-bold">
                      {profile.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => setIsEditOpen(true)}
                    className="absolute -top-1 -left-1 h-8 w-8 rounded-full bg-[#1f2937] text-white grid place-items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    aria-label="Edit profile"
                    title="Edit profile"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#1f2937] break-words">{profile.name}</h1>
                  <p className="text-[#5a6b7a] text-sm">
                    {profile.authProvider === 'google'
                      ? 'Google linked account'
                      : sessionMode === 'local'
                        ? 'Local account'
                        : 'Guest account'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Link href="/" className="neon-btn px-4 py-2 flex-1 sm:flex-none text-center">
                  Home
                </Link>
                <button onClick={handleLogout} className="neon-btn px-4 py-2 flex-1 sm:flex-none">
                  Logout
                </button>
                <Link href="/leaderboard" className="neon-btn px-4 py-2 flex-1 sm:flex-none text-center">
                  Leaderboard
                </Link>
                <Link href="/modes" className="neon-btn-primary px-4 py-2 flex-1 sm:flex-none text-center">
                  Play
                </Link>
              </div>
            </div>
          </div>
        </div>

        {saveMessage && (
          <div className="neon-card p-3 text-sm text-[#5a6b7a]">{saveMessage}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="stat-card">
            <div className="stat-title">Games</div>
            <div className="stat-value">{profile.gamesPlayed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Best Score</div>
            <div className="stat-value">{profile.bestScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Lifetime</div>
            <div className="stat-value">{profile.lifetimeScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">World Quiz</div>
            <div className="stat-value">{profile.worldQuizScore}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Streak</div>
            <div className="stat-value">{profile.currentStreak}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Longest</div>
            <div className="stat-value">{profile.longestStreak}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="neon-card p-4 md:p-6 space-y-3">
            <h2 className="text-xl font-bold text-[#1f2937]">Geo XP & Level</h2>
            <p className="text-sm text-[#5a6b7a]">
              Level {profile.level} - {profile.levelTitle}
            </p>
            <p className="text-2xl font-bold text-[#1f6feb]">{profile.xp} XP</p>
            <div>
              <div className="h-2 bg-[#edf2f7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1f6feb]"
                  style={{ width: `${Math.max(4, Math.min(100, Math.round((profile.xpIntoLevel / Math.max(1, profile.xpIntoLevel + profile.xpToNextLevel)) * 100)))}%` }}
                />
              </div>
              <p className="text-xs text-[#5a6b7a] mt-1">{profile.xpToNextLevel} XP to next level</p>
            </div>
          </div>

          <div className="neon-card p-4 md:p-6 space-y-3">
            <h2 className="text-xl font-bold text-[#1f2937]">Daily Streak</h2>
            <p className="text-sm text-[#5a6b7a]">Current streak: {profile.currentStreak} day(s)</p>
            {profile.nextStreakMilestone ? (
              <>
                <p className="text-sm text-[#5a6b7a]">Next milestone: {profile.nextStreakMilestone} days</p>
                <div className="h-2 bg-[#edf2f7] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2a9d8f]" style={{ width: `${profile.streakProgressToNext}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm text-[#2a9d8f] font-semibold">Top milestone reached.</p>
            )}
            {profile.dontBreakStreakReminder && (
              <p className="text-sm text-[#d14343] font-semibold">Don&apos;t break your streak today.</p>
            )}
          </div>
        </div>

        <div className="neon-card p-4 md:p-6">
          <h2 className="text-xl font-bold text-[#1f2937] mb-3">365-Day Streak Heatmap</h2>
          <div className="grid grid-cols-[repeat(53,minmax(0,1fr))] gap-1 overflow-x-auto pb-2">
            {heatmapDays.map((day) => (
              <div
                key={day}
                className={`h-3 w-3 rounded-sm ${heatColor(profile.activityHeatmap[day] ?? 0)}`}
                title={`${day}: ${profile.activityHeatmap[day] ?? 0} runs`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neon-card p-4 md:p-6 space-y-4">
            <h2 className="text-xl font-bold text-[#1f2937]">Badge Gallery</h2>
            {profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {profile.badges.map((badge) => (
                  <div key={badge} className="bg-white border border-[#d8e0eb] rounded-lg px-3 py-2 text-sm">
                    {toLabel(badge)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5a6b7a] text-sm">No badges yet. Keep playing daily and across modes.</p>
            )}
          </div>

          <div className="neon-card p-4 md:p-6 space-y-4">
            <h2 className="text-xl font-bold text-[#1f2937]">Mode Scores</h2>
            {modeScores.length > 0 ? (
              <div className="space-y-3">
                {modeScores.map(([mode, score]) => (
                  <div key={mode}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#1f2937]">{toLabel(mode)}</span>
                      <span className="text-[#5a6b7a]">{score}</span>
                    </div>
                    <div className="h-2 bg-[#edf2f7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2a9d8f]"
                        style={{ width: `${Math.max(4, Math.round((score / maxModeScore) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5a6b7a] text-sm">No mode scores yet.</p>
            )}
          </div>
        </div>

        <div className="neon-card p-4 md:p-6 space-y-3">
          <h2 className="text-xl font-bold text-[#1f2937]">Account Controls</h2>
          <p className="text-sm text-[#5a6b7a]">
            Use reset only if account state on this device becomes inconsistent.
          </p>
          <button
            onClick={handleResetAccountData}
            className="inline-flex items-center justify-center rounded-full border-2 border-[#d14343] px-5 py-2.5 font-semibold text-[#d14343] bg-white hover:bg-[#fff3f3]"
          >
            Reset Account Data
          </button>
        </div>

      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#d8e0eb] shadow-xl p-4 md:p-6 space-y-4 max-h-[90svh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1f2937]">Edit Profile</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="h-8 w-8 rounded-full bg-[#f3f6fa] text-[#5a6b7a] grid place-items-center"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <label className="text-sm text-[#5a6b7a] space-y-2 block">
              Display Name
              <input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                maxLength={40}
                className="w-full bg-white border border-[#d8e0eb] rounded-lg px-3 py-2 text-[#1f2937]"
                placeholder="Your display name"
              />
            </label>

            <div>
              <p className="text-sm text-[#5a6b7a] mb-2">Profile Picture</p>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setAvatarDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setAvatarDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setAvatarDragActive(false);
                }}
                onDrop={handleAvatarDrop}
                className={`border-2 border-dashed rounded-lg p-4 text-sm ${
                  avatarDragActive ? 'border-[#2a9d8f] bg-[#ecfdf5]' : 'border-[#d8e0eb] bg-white'
                }`}
              >
                <p className="text-[#5a6b7a]">Drag and drop image here, or upload from device.</p>
                <label className="inline-block mt-3 neon-btn px-3 py-2 cursor-pointer">
                  Choose Image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarInput}
                    disabled={avatarUploading}
                  />
                </label>
                <p className="text-xs text-[#9aa6b2] mt-2">png/jpg/webp/gif, max 4MB</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="neon-btn-primary px-4 py-2"
              >
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleResetAvatar} disabled={avatarUploading} className="neon-btn px-4 py-2">
                {avatarUploading ? 'Working...' : 'Remove Avatar'}
              </button>
              {avatarMessage && <p className="text-sm text-[#5a6b7a] self-center">{avatarMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
