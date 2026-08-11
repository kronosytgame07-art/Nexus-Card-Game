import type { StoryCharacter } from './types';

const chapterPortrait = (name: string) => `${import.meta.env.BASE_URL}story/chapter-1/${name}.png`;
const cinematicPortrait = (name: string) => `${import.meta.env.BASE_URL}story/cinematics/${name}.svg`;

// Ces portraits réutilisent les illustrations panoramiques des scènes (pas de gros
// plan dédié) : object-position cadre chaque crop rond sur le vrai visage du
// personnage dans l'image plutôt que sur le centre géométrique (une arme, un
// décor...). Valeurs mesurées à l'oeil sur chaque source, à ajuster si l'image change.
export const STORY_CHARACTERS: Record<string, StoryCharacter> = {
  lyra: { id:'lyra', name:'Lyra Croc-de-Lune', faction:'Meute', role:'Gardienne de la Meute', description:'Méfiance vive, humour sec et un savoir ancien qu’elle garde sous silence.', portrait:chapterPortrait('scene-02-lyra-warning'), portraitPosition:'22% 18%' },
  kael: { id:'kael', name:'Kael Varenn', faction:'Chevalier', role:'Chevalier de Valdoren', description:'Loyal au royaume, mais assez honnête pour douter de ses archives.', portrait:chapterPortrait('scene-04-kael-interrogation'), portraitPosition:'64% 10%' },
  gribz: { id:'gribz', name:'Gribz Trois-Mèches', faction:'Gobelin', role:'Inventeur et contrebandier', description:'Génie bruyant, opportuniste et beaucoup plus lucide qu’il ne le prétend.', portrait:chapterPortrait('scene-07-gribz-wrong-room'), portraitPosition:'17% 25%' },
  rakh: { id:'rakh', name:'Rakh Mordent', faction:'Orc', role:'Chef de guerre des Cendres', description:'Stratège redoutable, protecteur de son clan et convaincu que les royaumes préparent une nouvelle guerre.', portrait:cinematicPortrait('orcs-arrival'), portraitPosition:'50% 22%' },
  vaeloryx: { id:'vaeloryx', name:'Vaeloryx', faction:'Dragon', role:'Dragon ancien', description:'Témoin de la Fracture, gardien d’une vérité incomplète et l’un des rares êtres à reconnaître les Liés.', portrait:cinematicPortrait('dragon-awakening'), portraitPosition:'50% 22%' },
  morvane: { id:'morvane', name:'Morvane, Roi des Sans-Nom', faction:'Squelette', role:'Souverain de la Légion Éternelle', description:'Un roi mort qui se souvient de vies que l’Histoire a effacées. Il ne cherche pas la destruction : il exige que les morts soient enfin entendus.', portrait:cinematicPortrait('morvane-tomb'), portraitPosition:'50% 22%' },
};
