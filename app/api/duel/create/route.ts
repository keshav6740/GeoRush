import { NextResponse } from 'next/server';
import { createDuelRoom, type DuelMode } from '@/lib/duelStore';

export const runtime = 'nodejs';

const ALLOWED_MODES: DuelMode[] = ['world-quiz', 'continent-quiz', 'neighbour-chain', 'capital-guess'];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const playerId = String((body as Record<string, unknown>).playerId ?? '');
  const playerName = String((body as Record<string, unknown>).playerName ?? 'Player');
  const modeRaw = String((body as Record<string, unknown>).mode ?? 'world-quiz');
  const mode: DuelMode = ALLOWED_MODES.includes(modeRaw as DuelMode) ? (modeRaw as DuelMode) : 'world-quiz';
  const seriesBestOfRaw = Number((body as Record<string, unknown>).seriesBestOf ?? 1);
  const seriesBestOf = Number.isFinite(seriesBestOfRaw) && seriesBestOfRaw >= 1 ? Math.floor(seriesBestOfRaw) : 1;

  const poolRaw =
    (body as Record<string, unknown>).pool && typeof (body as Record<string, unknown>).pool === 'object'
      ? ((body as Record<string, unknown>).pool as Record<string, unknown>)
      : null;

  if (!playerId.trim()) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  try {
    const room = await createDuelRoom({
      playerId,
      playerName,
      mode,
      seriesBestOf,
      pool: {
        kind: poolRaw?.kind ? String(poolRaw.kind) : undefined,
        continent: poolRaw?.continent ? String(poolRaw.continent) : undefined,
        allowedCountries: Array.isArray(poolRaw?.allowedCountries)
          ? poolRaw?.allowedCountries.filter((value): value is string => typeof value === 'string')
          : undefined,
      },
    });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create room';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
