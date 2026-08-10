import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { STORY_CHARACTERS } from '../narrative/characters';
import { useStory } from '../narrative/story-state';
import type { CinematicAtmosphere, CinematicCamera, DialogueLine } from '../narrative/types';
import { useGame } from '../store/game';

type StoryDialogProps = {
  sceneId: string;
  lines: DialogueLine[];
  playerName: string;
  onComplete: () => void;
  onClose?: () => void;
};

const toneIcon = { heroic: '✦', sarcastic: '⌁', pragmatic: '◆' } as const;
const CAMERA_MOTION: Record<CinematicCamera, { scale: number[]; x?: string[]; y?: string[] }> = {
  push: { scale: [1.04, 1.13] },
  pull: { scale: [1.14, 1.04] },
  'pan-left': { scale: [1.1, 1.12], x: ['1.8%', '-1.8%'] },
  'pan-right': { scale: [1.1, 1.12], x: ['-1.8%', '1.8%'] },
  rise: { scale: [1.11, 1.08], y: ['1.6%', '-1.4%'] },
  fall: { scale: [1.08, 1.12], y: ['-1.2%', '1.4%'] },
  still: { scale: [1.06, 1.06] },
};

function cinematicCue(atmosphere: CinematicAtmosphere, intensity: number, volume: number) {
  if (volume <= 0 || atmosphere === 'none' || typeof window === 'undefined') return;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;
  const ctx = new AudioCtor();
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  gain.connect(ctx.destination);
  osc.connect(gain);
  const base = atmosphere === 'storm' ? 78 : atmosphere === 'necrotic' ? 92 : atmosphere === 'nexus' ? 132 : atmosphere === 'embers' ? 104 : 116;
  osc.type = atmosphere === 'nexus' ? 'sine' : 'triangle';
  osc.frequency.setValueAtTime(base, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(48, base * (1 + intensity * 0.22)), ctx.currentTime + 0.38);
  const level = Math.min(0.055, (volume / 100) * 0.018 * intensity);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), ctx.currentTime + 0.035);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  osc.start();
  osc.stop(ctx.currentTime + 0.52);
  window.setTimeout(() => ctx.close().catch(() => {}), 650);
}

export function StoryDialog({ sceneId, lines, playerName, onComplete, onClose }: StoryDialogProps) {
  const [index, setIndex] = useState(0);
  const choose = useStory((state) => state.choose);
  const animationMode = useGame((state) => state.animationMode);
  const batterySaver = useGame((state) => state.batterySaver);
  const screenShake = useGame((state) => state.screenShake);
  const sfxVolume = useGame((state) => state.sfxVolume);
  const line = lines[index];
  const isLast = index >= lines.length - 1;
  const isNarrator = line.speaker === 'narrator';
  const isPlayer = line.speaker === 'player';
  const character = !isNarrator && !isPlayer ? STORY_CHARACTERS[line.speaker] : undefined;
  const name = isPlayer ? playerName : isNarrator ? 'ELYNDRA' : character?.name ?? 'INCONNU';
  const side = isNarrator ? 'center' : (line.speakerSide ?? 'left');
  const cinematic = line.cinematic ?? {};
  const atmosphere = cinematic.atmosphere ?? 'none';
  const intensity = cinematic.intensity ?? 1;
  const camera = cinematic.camera ?? 'push';
  const animateCinematic = animationMode !== 'off' && !batterySaver;
  const cameraMotion = useMemo(() => CAMERA_MOTION[camera], [camera]);
  const next = () => (isLast ? onComplete() : setIndex((current) => current + 1));

  useEffect(() => {
    [line.panel, lines[index + 1]?.panel].filter(Boolean).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [index, line.panel, lines]);

  useEffect(() => {
    if (animateCinematic) cinematicCue(atmosphere, intensity, sfxVolume);
  }, [index, atmosphere, intensity, animateCinematic, sfxVolume]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) onClose();
      if ((event.key === 'Enter' || event.key === ' ') && !line.choices) {
        event.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className={`story-dialog cinematic-story speaker-${side} atmosphere-${atmosphere} intensity-${intensity}${cinematic.shake && screenShake ? ' cinematic-shake' : ''}`} role="dialog" aria-modal="true" aria-label={`Scène narrative — ${name}`}>
      <AnimatePresence mode="wait">
        <motion.div className="story-panel-frame cinematic-frame" key={`${line.panel}-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: animateCinematic ? 0.55 : 0.15, ease: 'easeOut' }}>
          <motion.img className="story-panel-art cinematic-backdrop" src={line.panel} alt="" initial={animateCinematic ? { scale: cameraMotion.scale[0], x: cameraMotion.x?.[0] ?? '0%', y: cameraMotion.y?.[0] ?? '0%' } : false} animate={animateCinematic ? { scale: cameraMotion.scale[1], x: cameraMotion.x?.[1] ?? '0%', y: cameraMotion.y?.[1] ?? '0%' } : { scale: 1.05 }} transition={{ duration: 8.5 + intensity * 1.5, ease: 'linear' }} />
          <motion.div className="cinematic-depth-layer" style={{ backgroundImage: `url(${line.panel})` }} initial={animateCinematic ? { scale: 1.12, x: side === 'left' ? '-1%' : '1%' } : false} animate={animateCinematic ? { scale: 1.18, x: side === 'left' ? '1.4%' : '-1.4%' } : { scale: 1.12 }} transition={{ duration: 10.5, ease: 'linear' }} />
          <div className="cinematic-atmosphere" aria-hidden="true">{Array.from({ length: animateCinematic ? 18 + intensity * 10 : 0 }, (_, particle) => <i key={particle} style={{ '--p': particle } as CSSProperties} />)}</div>
          {cinematic.flash && <motion.div className="cinematic-flash" initial={{ opacity: 0 }} animate={{ opacity: [0, .65, 0] }} transition={{ duration: .7 }} />}
          <div className="story-panel-ink" />
          <div className="story-panel-vignette" />
        </motion.div>
      </AnimatePresence>

      <div className="story-scene-label" aria-hidden="true"><span>NEXUS ARENA</span><b>CHRONIQUES D'ELYNDRA</b></div>
      {character && <motion.aside className={`cinematic-portrait portrait-${side}`} key={`${character.id}-${index}`} initial={{ opacity: 0, x: side === 'left' ? -42 : 42, scale: .92 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: .2, duration: .42, ease: 'easeOut' }}><img src={character.portrait} alt="" onError={(event)=>{event.currentTarget.style.display='none'}}/><span>{character.role}</span></motion.aside>}
      {onClose && <button className="story-close" type="button" aria-label="Quitter la scène" onClick={onClose}>×</button>}
      <button className="cinematic-skip" type="button" onClick={onComplete}>PASSER LA CINÉMATIQUE</button>

      <motion.article className={`story-bubble cinematic-bubble ${side}${isNarrator ? ' narrator' : ''}`} key={`${sceneId}-${index}`} initial={{ opacity: 0, y: 28, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: animateCinematic ? .32 : .05, duration: .36, ease: 'easeOut' }}>
        <header className="story-bubble-meta"><small>{name}</small>{line.emotion && <em>{line.emotion}</em>}</header>
        <p>{line.text}</p>
        {line.choices ? <div className="story-choices" aria-label="Choisis ta réponse">{line.choices.map((choice) => <button className={`tone-${choice.tone}`} key={choice.id} onClick={() => { choose(`${sceneId}:${index}`, choice.tone, choice.affinity); next(); }}><span>{toneIcon[choice.tone]}</span>{choice.text}</button>)}</div> : <button className="story-next" type="button" onClick={next}>{isLast ? 'ENTRER DANS LE DUEL' : 'SUITE'} <span>›</span></button>}
      </motion.article>
      <div className="story-progress" aria-label={`Plan ${index + 1} sur ${lines.length}`}>{lines.map((_, step) => <i key={step} className={step === index ? 'active' : step < index ? 'seen' : ''} />)}</div>
    </div>
  );
}
