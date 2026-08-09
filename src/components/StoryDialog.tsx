import { useState } from 'react';
import { STORY_CHARACTERS } from '../narrative/characters';
import { useStory } from '../narrative/story-state';
import type { DialogueLine } from '../narrative/types';

export function StoryDialog({ sceneId, lines, playerName, onComplete }: { sceneId:string; lines:DialogueLine[]; playerName:string; onComplete:()=>void }) {
 const [index,setIndex]=useState(0); const choose=useStory(s=>s.choose); const line=lines[index]; const next=()=>index>=lines.length-1?onComplete():setIndex(index+1);
 const name=line.speaker==='player'?playerName:line.speaker==='narrator'?'ELYNDRA':STORY_CHARACTERS[line.speaker].name;
 const portrait=line.speaker==='player'?null:line.speaker==='narrator'?null:STORY_CHARACTERS[line.speaker].portrait;
 return <div className="story-dialog" role="dialog" aria-modal="true"><div className="story-dialog-backdrop" />{portrait&&<img className="story-portrait" src={portrait} alt={name}/>}<div className="story-bubble"><small>{name}</small><p>{line.text}</p>{line.choices?<div className="story-choices">{line.choices.map(choice=><button key={choice.id} onClick={()=>{choose(`${sceneId}:${index}`,choice.tone,choice.affinity);next();}}>{choice.text}</button>)}</div>:<button className="primary" onClick={next}>{index>=lines.length-1?'Continuer':'›'}</button>}</div></div>;
}
