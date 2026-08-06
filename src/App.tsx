import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_CARDS, AnimationMode, copiesInDeck, InterfaceScale, Language, maxCopiesAllowed, UNLOCK_SECOND_FACTION_AT, useGame, VisualQuality, XP_PER_LEVEL } from './store/game';
import { cardsByFaction, getCard } from './engine/cards';
import { CardDef, Faction, FieldUnit, GameState, SupportCard } from './engine/types';
import { CHAPTERS, chapterById } from './engine/campaign';
import { activateSupportCard, activateUnitEffect, declareAttack, endTurn, evolveUnit, newGame, playCard } from './engine/engine';
import cardBack from './assets/cards/nexus-card-back.jpg';

const nav = ['Jouer', 'Campagne', 'Collection', 'Decks', 'Profil', 'Classement', 'Boutique', 'Tutoriel', 'Paramètres'];
const path = (x: string) => (x === 'Jouer' ? '/' : '/' + x.toLowerCase());
const CARD_BACK_URL = `${import.meta.env.BASE_URL}cards/card-back.jpg`;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };
  return { available: !!deferred, install };
}

function useFullscreen() {
  const [active, setActive] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock('landscape').catch(() => {});
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  };
  return { active, toggle };
}

function FullscreenButton() {
  const { active, toggle } = useFullscreen();
  return <button className="fullscreen-toggle" onClick={toggle} title={active ? 'Quitter le plein écran' : 'Plein écran'}>{active ? '⤡' : '⛶'}</button>;
}

function PortraitGate() {
  return <div className="portrait-gate" aria-hidden="true"><div><span className="rotate-icon">⟳</span><p>Tourne ton appareil</p><small>Nexus Arena se joue en mode paysage.</small></div></div>;
}

const MENU_TRACK = 'audio/menu-theme.mp3';
const COMBAT_TRACKS = ['audio/combat/duel-1-dark-intense.mp3','audio/combat/duel-2-epique-choeurs.mp3','audio/combat/duel-3-agressive.mp3'];
const sharedAudioRef: { current: HTMLAudioElement | null } = { current: null };

function MusicManager() {
  const location = useLocation();
  const enabled = useGame((s) => s.musicEnabled);
  const inCombat = location.pathname === '/combat';
  const wasInCombat = useRef(false);
  const [track, setTrack] = useState(MENU_TRACK);
  useEffect(() => {
    if (inCombat && !wasInCombat.current) setTrack(COMBAT_TRACKS[Math.floor(Math.random() * COMBAT_TRACKS.length)]);
    else if (!inCombat && wasInCombat.current) setTrack(MENU_TRACK);
    wasInCombat.current = inCombat;
  }, [inCombat]);
  useEffect(() => {
    const audio = sharedAudioRef.current;
    if (!audio) return;
    audio.volume = inCombat ? 0.4 : 0.45;
    if (enabled) { audio.load(); audio.play().catch(() => {}); }
  }, [track]);
  useEffect(() => { const audio = sharedAudioRef.current; if (audio) audio.volume = inCombat ? 0.4 : 0.45; }, [inCombat]);
  return <audio ref={(el) => { sharedAudioRef.current = el; }} src={`${import.meta.env.BASE_URL}${track}`} loop preload="none" />;
}

function MusicToggle() {
  const enabled = useGame((s) => s.musicEnabled);
  const setMusicEnabled = useGame((s) => s.setMusicEnabled);
  const onClick = () => {
    const next = !enabled;
    setMusicEnabled(next);
    const audio = sharedAudioRef.current;
    if (audio) next ? (audio.load(), audio.play().catch(() => {})) : audio.pause();
  };
  return <button className="music-toggle" onClick={onClick} title={enabled ? 'Couper la musique' : 'Activer la musique du menu'}>{enabled ? '🔊' : '🔈'}</button>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <><PortraitGate /><MusicManager /><aside><h1>✦ NEXUS <small>CARD ARENA</small></h1>{nav.map((x) => <NavLink key={x} to={path(x)} end={x === 'Jouer'}>{x}</NavLink>)}</aside><main>{children}</main><div className="hud-buttons"><MusicToggle /><FullscreenButton /></div></>;
}

const CardView = ({ card, onClick, disabled, badge }: { card: CardDef; onClick?: () => void; disabled?: boolean; badge?: string }) => (
  <motion.button whileHover={disabled ? undefined : { y: -8, rotate: 1 }} className={'card ' + card.rarity} onClick={onClick} disabled={disabled}>
    <i>{card.faction}</i><b>{card.name}</b><img className="card-art" src={card.image} alt={card.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = cardBack; }} /><p>{card.text}</p><footer><span>{card.cost} ◆</span>{card.type === 'unit' ? <span>⚔ {card.attack}　♥ {card.health}</span> : <span>Sort</span>}</footer>{badge && <em className="card-badge">{badge}</em>}
  </motion.button>
);

function Home() {
  const go = useNavigate(); const s = useGame(); const { available: canInstall, install } = useInstallPrompt();
  const opponentFaction: Faction = s.faction === 'Meute' ? 'Chevalier' : 'Meute';
  const heroBg = `${import.meta.env.BASE_URL}backgrounds/home-hero.jpg`;
  return <section className="home-hero" style={{ backgroundImage: `url(${heroBg})` }}><header className="home-topbar"><div className="home-logo"><span className="home-logo-mark">✦</span><div><b>NEXUS</b><small>CARD ARENA</small></div></div>{canInstall && <button className="install-button" onClick={install}>↓ Installer</button>}</header><div className="home-showcase"><div className="home-copy"><p className="eyebrow">LE SERMENT ET LA MEUTE</p><h2>Entre dans<br /><em>l'Évosphère</em></h2><p>Construis ton héritage, affronte les gardiens de Nexus et découvre ce que la Reine a effacé.</p><div className="faction-pick compact">{(['Meute', 'Chevalier'] as Faction[]).map((f) => { const unlocked = s.unlockedFactions.includes(f); return <button key={f} className={'faction-button' + (s.faction === f ? ' active' : '') + (unlocked ? '' : ' locked')} disabled={!unlocked} title={unlocked ? undefined : `Verrouillé — gagne ${UNLOCK_SECOND_FACTION_AT} chapitres de campagne pour débloquer`} onClick={() => s.setFaction(f)}>{unlocked ? f : `🔒 ${f}`}</button>; })}</div></div></div><div className="menu-cards"><button className="menu-card" onClick={() => go('/campagne')}><span className="menu-card-icon gold">✦</span><span className="menu-card-body"><small>HISTOIRE</small><b>Mode Campagne</b><em>{s.campaignChapter}/{CHAPTERS.length} chapitres terminés</em></span><span className="menu-card-arrow">→</span></button><button className="menu-card" onClick={() => go('/combat')}><span className="menu-card-icon teal">⚔</span><span className="menu-card-body"><small>ENTRAÎNEMENT</small><b>Duel rapide</b><em>Main mélangée · contre {opponentFaction}</em></span><span className="menu-card-arrow">→</span></button><button className="menu-card" onClick={() => go('/paramètres')}><span className="menu-card-icon violet">⚙</span><span className="menu-card-body"><small>NEXUS</small><b>Options</b><em>Graphismes · Langue · Audio</em></span><span className="menu-card-arrow">→</span></button></div><div className="stats"><b>{s.playerName} · Niveau {s.level}</b><span>{s.xp}/{XP_PER_LEVEL} XP · {s.wins} victoires · {s.losses} défaites</span><span>💎 {s.gems} · {s.gold} ✦</span></div></section>;
}

function Campaign() { const s = useGame(); const go = useNavigate(); return <section><h2>Campagne</h2><p className="hint">{s.campaignChapter} / {CHAPTERS.length} chapitres terminés</p><div className="chapter-list">{CHAPTERS.map((chapter, i) => { const locked = i > s.campaignChapter; const done = i < s.campaignChapter; return <article key={chapter.id} className={'chapter' + (locked ? ' locked' : '')}><span className="number">0{i + 1}</span><div className="chapter-body"><b>{chapter.title}</b><small>{done ? 'Victoire inscrite dans les archives' : locked ? 'Scellé par la Reine' : `Gardien ${chapter.opponentFaction} · IA ${chapter.aiDifficulty}`}</small></div>{!locked && <button onClick={() => go('/combat', { state: { chapterId: chapter.id } })}>{done ? 'Rejouer' : 'Jouer'}</button>}{locked && <span>◌</span>}</article>; })}</div></section>; }

function Collection() { const [query, setQuery] = useState(''); const owned = useGame((s) => s.owned); const unlockedFactions = useGame((s) => s.unlockedFactions); const visibleCards = ALL_CARDS.filter((c) => unlockedFactions.includes(c.faction)); const filtered = visibleCards.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())); const lockedFaction = (['Meute', 'Chevalier'] as Faction[]).find((f) => !unlockedFactions.includes(f)); return <section><h2>Collection</h2><input placeholder="Rechercher une carte…" value={query} onChange={(e) => setQuery(e.target.value)} /><div className="grid">{filtered.map((c) => <CardView key={c.id} card={c} badge={owned.includes(c.id) ? undefined : 'Non possédée'} />)}</div><p className="hint">{owned.length}/{visibleCards.filter((c) => c.level === 1).length} cartes de base possédées</p>{lockedFaction && <p className="hint">🔒 Les cartes {lockedFaction} restent cachées tant que la faction n'est pas débloquée — gagne {UNLOCK_SECOND_FACTION_AT} chapitres de campagne.</p>}</section>; }

function Decks() { const s = useGame(); const pool = cardsByFaction(s.faction).filter((c) => c.level === 1); const add = (id: string) => { if (copiesInDeck(s.deck, id) < maxCopiesAllowed(id)) s.saveDeck([...s.deck, id]); }; const removeAt = (i: number) => s.saveDeck(s.deck.filter((_, n) => n !== i)); return <section><h2>Constructeur de decks</h2><p className="hint">{s.deck.length}/40 cartes · faction {s.faction} · minimum 20 pour jouer</p><div className="builder"><div><h3>Deck {s.faction}</h3>{s.deck.map((id, i) => { const c = pool.find((card) => card.id === id); return <button className="deck-row" key={i} onClick={() => removeAt(i)}>{c?.name ?? id} <span>×</span></button>; })}</div><div className="grid">{pool.map((c) => <CardView key={c.id} card={c} badge={`${copiesInDeck(s.deck, c.id)}/${maxCopiesAllowed(c.id)}`} disabled={copiesInDeck(s.deck, c.id) >= maxCopiesAllowed(c.id)} onClick={() => add(c.id)} />)}</div></div></section>; }

type BattleFx = { type: 'summon'; side: 'player' | 'enemy'; instanceId?: string } | { type: 'attack'; side: 'player' | 'enemy'; instanceId: string } | { type: 'evolution'; side: 'player' | 'enemy'; cardName: string } | null;

function FieldCard({ unit, isEnemy, taunted, selectable, selected, fx, onSelect, damagePulse }: { unit: FieldUnit; isEnemy: boolean; taunted: boolean; selectable: boolean; selected: boolean; fx: BattleFx; onSelect?: (id: string) => void; damagePulse?: { key: string; amount: number } }) {
  const card = ALL_CARDS.find((entry) => entry.id === unit.cardId); if (!card) return null;
  const isSummoning = fx?.type === 'summon' && fx.side === (isEnemy ? 'enemy' : 'player') && (!fx.instanceId || fx.instanceId === unit.instanceId);
  const isAttacking = fx?.type === 'attack' && fx.instanceId === unit.instanceId; const isHit = !!damagePulse;
  return <motion.button layout initial={{ scale: 0.15, opacity: 0, rotateY: 100 }} animate={isAttacking ? { scale: [1, 1.12, 1], y: isEnemy ? [0, 32, 0] : [0, -32, 0], opacity: 1, rotateY: 0 } : isSummoning ? { scale: [0.35, 1.18, 1], opacity: [0, 1, 1], rotateY: [90, -8, 0] } : isHit ? { scale: 1, opacity: 1, rotateY: 0, y: 0, x: [0, -7, 7, -5, 5, -2, 2, 0] } : { scale: 1, opacity: 1, rotateY: 0, y: 0, x: 0 }} transition={{ duration: isAttacking ? 0.48 : isHit ? 0.4 : 0.62, ease: 'easeOut' }} className={'field-card ' + card.rarity + (isEnemy && taunted && !unit.taunt ? ' not-targetable' : '') + (unit.taunt ? ' taunt' : '') + (unit.stunnedTurns > 0 ? ' stunned' : '') + (isHit ? ' hit-flash' : '') + (selected ? ' selected' : '')} disabled={!selectable} onClick={() => onSelect?.(unit.instanceId)} data-card-id={card.id} data-instance-id={unit.instanceId} data-evolvable={Boolean(!isEnemy && card.waitTurns && card.evolvesTo && unit.turnsOnField >= card.waitTurns)} data-evolution-name={card.evolvesTo ? ALL_CARDS.find((entry) => entry.id === card.evolvesTo)?.name ?? '' : ''} data-card-text={card.text} data-card-cost={card.cost} data-card-rarity={card.rarity} data-card-faction={card.faction} data-wait-turns={card.waitTurns ?? ''} data-turns-on-field={unit.turnsOnField} data-effect-uses={unit.effectUsesThisTurn ?? 0} data-effect-max={card.effect && !card.text.toLowerCase().includes('à l’invocation') ? (card.text.toLowerCase().includes('2 fois par tour') ? 2 : 1) : 0} data-has-effect={Boolean(card.effect)}><img src={card.image} alt={card.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /><span className="field-card-name">{card.name}</span><span className="field-card-level">NIV {card.level}</span><span className="field-card-atk">⚔ {unit.attack}</span><span className="field-card-hp">♥ {unit.health}</span><span className="field-card-tags">{unit.taunt && <em>PROVOCATION</em>}{unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}</span>{damagePulse && <motion.span key={damagePulse.key} className="dmg-float" initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: [1, 1, 0], y: -46, scale: [0.8, 1.25, 1] }} transition={{ duration: 0.85, ease: 'easeOut' }}>-{damagePulse.amount}</motion.span>}</motion.button>;
}

function Zone({ title, units, isEnemy, taunted, selectable, selectedId, fx, onSelect, support, onActivateSupport, damagePulses }: { title: string; units: FieldUnit[]; isEnemy: boolean; taunted: boolean; selectable: boolean; selectedId?: string | null; fx: BattleFx; onSelect?: (id: string) => void; support: SupportCard[]; onActivateSupport?: (instanceId: string) => void; damagePulses: Record<string, { key: string; amount: number }> }) {
  return <div className={'zone-wrap ' + (isEnemy ? 'enemy-zone' : 'player-zone')}><b>{title}</b><div className="board">{Array.from({ length: 3 }, (_, index) => { const unit = units[index]; return unit ? <FieldCard key={unit.instanceId} unit={unit} isEnemy={isEnemy} taunted={taunted} selectable={selectable} selected={selectedId === unit.instanceId} fx={fx} onSelect={onSelect} damagePulse={damagePulses[unit.instanceId]} /> : <div className="field-slot" key={`slot-${index}`}>◇</div>; })}</div><div className="support-row" aria-label="Zone de soutien">{Array.from({ length: 5 }, (_, index) => { const item = support[index]; if (!item) return <div key={`sup-empty-${index}`}>◇</div>; const def = getCard(item.cardId); return <button key={item.instanceId} className="support-card" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} disabled={isEnemy || !onActivateSupport} title={isEnemy ? 'Sort adverse posé face cachée' : `${def.name} — clique pour tenter de l'activer`} onClick={() => onActivateSupport?.(item.instanceId)} />; })}</div><small>SOUTIEN {support.length}/5</small></div>;
}

function Combat() {
  const s = useGame(); const location = useLocation(); const go = useNavigate();
  const chapterId = (location.state as { chapterId?: number } | null)?.chapterId;
  const chapter = chapterId !== undefined ? chapterById(chapterId) : undefined;
  const opponentFaction = chapter ? chapter.opponentFaction : s.faction === 'Meute' ? 'Chevalier' : 'Meute';
  const aiDifficulty = chapter ? chapter.aiDifficulty : 'novice'; const lifeBonus = chapter ? chapter.enemyLifeBonus : 0; const reward = chapter ? chapter.reward : 35;
  const startMatch = () => newGame(s.faction, opponentFaction, aiDifficulty, s.deck, lifeBonus);
  const [match, setMatch] = useState<GameState>(startMatch); const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null); const [reported, setReported] = useState(false); const [inspectedHandCard, setInspectedHandCard] = useState<string | null>(null); const [effectHint, setEffectHint] = useState(''); const [inspectedUnit, setInspectedUnit] = useState<string | null>(null); const [unitPulses, setUnitPulses] = useState<Record<string, { key: string; amount: number }>>({}); const [heroPulses, setHeroPulses] = useState<{ player?: { key: string; amount: number }; enemy?: { key: string; amount: number } }>({});
  const pulseFromDiff = (before: GameState, after: GameState) => { const units: Record<string, { key: string; amount: number }> = {}; const heroes: { player?: { key: string; amount: number }; enemy?: { key: string; amount: number } } = {}; for (const side of ['player', 'enemy'] as const) { const beforeMap = new Map(before[side].field.map((u) => [u.instanceId, u.health])); for (const u of after[side].field) { const prevHp = beforeMap.get(u.instanceId); if (prevHp != null && u.health < prevHp) units[u.instanceId] = { key: `${u.instanceId}-${Date.now()}-${Math.random()}`, amount: prevHp - u.health }; } if (after[side].life < before[side].life) heroes[side] = { key: `${side}-${Date.now()}`, amount: before[side].life - after[side].life }; } if (Object.keys(units).length || Object.keys(heroes).length) { setUnitPulses(units); setHeroPulses(heroes); window.setTimeout(() => { setUnitPulses({}); setHeroPulses({}); }, 950); } };
  const [fx, setFx] = useState<BattleFx>(null); const [pileOpen, setPileOpen] = useState<null | 'deck' | 'grave' | 'evo'>(null); const fxTimer = useRef<number | null>(null);
  const triggerFx = (nextFx: BattleFx, duration = 700) => { if (fxTimer.current) window.clearTimeout(fxTimer.current); setFx(nextFx); fxTimer.current = window.setTimeout(() => setFx(null), duration); };
  useEffect(() => () => { if (fxTimer.current) window.clearTimeout(fxTimer.current); }, []);
  useEffect(() => { if (!match.winner || reported) return; const won = match.winner === 'player'; s.record(won); if (won) { s.addGold(reward); if (chapter) s.completeChapter(chapter.id); } setReported(true); }, [match.winner, reported, reward, chapter, s]);
  const play = (id: string) => { if (match.activePlayer !== 'player' || match.winner) return; const card = ALL_CARDS.find((entry) => entry.id === id); const before = match; const next = playCard(match, 'player', id); setMatch(next); pulseFromDiff(before, next); if (card?.type === 'unit' && next !== match) { const newest = next.player.field[next.player.field.length - 1]; triggerFx({ type: 'summon', side: 'player', instanceId: newest?.instanceId }, 720); } };
  const selectAttacker = (id: string) => { if (match.activePlayer !== 'player' || match.winner) return; const unit = match.player.field.find((entry) => entry.instanceId === id); if (!unit || !unit.canAttack || unit.stunnedTurns > 0) return; setSelectedAttacker((current) => current === id ? null : id); };
  const attackUnit = (targetId: string) => { if (!selectedAttacker) return; const before = match; triggerFx({ type: 'attack', side: 'player', instanceId: selectedAttacker }, 520); const next = declareAttack(match, 'player', selectedAttacker, targetId); setMatch(next); pulseFromDiff(before, next); setSelectedAttacker(null); };
  const attackHero = () => { if (!selectedAttacker) return; const before = match; triggerFx({ type: 'attack', side: 'player', instanceId: selectedAttacker }, 520); const next = declareAttack(match, 'player', selectedAttacker, null); setMatch(next); pulseFromDiff(before, next); setSelectedAttacker(null); };
  const evolve = (instanceId: string) => { const beforeUnit = match.player.field.find((entry) => entry.instanceId === instanceId); if (!beforeUnit) return; const beforeCard = ALL_CARDS.find((entry) => entry.id === beforeUnit.cardId); const evolvedCard = beforeCard?.evolvesTo ? ALL_CARDS.find((entry) => entry.id === beforeCard.evolvesTo) : undefined; const next = evolveUnit(match, 'player', instanceId); if (next === match) return; setMatch(next); triggerFx({ type: 'evolution', side: 'player', cardName: evolvedCard?.name ?? 'Évolution' }, 1000); };
  const activateEffect = (instanceId: string) => { const before = match; const unit = before.player.field.find((entry) => entry.instanceId === instanceId); if (!unit) return; const card = ALL_CARDS.find((entry) => entry.id === unit.cardId); const next = activateUnitEffect(before, 'player', instanceId); if (next === before) { setEffectHint('Cet effet ne peut pas être activé maintenant.'); window.setTimeout(() => setEffectHint(''), 2000); return; } setMatch(next); pulseFromDiff(before, next); setEffectHint(card ? `Effet de ${card.name} activé !` : 'Effet activé !'); window.setTimeout(() => setEffectHint(''), 2000); };
  const activateSupport = (instanceId: string) => { const before = match; const item = before.player.support.find((entry) => entry.instanceId === instanceId); if (!item) return; const card = getCard(item.cardId); const next = activateSupportCard(before, 'player', instanceId); if (next === before) { setEffectHint(`${card.name} ne peut pas être activé maintenant.`); window.setTimeout(() => setEffectHint(''), 2200); return; } setMatch(next); pulseFromDiff(before, next); setEffectHint(`${card.name} activé !`); window.setTimeout(() => setEffectHint(''), 2000); };
  const nextTurn = () => { if (match.activePlayer !== 'player' || match.winner) return; setSelectedAttacker(null); const before = match; triggerFx(null); const afterPlayerEnd = endTurn(match); setMatch(afterPlayerEnd); pulseFromDiff(before, afterPlayerEnd); };
  const restart = () => { setMatch(startMatch()); setReported(false); setSelectedAttacker(null); setInspectedHandCard(null); setEffectHint(''); setInspectedUnit(null); setUnitPulses({}); setHeroPulses({}); };
  const enemyHasTaunt = match.enemy.field.some((unit) => unit.taunt); const activePlayerUnit = inspectedUnit ? match.player.field.find((unit) => unit.instanceId === inspectedUnit) : undefined;
  const pileCards: CardDef[] = pileOpen === 'deck' ? match.player.deck.map((id: string) => getCard(id)) : pileOpen === 'grave' ? match.player.graveyard.map((id: string) => getCard(id)) : pileOpen === 'evo' ? match.player.evosphere.map((id: string) => getCard(id)) : [];
  return <section className="battle"><div className="battle-meta"><b>{chapter ? `Chapitre ${chapter.id + 1} — ${chapter.title}` : 'Duel rapide'}</b><span>IA {aiDifficulty}</span></div><div className="battle-top"><div className="combatant enemy-combatant"><span className="avatar">✦</span><div><b>{chapter ? chapter.title : 'Rival Nexus'}</b><small>{opponentFaction}</small></div><span className="life">♥ {match.enemy.life}</span><span className="mana">◆ {match.enemy.mana}/{match.enemy.maxMana}</span>{heroPulses.enemy && <span className="hero-dmg">-{heroPulses.enemy.amount}</span>}</div></div><div className="battle-main"><div className="pile-rail left"><button className="card-pile grave" onClick={() => setPileOpen('grave')}><span className="pile-stack" /><span className="pile-icon">☠</span><b>FOSSE</b><em>{match.player.graveyard.length}</em></button></div><div className="battle-center"><Zone title="ADVERSAIRE" units={match.enemy.field} isEnemy taunted={enemyHasTaunt} selectable={!!selectedAttacker} selectedId={null} fx={fx} onSelect={attackUnit} support={match.enemy.support} damagePulses={unitPulses} /><div className="turn-strip"><b>{match.activePlayer === 'player' ? 'À TOI DE JOUER' : "TOUR DE L'ADVERSAIRE"}</b><span>Tour {match.turn}</span>{selectedAttacker && <button className="attack-face" disabled={enemyHasTaunt} onClick={attackHero}>Attaquer directement</button>}</div><Zone title="TON TERRAIN" units={match.player.field} isEnemy={false} taunted={false} selectable={match.activePlayer === 'player'} selectedId={selectedAttacker} fx={fx} onSelect={selectAttacker} support={match.player.support} onActivateSupport={activateSupport} damagePulses={unitPulses} /></div><div className="pile-rail right"><button className="card-pile evo" onClick={() => setPileOpen('evo')}><span className="pile-stack" /><span className="pile-icon">✦</span><b>ÉVOSPHÈRE</b><em>{match.player.evosphere.length}</em></button><button className="card-pile deck" onClick={() => setPileOpen('deck')}><span className="pile-stack" /><span className="pile-icon">▣</span><b>DECK</b><em>{match.player.deck.length}</em></button></div></div><div className="hand">{match.player.hand.map((id: string, index: number) => { const card = getCard(id); return <div key={`${id}-${index}`} className="hand-card-wrap"><CardView card={card} disabled={match.activePlayer !== 'player' || !!match.winner} onClick={() => play(id)} /><button className="inspect-card" onClick={() => setInspectedHandCard(id)} aria-label={`Inspecter ${card.name}`}>⌕</button></div>; })}</div><div className="battle-footer"><span className="life-readout">{s.playerName} · PV ♥ {match.player.life}</span><span className="mana-readout">◆ {match.player.mana}/{match.player.maxMana}</span><button className="end-turn" onClick={nextTurn} disabled={match.activePlayer !== 'player' || !!match.winner}>TERMINER LE TOUR</button>{heroPulses.player && <span className="hero-dmg player">-{heroPulses.player.amount}</span>}</div>{fx?.type === 'evolution' && <div className="evolution-flash"><span>ÉVOLUTION</span><b>{fx.cardName}</b></div>}{pileOpen && <div className="pile-modal" role="dialog" aria-modal="true" onClick={() => setPileOpen(null)}><div className="pile-modal-content" onClick={(e) => e.stopPropagation()}><header><h3>{pileOpen === 'deck' ? 'Deck' : pileOpen === 'grave' ? 'Fosse' : 'Évosphère'}</h3><button onClick={() => setPileOpen(null)}>×</button></header><div className="pile-grid">{pileCards.length ? pileCards.map((card: CardDef, i: number) => <CardView key={`${card.id}-${i}`} card={card} />) : <p className="hint">Aucune carte.</p>}</div></div></div>}{activePlayerUnit && (() => { const def = getCard(activePlayerUnit.cardId); const canEvolve = !!def.evolvesTo && !!def.waitTurns && activePlayerUnit.turnsOnField >= def.waitTurns; const maxUses = def.effect && !def.text.toLowerCase().includes('à l’invocation') ? (def.text.toLowerCase().includes('2 fois par tour') ? 2 : 1) : 0; return <div className="unit-actions"><b>{def.name}</b><p>{def.text}</p>{maxUses > 0 && <button className="secondary" onClick={() => activateEffect(activePlayerUnit.instanceId)}>Activer l'effet ({activePlayerUnit.effectUsesThisTurn ?? 0}/{maxUses})</button>}{canEvolve && <button className="primary" onClick={() => evolve(activePlayerUnit.instanceId)}>ÉVOLUER</button>}<button onClick={() => setInspectedUnit(null)}>Fermer</button></div>; })()}{inspectedHandCard && (() => { const card = ALL_CARDS.find((entry) => entry.id === inspectedHandCard); if (!card) return null; return <button type="button" className="card spell-preview-proxy" data-card-id={card.id} data-hand-card="true" data-effect-text={card.text} data-card-type="Sort" data-card-cost={card.cost} data-card-rarity={card.rarity} onClick={() => {}}><i>{card.faction}</i><b>{card.name}</b><img className="card-art" src={card.image} alt={card.name} /><p>{card.text}</p><footer><span>{card.cost} ◆</span><span>Sort</span></footer></button>; })()}{effectHint && <div className="effect-hint">💡 {effectHint}</div>}{match.winner && <div className="match-result"><p className={match.winner === 'player' ? 'win' : 'loss'}>{match.winner === 'player' ? `Victoire ! +${reward} ✦` : 'Défaite — retente ta chance.'}</p><div className="match-result-actions"><button className="primary" onClick={restart}>{chapter ? 'Rejouer ce chapitre' : 'Nouveau duel'}</button>{chapter && <button className="secondary" onClick={() => go('/campagne')}>Retour à la campagne</button>}</div></div>}</section>;
}

function Profile() {
  const s = useGame();
  const [name, setName] = useState(s.playerName);
  const avatarCards = ALL_CARDS.filter((card) => card.type === 'unit' && card.level === 1 && s.unlockedFactions.includes(card.faction));
  const avatar = ALL_CARDS.find((card) => card.id === s.avatarCardId) ?? avatarCards[0];
  const saveName = () => s.setPlayerName(name);
  return <section><h2>Profil du joueur</h2><div className="profile profile-editor"><div className="profile-avatar">{avatar ? <img src={avatar.image} alt={avatar.name} /> : <b>✦</b>}</div><div className="profile-main"><label>Pseudo<input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} onBlur={saveName} /></label><button className="secondary" onClick={saveName}>Enregistrer le pseudo</button><p>Niveau {s.level} · {s.wins} victoires · {s.losses} défaites</p><div className="xp-row"><progress value={s.xp} max={XP_PER_LEVEL} /><span>{s.xp}/{XP_PER_LEVEL} XP</span></div><p>💎 {s.gems} gemmes · ✦ {s.gold} or</p></div></div><h3>Choisir une image de profil</h3><div className="avatar-grid">{avatarCards.map((card) => <button key={card.id} className={'avatar-choice' + (s.avatarCardId === card.id ? ' active' : '')} onClick={() => s.setAvatarCardId(card.id)} title={card.name}><img src={card.image} alt={card.name} /><span>{card.name}</span></button>)}</div></section>;
}

const LANGUAGE_LABELS: Record<Language, string> = { fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano', pt: 'Português' };
const QUALITY_LABELS: Record<VisualQuality, string> = { eco: 'Économie', balanced: 'Équilibrée', high: 'Élevée' };
const ANIMATION_LABELS: Record<AnimationMode, string> = { full: 'Complètes', reduced: 'Réduites', off: 'Désactivées' };
const SCALE_LABELS: Record<InterfaceScale, string> = { small: 'Petite', normal: 'Normale', large: 'Grande' };
function Options() {
  const s = useGame();
  return <section><h2>Options</h2><div className="options-grid"><article className="options-card"><b>Audio</b><p className="hint">Musique de menu et de duel.</p><button className="secondary" onClick={() => s.setMusicEnabled(!s.musicEnabled)}>{s.musicEnabled ? '🔊 Musique activée' : '🔈 Musique coupée'}</button></article><article className="options-card"><b>Affichage</b><p className="hint">Réglages adaptés au mobile et aux performances de l'appareil.</p><label>Qualité visuelle<select value={s.visualQuality} onChange={(e) => s.setVisualQuality(e.target.value as VisualQuality)}>{(Object.keys(QUALITY_LABELS) as VisualQuality[]).map((value) => <option key={value} value={value}>{QUALITY_LABELS[value]}</option>)}</select></label><label>Animations<select value={s.animationMode} onChange={(e) => s.setAnimationMode(e.target.value as AnimationMode)}>{(Object.keys(ANIMATION_LABELS) as AnimationMode[]).map((value) => <option key={value} value={value}>{ANIMATION_LABELS[value]}</option>)}</select></label><label>Taille de l'interface<select value={s.interfaceScale} onChange={(e) => s.setInterfaceScale(e.target.value as InterfaceScale)}>{(Object.keys(SCALE_LABELS) as InterfaceScale[]).map((value) => <option key={value} value={value}>{SCALE_LABELS[value]}</option>)}</select></label><button className="secondary" onClick={() => s.setGlowEffects(!s.glowEffects)}>{s.glowEffects ? '✨ Effets lumineux activés' : 'Effets lumineux désactivés'}</button><button className="secondary" onClick={() => s.setScreenShake(!s.screenShake)}>{s.screenShake ? '📳 Tremblements activés' : 'Tremblements désactivés'}</button></article><article className="options-card"><b>Langue</b><p className="hint">Choisis la langue de l'interface.</p><select value={s.language} onChange={(e) => s.setLanguage(e.target.value as Language)}>{(Object.keys(LANGUAGE_LABELS) as Language[]).map((language) => <option key={language} value={language}>{LANGUAGE_LABELS[language]}</option>)}</select></article></div></section>;
}

function Simple({ title }: { title: string }) { return <section><h2>{title}</h2><p className="hint">Cette section arrive dans une prochaine passe de développement.</p></section>; }

function FactionOnboarding() { const s = useGame(); const wolfArt = `${import.meta.env.BASE_URL}cards/evo-loup-de-givre.png`; const blurbs: Record<Faction, string> = { Meute: 'Rejoins les loups des brumes. Instinct, meute et lune rouge — frappe vite, en nombre.', Chevalier: "Sers l'ordre du royaume. Discipline, provocation et lumière sacrée — tiens la ligne." }; return <div className="onboarding"><div className="onboarding-inner"><p className="eyebrow">CHOISIS TON SERMENT</p><h2>Quel camp défendras-tu ?</h2><p>Ce choix détermine ton deck de départ. L'autre faction reste verrouillée jusqu'à ce que tu remportes les {UNLOCK_SECOND_FACTION_AT} premiers chapitres de la campagne.</p><div className="onboarding-choices"><button className="onboarding-card" onClick={() => s.chooseStartingFaction('Meute')}><span className="onboarding-art" style={{ backgroundImage: `url(${wolfArt})` }} /><b>Meute</b><small>{blurbs.Meute}</small></button><button className="onboarding-card" onClick={() => s.chooseStartingFaction('Chevalier')}><span className="onboarding-art onboarding-art-placeholder">⚜</span><b>Chevalier</b><small>{blurbs.Chevalier}</small></button></div></div></div>; }

function DisplaySettingsBridge() {
  const s = useGame();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.quality = s.visualQuality;
    root.dataset.animations = s.animationMode;
    root.dataset.glow = s.glowEffects ? 'on' : 'off';
    root.dataset.shake = s.screenShake ? 'on' : 'off';
    root.dataset.uiScale = s.interfaceScale;
  }, [s.visualQuality, s.animationMode, s.glowEffects, s.screenShake, s.interfaceScale]);
  return null;
}

export default function App() { const factionChosen = useGame((s) => s.factionChosen); const hasLegacyDeck = useGame((s) => s.deck.length > 0); if (!factionChosen && !hasLegacyDeck) return <FactionOnboarding />; return <><DisplaySettingsBridge /><Shell><Routes><Route path="/" element={<Home />} /><Route path="/campagne" element={<Campaign />} /><Route path="/collection" element={<Collection />} /><Route path="/decks" element={<Decks />} /><Route path="/profil" element={<Profile />} /><Route path="/combat" element={<Combat />} /><Route path="/paramètres" element={<Options />} />{['classement', 'boutique', 'tutoriel'].map((x) => <Route key={x} path={'/' + x} element={<Simple title={x[0].toUpperCase() + x.slice(1)} />} />)}</Routes></Shell></>; }
