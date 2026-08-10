import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TRACKS = [
  'audio/combat/duel-1-dark-intense.mp3',
  'audio/combat/duel-2-epique-choeurs.mp3',
  'audio/combat/duel-3-agressive.mp3',
];

export default function CombatPlaylistController(){
  const location=useLocation();
  const indexRef=useRef(0);
  useEffect(()=>{
    if(location.pathname!=='/combat') return;
    const audio=document.querySelector('audio[src*="audio/"]') as HTMLAudioElement|null;
    if(!audio) return;
    const base=import.meta.env.BASE_URL;
    const current=TRACKS.findIndex(t=>audio.src.includes(t));
    indexRef.current=current>=0?current:Math.floor(Math.random()*TRACKS.length);
    audio.loop=false;
    const next=()=>{
      indexRef.current=(indexRef.current+1)%TRACKS.length;
      audio.src=`${base}${TRACKS[indexRef.current]}`;
      audio.load();
      audio.play().catch(()=>{});
    };
    audio.addEventListener('ended',next);
    return()=>{audio.removeEventListener('ended',next);audio.loop=true;};
  },[location.pathname]);
  return null;
}
