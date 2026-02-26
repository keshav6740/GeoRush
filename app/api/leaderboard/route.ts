import { NextResponse } from 'next/server';
import { getLeaderboard, getRecordsSummary, submitScore } from '@/lib/leaderboardStore';
import { toModeKey } from '@/lib/scoring';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || undefined;
  const limitParam = searchParams.get('limit');
  const playerId = searchParams.get('playerId') || undefined;
  const records = searchParams.get('records') === '1';
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  try {
    if (records) {
      const summary = await getRecordsSummary();
      return NextResponse.json(summary);
    }
    const data = await getLeaderboard({
      mode,
      limit,
      playerId,
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('playerId' in body) ||
    !('playerName' in body) ||
    !('gameMode' in body) ||
    !('score' in body) ||
    !('correct' in body) ||
    !('total' in body)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const result = await submitScore({
      playerId: String((body as Record<string, unknown>).playerId),
      playerName: String((body as Record<string, unknown>).playerName),
      gameMode: String((body as Record<string, unknown>).gameMode),
      modeKey: toModeKey(String((body as Record<string, unknown>).gameMode)),
      correct: Number((body as Record<string, unknown>).correct),
      total: Number((body as Record<string, unknown>).total),
      durationSeconds: Number((body as Record<string, unknown>).durationSeconds ?? Number.NaN),
      timeRemainingSeconds: Number((body as Record<string, unknown>).timeRemainingSeconds ?? Number.NaN),
      timeSpentSeconds: Number((body as Record<string, unknown>).timeSpentSeconds ?? Number.NaN),
      countriesGuessed: Array.isArray((body as Record<string, unknown>).countriesGuessed)
        ? ((body as Record<string, unknown>).countriesGuessed as unknown[]).filter(
            (value): value is string => typeof value === 'string'
          )
        : undefined,
    });

    return NextResponse.json({
      score: result.run.score,
      rawScore: result.rawScore,
      streakBonus: result.streakBonus,
      finalScore: result.finalScore,
      xpAward: result.xpAward,
      rank: result.rank,
      betterThan: result.betterThan,
      players: result.players,
      profile: result.profile,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
