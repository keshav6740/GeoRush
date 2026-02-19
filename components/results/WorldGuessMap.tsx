'use client';

import { useEffect, useMemo, useRef, useState, type MouseEventHandler, type PointerEventHandler, type WheelEventHandler } from 'react';
import {
  normalizeCountryName,
  toWorldMapCountryNameVariants,
} from '@/lib/countryNameUtils';

interface WorldGuessMapProps {
  guessedCountries: string[];
  revealedCountries?: string[];
  focusCountries?: string[];
  startCountries?: string[];
  endCountries?: string[];
  focusRegion?: 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';
  mapHeightClass?: string;
  title?: string;
  enableZoomPan?: boolean;
  enableTilt3d?: boolean;
  hideNonScopeCountries?: boolean;
  cropToFocus?: boolean;
  interactionResetKey?: string;
}

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

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface TinyMarker {
  key: string;
  cx: number;
  cy: number;
  guessed: boolean;
  revealed: boolean;
}

interface ManualMarkerSeed {
  key: string;
  lon: number;
  lat: number;
}

const GEOJSON_URL =
  'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

const WIDTH = 1000;
const HEIGHT = 500;
const GUESSED_FILL_COLOR = '#b8f4b8';
const OCEAN_FILL_COLOR = '#bfe7ff';

const REGION_BOUNDS: Record<
  NonNullable<WorldGuessMapProps['focusRegion']>,
  { minLon: number; maxLon: number; minLat: number; maxLat: number }
> = {
  Africa: { minLon: -25, maxLon: 55, minLat: -37, maxLat: 40 },
  Americas: { minLon: -170, maxLon: -30, minLat: -56, maxLat: 83 },
  Asia: { minLon: 25, maxLon: 180, minLat: -12, maxLat: 82 },
  Europe: { minLon: -25, maxLon: 45, minLat: 34, maxLat: 72 },
  Oceania: { minLon: 95, maxLon: 180, minLat: -55, maxLat: 25 },
};

const MANUAL_MICRO_MARKERS: ManualMarkerSeed[] = [
  { key: 'antigua and barbuda', lon: -61.8, lat: 17.1 },
  { key: 'antigua', lon: -61.8, lat: 17.1 },
  { key: 'maldives', lon: 73.5, lat: 3.2 },
  { key: 'singapore', lon: 103.82, lat: 1.35 },
  { key: 'barbados', lon: -59.55, lat: 13.19 },
  { key: 'st lucia', lon: -60.98, lat: 13.91 },
  { key: 'saint lucia', lon: -60.98, lat: 13.91 },
  { key: 'st kitts and nevis', lon: -62.78, lat: 17.35 },
  { key: 'saint kitts and nevis', lon: -62.78, lat: 17.35 },
  { key: 'st vincent and the grenadines', lon: -61.2, lat: 13.2 },
  { key: 'saint vincent and the grenadines', lon: -61.2, lat: 13.2 },
  { key: 'dominica', lon: -61.35, lat: 15.41 },
  { key: 'trinidad and tobago', lon: -61.22, lat: 10.69 },
  { key: 'cabo verde', lon: -23.6, lat: 15.1 },
  { key: 'cape verde', lon: -23.6, lat: 15.1 },
  { key: 'sao tome and principe', lon: 6.73, lat: 0.22 },
  { key: 'seychelles', lon: 55.45, lat: -4.62 },
  { key: 'mauritius', lon: 57.55, lat: -20.2 },
  { key: 'comoros', lon: 43.33, lat: -11.87 },
  { key: 'bahamas', lon: -77.4, lat: 25.03 },
  { key: 'malta', lon: 14.51, lat: 35.9 },
  { key: 'andorra', lon: 1.52, lat: 42.51 },
  { key: 'liechtenstein', lon: 9.55, lat: 47.17 },
  { key: 'vatican', lon: 12.45, lat: 41.9 },
  { key: 'vatican city', lon: 12.45, lat: 41.9 },
  { key: 'monaco', lon: 7.42, lat: 43.73 },
  { key: 'san marino', lon: 12.45, lat: 43.94 },
  { key: 'fiji', lon: 178.06, lat: -17.71 },
  { key: 'kiribati', lon: 173.0, lat: 1.87 },
  { key: 'marshall islands', lon: 171.2, lat: 7.1 },
  { key: 'micronesia', lon: 158.2, lat: 6.9 },
  { key: 'nauru', lon: 166.93, lat: -0.52 },
  { key: 'palau', lon: 134.5, lat: 7.5 },
  { key: 'samoa', lon: -172.1, lat: -13.76 },
  { key: 'solomon islands', lon: 160.16, lat: -9.65 },
  { key: 'tonga', lon: -175.2, lat: -21.17 },
  { key: 'tuvalu', lon: 179.2, lat: -8.5 },
  { key: 'vanuatu', lon: 167.95, lat: -16.25 },
];

function projectPoint(lon: number, lat: number) {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
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
    const polygon = geometry.coordinates as number[][][];
    return polygonToPath(polygon);
  }

  if (geometry.type === 'MultiPolygon') {
    const multipolygon = geometry.coordinates as number[][][][];
    return multipolygon.map((polygon) => polygonToPath(polygon)).join(' ');
  }

  return '';
}

function geometryToBounds(geometry: GeoFeature['geometry']): Bounds | null {
  if (!geometry?.type || !geometry.coordinates) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const pushPoint = (lon: number, lat: number) => {
    const { x, y } = projectPoint(lon, lat);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  const readRing = (ring: number[][]) => {
    for (const pair of ring) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const lon = Number(pair[0]);
      const lat = Number(pair[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
      pushPoint(lon, lat);
    }
  };

  if (geometry.type === 'Polygon') {
    const polygon = geometry.coordinates as number[][][];
    for (const ring of polygon) readRing(ring);
  } else if (geometry.type === 'MultiPolygon') {
    const multipolygon = geometry.coordinates as number[][][][];
    for (const polygon of multipolygon) {
      for (const ring of polygon) readRing(ring);
    }
  } else {
    return null;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function mergeBounds(boundsList: Bounds[]): Bounds | null {
  if (boundsList.length === 0) return null;
  return boundsList.reduce(
    (acc, cur) => ({
      minX: Math.min(acc.minX, cur.minX),
      minY: Math.min(acc.minY, cur.minY),
      maxX: Math.max(acc.maxX, cur.maxX),
      maxY: Math.max(acc.maxY, cur.maxY),
    }),
    boundsList[0]
  );
}

function paddedBounds(bounds: Bounds, padRatio: number): Bounds {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const padX = width * padRatio;
  const padY = height * padRatio;
  return {
    minX: Math.max(0, bounds.minX - padX),
    minY: Math.max(0, bounds.minY - padY),
    maxX: Math.min(WIDTH, bounds.maxX + padX),
    maxY: Math.min(HEIGHT, bounds.maxY + padY),
  };
}

function lonLatBoundsToProjectedBounds(minLon: number, maxLon: number, minLat: number, maxLat: number): Bounds {
  const a = projectPoint(minLon, maxLat);
  const b = projectPoint(maxLon, minLat);
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

function canonicalMapKey(input: string) {
  const normalized = normalizeCountryName(input);
  if (normalized === 'uk') return 'united kingdom';
  if (normalized === 'united kingdom of great britain and northern ireland') return 'united kingdom';
  if (normalized === 'republic of serbia') return 'serbia';
  return normalized;
}

export function WorldGuessMap({
  guessedCountries,
  revealedCountries = [],
  focusCountries = [],
  startCountries = [],
  endCountries = [],
  focusRegion,
  mapHeightClass = 'h-[360px] md:h-[560px]',
  title = 'Countries You Nailed',
  enableZoomPan = false,
  enableTilt3d = false,
  hideNonScopeCountries = false,
  cropToFocus = true,
  interactionResetKey,
}: WorldGuessMapProps) {
  const [data, setData] = useState<GeoData | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const resetKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetch(GEOJSON_URL)
      .then(async (response) => {
        if (!response.ok) throw new Error('Map fetch failed');
        return (await response.json()) as GeoData;
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const guessedSet = useMemo(() => {
    const set = new Set<string>();
    for (const country of guessedCountries) {
      for (const variant of toWorldMapCountryNameVariants(country)) {
        set.add(canonicalMapKey(variant));
      }
    }
    return set;
  }, [guessedCountries]);

  const revealedSet = useMemo(() => {
    const set = new Set<string>();
    for (const country of revealedCountries) {
      for (const variant of toWorldMapCountryNameVariants(country)) {
        set.add(canonicalMapKey(variant));
      }
    }
    return set;
  }, [revealedCountries]);

  const focusSet = useMemo(() => {
    const set = new Set<string>();
    for (const country of focusCountries) {
      for (const variant of toWorldMapCountryNameVariants(country)) {
        set.add(canonicalMapKey(variant));
      }
    }
    return set;
  }, [focusCountries]);

  const startSet = useMemo(() => {
    const set = new Set<string>();
    for (const country of startCountries) {
      for (const variant of toWorldMapCountryNameVariants(country)) {
        set.add(canonicalMapKey(variant));
      }
    }
    return set;
  }, [startCountries]);

  const endSet = useMemo(() => {
    const set = new Set<string>();
    for (const country of endCountries) {
      for (const variant of toWorldMapCountryNameVariants(country)) {
        set.add(canonicalMapKey(variant));
      }
    }
    return set;
  }, [endCountries]);

  const countries = useMemo(() => {
    if (!data?.features) return [];
    return data.features
      .map((feature) => {
        const name = feature.properties?.name || '';
        const normalized = canonicalMapKey(name);
        const path = geometryToPath(feature.geometry);
        const bounds = geometryToBounds(feature.geometry);
        const forcedEuropeInScope =
          focusRegion === 'Europe' && (normalized === 'united kingdom' || normalized === 'serbia');
        return {
          name,
          normalized,
          path,
          bounds,
          inScope: focusSet.size === 0 || focusSet.has(normalized) || forcedEuropeInScope,
          isStart: startSet.has(normalized),
          isEnd: endSet.has(normalized),
          guessed: guessedSet.has(normalized),
          revealed: revealedSet.has(normalized),
        };
      })
      .filter((country) => country.path);
  }, [data, endSet, focusRegion, focusSet, guessedSet, revealedSet, startSet]);

  const guessedCount = countries.filter((country) => country.guessed).length;
  const revealedCount = countries.filter((country) => !country.guessed && country.revealed).length;

  const mapView = useMemo(() => {
    if (focusRegion) {
      const region = REGION_BOUNDS[focusRegion];
      const projected = lonLatBoundsToProjectedBounds(
        region.minLon,
        region.maxLon,
        region.minLat,
        region.maxLat
      );
      const padded = paddedBounds(projected, 0.04);
      return {
        minX: padded.minX,
        minY: padded.minY,
        width: Math.max(10, padded.maxX - padded.minX),
        height: Math.max(10, padded.maxY - padded.minY),
      };
    }

    if (!cropToFocus || focusSet.size === 0) {
      return { minX: 0, minY: 0, width: WIDTH, height: HEIGHT };
    }
    const focusBounds = countries
      .filter((country) => focusSet.has(country.normalized) && country.bounds)
      .map((country) => country.bounds as Bounds);
    const merged = mergeBounds(focusBounds);
    if (!merged) {
      return { minX: 0, minY: 0, width: WIDTH, height: HEIGHT };
    }
    const padded = paddedBounds(merged, 0.08);
    return {
      minX: padded.minX,
      minY: padded.minY,
      width: Math.max(10, padded.maxX - padded.minX),
      height: Math.max(10, padded.maxY - padded.minY),
    };
  }, [countries, cropToFocus, focusRegion, focusSet]);

  useEffect(() => {
    if (!enableZoomPan) return;
    if (typeof interactionResetKey === 'string') {
      if (resetKeyRef.current === interactionResetKey) return;
      resetKeyRef.current = interactionResetKey;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [enableZoomPan, interactionResetKey, mapView.minX, mapView.minY, mapView.width, mapView.height, focusRegion]);

  const clampPan = (nextX: number, nextY: number, nextZoom: number) => {
    if (nextZoom <= 1) return { x: 0, y: 0 };
    const maxX = (mapView.width * (nextZoom - 1)) / 2;
    const maxY = (mapView.height * (nextZoom - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nextX)),
      y: Math.max(-maxY, Math.min(maxY, nextY)),
    };
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const adjustZoom = (delta: number) => {
    if (!enableZoomPan) return;
    setZoom((prev) => {
      const next = Math.max(1, Math.min(6, Number((prev + delta).toFixed(2))));
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((cur) => clampPan(cur.x, cur.y, next));
      }
      return next;
    });
  };

  const handleWheel: WheelEventHandler<SVGSVGElement> = (event) => {
    if (!enableZoomPan) return;
    event.preventDefault();
    const next = zoom + (event.deltaY > 0 ? -0.2 : 0.2);
    const bounded = Math.max(1, Math.min(6, Number(next.toFixed(2))));
    setZoom(bounded);
    if (bounded <= 1) {
      setPan({ x: 0, y: 0 });
    } else {
      setPan((cur) => clampPan(cur.x, cur.y, bounded));
    }
  };

  const handlePointerDown: PointerEventHandler<SVGSVGElement> = (event) => {
    if (!enableZoomPan || zoom <= 1) return;
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: PointerEventHandler<SVGSVGElement> = (event) => {
    if (!enableZoomPan || zoom <= 1 || !dragRef.current) return;
    const last = dragRef.current;
    dragRef.current = { x: event.clientX, y: event.clientY };
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dxMap = ((event.clientX - last.x) / rect.width) * mapView.width;
    const dyMap = ((event.clientY - last.y) / rect.height) * mapView.height;

    setPan((cur) => clampPan(cur.x + dxMap, cur.y + dyMap, zoom));
  };

  const handlePointerUp: PointerEventHandler<SVGSVGElement> = (event) => {
    if (!enableZoomPan) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleTiltMove: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!enableTilt3d) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 8;
    const rotateX = (0.5 - py) * 6;
    setTilt({ rotateX, rotateY });
  };

  const handleTiltLeave = () => {
    if (!enableTilt3d) return;
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const tinyMarkers = useMemo(() => {
    const markers: TinyMarker[] = [];
    for (const seed of MANUAL_MICRO_MARKERS) {
      const normalized = normalizeCountryName(seed.key);
      const guessed = guessedSet.has(normalized);
      const revealed = !guessed && revealedSet.has(normalized);
      const inFocus = focusSet.size === 0 || focusSet.has(normalized);
      if (!inFocus && !guessed && !revealed) continue;
      // Oceania spans the anti-meridian. Mirror far-west Pacific marker longitudes
      // so micro-island pins (e.g., Samoa/Tonga) remain visible in the focused crop.
      const markerLon = focusRegion === 'Oceania' && seed.lon < -150 ? Math.abs(seed.lon) : seed.lon;
      const pt = projectPoint(markerLon, seed.lat);
      markers.push({
        key: `manual-${seed.key}`,
        cx: pt.x,
        cy: pt.y,
        guessed,
        revealed,
      });
    }
    return markers;
  }, [focusSet, guessedSet, revealedSet]);

  return (
    <div className="neon-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold gradient-text">{title}</h3>
        <span className="badge">{guessedCount} green {revealedCount > 0 ? `| ${revealedCount} red` : ''}</span>
      </div>

      <div
        className="rounded-2xl overflow-hidden border border-[#d9dee5] bg-[#bfe7ff] transition-transform duration-150"
        style={
          enableTilt3d
            ? {
                transformStyle: 'preserve-3d',
                transform: `perspective(1100px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              }
            : undefined
        }
        onMouseMove={handleTiltMove}
        onMouseLeave={handleTiltLeave}
      >
        {enableZoomPan && (
          <div className="flex items-center justify-end gap-2 border-b border-[#e5eaf2] bg-[#f8fbff] px-3 py-2">
            <button type="button" onClick={() => adjustZoom(-0.2)} className="rounded-md border border-[#d8e0eb] bg-white px-2 py-1 text-xs text-[#1f2937]">
              -
            </button>
            <span className="text-xs text-[#5a6b7a]">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => adjustZoom(0.2)} className="rounded-md border border-[#d8e0eb] bg-white px-2 py-1 text-xs text-[#1f2937]">
              +
            </button>
            <button type="button" onClick={resetView} className="rounded-md border border-[#d8e0eb] bg-white px-2 py-1 text-xs text-[#1f2937]">
              Reset
            </button>
          </div>
        )}
        {failed ? (
          <div className="p-8 text-center text-[#5a6b7a]">Map could not be loaded right now.</div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`${mapView.minX} ${mapView.minY} ${mapView.width} ${mapView.height}`}
            preserveAspectRatio="xMidYMid meet"
            className={`w-full ${mapHeightClass} block bg-[#bfe7ff] ${enableZoomPan ? 'cursor-grab active:cursor-grabbing' : ''}`}
            role="img"
            aria-label="World map with guessed countries highlighted"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={enableZoomPan ? { touchAction: 'none' } : undefined}
          >
            <g
              transform={`translate(${pan.x.toFixed(2)} ${pan.y.toFixed(2)}) translate(${(mapView.minX + mapView.width / 2).toFixed(2)} ${(mapView.minY + mapView.height / 2).toFixed(2)}) scale(${zoom.toFixed(3)}) translate(${(-(mapView.minX + mapView.width / 2)).toFixed(2)} ${(-(mapView.minY + mapView.height / 2)).toFixed(2)})`}
            >
              <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill={OCEAN_FILL_COLOR} />
              {countries.map((country) => (
                <path
                  key={country.name}
                  d={country.path}
                  fill={
                    country.isStart
                      ? '#e76f51'
                      : country.isEnd
                      ? '#2a9d8f'
                      : country.guessed
                      ? GUESSED_FILL_COLOR
                      : country.revealed
                      ? '#e76f51'
                      : country.inScope
                      ? '#ffffff'
                      : hideNonScopeCountries
                      ? 'transparent'
                      : '#e5e7eb'
                  }
                  stroke={country.inScope ? '#6b7280' : hideNonScopeCountries ? 'none' : '#cbd5e1'}
                  strokeWidth={country.inScope ? 0.45 : 0.35}
                />
              ))}
              {tinyMarkers.map((marker) => (
                <circle
                  key={`tiny-${marker.key}`}
                  cx={marker.cx}
                  cy={marker.cy}
                  r={2.2}
                  fill={marker.guessed ? GUESSED_FILL_COLOR : marker.revealed ? '#e76f51' : '#ffffff'}
                  stroke="#334155"
                  strokeWidth={0.6}
                />
              ))}
            </g>
          </svg>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm text-[#5a6b7a]">
        {startSet.size > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#e76f51] inline-block" />
            Start
          </span>
        )}
        {endSet.size > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#2a9d8f] inline-block" />
            End
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: GUESSED_FILL_COLOR }} />
          Guessed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-[#e76f51] inline-block" />
          Revealed
        </span>
        {focusSet.size > 0 && !hideNonScopeCountries && (
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#e5e7eb] inline-block" />
            Not in quiz
          </span>
        )}
      </div>
    </div>
  );
}
