// @ts-nocheck
export const AVATAR_COLORS = ['#3B5BDB', '#C8202C', '#12A06B', '#8B5CF6', '#D97706', '#0284C7'];
export function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }
export function getInitials(name) {
  return String(name || 'AY')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('') || 'AY';
}
