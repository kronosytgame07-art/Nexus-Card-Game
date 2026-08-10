import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../store/game';

const DONE_KEY='nexus-tutorial-v1-complete';
const PENDING_KEY='nexus-tutorial-v1-pending';
type Step={title:string;text:string;selector?:string;event?:string;manual?:boolean};
const STEPS:Step[]=[
 {title:'Bienvenue dans Nexus Arena',text:"Je suis Lyra Croc-de-Lune. Je reste face à toi pendant ce vrai duel. Commence par ouvrir ta main.",selector:'.hand',event:'hand-open'},
 {title:'Lis ta carte',text:"Sélectionne une carte. Regarde son coût, ses statistiques et son effet avant de décider.",selector:'.hand .card',event:'card-preview'},
 {title:'Prépare ton invocation',text:"Appuie sur INVOQUER. Le Nexus te montrera les emplacements où cette unité peut entrer en jeu.",selector:'.hand-preview .primary',event:'placement-start'},
 {title:'Invoque ton unité',text:"Choisis maintenant un emplacement libre sur TON TERRAIN. Je n’avance que lorsque l’invocation a vraiment réussi.",selector:'.battle-center',event:'card-played'},
 {title:'Passe en Battle Phase',text:"Bien. Passe maintenant en BATTLE. Draw → Main → Battle → End : garde toujours cet ordre en tête.",selector:'.nexus-phases',event:'battle-phase'},
 {title:'Attaque',text:"Sélectionne une créature prête à attaquer puis sa cible. Si rien ne protège le héros adverse, frappe-le directement.",selector:'.field-card',event:'attack'},
 {title:'Comprends les piles',text:"La Fosse conserve les cartes détruites. Le Deck contient tes prochaines cartes. L’Évosphère garde les formes évoluées.",selector:'.card-pile.evo',manual:true},
 {title:'Évolutions',text:"Une créature qui survit assez longtemps peut évoluer. En Main Phase, sélectionne-la : ÉVOLUER apparaîtra quand elle sera prête.",selector:'.card-pile.evo',manual:true},
 {title:'Options du duel',text:"Le menu en haut te permet de régler musique, effets sonores, graphismes, animations et vibrations, ou de recommencer/quitter.",selector:'.battle-pause-btn',manual:true},
 {title:'À toi de jouer',text:"Tu connais l’essentiel. Je te laisse terminer cette vraie partie. Expérimente : le Nexus récompense ceux qui comprennent leurs cartes.",selector:'.battle',manual:true}
];
function highlight(selector?:string){document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));if(!selector)return;const el=document.querySelector(selector) as HTMLElement|null;if(el){el.classList.add('tutorial-focus');el.scrollIntoView?.({block:'nearest',inline:'nearest'});}}
export default function FirstRunTutorial(){
 const location=useLocation(),navigate=useNavigate(),game=useGame();const [offer,setOffer]=useState(false),[active,setActive]=useState(false),[step,setStep]=useState(0);
 const lyra=`${import.meta.env.BASE_URL}story/chapter-1/scene-02-lyra-warning.png`;const inBattle=location.pathname==='/combat';
 const shouldOffer=useMemo(()=>location.pathname==='/'&&game.factionChosen&&localStorage.getItem(DONE_KEY)!=='1',[location.pathname,game.factionChosen]);
 useEffect(()=>{if(shouldOffer)setOffer(true)},[shouldOffer]);
 useEffect(()=>{const requested=new URLSearchParams(location.search).get('tutorial')==='1'||sessionStorage.getItem(PENDING_KEY)==='1';if(inBattle&&requested&&localStorage.getItem(DONE_KEY)!=='1'){setActive(true);setStep(0);sessionStorage.removeItem(PENDING_KEY)}},[inBattle,location.search]);
 useEffect(()=>{if(!active)return;const timer=window.setTimeout(()=>highlight(STEPS[step]?.selector),80);return()=>{clearTimeout(timer);document.querySelectorAll('.tutorial-focus').forEach(n=>n.classList.remove('tutorial-focus'))}},[active,step]);
 useEffect(()=>{if(!active)return;const onProgress=(e:Event)=>{const detail=(e as CustomEvent<{type?:string}>).detail;const expected=STEPS[step]?.event;if(expected&&detail?.type===expected)setStep(v=>Math.min(STEPS.length-1,v+1));};window.addEventListener('nexus:tutorial-progress',onProgress);return()=>window.removeEventListener('nexus:tutorial-progress',onProgress)},[active,step]);
 useEffect(()=>{const skip=()=>{localStorage.setItem(DONE_KEY,'1');setActive(false);setOffer(false);highlight()};window.addEventListener('nexus:tutorial-skip',skip);return()=>window.removeEventListener('nexus:tutorial-skip',skip)},[]);
 const start=()=>{sessionStorage.setItem(PENDING_KEY,'1');setOffer(false);navigate('/combat?tutorial=1')};const skip=()=>{localStorage.setItem(DONE_KEY,'1');setOffer(false);setActive(false);highlight()};
 const next=()=>{if(step>=STEPS.length-1){localStorage.setItem(DONE_KEY,'1');setActive(false);highlight();return}setStep(v=>v+1)};
 if(offer&&!inBattle)return <div className="tutorial-offer-overlay"><section className="tutorial-offer"><img src={lyra} alt="Lyra Croc-de-Lune"/><div><small>DIDACTICIEL</small><h2>Premier duel guidé</h2><p>Lyra t’accompagne pendant une vraie partie. Le tutoriel valide tes actions réelles : invocation, phase de combat et attaque.</p><div><button className="primary" onClick={start}>Commencer le didacticiel</button><button className="secondary" onClick={()=>setOffer(false)}>Plus tard</button><button className="tutorial-skip-link" onClick={skip}>Ne plus proposer</button></div></div></section></div>;
 if(!active||!inBattle)return null;const current=STEPS[step];
 return <aside className="tutorial-coach" role="dialog" aria-live="polite"><img src={lyra} alt=""/><div className="tutorial-coach-copy"><small>LYRA CROC-DE-LUNE · {step+1}/{STEPS.length}</small><b>{current.title}</b><p>{current.text}</p><div><button className="secondary" onClick={skip}>Passer le didacticiel</button>{current.manual&&<button className="primary" onClick={next}>{step===STEPS.length-1?'Terminer':'J’ai compris'}</button>}</div></div></aside>;
}