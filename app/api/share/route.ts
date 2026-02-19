import { ImageResponse } from 'next/og';
import React from 'react';
import { normalizeCountryName, toWorldMapCountryNameVariants } from '@/lib/countryNameUtils';

export const runtime = 'edge';
const GEOJSON_URL =
  'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
const MAP_WIDTH = 520;
const MAP_HEIGHT = 270;
const GUESSED_FILL_COLOR = '#b8f4b8';
type RegionKey = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';
const REGION_BOUNDS: Record<RegionKey, { minLon: number; maxLon: number; minLat: number; maxLat: number }> = {
  Africa: { minLon: -25, maxLon: 55, minLat: -37, maxLat: 40 },
  Americas: { minLon: -170, maxLon: -30, minLat: -56, maxLat: 83 },
  Asia: { minLon: 25, maxLon: 180, minLat: -12, maxLat: 82 },
  Europe: { minLon: -25, maxLon: 45, minLat: 34, maxLat: 72 },
  Oceania: { minLon: 95, maxLon: 180, minLat: -55, maxLat: 25 },
};

interface GeoFeature {
  properties?: {
    name?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
}

interface GeoData {
  features?: GeoFeature[];
}

let geoDataCache: GeoData | null = null;

function getParam(searchParams: URLSearchParams, key: string, fallback: string) {
  const value = searchParams.get(key);
  return value && value.trim() ? value : fallback;
}

function projectPoint(lon: number, lat: number) {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return { x, y };
}

function ringToPath(ring: number[][]) {
  let path = '';
  for (let i = 0; i < ring.length; i += 1) {
    const pair = ring[i];
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const lon = Number(pair[0]);
    const lat = Number(pair[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const { x, y } = projectPoint(lon, lat);
    path += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return `${path}Z`;
}

function polygonToPath(polygon: number[][][]) {
  return polygon.map((ring) => ringToPath(ring)).join(' ');
}

function geometryToPath(geometry: GeoFeature['geometry']) {
  if (!geometry?.type || !geometry.coordinates) return '';

  if (geometry.type === 'Polygon') {
    return polygonToPath(geometry.coordinates as number[][][]);
  }
  if (geometry.type === 'MultiPolygon') {
    const multipolygon = geometry.coordinates as number[][][][];
    return multipolygon.map((polygon) => polygonToPath(polygon)).join(' ');
  }
  return '';
}

function canonicalMapKey(input: string) {
  const normalized = normalizeCountryName(input);
  if (normalized === 'uk') return 'united kingdom';
  if (normalized === 'united kingdom of great britain and northern ireland') return 'united kingdom';
  if (normalized === 'republic of serbia') return 'serbia';
  return normalized;
}

function detectShareRegion(mode: string): RegionKey | null {
  const value = mode.trim().toLowerCase();
  if (value === 'africa quiz') return 'Africa';
  if (value === 'americas quiz') return 'Americas';
  if (value === 'asia quiz') return 'Asia';
  if (value === 'europe quiz') return 'Europe';
  if (value === 'oceania quiz') return 'Oceania';
  return null;
}

function padRange(min: number, max: number, ratio: number, hardMin: number, hardMax: number) {
  const span = Math.max(1, max - min);
  const pad = span * ratio;
  return {
    min: Math.max(hardMin, min - pad),
    max: Math.min(hardMax, max + pad),
  };
}

function buildViewBoxForRegion(region: RegionKey | null) {
  if (!region) return `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;
  const bounds = REGION_BOUNDS[region];
  const lon = padRange(bounds.minLon, bounds.maxLon, 0.06, -180, 180);
  const lat = padRange(bounds.minLat, bounds.maxLat, 0.06, -90, 90);
  const topLeft = projectPoint(lon.min, lat.max);
  const bottomRight = projectPoint(lon.max, lat.min);
  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);
  const w = Math.max(10, Math.abs(bottomRight.x - topLeft.x));
  const h = Math.max(10, Math.abs(bottomRight.y - topLeft.y));
  return `${x} ${y} ${w} ${h}`;
}

function parseGuessedCountries(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get('countries');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, 240);
  } catch {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 240);
  }
}

async function loadGeoData() {
  if (geoDataCache) return geoDataCache;
  const response = await fetch(GEOJSON_URL, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Map fetch failed');
  const data = (await response.json()) as GeoData;
  geoDataCache = data;
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = getParam(searchParams, 'mode', 'GeoRush');
  const score = getParam(searchParams, 'score', '0');
  const accuracy = getParam(searchParams, 'accuracy', '0');
  const correct = getParam(searchParams, 'correct', '0');
  const total = getParam(searchParams, 'total', '0');
  const streak = getParam(searchParams, 'streak', '0');
  const badges = getParam(searchParams, 'badges', '0');
  const date = getParam(searchParams, 'date', new Date().toISOString().slice(0, 10));
  const guessedCountries = parseGuessedCountries(searchParams);
  const shareRegion = detectShareRegion(mode);
  const mapViewBox = buildViewBoxForRegion(shareRegion);

  const guessedSet = new Set<string>();
  for (const country of guessedCountries) {
    for (const variant of toWorldMapCountryNameVariants(country)) {
      guessedSet.add(canonicalMapKey(variant));
    }
  }

  let mapPaths: Array<{ key: string; d: string; guessed: boolean }> = [];
  try {
    const geo = await loadGeoData();
    mapPaths = (geo.features ?? [])
      .map((feature) => {
        const name = feature.properties?.name || '';
        const d = geometryToPath(feature.geometry);
        if (!name || !d) return null;
        const guessed = guessedSet.has(canonicalMapKey(name));
        return { key: name, d, guessed };
      })
      .filter((item): item is { key: string; d: string; guessed: boolean } => Boolean(item));
  } catch {
    mapPaths = [];
  }

  const iconStyle = {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: '#2a9d8f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    color: '#ffffff',
    fontWeight: 700,
  } as const;

  const rootStyle = {
    width: '1200px',
    height: '630px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '64px',
    background: 'linear-gradient(135deg, #fef6e4 0%, #d4f1f4 50%, #fde2e4 100%)',
    color: '#1f2937',
    fontFamily: 'Arial, sans-serif',
  } as const;

  const header = React.createElement(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
    React.createElement('div', { style: iconStyle }, 'G'),
    React.createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: { fontSize: '36px', fontWeight: 800 } }, 'GeoRush'),
      React.createElement('div', { style: { fontSize: '18px', opacity: 0.7 } }, date)
    )
  );

  const scoreBlock = React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: '12px', width: '58%' } },
    React.createElement('div', { style: { fontSize: '48px', fontWeight: 800 } }, mode),
    React.createElement('div', { style: { fontSize: '28px' } }, `Score: ${score}`),
    React.createElement(
      'div',
      { style: { fontSize: '24px' } },
      `Accuracy: ${accuracy}% (${correct}/${total})`
    ),
    React.createElement('div', { style: { fontSize: '22px' } }, `Streak: ${streak} day(s) | Badges: ${badges}`)
  );

  const mapPanel = React.createElement(
    'div',
    {
      style: {
        width: '40%',
        height: '330px',
        borderRadius: '20px',
        border: '2px solid #c4d6e6',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px',
        gap: '10px',
      },
    },
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', color: '#334155' } },
      React.createElement('div', { style: { fontWeight: 700 } }, 'Guess Map'),
      React.createElement('div', null, `${correct}/${total}`)
    ),
    mapPaths.length > 0
      ? React.createElement(
          'svg',
          {
            viewBox: mapViewBox,
            width: '100%',
            height: '100%',
            style: { borderRadius: '12px', background: '#d3e8f8' },
          },
          React.createElement('rect', { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT, fill: '#d3e8f8' }),
          ...mapPaths.map((country) =>
            React.createElement('path', {
              key: country.key,
              d: country.d,
              fill: country.guessed ? GUESSED_FILL_COLOR : '#f5f4e8',
              stroke: '#7b8794',
              strokeWidth: 0.45,
            })
          )
        )
      : React.createElement(
          'div',
          {
            style: {
              flex: 1,
              borderRadius: '12px',
              background: '#f3f8fd',
              border: '1px dashed #9bb8d1',
              color: '#4b6176',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontSize: '18px',
              padding: '12px',
            },
          },
          'Map preview unavailable'
        )
  );

  const footer = React.createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '20px',
        color: '#264653',
      },
    },
    React.createElement('div', null, 'Think fast. Learn fast.'),
    React.createElement('div', { style: { fontWeight: 700 } }, 'georush.app')
  );

  const middle = React.createElement(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '20px' } },
    scoreBlock,
    mapPanel
  );

  return new ImageResponse(
    React.createElement('div', { style: rootStyle }, header, middle, footer),
    {
      width: 1200,
      height: 630,
    }
  );
}
