import { COUNTRIES, normalizeText } from '@/lib/countries';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export type DuelMode = 'world-quiz' | 'continent-quiz' | 'neighbour-chain' | 'capital-guess';
export type ContinentKey = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';
export type DuelPool =
  | { kind: 'world' }
  | { kind: 'continent'; continent: ContinentKey; countries: string[] };

type DuelStatus = 'waiting' | 'active' | 'finished';

interface DuelQuestion {
  idx: number;
  prompt: string;
  answer: string;
  country: string;
  capital: string;
}

interface DuelAnswer {
  answer: string;
  correct: boolean;
  submittedAt: string;
}

interface DuelPlayer {
  playerId: string;
  name: string;
  joinedAt: string;
  ready: boolean;
  score: number;
  answers: Record<string, DuelAnswer>;
  guessedCountries: string[];
}

interface DuelRoom {
  id: string;
  code: string;
  mode: DuelMode;
  pool: DuelPool;
  seriesId: string;
  seriesBestOf: number;
  seriesMatchNumber: number;
  rounds: number;
  durationSeconds: number;
  hostPlayerId: string;
  status: DuelStatus;
  players: DuelPlayer[];
  questions: DuelQuestion[];
  targetCountries: string[];
  focusRegion?: ContinentKey;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

interface DuelRoomRow {
  id: string;
  code: string;
  series_id: string;
  series_match_number: number;
  expires_at: string;
  updated_at: string;
  payload: DuelRoom;
}

const ROOM_TTL_MS = 1000 * 60 * 60 * 24;
const ROOM_MUTATION_MAX_RETRIES = 8;
const TABLE = 'duel_rooms';
const COUNTRY_NAME_SET = new Set(COUNTRIES.map((item) => item.name));

function randomToken(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSafeName(name: string) {
  const clean = name.trim().slice(0, 40);
  return clean || 'Player';
}

function addTtl(iso: string) {
  return new Date(new Date(iso).getTime() + ROOM_TTL_MS).toISOString();
}

function pickRandomCountries(count: number) {
  const shuffled = [...COUNTRIES].filter((c) => c.name && c.capital);
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function createQuestions(mode: DuelMode, rounds: number): DuelQuestion[] {
  const picks = pickRandomCountries(rounds);
  return picks.map((item, idx) => {
    if (mode === 'capital-guess') {
      return {
        idx,
        prompt: item.name,
        answer: item.capital,
        country: item.name,
        capital: item.capital,
      };
    }
    return {
      idx,
      prompt: item.capital,
      answer: item.name,
      country: item.name,
      capital: item.capital,
    };
  });
}

function createNeighbourQuestions(rounds: number): DuelQuestion[] {
  const viable = COUNTRIES.filter((item) => item.neighbors.length > 0);
  if (viable.length === 0) return createQuestions('world-quiz', rounds);
  const seed = viable[Math.floor(Math.random() * viable.length)];
  const neighbors = [...seed.neighbors].slice(0, rounds);
  return neighbors.map((neighbor, idx) => ({
    idx,
    prompt: `Neighbor of ${seed.name}`,
    answer: neighbor,
    country: neighbor,
    capital: COUNTRIES.find((c) => c.name === neighbor)?.capital || '',
  }));
}

function createQuestionsFromPool(mode: DuelMode, rounds: number, pool: DuelPool): DuelQuestion[] {
  if (pool.kind !== 'continent' || pool.countries.length === 0) {
    return createQuestions(mode, rounds);
  }

  const allowed = new Set(pool.countries);
  const source = COUNTRIES.filter((item) => allowed.has(item.name));
  if (source.length < 8) {
    return createQuestions(mode, rounds);
  }

  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picks = shuffled.slice(0, Math.min(rounds, shuffled.length));
  return picks.map((item, idx) => {
    if (mode === 'capital-guess') {
      return {
        idx,
        prompt: item.name,
        answer: item.capital,
        country: item.name,
        capital: item.capital,
      };
    }
    return {
      idx,
      prompt: item.capital,
      answer: item.name,
      country: item.name,
      capital: item.capital,
    };
  });
}

function createQuestionsForMode(mode: DuelMode, rounds: number, pool: DuelPool): DuelQuestion[] {
  if (mode === 'neighbour-chain') return createNeighbourQuestions(rounds);
  return createQuestionsFromPool(mode, rounds, pool);
}

function sanitizePool(input: {
  kind?: string;
  continent?: string;
  allowedCountries?: string[];
}): DuelPool {
  if (input.kind !== 'continent') {
    return { kind: 'world' };
  }

  const continent =
    input.continent === 'Africa' ||
    input.continent === 'Americas' ||
    input.continent === 'Asia' ||
    input.continent === 'Europe' ||
    input.continent === 'Oceania'
      ? input.continent
      : null;

  if (!continent) {
    return { kind: 'world' };
  }

  const countries = Array.isArray(input.allowedCountries)
    ? [...new Set(input.allowedCountries.filter((name) => COUNTRY_NAME_SET.has(name)).map((name) => name.trim()))]
    : [];

  if (countries.length < 8) {
    return { kind: 'world' };
  }

  return {
    kind: 'continent',
    continent,
    countries,
  };
}

function ensureRoomSeries(room: DuelRoom) {
  if (!room.seriesId || typeof room.seriesId !== 'string') {
    room.seriesId = `series-${room.id}`;
  }
  if (typeof room.seriesBestOf !== 'number' || !Number.isFinite(room.seriesBestOf) || room.seriesBestOf < 1) {
    room.seriesBestOf = 1;
  }
  room.seriesBestOf = Math.max(1, Math.min(3, Math.floor(room.seriesBestOf)));

  if (
    typeof room.seriesMatchNumber !== 'number' ||
    !Number.isFinite(room.seriesMatchNumber) ||
    room.seriesMatchNumber < 1
  ) {
    room.seriesMatchNumber = 1;
  }
  room.seriesMatchNumber = Math.max(1, Math.floor(room.seriesMatchNumber));
}

function ensureRoomPlayers(room: DuelRoom) {
  room.players = room.players.map((player) => ({
    ...player,
    answers: player.answers && typeof player.answers === 'object' ? player.answers : {},
    guessedCountries: Array.isArray(player.guessedCountries) ? player.guessedCountries : [],
  }));
}

function ensureRoomPool(room: DuelRoom) {
  if (!room.pool || typeof room.pool !== 'object') {
    room.pool = { kind: 'world' };
  }
}

function ensureRoomModeState(room: DuelRoom) {
  if (!Array.isArray(room.targetCountries)) {
    room.targetCountries = [];
  }
}

function ensureRoomQuestions(room: DuelRoom) {
  if (room.mode === 'world-quiz' || room.mode === 'continent-quiz') return;
  if (Array.isArray(room.questions) && room.questions.length > 0) return;
  room.questions = createQuestionsFromPool(room.mode, room.rounds, room.pool ?? { kind: 'world' });
}

function maybeFinalizeRoom(room: DuelRoom) {
  if (room.status !== 'active' || !room.startedAt) return;

  const startedAtMs = new Date(room.startedAt).getTime();
  const elapsed = (Date.now() - startedAtMs) / 1000;
  const isCountryFillMode = room.mode === 'world-quiz' || room.mode === 'continent-quiz';

  if (isCountryFillMode) {
    const targetCount = room.targetCountries.length;
    const someoneCompleted =
      targetCount > 0 && room.players.some((player) => player.guessedCountries.length >= targetCount);
    if (elapsed >= room.durationSeconds || someoneCompleted) {
      const remaining = Math.max(0, room.durationSeconds - Math.floor(elapsed));
      for (const player of room.players) {
        player.score = player.guessedCountries.length * 10 + Math.floor(remaining / 6);
      }
      room.status = 'finished';
      room.endedAt = nowIso();
    }
    return;
  }

  const allCompleted = room.players.every((player) => Object.keys(player.answers).length >= room.rounds);
  if (elapsed >= room.durationSeconds || allCompleted) {
    room.status = 'finished';
    room.endedAt = nowIso();
  }
}

function roomWinnerPlayerId(room: DuelRoom): string | null {
  if (room.status !== 'finished' || room.players.length < 2) return null;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  if (sorted[0].score === sorted[1].score) return null;
  return sorted[0].playerId;
}

async function cleanupExpiredRooms() {
  const supabase = getSupabaseAdminClient();
  await supabase.from(TABLE).delete().lt('expires_at', nowIso());
}

function normalizeRoom(room: DuelRoom) {
  ensureRoomPool(room);
  ensureRoomSeries(room);
  ensureRoomPlayers(room);
  ensureRoomModeState(room);
  ensureRoomQuestions(room);
}

async function fetchRoomByRef(roomRef: string): Promise<DuelRoomRow | null> {
  const supabase = getSupabaseAdminClient();
  const trimmed = roomRef.trim();
  if (!trimmed) return null;

  const byId = await supabase
    .from(TABLE)
    .select('id, code, series_id, series_match_number, expires_at, updated_at, payload')
    .eq('id', trimmed)
    .maybeSingle();

  if (byId.data) return byId.data as DuelRoomRow;

  const byCode = await supabase
    .from(TABLE)
    .select('id, code, series_id, series_match_number, expires_at, updated_at, payload')
    .eq('code', trimmed.toUpperCase())
    .maybeSingle();

  if (byCode.data) return byCode.data as DuelRoomRow;
  return null;
}

async function fetchSeriesRooms(seriesId: string): Promise<DuelRoom[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from(TABLE)
    .select('payload')
    .eq('series_id', seriesId)
    .order('series_match_number', { ascending: true });

  const rooms = (data ?? [])
    .map((item) => (item as { payload?: DuelRoom }).payload)
    .filter((item): item is DuelRoom => Boolean(item));

  for (const room of rooms) {
    normalizeRoom(room);
    maybeFinalizeRoom(room);
  }

  return rooms;
}

async function saveRoom(room: DuelRoom, expectedUpdatedAt?: string | null) {
  const supabase = getSupabaseAdminClient();
  normalizeRoom(room);

  const payload = {
    code: room.code.toUpperCase(),
    series_id: room.seriesId,
    series_match_number: room.seriesMatchNumber,
    expires_at: addTtl(nowIso()),
    payload: room,
  };

  if (!expectedUpdatedAt) {
    const { error } = await supabase.from(TABLE).update(payload).eq('id', room.id);
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', room.id)
    .eq('updated_at', expectedUpdatedAt)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('CONFLICT_RETRY');
}

async function mutateRoom<T>(roomRef: string, task: (room: DuelRoom) => Promise<T> | T): Promise<T> {
  await cleanupExpiredRooms();

  for (let i = 0; i < ROOM_MUTATION_MAX_RETRIES; i += 1) {
    const row = await fetchRoomByRef(roomRef);
    if (!row?.payload) throw new Error('Room not found');

    const room = row.payload;
    normalizeRoom(room);

    const result = await task(room);

    try {
      await saveRoom(room, row.updated_at);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'CONFLICT_RETRY' && i < ROOM_MUTATION_MAX_RETRIES - 1) {
        await sleep(20 + Math.floor(Math.random() * 60));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Conflict while updating room');
}

function computeSeriesSnapshot(seriesRooms: DuelRoom[], room: DuelRoom) {
  const winsByPlayer: Record<string, { playerId: string; name: string; wins: number }> = {};

  for (const matchRoom of seriesRooms) {
    for (const player of matchRoom.players.slice(0, 2)) {
      if (!winsByPlayer[player.playerId]) {
        winsByPlayer[player.playerId] = {
          playerId: player.playerId,
          name: player.name,
          wins: 0,
        };
      }
    }
    const winnerPlayerId = roomWinnerPlayerId(matchRoom);
    if (winnerPlayerId && winsByPlayer[winnerPlayerId]) {
      winsByPlayer[winnerPlayerId].wins += 1;
    }
  }

  const winsList = Object.values(winsByPlayer).sort((a, b) => b.wins - a.wins);
  const targetWins = Math.max(1, Math.ceil(room.seriesBestOf / 2));
  const decidedWinner = winsList.find((item) => item.wins >= targetWins) ?? null;
  const highestMatch = seriesRooms.reduce((acc, item) => Math.max(acc, item.seriesMatchNumber), 0);
  const decided = Boolean(decidedWinner) || highestMatch >= room.seriesBestOf;
  const nextMatchNumber = decided ? null : highestMatch + 1;

  const history = seriesRooms.map((matchRoom) => {
    const winnerPlayerId = roomWinnerPlayerId(matchRoom);
    const winnerName = winnerPlayerId
      ? matchRoom.players.find((player) => player.playerId === winnerPlayerId)?.name ?? null
      : null;

    return {
      roomId: matchRoom.id,
      matchNumber: matchRoom.seriesMatchNumber,
      status: matchRoom.status,
      winnerPlayerId,
      winnerName,
      endedAt: matchRoom.endedAt,
      scores: matchRoom.players.slice(0, 2).map((player) => ({
        playerId: player.playerId,
        name: player.name,
        score: player.score,
      })),
    };
  });

  return {
    id: room.seriesId,
    bestOf: room.seriesBestOf,
    targetWins,
    decided,
    winnerPlayerId: decidedWinner?.playerId ?? null,
    winnerName: decidedWinner?.name ?? null,
    nextMatchNumber,
    currentMatchNumber: room.seriesMatchNumber,
    wins: winsList,
    history,
  };
}

async function sanitizeRoomForClient(room: DuelRoom, viewerPlayerId: string) {
  const me = room.players.find((p) => p.playerId === viewerPlayerId) ?? null;
  const startedAtMs = room.startedAt ? new Date(room.startedAt).getTime() : null;
  const elapsed = startedAtMs ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0;
  const remainingSeconds =
    room.status === 'active' ? Math.max(0, room.durationSeconds - elapsed) : room.durationSeconds;
  const isCountryFillMode = room.mode === 'world-quiz' || room.mode === 'continent-quiz';

  if (room.status === 'active' && isCountryFillMode) {
    for (const player of room.players) {
      player.score = player.guessedCountries.length * 10 + Math.floor(remainingSeconds / 6);
    }
  }

  const seriesRooms = await fetchSeriesRooms(room.seriesId);
  const series = computeSeriesSnapshot(seriesRooms, room);

  return {
    id: room.id,
    code: room.code,
    mode: room.mode,
    pool:
      room.pool.kind === 'continent'
        ? {
            kind: 'continent' as const,
            continent: room.pool.continent,
            countriesCount: room.pool.countries.length,
          }
        : { kind: 'world' as const },
    series,
    rounds: room.rounds,
    durationSeconds: room.durationSeconds,
    remainingSeconds,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    players: room.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      ready: player.ready,
      score: player.score,
      answersCount: isCountryFillMode ? player.guessedCountries.length : Object.keys(player.answers).length,
      isSelf: player.playerId === viewerPlayerId,
    })),
    me: me
      ? {
          playerId: me.playerId,
          answers: me.answers,
          guessedCountries: me.guessedCountries,
          score: me.score,
          ready: me.ready,
        }
      : null,
    targetCountries: room.targetCountries,
    focusRegion: room.focusRegion,
    questions: room.questions.map((q) => ({
      idx: q.idx,
      prompt: q.prompt,
      country: room.status === 'finished' ? q.country : undefined,
      capital: room.status === 'finished' ? q.capital : undefined,
    })),
  };
}

export async function createDuelRoom(input: {
  playerId: string;
  playerName: string;
  mode: DuelMode;
  seriesBestOf?: number;
  pool?: { kind?: string; continent?: string; allowedCountries?: string[] };
}) {
  const safePlayerId = input.playerId.trim().slice(0, 80);
  if (!safePlayerId) throw new Error('playerId is required');

  const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const seriesId = `series-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const pool = sanitizePool({
    kind: input.pool?.kind,
    continent: input.pool?.continent,
    allowedCountries: input.pool?.allowedCountries,
  });

  const bestOf =
    typeof input.seriesBestOf === 'number' && Number.isFinite(input.seriesBestOf)
      ? Math.max(1, Math.min(3, Math.floor(input.seriesBestOf)))
      : 1;

  const room: DuelRoom = {
    id: roomId,
    code: randomToken(6),
    mode: input.mode,
    pool,
    seriesId,
    seriesBestOf: bestOf,
    seriesMatchNumber: 1,
    rounds: 12,
    durationSeconds: 180,
    hostPlayerId: safePlayerId,
    status: 'waiting',
    players: [
      {
        playerId: safePlayerId,
        name: toSafeName(input.playerName),
        joinedAt: nowIso(),
        ready: false,
        score: 0,
        answers: {},
        guessedCountries: [],
      },
    ],
    questions: [],
    targetCountries: [],
    createdAt: nowIso(),
  };

  normalizeRoom(room);

  const supabase = getSupabaseAdminClient();
  for (let i = 0; i < 4; i += 1) {
    const { error } = await supabase.from(TABLE).insert({
      id: room.id,
      code: room.code.toUpperCase(),
      series_id: room.seriesId,
      series_match_number: room.seriesMatchNumber,
      expires_at: addTtl(nowIso()),
      payload: room,
    });

    if (!error) return sanitizeRoomForClient(room, safePlayerId);
    if (!String(error.message).toLowerCase().includes('duplicate') || i === 3) {
      throw new Error(`Failed to create room: ${error.message}`);
    }
    room.code = randomToken(6);
  }

  throw new Error('Failed to create room');
}

export async function joinDuelRoom(input: { roomId: string; playerId: string; playerName: string }) {
  const safePlayerId = input.playerId.trim().slice(0, 80);
  if (!input.roomId.trim() || !safePlayerId) throw new Error('roomId and playerId are required');

  return mutateRoom(input.roomId, async (room) => {
    maybeFinalizeRoom(room);

    const existing = room.players.find((p) => p.playerId === safePlayerId);
    if (!existing) {
      if (room.players.length >= 2) throw new Error('Room is full');
      room.players.push({
        playerId: safePlayerId,
        name: toSafeName(input.playerName),
        joinedAt: nowIso(),
        ready: false,
        score: 0,
        answers: {},
        guessedCountries: [],
      });
    } else {
      existing.name = toSafeName(input.playerName);
    }

    return sanitizeRoomForClient(room, safePlayerId);
  });
}

export async function getDuelRoomState(input: { roomId: string; viewerPlayerId: string }) {
  const safeViewerPlayerId = input.viewerPlayerId.trim().slice(0, 80);
  if (!input.roomId.trim() || !safeViewerPlayerId) throw new Error('roomId and viewerPlayerId are required');

  return mutateRoom(input.roomId, async (room) => {
    maybeFinalizeRoom(room);
    return sanitizeRoomForClient(room, safeViewerPlayerId);
  });
}

export async function setDuelReady(input: { roomId: string; playerId: string; ready: boolean }) {
  const safePlayerId = input.playerId.trim().slice(0, 80);
  if (!input.roomId.trim() || !safePlayerId) throw new Error('roomId and playerId are required');

  return mutateRoom(input.roomId, async (room) => {
    if (room.status !== 'waiting') throw new Error('Room already started');

    const player = room.players.find((p) => p.playerId === safePlayerId);
    if (!player) throw new Error('Player is not in this room');

    player.ready = Boolean(input.ready);
    return sanitizeRoomForClient(room, safePlayerId);
  });
}

export async function startDuelMatch(input: {
  roomId: string;
  hostPlayerId: string;
  mode: DuelMode;
  continent?: ContinentKey;
  allowedCountries?: string[];
}) {
  const safeHostPlayerId = input.hostPlayerId.trim().slice(0, 80);
  if (!input.roomId.trim() || !safeHostPlayerId) throw new Error('roomId and hostPlayerId are required');

  return mutateRoom(input.roomId, async (room) => {
    if (room.status !== 'waiting') throw new Error('Room already started');
    if (room.hostPlayerId !== safeHostPlayerId) throw new Error('Only host can start the match');
    if (room.players.length !== 2) throw new Error('Two players are required');
    if (!room.players.every((p) => p.ready)) throw new Error('Both players must be ready');

    room.mode = input.mode;
    room.focusRegion = undefined;
    room.targetCountries = [];

    if (room.mode === 'world-quiz') {
      room.rounds = COUNTRIES.length;
      room.durationSeconds = 15 * 60;
      room.targetCountries = COUNTRIES.map((item) => item.name);
      room.questions = [];
    } else if (room.mode === 'continent-quiz') {
      const continent =
        input.continent === 'Africa' ||
        input.continent === 'Americas' ||
        input.continent === 'Asia' ||
        input.continent === 'Europe' ||
        input.continent === 'Oceania'
          ? input.continent
          : null;
      if (!continent) throw new Error('Continent selection is required');

      const filtered = Array.isArray(input.allowedCountries)
        ? [...new Set(input.allowedCountries.filter((name) => COUNTRY_NAME_SET.has(name)))]
        : [];
      if (filtered.length < 8) throw new Error('Continent country list is required');

      room.rounds = filtered.length;
      room.durationSeconds =
        continent === 'Oceania' ? 5 * 60 : continent === 'Americas' || continent === 'Europe' ? 7 * 60 : 8 * 60;
      room.targetCountries = filtered;
      room.focusRegion = continent;
      room.questions = [];
    } else {
      room.rounds = 12;
      room.durationSeconds = 180;
      room.questions = createQuestionsForMode(room.mode, room.rounds, room.pool);
    }

    room.startedAt = nowIso();
    room.status = 'active';
    room.players = room.players.map((player) => ({
      ...player,
      score: 0,
      answers: {},
      guessedCountries: [],
    }));

    return sanitizeRoomForClient(room, safeHostPlayerId);
  });
}

export async function submitDuelAnswer(input: {
  roomId: string;
  playerId: string;
  questionIndex?: number;
  answer: string;
}) {
  const safePlayerId = input.playerId.trim().slice(0, 80);
  if (!input.roomId.trim() || !safePlayerId) throw new Error('roomId and playerId are required');

  return mutateRoom(input.roomId, async (room) => {
    maybeFinalizeRoom(room);
    if (room.status !== 'active') throw new Error('Room is not active');

    const player = room.players.find((p) => p.playerId === safePlayerId);
    if (!player) throw new Error('Player is not in this room');

    const isCountryFillMode = room.mode === 'world-quiz' || room.mode === 'continent-quiz';

    if (isCountryFillMode) {
      const { buildCountryLookup, resolveGuessToCountry } = await import('@/lib/countryNameUtils');
      const cleanAnswer = input.answer.trim().slice(0, 80);
      const lookup = buildCountryLookup(room.targetCountries);
      const resolved = resolveGuessToCountry(cleanAnswer, lookup);
      const alreadyGuessed = resolved ? player.guessedCountries.includes(resolved) : false;
      const correct = Boolean(resolved && !alreadyGuessed);

      if (correct && resolved) {
        player.guessedCountries.push(resolved);
      }

      const startedAtMs = room.startedAt ? new Date(room.startedAt).getTime() : Date.now();
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      const remaining = Math.max(0, room.durationSeconds - elapsed);
      player.score = player.guessedCountries.length * 10 + Math.floor(remaining / 6);

      const result: DuelAnswer = {
        answer: cleanAnswer,
        correct,
        submittedAt: nowIso(),
      };

      maybeFinalizeRoom(room);
      return {
        room: await sanitizeRoomForClient(room, safePlayerId),
        result,
      };
    }

    const idx = Math.max(0, Math.min(room.rounds - 1, Math.floor(input.questionIndex ?? 0)));
    const key = String(idx);

    if (player.answers[key]) {
      return {
        room: await sanitizeRoomForClient(room, safePlayerId),
        result: player.answers[key],
      };
    }

    const question = room.questions[idx];
    if (!question) throw new Error('Question not found');

    const cleanAnswer = input.answer.trim().slice(0, 80);
    const correct = normalizeText(cleanAnswer) === normalizeText(question.answer);
    if (correct) player.score += 100;

    const result: DuelAnswer = {
      answer: cleanAnswer,
      correct,
      submittedAt: nowIso(),
    };

    player.answers[key] = result;
    maybeFinalizeRoom(room);

    return {
      room: await sanitizeRoomForClient(room, safePlayerId),
      result,
    };
  });
}

export async function createDuelRematch(input: { roomId: string; requesterPlayerId: string }) {
  const safeRequester = input.requesterPlayerId.trim().slice(0, 80);
  if (!input.roomId.trim() || !safeRequester) throw new Error('roomId and requesterPlayerId are required');

  await cleanupExpiredRooms();
  const sourceRow = await fetchRoomByRef(input.roomId);
  if (!sourceRow?.payload) throw new Error('Room not found');

  const source = sourceRow.payload;
  normalizeRoom(source);
  maybeFinalizeRoom(source);

  if (source.status !== 'finished') {
    throw new Error('Current match must be finished first');
  }

  const requesterInRoom = source.players.some((p) => p.playerId === safeRequester);
  if (!requesterInRoom) throw new Error('Only participants can create rematch');

  const seriesRooms = await fetchSeriesRooms(source.seriesId);
  const snapshot = computeSeriesSnapshot(seriesRooms, source);

  if (snapshot.decided) {
    throw new Error('Series is already decided');
  }
  if (!snapshot.nextMatchNumber || snapshot.nextMatchNumber > source.seriesBestOf) {
    throw new Error('Maximum series matches reached');
  }

  const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const hostPlayerId = source.players.find((p) => p.playerId === safeRequester)?.playerId ?? source.hostPlayerId;

  const room: DuelRoom = {
    id: roomId,
    code: randomToken(6),
    mode: source.mode,
    pool: source.pool,
    seriesId: source.seriesId,
    seriesBestOf: source.seriesBestOf,
    seriesMatchNumber: snapshot.nextMatchNumber,
    rounds: source.rounds,
    durationSeconds: source.durationSeconds,
    hostPlayerId,
    status: 'waiting',
    players: source.players.slice(0, 2).map((player) => ({
      playerId: player.playerId,
      name: player.name,
      joinedAt: nowIso(),
      ready: false,
      score: 0,
      answers: {},
      guessedCountries: [],
    })),
    questions: [],
    targetCountries: [],
    focusRegion: undefined,
    createdAt: nowIso(),
  };

  normalizeRoom(room);

  const supabase = getSupabaseAdminClient();
  for (let i = 0; i < 4; i += 1) {
    const { error } = await supabase.from(TABLE).insert({
      id: room.id,
      code: room.code.toUpperCase(),
      series_id: room.seriesId,
      series_match_number: room.seriesMatchNumber,
      expires_at: addTtl(nowIso()),
      payload: room,
    });

    if (!error) return sanitizeRoomForClient(room, safeRequester);
    if (!String(error.message).toLowerCase().includes('duplicate') || i === 3) {
      throw new Error('Failed to create rematch');
    }
    room.code = randomToken(6);
  }

  throw new Error('Failed to create rematch');
}
