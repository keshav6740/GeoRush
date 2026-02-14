import { NextResponse } from 'next/server';
import { joinDuelRoom } from '@/lib/duelStore';

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
  const playerName = String((body as Record<string, unknown>).playerName ?? 'Player');

  if (!roomId.trim() || !playerId.trim()) {
    return NextResponse.json({ error: 'roomId and playerId are required' }, { status: 400 });
  }

  try {
    const room = await joinDuelRoom({ roomId, playerId, playerName });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join room';
    const status = message === 'Room not found' ? 404 : message === 'Room is full' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
