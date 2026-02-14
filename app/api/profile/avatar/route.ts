import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { updatePlayerProfile } from '@/lib/leaderboardStore';

export const runtime = 'nodejs';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const AVATAR_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const playerIdRaw = formData.get('playerId');
  const file = formData.get('avatar');

  if (typeof playerIdRaw !== 'string' || !playerIdRaw.trim()) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'avatar file is required' }, { status: 400 });
  }

  const mime = file.type.toLowerCase();
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: 'Avatar must be between 1 byte and 4MB' }, { status: 400 });
  }

  const safePlayerId = sanitizeId(playerIdRaw);
  if (!safePlayerId) {
    return NextResponse.json({ error: 'Invalid playerId' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${safePlayerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = path.join(AVATAR_DIR, filename);
  const publicPath = `/uploads/avatars/${filename}`;

  try {
    await fs.mkdir(AVATAR_DIR, { recursive: true });
    await fs.writeFile(filePath, bytes);
    const profile = await updatePlayerProfile(safePlayerId, { avatarUrl: publicPath });
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
