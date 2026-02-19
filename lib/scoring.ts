export type ModeKey =
  | 'speed-run'
  | 'neighbour-chain'
  | 'country-capital'
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

const MODE_LABEL_TO_KEY: Record<string, ModeKey> = {
  'Speed Run': 'speed-run',
  'Neighbour Chain': 'neighbour-chain',
  'Border Rush': 'neighbour-chain',
  'Travel Chain Daily': 'neighbour-chain',
  'Travel Chain Practice': 'neighbour-chain',
  'Country to Capital': 'country-capital',
  'Daily Challenge': 'daily-challenge',
  'Continent Quiz': 'continent-quiz',
  'World Quiz': 'world-quiz',
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
    case 'daily-challenge':
      base = input.correct * 30 + accuracy * 280 + speed * 160;
      break;
    case 'continent-quiz':
      base = input.correct * 22 + accuracy * 240 + speed * 140;
      break;
    case 'world-quiz':
      base = input.correct * 26 + accuracy * 320 + speed * 220;
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
