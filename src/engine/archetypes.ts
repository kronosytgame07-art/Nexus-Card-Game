import type { Faction } from './types';

export interface ArchetypeIdentity {
  faction: Faction;
  title: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export const ARCHETYPE_IDENTITIES: Record<Faction, ArchetypeIdentity> = {
  Meute: {
    faction: 'Meute',
    title: 'Instinct de Meute',
    summary: 'Les loups gagnent en puissance lorsqu’ils combattent ensemble, avec un bonus volontairement plafonné pour éviter l’emballement.',
    strengths: ['Synergie de terrain', 'Pression collective', 'Contrôle léger'],
    weaknesses: ['Perd en puissance si le terrain est nettoyé', 'Bonus d’attaque plafonné à +2 par unité'],
  },
  Chevalier: {
    faction: 'Chevalier',
    title: 'Rang Sacré',
    summary: 'Les Chevaliers construisent une formation stable : plus ils occupent le terrain, plus les renforts deviennent faciles à déployer.',
    strengths: ['Formation', 'Protection', 'Coûts réduits par présence alliée'],
    weaknesses: ['Dépend de la présence sur le terrain', 'Moins explosif sans installation'],
  },
  Orc: {
    faction: 'Orc',
    title: 'Fureur Sauvage',
    summary: 'Les Orcs deviennent plus dangereux lorsqu’ils sont blessés et passent sous la moitié de leurs points de vie.',
    strengths: ['Très bons échanges de combat', 'Puissance sous pression', 'Dégâts directs'],
    weaknesses: ['Doit accepter de prendre des risques', 'Fragile face au contrôle et aux exécutions'],
  },
  Dragon: {
    faction: 'Dragon',
    title: 'Inertie Draconique',
    summary: 'Les gros Dragons coûtent cher et doivent attendre deux tours avant d’attaquer, mais leurs statistiques et évolutions compensent cette lenteur.',
    strengths: ['Statistiques massives', 'Évolutions dévastatrices', 'Très fort en fin de partie'],
    weaknesses: ['Déploiement lent', 'Gros Dragons inactifs pendant 2 tours', 'Coûts élevés en runes'],
  },
  Gobelin: {
    faction: 'Gobelin',
    title: 'Ruée de la Horde',
    summary: 'Les Gobelins sont des unités légères presque toutes dotées de Blitz, capables de s’appeler depuis le deck pour former rapidement un essaim.',
    strengths: ['Blitz', 'Invocations spéciales depuis le deck', 'Pression immédiate'],
    weaknesses: ['Très faibles ATK/PV', 'Évolutions difficiles à atteindre', 'Vulnérable aux dégâts de zone'],
  },
  Squelette: {
    faction: 'Squelette',
    title: 'Légion Éternelle',
    summary: 'Les Squelettes transforment leur fosse en réserve de guerre : leurs prêtres, oracles et liches réaniment les unités tombées pour épuiser l’adversaire.',
    strengths: ['Réanimation depuis la fosse', 'Endurance', 'Invocations en chaîne'],
    weaknesses: ['Dépend de la fosse', 'Départs plus lents', 'Terrain limité à trois unités'],
  },
};

export function archetypeIdentity(faction: Faction): ArchetypeIdentity {
  return ARCHETYPE_IDENTITIES[faction];
}
