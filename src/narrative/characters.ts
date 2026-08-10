import type { StoryCharacter } from './types';

const chapterPortrait = (name: string) => `${import.meta.env.BASE_URL}story/chapter-1/${name}.png`;
const cinematicPortrait = (name: string) => `${import.meta.env.BASE_URL}story/cinematics/${name}.svg`;

export const STORY_CHARACTERS: Record<string, StoryCharacter> = {
  lyra: { id:'lyra', name:'Lyra Croc-de-Lune', faction:'Meute', role:'Gardienne de la Meute', description:'Méfiance vive, humour sec et un savoir ancien qu’elle garde sous silence.', portrait:chapterPortrait('scene-02-lyra-warning') },
  kael: { id:'kael', name:'Kael Varenn', faction:'Chevalier', role:'Chevalier de Valdoren', description:'Loyal au royaume, mais assez honnête pour douter de ses archives.', portrait:chapterPortrait('scene-04-kael-interrogation') },
  gribz: { id:'gribz', name:'Gribz Trois-Mèches', faction:'Gobelin', role:'Inventeur et contrebandier', description:'Génie bruyant, opportuniste et beaucoup plus lucide qu’il ne le prétend.', portrait:chapterPortrait('scene-07-gribz-wrong-room') },
  rakh: { id:'rakh', name:'Rakh Mordent', faction:'Orc', role:'Chef de guerre des Cendres', description:'Stratège redoutable, protecteur de son clan et convaincu que les royaumes préparent une nouvelle guerre.', portrait:cinematicPortrait('orcs-arrival') },
  vaeloryx: { id:'vaeloryx', name:'Vaeloryx', faction:'Dragon', role:'Dragon ancien', description:'Témoin de la Fracture, gardien d’une vérité incomplète et l’un des rares êtres à reconnaître les Liés.', portrait:cinematicPortrait('dragon-awakening') },
  morvane: { id:'morvane', name:'Morvane, Roi des Sans-Nom', faction:'Squelette', role:'Souverain de la Légion Éternelle', description:'Un roi mort qui se souvient de vies que l’Histoire a effacées. Il ne cherche pas la destruction : il exige que les morts soient enfin entendus.', portrait:cinematicPortrait('morvane-tomb') },
};
