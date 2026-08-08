import { CardDef, FieldUnit } from './types';

/**
 * Règles de ciblage de combat partagées par le joueur et l'IA.
 *
 * Vol : une unité Vol ne peut être combattue que par une unité À distance.
 * À distance : archers, projectiles ou magie offensive capables d'atteindre Vol.
 */
export function canFightTarget(attacker: CardDef, target: CardDef): boolean {
  return !target.flying || Boolean(attacker.ranged);
}

/** Retourne les défenseurs physiquement atteignables par l'attaquant. */
export function reachableCombatTargets(attacker: CardDef, defenders: CardDef[]): CardDef[] {
  return defenders.filter((target) => canFightTarget(attacker, target));
}

/** Variante pratique pour le moteur : filtre directement les unités de terrain. */
export function reachableFieldUnits(
  attacker: CardDef,
  defenders: FieldUnit[],
  getDefinition: (cardId: string) => CardDef
): FieldUnit[] {
  return defenders.filter((unit) => canFightTarget(attacker, getDefinition(unit.cardId)));
}

/**
 * Provocation ne peut bloquer une attaque que si l'attaquant peut réellement
 * atteindre l'unité qui provoque. Une Provocation volante ne verrouille donc
 * pas une unité de mêlée au sol ; une unité À distance reste obligée de la cibler.
 */
export function reachableTaunts(
  attacker: CardDef,
  defenders: FieldUnit[],
  getDefinition: (cardId: string) => CardDef
): FieldUnit[] {
  return defenders.filter(
    (unit) => unit.taunt && unit.stunnedTurns === 0 && canFightTarget(attacker, getDefinition(unit.cardId))
  );
}

/** Libellés destinés aux infobulles/UI. */
export const KEYWORD_RULES = {
  flying: 'Vol — Cette unité ne peut être combattue que par une unité À distance.',
  ranged: 'À distance — Cette unité peut combattre les unités Vol.',
  blitz: 'Blitz — Cette unité peut attaquer dès le tour où elle est invoquée.',
  taunt: 'Provocation — Les unités capables de combattre cette unité doivent la cibler en priorité.',
} as const;
