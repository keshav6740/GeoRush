import { COUNTRIES, normalizeText } from '@/lib/countries';
import { getDailySeed, seededRandom } from '@/lib/gameLogic';

export interface TravelChallenge {
  start: string;
  end: string;
  minSteps: number;
  dateKey?: string;
}

type Graph = Map<string, string[]>;

const MIN_DAILY_DISTANCE = 7;
const MIN_PRACTICE_DISTANCE = 5;
const MAX_PICK_ATTEMPTS = 2000;

let graphCache: Graph | null = null;
let coreCountriesCache: string[] | null = null;
let distanceCache: Map<string, number> | null = null;

function keyForPair(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function getGraph(): Graph {
  if (graphCache) return graphCache;

  const byName = new Set(COUNTRIES.map((country) => country.name));
  const graph = new Map<string, string[]>();

  for (const country of COUNTRIES) {
    if (!byName.has(country.name)) continue;
    const neighbors = country.neighbors.filter((neighbor) => byName.has(neighbor));
    graph.set(country.name, Array.from(new Set(neighbors)));
  }

  // Ensure undirected links.
  for (const [country, neighbors] of graph.entries()) {
    for (const neighbor of neighbors) {
      const neighborList = graph.get(neighbor) ?? [];
      if (!neighborList.includes(country)) {
        graph.set(neighbor, [...neighborList, country]);
      }
    }
  }

  graphCache = graph;
  return graph;
}

function bfsDistances(start: string, graph: Graph): Map<string, number> {
  const distances = new Map<string, number>();
  const queue: string[] = [start];
  distances.set(start, 0);

  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    const currentDistance = distances.get(current) ?? 0;
    const neighbors = graph.get(current) ?? [];
    for (const next of neighbors) {
      if (distances.has(next)) continue;
      distances.set(next, currentDistance + 1);
      queue.push(next);
    }
  }

  return distances;
}

function getCoreCountries(): string[] {
  if (coreCountriesCache) return coreCountriesCache;

  const graph = getGraph();
  const visited = new Set<string>();
  let bestComponent: string[] = [];

  for (const country of graph.keys()) {
    if (visited.has(country)) continue;
    const component: string[] = [];
    const queue = [country];
    visited.add(country);

    for (let i = 0; i < queue.length; i += 1) {
      const current = queue[i];
      component.push(current);
      const neighbors = graph.get(current) ?? [];
      for (const next of neighbors) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    if (component.length > bestComponent.length) {
      bestComponent = component;
    }
  }

  coreCountriesCache = bestComponent.filter((country) => (graph.get(country)?.length ?? 0) > 0);
  return coreCountriesCache;
}

function getDistanceMap(): Map<string, number> {
  if (distanceCache) return distanceCache;

  const graph = getGraph();
  const core = getCoreCountries();
  const distanceMap = new Map<string, number>();

  for (const start of core) {
    const distances = bfsDistances(start, graph);
    for (const end of core) {
      if (start === end) continue;
      const distance = distances.get(end);
      if (typeof distance === 'number') {
        distanceMap.set(keyForPair(start, end), distance);
      }
    }
  }

  distanceCache = distanceMap;
  return distanceMap;
}

export function resolveCountryName(input: string): string | null {
  const normalized = normalizeText(input);
  if (!normalized) return null;
  for (const country of COUNTRIES) {
    if (normalizeText(country.name) === normalized) return country.name;
  }
  return null;
}

export function areNeighborCountries(from: string, to: string): boolean {
  const graph = getGraph();
  return (graph.get(from) ?? []).includes(to);
}

export function getPathWithinCountries(start: string, end: string, allowedCountries: string[]): string[] | null {
  if (start === end) return [start];
  const allowed = new Set(allowedCountries);
  if (!allowed.has(start) || !allowed.has(end)) return null;

  const graph = getGraph();
  const queue: string[] = [start];
  const prev = new Map<string, string | null>();
  prev.set(start, null);

  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    const neighbors = graph.get(current) ?? [];
    for (const next of neighbors) {
      if (!allowed.has(next) || prev.has(next)) continue;
      prev.set(next, current);
      if (next === end) {
        const path: string[] = [end];
        let cur: string | null = end;
        while (cur) {
          const parent = prev.get(cur) ?? null;
          if (parent) path.push(parent);
          cur = parent;
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }

  return null;
}

export function getShortestPath(start: string, end: string): string[] | null {
  if (start === end) return [start];
  const graph = getGraph();
  const queue: string[] = [start];
  const prev = new Map<string, string | null>();
  prev.set(start, null);

  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    const neighbors = graph.get(current) ?? [];
    for (const next of neighbors) {
      if (prev.has(next)) continue;
      prev.set(next, current);
      if (next === end) {
        const path: string[] = [end];
        let cur: string | null = end;
        while (cur) {
          const parent = prev.get(cur) ?? null;
          if (parent) path.push(parent);
          cur = parent;
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }

  return null;
}

function pickChallenge(random: () => number, minDistance: number): TravelChallenge {
  const core = getCoreCountries();
  const distances = getDistanceMap();
  if (core.length < 2) {
    throw new Error('Not enough connected countries for travel challenge');
  }

  let fallback: TravelChallenge | null = null;
  for (let i = 0; i < MAX_PICK_ATTEMPTS; i += 1) {
    const start = core[Math.floor(random() * core.length)];
    const end = core[Math.floor(random() * core.length)];
    if (!start || !end || start === end) continue;

    const steps = distances.get(keyForPair(start, end));
    if (!steps || steps <= 0) continue;
    if (!fallback || steps > fallback.minSteps) {
      fallback = { start, end, minSteps: steps };
    }
    if (steps >= minDistance) {
      return { start, end, minSteps: steps };
    }
  }

  if (fallback) return fallback;
  throw new Error('Unable to pick travel challenge');
}

export function getRandomTravelChallenge(): TravelChallenge {
  return pickChallenge(Math.random, MIN_PRACTICE_DISTANCE);
}

export function getDailyTravelChallenge(date: Date = new Date()): TravelChallenge {
  const dateKey = date.toISOString().slice(0, 10);
  const seed = getDailySeed(date);
  const rng = seededRandom(seed);
  const challenge = pickChallenge(rng, MIN_DAILY_DISTANCE);
  return {
    ...challenge,
    dateKey,
  };
}
