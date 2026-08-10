import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHAPTER_ONE } from '../narrative/chapter-one';
import { useStory } from '../narrative/story-state';
import { StoryDialog } from './StoryDialog';
import { CodexPanel } from './CodexPanel';
import { useGame } from '../store/game';

export function NarrativeCampaign(){
 const go=useNavigate();
 const playerName=useGame(s=>s.playerName);
 const campaignChapter=useGame(s=>s.campaignChapter);
 const completeDuel=useStory(s=>s.completeDuel);
 const [scene,setScene]=useState<number|null>(null);
 const [codex,setCodex]=useState(false);
 if(codex)return <><button className="secondary" onClick={()=>setCodex(false)}>← Campagne</button><CodexPanel/></>;
 const active=scene===null?null:CHAPTER_ONE[scene];
 return <section className="narrative-campaign"><header><small>CHRONIQUES D'ELYNDRA</small><h2>La Fracture du Nexus</h2><p>Des forêts de la Meute aux tombeaux sans nom, chaque faction possède un morceau différent de la vérité.</p><button className="secondary" onClick={()=>setCodex(true)}>Chroniques d’Elyndra</button></header><div className="chapter-list">{CHAPTER_ONE.map((duel,index)=>{const locked=index>campaignChapter;const done=index<campaignChapter;return <article key={duel.id} className={'chapter '+(locked?'locked':'')}><span className="number">{String(index+1).padStart(2,'0')}</span><div className="chapter-body"><b>{duel.title}</b><small>{done?'Scène et duel terminés':locked?'Poursuis l’histoire pour déverrouiller ce chapitre':'Cinématique BD · Duel '+duel.faction}</small></div><button disabled={locked} onClick={()=>setScene(index)}>{done?'Rejouer':'Commencer'}</button></article>})}</div>{active&&<StoryDialog sceneId={`story-${active.id}`} lines={active.lines} playerName={playerName} onClose={()=>setScene(null)} onComplete={()=>{completeDuel(active.id,active.rewardCodex);go('/combat',{state:{chapterId:active.id,narrativeDuelId:active.id}})}}/>}</section>;
}
