export type ModeKey =
  | 'speed-run'
  | 'neighbour-chain'
  | 'country-capital'
  | 'travel-chain'
  | 'flag-guess'
  | 'duel'
  | 'elimination'
  | 'impossible'
  | 'chaos'
  | 'zoom-reveal'
  | 'daily-boss'
  | 'daily-challenge'
  | 'continent-quiz'
  | 'world-quiz';

export interface ScoreComputationInput {
  modeKey: ModeKey;
  correct: number;
  total: number;
  durationSeconds?: number;
  timeRemainingSeconds?: number;
  timeSpentSeconds?: number;
}

export interface XpComputationInput extends ScoreComputationInput {
  previousBestScore?: number;
  currentStreak?: number;
  wonDuel?: boolean;
}

const MODE_LABEL_TO_KEY: Record<string, ModeKey> = {
  'Speed Run': 'speed-run',
  'Neighbour Chain': 'neighbour-chain',
  'Border Rush': 'neighbour-chain',
  'Travel Chain Daily': 'travel-chain',
  'Travel Chain Practice': 'travel-chain',
  'Travel Chain': 'travel-chain',
  'Country to Capital': 'country-capital',
  'Capital to Country': 'country-capital',
  'Daily Challenge': 'daily-challenge',
  'Continent Quiz': 'continent-quiz',
  'World Quiz': 'world-quiz',
  'Flag Guess': 'flag-guess',
  '1v1 Duel': 'duel',
  'Elimination Mode': 'elimination',
  'Chaos Mode': 'chaos',
  'Zoom Reveal Mode': 'zoom-reveal',
  'Daily Boss': 'daily-boss',
};

const STREAK_MAX_BONUS = 0.35;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safePercent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return clamp(part / whole, 0, 1);
}

export function streakMultiplier(streakCount: number) {
  const bonus = clamp(streakCount, 0, 35) * 0.01;
  return 1 + Math.min(STREAK_MAX_BONUS, bonus);
}

function speedFactor(input: ScoreComputationInput) {
  if (typeof input.timeSpentSeconds === 'number' && input.timeSpentSeconds > 0) {
    const expected = Math.max(1, input.durationSeconds ?? input.timeSpentSeconds);
    return clamp((expected - input.timeSpentSeconds) / expected, 0, 1);
  }
  if (typeof input.timeRemainingSeconds === 'number' && typeof input.durationSeconds === 'number') {
    return clamp(input.timeRemainingSeconds / Math.max(1, input.durationSeconds), 0, 1);
  }
  return 0;
}

export function toModeKey(gameMode: string): ModeKey {
  const direct = MODE_LABEL_TO_KEY[gameMode];
  if (direct) return direct;
  if (gameMode.includes('Impossible')) return 'impossible';
  if (gameMode.endsWith(' Quiz')) return 'continent-quiz';
  return 'speed-run';
}

export function calculateRawModeScore(input: ScoreComputationInput): number {
  const accuracy = safePercent(input.correct, input.total);
  const speed = speedFactor(input);

  let base = 0;
  switch (input.modeKey) {
    case 'speed-run':
      base = input.correct * 18 + accuracy * 220 + speed * 120;
      break;
    case 'neighbour-chain':
      base = input.correct * 34 + accuracy * 300 + speed * 80;
      break;
    case 'country-capital':
      base = input.correct * 28 + accuracy * 260 + speed * 140;
      break;
    case 'travel-chain':
      base = input.correct * 26 + accuracy * 260 + speed * 120;
      break;
    case 'flag-guess':
      base = input.correct * 24 + accuracy * 250 + speed * 130;
      break;
    case 'duel':
      base = input.correct * 36 + accuracy * 300 + speed * 100;
      break;
    case 'daily-challenge':
      base = input.correct * 30 + accuracy * 280 + speed * 160;
      break;
    case 'continent-quiz':
      base = input.correct * 22 + accuracy * 240 + speed * 140;
      break;
    case 'world-quiz':
      base = input.correct * 26 + accuracy * 320 + speed * 220;
      break;
    case 'elimination':
      base = input.correct * 40 + accuracy * 180;
      break;
    case 'chaos':
      base = input.correct * 20 + accuracy * 220 + speed * 150;
      break;
    case 'zoom-reveal':
      base = input.correct * 28 + accuracy * 240 + speed * 140;
      break;
    case 'daily-boss':
      base = input.correct * 34 + accuracy * 300 + speed * 180;
      break;
    case 'impossible':
      base = input.correct * 32 + accuracy * 290 + speed * 160;
      break;
    default:
      base = input.correct * 20 + accuracy * 220 + speed * 100;
      break;
  }

  return Math.max(0, Math.round(base));
}

export function calculateStreakBonus(rawScore: number, streakCount: number): number {
  const boosted = Math.round(rawScore * streakMultiplier(streakCount));
  return Math.max(0, boosted - rawScore);
}

export function calculateModeXp(input: XpComputationInput): number {
  const accuracyPercent = input.total > 0 ? (input.correct / input.total) * 100 : 0;
  let xp = 0;

  switch (input.modeKey) {
    case 'speed-run':
      xp += input.correct * 2;
      if (input.correct >= 5) xp += 10;
      if (accuracyPercent > 90) xp += 25;
      if ((input.previousBestScore ?? -1) < input.correct) xp += 50;
      break;
    case 'neighbour-chain':
      xp += input.correct * 8;
      if (input.correct >= input.total && input.total > 0) xp += 30;
      if ((input.timeRemainingSeconds ?? 0) > 0) xp += 15;
      break;
    case 'country-capital':
      xp += input.correct * 5;
      if ((input.timeSpentSeconds ?? 9999) / Math.max(1, input.total) < 2) xp += 10;
      if (input.correct >= input.total && input.total > 0) xp += 20;
      break;
    case 'travel-chain':
      if (input.correct > 0) xp += 20;
      xp += Math.max(0, input.correct);
      if ((input.timeRemainingSeconds ?? 0) > 0) xp += 15;
      break;
    case 'duel':
      xp += 10;
      xp += input.wonDuel ? 50 : 20;
      if (input.wonDuel && accuracyPercent >= 60) xp += 25;
      break;
    case 'daily-challenge':
      xp += 40;
      xp += input.correct * 2;
      break;
    default:
      xp += Math.max(5, input.correct * 3);
      break;
  }

  const streak = input.currentStreak ?? 0;
  if (streak === 3) xp += 25;
  if (streak === 7) xp += 75;
  if (streak === 30) xp += 300;

  return Math.max(0, Math.round(xp));
}

