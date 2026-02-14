import { NextResponse } from 'next/server';
import { createDuelRematch } from '@/lib/duelStore';

export const runtime = 'nodejs';

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
  const requesterPlayerId = String((body as Record<string, unknown>).requesterPlayerId ?? '');

  if (!roomId.trim() || !requesterPlayerId.trim()) {
    return NextResponse.json({ error: 'roomId and requesterPlayerId are required' }, { status: 400 });
  }

  try {
    const room = await createDuelRematch({ roomId, requesterPlayerId });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create rematch';
    const status =
      message === 'Room not found'
        ? 404
        : message === 'Only participants can create rematch'
          ? 403
          : message === 'Current match must be finished first' ||
              message === 'Series is already decided' ||
              message === 'Maximum series matches reached'
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
