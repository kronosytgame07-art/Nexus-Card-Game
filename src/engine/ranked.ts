export type RankedTier =
  | 'Aspirant du Nexus'
  | 'Éclaireur des Failles'
  | 'Gardien des Runes'
  | 'Champion du Nexus'
  | 'Maître des Évosphères'
  | 'Seigneur des Failles'
  | 'Légende du Nexus';

export interface RankedRank {
  tier: RankedTier;
  division: 1 | 2 | 3;
  minRating: number;
  maxRating: number | null;
}

/**
 * Échelle classée commune à tous les archétypes : le rang représente le statut
 * du duelliste dans le lore du Nexus, jamais la faction qu'il joue.
 * Les six premiers rangs ont 3 divisions ; Légende du Nexus est un palier ouvert.
 */
export const RANKED_LADDER: RankedRank[] = [
  { tier: 'Aspirant du Nexus', division: 3, minRating: 0, maxRating: 99 },
  { tier: 'Aspirant du Nexus', division: 2, minRating: 100, maxRating: 199 },
  { tier: 'Aspirant du Nexus', division: 1, minRating: 200, maxRating: 299 },
  { tier: 'Éclaireur des Failles', division: 3, minRating: 300, maxRating: 399 },
  { tier: 'Éclaireur des Failles', division: 2, minRating: 400, maxRating: 499 },
  { tier: 'Éclaireur des Failles', division: 1, minRating: 500, maxRating: 599 },
  { tier: 'Gardien des Runes', division: 3, minRating: 600, maxRating: 699 },
  { tier: 'Gardien des Runes', division: 2, minRating: 700, maxRating: 799 },
  { tier: 'Gardien des Runes', division: 1, minRating: 800, maxRating: 899 },
  { tier: 'Champion du Nexus', division: 3, minRating: 900, maxRating: 999 },
  { tier: 'Champion du Nexus', division: 2, minRating: 1000, maxRating: 1099 },
  { tier: 'Champion du Nexus', division: 1, minRating: 1100, maxRating: 1199 },
  { tier: 'Maître des Évosphères', division: 3, minRating: 1200, maxRating: 1299 },
  { tier: 'Maître des Évosphères', division: 2, minRating: 1300, maxRating: 1399 },
  { tier: 'Maître des Évosphères', division: 1, minRating: 1400, maxRating: 1499 },
  { tier: 'Seigneur des Failles', division: 3, minRating: 1500, maxRating: 1599 },
  { tier: 'Seigneur des Failles', division: 2, minRating: 1600, maxRating: 1699 },
  { tier: 'Seigneur des Failles', division: 1, minRating: 1700, maxRating: 1799 },
  { tier: 'Légende du Nexus', division: 1, minRating: 1800, maxRating: null },
];

export const DEFAULT_RANKED_RATING = 0;

export function rankForRating(rating: number): RankedRank {
  const safeRating = Math.max(0, Math.floor(rating));
  return [...RANKED_LADDER].reverse().find((rank) => safeRating >= rank.minRating) ?? RANKED_LADDER[0];
}

/**
 * Variation simple et déterministe adaptée à une première version testable.
 * Le backend pourra remplacer cette fonction par Elo/Glicko plus tard sans
 * changer l'affichage des rangs.
 */
export function rankedRatingDelta(win: boolean, currentRating: number): number {
  const rank = rankForRating(currentRating);
  if (win) return rank.tier === 'Légende du Nexus' ? 18 : 25;
  // Protection légère des nouveaux joueurs : on perd moins avant Gardien.
  if (currentRating < 600) return -12;
  return -20;
}

export function applyRankedResult(currentRating: number, win: boolean): number {
  return Math.max(0, currentRating + rankedRatingDelta(win, currentRating));
}

export function formatRank(rank: RankedRank): string {
  return rank.tier === 'Légende du Nexus' ? rank.tier : `${rank.tier} ${rank.division}`;
}
