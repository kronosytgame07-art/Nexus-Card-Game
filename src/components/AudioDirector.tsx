Exit code: 0
Wall time: 0.5 seconds
Output:
import { useEffect, useRef } from 'react';
import { useGame } from '../store/game';

const MENU_THEME = `${import.meta.env.BASE_URL}audio/menu-theme.mp3`;

/**
 * Pont unique entre les prÃ©fÃ©rences persistÃ©es et les retours sonores du jeu.
 * La musique ne dÃ©marre qu'aprÃ¨s une interaction utilisateur, conformÃ©ment aux
 * rÃ¨gles des navigateurs et des webviews mobiles.
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
    const feedbackFromUi = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest('button, .card, .field-card, .field-unit, [data-sfx]');
      if (!interactive || (interactive instanceof HTMLButtonElement && interactive.disabled)) return;
      const tone = interactive.matches('.primary, [data-sfx="reward"]') ? 'reward' : interactive.matches('.field-card, .field-unit, [data-sfx="impact"]') ? 'impact' : 'soft';
      window.dispatchEvent(new CustomEvent('nexus:sfx', { detail: { tone } }));
    };
    const playFeedback = (event: Event) => {
      const detail = (event as CustomEvent<{ tone?: 'soft' | 'impact' | 'reward' }>).detail;
      const now = performance.now();
      if (now - lastFeedbackRef.current < 35 || sfxVolume === 0) return;
      lastFeedbackRef.current = now;
      const Context = window.AudioContext ?? window.webkitAudioContext;
      if (!Context) return;
      const context = contextRef.current ?? new Context();
      contextRef.current = context;
      if (context.state === 'suspended') context.resume().catch(() => undefined);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const tone = detail?.tone ?? 'soft';
      const base = tone === 'impact' ? 110 : tone === 'reward' ? 660 : 420;
      oscillator.type = tone === 'impact' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(base, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(tone === 'reward' ? base * 1.5 : base * .82, context.currentTime + .09);
      gain.gain.setValueAtTime(Math.min(.13, sfxVolume / 800), context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .11);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + .12);
      if (vibrationEnabled && 'vibrate' in navigator && tone !== 'soft') navigator.vibrate(tone === 'impact' ? 18 : [12, 28, 16]);
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

