const PLAYER_ID_KEY = 'georush_player_id';
const PLAYER_NAME_KEY = 'georush_player_name';
const PLAYER_AUTH_PROVIDER_KEY = 'georush_auth_provider';
const PLAYER_GOOGLE_PROFILE_KEY = 'georush_google_profile';
const PLAYER_AVATAR_URL_KEY = 'georush_avatar_url';
const PLAYER_SESSION_MODE_KEY = 'georush_session_mode';
const PLAYER_LOCAL_USERNAME_KEY = 'georush_local_username';
const PLAYER_LOCAL_PASSWORD_KEY = 'georush_local_password';
const PLAYER_LOCAL_PLAYER_ID_KEY = 'georush_local_player_id';

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export type SessionMode = 'none' | 'local' | 'google';

function randomToken(length: number) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function getOrCreatePlayerIdentity() {
  if (typeof window === 'undefined') {
    return {
      playerId: 'server-player',
      playerName: 'Player',
      authProvider: 'guest' as const,
      googleProfile: null as GoogleProfile | null,
      avatarUrl: null as string | null,
    };
  }

  let playerId = window.localStorage.getItem(PLAYER_ID_KEY);
  let playerName = window.localStorage.getItem(PLAYER_NAME_KEY);

  if (!playerId) {
    const suffix = randomToken(8);
    playerId = `player-${suffix}`;
    window.localStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  if (!playerName) {
    const tail = playerId.slice(-4).toUpperCase();
    playerName = `Player ${tail}`;
    window.localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }

  const authProvider = window.localStorage.getItem(PLAYER_AUTH_PROVIDER_KEY) === 'google' ? 'google' : 'guest';
  const avatarUrl = window.localStorage.getItem(PLAYER_AVATAR_URL_KEY);
  const rawGoogleProfile = window.localStorage.getItem(PLAYER_GOOGLE_PROFILE_KEY);
  let googleProfile: GoogleProfile | null = null;
  if (rawGoogleProfile) {
    try {
      const parsed = JSON.parse(rawGoogleProfile) as GoogleProfile;
      if (parsed && typeof parsed.sub === 'string' && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
        googleProfile = parsed;
      }
    } catch {
      googleProfile = null;
    }
  }

  return {
    playerId,
    playerName,
    authProvider,
    googleProfile,
    avatarUrl,
  };
}

export function setPlayerName(playerName: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLAYER_NAME_KEY, playerName.trim().slice(0, 40) || 'Player');
}

export function setPlayerId(playerId: string) {
  if (typeof window === 'undefined') return;
  const safeId = playerId.trim().slice(0, 80);
  if (!safeId) return;
  window.localStorage.setItem(PLAYER_ID_KEY, safeId);
}

export function setGoogleLinkedProfile(profile: GoogleProfile) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLAYER_AUTH_PROVIDER_KEY, 'google');
  window.localStorage.setItem(PLAYER_SESSION_MODE_KEY, 'google');
  window.localStorage.setItem(PLAYER_GOOGLE_PROFILE_KEY, JSON.stringify(profile));
  setPlayerName(profile.name);
  if (profile.picture) {
    window.localStorage.setItem(PLAYER_AVATAR_URL_KEY, profile.picture);
  }
}

export function setPlayerAvatarUrl(avatarUrl: string | null) {
  if (typeof window === 'undefined') return;
  if (!avatarUrl) {
    window.localStorage.removeItem(PLAYER_AVATAR_URL_KEY);
    return;
  }
  window.localStorage.setItem(PLAYER_AVATAR_URL_KEY, avatarUrl.trim().slice(0, 500));
}

export function getAuthSession() {
  if (typeof window === 'undefined') {
    return {
      isAuthenticated: false,
      mode: 'none' as SessionMode,
      localUsername: null as string | null,
    };
  }

  const rawMode = window.localStorage.getItem(PLAYER_SESSION_MODE_KEY);
  const localUsername = window.localStorage.getItem(PLAYER_LOCAL_USERNAME_KEY);
  const authProvider = window.localStorage.getItem(PLAYER_AUTH_PROVIDER_KEY);

  let mode: SessionMode = 'none';
  if (rawMode === 'local' || rawMode === 'google') {
    mode = rawMode;
  } else if (authProvider === 'google') {
    mode = 'google';
  }

  if (mode === 'local' && !localUsername) {
    mode = 'none';
  }

  return {
    isAuthenticated: mode !== 'none',
    mode,
    localUsername,
  };
}

export function registerLocalCredentials(username: string, password: string) {
  if (typeof window === 'undefined') {
    return { ok: false as const, error: 'Unavailable on server.' };
  }

  const cleanUsername = username.trim().slice(0, 40);
  const cleanPassword = password.trim();

  if (cleanUsername.length < 3) {
    return { ok: false as const, error: 'User ID must be at least 3 characters.' };
  }
  if (cleanPassword.length < 6) {
    return { ok: false as const, error: 'Password must be at least 6 characters.' };
  }

  window.localStorage.setItem(PLAYER_LOCAL_USERNAME_KEY, cleanUsername);
  window.localStorage.setItem(PLAYER_LOCAL_PASSWORD_KEY, cleanPassword);
  const localPlayerId = `local-${randomToken(12)}`;
  window.localStorage.setItem(PLAYER_LOCAL_PLAYER_ID_KEY, localPlayerId);
  setPlayerId(localPlayerId);
  window.localStorage.setItem(PLAYER_SESSION_MODE_KEY, 'local');
  window.localStorage.setItem(PLAYER_AUTH_PROVIDER_KEY, 'guest');
  setPlayerName(cleanUsername);

  return { ok: true as const };
}

export function signInWithLocalCredentials(username: string, password: string) {
  if (typeof window === 'undefined') {
    return { ok: false as const, error: 'Unavailable on server.' };
  }

  const cleanUsername = username.trim().slice(0, 40);
  const savedUsername = window.localStorage.getItem(PLAYER_LOCAL_USERNAME_KEY) || '';
  const savedPassword = window.localStorage.getItem(PLAYER_LOCAL_PASSWORD_KEY) || '';

  if (!savedUsername || !savedPassword) {
    return { ok: false as const, error: 'No local account found. Create one first.' };
  }

  if (cleanUsername !== savedUsername || password !== savedPassword) {
    return { ok: false as const, error: 'Invalid user ID or password.' };
  }

  let localPlayerId = window.localStorage.getItem(PLAYER_LOCAL_PLAYER_ID_KEY);
  if (!localPlayerId) {
    localPlayerId = `local-${randomToken(12)}`;
    window.localStorage.setItem(PLAYER_LOCAL_PLAYER_ID_KEY, localPlayerId);
  }
  setPlayerId(localPlayerId);
  window.localStorage.setItem(PLAYER_SESSION_MODE_KEY, 'local');
  window.localStorage.setItem(PLAYER_AUTH_PROVIDER_KEY, 'guest');
  setPlayerName(savedUsername);
  return { ok: true as const };
}

export function signOutPlayer() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_SESSION_MODE_KEY);
  window.localStorage.removeItem(PLAYER_AUTH_PROVIDER_KEY);
  window.localStorage.removeItem(PLAYER_GOOGLE_PROFILE_KEY);
  window.localStorage.removeItem(PLAYER_AVATAR_URL_KEY);
  window.localStorage.removeItem(PLAYER_NAME_KEY);
}

export function resetAllLocalAccountData() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_NAME_KEY);
  window.localStorage.removeItem(PLAYER_AUTH_PROVIDER_KEY);
  window.localStorage.removeItem(PLAYER_GOOGLE_PROFILE_KEY);
  window.localStorage.removeItem(PLAYER_AVATAR_URL_KEY);
  window.localStorage.removeItem(PLAYER_SESSION_MODE_KEY);
  window.localStorage.removeItem(PLAYER_LOCAL_USERNAME_KEY);
  window.localStorage.removeItem(PLAYER_LOCAL_PASSWORD_KEY);
  window.localStorage.removeItem(PLAYER_LOCAL_PLAYER_ID_KEY);
}
