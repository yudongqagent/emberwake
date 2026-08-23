export function weightedPick<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** The 0..1 window a rarity tier rolls its quality from. Bands overlap by design —
 * a top-of-band low rarity item can beat a bottom-of-band high rarity one — while the
 * center of the band still climbs steadily with tier, so rarity remains the headline
 * signal and the individual roll is the itemization layer underneath it. */
export function qualityBandForTier(tierIndex: number, totalTiers: number): { min: number; max: number } {
  const center = totalTiers <= 1 ? 1 : tierIndex / (totalTiers - 1);
  return { min: Math.max(0, center - 0.25), max: Math.min(1, center + 0.35) };
}

/** Rolls a single instance's quality within its rarity's band. */
export function rollQuality(tierIndex: number, totalTiers: number): number {
  const { min, max } = qualityBandForTier(tierIndex, totalTiers);
  return min + Math.random() * (max - min);
}

export function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
