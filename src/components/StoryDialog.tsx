import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { STORY_CHARACTERS } from '../narrative/characters';
import { useStory } from '../narrative/story-state';
import type { DialogueLine } from '../narrative/types';

type StoryDialogProps = {
  sceneId: string;
  lines: DialogueLine[];
  playerName: string;
  onComplete: () => void;
  onClose?: () => void;
};

const toneIcon = { heroic: '✦', sarcastic: '⌁', pragmatic: '◆' } as const;

export function StoryDialog({ sceneId, lines, playerName, onComplete, onClose }: StoryDialogProps) {
  const [index, setIndex] = useState(0);
  const choose = useStory((state) => state.choose);
  const line = lines[index];
  const isLast = index >= lines.length - 1;
  const isNarrator = line.speaker === 'narrator';
  const name = line.speaker === 'player'
    ? playerName
    : isNarrator
      ? 'ELYNDRA'
      : STORY_CHARACTERS[line.speaker].name;
  const side = isNarrator ? 'center' : (line.speakerSide ?? 'left');

  const next = () => (isLast ? onComplete() : setIndex((current) => current + 1));

  useEffect(() => {
    [line.panel, lines[index + 1]?.panel].filter(Boolean).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [index, line.panel, lines]);

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
    <div className={`story-dialog speaker-${side}`} role="dialog" aria-modal="true" aria-label={`Scène narrative — ${name}`}>
      <AnimatePresence mode="wait">
        <motion.div
          className="story-panel-frame"
          key={line.panel}
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
        >
          <img className="story-panel-art" src={line.panel} alt="" />
          <div className="story-panel-ink" />
          <div className="story-panel-vignette" />
        </motion.div>
      </AnimatePresence>

      <div className="story-scene-label" aria-hidden="true">
        <span>NEXUS ARENA</span>
        <b>CHAPITRE I</b>
      </div>

      {onClose && <button className="story-close" type="button" aria-label="Quitter la scène" onClick={onClose}>×</button>}

      <motion.article
        className={`story-bubble ${side}${isNarrator ? ' narrator' : ''}`}
        key={`${sceneId}-${index}`}
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.16, duration: 0.35, ease: 'easeOut' }}
      >
        <header className="story-bubble-meta">
          <small>{name}</small>
          {line.emotion && <em>{line.emotion}</em>}
        </header>
        <p>{line.text}</p>

        {line.choices ? (
          <div className="story-choices" aria-label="Choisis ta réponse">
            {line.choices.map((choice) => (
              <button
                className={`tone-${choice.tone}`}
                key={choice.id}
                onClick={() => {
                  choose(`${sceneId}:${index}`, choice.tone, choice.affinity);
                  next();
                }}
              >
                <span>{toneIcon[choice.tone]}</span>
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <button className="story-next" type="button" onClick={next}>
            {isLast ? 'COMBATTRE' : 'SUITE'} <span>›</span>
          </button>
        )}
      </motion.article>

      <div className="story-progress" aria-label={`Case ${index + 1} sur ${lines.length}`}>
        {lines.map((_, step) => <i key={step} className={step === index ? 'active' : step < index ? 'seen' : ''} />)}
      </div>
    </div>
  );
}
