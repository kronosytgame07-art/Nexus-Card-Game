import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHAPTER_ONE } from '../narrative/chapter-one';
import { useStory } from '../narrative/story-state';
import { StoryDialog } from './StoryDialog';
import { CodexPanel } from './CodexPanel';
import { useGame } from '../store/game';

export function NarrativeCampaign(){
 const go=useNavigate(), playerName=useGame(s=>s.playerName), completed=useStory(s=>s.completedDuels); const [scene,setScene]=useState<number|null>(null); const [codex,setCodex]=useState(false);
 if(codex)return <><button className="secondary" onClick={()=>setCodex(false)}>← Campagne</button><CodexPanel/></>;
 const active=scene===null?null:CHAPTER_ONE[scene];
 return <section className="narrative-campaign"><header><small>CHAPITRE I</small><h2>Les Éclats du Serment</h2><p>Le Nexus s’est brisé. Dans les fragments, quelque chose se souvient de toi.</p><button className="secondary" onClick={()=>setCodex(true)}>Chroniques d’Elyndra</button></header><div className="chapter-list">{CHAPTER_ONE.map((duel,index)=>{const locked=index>0&&!completed.includes(CHAPTER_ONE[index-1].id);const done=completed.includes(duel.id);return <article key={duel.id} className={'chapter '+(locked?'locked':'')}><span className="number">0{index+1}</span><div className="chapter-body"><b>{duel.title}</b><small>{done?'Scène et duel terminés':locked?'Poursuis ton enquête':'Scène narrative · Duel '+duel.faction}</small></div><button disabled={locked} onClick={()=>setScene(index)}>{done?'Rejouer':'Commencer'}</button></article>})}</div>{active&&<StoryDialog sceneId={`chapter-1-${active.id}`} lines={active.lines} playerName={playerName} onComplete={()=>go('/combat',{state:{chapterId:active.id,narrativeDuelId:active.id}})}/>}</section>;
}
