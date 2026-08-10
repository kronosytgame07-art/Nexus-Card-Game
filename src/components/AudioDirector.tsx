import { useEffect, useRef } from 'react';
import { useGame } from '../store/game';

const MENU_THEME = `${import.meta.env.BASE_URL}audio/menu-theme.mp3`;
type FeedbackTone = 'soft' | 'impact' | 'reward';

/**
 * Pont unique entre les préférences persistées et les retours sonores du jeu.
 * La musique ne démarre qu'après une interaction utilisateur, conformément aux
 * règles des navigateurs et des webviews mobiles.
 *
 * Les SFX d'interface restent synthétiques pour ne pas ajouter de poids au
 * téléchargement, mais sont volontairement composés de plusieurs couches :
 * clic sec, impact grave + bruit filtré et petit accord de récompense. Cela
 * évite le simple "bip" d'application web tout en restant instantané.
 */
export default function AudioDirector() {
  const musicEnabled = useGame((state) => state.musicEnabled);
  const musicVolume = useGame((state) => state.musicVolume);
  const sfxVolume = useGame((state) => state.sfxVolume);
  const vibrationEnabled = useGame((state) => state.vibrationEnabled);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const lastFeedbackRef = useRef(0);

  useEffect(() => {
    const music = new Audio(MENU_THEME);
    music.loop = true;
    music.preload = 'metadata';
    musicRef.current = music;
    return () => {
      music.pause();
      music.src = '';
      musicRef.current = null;
      contextRef.current?.close().catch(() => undefined);
      contextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    music.volume = Math.max(0, Math.min(1, musicVolume / 100));
    if (!musicEnabled) music.pause();
  }, [musicEnabled, musicVolume]);

  useEffect(() => {
    const unlockMusic = () => {
      const music = musicRef.current;
      if (!music || !musicEnabled) return;
      music.play().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unlockMusic, { passive: true });
    return () => window.removeEventListener('pointerdown', unlockMusic);
  }, [musicEnabled]);

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
      gain.gain.value = Math.min(0.22, (sfxVolume / 100) * 0.18 * multiplier);
      gain.connect(context.destination);
      return gain;
    };

    const playSoft = (context: AudioContext) => {
      const output = masterGain(context, 0.42);
      const osc = context.createOscillator();
      const envelope = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(390, context.currentTime + 0.045);
      envelope.gain.setValueAtTime(0.7, context.currentTime);
      envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);
      osc.connect(envelope).connect(output);
      osc.start();
      osc.stop(context.currentTime + 0.06);
    };

    const playImpact = (context: AudioContext) => {
      const output = masterGain(context, 0.9);
      const low = context.createOscillator();
      const lowEnvelope = context.createGain();
      low.type = 'triangle';
      low.frequency.setValueAtTime(118, context.currentTime);
      low.frequency.exponentialRampToValueAtTime(52, context.currentTime + 0.13);
      lowEnvelope.gain.setValueAtTime(0.9, context.currentTime);
      lowEnvelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);
      low.connect(lowEnvelope).connect(output);

      const noiseLength = Math.max(1, Math.floor(context.sampleRate * 0.09));
      const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const noise = context.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(280, context.currentTime + 0.09);
      const noiseEnvelope = context.createGain();
      noiseEnvelope.gain.setValueAtTime(0.42, context.currentTime);
      noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
      noise.connect(filter).connect(noiseEnvelope).connect(output);

      low.start();
      low.stop(context.currentTime + 0.16);
      noise.start();
      noise.stop(context.currentTime + 0.11);
    };

    const playReward = (context: AudioContext) => {
      const output = masterGain(context, 0.68);
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((frequency, index) => {
        const start = context.currentTime + index * 0.045;
        const osc = context.createOscillator();
        const envelope = context.createGain();
        osc.type = index === 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.035, start + 0.16);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(0.55, start + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
        osc.connect(envelope).connect(output);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    };

    const feedbackFromUi = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest('button, .card, .field-card, .field-unit, [data-sfx]');
      if (!interactive || (interactive instanceof HTMLButtonElement && interactive.disabled)) return;
      const tone: FeedbackTone = interactive.matches('.primary, [data-sfx="reward"]')
        ? 'reward'
        : interactive.matches('.field-card, .field-unit, [data-sfx="impact"]')
          ? 'impact'
          : 'soft';
      window.dispatchEvent(new CustomEvent('nexus:sfx', { detail: { tone } }));
    };

    const playFeedback = (event: Event) => {
      const detail = (event as CustomEvent<{ tone?: FeedbackTone }>).detail;
      const now = performance.now();
      if (now - lastFeedbackRef.current < 35 || sfxVolume === 0) return;
      lastFeedbackRef.current = now;
      const context = getContext();
      if (!context) return;
      const tone = detail?.tone ?? 'soft';
      if (tone === 'impact') playImpact(context);
      else if (tone === 'reward') playReward(context);
      else playSoft(context);

      if (vibrationEnabled && 'vibrate' in navigator && tone !== 'soft') {
        navigator.vibrate(tone === 'impact' ? 20 : [10, 24, 14]);
      }
    };

    window.addEventListener('click', feedbackFromUi, true);
    window.addEventListener('nexus:sfx', playFeedback);
    return () => {
      window.removeEventListener('click', feedbackFromUi, true);
      window.removeEventListener('nexus:sfx', playFeedback);
    };
  }, [sfxVolume, vibrationEnabled]);

  return null;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
