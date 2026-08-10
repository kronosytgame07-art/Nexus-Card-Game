import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../store/game';

const DONE_KEY='nexus-tutorial-v1-complete';
const PENDING_KEY='nexus-tutorial-v1-pending';

type Step={title:string;text:string;selector?:string;waitForClick?:boolean};
const STEPS:Step[]=[
 {title:'Bienvenue dans Nexus Arena',text:"Je suis Lyra Croc-de-Lune. Pour ce premier duel, je vais te guider. Ouvre ta main en bas de l’écran.",selector:'.hand',waitForClick:true},
 {title:'Choisis une carte',text:"Touche une carte de ta main. Tu verras son coût, ses statistiques et son effet avant de la jouer.",selector:'.hand .card',waitForClick:true},
 {title:'Invoque une unité',text:"Quand tu es prêt, utilise INVOQUER. Une invocation normale est disponible par tour.",selector:'.hand-preview .primary',waitForClick:true},
 {title:'Place-la sur le terrain',text:"Choisis maintenant un emplacement libre sur TON TERRAIN. Les zones disponibles sont mises en évidence par le jeu.",selector:'.battle-center',waitForClick:true},
 {title:'Passe en Battle Phase',text:"Quand tu as fini tes actions, passe en BATTLE. Les phases vont toujours dans l’ordre : Draw, Main, Battle, End.",selector:'.nexus-phases',waitForClick:true},
 {title:'Déclare une attaque',text:"Sélectionne une de tes créatures prête à attaquer, puis une cible adverse. Si aucun gardien ne bloque, tu peux frapper directement le héros.",selector:'.field-card',waitForClick:true},
 {title:'Les trois piles',text:"À gauche se trouve la Fosse : les cartes détruites. À droite, ton Évosphère contient les évolutions possibles, et le Deck les cartes restantes.",selector:'.card-pile.evo'},
 {title:'Évolutions',text:"Une créature qui survit assez longtemps peut évoluer. Touche-la en Main Phase : si son évolution est prête, le bouton ÉVOLUER apparaîtra.",selector:'.card-pile.evo'},
 {title:'Options de duel',text:"Le bouton menu permet de changer musique, sons, qualité graphique, animations et vibrations, ou de recommencer et quitter.",selector:'.battle-pause-btn'},
 {title:'À toi de jouer',text:"C’est tout ce qu’il te faut pour commencer. Observe les effets de tes cartes et expérimente : je te laisse finir ce duel.",selector:'.battle'}
];

function highlight(selector?:string){
 document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
 if(!selector)return null;
 const el=document.querySelector(selector) as HTMLElement|null;
 if(el){el.classList.add('tutorial-focus');el.scrollIntoView?.({block:'nearest',inline:'nearest'});}
 return el;
}

export default function FirstRunTutorial(){
 const location=useLocation(); const navigate=useNavigate(); const game=useGame();
 const [offer,setOffer]=useState(false); const [active,setActive]=useState(false); const [step,setStep]=useState(0);
 const lyra=`${import.meta.env.BASE_URL}story/chapter-1/scene-02-lyra-warning.png`;
 const inBattle=location.pathname==='/combat';
 const shouldOffer=useMemo(()=>location.pathname==='/'&&game.factionChosen&&localStorage.getItem(DONE_KEY)!=='1', [location.pathname,game.factionChosen]);
 useEffect(()=>{if(shouldOffer)setOffer(true)},[shouldOffer]);
 useEffect(()=>{
   const tutorialRequested=new URLSearchParams(location.search).get('tutorial')==='1'||sessionStorage.getItem(PENDING_KEY)==='1';
   if(inBattle&&tutorialRequested&&localStorage.getItem(DONE_KEY)!=='1'){setActive(true);setStep(0);sessionStorage.removeItem(PENDING_KEY)}
 },[inBattle,location.search]);
 useEffect(()=>{if(!active)return;const el=highlight(STEPS[step]?.selector);const s=STEPS[step];if(!s?.waitForClick||!el)return;const advance=()=>setTimeout(()=>setStep(v=>Math.min(STEPS.length-1,v+1)),120);el.addEventListener('click',advance,{once:true,capture:true});return()=>{el.removeEventListener('click',advance,true);document.querySelectorAll('.tutorial-focus').forEach(n=>n.classList.remove('tutorial-focus'))}},[active,step]);
 useEffect(()=>{const skip=()=>{localStorage.setItem(DONE_KEY,'1');setActive(false);setOffer(false);highlight()};window.addEventListener('nexus:tutorial-skip',skip);return()=>window.removeEventListener('nexus:tutorial-skip',skip)},[]);
 const start=()=>{sessionStorage.setItem(PENDING_KEY,'1');setOffer(false);navigate('/combat?tutorial=1')};
 const skip=()=>{localStorage.setItem(DONE_KEY,'1');setOffer(false);setActive(false);highlight()};
 const next=()=>{if(step>=STEPS.length-1){localStorage.setItem(DONE_KEY,'1');setActive(false);highlight();return}setStep(step+1)};
 if(offer&&!inBattle)return <div className="tutorial-offer-overlay"><section className="tutorial-offer"><img src={lyra} alt="Lyra Croc-de-Lune"/><div><small>DIDACTICIEL</small><h2>Premier duel guidé</h2><p>Lyra Croc-de-Lune peut t’accompagner pendant une vraie partie et t’expliquer les phases, les invocations, les attaques et l’Évosphère.</p><div><button className="primary" onClick={start}>Commencer le didacticiel</button><button className="secondary" onClick={()=>setOffer(false)}>Plus tard</button><button className="tutorial-skip-link" onClick={skip}>Ne plus proposer</button></div></div></section></div>;
 if(!active||!inBattle)return null;
 const current=STEPS[step];
 return <aside className="tutorial-coach" role="dialog" aria-live="polite"><img src={lyra} alt=""/><div className="tutorial-coach-copy"><small>LYRA CROC-DE-LUNE · {step+1}/{STEPS.length}</small><b>{current.title}</b><p>{current.text}</p><div><button className="secondary" onClick={skip}>Passer le didacticiel</button>{!current.waitForClick&&<button className="primary" onClick={next}>{step===STEPS.length-1?'Terminer':'Continuer'}</button>}<button className="tutorial-next-link" onClick={next}>Suivant</button></div></div></aside>;
}
