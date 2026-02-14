import { NextResponse } from 'next/server';
import { setDuelReady } from '@/lib/duelStore';

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
  const playerId = String((body as Record<string, unknown>).playerId ?? '');
  const ready = Boolean((body as Record<string, unknown>).ready);

  if (!roomId.trim() || !playerId.trim()) {
    return NextResponse.json({ error: 'roomId and playerId are required' }, { status: 400 });
  }

  try {
    const room = await setDuelReady({ roomId, playerId, ready });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update ready state';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
