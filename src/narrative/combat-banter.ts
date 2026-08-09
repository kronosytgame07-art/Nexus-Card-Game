import type { CombatTrigger, StoryCharacterId } from './types';
export const COMBAT_BANTER: Partial<Record<StoryCharacterId, Partial<Record<CombatTrigger, string[]>>>> = {
 lyra:{ evolution:['Attends. Cette résonance ne devrait pas être possible.'], first_summon:['Ton fragment réagit à tes pensées. Donne-lui un ordre.'], victory:['Tu n’es pas un simple voyageur.'] },
 kael:{ big_damage:['Je t’ai sous-estimé.'], evolution:['Même les Archives ne décrivent pas cela.'] },
 gribz:{ first_summon:['La quantité est une forme de qualité !'], board_wipe:["J'commence à manquer de remplaçables."], defeat:['Ça devait faire ça. Enfin, presque.'] },
};
