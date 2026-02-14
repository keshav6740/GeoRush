import { NextResponse } from 'next/server';
import { linkGoogleProfile } from '@/lib/leaderboardStore';

export const runtime = 'nodejs';

interface GoogleTokenInfo {
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleTokenInfo;
  if (!payload.sub || !payload.email || !payload.name) {
    return null;
  }
  if (payload.email_verified !== 'true') {
    return null;
  }
  return payload;
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
    !('idToken' in body)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const playerId = String((body as Record<string, unknown>).playerId);
  const idToken = String((body as Record<string, unknown>).idToken);

  try {
    const verified = await verifyGoogleIdToken(idToken);
    if (!verified?.sub || !verified.email || !verified.name) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const profile = await linkGoogleProfile(playerId, {
      sub: verified.sub,
      email: verified.email,
      name: verified.name,
      picture: verified.picture,
    });

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Failed to link Google profile' }, { status: 500 });
  }
}
