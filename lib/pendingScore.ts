export interface PendingScorePayload {
  gameMode: string;
  score: number;
  correct: number;
  total: number;
  durationSeconds?: number;
  timeRemainingSeconds?: number;
  timeSpentSeconds?: number;
  countriesGuessed?: string[];
}

const PENDING_SCORE_KEY = 'georush_pending_score';

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return undefined;
  return value;
}

function sanitizePayload(payload: PendingScorePayload): PendingScorePayload {
  const safe: PendingScorePayload = {
    gameMode: String(payload.gameMode ?? '').trim().slice(0, 80),
    score: Math.max(0, Math.floor(Number(payload.score) || 0)),
    correct: Math.max(0, Math.floor(Number(payload.correct) || 0)),
    total: Math.max(1, Math.floor(Number(payload.total) || 1)),
  };

  const durationSeconds = toFiniteNumber(payload.durationSeconds);
  const timeRemainingSeconds = toFiniteNumber(payload.timeRemainingSeconds);
  const timeSpentSeconds = toFiniteNumber(payload.timeSpentSeconds);
  if (durationSeconds !== undefined) safe.durationSeconds = durationSeconds;
  if (timeRemainingSeconds !== undefined) safe.timeRemainingSeconds = timeRemainingSeconds;
  if (timeSpentSeconds !== undefined) safe.timeSpentSeconds = timeSpentSeconds;
  if (Array.isArray(payload.countriesGuessed)) {
    safe.countriesGuessed = payload.countriesGuessed.filter((entry): entry is string => typeof entry === 'string').slice(0, 300);
  }
  return safe;
}

export function savePendingScore(payload: PendingScorePayload) {
  if (typeof window === 'undefined') return;
  const safe = sanitizePayload(payload);
  if (!safe.gameMode) return;
  window.localStorage.setItem(PENDING_SCORE_KEY, JSON.stringify(safe));
}

export function loadPendingScore(): PendingScorePayload | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PENDING_SCORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingScorePayload;
    const safe = sanitizePayload(parsed);
    if (!safe.gameMode) return null;
    return safe;
  } catch {
    return null;
  }
}

export function clearPendingScore() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PENDING_SCORE_KEY);
}
