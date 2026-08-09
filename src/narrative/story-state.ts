import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DialogueTone, StoryCharacterId } from './types';

type StoryState = { completedScenes:string[]; completedDuels:number[]; codex:string[]; choices:Record<string,DialogueTone>; heroicScore:number; sarcasticScore:number; pragmaticScore:number; affinity:Partial<Record<StoryCharacterId,number>>; choose:(scene:string,tone:DialogueTone, affinity?:Partial<Record<StoryCharacterId,number>>)=>void; completeDuel:(id:number,codex:string[])=>void; };
export const useStory = create<StoryState>()(persist((set)=>({
 completedScenes:[], completedDuels:[], codex:['nexus'], choices:{}, heroicScore:0, sarcasticScore:0, pragmaticScore:0, affinity:{},
 choose:(scene,tone,affinity={})=>set(s=>({choices:{...s.choices,[scene]:tone},heroicScore:s.heroicScore+(tone==='heroic'?1:0),sarcasticScore:s.sarcasticScore+(tone==='sarcastic'?1:0),pragmaticScore:s.pragmaticScore+(tone==='pragmatic'?1:0),affinity:{...s.affinity,...Object.fromEntries(Object.entries(affinity).map(([id,value])=>[id,(s.affinity[id as StoryCharacterId]??0)+(value??0)]))}})),
 completeDuel:(id,codex)=>set(s=>({completedDuels:[...new Set([...s.completedDuels,id])],codex:[...new Set([...s.codex,...codex])]})),
}),{name:'nexus-story-v1'}));
