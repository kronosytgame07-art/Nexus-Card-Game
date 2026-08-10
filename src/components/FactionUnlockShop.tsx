import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useGame } from '../store/game';
import { FACTION_DECK_PRICE_GEMS, factionUnlockLabel, purchaseFactionDeck } from '../progression/faction-unlocks';
import type { Faction } from '../engine/types';

const DISPLAY: Faction[] = ['Chevalier', 'Gobelin', 'Orc', 'Dragon', 'Squelette'];

function factionFromButton(button: HTMLButtonElement): Faction | null {
  const text = button.textContent ?? '';
  return DISPLAY.find((faction) => text.includes(faction)) ?? (text.includes('Meute') ? 'Meute' : null);
}

export function FactionUnlockShop() {
  const location = useLocation();
  const state = useGame();
  const path = decodeURIComponent(location.pathname).toLowerCase();
  const inShop = path.includes('boutique') || path.includes('shop');
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!inShop) {
      setTarget(null);
      return;
    }
    // La grille des terrains vit dans le conteneur principal de la Boutique.
    // En ciblant son parent on place la section Decks à la fin du flux normal,
    // au lieu d'un panneau fixed permanent par-dessus l'interface.
    const frame = requestAnimationFrame(() => {
      const terrainGrid = document.querySelector<HTMLElement>('.terrain-grid');
      setTarget(terrainGrid?.parentElement ?? null);
      document.querySelectorAll<HTMLButtonElement>('.faction-button.locked').forEach((button) => {
        const faction = factionFromButton(button);
        if (faction) button.title = `Verrouillé — ${factionUnlockLabel(faction, useGame.getState())}`;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [inShop, state.unlockedFactions, state.purchasedAvatars.length, state.campaignChapter]);

  if (!inShop || !target) return null;

  const section = (
    <section className="faction-unlock-dock faction-unlock-section" aria-label="Déblocage des decks de faction">
      <header>
        <div><small>DECKS DE STRUCTURE</small><b>Decks de faction</b></div>
        <span>💎 {state.gems}</span>
      </header>
      <p className="faction-unlock-intro">Achète directement les decks disponibles ou remplis leur condition de déblocage.</p>
      <div className="faction-unlock-list">
        {DISPLAY.map((faction) => {
          const unlocked = state.unlockedFactions.includes(faction);
          const purchasable = faction === 'Chevalier' || faction === 'Orc';
          return (
            <article key={faction} className={unlocked ? 'unlocked' : ''}>
              <div><b>{faction}</b><small>{factionUnlockLabel(faction, state)}</small></div>
              {unlocked ? (
                <strong>✓ Débloqué</strong>
              ) : purchasable ? (
                <button disabled={state.gems < FACTION_DECK_PRICE_GEMS} onClick={() => purchaseFactionDeck(faction)}>
                  Acheter · 💎 {FACTION_DECK_PRICE_GEMS}
                </button>
              ) : (
                <span className="unlock-lock">🔒</span>
              )}
            </article>
          );
        })}
      </div>
      <p>Le Dragon conserve sa condition secrète. Squelette et Gobelin se débloquent par progression.</p>
    </section>
  );

  return createPortal(section, target);
}
