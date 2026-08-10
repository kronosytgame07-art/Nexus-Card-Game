import { useEffect, useState, type CSSProperties } from 'react';
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

 // Les archives du Codex suivent les vraies victoires de campagne : regarder
 // une cinématique ne suffit plus à déverrouiller sa récompense narrative.
 useEffect(()=>{
   CHAPTER_ONE.filter(duel=>duel.id<campaignChapter).forEach(duel=>completeDuel(duel.id,duel.rewardCodex));
 },[campaignChapter,completeDuel]);

 if(codex)return <><button className="secondary" onClick={()=>setCodex(false)}>← Campagne</button><CodexPanel/></>;
 const active=scene===null?null:CHAPTER_ONE[scene];
 return <section className="narrative-campaign cinematic-campaign">
   <header className="cinematic-campaign-hero">
     <small>CHRONIQUES D'ELYNDRA</small>
     <h2>La Fracture du Nexus</h2>
     <p>Une campagne mise en scène comme un vrai jeu : plans animés, personnages, atmosphères, choix de réponses et transitions directes vers les duels.</p>
     <div className="campaign-feature-row"><span>🎬 Cinématiques 2.5D</span><span>💬 Choix de dialogue</span><span>⚔ 6 factions</span><span>📜 Codex vivant</span></div>
     <button className="secondary" onClick={()=>setCodex(true)}>Chroniques d’Elyndra</button>
   </header>
   <div className="chapter-list cinematic-chapter-list">
    {CHAPTER_ONE.map((duel,index)=>{
      const locked=index>campaignChapter;
      const done=index<campaignChapter;
      const art=duel.lines[0]?.panel;
      return <article key={duel.id} className={'chapter cinematic-chapter '+(locked?'locked ':'')+(done?'done':'')} style={{'--chapter-art':`url(${art})`} as CSSProperties}>
        <span className="chapter-art" aria-hidden="true"/>
        <span className="number">{String(index+1).padStart(2,'0')}</span>
        <div className="chapter-body"><small className="chapter-faction">{duel.faction.toUpperCase()}</small><b>{duel.title}</b><small>{done?'✓ Scène et duel terminés':locked?'🔒 Poursuis l’histoire':'🎬 Cinématique 2.5D · Duel '+duel.faction}</small></div>
        <button disabled={locked} onClick={()=>setScene(index)}>{done?'Rejouer':'Commencer'}</button>
      </article>
    })}
   </div>
   {active&&<StoryDialog sceneId={`story-${active.id}`} lines={active.lines} playerName={playerName} onClose={()=>setScene(null)} onComplete={()=>go('/combat',{state:{chapterId:active.id,narrativeDuelId:active.id}})}/>} 
 </section>;
}
