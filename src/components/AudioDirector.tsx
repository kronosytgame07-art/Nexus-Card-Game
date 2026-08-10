import { useEffect, useRef } from 'react';
import { useGame } from '../store/game';

type FeedbackTone = 'soft' | 'impact' | 'reward';

/** Gestionnaire unique des retours sonores. La musique reste exclusivement
 * pilotée par MusicManager dans App.tsx. */
export default function AudioDirector() {
  const sfxVolume = useGame((state) => state.sfxVolume);
  const vibrationEnabled = useGame((state) => state.vibrationEnabled);
  const contextRef = useRef<AudioContext | null>(null);
  const lastFeedbackRef = useRef(0);

  useEffect(() => () => {
    contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
  }, []);

  useEffect(() => {
    const getContext = () => {
      const Context = window.AudioContext ?? window.webkitAudioContext;
      if (!Context) return null;
      const context = contextRef.current ?? new Context();
      contextRef.current = context;
      if (context.state === 'suspended') context.resume().catch(() => undefined);
      return context;
    };

    const masterGain = (context: AudioContext, multiplier = 1) => {
      const gain = context.createGain();
      // L'ancien mix plafonnait autour de 0.12 à 70 % : beaucoup trop faible
      // face à la musique du duel. On garde une marge mais les impacts sont
      // maintenant réellement audibles.
      gain.gain.value = Math.min(0.48, (sfxVolume / 100) * 0.42 * multiplier);
      gain.connect(context.destination);
      return gain;
    };

    const playSoft = (context: AudioContext) => {
      const output = masterGain(context, 0.34);
      const osc = context.createOscillator();
      const envelope = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(410, context.currentTime + 0.05);
      envelope.gain.setValueAtTime(0.55, context.currentTime);
      envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.065);
      osc.connect(envelope).connect(output);
      osc.start(); osc.stop(context.currentTime + 0.07);
    };

    const playImpact = (context: AudioContext) => {
      const output = masterGain(context, 1);
      const low = context.createOscillator();
      const lowEnvelope = context.createGain();
      low.type = 'triangle';
      low.frequency.setValueAtTime(132, context.currentTime);
      low.frequency.exponentialRampToValueAtTime(46, context.currentTime + 0.16);
      lowEnvelope.gain.setValueAtTime(1, context.currentTime);
      lowEnvelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      low.connect(lowEnvelope).connect(output);

      const noiseLength = Math.max(1, Math.floor(context.sampleRate * 0.12));
      const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const noise = context.createBufferSource(); noise.buffer = noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(1450, context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.11);
      const noiseEnvelope = context.createGain();
      noiseEnvelope.gain.setValueAtTime(0.58, context.currentTime);
      noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.13);
      noise.connect(filter).connect(noiseEnvelope).connect(output);
      low.start(); low.stop(context.currentTime + 0.19); noise.start(); noise.stop(context.currentTime + 0.14);
    };

    const playReward = (context: AudioContext) => {
      const output = masterGain(context, 0.74);
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const start = context.currentTime + index * 0.045;
        const osc = context.createOscillator(); const envelope = context.createGain();
        osc.type = index === 2 ? 'triangle' : 'sine'; osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.04, start + 0.18);
        envelope.gain.setValueAtTime(0.0001, start); envelope.gain.exponentialRampToValueAtTime(0.62, start + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
        osc.connect(envelope).connect(output); osc.start(start); osc.stop(start + 0.27);
      });
    };

    const dispatch = (tone: FeedbackTone) => window.dispatchEvent(new CustomEvent('nexus:sfx', { detail: { tone } }));

    const feedbackFromUi = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest('button, .card, .field-card, .field-unit, [data-sfx]');
      if (!interactive || (interactive instanceof HTMLButtonElement && interactive.disabled)) return;
      dispatch(interactive.matches('.primary, [data-sfx="reward"]') ? 'reward' : interactive.matches('.field-card, .field-unit, [data-sfx="impact"]') ? 'impact' : 'soft');
    };

    const playFeedback = (event: Event) => {
      const detail = (event as CustomEvent<{ tone?: FeedbackTone }>).detail;
      const now = performance.now();
      if (now - lastFeedbackRef.current < 45 || sfxVolume === 0) return;
      lastFeedbackRef.current = now;
      const context = getContext(); if (!context) return;
      const tone = detail?.tone ?? 'soft';
      if (tone === 'impact') playImpact(context); else if (tone === 'reward') playReward(context); else playSoft(context);
      if (vibrationEnabled && 'vibrate' in navigator && tone !== 'soft') navigator.vibrate(tone === 'impact' ? 24 : [10, 24, 14]);
    };

    // Les événements IA et certaines animations ne passent jamais par un clic.
    // On écoute uniquement le sous-arbre du duel et ses marqueurs visuels :
    // dégâts, évolution, pioche, activation de sort. Cela synchronise le son
    // avec ce que le joueur voit, sans observer tout le DOM des menus.
    const observer = new MutationObserver((mutations) => {
      if (!document.body.classList.contains('in-battle')) return;
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target instanceof Element && mutation.target.matches('.field-card.hit-flash, .battle-shake')) {
          dispatch('impact'); return;
        }
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('.hero-dmg, .damage-number, .hit-flash') || node.querySelector('.hero-dmg, .damage-number, .hit-flash')) { dispatch('impact'); return; }
          if (node.matches('.evo-seq-overlay, .support-reveal-overlay, .draw-reveal-overlay, .match-result') || node.querySelector('.evo-seq-overlay, .support-reveal-overlay, .draw-reveal-overlay')) { dispatch('reward'); return; }
        }
      }
    });

    const unlockAudio = () => { getContext(); };
    window.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
    window.addEventListener('click', feedbackFromUi, true);
    window.addEventListener('nexus:sfx', playFeedback);
    observer.observe(document.getElementById('root') ?? document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('click', feedbackFromUi, true);
      window.removeEventListener('nexus:sfx', playFeedback);
      observer.disconnect();
    };
  }, [sfxVolume, vibrationEnabled]);

  return null;
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext; } }
