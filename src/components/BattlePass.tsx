import { useEffect, useMemo, useState } from 'react';
import { ALL_CARDS, ALL_FACTIONS, useGame } from '../store/game';
import type { Faction } from '../engine/types';

const KEY = 'nexus-battle-pass-s1';
const PREMIUM_PRICE = 500;
const MAX_LEVEL = 50;
const XP_PER_LEVEL = 100;
type PassTerrain = 'swamp' | 'ruins';
type Reward = { kind: 'gold' | 'gems' | 'booster' | 'terrain' | 'avatar'; amount?: number; faction?: Faction; id?: string; label: string };
type Save = { premium: boolean; xp: number; claimedFree: number[]; claimedPremium: number[]; lastWins: number; lastRankedWins: number };
const fresh = (wins = 0, rankedWins = 0): Save => ({ premium: false, xp: 0, claimedFree: [], claimedPremium: [], lastWins: wins, lastRankedWins: rankedWins });

function load(wins: number, rankedWins: number): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Save>;
    return {
      premium: raw.premium === true,
      xp: Number.isFinite(raw.xp) ? Math.max(0, Math.min(MAX_LEVEL * XP_PER_LEVEL, Number(raw.xp))) : 0,
      claimedFree: Array.isArray(raw.claimedFree) ? raw.claimedFree.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= MAX_LEVEL) : [],
      claimedPremium: Array.isArray(raw.claimedPremium) ? raw.claimedPremium.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= MAX_LEVEL) : [],
      lastWins: Number.isFinite(raw.lastWins) ? Math.max(0, Number(raw.lastWins)) : wins,
      lastRankedWins: Number.isFinite(raw.lastRankedWins) ? Math.max(0, Number(raw.lastRankedWins)) : rankedWins,
    };
  } catch {
    return fresh(wins, rankedWins);
  }
}
function save(value: Save) { localStorage.setItem(KEY, JSON.stringify(value)); }
const factions = ALL_FACTIONS as Faction[];
function freeReward(level: number): Reward | undefined {
  if (level === 50) return { kind: 'gems', amount: 100, label: '100 gemmes' };
  if (level % 10 === 0) return { kind: 'booster', faction: factions[(level / 10 - 1) % factions.length], label: `Booster ${factions[(level / 10 - 1) % factions.length]}` };
  if (level % 5 === 0) return { kind: 'gems', amount: 25, label: '25 gemmes' };
  if (level % 2 === 0) return { kind: 'gold', amount: 100, label: '100 or' };
  return undefined;
}
function premiumReward(level: number, mythicId?: string): Reward | undefined {
  if (level === 50 && mythicId) return { kind: 'avatar', id: mythicId, label: 'Avatar Mythique exclusif' };
  if (level === 40) return { kind: 'terrain', id: 'swamp', label: 'Terrain Marais du Nexus' };
  if (level === 25) return { kind: 'terrain', id: 'ruins', label: 'Terrain Ruines crépusculaires' };
  if (level % 10 === 0) return { kind: 'gems', amount: 75, label: '75 gemmes' };
  if (level % 5 === 0) return { kind: 'booster', faction: factions[(level / 5) % factions.length], label: `Booster ${factions[(level / 5) % factions.length]}` };
  if (level % 2 === 1) return { kind: 'gold', amount: 150, label: '150 or' };
  return { kind: 'gems', amount: 10, label: '10 gemmes' };
}

export default function BattlePass() {
  const game = useGame();
  const [data, setData] = useState(() => load(game.wins, game.rankedWins));
  const [open, setOpen] = useState(false);
  const mythic = useMemo(() => ALL_CARDS.find((card) => card.rarity === 'Mythique' && !card.assetMissing), []);
  const level = Math.min(MAX_LEVEL, Math.floor(data.xp / XP_PER_LEVEL) + 1);
  const progress = level === MAX_LEVEL ? 100 : data.xp % XP_PER_LEVEL;

  useEffect(() => {
    // Si la progression générale a été réinitialisée, on recale les compteurs du Pass
    // au lieu d'attendre que le joueur dépasse à nouveau son ancien total de victoires.
    if (game.wins < data.lastWins || game.rankedWins < data.lastRankedWins) {
      const next = { ...data, lastWins: game.wins, lastRankedWins: game.rankedWins };
      save(next);
      setData(next);
      return;
    }
    const normalWins = Math.max(0, game.wins - data.lastWins);
    const rankedWins = Math.max(0, game.rankedWins - data.lastRankedWins);
    if (!normalWins && !rankedWins) return;
    setData((current) => {
      // Les victoires classées sont déjà comptées dans `wins` par le moteur : on ajoute
      // seulement un bonus classé de 40 XP, pour un total de 100 XP par victoire classée.
      const next = {
        ...current,
        xp: Math.min(MAX_LEVEL * XP_PER_LEVEL, current.xp + normalWins * 60 + rankedWins * 40),
        lastWins: game.wins,
        lastRankedWins: game.rankedWins,
      };
      save(next);
      return next;
    });
  }, [game.wins, game.rankedWins, data.lastWins, data.lastRankedWins]);

  const patch = (next: Save) => { save(next); setData(next); };
  const buy = () => {
    if (data.premium || game.gems < PREMIUM_PRICE) return;
    game.addGems(-PREMIUM_PRICE);
    patch({ ...data, premium: true });
  };
  const grant = (reward: Reward) => {
    if (reward.kind === 'gold') game.addGold(reward.amount || 0);
    if (reward.kind === 'gems') game.addGems(reward.amount || 0);
    if (reward.kind === 'booster' && reward.faction) game.openBooster(reward.faction, 0, 1);
    if (reward.kind === 'terrain' && (reward.id === 'swamp' || reward.id === 'ruins')) {
      const id = reward.id as PassTerrain;
      useGame.setState((state) => ({
        purchasedTerrains: state.purchasedTerrains.includes(id as never) ? state.purchasedTerrains : [...state.purchasedTerrains, id as never],
      }));
    }
    if (reward.kind === 'avatar' && reward.id) {
      useGame.setState((state) => ({ purchasedAvatars: state.purchasedAvatars.includes(reward.id!) ? state.purchasedAvatars : [...state.purchasedAvatars, reward.id!] }));
    }
  };
  const claim = (rewardLevel: number, premium: boolean, reward?: Reward) => {
    if (!reward || rewardLevel > level || (premium && !data.premium)) return;
    const key = premium ? 'claimedPremium' : 'claimedFree';
    if (data[key].includes(rewardLevel)) return;
    grant(reward);
    patch({ ...data, [key]: [...data[key], rewardLevel] });
  };
  const ownsPassTerrain = (id: PassTerrain) => (game.purchasedTerrains as readonly string[]).includes(id);
  const selectedTerrain = game.selectedTerrain as string;
  const equipTerrain = (id: PassTerrain) => {
    if (!ownsPassTerrain(id)) return;
    useGame.setState({ selectedTerrain: id as never });
  };

  return <>
    <button className="battle-pass-widget" onClick={() => setOpen(true)}>
      <small>PASS DE COMBAT · SAISON 1</small><b>Niveau {level}/{MAX_LEVEL}</b>
      <span><i style={{ width: `${progress}%` }} /></span><em>{data.premium ? 'PREMIUM ACTIF' : 'Voie gratuite'}</em>
    </button>
    {open && <div className="battle-pass-overlay" onClick={() => setOpen(false)}>
      <section className="battle-pass-panel" onClick={(event) => event.stopPropagation()}>
        <header><div><small>SAISON 1 · L’ÉCHO DU NEXUS</small><h2>Pass de combat</h2><p>Niveau {level} · Les victoires font progresser le pass.</p></div><button onClick={() => setOpen(false)}>×</button></header>
        {!data.premium && <button className="battle-pass-premium" disabled={game.gems < PREMIUM_PRICE} onClick={buy}>Débloquer Premium · 💎 {PREMIUM_PRICE}</button>}
        {(ownsPassTerrain('ruins') || ownsPassTerrain('swamp')) && <div className="battle-pass-terrain-bar">
          <small>TERRAINS DU PASS</small>
          {(['ruins', 'swamp'] as PassTerrain[]).filter(ownsPassTerrain).map((id) => <button key={id} className={selectedTerrain === id ? 'active' : ''} onClick={() => equipTerrain(id)}>{id === 'ruins' ? 'Ruines Crépusculaires' : 'Marais du Nexus'}{selectedTerrain === id ? ' · Équipé' : ' · Équiper'}</button>)}
        </div>}
        <div className="battle-pass-track">{Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((rewardLevel) => {
          const free = freeReward(rewardLevel), premium = premiumReward(rewardLevel, mythic?.id);
          return <article key={rewardLevel} className={rewardLevel <= level ? 'reached' : ''}>
            <strong>{rewardLevel}</strong>
            <button disabled={!free || rewardLevel > level || data.claimedFree.includes(rewardLevel)} onClick={() => claim(rewardLevel, false, free)}><small>GRATUIT</small><b>{free?.label || '—'}</b><em>{data.claimedFree.includes(rewardLevel) ? '✓ Récupéré' : rewardLevel <= level && free ? 'Récupérer' : ''}</em></button>
            <button className="premium" disabled={!premium || rewardLevel > level || !data.premium || data.claimedPremium.includes(rewardLevel)} onClick={() => claim(rewardLevel, true, premium)}><small>PREMIUM</small><b>{premium?.label || '—'}</b><em>{data.claimedPremium.includes(rewardLevel) ? '✓ Récupéré' : rewardLevel <= level && data.premium && premium ? 'Récupérer' : ''}</em></button>
          </article>;
        })}</div>
      </section>
    </div>}
  </>;
}
