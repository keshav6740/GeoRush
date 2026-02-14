import { NextResponse } from 'next/server';
import { startDuelMatch, type ContinentKey, type DuelMode } from '@/lib/duelStore';

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

  const roomId = String((body as Record<string, unknown>).roomId ?? '');
  const hostPlayerId = String((body as Record<string, unknown>).hostPlayerId ?? '');
  const modeRaw = String((body as Record<string, unknown>).mode ?? 'world-quiz');
  const mode: DuelMode = ALLOWED_MODES.includes(modeRaw as DuelMode) ? (modeRaw as DuelMode) : 'world-quiz';
  const continentRaw = String((body as Record<string, unknown>).continent ?? '');
  const continent: ContinentKey | undefined =
    continentRaw === 'Africa' ||
    continentRaw === 'Americas' ||
    continentRaw === 'Asia' ||
    continentRaw === 'Europe' ||
    continentRaw === 'Oceania'
      ? continentRaw
      : undefined;
  const allowedCountries = Array.isArray((body as Record<string, unknown>).allowedCountries)
    ? ((body as Record<string, unknown>).allowedCountries as unknown[]).filter(
        (value): value is string => typeof value === 'string'
      )
    : undefined;

  if (!roomId.trim() || !hostPlayerId.trim()) {
    return NextResponse.json({ error: 'roomId and hostPlayerId are required' }, { status: 400 });
  }

  try {
    const room = await startDuelMatch({ roomId, hostPlayerId, mode, continent, allowedCountries });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start duel';
    const status =
      message === 'Room not found'
        ? 404
        : message === 'Only host can start the match'
          ? 403
          : message === 'Both players must be ready' || message === 'Two players are required' || message === 'Room already started'
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
