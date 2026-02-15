'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Copy, Flag, ShieldCheck } from 'lucide-react';
import { getOrCreatePlayerIdentity } from '@/lib/playerId';
import { WorldGuessMap } from '@/components/results/WorldGuessMap';
import { COUNTRY_NAMES } from '@/lib/countries';
import { buildCountryLookup, normalizeCountryName, resolveGuessToCountry } from '@/lib/countryNameUtils';

type DuelMode = 'world-quiz' | 'continent-quiz' | 'neighbour-chain' | 'capital-guess';
type ContinentKey = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';

const CONTINENTS: ContinentKey[] = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];
const REQUIRED_BY_CONTINENT: Record<ContinentKey, string[]> = {
  Africa: ['Tanzania', 'Swaziland', 'Republic of the Congo', 'Cape Verde', 'Sao Tome and Principe'],
  Americas: ['United States', 'Antigua and Barbuda', 'Barbados', 'Saint Lucia', 'Saint Kitts and Nevis', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago', 'Dominica'],
  Asia: ['Russia'],
  Europe: ['Russia', 'United Kingdom', 'Kosovo', 'Albania', 'Bosnia and Herzegovina', 'Macedonia', 'Montenegro', 'Serbia'],
  Oceania: [],
};
const REST_TO_LOCAL_OVERRIDES: Record<string, string> = {
  congo: 'Republic of the Congo',
  'republic of congo': 'Republic of the Congo',
  'republic of the congo': 'Republic of the Congo',
  'congo brazzaville': 'Republic of the Congo',
  'united republic of tanzania': 'Tanzania',
  'tanzania united republic of': 'Tanzania',
  'united kingdom of great britain and northern ireland': 'United Kingdom',
  'republic of serbia': 'Serbia',
  kosovo: 'Kosovo',
  'republic of kosovo': 'Kosovo',
};

interface DuelPlayerView {
  playerId: string;
  name: string;
  ready: boolean;
  score: number;
  answersCount: number;
  isSelf: boolean;
}

interface DuelRoomView {
  id: string;
  code: string;
  mode: DuelMode;
  pool: { kind: 'world' } | { kind: 'continent'; continent: string; countriesCount: number };
  series: {
    id: string;
    bestOf: number;
    targetWins: number;
    decided: boolean;
    winnerPlayerId: string | null;
    winnerName: string | null;
    nextMatchNumber: number | null;
    currentMatchNumber: number;
    wins: Array<{ playerId: string; name: string; wins: number }>;
    history: Array<{ roomId: string; matchNumber: number; status: 'waiting' | 'active' | 'finished'; winnerPlayerId: string | null; winnerName: string | null }>;
  };
  rounds: number;
  durationSeconds: number;
  remainingSeconds: number;
  status: 'waiting' | 'active' | 'finished';
  hostPlayerId: string;
  players: DuelPlayerView[];
  me: {
    playerId: string;
    score: number;
    ready: boolean;
    answers: Record<string, { answer: string; correct: boolean; submittedAt: string }>;
    guessedCountries: string[];
  } | null;
  targetCountries: string[];
  focusRegion?: ContinentKey;
  questions: Array<{ idx: number; prompt: string; country?: string; capital?: string }>;
}

const MODE_CARDS: Array<{ key: DuelMode; title: string; subtitle: string }> = [
  { key: 'world-quiz', title: 'World Quiz', subtitle: '197 countries in 15 minutes' },
  { key: 'continent-quiz', title: 'Continent Quiz', subtitle: 'Pick continent, type all countries' },
  { key: 'neighbour-chain', title: 'Neighbour Chain', subtitle: 'Border knowledge battle' },
  { key: 'capital-guess', title: 'Capital Guess', subtitle: 'Country to capital race' },
];

function modeTitle(mode: DuelMode) {
  return MODE_CARDS.find((item) => item.key === mode)?.title || 'Duel';
}

function winnerText(players: DuelPlayerView[]) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  if (sorted.length < 2) return `${sorted[0]?.name || 'Player'} wins`;
  if (sorted[0].score === sorted[1].score) return 'Draw';
  return `${sorted[0].name} wins`;
}

function randomToken(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function DuelRoomPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = decodeURIComponent(params.roomId ?? '');
  const isSpectator = searchParams.get('spectate') === '1';
  const isInviteJoin = searchParams.get('invite') === '1';

  const [room, setRoom] = useState<DuelRoomView | null>(null);
  const [answer, setAnswer] = useState('');
  const [joining, setJoining] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingRematch, setCreatingRematch] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedMode, setSelectedMode] = useState<DuelMode>('world-quiz');
  const [selectedContinent, setSelectedContinent] = useState<ContinentKey>('Asia');
  const [continentCountries, setContinentCountries] = useState<Record<ContinentKey, string[]>>({ Africa: [], Americas: [], Asia: [], Europe: [], Oceania: [] });
  const [loadingContinents, setLoadingContinents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const { playerId, playerName } = useMemo(() => getOrCreatePlayerIdentity(), []);
  const [tabPlayerId, setTabPlayerId] = useState('');
  const [tabPlayerName, setTabPlayerName] = useState('');
  const [identityReady, setIdentityReady] = useState(false);

  useEffect(() => {
    const localLookup = buildCountryLookup(COUNTRY_NAMES);
    let active = true;
    void fetch('https://restcountries.com/v3.1/all?fields=name,region')
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed');
        return (await response.json()) as Array<{ name?: { common?: string; official?: string }; region?: string }>;
      })
      .then((payload) => {
        if (!active) return;
        const next: Record<ContinentKey, Set<string>> = { Africa: new Set(), Americas: new Set(), Asia: new Set(), Europe: new Set(), Oceania: new Set() };
        for (const item of payload) {
          const region = item.region as ContinentKey | undefined;
          if (!region || !CONTINENTS.includes(region)) continue;
          const candidates = [item.name?.common, item.name?.official].filter(Boolean) as string[];
          for (const candidate of candidates) {
            const key = normalizeCountryName(candidate);
            const local = localLookup.get(key) || REST_TO_LOCAL_OVERRIDES[key];
            if (local) next[region].add(local);
          }
        }
        setContinentCountries({
          Africa: Array.from(new Set([...next.Africa, ...REQUIRED_BY_CONTINENT.Africa])).sort(),
          Americas: Array.from(new Set([...next.Americas, ...REQUIRED_BY_CONTINENT.Americas])).sort(),
          Asia: Array.from(new Set([...next.Asia, ...REQUIRED_BY_CONTINENT.Asia])).sort(),
          Europe: Array.from(new Set([...next.Europe, ...REQUIRED_BY_CONTINENT.Europe])).sort(),
          Oceania: Array.from(new Set([...next.Oceania, ...REQUIRED_BY_CONTINENT.Oceania])).sort(),
        });
        setLoadingContinents(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadingContinents(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!roomId) return;
    if (isSpectator || !isInviteJoin) {
      setTabPlayerId(playerId);
      setTabPlayerName(playerName);
      setIdentityReady(true);
      return;
    }
    const idKey = `georush_duel_tab_player_id_${roomId}`;
    const nameKey = `georush_duel_tab_player_name_${roomId}`;
    const existingId = window.sessionStorage.getItem(idKey);
    const existingName = window.sessionStorage.getItem(nameKey);
    if (existingId && existingName) {
      setTabPlayerId(existingId);
      setTabPlayerName(existingName);
      setIdentityReady(true);
      return;
    }
    const id = `duel-tab-${randomToken(10)}`;
    const name = `Guest ${id.slice(-4).toUpperCase()}`;
    window.sessionStorage.setItem(idKey, id);
    window.sessionStorage.setItem(nameKey, name);
    setTabPlayerId(id);
    setTabPlayerName(name);
    setIdentityReady(true);
  }, [isInviteJoin, isSpectator, playerId, playerName, roomId]);

  const viewerPlayerId = useMemo(() => (isSpectator ? `spectator-${tabPlayerId}` : tabPlayerId), [isSpectator, tabPlayerId]);

  const loadRoom = async () => {
    if (!roomId) throw new Error('Invalid room');
    const response = await fetch(`/api/duel/state?roomId=${encodeURIComponent(roomId)}&playerId=${encodeURIComponent(viewerPlayerId)}`);
    const payload = (await response.json()) as { room?: DuelRoomView; error?: string };
    if (!response.ok || !payload.room) throw new Error(payload.error || 'Unable to load room');
    setRoom(payload.room);
    return payload.room;
  };

  useEffect(() => {
    if (!identityReady) return;
    if (!roomId) {
      setJoining(false);
      setError('Invalid room');
      return;
    }
    if (isSpectator) {
      setJoining(true);
      setError(null);
      void loadRoom().catch((e) => setError(e instanceof Error ? e.message : 'Unable to spectate room')).finally(() => setJoining(false));
      return;
    }
    let mounted = true;
    setJoining(true);
    setError(null);
    void fetch('/api/duel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId: tabPlayerId, playerName: tabPlayerName }),
    })
      .then(async (res) => {
        const payload = (await res.json()) as { room?: DuelRoomView; error?: string };
        if (!res.ok || !payload.room) throw new Error(payload.error || 'Unable to join room');
        if (mounted) setRoom(payload.room);
      })
      .catch((e) => {
        if (mounted) setError(e instanceof Error ? e.message : 'Unable to join room');
      })
      .finally(() => {
        if (mounted) setJoining(false);
      });
    return () => {
      mounted = false;
    };
  }, [roomId, tabPlayerId, tabPlayerName, isSpectator, identityReady]);

  useEffect(() => {
    if (!room) return;
    const timer = setInterval(() => {
      void loadRoom().catch(() => undefined);
    }, 1500);
    return () => clearInterval(timer);
  }, [room, roomId, viewerPlayerId]);

  const bothReady = room ? room.players.length === 2 && room.players.every((player) => player.ready) : false;
  const isHost = Boolean(room && room.hostPlayerId === tabPlayerId);
  const isCountryFillMode = room?.mode === 'world-quiz' || room?.mode === 'continent-quiz';

  const myAnswers = room?.me?.answers ?? {};
  const guessedCountries = useMemo(() => {
    if (!room) return [] as string[];
    if (isCountryFillMode) return room.me?.guessedCountries ?? [];
    const out: string[] = [];
    for (let i = 0; i < room.questions.length; i += 1) {
      const answerItem = myAnswers[String(i)];
      const q = room.questions[i];
      if (answerItem?.correct && q?.country) out.push(q.country);
    }
    return out;
  }, [room, isCountryFillMode, myAnswers]);
  const guessedSet = useMemo(() => new Set(guessedCountries), [guessedCountries]);
  const countryLookup = useMemo(
    () => (isCountryFillMode && room ? buildCountryLookup(room.targetCountries) : null),
    [isCountryFillMode, room]
  );

  const focusCountries = useMemo(() => {
    if (!room) return [] as string[];
    if (isCountryFillMode) return room.targetCountries;
    return room.questions.map((q) => q.country).filter((item): item is string => Boolean(item));
  }, [room, isCountryFillMode]);

  const currentQuestionIdx = useMemo(() => {
    if (!room || isCountryFillMode) return 0;
    for (let i = 0; i < room.rounds; i += 1) if (!myAnswers[String(i)]) return i;
    return room.rounds;
  }, [room, isCountryFillMode, myAnswers]);

  const currentQuestion = room?.questions[currentQuestionIdx];

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/duel/${roomId}?invite=1`;
    try {
      await navigator.clipboard.writeText(url);
      setFlash('Invite link copied');
      setTimeout(() => setFlash(null), 1000);
    } catch {
      setFlash('Copy failed');
      setTimeout(() => setFlash(null), 1000);
    }
  };

  const handleReady = async (ready: boolean) => {
    if (!room || isSpectator) return;
    const response = await fetch('/api/duel/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id, playerId: tabPlayerId, ready }),
    });
    const payload = (await response.json()) as { room?: DuelRoomView; error?: string };
    if (!response.ok || !payload.room) {
      setError(payload.error || 'Failed to update ready state');
      return;
    }
    setRoom(payload.room);
  };

  const handleStart = async () => {
    if (!room || !isHost || !bothReady) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch('/api/duel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          hostPlayerId: tabPlayerId,
          mode: selectedMode,
          continent: selectedMode === 'continent-quiz' ? selectedContinent : undefined,
          allowedCountries: selectedMode === 'continent-quiz' ? continentCountries[selectedContinent] ?? [] : undefined,
        }),
      });
      const payload = (await response.json()) as { room?: DuelRoomView; error?: string };
      if (!response.ok || !payload.room) throw new Error(payload.error || 'Unable to start match');
      setRoom(payload.room);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start match');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswerValue = async (value: string, questionIndex?: number) => {
    if (!room || !value.trim() || isSpectator) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/duel/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.id,
          playerId: tabPlayerId,
          questionIndex,
          answer: value,
        }),
      });
      const payload = (await response.json()) as { room?: DuelRoomView; result?: { correct: boolean }; error?: string };
      if (!response.ok || !payload.room) throw new Error(payload.error || 'Submit failed');
      setRoom(payload.room);
      setFlash(payload.result?.correct ? 'Correct +100' : 'Wrong');
      setTimeout(() => setFlash(null), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (isCountryFillMode) return;
    await submitAnswerValue(answer, currentQuestion?.idx);
    setAnswer('');
  };

  const handleCountryFillInput = (nextValue: string) => {
    setAnswer(nextValue);
    if (submitting) return;
    if (!countryLookup) return;
    const resolved = resolveGuessToCountry(nextValue, countryLookup);
    if (!resolved) return;
    if (guessedSet.has(resolved)) return;
    void submitAnswerValue(nextValue, undefined);
    setAnswer('');
  };

  const handleCreateRematch = async () => {
    if (!room || isSpectator) return;
    setCreatingRematch(true);
    setError(null);
    try {
      const response = await fetch('/api/duel/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, requesterPlayerId: tabPlayerId }),
      });
      const payload = (await response.json()) as { room?: { id: string }; error?: string };
      if (!response.ok || !payload.room?.id) throw new Error(payload.error || 'Unable to create rematch');
      window.location.href = `/duel/${payload.room.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create rematch');
    } finally {
      setCreatingRematch(false);
    }
  };

  if (joining) return <main className="min-h-screen px-4 py-12">Joining room...</main>;

  if (error && !room) {
    return (
      <main className="min-h-screen px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-[#e6c3c3] bg-white p-6">
          <p className="text-[#d14343] font-semibold">{error}</p>
          <Link href="/duel" className="neon-btn mt-4 px-4 py-2 inline-flex">Back to Duel Lobby</Link>
        </div>
      </main>
    );
  }

  if (!room) return null;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border border-[#d7e3f5] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6c7d93]">1v1 Duel</p>
              <h1 className="text-2xl font-black text-[#12243a]">{modeTitle(room.mode)}</h1>
              <p className="text-sm text-[#5a6b7a]">Room: <span className="font-bold">{room.code}</span> | Best of {room.series.bestOf} (Match {room.series.currentMatchNumber})</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopyLink} className="neon-btn px-4 py-2 text-sm"><Copy size={14} className="mr-1" />Invite</button>
              <Link href="/duel" className="neon-btn px-4 py-2 text-sm">Lobby</Link>
            </div>
          </div>
          {flash && <p className="mt-2 text-sm text-[#1f6feb]">{flash}</p>}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {room.players.map((player) => (
            <div key={player.playerId} className="rounded-xl border border-[#d7e3f5] bg-white p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1f2937]">{player.name} {player.isSelf ? '(You)' : ''}</p>
                <p className="text-xs text-[#5a6b7a]">{player.answersCount}/{room.rounds} progress</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1f6feb]">{player.score}</p>
                <p className={`text-xs ${player.ready ? 'text-[#2a9d8f]' : 'text-[#e76f51]'}`}>{player.ready ? 'Ready' : 'Not Ready'}</p>
              </div>
            </div>
          ))}
        </section>

        {room.status === 'waiting' && (
          <section className="rounded-2xl border border-[#d7e3f5] bg-white p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {!isSpectator && (
                <>
                  <button onClick={() => handleReady(true)} className="neon-btn-primary px-4 py-2"><ShieldCheck size={14} className="mr-1" />Ready</button>
                  <button onClick={() => handleReady(false)} className="neon-btn px-4 py-2">Unready</button>
                </>
              )}
            </div>
            {bothReady ? (
              isHost && !isSpectator ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#1f2937]">Choose mode and start</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {MODE_CARDS.map((mode) => (
                      <button key={mode.key} onClick={() => setSelectedMode(mode.key)} className={`rounded-xl border px-4 py-3 text-left ${selectedMode === mode.key ? 'border-[#1f6feb] bg-[#eaf2ff]' : 'border-[#d7e3f5] bg-white'}`}>
                        <p className="font-bold text-[#1f2937]">{mode.title}</p>
                        <p className="text-xs text-[#5a6b7a]">{mode.subtitle}</p>
                      </button>
                    ))}
                  </div>
                  {selectedMode === 'continent-quiz' && (
                    <div className="rounded-xl border border-[#d7e3f5] bg-[#f8fbff] p-3">
                      <select value={selectedContinent} onChange={(event) => setSelectedContinent(event.target.value as ContinentKey)} className="w-full rounded-lg border border-[#d7e3f5] px-3 py-2 text-sm">
                        {CONTINENTS.map((continent) => (
                          <option key={continent} value={continent}>{continent}</option>
                        ))}
                      </select>
                      <p className="text-xs text-[#5a6b7a] mt-2">{loadingContinents ? 'Loading countries...' : `${continentCountries[selectedContinent]?.length || 0} countries in ${selectedContinent}`}</p>
                    </div>
                  )}
                  <button onClick={handleStart} disabled={starting || (selectedMode === 'continent-quiz' && (loadingContinents || (continentCountries[selectedContinent]?.length || 0) < 8))} className="neon-btn-primary px-5 py-2.5 disabled:opacity-60">
                    {starting ? 'Starting...' : `Start ${modeTitle(selectedMode)}`}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-[#5a6b7a]">Both ready. Waiting for host to select mode and start.</p>
              )
            ) : (
              <p className="text-sm text-[#5a6b7a]">Both players need to ready up before mode selection.</p>
            )}
          </section>
        )}

        {room.status === 'active' && (
          <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
            <WorldGuessMap guessedCountries={guessedCountries} focusCountries={focusCountries} focusRegion={room.focusRegion} title="Live Duel Map" mapHeightClass="h-[360px] md:h-[620px]" />
            <div className="rounded-2xl border border-[#d7e3f5] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#5a6b7a]">{isCountryFillMode ? `Guessed ${guessedCountries.length}/${room.targetCountries.length}` : `Question ${Math.min(currentQuestionIdx + 1, room.rounds)}/${room.rounds}`}</p>
                <p className="text-sm font-bold text-[#1f6feb]">{room.remainingSeconds}s</p>
              </div>
              {isCountryFillMode ? (
                <>
                  <div className="rounded-xl border border-[#d7e3f5] bg-[#f7fbff] p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-[#6c7d93]">Prompt</p>
                    <p className="text-xl font-black text-[#13243a] mt-1">Type country names</p>
                  </div>
                  {!isSpectator && (
                    <div className="space-y-2">
                      <input
                        value={answer}
                        onChange={(event) => handleCountryFillInput(event.target.value)}
                        className="w-full rounded-xl border border-[#d7e3f5] px-4 py-3 outline-none focus:border-[#1f6feb]"
                        placeholder="Type country name..."
                      />
                    </div>
                  )}
                </>
              ) : currentQuestion ? (
                <>
                  <div className="rounded-xl border border-[#d7e3f5] bg-[#f7fbff] p-4">
                    <p className="text-xs uppercase tracking-[0.15em] text-[#6c7d93]">Prompt</p>
                    <p className="text-2xl font-black text-[#13243a] mt-1">{currentQuestion.prompt}</p>
                  </div>
                  {!isSpectator && (
                    <div className="space-y-2">
                      <input value={answer} onChange={(event) => setAnswer(event.target.value)} className="w-full rounded-xl border border-[#d7e3f5] px-4 py-3 outline-none focus:border-[#1f6feb]" placeholder="Type answer..." />
                      <button onClick={handleSubmitAnswer} disabled={submitting} className="neon-btn-primary w-full py-3">{submitting ? 'Submitting...' : 'Submit'}</button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[#5a6b7a]">You finished all answers. Waiting for timer/opponent.</p>
              )}
            </div>
          </section>
        )}

        {room.status === 'finished' && (
          <section className="rounded-2xl border border-[#d7e3f5] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Flag size={18} className="text-[#1f6feb]" />
              <h2 className="text-2xl font-black text-[#13243a]">{winnerText(room.players)}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {room.players.slice().sort((a, b) => b.score - a.score).map((player) => (
                <div key={player.playerId} className="rounded-lg border border-[#d7e3f5] bg-[#f8fbff] p-3 flex items-center justify-between">
                  <span className="font-semibold text-[#1f2937]">{player.name}</span>
                  <span className="font-bold text-[#1f6feb]">{player.score}</span>
                </div>
              ))}
            </div>
            {!isSpectator && (
              <button onClick={handleCreateRematch} disabled={creatingRematch || room.series.decided || !room.series.nextMatchNumber} className="neon-btn-primary px-5 py-2.5 disabled:opacity-60">
                {creatingRematch ? 'Creating rematch...' : room.series.nextMatchNumber ? `Start Match ${room.series.nextMatchNumber}` : 'Series Complete'}
              </button>
            )}
          </section>
        )}

        {error && <p className="text-sm text-[#d14343]">{error}</p>}
      </div>
    </main>
  );
}
