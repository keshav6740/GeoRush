import { promises as fs } from 'fs';
import path from 'path';
import { calculateRawModeScore, calculateStreakBonus, type ModeKey, toModeKey } from '@/lib/scoring';

export interface ScoreInput {
  playerId: string;
  playerName: string;
  gameMode: string;
  modeKey?: ModeKey;
  correct: number;
  total: number;
  durationSeconds?: number;
  timeRemainingSeconds?: number;
  timeSpentSeconds?: number;
  countriesGuessed?: string[];
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  avatarUrl?: string;
  score: number;
  accuracy: number;
  gameMode: string;
  modeKey: ModeKey;
  playedAt: string;
}

export interface CountryLeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  countryScore: number;
}

interface StoredRun {
  id: string;
  playerId: string;
  playerName: string;
  gameMode: string;
  modeKey: ModeKey;
  score: number;
  bonusScore: number;
  finalScore: number;
  correct: number;
  total: number;
  accuracy: number;
  durationSeconds?: number;
  timeRemainingSeconds?: number;
  timeSpentSeconds?: number;
  countriesGuessed: string[];
  playedAt: string;
}

interface LinkedGoogle {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  linkedAt: string;
}

interface StoredPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  gamesPlayed: number;
  bestScore: number;
  lastPlayedAt: string;
  lifetimeScore: number;
  worldQuizScore: number;
  modeScores: Record<string, number>;
  countryScores: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  activityHeatmap: Record<string, number>;
  badges: string[];
  authProvider: 'guest' | 'google';
  linkedGoogle?: LinkedGoogle;
}

interface LeaderboardStore {
  runs: StoredRun[];
  players: Record<string, StoredPlayer>;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  authProvider: 'guest' | 'google';
  linkedGoogle?: LinkedGoogle;
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
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAX_RUNS = 20000;
const MAX_HEATMAP_DAYS = 366;

const EMPTY_STORE: LeaderboardStore = {
  runs: [],
  players: {},
};

const SCORE_BADGES: Array<{ id: string; minLifetime: number }> = [
  { id: 'score_rookie_1k', minLifetime: 1000 },
  { id: 'score_grinder_5k', minLifetime: 5000 },
  { id: 'score_legend_20k', minLifetime: 20000 },
];

let writeQueue = Promise.resolve();

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeAvatarUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/uploads\/avatars\/[a-zA-Z0-9._-]+$/.test(trimmed)) return trimmed;
  return undefined;
}

function sanitizeOptionalNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return clampNumber(Math.round(value), min, max);
}

function normalizeCountryKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 60);
}

function dedupeCountries(values: string[] | undefined) {
  if (!Array.isArray(values)) return [];
  const out = new Set<string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const key = normalizeCountryKey(value);
    if (key) out.add(key);
  }
  return [...out];
}

function cleanHeatmap(input: Record<string, number>) {
  const keys = Object.keys(input).sort();
  const kept = keys.slice(Math.max(0, keys.length - MAX_HEATMAP_DAYS));
  const next: Record<string, number> = {};
  for (const key of kept) {
    next[key] = clampNumber(Math.round(input[key]), 0, 1000000);
  }
  return next;
}

function daysBetweenIso(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00.000Z`).getTime();
  const rightDate = new Date(`${right}T00:00:00.000Z`).getTime();
  return Math.round((rightDate - leftDate) / 86400000);
}

function mergeBadges(existing: string[], next: string[]) {
  return [...new Set([...existing, ...next])].sort();
}

function computeBadges(player: StoredPlayer): string[] {
  const badges: string[] = [];

  if (player.currentStreak >= 7) badges.push('streak_7');
  if (player.currentStreak >= 30) badges.push('streak_30');
  if (player.longestStreak >= 100) badges.push('streak_100');
  if (player.worldQuizScore >= 1000) badges.push('world_quiz_1000');
  if ((player.modeScores['speed-run'] ?? 0) >= 2500) badges.push('speed_runner_2500');

  for (const cfg of SCORE_BADGES) {
    if (player.lifetimeScore >= cfg.minLifetime) {
      badges.push(cfg.id);
    }
  }

  for (const [countryKey, score] of Object.entries(player.countryScores)) {
    if (score >= 500) {
      badges.push(`country_master_${countryKey}`);
    }
  }

  if (player.authProvider === 'google') {
    badges.push('account_linked_google');
  }

  return mergeBadges(player.badges, badges);
}

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_STORE, null, 2), 'utf-8');
  }
}

function toSafePlayer(id: string, name: string, existing?: Partial<StoredPlayer>): StoredPlayer {
  return {
    id,
    name,
    avatarUrl: sanitizeAvatarUrl(existing?.avatarUrl),
    gamesPlayed: clampNumber(Math.round(existing?.gamesPlayed ?? 0), 0, 1000000),
    bestScore: clampNumber(Math.round(existing?.bestScore ?? 0), 0, 10000000),
    lastPlayedAt: typeof existing?.lastPlayedAt === 'string' ? existing.lastPlayedAt : new Date(0).toISOString(),
    lifetimeScore: clampNumber(Math.round(existing?.lifetimeScore ?? 0), 0, 100000000),
    worldQuizScore: clampNumber(Math.round(existing?.worldQuizScore ?? 0), 0, 100000000),
    modeScores:
      existing?.modeScores && typeof existing.modeScores === 'object'
        ? Object.fromEntries(
            Object.entries(existing.modeScores).map(([key, value]) => [key, clampNumber(Math.round(Number(value)), 0, 100000000)])
          )
        : {},
    countryScores:
      existing?.countryScores && typeof existing.countryScores === 'object'
        ? Object.fromEntries(
            Object.entries(existing.countryScores).map(([key, value]) => [key, clampNumber(Math.round(Number(value)), 0, 100000000)])
          )
        : {},
    currentStreak: clampNumber(Math.round(existing?.currentStreak ?? 0), 0, 100000),
    longestStreak: clampNumber(Math.round(existing?.longestStreak ?? 0), 0, 100000),
    lastActiveDate:
      typeof existing?.lastActiveDate === 'string' && existing.lastActiveDate.trim()
        ? existing.lastActiveDate
        : null,
    activityHeatmap:
      existing?.activityHeatmap && typeof existing.activityHeatmap === 'object'
        ? cleanHeatmap(existing.activityHeatmap)
        : {},
    badges: Array.isArray(existing?.badges) ? [...new Set(existing.badges.filter((b): b is string => typeof b === 'string'))] : [],
    authProvider: existing?.authProvider === 'google' ? 'google' : 'guest',
    linkedGoogle:
      existing?.linkedGoogle &&
      typeof existing.linkedGoogle.sub === 'string' &&
      typeof existing.linkedGoogle.email === 'string' &&
      typeof existing.linkedGoogle.name === 'string'
        ? {
            sub: existing.linkedGoogle.sub,
            email: existing.linkedGoogle.email,
            name: existing.linkedGoogle.name,
            picture: typeof existing.linkedGoogle.picture === 'string' ? existing.linkedGoogle.picture : undefined,
            linkedAt: typeof existing.linkedGoogle.linkedAt === 'string' ? existing.linkedGoogle.linkedAt : new Date().toISOString(),
          }
        : undefined,
  };
}

function normalizeStore(raw: unknown): LeaderboardStore {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_STORE };
  }

  const payload = raw as Partial<LeaderboardStore>;
  const runsArray = Array.isArray(payload.runs) ? payload.runs : [];
  const playersMap = payload.players && typeof payload.players === 'object' ? payload.players : {};

  const runs: StoredRun[] = runsArray
    .filter((run) => run && typeof run === 'object')
    .map((run) => {
      const r = run as Partial<StoredRun> & { modeKey?: ModeKey };
      const gameMode = typeof r.gameMode === 'string' ? r.gameMode : 'Unknown';
      const modeKey = r.modeKey ?? toModeKey(gameMode);
      return {
        id: typeof r.id === 'string' ? r.id : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        playerId: typeof r.playerId === 'string' ? r.playerId : 'unknown-player',
        playerName: typeof r.playerName === 'string' ? r.playerName : 'Player',
        gameMode,
        modeKey,
        score: clampNumber(Math.round(Number(r.score ?? 0)), 0, 1000000),
        bonusScore: clampNumber(Math.round(Number((r as { bonusScore?: number }).bonusScore ?? 0)), 0, 1000000),
        finalScore: clampNumber(
          Math.round(
            Number(
              (r as { finalScore?: number }).finalScore ??
                Number(r.score ?? 0) + Number((r as { bonusScore?: number }).bonusScore ?? 0)
            )
          ),
          0,
          1000000
        ),
        correct: clampNumber(Math.round(Number(r.correct ?? 0)), 0, 1000000),
        total: clampNumber(Math.round(Number(r.total ?? 0)), 0, 1000000),
        accuracy: clampNumber(Math.round(Number(r.accuracy ?? 0)), 0, 100),
        durationSeconds:
          sanitizeOptionalNumber(r.durationSeconds, 1, 86400),
        timeRemainingSeconds:
          sanitizeOptionalNumber(r.timeRemainingSeconds, 0, 86400),
        timeSpentSeconds:
          sanitizeOptionalNumber(r.timeSpentSeconds, 0, 86400),
        countriesGuessed: dedupeCountries(r.countriesGuessed),
        playedAt: typeof r.playedAt === 'string' ? r.playedAt : new Date().toISOString(),
      };
    });

  const players: Record<string, StoredPlayer> = {};
  for (const [id, value] of Object.entries(playersMap)) {
    if (!value || typeof value !== 'object') continue;
    const typed = value as Partial<StoredPlayer>;
    players[id] = toSafePlayer(id, typeof typed.name === 'string' ? typed.name : 'Player', typed);
  }

  return {
    runs,
    players,
  };
}

async function readStore(): Promise<LeaderboardStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStore(parsed);
  } catch {
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store: LeaderboardStore) {
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf-8');
  await fs.rename(tempFile, DATA_FILE);
}

function withWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

function accuracyFrom(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

function sanitizeInput(input: ScoreInput): ScoreInput {
  const safePlayerId = input.playerId.trim().slice(0, 80);
  const safeName = input.playerName.trim().slice(0, 40) || 'Player';
  const safeMode = input.gameMode.trim().slice(0, 60) || 'Unknown';
  const safeModeKey = input.modeKey ?? toModeKey(safeMode);
  const safeCorrect = clampNumber(Math.round(input.correct), 0, 1000000);
  const safeTotal = clampNumber(Math.round(input.total), 0, 1000000);

  return {
    playerId: safePlayerId,
    playerName: safeName,
    gameMode: safeMode,
    modeKey: safeModeKey,
    correct: safeCorrect,
    total: safeTotal,
    durationSeconds:
      sanitizeOptionalNumber(input.durationSeconds, 1, 86400),
    timeRemainingSeconds:
      sanitizeOptionalNumber(input.timeRemainingSeconds, 0, 86400),
    timeSpentSeconds:
      sanitizeOptionalNumber(input.timeSpentSeconds, 0, 86400),
    countriesGuessed: dedupeCountries(input.countriesGuessed),
  };
}

function buildLeaderboard(
  runs: StoredRun[],
  playersById: Record<string, StoredPlayer>,
  mode?: string,
  limit: number = 100
): LeaderboardEntry[] {
  const modeKey = mode ? toModeKey(mode) : undefined;
  const filtered = modeKey ? runs.filter((run) => run.modeKey === modeKey) : runs;
  const bestByPlayer = new Map<string, StoredRun>();

  for (const run of filtered) {
    const existing = bestByPlayer.get(run.playerId);
    if (!existing) {
      bestByPlayer.set(run.playerId, run);
      continue;
    }
    const isBetter =
      run.score > existing.score ||
      (run.score === existing.score && run.accuracy > existing.accuracy) ||
      (run.score === existing.score && run.accuracy === existing.accuracy && run.playedAt > existing.playedAt);
    if (isBetter) {
      bestByPlayer.set(run.playerId, run);
    }
  }

  const sorted = [...bestByPlayer.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return a.playedAt.localeCompare(b.playedAt);
  });

  return sorted.slice(0, limit).map((run, idx) => {
    const currentProfile = playersById[run.playerId];
    const liveName = currentProfile?.name?.trim() || run.playerName;
    return {
      rank: idx + 1,
      playerId: run.playerId,
      name: liveName,
      avatarUrl: currentProfile?.avatarUrl,
      score: run.score,
      accuracy: run.accuracy,
      gameMode: run.gameMode,
      modeKey: run.modeKey,
      playedAt: run.playedAt,
    };
  });
}

function computeMeta(entries: LeaderboardEntry[], playerId?: string) {
  const players = entries.length;
  const topScore = players > 0 ? entries[0].score : 0;
  let userRank: number | null = null;
  let betterThan = 0;

  if (playerId) {
    const idx = entries.findIndex((entry) => entry.playerId === playerId);
    if (idx >= 0) {
      userRank = idx + 1;
      betterThan = players > 0 ? Math.round(((players - userRank) / players) * 100) : 0;
    }
  }

  return {
    players,
    topScore,
    userRank,
    betterThan,
  };
}

function applyStreak(player: StoredPlayer, dateKey: string) {
  if (!player.lastActiveDate) {
    player.currentStreak = 1;
    player.longestStreak = Math.max(player.longestStreak, player.currentStreak);
    player.lastActiveDate = dateKey;
    return;
  }

  const gap = daysBetweenIso(player.lastActiveDate, dateKey);
  if (gap <= 0) {
    player.lastActiveDate = dateKey;
    return;
  }
  if (gap === 1) {
    player.currentStreak += 1;
  } else {
    player.currentStreak = 1;
  }
  player.longestStreak = Math.max(player.longestStreak, player.currentStreak);
  player.lastActiveDate = dateKey;
}

function toProfile(player: StoredPlayer): PlayerProfile {
  return {
    id: player.id,
    name: player.name,
    avatarUrl: player.avatarUrl,
    authProvider: player.authProvider,
    linkedGoogle: player.linkedGoogle,
    gamesPlayed: player.gamesPlayed,
    bestScore: player.bestScore,
    lifetimeScore: player.lifetimeScore,
    worldQuizScore: player.worldQuizScore,
    modeScores: player.modeScores,
    countryScores: player.countryScores,
    currentStreak: player.currentStreak,
    longestStreak: player.longestStreak,
    lastActiveDate: player.lastActiveDate,
    activityHeatmap: player.activityHeatmap,
    badges: player.badges,
  };
}

export async function submitScore(input: ScoreInput) {
  return withWriteLock(async () => {
    const safe = sanitizeInput(input);
    if (!safe.playerId) {
      throw new Error('playerId is required');
    }

    const store = await readStore();
    const now = new Date();
    const nowIso = now.toISOString();
    const dateKey = nowIso.slice(0, 10);

    const previousPlayer = store.players[safe.playerId];
    const player = toSafePlayer(safe.playerId, safe.playerName, previousPlayer);
    player.name = safe.playerName;

    applyStreak(player, dateKey);

    const rawScore = calculateRawModeScore({
      modeKey: safe.modeKey ?? toModeKey(safe.gameMode),
      correct: safe.correct,
      total: safe.total,
      durationSeconds: safe.durationSeconds,
      timeRemainingSeconds: safe.timeRemainingSeconds,
      timeSpentSeconds: safe.timeSpentSeconds,
    });
    const streakBonus = calculateStreakBonus(rawScore, player.currentStreak);
    const finalScore = rawScore + streakBonus;

    const run: StoredRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      playerId: safe.playerId,
      playerName: safe.playerName,
      gameMode: safe.gameMode,
      modeKey: safe.modeKey ?? toModeKey(safe.gameMode),
      score: rawScore,
      bonusScore: streakBonus,
      finalScore,
      correct: safe.correct,
      total: safe.total,
      accuracy: accuracyFrom(safe.correct, safe.total),
      durationSeconds: safe.durationSeconds,
      timeRemainingSeconds: safe.timeRemainingSeconds,
      timeSpentSeconds: safe.timeSpentSeconds,
      countriesGuessed: safe.countriesGuessed ?? [],
      playedAt: nowIso,
    };

    store.runs.push(run);
    if (store.runs.length > MAX_RUNS) {
      store.runs = store.runs.slice(store.runs.length - MAX_RUNS);
    }

    player.gamesPlayed += 1;
    player.bestScore = Math.max(player.bestScore, rawScore);
    player.lastPlayedAt = nowIso;
    player.lifetimeScore += finalScore;

    const modeKey = run.modeKey;
    player.modeScores[modeKey] = (player.modeScores[modeKey] ?? 0) + finalScore;

    if (modeKey === 'world-quiz') {
      player.worldQuizScore += finalScore;
    }

    const countries = run.countriesGuessed;
    const countrySlice = countries.length > 0 ? Math.max(1, Math.round(finalScore / countries.length)) : 0;
    for (const country of countries) {
      player.countryScores[country] = (player.countryScores[country] ?? 0) + countrySlice;
    }

    player.activityHeatmap = cleanHeatmap({
      ...player.activityHeatmap,
      [dateKey]: (player.activityHeatmap[dateKey] ?? 0) + 1,
    });

    player.badges = computeBadges(player);

    store.players[safe.playerId] = player;

    await writeStore(store);

    const modeEntries = buildLeaderboard(store.runs, store.players, safe.gameMode, 10000);
    const meta = computeMeta(modeEntries, safe.playerId);

    return {
      run,
      rawScore,
      streakBonus,
      finalScore,
      rank: meta.userRank,
      betterThan: meta.betterThan,
      players: meta.players,
      profile: toProfile(player),
    };
  });
}

export async function getLeaderboard(options?: { mode?: string; limit?: number; playerId?: string }) {
  const mode = options?.mode;
  const limit = clampNumber(options?.limit ?? 100, 1, 500);
  const playerId = options?.playerId;

  const store = await readStore();
  const entries = buildLeaderboard(store.runs, store.players, mode, limit);
  const meta = computeMeta(buildLeaderboard(store.runs, store.players, mode, 10000), playerId);

  return {
    entries,
    stats: meta,
  };
}

export async function getCountryLeaderboard(options: { country: string; limit?: number; playerId?: string }) {
  const safeCountry = normalizeCountryKey(options.country);
  const limit = clampNumber(options.limit ?? 100, 1, 500);

  if (!safeCountry) {
    return {
      entries: [] as CountryLeaderboardEntry[],
      stats: {
        players: 0,
        topScore: 0,
        userRank: null as number | null,
        betterThan: 0,
      },
    };
  }

  const store = await readStore();
  const scoredPlayers = Object.values(store.players)
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      countryScore: player.countryScores[safeCountry] ?? 0,
    }))
    .filter((entry) => entry.countryScore > 0)
    .sort((a, b) => b.countryScore - a.countryScore);

  const entries: CountryLeaderboardEntry[] = scoredPlayers.slice(0, limit).map((entry, idx) => ({
    rank: idx + 1,
    playerId: entry.playerId,
    name: entry.name,
    countryScore: entry.countryScore,
  }));

  const userIndex = options.playerId
    ? scoredPlayers.findIndex((entry) => entry.playerId === options.playerId)
    : -1;
  const userRank = userIndex >= 0 ? userIndex + 1 : null;
  const players = scoredPlayers.length;
  const topScore = players > 0 ? scoredPlayers[0].countryScore : 0;
  const betterThan =
    userRank && players > 0 ? Math.round(((players - userRank) / players) * 100) : 0;

  return {
    entries,
    stats: {
      players,
      topScore,
      userRank,
      betterThan,
    },
  };
}

export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  if (!playerId.trim()) return null;
  const store = await readStore();
  const player = store.players[playerId];
  if (!player) return null;
  return toProfile(player);
}

export async function upsertPlayerBaseProfile(playerId: string, playerName: string): Promise<PlayerProfile> {
  return withWriteLock(async () => {
    const safeId = playerId.trim().slice(0, 80);
    const safeName = playerName.trim().slice(0, 40) || 'Player';
    if (!safeId) throw new Error('playerId is required');

    const store = await readStore();
    const player = toSafePlayer(safeId, safeName, store.players[safeId]);
    player.name = safeName;
    store.players[safeId] = player;

    await writeStore(store);
    return toProfile(player);
  });
}

export async function linkGoogleProfile(
  playerId: string,
  google: { sub: string; email: string; name: string; picture?: string }
): Promise<PlayerProfile> {
  return withWriteLock(async () => {
    const safeId = playerId.trim().slice(0, 80);
    if (!safeId) throw new Error('playerId is required');

    const store = await readStore();
    const existing = store.players[safeId];

    let canonicalId = safeId;
    for (const [id, candidate] of Object.entries(store.players)) {
      if (candidate.linkedGoogle?.sub === google.sub) {
        canonicalId = id;
        break;
      }
    }

    const canonicalExisting = store.players[canonicalId];
    const player = toSafePlayer(
      canonicalId,
      canonicalExisting?.name ?? existing?.name ?? google.name,
      canonicalExisting ?? existing
    );

    player.authProvider = 'google';
    player.name = google.name.slice(0, 40) || player.name;
    if (!player.avatarUrl) {
      player.avatarUrl = sanitizeAvatarUrl(google.picture) ?? player.avatarUrl;
    }
    player.linkedGoogle = {
      sub: google.sub,
      email: google.email,
      name: google.name,
      picture: google.picture,
      linkedAt: new Date().toISOString(),
    };
    player.badges = computeBadges(player);

    store.players[canonicalId] = player;
    await writeStore(store);

    return toProfile(player);
  });
}

export async function updatePlayerProfile(
  playerId: string,
  updates: { name?: string; avatarUrl?: string | null }
): Promise<PlayerProfile> {
  return withWriteLock(async () => {
    const safeId = playerId.trim().slice(0, 80);
    if (!safeId) throw new Error('playerId is required');

    const store = await readStore();
    const existing = store.players[safeId];
    const player = toSafePlayer(safeId, existing?.name ?? 'Player', existing);

    if (typeof updates.name === 'string') {
      const nextName = updates.name.trim().slice(0, 40);
      if (nextName) {
        player.name = nextName;
      }
    }

    if (updates.avatarUrl === null) {
      player.avatarUrl = undefined;
    } else if (typeof updates.avatarUrl === 'string') {
      const nextAvatar = sanitizeAvatarUrl(updates.avatarUrl);
      player.avatarUrl = nextAvatar;
    }

    store.players[safeId] = player;
    await writeStore(store);

    return toProfile(player);
  });
}
