import { Faction, GameState } from './types';

export interface ChapterDef {
  id: number;
  title: string;
  opponentFaction: Faction;
  aiDifficulty: GameState['aiDifficulty'];
  enemyLifeBonus: number;
  reward: number;
}

// Progression pensée pour monter en puissance sans devenir injuste :
// deux chapitres par niveau d'IA, la vie adverse augmente à chaque étape.
// La rotation fait désormais découvrir les cinq factions jouables au lieu
// de concentrer presque toute la campagne sur Chevalier et Meute.
export const CHAPTERS: ChapterDef[] = [
  { id: 0, title: 'Le serment brisé', opponentFaction: 'Chevalier', aiDifficulty: 'novice', enemyLifeBonus: 0, reward: 40 },
  { id: 1, title: 'La route des crocs', opponentFaction: 'Meute', aiDifficulty: 'novice', enemyLifeBonus: 2, reward: 45 },
  { id: 2, title: 'Les archives éventrées', opponentFaction: 'Gobelin', aiDifficulty: 'veteran', enemyLifeBonus: 4, reward: 55 },
  { id: 3, title: 'Les cendres du clan', opponentFaction: 'Orc', aiDifficulty: 'veteran', enemyLifeBonus: 6, reward: 60 },
  { id: 4, title: 'L’œil dans la montagne', opponentFaction: 'Dragon', aiDifficulty: 'veteran', enemyLifeBonus: 8, reward: 70 },
  { id: 5, title: 'Le palais sous la brume', opponentFaction: 'Meute', aiDifficulty: 'maitre', enemyLifeBonus: 10, reward: 85 },
  { id: 6, title: 'La Reine effacée', opponentFaction: 'Chevalier', aiDifficulty: 'maitre', enemyLifeBonus: 14, reward: 120 },
  { id: 7, title: 'Les tambours de guerre', opponentFaction: 'Orc', aiDifficulty: 'maitre', enemyLifeBonus: 16, reward: 130 },
  { id: 8, title: 'Le Tyran des cieux', opponentFaction: 'Dragon', aiDifficulty: 'maitre', enemyLifeBonus: 20, reward: 150 },
];

export function chapterById(id: number): ChapterDef {
  return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, id))];
}
