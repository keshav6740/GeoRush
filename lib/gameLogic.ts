export interface GameScore {
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  rank: number;
  gameMode: string;
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

export function calculateRank(score: number, totalPlayers: number = 10000): number {
  const boundedScore = Math.max(0, score);
  const percentile = 1 - Math.exp(-boundedScore / 250);
  const clampedPercentile = Math.max(0.01, Math.min(0.99, percentile));
  return Math.max(1, Math.round((1 - clampedPercentile) * totalPlayers));
}

export function getComparisonMessage(betterThanPercentage: number): string {
  if (betterThanPercentage >= 90) return 'You are on fire!';
  if (betterThanPercentage >= 75) return 'Excellent performance!';
  if (betterThanPercentage >= 50) return 'Nice work! Keep it up!';
  if (betterThanPercentage >= 25) return 'Good effort! Practice makes perfect!';
  return 'Keep practicing, you will improve!';
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  accuracy: number;
  gameMode: string;
}

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'GeoMaster', score: 89, accuracy: 95, gameMode: 'Speed Run' },
  { rank: 2, name: 'WorldWanderer', score: 82, accuracy: 92, gameMode: 'Speed Run' },
  { rank: 3, name: 'MapKing', score: 76, accuracy: 88, gameMode: 'Speed Run' },
  { rank: 4, name: 'CountryCollector', score: 71, accuracy: 85, gameMode: 'Speed Run' },
  { rank: 5, name: 'BorderFinder', score: 65, accuracy: 82, gameMode: 'Neighbour Chain' },
  { rank: 6, name: 'CapitalGeek', score: 58, accuracy: 79, gameMode: 'Country to Capital' },
  { rank: 7, name: 'ContinentKnower', score: 52, accuracy: 75, gameMode: 'Speed Run' },
  { rank: 8, name: 'AtlasExpert', score: 48, accuracy: 72, gameMode: 'Neighbour Chain' },
];

export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const rng = seededRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getDailySeed(date: Date = new Date()): number {
  const key = date.toISOString().slice(0, 10);
  return hashString(key);
}
