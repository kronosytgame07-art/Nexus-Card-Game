import type { StoryCharacter } from './types';
const portrait = (id: string) => `${import.meta.env.BASE_URL}portraits/${id}.png`;
export const STORY_CHARACTERS: Record<string, StoryCharacter> = {
  lyra: { id:'lyra', name:'Lyra Croc-de-Lune', faction:'Meute', role:'Gardienne de la Meute', description:'Méfiance vive, humour sec et un savoir ancien qu’elle garde sous silence.', portrait:portrait('lyra') },
  kael: { id:'kael', name:'Kael Varenn', faction:'Chevalier', role:'Chevalier de Valdoren', description:'Loyal au royaume, mais assez honnête pour douter de ses archives.', portrait:portrait('kael') },
  gribz: { id:'gribz', name:'Gribz Trois-Mèches', faction:'Gobelin', role:'Inventeur et contrebandier', description:'Génie bruyant, opportuniste et beaucoup plus lucide qu’il ne le prétend.', portrait:portrait('gribz') },
  rakh: { id:'rakh', name:'Rakh Mordent', faction:'Orc', role:'Chef de guerre des Cendres', description:'Stratège redoutable, protecteur de son clan et convaincu que les royaumes préparent une nouvelle guerre.', portrait:portrait('rakh') },
  vaeloryx: { id:'vaeloryx', name:'Vaeloryx', faction:'Dragon', role:'Dragon ancien', description:'Témoin de la Fracture, gardien d’une vérité incomplète et l’un des rares êtres à reconnaître les Liés.', portrait:portrait('vaeloryx') },
  morvane: { id:'morvane', name:'Morvane, Roi des Sans-Nom', faction:'Squelette', role:'Souverain de la Légion Éternelle', description:'Un roi mort qui se souvient de vies que l’Histoire a effacées. Il ne cherche pas la destruction : il exige que les morts soient enfin entendus.', portrait:portrait('morvane') },
};
