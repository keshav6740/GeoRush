import { NextResponse } from 'next/server';
import { submitDuelAnswer } from '@/lib/duelStore';

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
  const rawQuestionIndex = (body as Record<string, unknown>).questionIndex;
  const questionIndex =
    typeof rawQuestionIndex === 'number' && Number.isFinite(rawQuestionIndex)
      ? rawQuestionIndex
      : typeof rawQuestionIndex === 'string' && rawQuestionIndex.trim()
        ? Number(rawQuestionIndex)
        : undefined;
  const answer = String((body as Record<string, unknown>).answer ?? '');

  if (!roomId.trim() || !playerId.trim()) {
    return NextResponse.json({ error: 'roomId and playerId are required' }, { status: 400 });
  }

  try {
    const payload = await submitDuelAnswer({ roomId, playerId, questionIndex, answer });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit answer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
