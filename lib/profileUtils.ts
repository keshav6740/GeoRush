/**
 * Shared profile-related utility functions.
 * Extracted to avoid duplication across profile page and PlayerProgressPanel.
 */

export function heatColor(value: number): string {
    if (value <= 0) return 'bg-[#eef2f7]';
    if (value === 1) return 'bg-[#b8f2d2]';
    if (value <= 3) return 'bg-[#72e2ad]';
    if (value <= 6) return 'bg-[#2fbb86]';
    return 'bg-[#13855e]';
}

export function lastNDaysIso(days: number): string[] {
    const out: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        out.push(d.toISOString().slice(0, 10));
    }
    return out;
}

export function toLabel(id: string): string {
    return id
        .replaceAll('-', ' ')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
}
