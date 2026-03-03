'use client';

import { useEffect, useMemo, useState } from 'react';
import { getOrCreatePlayerIdentity, setGoogleLinkedProfile } from '@/lib/playerId';
import type { PlayerProfile } from '@/lib/types';
import { heatColor, lastNDaysIso } from '@/lib/profileUtils';



declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}



export function PlayerProgressPanel() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const heatmapDays = useMemo(() => lastNDaysIso(84), []);

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
        if (payload?.profile) {
          setProfile(payload.profile);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    // Prevent duplicate script tags (Issue #26)
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [googleClientId]);

  const handleGoogleLink = () => {
    if (!googleClientId) {
      setLinkError('Google linking is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID first.');
      return;
    }

    const { playerId } = getOrCreatePlayerIdentity();
    const idApi = window.google?.accounts?.id;
    if (!idApi) {
      setLinkError('Google SDK did not load. Refresh and try again.');
      return;
    }

    setLinking(true);
    setLinkError(null);
    idApi.initialize({
      client_id: googleClientId,
      callback: (response) => {
        const credential = response.credential;
        if (!credential) {
          setLinking(false);
          setLinkError('Google token missing.');
          return;
        }

        void fetch('/api/profile/link-google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playerId,
            idToken: credential,
          }),
        })
          .then(async (res) => {
            if (!res.ok) return null;
            return (await res.json()) as { profile: PlayerProfile };
          })
          .then((payload) => {
            if (!payload?.profile?.linkedGoogle) {
              setLinkError('Unable to link Google profile.');
              return;
            }

            setGoogleLinkedProfile({
              sub: payload.profile.linkedGoogle.sub,
              email: payload.profile.linkedGoogle.email,
              name: payload.profile.linkedGoogle.name,
              picture: payload.profile.linkedGoogle.picture,
            });
            setProfile(payload.profile);
            setLinkError(null);
          })
          .catch(() => {
            setLinkError('Google linking failed. Please try again.');
          })
          .finally(() => setLinking(false));
      },
    });

    idApi.prompt();
  };

  const handleCopyShare = async () => {
    if (!profile) return;
    const text = `GeoRush streak ${profile.currentStreak} days | lifetime ${profile.lifetimeScore} | badges ${profile.badges.length}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op fallback
    }
  };

  if (loading) {
    return <div className="neon-card p-6">Loading progression...</div>;
  }

  if (!profile) {
    return <div className="neon-card p-6">No profile data yet.</div>;
  }

  return (
    <div className="neon-card p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile avatar"
              className="h-10 w-10 rounded-full object-cover border border-[#d8e0eb]"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[#edf2f7] border border-[#d8e0eb] flex items-center justify-center text-[#5a6b7a] text-sm font-bold">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-[#1f2937]">Player Progress</h3>
            <p className="text-sm text-[#5a6b7a]">Guest-first profile with optional Google linking.</p>
          </div>
        </div>
        <button onClick={handleCopyShare} className="neon-btn px-4 py-2 text-sm">
          Copy Share Snapshot
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="stat-title">Current Streak</div>
          <div className="stat-value">{profile.currentStreak}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Longest Streak</div>
          <div className="stat-value">{profile.longestStreak}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Lifetime Score</div>
          <div className="stat-value">{profile.lifetimeScore}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">World Quiz Score</div>
          <div className="stat-value">{profile.worldQuizScore}</div>
        </div>
      </div>

      <div>
        <div className="text-sm text-[#5a6b7a] mb-2">84-day activity heatmap</div>
        <div className="grid grid-cols-12 gap-1">
          {heatmapDays.map((day) => (
            <div
              key={day}
              className={`h-4 rounded ${heatColor(profile.activityHeatmap[day] ?? 0)}`}
              title={`${day}: ${profile.activityHeatmap[day] ?? 0} runs`}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm text-[#5a6b7a] mb-2">Badges ({profile.badges.length})</div>
        {profile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <span key={badge} className="pill !py-1 !px-3 text-xs">
                {badge.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#5a6b7a]">Play more rounds to unlock badges.</p>
        )}
      </div>

      <div className="bg-white/70 border border-[#d8e0eb] rounded-lg p-4">
        <p className="text-sm text-[#5a6b7a] mb-2">
          Account: <span className="font-semibold text-[#1f2937]">{profile.authProvider === 'google' ? 'Google linked' : 'Guest'}</span>
        </p>
        {profile.linkedGoogle ? (
          <p className="text-sm text-[#1f2937]">{profile.linkedGoogle.email}</p>
        ) : (
          <button onClick={handleGoogleLink} disabled={linking} className="neon-btn-primary px-4 py-2 text-sm">
            {linking ? 'Linking...' : 'Link Google (Optional)'}
          </button>
        )}
        {linkError && <p className="text-xs text-[#e76f51] mt-2">{linkError}</p>}
      </div>
    </div>
  );
}
