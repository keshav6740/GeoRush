'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Link2, Swords } from 'lucide-react';
import { getOrCreatePlayerIdentity } from '@/lib/playerId';

export default function DuelLobbyPage() {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [busyCreate, setBusyCreate] = useState(false);
  const [seriesBestOf, setSeriesBestOf] = useState<1 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    const { playerId, playerName } = getOrCreatePlayerIdentity();
    setBusyCreate(true);
    setError(null);
    try {
      const response = await fetch('/api/duel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, playerName, mode: 'world-quiz', seriesBestOf }),
      });
      const payload = (await response.json()) as { room?: { id: string }; error?: string };
      if (!response.ok || !payload.room?.id) throw new Error(payload.error || 'Failed to create room');
      window.location.href = `/duel/${payload.room.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
    } finally {
      setBusyCreate(false);
    }
  };

  const handleJoinRoom = () => {
    const trimmed = joinRoomId.trim();
    if (!trimmed) {
      setError('Enter room code or room ID.');
      return;
    }
    window.location.href = `/duel/${encodeURIComponent(trimmed)}?invite=1`;
  };

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border border-[#d7e3f5] bg-white p-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#d7e3f5] px-4 py-1 text-xs uppercase tracking-[0.2em] text-[#5e7186]">
            <Swords size={14} /> 1v1 Duel
          </p>
          <h1 className="mt-4 text-5xl font-black text-[#101f33]">Duel Lobby</h1>
          <p className="mt-2 text-[#5b6c80]">Create a room, invite your friend, ready up, pick mode, then play.</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#d7e3f5] bg-white p-6 space-y-3">
            <h2 className="text-2xl font-black text-[#13243a]">Create</h2>
            <p className="text-sm text-[#5b6c80]">You will choose game mode after both players are ready.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSeriesBestOf(1)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  seriesBestOf === 1 ? 'border-[#1f6feb] bg-[#eaf2ff] text-[#123b7d]' : 'border-[#d7e3f5] bg-white text-[#3c4f66]'
                }`}
              >
                Single Match
              </button>
              <button
                onClick={() => setSeriesBestOf(3)}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  seriesBestOf === 3 ? 'border-[#1f6feb] bg-[#eaf2ff] text-[#123b7d]' : 'border-[#d7e3f5] bg-white text-[#3c4f66]'
                }`}
              >
                Best of 3
              </button>
            </div>
            <button onClick={handleCreateRoom} disabled={busyCreate} className="neon-btn-primary w-full py-3">
              {busyCreate ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div className="rounded-2xl border border-[#d7e3f5] bg-white p-6 space-y-3">
            <h2 className="text-2xl font-black text-[#13243a]">Join</h2>
            <label className="block text-sm text-[#5b6c80]">
              Room code or ID
              <div className="mt-2 relative">
                <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7e8ea3]" />
                <input
                  value={joinRoomId}
                  onChange={(event) => setJoinRoomId(event.target.value)}
                  className="w-full rounded-xl border border-[#d7e3f5] py-2.5 pl-9 pr-3 outline-none focus:border-[#1f6feb]"
                  placeholder="e.g. room-xxxx or A1B2C3"
                />
              </div>
            </label>
            <button onClick={handleJoinRoom} className="neon-btn w-full py-3">Join Room</button>
          </div>
        </section>

        {error && <p className="text-sm text-[#d14343]">{error}</p>}

        <div>
          <Link href="/modes" className="text-sm font-semibold text-[#3c4f66] hover:text-[#1f6feb]">Back to Modes</Link>
        </div>
      </div>
    </main>
  );
}
