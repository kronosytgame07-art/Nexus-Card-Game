import { useLocation } from 'react-router-dom';
import { useGame } from '../store/game';
import { FACTION_DECK_PRICE_GEMS, factionUnlockLabel, purchaseFactionDeck } from '../progression/faction-unlocks';
import type { Faction } from '../engine/types';

const DISPLAY: Faction[] = ['Chevalier', 'Gobelin', 'Orc', 'Dragon', 'Squelette'];

export function FactionUnlockShop() {
  const location = useLocation();
  const state = useGame();
  const path = decodeURIComponent(location.pathname).toLowerCase();
  if (!path.includes('boutique') && !path.includes('shop')) return null;

  return (
    <aside className="faction-unlock-dock" aria-label="Déblocage des decks de faction">
      <header>
        <div><small>DECKS DE STRUCTURE</small><b>Débloquer une faction</b></div>
        <span>💎 {state.gems}</span>
      </header>
      <div className="faction-unlock-list">
        {DISPLAY.map((faction) => {
          const unlocked = state.unlockedFactions.includes(faction);
          const purchasable = faction === 'Chevalier' || faction === 'Orc';
          return (
            <article key={faction} className={unlocked ? 'unlocked' : ''}>
              <div><b>{faction}</b><small>{factionUnlockLabel(faction, state)}</small></div>
              {unlocked ? <strong>✓</strong> : purchasable ? (
                <button disabled={state.gems < FACTION_DECK_PRICE_GEMS} onClick={() => purchaseFactionDeck(faction)}>
                  Acheter
                </button>
              ) : <span className="unlock-lock">🔒</span>}
            </article>
          );
        })}
      </div>
      <p>Le Dragon garde volontairement sa condition secrète. Les autres conditions progressent automatiquement.</p>
    </aside>
  );
}
