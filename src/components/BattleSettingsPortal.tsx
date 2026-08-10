import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, type AnimationMode, type VisualQuality } from '../store/game';

const TUTORIAL_KEY = 'nexus-tutorial-v1-complete';

export default function BattleSettingsPortal() {
  const game = useGame();
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    const refresh = () => setTarget(document.querySelector('.battle-pause-menu'));
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.getElementById('root') ?? document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;
  return createPortal(
    <div className="battle-settings-block">
      <div className="battle-settings-title">
        <span>OPTIONS</span>
        <small>Les changements sont appliqués immédiatement.</small>
      </div>
      <div className="battle-settings-grid">
        <label>
          <span>Musique</span>
          <button className="battle-setting-toggle" type="button" onClick={() => game.setMusicEnabled(!game.musicEnabled)}>
            {game.musicEnabled ? 'ACTIVÉE' : 'COUPÉE'}
          </button>
        </label>
        <label>
          <span>Volume musique</span>
          <input type="range" min="0" max="100" value={game.musicVolume} onChange={(e) => game.setMusicVolume(Number(e.target.value))} />
        </label>
        <label>
          <span>Effets sonores</span>
          <input type="range" min="0" max="100" value={game.sfxVolume} onChange={(e) => game.setSfxVolume(Number(e.target.value))} />
        </label>
        <label>
          <span>Qualité graphique</span>
          <select value={game.visualQuality} onChange={(e) => game.setVisualQuality(e.target.value as VisualQuality)}>
            <option value="eco">Éco</option><option value="balanced">Équilibrée</option><option value="high">Élevée</option>
          </select>
        </label>
        <label>
          <span>Animations</span>
          <select value={game.animationMode} onChange={(e) => game.setAnimationMode(e.target.value as AnimationMode)}>
            <option value="full">Complètes</option><option value="reduced">Réduites</option><option value="off">Désactivées</option>
          </select>
        </label>
        <label>
          <span>Effets lumineux</span>
          <button className="battle-setting-toggle" type="button" onClick={() => game.setGlowEffects(!game.glowEffects)}>{game.glowEffects ? 'ACTIVÉS' : 'COUPÉS'}</button>
        </label>
        <label>
          <span>Secousses d'écran</span>
          <button className="battle-setting-toggle" type="button" onClick={() => game.setScreenShake(!game.screenShake)}>{game.screenShake ? 'ACTIVÉES' : 'COUPÉES'}</button>
        </label>
        <label>
          <span>Vibrations</span>
          <button className="battle-setting-toggle" type="button" onClick={() => game.setVibrationEnabled(!game.vibrationEnabled)}>{game.vibrationEnabled ? 'ACTIVÉES' : 'COUPÉES'}</button>
        </label>
      </div>
      <button className="battle-tutorial-skip" type="button" onClick={() => { localStorage.setItem(TUTORIAL_KEY, '1'); window.dispatchEvent(new Event('nexus:tutorial-skip')); }}>
        Passer définitivement le didacticiel
      </button>
    </div>,
    target
  );
}
