import { useEffect, useMemo, useState } from 'react';
import { ALL_CARDS, ALL_FACTIONS, useGame } from '../store/game';
import type { Faction } from '../engine/types';

const KEY='nexus-battle-pass-s1';
const PREMIUM_PRICE=500;
const MAX_LEVEL=50;
const XP_PER_LEVEL=100;
type Reward={kind:'gold'|'gems'|'booster'|'terrain'|'avatar';amount?:number;faction?:Faction;id?:string;label:string};
type Save={premium:boolean;xp:number;claimedFree:number[];claimedPremium:number[];lastWins:number;lastRankedWins:number};
const fresh=(wins=0,rankedWins=0):Save=>({premium:false,xp:0,claimedFree:[],claimedPremium:[],lastWins:wins,lastRankedWins:rankedWins});
function load(w:number,r:number):Save{try{return {...fresh(w,r),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return fresh(w,r)}}
function save(v:Save){localStorage.setItem(KEY,JSON.stringify(v))}
const factions=ALL_FACTIONS as Faction[];
function freeReward(level:number):Reward|undefined{
 if(level===50)return {kind:'gems',amount:100,label:'100 gemmes'};
 if(level%10===0)return {kind:'booster',faction:factions[(level/10-1)%factions.length],label:`Booster ${factions[(level/10-1)%factions.length]}`};
 if(level%5===0)return {kind:'gems',amount:25,label:'25 gemmes'};
 if(level%2===0)return {kind:'gold',amount:100,label:'100 or'};
 return undefined;
}
function premiumReward(level:number,mythicId?:string):Reward|undefined{
 if(level===50&&mythicId)return {kind:'avatar',id:mythicId,label:'Avatar Mythique exclusif'};
 if(level===40)return {kind:'terrain',id:'swamp',label:'Terrain Marais du Nexus'};
 if(level===25)return {kind:'terrain',id:'ruins',label:'Terrain Ruines crépusculaires'};
 if(level%10===0)return {kind:'gems',amount:75,label:'75 gemmes'};
 if(level%5===0)return {kind:'booster',faction:factions[(level/5)%factions.length],label:`Booster ${factions[(level/5)%factions.length]}`};
 if(level%2===1)return {kind:'gold',amount:150,label:'150 or'};
 return {kind:'gems',amount:10,label:'10 gemmes'};
}
export default function BattlePass(){
 const game=useGame(); const [data,setData]=useState(()=>load(game.wins,game.rankedWins)); const [open,setOpen]=useState(false);
 const mythic=useMemo(()=>ALL_CARDS.find(c=>c.rarity==='Mythique'&&!c.assetMissing),[]);
 const level=Math.min(MAX_LEVEL,Math.floor(data.xp/XP_PER_LEVEL)+1); const progress=level===MAX_LEVEL?100:data.xp%XP_PER_LEVEL;
 useEffect(()=>{const dw=Math.max(0,game.wins-data.lastWins),dr=Math.max(0,game.rankedWins-data.lastRankedWins);if(!dw&&!dr)return;setData(d=>{const n={...d,xp:Math.min(MAX_LEVEL*XP_PER_LEVEL,d.xp+dw*60+dr*40),lastWins:game.wins,lastRankedWins:game.rankedWins};save(n);return n})},[game.wins,game.rankedWins]);
 const patch=(n:Save)=>{save(n);setData(n)};
 const buy=()=>{if(data.premium||game.gems<PREMIUM_PRICE)return;game.addGems(-PREMIUM_PRICE);patch({...data,premium:true})};
 const grant=(r:Reward)=>{if(r.kind==='gold')game.addGold(r.amount||0);if(r.kind==='gems')game.addGems(r.amount||0);if(r.kind==='booster'&&r.faction)game.openBooster(r.faction,0,1);if(r.kind==='terrain'&&r.id){const id=r.id as any;useGame.setState(s=>({purchasedTerrains:s.purchasedTerrains.includes(id)?s.purchasedTerrains:[...s.purchasedTerrains,id]}))}if(r.kind==='avatar'&&r.id)useGame.setState(s=>({purchasedAvatars:s.purchasedAvatars.includes(r.id!)?s.purchasedAvatars:[...s.purchasedAvatars,r.id!]}))};
 const claim=(l:number,premium:boolean,r?:Reward)=>{if(!r||l>level||(premium&&!data.premium))return;const key=premium?'claimedPremium':'claimedFree';if(data[key].includes(l))return;grant(r);patch({...data,[key]:[...data[key],l]})};
 return <><button className="battle-pass-widget" onClick={()=>setOpen(true)}><small>PASS DE COMBAT · SAISON 1</small><b>Niveau {level}/{MAX_LEVEL}</b><span><i style={{width:`${progress}%`}}/></span><em>{data.premium?'PREMIUM ACTIF':'Voie gratuite'}</em></button>{open&&<div className="battle-pass-overlay" onClick={()=>setOpen(false)}><section className="battle-pass-panel" onClick={e=>e.stopPropagation()}><header><div><small>SAISON 1 · L’ÉCHO DU NEXUS</small><h2>Pass de combat</h2><p>Niveau {level} · Les victoires font progresser le pass.</p></div><button onClick={()=>setOpen(false)}>×</button></header>{!data.premium&&<button className="battle-pass-premium" disabled={game.gems<PREMIUM_PRICE} onClick={buy}>Débloquer Premium · 💎 {PREMIUM_PRICE}</button>}<div className="battle-pass-track">{Array.from({length:MAX_LEVEL},(_,i)=>i+1).map(l=>{const f=freeReward(l),p=premiumReward(l,mythic?.id);return <article key={l} className={l<=level?'reached':''}><strong>{l}</strong><button disabled={!f||l>level||data.claimedFree.includes(l)} onClick={()=>claim(l,false,f)}><small>GRATUIT</small><b>{f?.label||'—'}</b><em>{data.claimedFree.includes(l)?'✓ Récupéré':l<=level&&f?'Récupérer':''}</em></button><button className="premium" disabled={!p||l>level||!data.premium||data.claimedPremium.includes(l)} onClick={()=>claim(l,true,p)}><small>PREMIUM</small><b>{p?.label||'—'}</b><em>{data.claimedPremium.includes(l)?'✓ Récupéré':l<=level&&data.premium&&p?'Récupérer':''}</em></button></article>})}</div></section></div>}</>;
}