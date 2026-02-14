import { NextResponse } from 'next/server';
import { getPlayerProfile, updatePlayerProfile, upsertPlayerBaseProfile } from '@/lib/leaderboardStore';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('playerId') || '';
  if (!playerId.trim()) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  try {
    const profile = await getPlayerProfile(playerId);
    if (!profile) {
      return NextResponse.json({ profile: null });
    }
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
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
    !('playerName' in body)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const profile = await upsertPlayerBaseProfile(
      String((body as Record<string, unknown>).playerId),
      String((body as Record<string, unknown>).playerName)
    );
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('playerId' in body)) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }

  try {
    const profile = await updatePlayerProfile(String((body as Record<string, unknown>).playerId), {
      name:
        typeof (body as Record<string, unknown>).name === 'string'
          ? String((body as Record<string, unknown>).name)
          : undefined,
      avatarUrl:
        (body as Record<string, unknown>).avatarUrl === null
          ? null
          : typeof (body as Record<string, unknown>).avatarUrl === 'string'
            ? String((body as Record<string, unknown>).avatarUrl)
            : undefined,
    });

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
