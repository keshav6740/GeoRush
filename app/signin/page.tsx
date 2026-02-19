'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Earth, KeyRound, MapPinned } from 'lucide-react';
import { clearPendingScore, loadPendingScore } from '@/lib/pendingScore';
import {
  getAuthSession,
  getOrCreatePlayerIdentity,
  registerLocalCredentials,
  setPlayerId,
  setGoogleLinkedProfile,
  signInWithLocalCredentials,
} from '@/lib/playerId';

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

export default function SignInPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [redirectPath, setRedirectPath] = useState('/profile');
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      setRedirectPath(next);
    }

    const session = getAuthSession();
    if (session.isAuthenticated) {
      window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/profile';
      return;
    }
    if (session.localUsername) {
      setMode('signin');
      setUserId(session.localUsername);
    }
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [googleClientId]);

  const upsertProfile = async () => {
    const { playerId, playerName } = getOrCreatePlayerIdentity();
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, playerName }),
    });
  };

  const submitPendingScoreIfAny = async () => {
    const pendingScore = loadPendingScore();
    if (!pendingScore) return;

    const { playerId, playerName } = getOrCreatePlayerIdentity();
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName,
          ...pendingScore,
        }),
      });
      if (response.ok) {
        clearPendingScore();
      }
    } catch {
      // Keep pending score for a future retry.
    }
  };

  const handleLocalSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result =
        mode === 'signup'
          ? registerLocalCredentials(userId, password)
          : signInWithLocalCredentials(userId, password);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      await upsertProfile();
      await submitPendingScoreIfAny();
      window.location.href = redirectPath;
    } catch {
      setMessage('Could not complete authentication.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLink = () => {
    if (!googleClientId) {
      setMessage('Google sign-in is unavailable. Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }

    const idApi = window.google?.accounts?.id;
    if (!idApi) {
      setMessage('Google SDK not ready. Refresh and try again.');
      return;
    }

    setGoogleBusy(true);
    setMessage(null);

    const { playerId } = getOrCreatePlayerIdentity();
    idApi.initialize({
      client_id: googleClientId,
      callback: (response) => {
        const credential = response.credential;
        if (!credential) {
          setGoogleBusy(false);
          setMessage('Google token missing.');
          return;
        }

        void fetch('/api/profile/link-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, idToken: credential }),
        })
          .then(async (res) => {
            if (!res.ok) return null;
            return (await res.json()) as {
              profile?: {
                id: string;
                linkedGoogle?: {
                  sub: string;
                  email: string;
                  name: string;
                  picture?: string;
                };
              };
            };
          })
          .then((payload) => {
            const linkedGoogle = payload?.profile?.linkedGoogle;
            const linkedPlayerId = payload?.profile?.id;
            if (!linkedGoogle || !linkedPlayerId) {
              setMessage('Could not link Google account.');
              return;
            }
            void (async () => {
              setPlayerId(linkedPlayerId);
              setGoogleLinkedProfile(linkedGoogle);
              await upsertProfile();
              await submitPendingScoreIfAny();
              window.location.href = redirectPath;
            })();
          })
          .catch(() => setMessage('Google sign-in failed.'))
          .finally(() => setGoogleBusy(false));
      },
    });

    idApi.prompt();
  };

  return (
    <main className="relative min-h-screen px-4 py-6 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(34,197,94,0.2),transparent_32%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(251,146,60,0.22),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-3rem)] md:min-h-[calc(100svh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-[2rem] border border-[#d6e0ef] bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
          <section className="relative border-b border-[#d6e0ef] bg-[#0f2748] p-6 md:p-10 text-white md:border-b-0 md:border-r">
            <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-[#1f6feb]/35 blur-3xl" />
            <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-[#2a9d8f]/30 blur-3xl" />
            <div className="relative space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#c8daf2]">
                <MapPinned size={14} />
                Account Gateway
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight md:text-5xl">
                Enter GeoRush
                <br />
                From Any Route
              </h1>
              <p className="max-w-md text-[#c8daf2]">
                Sign in with Google or create your own user ID and password. One click from the avatar now opens this page.
              </p>

              <button
                onClick={handleGoogleLink}
                disabled={googleBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-5 py-3 font-semibold text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Earth size={18} />
                {googleBusy ? 'Connecting Google...' : 'Continue with Google'}
              </button>
            </div>
          </section>

          <section className="p-6 md:p-10">
            <div className="mb-6 flex rounded-xl bg-[#eef3fb] p-1">
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === 'signup' ? 'bg-white text-[#1f2937] shadow-sm' : 'text-[#60758c]'
                }`}
              >
                Create account
              </button>
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                  mode === 'signin' ? 'bg-white text-[#1f2937] shadow-sm' : 'text-[#60758c]'
                }`}
              >
                Sign in
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#3a4d63]">
                User ID
                <input
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="e.g. atlas_runner"
                  className="mt-2 w-full rounded-xl border border-[#d6e0ef] bg-white px-3 py-2.5 text-[#1f2937] outline-none focus:border-[#1f6feb]"
                />
              </label>
              <label className="block text-sm font-semibold text-[#3a4d63]">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-2 w-full rounded-xl border border-[#d6e0ef] bg-white px-3 py-2.5 text-[#1f2937] outline-none focus:border-[#1f6feb]"
                />
              </label>

              <button
                onClick={handleLocalSubmit}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6feb] px-5 py-3 font-semibold text-white hover:bg-[#1958bd] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <KeyRound size={18} />
                {busy ? 'Please wait...' : mode === 'signup' ? 'Create and Continue' : 'Sign In and Continue'}
              </button>

              {message && <p className="text-sm text-[#d14343]">{message}</p>}
            </div>

            <div className="mt-6 text-sm text-[#5a6b7a]">
              Want to play without account?{' '}
              <Link href="/modes" className="font-semibold text-[#1f6feb] hover:text-[#1958bd]">
                Continue as guest
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
