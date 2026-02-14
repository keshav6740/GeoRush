import { promises as fs } from 'fs';
import path from 'path';
import { COUNTRIES, normalizeText } from '@/lib/countries';

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

interface DuelStore {
  rooms: Record<string, DuelRoom>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'duels.json');
const ROOM_TTL_MS = 1000 * 60 * 60 * 24;

const EMPTY_STORE: DuelStore = { rooms: {} };
const COUNTRY_NAME_SET = new Set(COUNTRIES.map((item) => item.name));

let writeQueue = Promise.resolve();

function randomToken(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), 'utf-8');
  }
}

async function readStore(): Promise<DuelStore> {
  await ensureStoreFile();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DuelStore;
    if (!parsed || typeof parsed !== 'object' || !parsed.rooms || typeof parsed.rooms !== 'object') {
      return { rooms: {} };
    }
    return parsed;
  } catch {
    return { rooms: {} };
  }
}

async function writeStore(store: DuelStore) {
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf-8');
  await fs.rename(tempFile, DATA_FILE);
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

function createQuestionsForMode(mode: DuelMode, rounds: number, pool: DuelPool): DuelQuestion[] {
  if (mode === 'neighbour-chain') {
    return createNeighbourQuestions(rounds);
  }

  const picks = pool.kind === 'continent' ? createQuestionsFromPool(mode, rounds, pool) : createQuestions(mode, rounds);
  return picks;
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

function toSafeName(name: string) {
  const clean = name.trim().slice(0, 40);
  return clean || 'Player';
}

function expireOldRooms(store: DuelStore) {
  const now = Date.now();
  for (const [roomId, room] of Object.entries(store.rooms)) {
    const createdAt = new Date(room.createdAt).getTime();
    if (!Number.isFinite(createdAt) || now - createdAt > ROOM_TTL_MS) {
      delete store.rooms[roomId];
    }
  }
}

function findRoomByIdOrCode(store: DuelStore, roomRef: string): DuelRoom | null {
  const trimmed = roomRef.trim();
  if (!trimmed) return null;
  const byId = store.rooms[trimmed];
  if (byId) return byId;

  const upper = trimmed.toUpperCase();
  for (const room of Object.values(store.rooms)) {
    if (room.code.toUpperCase() === upper) return room;
  }
  return null;
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
      room.endedAt = new Date().toISOString();
    }
    return;
  }

  const allCompleted = room.players.every((player) => Object.keys(player.answers).length >= room.rounds);
  if (elapsed >= room.durationSeconds || allCompleted) {
    room.status = 'finished';
    room.endedAt = new Date().toISOString();
  }
}

function roomWinnerPlayerId(room: DuelRoom): string | null {
  if (room.status !== 'finished' || room.players.length < 2) return null;
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  if (sorted[0].score === sorted[1].score) return null;
  return sorted[0].playerId;
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

function computeSeriesSnapshot(store: DuelStore, room: DuelRoom) {
  const seriesRooms = Object.values(store.rooms)
    .filter((candidate) => {
      ensureRoomSeries(candidate);
      return candidate.seriesId === room.seriesId;
    })
    .sort((a, b) => a.seriesMatchNumber - b.seriesMatchNumber);

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

function sanitizeRoomForClient(room: DuelRoom, viewerPlayerId: string, store: DuelStore) {
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
  const series = computeSeriesSnapshot(store, room);

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

function ensureRoomQuestions(room: DuelRoom) {
  if (room.mode === 'world-quiz' || room.mode === 'continent-quiz') return;
  if (Array.isArray(room.questions) && room.questions.length > 0) return;
  room.questions = createQuestionsFromPool(room.mode, room.rounds, room.pool ?? { kind: 'world' });
}

function ensureRoomPool(room: DuelRoom) {
  if (!room.pool || typeof room.pool !== 'object') {
    room.pool = { kind: 'world' };
  }
}

function ensureRoomPlayers(room: DuelRoom) {
  room.players = room.players.map((player) => ({
    ...player,
    answers: player.answers && typeof player.answers === 'object' ? player.answers : {},
    guessedCountries: Array.isArray(player.guessedCountries) ? player.guessedCountries : [],
  }));
}

function ensureRoomModeState(room: DuelRoom) {
  if (!Array.isArray(room.targetCountries)) {
    room.targetCountries = [];
  }
}

export async function createDuelRoom(input: {
  playerId: string;
  playerName: string;
  mode: DuelMode;
  seriesBestOf?: number;
  pool?: { kind?: string; continent?: string; allowedCountries?: string[] };
}) {
  return withWriteLock(async () => {
    const safePlayerId = input.playerId.trim().slice(0, 80);
    if (!safePlayerId) throw new Error('playerId is required');

    const store = await readStore();
    expireOldRooms(store);

    const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const seriesId = `series-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const rounds = 12;
    const durationSeconds = 180;
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
      rounds,
      durationSeconds,
      hostPlayerId: safePlayerId,
      status: 'waiting',
      players: [
        {
          playerId: safePlayerId,
          name: toSafeName(input.playerName),
          joinedAt: new Date().toISOString(),
          ready: false,
          score: 0,
          answers: {},
          guessedCountries: [],
        },
      ],
      questions: [],
      targetCountries: [],
      createdAt: new Date().toISOString(),
    };

    store.rooms[room.id] = room;
    await writeStore(store);

    return sanitizeRoomForClient(room, safePlayerId, store);
  });
}

export async function joinDuelRoom(input: { roomId: string; playerId: string; playerName: string }) {
  return withWriteLock(async () => {
    const safeRoomId = input.roomId.trim();
    const safePlayerId = input.playerId.trim().slice(0, 80);
    if (!safeRoomId || !safePlayerId) throw new Error('roomId and playerId are required');

    const store = await readStore();
    expireOldRooms(store);
    const room = findRoomByIdOrCode(store, safeRoomId);
    if (!room) throw new Error('Room not found');
    ensureRoomPool(room);
    ensureRoomSeries(room);
    ensureRoomPlayers(room);
    ensureRoomModeState(room);
    ensureRoomQuestions(room);
    maybeFinalizeRoom(room);

    const existing = room.players.find((p) => p.playerId === safePlayerId);
    if (!existing) {
      if (room.players.length >= 2) {
        throw new Error('Room is full');
      }
      room.players.push({
        playerId: safePlayerId,
        name: toSafeName(input.playerName),
        joinedAt: new Date().toISOString(),
        ready: false,
        score: 0,
        answers: {},
        guessedCountries: [],
      });
    } else {
      existing.name = toSafeName(input.playerName);
    }

    await writeStore(store);
    return sanitizeRoomForClient(room, safePlayerId, store);
  });
}

export async function getDuelRoomState(input: { roomId: string; viewerPlayerId: string }) {
  return withWriteLock(async () => {
    const safeRoomId = input.roomId.trim();
    const safeViewerPlayerId = input.viewerPlayerId.trim().slice(0, 80);
    if (!safeRoomId || !safeViewerPlayerId) throw new Error('roomId and viewerPlayerId are required');

    const store = await readStore();
    expireOldRooms(store);
    const room = findRoomByIdOrCode(store, safeRoomId);
    if (!room) throw new Error('Room not found');
    ensureRoomPool(room);
    ensureRoomSeries(room);
    ensureRoomPlayers(room);
    ensureRoomModeState(room);
    ensureRoomQuestions(room);

    maybeFinalizeRoom(room);
    await writeStore(store);
    return sanitizeRoomForClient(room, safeViewerPlayerId, store);
  });
}

export async function setDuelReady(input: { roomId: string; playerId: string; ready: boolean }) {
  return withWriteLock(async () => {
    const safeRoomId = input.roomId.trim();
    const safePlayerId = input.playerId.trim().slice(0, 80);
    if (!safeRoomId || !safePlayerId) throw new Error('roomId and playerId are required');

    const store = await readStore();
    expireOldRooms(store);
    const room = findRoomByIdOrCode(store, safeRoomId);
    if (!room) throw new Error('Room not found');
    ensureRoomPool(room);
    ensureRoomSeries(room);
    ensureRoomPlayers(room);
    ensureRoomModeState(room);
    ensureRoomQuestions(room);
    if (room.status !== 'waiting') throw new Error('Room already started');

    const player = room.players.find((p) => p.playerId === safePlayerId);
    if (!player) throw new Error('Player is not in this room');

    player.ready = Boolean(input.ready);

    await writeStore(store);
    return sanitizeRoomForClient(room, safePlayerId, store);
  });
}

export async function startDuelMatch(input: {
  roomId: string;
  hostPlayerId: string;
  mode: DuelMode;
  continent?: ContinentKey;
  allowedCountries?: string[];
}) {
  return withWriteLock(async () => {
    const safeRoomId = input.roomId.trim();
    const safeHostPlayerId = input.hostPlayerId.trim().slice(0, 80);
    if (!safeRoomId || !safeHostPlayerId) throw new Error('roomId and hostPlayerId are required');

    const store = await readStore();
    expireOldRooms(store);
    const room = findRoomByIdOrCode(store, safeRoomId);
    if (!room) throw new Error('Room not found');
    ensureRoomPool(room);
    ensureRoomSeries(room);
    ensureRoomPlayers(room);
    ensureRoomModeState(room);

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
      room.durationSeconds = continent === 'Oceania' ? 5 * 60 : continent === 'Americas' || continent === 'Europe' ? 7 * 60 : 8 * 60;
      room.targetCountries = filtered;
      room.focusRegion = continent;
      room.questions = [];
    } else {
      room.rounds = 12;
      room.durationSeconds = 180;
      room.questions = createQuestionsForMode(room.mode, room.rounds, room.pool);
    }
    room.startedAt = new Date().toISOString();
    room.status = 'active';
    room.players = room.players.map((player) => ({
      ...player,
      score: 0,
      answers: {},
      guessedCountries: [],
    }));

    await writeStore(store);
    return sanitizeRoomForClient(room, safeHostPlayerId, store);
  });
}

export async function submitDuelAnswer(input: {
  roomId: string;
  playerId: string;
  questionIndex?: number;
  answer: string;
}) {
  return withWriteLock(async () => {
    const safeRoomId = input.roomId.trim();
    const safePlayerId = input.playerId.trim().slice(0, 80);
    if (!safeRoomId || !safePlayerId) throw new Error('roomId and playerId are required');

    const store = await readStore();
    expireOldRooms(store);
    const room = findRoomByIdOrCode(store, safeRoomId);
    if (!room) throw new Error('Room not found');
    ensureRoomPool(room);
    ensureRoomSeries(room);
    ensureRoomPlayers(room);
    ensureRoomModeState(room);
    ensureRoomQuestions(room);
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
        submittedAt: new Date().toISOString(),
      };
      maybeFinalizeRoom(room);
      await writeStore(store);
      return {
        room: sanitizeRoomForClient(room, safePlayerId, store),
        result,
      };
    }

    const idx = Math.max(0, Math.min(room.rounds - 1, Math.floor(input.questionIndex ?? 0)));
    const key = String(idx);
    if (player.answers[key]) {
      return {
        room: sanitizeRoomForClient(room, safePlayerId, store),
        result: player.answers[key],
      };
    }

    const question = room.questions[idx];
    if (!question) throw new Error('Question not found');

    const cleanAnswer = input.answer.trim().slice(0, 80);
    const correct = normalizeText(cleanAnswer) === normalizeText(question.answer);
    if (correct) {
      player.score += 100;
    }

    const result: DuelAnswer = {
      answer: cleanAnswer,
      correct,
      submittedAt: new Date().toISOString(),
    };
    player.answers[key] = result;

    maybeFinalizeRoom(room);
    await writeStore(store);

    return {
      room: sanitizeRoomForClient(room, safePlayerId, store),
      result,
    };
  });
}

export async function createDuelRematch(input: { roomId: string; requesterPlayerId: string }) {
  return withWriteLock(async () => {
    const safeRoomId = input.roomId.trim();
    const safeRequester = input.requesterPlayerId.trim().slice(0, 80);
    if (!safeRoomId || !safeRequester) throw new Error('roomId and requesterPlayerId are required');

    const store = await readStore();
    expireOldRooms(store);
    const source = findRoomByIdOrCode(store, safeRoomId);
    if (!source) throw new Error('Room not found');
    ensureRoomPool(source);
    ensureRoomSeries(source);
    ensureRoomPlayers(source);
    ensureRoomModeState(source);
    ensureRoomQuestions(source);
    maybeFinalizeRoom(source);

    if (source.status !== 'finished') {
      throw new Error('Current match must be finished first');
    }

    const requesterInRoom = source.players.some((p) => p.playerId === safeRequester);
    if (!requesterInRoom) throw new Error('Only participants can create rematch');

    const snapshot = computeSeriesSnapshot(store, source);
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
        joinedAt: new Date().toISOString(),
        ready: false,
        score: 0,
        answers: {},
        guessedCountries: [],
      })),
      questions: [],
      targetCountries: [],
      focusRegion: undefined,
      createdAt: new Date().toISOString(),
    };

    store.rooms[room.id] = room;
    await writeStore(store);
    return sanitizeRoomForClient(room, safeRequester, store);
  });
}
