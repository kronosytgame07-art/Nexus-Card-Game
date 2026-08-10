import type { CombatTrigger, StoryCharacterId } from './types';

/**
 * Répliques courtes déclenchées par le combat. Le lecteur de banter gère
 * cooldown/priorité : ici on privilégie plusieurs variantes par événement
 * pour éviter l'impression d'un PNJ qui répète toujours la même phrase.
 */
export const COMBAT_BANTER: Partial<Record<StoryCharacterId, Partial<Record<CombatTrigger, string[]>>>> = {
  lyra: {
    first_summon: [
      'Ton fragment réagit à tes pensées. Donne-lui un ordre.',
      'Ne force pas le Nexus. Écoute-le.',
    ],
    first_damage: [
      'Bien. Maintenant regarde comment ton adversaire répond.',
      'Un coup ne décide jamais d’une chasse.',
    ],
    big_damage: [
      'Ça, même la forêt l’a senti.',
      'Tu apprends vite. Un peu trop vite.',
    ],
    player_low_hp: [
      'Respire. Les bêtes les plus dangereuses sont celles qu’on croit acculées.',
      'Tu es encore debout. Alors le duel n’est pas fini.',
    ],
    enemy_low_hp: [
      'Ne te précipite pas. C’est là qu’on commet les erreurs.',
      'La piste se referme. Termine proprement.',
    ],
    evolution: [
      'Attends. Cette résonance ne devrait pas être possible.',
      'Encore cette lumière… Qui t’a appris à faire ça ?',
    ],
    mythic_summon: [
      'Le Nexus vient de changer de rythme.',
      'Je n’aime pas ce que cette présence réveille.',
    ],
    direct_attack: [
      'L’impact traverse tout le terrain.',
      'Tu l’as frappé au cœur de sa ligne.',
    ],
    board_wipe: [
      'Plus rien ne bouge… pour l’instant.',
      'Tu viens d’effacer toute une chasse en un instant.',
    ],
    victory: [
      'Tu n’es pas un simple voyageur.',
      'D’accord. Je commence à comprendre pourquoi le fragment t’a choisi.',
    ],
    defeat: [
      'Perdre n’efface pas ce que j’ai vu.',
      'Relève-toi. J’ai encore beaucoup trop de questions.',
    ],
  },
  kael: {
    first_summon: [
      'Une ouverture correcte. Voyons ta seconde décision.',
      'Formation propre. Ne la gaspille pas.',
    ],
    first_damage: [
      'Tu sais donc lire une ligne de bataille.',
      'Premier sang. Maintenant commence le vrai duel.',
    ],
    big_damage: [
      'Je t’ai sous-estimé.',
      'Cette frappe aurait brisé une porte de Valdoren.',
    ],
    player_low_hp: [
      'Tu peux encore abandonner avec honneur.',
      'Ta garde s’effondre. Montre-moi ce qu’il te reste.',
    ],
    enemy_low_hp: [
      'Très bien. Plus besoin de retenir mes coups.',
      'Tu m’as poussé jusqu’au dernier rang.',
    ],
    evolution: [
      'Même les Archives ne décrivent pas cela.',
      'Encore… Cette résonance n’est pas normale.',
    ],
    mythic_summon: [
      'Cette présence n’appartient à aucun registre du Royaume.',
      'Si les Archives ont caché cela, qu’ont-elles caché d’autre ?',
    ],
    direct_attack: [
      'La ligne est ouverte. Une erreur coûte cher.',
      'Impact direct. Je ne te laisserai pas le même passage deux fois.',
    ],
    board_wipe: [
      'Toute la formation… balayée.',
      'Une armée entière peut disparaître sur une seule décision.',
    ],
    victory: [
      'Victoire méritée. Je n’accorde pas ce compliment souvent.',
      'Je comprends maintenant pourquoi Lyra t’a amené jusqu’ici.',
    ],
    defeat: [
      'La discipline ne garantit pas la victoire. Seulement le droit d’apprendre.',
      'Cette manche est à toi. Pas mes convictions.',
    ],
  },
  gribz: {
    first_summon: [
      'La quantité est une forme de qualité !',
      'Plan numéro un : poser des trucs. Beaucoup de trucs.',
    ],
    first_damage: [
      'HA ! C’était calibré. À peu près.',
      'Tu vois ? La science. Avec un peu plus de fumée.',
    ],
    big_damage: [
      'Ouh. Ça, j’aurais dû le breveter.',
      'Note mentale : construire quelque chose qui fait exactement ça.',
    ],
    player_low_hp: [
      'Si tu comptes exploser, préviens-moi. J’ai du matériel fragile.',
      'Techniquement, tant qu’il te reste un point de vie, mon plan fonctionne.',
    ],
    enemy_low_hp: [
      'Je propose qu’on appelle ça une victoire scientifique imminente.',
      'Il tient encore ? J’avais mis la grosse charge pourtant.',
    ],
    evolution: [
      'Ohhh. Ça brille ET ça devient plus dangereux. J’adore.',
      'Attends, ne bouge plus ! Je dois mesurer… tout ça.',
    ],
    mythic_summon: [
      'Bon. Ça, même moi je vais éviter de démonter pour voir dedans.',
      'Je retire ce que j’ai dit : on est peut-être légèrement en danger.',
    ],
    direct_attack: [
      'TOUCHÉ ! Le sol aussi, apparemment.',
      'J’espère que personne comptait récupérer la caution de cette arène.',
    ],
    board_wipe: [
      "J'commence à manquer de remplaçables.",
      'Très joli. Très destructeur. Très mauvais pour mon inventaire.',
    ],
    victory: [
      'Victoire parfaitement planifiée ! Ne vérifie surtout pas mes notes.',
      'Et voilà. Science, talent, chance… surtout talent.',
    ],
    defeat: [
      'Ça devait faire ça. Enfin, presque.',
      'Je demande officiellement une revanche après reconstruction du matériel.',
    ],
  },
  rakh: {
    first_summon: [
      'Une armée révèle son chef dès le premier ordre.',
      'Montre-moi si tu commandes… ou si tu espères.',
    ],
    first_damage: [
      'Bien. Tu n’es pas venu parler derrière un bouclier.',
      'Un vrai coup. Enfin.',
    ],
    big_damage: [
      'Voilà une force que je peux respecter.',
      'Les royaumes auraient déjà sonné la retraite.',
    ],
    player_low_hp: [
      'La douleur ne décide rien. Ta prochaine décision, oui.',
      'Debout. Je ne combats pas les souvenirs.',
    ],
    enemy_low_hp: [
      'Tu crois me voir faiblir ? Regarde mieux.',
      'C’est maintenant que commence la partie intéressante.',
    ],
    evolution: [
      'Le fragment t’obéit sans te dévorer… intéressant.',
      'J’ai vu des guerriers mourir pour moins de puissance que ça.',
    ],
    mythic_summon: [
      'Même les tambours se sont tus.',
      'Cette chose porte une guerre plus ancienne que nos clans.',
    ],
    direct_attack: [
      'Le terrain garde la cicatrice. Moi aussi.',
      'Bon impact. Maintenant encaisse le retour.',
    ],
    board_wipe: [
      'Plus de lignes. Plus d’excuses.',
      'Tu as vidé le champ. Alors viens me chercher.',
    ],
    victory: [
      'Tu as gagné mon attention. C’est plus rare que ma défaite.',
      'La force sans lucidité ne vaut rien. Tu as montré les deux.',
    ],
    defeat: [
      'Mémorise cette victoire. La prochaine te coûtera davantage.',
      'Bien. J’avais besoin de savoir jusqu’où tu pouvais aller.',
    ],
  },
  vaeloryx: {
    first_summon: [
      'De si jeunes échos… portés par une volonté si ancienne.',
      'Tu appelles ces créatures comme les Liés d’autrefois.',
    ],
    first_damage: [
      'La douleur est une langue que le Nexus n’a jamais oubliée.',
      'Chaque choc réveille un souvenir sous cette pierre.',
    ],
    big_damage: [
      'Oui… cette puissance-là, je m’en souviens.',
      'La montagne reconnaît ton impact.',
    ],
    player_low_hp: [
      'Les Liés d’autrefois survivaient précisément à cet instant.',
      'Ton corps faiblit. Ta résonance, elle, grandit.',
    ],
    enemy_low_hp: [
      'Tu approches d’une victoire dont tu ignores encore le prix.',
      'Frappe, si tu le dois. Mais observe ce qui répond.',
    ],
    evolution: [
      'Cette lumière… je ne l’avais pas vue depuis la Fracture.',
      'Tu ouvres des chemins que le monde avait refermés.',
    ],
    mythic_summon: [
      'Silence. Quelque chose, derrière le Nexus, vient de t’entendre.',
      'Une présence oubliée prononce ton nom sans voix.',
    ],
    direct_attack: [
      'La pierre se fissure. Elle se souviendra de toi.',
      'Les arènes modernes sont fragiles. Comme leurs certitudes.',
    ],
    board_wipe: [
      'J’ai déjà vu un ciel devenir vide ainsi.',
      'La Fracture aussi commença par un silence après la lumière.',
    ],
    victory: [
      'Un Lié… après tout ce temps.',
      'Ta victoire confirme ce que je craignais.',
    ],
    defeat: [
      'Tu n’étais pas prêt pour la vérité. Peut-être est-ce une chance.',
      'Reviens lorsque le Nexus cessera de trembler dans ta main.',
    ],
  },
};
