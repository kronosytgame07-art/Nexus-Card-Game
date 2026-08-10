import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useGame } from '../store/game';

export default function BattleQuickSettings() {
  const location = useLocation();
  const s = useGame();
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    if (location.pathname !== '/combat') { setHost(null); return; }
    const find = () => setHost(document.querySelector('.battle-pause-menu'));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.getElementById('root') ?? document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  if (!host) return null;
  return createPortal(
    <div className="battle-quick-settings">
      <div className="battle-settings-title"><span>RÉGLAGES RAPIDES</span><small>Appliqués immédiatement</small></div>
      <label className="battle-settings-row"><span>Musique</span><button type="button" className={'battle-switch ' + (s.musicEnabled ? 'on' : '')} onClick={() => s.setMusicEnabled(!s.musicEnabled)}><i /></button></label>
      <label className="battle-settings-slider"><span>Volume musique <b>{s.musicVolume}%</b></span><input type="range" min="0" max="100" value={s.musicVolume} onChange={(e) => s.setMusicVolume(Number(e.target.value))} /></label>
      <label className="battle-settings-slider"><span>Effets sonores <b>{s.sfxVolume}%</b></span><input type="range" min="0" max="100" value={s.sfxVolume} onChange={(e) => s.setSfxVolume(Number(e.target.value))} /></label>
      <label className="battle-settings-row"><span>Qualité graphique</span><select value={s.visualQuality} onChange={(e) => s.setVisualQuality(e.target.value as 'eco'|'balanced'|'high')}><option value="eco">Éco</option><option value="balanced">Équilibrée</option><option value="high">Élevée</option></select></label>
      <label className="battle-settings-row"><span>Animations</span><select value={s.animationMode} onChange={(e) => s.setAnimationMode(e.target.value as 'full'|'reduced'|'off')}><option value="full">Complètes</option><option value="reduced">Réduites</option><option value="off">Désactivées</option></select></label>
      <label className="battle-settings-row"><span>Effets lumineux</span><button type="button" className={'battle-switch ' + (s.glowEffects ? 'on' : '')} onClick={() => s.setGlowEffects(!s.glowEffects)}><i /></button></label>
      <label className="battle-settings-row"><span>Secousses écran</span><button type="button" className={'battle-switch ' + (s.screenShake ? 'on' : '')} onClick={() => s.setScreenShake(!s.screenShake)}><i /></button></label>
      <label className="battle-settings-row"><span>Mode économie</span><button type="button" className={'battle-switch ' + (s.batterySaver ? 'on' : '')} onClick={() => s.setBatterySaver(!s.batterySaver)}><i /></button></label>
      <label className="battle-settings-row"><span>Vibrations</span><button type="button" className={'battle-switch ' + (s.vibrationEnabled ? 'on' : '')} onClick={() => s.setVibrationEnabled(!s.vibrationEnabled)}><i /></button></label>
    </div>, host
  );
}
