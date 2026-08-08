import { CardDef } from './types';

/**
 * Règles de ciblage de combat partagées par le joueur et l'IA.
 *
 * Vol : une unité Vol ne peut être combattue que par une unité À distance.
 * À distance : archers, projectiles ou magie offensive capables d'atteindre Vol.
 *
 * Cette fonction ne gère volontairement pas Provocation : elle répond uniquement
 * à la question "cet attaquant peut-il physiquement combattre cette cible ?".
 * Le moteur combine ensuite cette règle avec Provocation et les autres contraintes.
 */
export function canFightTarget(attacker: CardDef, target: CardDef): boolean {
  if (target.flying && !attacker.ranged) return false;
  return true;
}

/** Retourne les défenseurs physiquement atteignables par l'attaquant. */
export function reachableCombatTargets(attacker: CardDef, defenders: CardDef[]): CardDef[] {
  return defenders.filter((target) => canFightTarget(attacker, target));
}

/** Libellés destinés aux infobulles/UI. */
export const KEYWORD_RULES = {
  flying: "Vol — Cette unité ne peut être combattue que par une unité À distance.",
  ranged: "À distance — Cette unité peut combattre les unités Vol.",
  blitz: "Blitz — Cette unité peut attaquer dès le tour où elle est invoquée.",
} as const;
