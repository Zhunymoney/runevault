export function xpForLevel(level: number) {
  const bounded = Math.max(1, Math.min(126, Math.trunc(level)));
  let points = 0;
  for (let value = 1; value < bounded; value++) points += Math.floor(value + 300 * 2 ** (value / 7));
  return Math.floor(points / 4);
}

export function levelForXp(xp: number) {
  const bounded = Math.max(0, Math.min(200_000_000, Math.trunc(xp)));
  let level = 1;
  while (level < 126 && xpForLevel(level + 1) <= bounded) level += 1;
  return level;
}

export function combatLevel(stats: { attack: number; strength: number; defence: number; hitpoints: number; prayer: number; ranged: number; magic: number }) {
  const level = (value: number) => Math.max(1, Math.min(99, Math.trunc(value) || 1));
  const base = 0.25 * (level(stats.defence) + level(stats.hitpoints) + Math.floor(level(stats.prayer) / 2));
  const melee = 0.325 * (level(stats.attack) + level(stats.strength));
  const ranged = 0.325 * Math.floor(level(stats.ranged) * 1.5);
  const magic = 0.325 * Math.floor(level(stats.magic) * 1.5);
  return Math.floor(base + Math.max(melee, ranged, magic));
}
