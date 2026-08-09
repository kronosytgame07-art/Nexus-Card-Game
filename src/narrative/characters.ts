import type { StoryCharacter } from './types';
const portrait = (id: string) => `${import.meta.env.BASE_URL}portraits/${id}.png`;
export const STORY_CHARACTERS: Record<string, StoryCharacter> = {
  lyra: { id:'lyra', name:'Lyra Croc-de-Lune', faction:'Meute', role:'Gardienne de la Meute', description:'Méfiance vive, humour sec et un savoir ancien qu’elle garde sous silence.', portrait:portrait('lyra') },
  kael: { id:'kael', name:'Kael Varenn', faction:'Chevalier', role:'Chevalier de Valdoren', description:'Loyal au royaume, mais assez honnête pour douter de ses archives.', portrait:portrait('kael') },
  gribz: { id:'gribz', name:'Gribz Trois-Mèches', faction:'Gobelin', role:'Inventeur et contrebandier', description:'Génie bruyant, opportuniste et beaucoup plus lucide qu’il ne le prétend.', portrait:portrait('gribz') },
  rakh: { id:'rakh', name:'Rakh Mordent', faction:'Orc', role:'Chef de guerre', description:'Un stratège que les royaumes préfèrent réduire à sa force.', portrait:portrait('rakh') },
  vaeloryx: { id:'vaeloryx', name:'Vaeloryx', faction:'Dragon', role:'Dragon ancien', description:'Témoin de la Fracture, gardien d’une vérité incomplète.', portrait:portrait('vaeloryx') },
};
