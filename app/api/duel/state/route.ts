import { NextResponse } from 'next/server';
import { getDuelRoomState } from '@/lib/duelStore';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId') ?? '';
  const playerId = searchParams.get('playerId') ?? '';

  if (!roomId.trim() || !playerId.trim()) {
    return NextResponse.json({ error: 'roomId and playerId are required' }, { status: 400 });
  }

  try {
    const room = await getDuelRoomState({ roomId, viewerPlayerId: playerId });
    return NextResponse.json({ room });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load room';
    const status = message === 'Room not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
