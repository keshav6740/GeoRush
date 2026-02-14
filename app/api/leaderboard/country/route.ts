import { NextResponse } from 'next/server';
import { getCountryLeaderboard } from '@/lib/leaderboardStore';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || '';
  const playerId = searchParams.get('playerId') || undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  if (!country.trim()) {
    return NextResponse.json({ error: 'country is required' }, { status: 400 });
  }

  try {
    const payload = await getCountryLeaderboard({
      country,
      limit,
      playerId,
    });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Failed to load country leaderboard' }, { status: 500 });
  }
}
