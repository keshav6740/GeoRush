export interface LinkedGoogle {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    linkedAt: string;
}

export interface PlayerProfile {
    id: string;
    name: string;
    avatarUrl?: string;
    authProvider: 'guest' | 'google';
    linkedGoogle?: LinkedGoogle;
    gamesPlayed: number;
    bestScore: number;
    lifetimeScore: number;
    worldQuizScore: number;
    modeScores: Record<string, number>;
    countryScores: Record<string, number>;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: string | null;
    activityHeatmap: Record<string, number>;
    badges: string[];
    xp: number;
    level: number;
    levelTitle: string;
    xpIntoLevel: number;
    xpToNextLevel: number;
    nextStreakMilestone: number | null;
    streakProgressToNext: number;
    dontBreakStreakReminder: boolean;
}
