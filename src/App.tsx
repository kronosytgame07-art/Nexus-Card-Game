import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_CARDS, AnimationMode, copiesInDeck, EVOSPHERE_MAX, InterfaceScale, Language, MAIN_DECK_MAX, MAIN_DECK_MIN, maxCopiesAllowed, UNLOCK_SECOND_FACTION_AT, useGame, VisualQuality, XP_PER_LEVEL } from './store/game';
import { cardsByFaction, getCard } from './engine/cards';
import { CardDef, Faction, FieldUnit, GameState, SupportCard } from './engine/types';
import { CHAPTERS, chapterById } from './engine/campaign';
import { activateSupportCard, activateUnitEffect, aiDrawPhase, aiEndPhase, aiMainPhase, aiPrepareBattlePlan, aiResolveOneAttack, declareAttack, evolveUnit, newGame, playCard } from './engine/engine';
import cardBack from './assets/cards/nexus-card-back.jpg';
import ArenaBackground, { ArenaBackgroundHandle } from './components/ArenaBackground';
import VfxLayer, { VfxHandle } from './components/VfxLayer';
import HomeSparkles from './components/HomeSparkles';

const nav = ['Jouer', 'Campagne', 'Collection', 'Decks', 'Profil', 'Classement', 'Boutique', 'Tutoriel', 'Paramètres'];
const path = (x: string) => (x === 'Jouer' ? '/' : '/' + x.toLowerCase());
const CARD_BACK_URL = `${import.meta.env.BASE_URL}cards/card-back.jpg`;
const LOGO_URL = `${import.meta.env.BASE_URL}icons/logo-mark.png`;

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
  const musicVolume = useGame((s) => s.musicVolume);
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
    audio.volume = (inCombat ? 0.4 : 0.45) * (musicVolume / 100);
    if (enabled) { audio.load(); audio.play().catch(() => {}); }
  }, [track]);
  useEffect(() => { const audio = sharedAudioRef.current; if (audio) audio.volume = (inCombat ? 0.4 : 0.45) * (musicVolume / 100); }, [inCombat, musicVolume]);
  useEffect(() => { const audio = sharedAudioRef.current; if (audio && enabled) audio.play().catch(() => {}); else if (audio && !enabled) audio.pause(); }, [enabled]);
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
  return <><PortraitGate /><MusicManager /><aside><h1><img className="brand-mark" src={LOGO_URL} alt="Nexus Arena" /> NEXUS <small>CARD ARENA</small></h1>{nav.map((x) => <NavLink key={x} to={path(x)} end={x === 'Jouer'}>{x}</NavLink>)}</aside><main>{children}</main><div className="hud-buttons"><MusicToggle /><FullscreenButton /></div></>;
}

const CardView = ({ card, onClick, disabled, badge, fullArt }: { card: CardDef; onClick?: () => void; disabled?: boolean; badge?: string; fullArt?: boolean }) => {
  const [showName, setShowName] = useState(false);
  if (fullArt) {
    return (
      <motion.button
        whileHover={disabled ? undefined : { y: -8, rotate: 1 }}
        className={'card full-art ' + card.rarity}
        onClick={onClick}
        disabled={disabled}
        data-card-type={card.type}
        data-card-name={card.name}
        data-effect-text={card.text}
        onPointerDown={() => setShowName(true)}
        onPointerUp={() => window.setTimeout(() => setShowName(false), 900)}
        onPointerLeave={() => setShowName(false)}
      >
        <img className="card-art-full" src={card.image} alt={card.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = cardBack; }} />
        <span className={'card-name-tooltip' + (showName ? ' show' : '')}>{card.name}</span>
        {badge && <em className="card-badge">{badge}</em>}
      </motion.button>
    );
  }
  return (
    <motion.button whileHover={disabled ? undefined : { y: -8, rotate: 1 }} className={'card ' + card.rarity} onClick={onClick} disabled={disabled} data-card-type={card.type}>
      <i>{card.faction}</i><b>{card.name}</b><img className="card-art" src={card.image} alt={card.name} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = cardBack; }} /><p>{card.text}</p><footer><span>{card.cost} ◆</span>{card.type === 'unit' ? <span>⚔ {card.attack}　♥ {card.health}</span> : <span>Sort</span>}</footer>{badge && <em className="card-badge">{badge}</em>}
    </motion.button>
  );
};

function Home() {
  const go = useNavigate(); const s = useGame(); const { available: canInstall, install } = useInstallPrompt();
  const opponentFaction: Faction = s.faction === 'Meute' ? 'Chevalier' : 'Meute';
  const heroBg = `${import.meta.env.BASE_URL}backgrounds/home-hero.jpg`;
  const heroVideo = `${import.meta.env.BASE_URL}backgrounds/home-hero.mp4`;
  const reduceMotion = s.animationMode !== 'full';
  const fadeUp = (delay: number) => reduceMotion ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay, ease: 'easeOut' as const } };
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { const video = bgVideoRef.current; if (!video) return; if (s.animationMode === 'off' || s.batterySaver) video.pause(); else video.play().catch(() => {}); }, [s.animationMode, s.batterySaver]);
  useEffect(() => { document.body.classList.add('on-home'); return () => document.body.classList.remove('on-home'); }, []);
  return <section className="home-hero"><video className="home-hero-bg" ref={bgVideoRef} autoPlay loop muted playsInline poster={heroBg}><source src={heroVideo} type="video/mp4" /></video><div className="home-glow a" /><div className="home-glow b" /><HomeSparkles className="home-sparkles" paused={s.animationMode === 'off' || s.batterySaver} /><motion.header className="home-topbar" {...fadeUp(0)}><div className="home-logo"><span className="home-logo-mark"><img src={LOGO_URL} alt="Nexus Arena" /></span><div><b>NEXUS</b><small>CARD ARENA</small></div></div>{canInstall && <button className="install-button" onClick={install}>↓ Installer</button>}</motion.header><motion.div className="home-showcase" {...fadeUp(0.12)}><div className="home-copy"><p className="eyebrow">LE SERMENT ET LA MEUTE</p><h2>Entre dans<br /><em>l'Évosphère</em></h2><p>Construis ton héritage, affronte les gardiens de Nexus et découvre ce que la Reine a effacé.</p><div className="faction-pick compact">{(['Meute', 'Chevalier'] as Faction[]).map((f) => { const unlocked = s.unlockedFactions.includes(f); return <button key={f} className={'faction-button' + (s.faction === f ? ' active' : '') + (unlocked ? '' : ' locked')} disabled={!unlocked} title={unlocked ? undefined : `Verrouillé — gagne ${UNLOCK_SECOND_FACTION_AT} chapitres de campagne pour débloquer`} onClick={() => s.setFaction(f)}>{unlocked ? f : `🔒 ${f}`}</button>; })}</div></div></motion.div><motion.div className="menu-cards" {...fadeUp(0.24)}><button className="menu-card" onClick={() => go('/campagne')}><span className="menu-card-icon gold">✦</span><span className="menu-card-body"><small>HISTOIRE</small><b>Mode Campagne</b><em>{s.campaignChapter}/{CHAPTERS.length} chapitres terminés</em></span><span className="menu-card-arrow">→</span></button><button className="menu-card" onClick={() => go('/combat')}><span className="menu-card-icon teal">⚔</span><span className="menu-card-body"><small>ENTRAÎNEMENT</small><b>Duel rapide</b><em>Main mélangée · contre {opponentFaction}</em></span><span className="menu-card-arrow">→</span></button><button className="menu-card" onClick={() => go('/paramètres')}><span className="menu-card-icon violet">⚙</span><span className="menu-card-body"><small>NEXUS</small><b>Options</b><em>Graphismes · Langue · Audio</em></span><span className="menu-card-arrow">→</span></button></motion.div><motion.div className="stats" {...fadeUp(0.36)}><b>{s.playerName} · Niveau {s.level}</b><span>{s.xp}/{XP_PER_LEVEL} XP · {s.wins} victoires · {s.losses} défaites</span><span>💎 {s.gems} · {s.gold} ✦</span></motion.div></section>;
}

function Campaign() { const s = useGame(); const go = useNavigate(); return <section><h2>Campagne</h2><p className="hint">{s.campaignChapter} / {CHAPTERS.length} chapitres terminés</p><div className="chapter-list">{CHAPTERS.map((chapter, i) => { const locked = i > s.campaignChapter; const done = i < s.campaignChapter; return <article key={chapter.id} className={'chapter' + (locked ? ' locked' : '')}><span className="number">0{i + 1}</span><div className="chapter-body"><b>{chapter.title}</b><small>{done ? 'Victoire inscrite dans les archives' : locked ? 'Scellé par la Reine' : `Gardien ${chapter.opponentFaction} · IA ${chapter.aiDifficulty}`}</small></div>{!locked && <button onClick={() => go('/combat', { state: { chapterId: chapter.id } })}>{done ? 'Rejouer' : 'Jouer'}</button>}{locked && <span>◌</span>}</article>; })}</div></section>; }

function Collection() { const [query, setQuery] = useState(''); const owned = useGame((s) => s.owned); const unlockedFactions = useGame((s) => s.unlockedFactions); const visibleCards = ALL_CARDS.filter((c) => unlockedFactions.includes(c.faction)); const filtered = visibleCards.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())); const lockedFaction = (['Meute', 'Chevalier'] as Faction[]).find((f) => !unlockedFactions.includes(f)); return <section><h2>Collection</h2><input placeholder="Rechercher une carte…" value={query} onChange={(e) => setQuery(e.target.value)} /><div className="grid">{filtered.map((c) => <CardView key={c.id} card={c} badge={owned.includes(c.id) ? undefined : 'Non possédée'} />)}</div><p className="hint">{owned.length}/{visibleCards.filter((c) => c.level === 1).length} cartes de base possédées</p>{lockedFaction && <p className="hint">🔒 Les cartes {lockedFaction} restent cachées tant que la faction n'est pas débloquée — gagne {UNLOCK_SECOND_FACTION_AT} chapitres de campagne.</p>}</section>; }

function DeckMenu({ onEdit }: { onEdit: (id: string) => void }) {
  const s = useGame();
  const [creatingFaction, setCreatingFaction] = useState<Faction | null>(null);
  const [newName, setNewName] = useState('');

  const startCreate = (faction: Faction) => {
    setCreatingFaction(faction);
    setNewName(`Deck ${faction} ${s.decks.filter((d) => d.faction === faction).length + 1}`);
  };
  const confirmCreate = () => {
    if (!creatingFaction) return;
    const id = s.createDeck(newName, creatingFaction);
    setCreatingFaction(null);
    onEdit(id);
  };

  return (
    <section>
      <h2>Mes decks</h2>
      {s.decks.length === 0 ? (
        <p className="hint">Aucun deck pour le moment.</p>
      ) : (
        <div className="deck-menu-list">
          {s.decks.map((d) => {
            const count = d.main.length;
            const status = count < MAIN_DECK_MIN ? 'incomplet' : count > MAIN_DECK_MAX ? 'trop plein' : 'prêt';
            return (
              <article key={d.id} className={'deck-menu-row' + (s.activeDeckId === d.id ? ' active' : '')}>
                <div>
                  <b>{d.name}</b>
                  <small>{d.faction} · {count}/{MAIN_DECK_MAX} cartes · {status}</small>
                </div>
                <div className="deck-menu-actions">
                  <button className="secondary" onClick={() => onEdit(d.id)}>Modifier</button>
                  <button className="secondary" onClick={() => s.setActiveDeck(d.id)} disabled={s.activeDeckId === d.id}>
                    {s.activeDeckId === d.id ? 'Actif' : 'Utiliser'}
                  </button>
                  <button className="secondary danger" onClick={() => { if (confirm(`Supprimer "${d.name}" ?`)) s.deleteDeck(d.id); }}>
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <h3>Créer un nouveau deck</h3>
      {creatingFaction ? (
        <div className="deck-create-form">
          <input value={newName} maxLength={30} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du deck" />
          <button className="primary" onClick={confirmCreate}>Créer {creatingFaction}</button>
          <button className="secondary" onClick={() => setCreatingFaction(null)}>Annuler</button>
        </div>
      ) : (
        <div className="faction-pick compact">
          {(['Meute', 'Chevalier'] as Faction[]).map((f) => {
            const unlocked = s.unlockedFactions.includes(f);
            return (
              <button
                key={f}
                className={'faction-button' + (unlocked ? '' : ' locked')}
                disabled={!unlocked}
                title={unlocked ? undefined : `Verrouillé — gagne ${UNLOCK_SECOND_FACTION_AT} chapitres de campagne`}
                onClick={() => startCreate(f)}
              >
                {unlocked ? `+ ${f}` : `🔒 ${f}`}
              </button>
            );
          })}
        </div>
      )}
      <p className="hint">Règles : {MAIN_DECK_MIN} à {MAIN_DECK_MAX} cartes par deck · pas d'Extra Deck · l'Évosphère (max {EVOSPHERE_MAX}) se choisit toi-même parmi les évolutions des cartes de ton deck · aucun craft, uniquement les cartes déjà possédées.</p>
    </section>
  );
}

function DeckEditor({ deckId, onBack }: { deckId: string; onBack: () => void }) {
  const s = useGame();
  const savedDeck = s.decks.find((d) => d.id === deckId);
  const pool = savedDeck
    ? cardsByFaction(savedDeck.faction).filter((c) => c.level === 1 && s.owned.includes(c.id))
    : [];
  if (!savedDeck) return <section><h2>Deck introuvable</h2><button className="secondary" onClick={onBack}>Retour</button></section>;

  const main = savedDeck.main;
  const count = main.length;
  const add = (id: string) => {
    if (count >= MAIN_DECK_MAX) return;
    if (copiesInDeck(main, id) < maxCopiesAllowed(id)) s.setDeckCards(deckId, [...main, id]);
  };
  const removeAt = (i: number) => s.setDeckCards(deckId, main.filter((_, n) => n !== i));
  const statusClass = count < MAIN_DECK_MIN ? 'warn' : count > MAIN_DECK_MAX ? 'danger' : 'ok';

  const evo = savedDeck.evo;
  const evoCount = evo.length;
  // Une évolution n'est proposable que si la carte niveau 1 dont elle dérive est dans le deck :
  // sans elle sur le terrain, cette évolution ne pourrait jamais être déclenchée en partie.
  const evoPool = cardsByFaction(savedDeck.faction).filter((c) => c.level === 2 && c.evolvesFrom && main.includes(c.evolvesFrom));
  const addEvo = (id: string) => {
    if (evoCount >= EVOSPHERE_MAX) return;
    if (copiesInDeck(evo, id) < maxCopiesAllowed(id)) s.setDeckEvo(deckId, [...evo, id]);
  };
  const removeEvoAt = (i: number) => s.setDeckEvo(deckId, evo.filter((_, n) => n !== i));

  return (
    <section>
      <div className="deck-editor-head">
        <button className="secondary" onClick={onBack}>← Menu des decks</button>
        <h2>{savedDeck.name}</h2>
      </div>
      <p className={'hint deck-count ' + statusClass}>
        {count}/{MAIN_DECK_MAX} cartes ({MAIN_DECK_MIN} minimum pour jouer) · faction {savedDeck.faction}
      </p>
      <div className="builder">
        <div>
          <h3>Composition</h3>
          {main.length === 0 && <p className="hint">Deck vide — ajoute des cartes ci-contre.</p>}
          {main.map((id, i) => {
            const c = pool.find((card) => card.id === id);
            return (
              <button className="deck-row" key={i} onClick={() => removeAt(i)}>
                {c?.name ?? id} <span>×</span>
              </button>
            );
          })}
        </div>
        <div className="grid">
          {pool.map((c) => (
            <CardView
              key={c.id}
              card={c}
              badge={`${copiesInDeck(main, c.id)}/${maxCopiesAllowed(c.id)}`}
              disabled={copiesInDeck(main, c.id) >= maxCopiesAllowed(c.id) || count >= MAIN_DECK_MAX}
              onClick={() => add(c.id)}
            />
          ))}
        </div>
      </div>

      <h3>Évosphère</h3>
      <p className={'hint deck-count ' + (evoCount > EVOSPHERE_MAX ? 'danger' : 'ok')}>
        {evoCount}/{EVOSPHERE_MAX} cartes d'évolution · choisis celles que tu veux pouvoir jouer
      </p>
      <div className="builder">
        <div>
          {evo.length === 0 && <p className="hint">Évosphère vide — ajoute des évolutions ci-contre.</p>}
          {evo.map((id, i) => {
            const c = evoPool.find((card) => card.id === id) ?? cardsByFaction(savedDeck.faction).find((card) => card.id === id);
            return (
              <button className="deck-row" key={i} onClick={() => removeEvoAt(i)}>
                {c?.name ?? id} <span>×</span>
              </button>
            );
          })}
        </div>
        <div className="grid">
          {evoPool.length === 0 && <p className="hint">Ajoute d'abord des cartes niveau 1 évolutives à ta composition ci-dessus.</p>}
          {evoPool.map((c) => (
            <CardView
              key={c.id}
              card={c}
              badge={`${copiesInDeck(evo, c.id)}/${maxCopiesAllowed(c.id)}`}
              disabled={copiesInDeck(evo, c.id) >= maxCopiesAllowed(c.id) || evoCount >= EVOSPHERE_MAX}
              onClick={() => addEvo(c.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Decks() {
  const s = useGame();
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    if (editingId && !s.decks.some((d) => d.id === editingId)) setEditingId(null);
  }, [editingId, s.decks]);
  return editingId ? <DeckEditor deckId={editingId} onBack={() => setEditingId(null)} /> : <DeckMenu onEdit={setEditingId} />;
}

type BattleFx = { type: 'summon'; side: 'player' | 'enemy'; instanceId?: string } | { type: 'attack'; side: 'player' | 'enemy'; instanceId: string; dx?: number; dy?: number } | { type: 'evolution'; side: 'player' | 'enemy'; cardName: string } | null;
type EvoSeq = { instanceId: string; stage: 'rise' | 'flash' | 'reveal' | 'settle'; rect: { left: number; top: number; width: number; height: number }; beforeCard: CardDef; evolvedCard: CardDef };

/** Nombre d'activations manuelles par tour d'un effet ("à l'invocation" se déclenche seul, hors de ce compte). */
function effectMaxUses(def: CardDef): number {
  if (!def.effect || def.text.toLowerCase().includes('à l’invocation')) return 0;
  return def.text.toLowerCase().includes('2 fois par tour') ? 2 : 1;
}

/** Le moteur clone systématiquement l'état (JSON.parse/stringify), donc même un
    coup refusé renvoie un nouvel objet : `next === before` ne détecte jamais
    un échec. On compare le contenu pour de vrai. */
function stateChanged(before: GameState, after: GameState): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function FieldCard({ unit, isEnemy, taunted, selectable, selected, fx, onSelect, damagePulse, registerRef, hidden }: { unit: FieldUnit; isEnemy: boolean; taunted: boolean; selectable: boolean; selected: boolean; fx: BattleFx; onSelect?: (id: string) => void; damagePulse?: { key: string; amount: number }; registerRef?: (id: string, el: HTMLElement | null) => void; hidden?: boolean }) {
  const card = ALL_CARDS.find((entry) => entry.id === unit.cardId); if (!card) return null;
  const isSummoning = fx?.type === 'summon' && fx.side === (isEnemy ? 'enemy' : 'player') && (!fx.instanceId || fx.instanceId === unit.instanceId);
  const isAttacking = fx?.type === 'attack' && fx.instanceId === unit.instanceId; const isHit = !!damagePulse;
  const strikeX = isAttacking ? fx.dx ?? 0 : 0; const strikeY = isAttacking ? fx.dy ?? (isEnemy ? 32 : -32) : 0;
  return <motion.button ref={(el) => registerRef?.(unit.instanceId, el)} layout initial={{ scale: 0.15, opacity: 0, rotateY: 100 }} animate={isAttacking ? { scale: [1, 1.1, 1], x: [0, strikeX, 0], y: [0, strikeY, 0], opacity: 1, rotateY: 0, zIndex: 40 } : isSummoning ? { scale: [0.35, 1.18, 1], opacity: [0, 1, 1], rotateY: [90, -8, 0] } : isHit ? { scale: 1, opacity: 1, rotateY: 0, y: 0, x: [0, -7, 7, -5, 5, -2, 2, 0] } : { scale: 1, opacity: 1, rotateY: 0, y: 0, x: 0, zIndex: 1 }} transition={{ duration: isAttacking ? 0.62 : isHit ? 0.4 : 0.62, ease: 'easeOut' }} className={'field-card ' + card.rarity + (isEnemy && taunted && !unit.taunt ? ' not-targetable' : '') + (unit.taunt ? ' taunt' : '') + (unit.stunnedTurns > 0 ? ' stunned' : '') + (isHit ? ' hit-flash' : '') + (selected ? ' selected' : '') + (hidden ? ' evolving-hidden' : '')} disabled={!selectable} onClick={() => onSelect?.(unit.instanceId)} data-card-id={card.id} data-instance-id={unit.instanceId} data-evolvable={Boolean(!isEnemy && card.waitTurns && card.evolvesTo && unit.turnsOnField >= card.waitTurns)} data-evolution-name={card.evolvesTo ? ALL_CARDS.find((entry) => entry.id === card.evolvesTo)?.name ?? '' : ''} data-card-text={card.text} data-card-cost={card.cost} data-card-rarity={card.rarity} data-card-faction={card.faction} data-wait-turns={card.waitTurns ?? ''} data-turns-on-field={unit.turnsOnField} data-effect-uses={unit.effectUsesThisTurn ?? 0} data-effect-max={effectMaxUses(card)} data-has-effect={Boolean(card.effect)}><img src={card.image} alt={card.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /><span className="field-card-name">{card.name}</span><span className="field-card-level">NIV {card.level}</span><span className="field-card-atk">⚔ {unit.attack}</span><span className="field-card-hp">♥ {unit.health}</span><span className="field-card-tags">{unit.taunt && <em>PROVOCATION</em>}{unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}</span>{damagePulse && <motion.span key={damagePulse.key} className="dmg-float" initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: [1, 1, 0], y: -46, scale: [0.8, 1.25, 1] }} transition={{ duration: 0.85, ease: 'easeOut' }}>-{damagePulse.amount}</motion.span>}</motion.button>;
}

function Zone({ title, units, isEnemy, taunted, selectable, selectedId, fx, onSelect, support, onActivateSupport, damagePulses, registerCardRef, evolvingId }: { title: string; units: FieldUnit[]; isEnemy: boolean; taunted: boolean; selectable: boolean; selectedId?: string | null; fx: BattleFx; onSelect?: (id: string) => void; support: SupportCard[]; onActivateSupport?: (instanceId: string) => void; damagePulses: Record<string, { key: string; amount: number }>; registerCardRef?: (id: string, el: HTMLElement | null) => void; evolvingId?: string | null }) {
  return <div className={'zone-wrap ' + (isEnemy ? 'enemy-zone' : 'player-zone')}><b>{title}</b><div className="board">{Array.from({ length: 3 }, (_, index) => { const unit = units[index]; return unit ? <FieldCard key={unit.instanceId} unit={unit} isEnemy={isEnemy} taunted={taunted} selectable={selectable} selected={selectedId === unit.instanceId} fx={fx} onSelect={onSelect} damagePulse={damagePulses[unit.instanceId]} registerRef={registerCardRef} hidden={evolvingId === unit.instanceId} /> : <div className="field-slot" key={`slot-${index}`}>◇</div>; })}</div><div className="support-row" aria-label="Zone de soutien">{Array.from({ length: 5 }, (_, index) => { const item = support[index]; if (!item) return <div key={`sup-empty-${index}`}>◇</div>; const def = getCard(item.cardId); return <button key={item.instanceId} className="support-card" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} disabled={isEnemy || !onActivateSupport} title={isEnemy ? 'Sort adverse posé face cachée' : `${def.name} — clique pour voir l'aperçu`} onClick={() => onActivateSupport?.(item.instanceId)} />; })}</div><small>SOUTIEN {support.length}/5</small></div>;
}

function Combat() {
  const s = useGame(); const location = useLocation(); const go = useNavigate();
  const arenaBgPaused = s.animationMode === 'off' || s.batterySaver;
  const chapterId = (location.state as { chapterId?: number } | null)?.chapterId;
  const chapter = chapterId !== undefined ? chapterById(chapterId) : undefined;
  const opponentFaction = chapter ? chapter.opponentFaction : s.faction === 'Meute' ? 'Chevalier' : 'Meute';
  const opponentAvatarImage = getCard(opponentFaction === 'Chevalier' ? 'capitaine-du-royaume' : 'croc-de-fer').image;
  const playerAvatarCard = ALL_CARDS.find((c) => c.id === s.avatarCardId) ?? ALL_CARDS.find((c) => c.type === 'unit' && c.level === 1 && c.faction === s.faction);
  const activeDeckName = s.decks.find((d) => d.id === s.activeDeckId)?.name ?? s.faction;
  const aiDifficulty = chapter ? chapter.aiDifficulty : 'novice'; const lifeBonus = chapter ? chapter.enemyLifeBonus : 0; const reward = chapter ? chapter.reward : 35;
  const startMatch = () => newGame(s.faction, opponentFaction, aiDifficulty, s.deck, lifeBonus, s.evo);
  const [match, setMatch] = useState<GameState>(startMatch); const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null); const [reported, setReported] = useState(false); const [effectHint, setEffectHint] = useState(''); const [inspectedUnit, setInspectedUnit] = useState<string | null>(null); const [unitPulses, setUnitPulses] = useState<Record<string, { key: string; amount: number }>>({}); const [heroPulses, setHeroPulses] = useState<{ player?: { key: string; amount: number }; enemy?: { key: string; amount: number } }>({}); const [handOpen, setHandOpen] = useState(false); const [phase, setPhase] = useState<'draw' | 'main' | 'battle' | 'end'>('draw'); const [previewCardId, setPreviewCardId] = useState<string | null>(null); const [drawStage, setDrawStage] = useState<'idle' | 'prompt' | 'reveal'>('idle'); const [pauseOpen, setPauseOpen] = useState(false); const [aiTurnStage, setAiTurnStage] = useState<'idle' | 'draw' | 'main' | 'battle' | 'end'>('idle'); const [aiDrawCount, setAiDrawCount] = useState(0); const [effectPrompt, setEffectPrompt] = useState<string | null>(null); const [supportReveal, setSupportReveal] = useState<{ cardId: string; name: string } | null>(null); const [evoSeq, setEvoSeq] = useState<EvoSeq | null>(null);
  const PHASE_ORDER: ('draw' | 'main' | 'battle' | 'end')[] = ['draw', 'main', 'battle', 'end'];
  const pulseFromDiff = (before: GameState, after: GameState) => { const units: Record<string, { key: string; amount: number }> = {}; const heroes: { player?: { key: string; amount: number }; enemy?: { key: string; amount: number } } = {}; for (const side of ['player', 'enemy'] as const) { const beforeMap = new Map(before[side].field.map((u) => [u.instanceId, u])); const afterIds = new Set(after[side].field.map((u) => u.instanceId)); for (const u of after[side].field) { if (side === 'enemy' && !beforeMap.has(u.instanceId)) { const id = u.instanceId; requestAnimationFrame(() => requestAnimationFrame(() => { const el = cardRefs.current[id]; if (el) { const r = el.getBoundingClientRect(); vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'summon'); } })); } const prevUnit = beforeMap.get(u.instanceId); const prevHp = prevUnit?.health; if (prevHp != null && u.health < prevHp) { units[u.instanceId] = { key: `${u.instanceId}-${Date.now()}-${Math.random()}`, amount: prevHp - u.health }; const el = cardRefs.current[u.instanceId]; if (el) { const r = el.getBoundingClientRect(); vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'attack'); } } } for (const [id, deadUnit] of beforeMap) { if (afterIds.has(id)) continue; const el = cardRefs.current[id]; if (el) { const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2; const def = getCard(deadUnit.cardId); vfxRef.current?.spawnBurst(cx, cy, 'crack'); vfxRef.current?.spawnShatter(cx, cy, r.width, r.height, def.image); } delete cardRefs.current[id]; } if (after[side].life < before[side].life) { heroes[side] = { key: `${side}-${Date.now()}`, amount: before[side].life - after[side].life }; const heroEl = heroRefs.current[side]; if (heroEl) { const r = heroEl.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2; vfxRef.current?.spawnBurst(cx, cy, 'attack'); arenaBgRef.current?.triggerCrack(cx, cy); if (s.screenShake) triggerShake(); } } } if (Object.keys(units).length || Object.keys(heroes).length) { setUnitPulses(units); setHeroPulses(heroes); window.setTimeout(() => { setUnitPulses({}); setHeroPulses({}); }, 950); } };
  const [fx, setFx] = useState<BattleFx>(null); const [pileOpen, setPileOpen] = useState<null | 'grave' | 'evo'>(null); const fxTimer = useRef<number | null>(null); const turnTokenRef = useRef(0); const cardRefs = useRef<Record<string, HTMLElement | null>>({}); const heroRefs = useRef<{ player: HTMLElement | null; enemy: HTMLElement | null }>({ player: null, enemy: null }); const attackLockRef = useRef(false); const vfxRef = useRef<VfxHandle>(null); const arenaBgRef = useRef<ArenaBackgroundHandle>(null); const [shake, setShake] = useState(false); const shakeTimer = useRef<number | null>(null); const triggerShake = () => { setShake(true); if (shakeTimer.current) window.clearTimeout(shakeTimer.current); shakeTimer.current = window.setTimeout(() => setShake(false), 420); }; const replaySnapshots = useRef<GameState[]>([]); const stripForReplay = (state: GameState): GameState => ({ ...state, log: [] }); const updateMatch = (next: GameState) => { setMatch(next); replaySnapshots.current.push(stripForReplay(next)); }; useEffect(() => { replaySnapshots.current = [stripForReplay(match)]; }, []); const [replaySaved, setReplaySaved] = useState(false); const registerCardRef = (id: string, el: HTMLElement | null) => { cardRefs.current[id] = el; }; const measureStrike = (attackerSide: 'player' | 'enemy', attackerId: string, targetId: string | null) => { const attackerEl = cardRefs.current[attackerId]; const targetEl = targetId ? cardRefs.current[targetId] : heroRefs.current[attackerSide === 'player' ? 'enemy' : 'player']; if (!attackerEl || !targetEl) return null; const a = attackerEl.getBoundingClientRect(); const t = targetEl.getBoundingClientRect(); const x1 = a.left + a.width / 2; const y1 = a.top + a.height / 2; const x2 = t.left + t.width / 2; const y2 = t.top + t.height / 2; return { dx: x2 - x1, dy: y2 - y1, x1, y1, x2, y2 }; };
  const triggerFx = (nextFx: BattleFx, duration = 700) => { if (fxTimer.current) window.clearTimeout(fxTimer.current); setFx(nextFx); fxTimer.current = window.setTimeout(() => setFx(null), duration); };
  useEffect(() => () => { if (fxTimer.current) window.clearTimeout(fxTimer.current); }, []);
  useEffect(() => { document.body.classList.add('in-battle'); return () => document.body.classList.remove('in-battle'); }, []);
  useEffect(() => { if (!match.winner || reported) return; const won = match.winner === 'player'; s.record(won); if (won) { s.addGold(reward); if (chapter) s.completeChapter(chapter.id); } setReported(true); }, [match.winner, reported, reward, chapter, s]);
  const showHint = (message: string, duration = 2000) => { setEffectHint(message); window.setTimeout(() => setEffectHint(''), duration); };
  const openHandCard = (id: string) => { if (match.activePlayer !== 'player' || match.winner) return; if (!handOpen) { setHandOpen(true); return; } setInspectedUnit(null); setPreviewCardId(id); };
  const confirmPlay = (id: string) => { if (match.activePlayer !== 'player' || match.winner) return; if (phase !== 'main') { showHint('Passe en Main Phase pour jouer une carte.'); setPreviewCardId(null); return; } const card = ALL_CARDS.find((entry) => entry.id === id); const before = match; const next = playCard(match, 'player', id); setPreviewCardId(null); if (!stateChanged(match, next)) return; updateMatch(next); setHandOpen(false); pulseFromDiff(before, next); const newest = next.player.field[next.player.field.length - 1]; const summonedUnit = next.player.field.length > before.player.field.length; if (summonedUnit) { triggerFx({ type: 'summon', side: 'player', instanceId: newest?.instanceId }, 720); if (newest) { const newestId = newest.instanceId; requestAnimationFrame(() => requestAnimationFrame(() => { const el = cardRefs.current[newestId]; if (el) { const r = el.getBoundingClientRect(); vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'summon'); } })); } } if (card?.type === 'unit' && newest && effectMaxUses(card) > 0) setEffectPrompt(newest.instanceId); };
  const selectAttacker = (id: string) => { setHandOpen(false); setPreviewCardId(null); setInspectedUnit((current) => current === id ? null : id); if (match.activePlayer !== 'player' || match.winner || attackLockRef.current) return; if (phase !== 'battle') { showHint('Passe en Battle Phase pour attaquer.'); return; } const unit = match.player.field.find((entry) => entry.instanceId === id); if (!unit || !unit.canAttack || unit.stunnedTurns > 0) return; setSelectedAttacker((current) => current === id ? null : id); };
  const resolveStrike = (attackerId: string, targetId: string | null) => { const measured = measureStrike('player', attackerId, targetId); const { dx, dy } = measured ?? { dx: 0, dy: 0 }; attackLockRef.current = true; triggerFx({ type: 'attack', side: 'player', instanceId: attackerId, dx, dy }, 640); if (measured) { const attackerUnit = match.player.field.find((entry) => entry.instanceId === attackerId); const def = attackerUnit && getCard(attackerUnit.cardId); const tone = def?.faction === 'Meute' ? 'frost' : 'fire'; vfxRef.current?.spawnDashTrail(measured.x1, measured.y1, measured.x2, measured.y2, 0.3, tone); } window.setTimeout(() => { const before = match; const next = declareAttack(before, 'player', attackerId, targetId); updateMatch(next); pulseFromDiff(before, next); attackLockRef.current = false; }, 300); };
  const attackUnit = (targetId: string) => { setHandOpen(false); setPreviewCardId(null); if (!selectedAttacker || phase !== 'battle' || attackLockRef.current) return; resolveStrike(selectedAttacker, targetId); setSelectedAttacker(null); };
  const attackHero = () => { setHandOpen(false); setPreviewCardId(null); if (!selectedAttacker || phase !== 'battle' || attackLockRef.current) return; resolveStrike(selectedAttacker, null); setSelectedAttacker(null); };
  const evolve = (instanceId: string) => {
    setHandOpen(false); setPreviewCardId(null); setInspectedUnit(null);
    if (phase !== 'main') { showHint('Passe en Main Phase pour évoluer une créature.'); return; }
    const beforeUnit = match.player.field.find((entry) => entry.instanceId === instanceId);
    if (!beforeUnit) return;
    const beforeCard = ALL_CARDS.find((entry) => entry.id === beforeUnit.cardId);
    const evolvedCard = beforeCard?.evolvesTo ? ALL_CARDS.find((entry) => entry.id === beforeCard.evolvesTo) : undefined;
    const next = evolveUnit(match, 'player', instanceId);
    if (!stateChanged(match, next) || !beforeCard || !evolvedCard) return;
    const el = cardRefs.current[instanceId];
    const rect = el?.getBoundingClientRect();
    if (!rect) { updateMatch(next); triggerFx({ type: 'evolution', side: 'player', cardName: evolvedCard.name }, 1000); return; }
    setEvoSeq({ instanceId, stage: 'rise', rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, beforeCard, evolvedCard });
    window.setTimeout(() => setEvoSeq((seq) => seq ? { ...seq, stage: 'flash' } : seq), 650);
    window.setTimeout(() => {
      updateMatch(next);
      vfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'evolution');
      if (s.screenShake) triggerShake();
      setEvoSeq((seq) => seq ? { ...seq, stage: 'reveal' } : seq);
    }, 900);
    window.setTimeout(() => setEvoSeq((seq) => seq ? { ...seq, stage: 'settle' } : seq), 1550);
    window.setTimeout(() => {
      const r = cardRefs.current[instanceId]?.getBoundingClientRect();
      if (r) vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'evolution');
      if (s.screenShake) triggerShake();
    }, 2000);
    window.setTimeout(() => setEvoSeq(null), 2150);
  };
  const activateEffect = (instanceId: string) => { setHandOpen(false); setPreviewCardId(null); if (phase !== 'main') { showHint('Passe en Main Phase pour activer un effet.'); return; } const before = match; const unit = before.player.field.find((entry) => entry.instanceId === instanceId); if (!unit) return; const card = ALL_CARDS.find((entry) => entry.id === unit.cardId); const next = activateUnitEffect(before, 'player', instanceId); if (!stateChanged(before, next)) { showHint('Cet effet ne peut pas être activé maintenant.'); return; } updateMatch(next); pulseFromDiff(before, next); showHint(card ? `Effet de ${card.name} activé !` : 'Effet activé !'); };
  const [supportPreview, setSupportPreview] = useState<string | null>(null);
  const openSupportPreview = (instanceId: string) => { setHandOpen(false); setPreviewCardId(null); setSupportPreview(instanceId); };
  const activateSupport = (instanceId: string) => { setHandOpen(false); setPreviewCardId(null); if (phase !== 'main') { showHint('Passe en Main Phase pour activer un soutien.'); return; } const before = match; const item = before.player.support.find((entry) => entry.instanceId === instanceId); if (!item) return; const card = getCard(item.cardId); const next = activateSupportCard(before, 'player', instanceId); if (!stateChanged(before, next)) { showHint(`${card.name} ne peut pas être activé maintenant.`); return; } setSupportReveal({ cardId: card.id, name: card.name }); window.setTimeout(() => { updateMatch(next); pulseFromDiff(before, next); const newest = next.player.field[next.player.field.length - 1]; if (next.player.field.length > before.player.field.length) { triggerFx({ type: 'summon', side: 'player', instanceId: newest?.instanceId }, 720); if (newest) { const newestId = newest.instanceId; requestAnimationFrame(() => requestAnimationFrame(() => { const el = cardRefs.current[newestId]; if (el) { const r = el.getBoundingClientRect(); vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'summon'); } })); } } setSupportReveal(null); showHint(`${card.name} activé !`); }, 950); };
  const runAiAttackStep = (token: number, state: GameState, plan: ReturnType<typeof aiPrepareBattlePlan>, index: number, onDone: (finalState: GameState) => void) => {
    if (turnTokenRef.current !== token) return;
    if (index >= plan.attackerIds.length || state.winner) { onDone(state); return; }
    const attackerId = plan.attackerIds[index];
    const step = aiResolveOneAttack(state, attackerId, plan.lethal, plan.keepBackId);
    if (step.skipped) { runAiAttackStep(token, state, plan, index + 1, onDone); return; }
    const measured = measureStrike('enemy', attackerId, step.targetId);
    if (measured) {
      triggerFx({ type: 'attack', side: 'enemy', instanceId: attackerId, dx: measured.dx, dy: measured.dy }, 640);
      const attackerUnit = state.enemy.field.find((entry) => entry.instanceId === attackerId);
      const attackerDef = attackerUnit && getCard(attackerUnit.cardId);
      const tone = attackerDef?.faction === 'Meute' ? 'frost' : 'fire';
      vfxRef.current?.spawnDashTrail(measured.x1, measured.y1, measured.x2, measured.y2, 0.3, tone);
    }
    window.setTimeout(() => {
      if (turnTokenRef.current !== token) return;
      const before = state;
      updateMatch(step.state);
      pulseFromDiff(before, step.state);
      window.setTimeout(() => runAiAttackStep(token, step.state, plan, index + 1, onDone), 260);
    }, 320);
  };
  const nextTurn = () => {
    setHandOpen(false); setPreviewCardId(null);
    if (match.activePlayer !== 'player' || match.winner) return;
    setSelectedAttacker(null); setPhase('draw'); triggerFx(null);
    const token = ++turnTokenRef.current;
    const beforeDraw = match;
    const afterDraw = aiDrawPhase(match);
    setAiDrawCount(Math.max(0, afterDraw.enemy.hand.length - beforeDraw.enemy.hand.length));
    setAiTurnStage('draw');
    updateMatch(afterDraw);
    window.setTimeout(() => {
      if (turnTokenRef.current !== token) return;
      setAiTurnStage('main');
      const afterMain = aiMainPhase(afterDraw);
      updateMatch(afterMain);
      pulseFromDiff(afterDraw, afterMain);
      window.setTimeout(() => {
        if (turnTokenRef.current !== token) return;
        setAiTurnStage('battle');
        const plan = aiPrepareBattlePlan(afterMain);
        runAiAttackStep(token, afterMain, plan, 0, (afterBattle) => {
          if (turnTokenRef.current !== token) return;
          setAiTurnStage('end');
          window.setTimeout(() => {
            if (turnTokenRef.current !== token) return;
            const afterEnd = aiEndPhase(afterBattle);
            updateMatch(afterEnd);
            pulseFromDiff(afterBattle, afterEnd);
            setAiTurnStage('idle');
            if (!afterEnd.winner) setDrawStage('prompt');
          }, 420);
        });
      }, 620);
    }, 620);
  };
  const confirmDraw = () => { setDrawStage('reveal'); vfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'draw'); window.setTimeout(() => { setDrawStage('idle'); setPhase('main'); }, 900); };
  const goToPhase = (target: 'draw' | 'main' | 'battle' | 'end') => { if (match.activePlayer !== 'player' || match.winner) return; if (PHASE_ORDER.indexOf(target) < PHASE_ORDER.indexOf(phase)) return; if (target === 'end') { nextTurn(); return; } setPhase(target); };
  const restart = () => { turnTokenRef.current++; attackLockRef.current = false; const fresh = startMatch(); setMatch(fresh); replaySnapshots.current = [stripForReplay(fresh)]; setReplaySaved(false); setReported(false); setSelectedAttacker(null); setEffectHint(''); setInspectedUnit(null); setUnitPulses({}); setHeroPulses({}); setHandOpen(false); setPreviewCardId(null); setPhase('draw'); setDrawStage('idle'); setPauseOpen(false); setAiTurnStage('idle'); setAiDrawCount(0); setEffectPrompt(null); setSupportReveal(null); setSupportPreview(null); setEvoSeq(null); };
  const forfeitMatch = () => { if (!window.confirm('Abandonner cette partie ? Elle comptera comme une défaite.')) return; if (!match.winner) s.record(false); go('/'); };
  const saveReplay = () => { if (!match.winner || replaySaved) return; s.saveReplay({ opponentFaction, result: match.winner === 'player' ? 'win' : 'loss', turns: match.turn, label: chapter ? chapter.title : `Duel rapide vs ${opponentFaction}`, snapshots: replaySnapshots.current }); setReplaySaved(true); };
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; setInspectedUnit(null); setSelectedAttacker(null); setPreviewCardId(null); setEffectPrompt(null); }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, []);
  const enemyHasTaunt = match.enemy.field.some((unit) => unit.taunt); const activePlayerUnit = inspectedUnit ? match.player.field.find((unit) => unit.instanceId === inspectedUnit) : undefined;
  const pileCards: CardDef[] = pileOpen === 'grave' ? match.player.graveyard.map((id: string) => getCard(id)) : pileOpen === 'evo' ? match.player.evosphere.map((id: string) => getCard(id)) : [];
  const displayPhase = aiTurnStage !== 'idle' ? aiTurnStage : phase;
  const drawnCardId = drawStage !== 'idle' ? match.player.hand[match.player.hand.length - 1] : undefined;
  const visibleHand = drawStage !== 'idle' ? match.player.hand.slice(0, -1) : match.player.hand;
  return <section className={'battle' + (shake ? ' battle-shake' : '')} onClick={(event) => { if (handOpen && !(event.target as HTMLElement).closest('.hand')) setHandOpen(false); }}><ArenaBackground ref={arenaBgRef} className="battle-bg-video" paused={arenaBgPaused} /><VfxLayer ref={vfxRef} active={!arenaBgPaused} /><button className="battle-pause-btn" type="button" aria-label="Menu de la partie" onClick={() => setPauseOpen(true)}>☰</button>{aiTurnStage !== 'idle' && <div className="ai-turn-lock" aria-hidden="true" />}<div className="profile-float enemy" ref={(el) => { heroRefs.current.enemy = el; }}><div className="duel-profile"><span className="duel-profile-avatar"><img src={opponentAvatarImage} alt={opponentFaction} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /></span><div className="duel-profile-text"><b>{chapter ? chapter.title : 'Rival Nexus'}</b><small>{opponentFaction}</small></div></div><span className="life">♥ {match.enemy.life}</span><span className="mana">◆ {match.enemy.mana}/{match.enemy.maxMana}</span>{heroPulses.enemy && <motion.span key={heroPulses.enemy.key} className="hero-dmg" initial={{ opacity: 0, y: 0, scale: .6 }} animate={{ opacity: [0, 1, 1, 0], y: -38, scale: [.6, 1.3, 1, 1] }} transition={{ duration: .95, ease: 'easeOut' }}>-{heroPulses.enemy.amount}</motion.span>}</div><div className={'enemy-hand-row' + (aiTurnStage === 'draw' ? ' drawing' : '')} aria-label={`Main de l'adversaire : ${match.enemy.hand.length} cartes`}><div className="enemy-hand-inner">{Array.from({ length: match.enemy.hand.length }, (_, i) => { const isDrawn = aiTurnStage === 'draw' && i >= match.enemy.hand.length - aiDrawCount; return <motion.span key={i} className={'enemy-hand-card' + (isDrawn ? ' drawn-in' : '')} style={{ backgroundImage: `url(${CARD_BACK_URL})` }} initial={isDrawn ? { opacity: 0, y: -70, scale: .4, rotate: -14 } : false} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} transition={{ duration: .5, ease: 'easeOut' }} />; })}</div></div><div className="battle-main"><div className="pile-rail left"><button className="card-pile grave" onClick={() => { setHandOpen(false); setPreviewCardId(null); setPileOpen('grave'); }}><span className="pile-stack" /><span className="pile-icon">☠</span><b>FOSSE</b><em>{match.player.graveyard.length}</em></button></div><div className="battle-center"><Zone title="ADVERSAIRE" units={match.enemy.field} isEnemy taunted={enemyHasTaunt} selectable={!!selectedAttacker} selectedId={null} fx={fx} onSelect={attackUnit} support={match.enemy.support} damagePulses={unitPulses} registerCardRef={registerCardRef} /><div className={'turn-strip' + (aiTurnStage !== 'idle' ? ' ai-turn' : '')}><b>{aiTurnStage === 'draw' ? "L'ADVERSAIRE PIOCHE…" : aiTurnStage !== 'idle' || match.activePlayer !== 'player' ? "TOUR DE L'ADVERSAIRE" : 'À TOI DE JOUER'}</b><span>Tour {match.turn}</span><div className="nexus-phases">{PHASE_ORDER.map((p) => <button key={p} type="button" className={(displayPhase === p ? 'active' : '') + (PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(displayPhase) ? ' passed' : '')} disabled={aiTurnStage !== 'idle' || PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(phase) || match.activePlayer !== 'player' || !!match.winner} onClick={() => goToPhase(p)}>{p === 'draw' ? 'DRAW' : p === 'main' ? 'MAIN' : p === 'battle' ? 'BATTLE' : 'END'}</button>)}</div>{selectedAttacker && <button className="attack-face" disabled={enemyHasTaunt} onClick={attackHero}>Attaquer directement</button>}</div><Zone title="TON TERRAIN" units={match.player.field} isEnemy={false} taunted={false} selectable={match.activePlayer === 'player'} selectedId={selectedAttacker} fx={fx} onSelect={selectAttacker} support={match.player.support} onActivateSupport={openSupportPreview} damagePulses={unitPulses} registerCardRef={registerCardRef} evolvingId={evoSeq?.instanceId} /></div><div className="pile-rail right"><button className="card-pile evo" onClick={() => { setHandOpen(false); setPreviewCardId(null); setPileOpen('evo'); }}><span className="pile-stack" /><span className="pile-icon">✦</span><b>ÉVOSPHÈRE</b><em>{match.player.evosphere.length}</em></button><button className="card-pile deck" type="button" title="Le contenu du deck reste caché tant qu'aucun effet ne te permet d'y chercher une carte"><span className="pile-stack" /><span className="pile-icon">▣</span><b>DECK</b><em>{match.player.deck.length}</em></button></div></div><div className="profile-float player"><div className="duel-profile"><span className="duel-profile-avatar">{playerAvatarCard ? <img src={playerAvatarCard.image} alt={playerAvatarCard.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /> : <b>✦</b>}</span><div className="duel-profile-text"><b>{s.playerName}</b><small>{activeDeckName}</small></div></div><span className="life">♥ {match.player.life}</span><span className="mana">◆ {match.player.mana}/{match.player.maxMana}</span>{heroPulses.player && <motion.span key={heroPulses.player.key} className="hero-dmg" initial={{ opacity: 0, y: 0, scale: .6 }} animate={{ opacity: [0, 1, 1, 0], y: -38, scale: [.6, 1.3, 1, 1] }} transition={{ duration: .95, ease: 'easeOut' }}>-{heroPulses.player.amount}</motion.span>}</div><div className={'hand' + (handOpen ? ' open' : '')} onClick={(event) => event.stopPropagation()}>{visibleHand.map((id: string, index: number) => { const card = getCard(id); return <div key={`${id}-${index}`} className={'hand-card-wrap ' + (card.type === 'spell' || card.cost <= match.player.mana ? 'affordable' : 'unaffordable')}><CardView card={card} fullArt disabled={match.activePlayer !== 'player' || !!match.winner} onClick={() => openHandCard(id)} /></div>; })}</div><div className="battle-footer"><span className="hud-pill turn-readout">Tour {match.turn}</span></div>{fx?.type === 'evolution' && <div className="evolution-flash"><span>ÉVOLUTION</span><b>{fx.cardName}</b></div>}{evoSeq && (() => { const { stage, rect, beforeCard, evolvedCard } = evoSeq; const aspect = rect.width / rect.height; const bigH = Math.min(window.innerHeight * 0.56, 460); const bigW = bigH * aspect; const centerX = window.innerWidth / 2; const centerY = window.innerHeight / 2; const target = stage === 'settle' ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { left: centerX - bigW / 2, top: centerY - bigH / 2, width: bigW, height: bigH }; const showEvolved = stage === 'reveal' || stage === 'settle'; const cardOpacity = stage === 'flash' ? 0 : 1; const haloOpacity = stage === 'rise' ? 0.85 : stage === 'flash' ? 1 : stage === 'reveal' ? 0.5 : 0; const haloScale = stage === 'rise' ? 1.5 : stage === 'flash' ? 2.3 : stage === 'reveal' ? 1.9 : 0.6; return <div className="evo-seq-overlay" aria-hidden="true"><motion.div className="evo-seq-halo" style={{ left: centerX, top: centerY }} animate={{ opacity: haloOpacity, scale: haloScale }} transition={{ duration: 0.55, ease: 'easeOut' }} /><motion.img className="evo-seq-card" src={showEvolved ? evolvedCard.image : beforeCard.image} alt={showEvolved ? evolvedCard.name : beforeCard.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} initial={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, opacity: 1 }} animate={{ left: target.left, top: target.top, width: target.width, height: target.height, opacity: cardOpacity }} transition={{ left: { duration: stage === 'settle' ? 0.5 : 0.6, ease: 'easeInOut' }, top: { duration: stage === 'settle' ? 0.5 : 0.6, ease: 'easeInOut' }, width: { duration: stage === 'settle' ? 0.5 : 0.6, ease: 'easeInOut' }, height: { duration: stage === 'settle' ? 0.5 : 0.6, ease: 'easeInOut' }, opacity: { duration: stage === 'reveal' ? 0.15 : 0.25 } }} />{stage === 'flash' && <motion.div className="evo-seq-whiteout" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5 }} />}{stage === 'reveal' && <motion.b className="evo-seq-label" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>{evolvedCard.name}</motion.b>}</div>; })()}{pileOpen && <div className="pile-modal" role="dialog" aria-modal="true" onClick={() => setPileOpen(null)}><div className="pile-modal-content" onClick={(e) => e.stopPropagation()}><header><h3>{pileOpen === 'grave' ? 'Fosse' : 'Évosphère'}</h3><button onClick={() => setPileOpen(null)}>×</button></header><div className="pile-grid">{pileCards.length ? pileCards.map((card: CardDef, i: number) => <CardView key={`${card.id}-${i}`} card={card} />) : <p className="hint">Aucune carte.</p>}</div></div></div>}{previewCardId && (() => { const def = getCard(previewCardId); const isSpell = def.type === 'spell'; const affordable = isSpell || def.cost <= match.player.mana; return <div className="hand-preview-overlay" role="dialog" aria-modal="true" onClick={() => setPreviewCardId(null)}><div className="hand-preview" onClick={(e) => e.stopPropagation()}><img className="hand-preview-art" src={def.image} alt={def.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /><div className="hand-preview-body"><b>{def.name}</b><div className="hand-preview-stats"><span>◆ {def.cost}{isSpell ? ' à l’activation' : ''}</span>{def.type === 'unit' && <span>⚔ {def.attack}</span>}{def.type === 'unit' && <span>♥ {def.health}</span>}</div><p>{def.text || "Cette carte n'a pas d'effet."}</p>{isSpell && <small className="hand-preview-warn spell">Se pose gratuitement face cachée — le coût en runes n'est payé qu'à l'activation.</small>}<div className="hand-preview-actions"><button className="secondary" onClick={() => setPreviewCardId(null)}>Annuler</button><button className="primary" disabled={!affordable || phase !== 'main'} onClick={() => confirmPlay(previewCardId)}>{def.type === 'unit' ? 'INVOQUER' : 'POSER FACE CACHÉE'}</button></div>{!affordable && <small className="hand-preview-warn">Mana insuffisant.</small>}{affordable && phase !== 'main' && <small className="hand-preview-warn">Passe en Main Phase pour jouer une carte.</small>}</div></div></div>;})()}{effectPrompt && (() => { const unit = match.player.field.find((entry) => entry.instanceId === effectPrompt); if (!unit) return null; const def = getCard(unit.cardId); return <div className="effect-prompt-overlay" role="dialog" aria-modal="true" onClick={() => setEffectPrompt(null)}><div className="effect-prompt" onClick={(e) => e.stopPropagation()}><img className="effect-prompt-art" src={def.image} alt={def.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /><b>{def.name}</b><p className="effect-prompt-question">Activer son effet tout de suite ?</p><p className="effect-prompt-text">{def.text}</p><div className="effect-prompt-actions"><button className="secondary" onClick={() => setEffectPrompt(null)}>Plus tard</button><button className="primary" onClick={() => { activateEffect(effectPrompt); setEffectPrompt(null); }}>Activer</button></div></div></div>; })()}{supportPreview && (() => { const item = match.player.support.find((entry) => entry.instanceId === supportPreview); if (!item) return null; const def = getCard(item.cardId); const affordable = def.cost <= match.player.mana; return <div className="hand-preview-overlay" role="dialog" aria-modal="true" onClick={() => setSupportPreview(null)}><div className="hand-preview" onClick={(e) => e.stopPropagation()}><img className="hand-preview-art" src={def.image} alt={def.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /><div className="hand-preview-body"><b>{def.name}</b><div className="hand-preview-stats"><span>◆ {def.cost} à l’activation</span></div><p>{def.text || "Cette carte n'a pas d'effet."}</p><div className="hand-preview-actions"><button className="secondary" onClick={() => setSupportPreview(null)}>Annuler</button><button className="primary" disabled={!affordable || phase !== 'main'} onClick={() => { setSupportPreview(null); activateSupport(item.instanceId); }}>Activer</button></div>{!affordable && <small className="hand-preview-warn">Mana insuffisant.</small>}{affordable && phase !== 'main' && <small className="hand-preview-warn">Passe en Main Phase pour activer un soutien.</small>}</div></div></div>; })()}{supportReveal && (() => { const def = getCard(supportReveal.cardId); return <div className="support-reveal-overlay" aria-hidden="true"><motion.div className="support-reveal-card" initial={{ rotateY: 180, scale: .5, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ duration: .5, ease: 'easeOut' }}><img src={def.image} alt={def.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /></motion.div><motion.b className="support-reveal-label" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25, duration: .35 }}>ACTIVATION DE {def.name.toUpperCase()}</motion.b></div>; })()}{activePlayerUnit && (() => { const def = getCard(activePlayerUnit.cardId); const canEvolve = !!def.evolvesTo && !!def.waitTurns && activePlayerUnit.turnsOnField >= def.waitTurns; const maxUses = effectMaxUses(def); return <div className="unit-actions"><img className="unit-actions-art" src={def.image} alt={def.name} /><div className="unit-actions-body"><b>{def.name}</b><span className="unit-actions-stats">⚔ {activePlayerUnit.attack}　♥ {activePlayerUnit.health}</span><p>{def.text || "Cette carte n'a pas d'effet."}</p>{maxUses > 0 && <button className="secondary" onClick={() => activateEffect(activePlayerUnit.instanceId)}>Activer l'effet ({activePlayerUnit.effectUsesThisTurn ?? 0}/{maxUses})</button>}{canEvolve && <button className="primary" onClick={() => evolve(activePlayerUnit.instanceId)}>ÉVOLUER</button>}<button onClick={() => setInspectedUnit(null)}>Fermer</button></div></div>; })()}{drawStage === 'prompt' && <div className="draw-pile-overlay" role="dialog" aria-modal="true"><button className="draw-pile" onClick={confirmDraw}><span className="draw-pile-stack" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} /><b>Nouvelle carte</b><small>TOUCHE POUR PIOCHER</small></button></div>}{drawStage === 'reveal' && drawnCardId && <div className="draw-reveal-overlay"><motion.img className="draw-reveal-card" src={getCard(drawnCardId).image} alt={getCard(drawnCardId).name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} initial={{ rotateY: 180, scale: .6, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ duration: .55, ease: 'easeOut' }} /></div>}{effectHint && <div className="effect-hint">💡 {effectHint}</div>}{match.winner && <div className="match-result"><p className={match.winner === 'player' ? 'win' : 'loss'}>{match.winner === 'player' ? `Victoire ! +${reward} ✦` : 'Défaite — retente ta chance.'}</p><div className="match-result-actions"><button className="primary" onClick={() => go(chapter ? '/campagne' : '/')}>{chapter ? 'Retour à la campagne' : 'Retour au menu'}</button><button className="secondary" onClick={restart}>{chapter ? 'Rejouer ce chapitre' : 'Nouveau duel'}</button><button className="secondary" disabled={replaySaved} onClick={saveReplay}>{replaySaved ? '✓ Replay sauvegardé' : '💾 Sauvegarder le replay'}</button></div></div>}{pauseOpen && <div className="battle-pause-overlay" role="dialog" aria-modal="true" onClick={() => setPauseOpen(false)}><div className="battle-pause-menu" onClick={(e) => e.stopPropagation()}><b>Menu de la partie</b><button className="secondary" onClick={() => setPauseOpen(false)}>Reprendre</button><button className="secondary" onClick={restart}>↺ Recommencer</button><button className="secondary danger" onClick={forfeitMatch}>Abandonner</button></div></div>}</section>;
}

function Profile() {
  const s = useGame();
  const go = useNavigate();
  const [name, setName] = useState(s.playerName);
  const avatarCards = ALL_CARDS.filter((card) => card.type === 'unit' && card.level === 1 && s.unlockedFactions.includes(card.faction));
  const avatar = ALL_CARDS.find((card) => card.id === s.avatarCardId) ?? avatarCards[0];
  const saveName = () => s.setPlayerName(name);
  return <section><h2>Profil du joueur</h2><div className="profile profile-editor"><div className="profile-avatar">{avatar ? <img src={avatar.image} alt={avatar.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /> : <b>✦</b>}</div><div className="profile-main"><label>Pseudo<input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} onBlur={saveName} /></label><button className="secondary" onClick={saveName}>Enregistrer le pseudo</button><p>Niveau {s.level} · {s.wins} victoires · {s.losses} défaites</p><div className="xp-row"><progress value={s.xp} max={XP_PER_LEVEL} /><span>{s.xp}/{XP_PER_LEVEL} XP</span></div><p>💎 {s.gems} gemmes · ✦ {s.gold} or</p></div></div><h3>Choisir une image de profil</h3><div className="avatar-grid">{avatarCards.map((card) => <button key={card.id} className={'avatar-choice' + (s.avatarCardId === card.id ? ' active' : '')} onClick={() => s.setAvatarCardId(card.id)} title={card.name}><img src={card.image} alt={card.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /><span>{card.name}</span></button>)}</div><h3>Mes replays</h3><p className="hint">Enregistrés sur cet appareil uniquement — pas de serveur partagé entre joueurs dans ce projet.</p>{s.replays.length === 0 ? <p className="hint">Aucun replay sauvegardé pour l'instant. Termine un duel et choisis « Sauvegarder le replay ».</p> : <div className="replay-list">{s.replays.map((r) => <article key={r.id} className={'replay-entry ' + r.result}><div><b>{r.label}</b><small>{new Date(r.date).toLocaleDateString()} · vs {r.opponentFaction} · {r.turns} tours · {r.result === 'win' ? 'Victoire' : 'Défaite'}</small></div><div className="replay-entry-actions"><button className="secondary" onClick={() => go(`/replay/${r.id}`)}>▶ Regarder</button><button className="secondary danger" onClick={() => { if (confirm('Supprimer ce replay ?')) s.deleteReplay(r.id); }}>Supprimer</button></div></article>)}</div>}</section>;
}

const LANGUAGE_LABELS: Record<Language, string> = { fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano', pt: 'Português', ja: '日本語', ko: '한국어', zh: '简体中文' };
const QUALITY_LABELS: Record<VisualQuality, string> = { eco: 'Économie', balanced: 'Équilibrée', high: 'Élevée' };
const SCALE_LABELS: Record<InterfaceScale, string> = { small: 'Petite', normal: 'Normale', large: 'Grande' };
function Toggle({ on, onToggle, labelOn = 'Activé', labelOff = 'Désactivé' }: { on: boolean; onToggle: () => void; labelOn?: string; labelOff?: string }) {
  return <button type="button" role="switch" aria-checked={on} className={'switch' + (on ? ' on' : '')} onClick={onToggle}><span className="switch-thumb" /><span className="switch-state">{on ? labelOn : labelOff}</span></button>;
}

const FRAMECAP_LABELS: Record<AnimationMode, string> = { full: 'Illimité', reduced: '60 IPS', off: '30 IPS (économie max.)' };
const RESET_CONFIRM_WORD = 'SUPPRIMER';
function Options() {
  const s = useGame();
  const go = useNavigate();
  const { active: fullscreenActive, toggle: toggleFullscreen } = useFullscreen();
  const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const closeResetConfirm = () => { setResetConfirmOpen(false); setResetConfirmText(''); };
  const doHardReset = () => { s.resetProgress(); closeResetConfirm(); go('/'); };
  return <section><h2>Options</h2><div className="options-grid settings-grid">
    <article className="options-card settings-card"><div className="options-card-head"><span className="menu-card-icon teal">🔊</span><b>Audio</b></div>
      <div className="option-row"><div className="option-row-text"><b>Musique</b><small>Thème du menu et musiques de duel.</small></div><Toggle on={s.musicEnabled} onToggle={() => s.setMusicEnabled(!s.musicEnabled)} labelOn="Activée" labelOff="Coupée" /></div>
      <div className="option-row"><div className="option-row-text"><b>Volume musique</b></div><div className="option-row-slider"><input type="range" min={0} max={100} value={s.musicVolume} onChange={(e) => s.setMusicVolume(Number(e.target.value))} /><span>{s.musicVolume}%</span></div></div>
      <div className="option-row"><div className="option-row-text"><b>Volume effets</b></div><div className="option-row-slider"><input type="range" min={0} max={100} value={s.sfxVolume} onChange={(e) => s.setSfxVolume(Number(e.target.value))} /><span>{s.sfxVolume}%</span></div></div>
    </article>
    <article className="options-card settings-card"><div className="options-card-head"><span className="menu-card-icon violet">🖥</span><b>Affichage & performance</b></div>
      <div className="option-row"><div className="option-row-text"><b>Qualité visuelle</b><small>Résolution des effets et du rendu des cartes.</small></div><select value={s.visualQuality} onChange={(e) => s.setVisualQuality(e.target.value as VisualQuality)}>{(Object.keys(QUALITY_LABELS) as VisualQuality[]).map((value) => <option key={value} value={value}>{QUALITY_LABELS[value]}</option>)}</select></div>
      <div className="option-row"><div className="option-row-text"><b>Limite d'images/seconde</b><small>Réduit les animations pour économiser la batterie sur mobile.</small></div><select value={s.animationMode} onChange={(e) => s.setAnimationMode(e.target.value as AnimationMode)}>{(Object.keys(FRAMECAP_LABELS) as AnimationMode[]).map((value) => <option key={value} value={value}>{FRAMECAP_LABELS[value]}</option>)}</select></div>
      <div className="option-row"><div className="option-row-text"><b>Taille de l'interface</b></div><select value={s.interfaceScale} onChange={(e) => s.setInterfaceScale(e.target.value as InterfaceScale)}>{(Object.keys(SCALE_LABELS) as InterfaceScale[]).map((value) => <option key={value} value={value}>{SCALE_LABELS[value]}</option>)}</select></div>
      <div className="option-row"><div className="option-row-text"><b>Effets lumineux</b></div><Toggle on={s.glowEffects} onToggle={() => s.setGlowEffects(!s.glowEffects)} /></div>
      <div className="option-row"><div className="option-row-text"><b>Tremblements d'écran</b></div><Toggle on={s.screenShake} onToggle={() => s.setScreenShake(!s.screenShake)} /></div>
      <div className="option-row"><div className="option-row-text"><b>Compteur FPS</b></div><Toggle on={s.showFps} onToggle={() => s.setShowFps(!s.showFps)} labelOn="Affiché" labelOff="Masqué" /></div>
      <div className="option-row"><div className="option-row-text"><b>Mode batterie</b><small>Coupe les vidéos et animations non essentielles.</small></div><Toggle on={s.batterySaver} onToggle={() => s.setBatterySaver(!s.batterySaver)} /></div>
      {isCoarsePointer && <div className="option-row"><div className="option-row-text"><b>Vibration</b></div><Toggle on={s.vibrationEnabled} onToggle={() => s.setVibrationEnabled(!s.vibrationEnabled)} /></div>}
      {!isCoarsePointer && <div className="option-row"><div className="option-row-text"><b>Plein écran</b></div><button className="secondary" onClick={toggleFullscreen}>{fullscreenActive ? '⤡ Quitter' : '⛶ Activer'}</button></div>}
    </article>
    <article className="options-card settings-card"><div className="options-card-head"><span className="menu-card-icon gold">🌐</span><b>Langue</b></div>
      <div className="option-row"><div className="option-row-text"><b>Langue de l'interface</b></div><select value={s.language} onChange={(e) => s.setLanguage(e.target.value as Language)}>{(Object.keys(LANGUAGE_LABELS) as Language[]).map((language) => <option key={language} value={language}>{LANGUAGE_LABELS[language]}</option>)}</select></div>
      <p className="hint">La traduction complète de l'interface arrive dans une prochaine passe — la langue choisie est déjà mémorisée.</p>
    </article>
    <article className="options-card settings-card"><div className="options-card-head"><span className="menu-card-icon teal">↺</span><b>Réinitialisation</b></div>
      <p className="hint">Remet Audio / Affichage / Langue à leurs valeurs par défaut. Ne touche pas à ta progression (decks, cartes, XP).</p>
      <button className="secondary" onClick={() => { if (window.confirm('Réinitialiser tous les paramètres (audio, affichage, langue) ?')) s.resetSettings(); }}>↺ Réinitialiser les paramètres</button>
    </article>
    <article className="options-card settings-card danger"><div className="options-card-head"><span className="menu-card-icon red">⚠</span><b>Zone dangereuse</b></div>
      <p className="hint">Efface définitivement toute ta progression : decks, cartes possédées, niveau, XP, victoires/défaites, campagne, pseudo et replays sauvegardés. Cette action est irréversible.</p>
      <button className="secondary danger" onClick={() => setResetConfirmOpen(true)}>🗑 Recommencer le jeu à zéro</button>
    </article>
  </div>{resetConfirmOpen && <div className="reset-confirm-overlay" role="dialog" aria-modal="true" onClick={closeResetConfirm}><div className="reset-confirm" onClick={(e) => e.stopPropagation()}><b>⚠ Réinitialisation totale</b><p>Tu es sur le point d'effacer <u>définitivement</u> toute ta progression : decks, cartes, niveau, XP, victoires, défaites, campagne et replays sauvegardés.</p><p>Cette action est <b>irréversible</b> — il n'existe aucun moyen de récupérer ces données ensuite. Assure-toi d'être sûr à 100 % avant de continuer.</p><p className="reset-confirm-hint">Pour confirmer, tape <b>{RESET_CONFIRM_WORD}</b> ci-dessous :</p><input value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder={RESET_CONFIRM_WORD} autoFocus /><div className="reset-confirm-actions"><button className="secondary" onClick={closeResetConfirm}>Annuler</button><button className="secondary danger" disabled={resetConfirmText.trim().toUpperCase() !== RESET_CONFIRM_WORD} onClick={doHardReset}>Tout supprimer définitivement</button></div></div></div>}</section>;
}

const TUTORIAL_STEPS: { title: string; text: string }[] = [
  { title: '1. Le but du duel', text: "Réduis les PV de ton adversaire à 0 pour gagner. Chaque joueur commence à 25 PV. Attaque son héros directement, ou élimine ses créatures pour dégager le passage." },
  { title: '2. Le mana', text: "Tu gagnes +1 mana maximum à chacun de tes tours (jusqu'à 10), et ton mana se recharge entièrement à chaque tour. Chaque carte a un coût en mana affiché en haut à gauche : tu ne peux la jouer que si tu as assez de mana disponible." },
  { title: '3. La main en tiroir', text: "Tes cartes sont rangées en bas de l'écran, à moitié cachées au repos. Touche une carte ou la poignée pour ouvrir la main en entier. Touche le terrain pour la refermer sans jouer." },
  { title: '4. Poser une créature', text: "En Main Phase, ouvre ta main puis touche une créature : un aperçu s'affiche avec le bouton INVOQUER. Confirme pour la poser sur ton terrain (3 emplacements). Une créature qui vient d'être posée ne peut pas attaquer ce tour-ci." },
  { title: '5. Jouer un sort', text: "Même principe que pour une créature, en Main Phase : ouvre ta main, touche le sort, un aperçu s'affiche avec le bouton ACTIVER. Les enchantements et soutiens se posent face cachée dans les 5 emplacements de soutien et restent sur le terrain jusqu'à leur activation." },
  { title: '6. Attaquer', text: "En Battle Phase (et uniquement là), touche une de tes créatures pour la sélectionner comme attaquante, puis touche une créature adverse pour l'attaquer, ou utilise le bouton 'Attaquer directement' pour viser le héros adverse. Si l'adversaire a une créature en Provocation, tu dois d'abord l'éliminer." },
  { title: '7. Évoluer une créature', text: "En Main Phase, une créature qui reste assez longtemps sur le terrain (indiqué dans son texte) peut évoluer : touche-la, puis choisis ÉVOLUER dans le panneau qui s'affiche à droite. Elle devient une version plus forte." },
  { title: '8. Activer un effet', text: "En Main Phase, certaines créatures ont un effet activable : touche ta créature, puis choisis 'Activer l'effet' dans le panneau à droite. Chaque effet a un nombre d'utilisations limité par tour." },
  { title: "9. La Fosse et l'Évosphère", text: "Les cartes défaussées ou détruites vont dans la Fosse (à gauche). Les formes d'évolution possibles de ton deck constituent ton Évosphère (à droite). Touche ces piles pour voir leur contenu." },
  { title: '10. Fin de tour', text: "Fais défiler les phases dans l'ordre : Draw → Main → Battle → End. Passer en End Phase termine ton tour. Ton adversaire joue alors, puis c'est de nouveau à toi, en Draw Phase." },
];

function Tutorial() {
  return <section><h2>Tutoriel</h2><p className="hint">Les bases pour ton premier duel — relis cette page à tout moment depuis le menu.</p><div className="options-grid">{TUTORIAL_STEPS.map((step) => <article key={step.title} className="options-card"><b>{step.title}</b><p className="hint">{step.text}</p></article>)}</div></section>;
}

const BOOSTERS: { id: Faction; name: string; price: number; blurb: string }[] = [
  { id: 'Meute', name: 'Booster Meute', price: 150, blurb: 'Nouvelles cartes Meute, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.' },
  { id: 'Chevalier', name: 'Booster Chevalier', price: 150, blurb: 'Nouvelles cartes Chevalier, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.' },
];

function Shop() {
  const s = useGame();
  return <section><h2>Boutique</h2><p className="hint">💎 {s.gems} gemmes · ✦ {s.gold} or</p><div className="options-grid">{BOOSTERS.map((booster) => { const preview = ALL_CARDS.filter((c) => c.faction === booster.id && c.boosterOnly); return <article key={booster.id} className="options-card"><b>{booster.name}</b><p className="hint">{booster.blurb}</p><p className="hint">Prix : ✦ {booster.price} · {preview.length} cartes inédites déjà conçues</p><ul className="hint booster-preview">{preview.map((card) => <li key={card.id}>{card.name} ({card.cost}◆) — {card.text}</li>)}</ul><button className="secondary" disabled title="Illustrations pas encore prêtes — vente désactivée en attendant.">🔒 Bientôt disponible</button></article>; })}</div><p className="hint">Les decks actuels ont déjà 3 exemplaires de chaque carte existante (maximum autorisé) : ces boosters ne contiendront donc que des cartes inédites, pas de doublons — leurs effets et statistiques sont déjà finalisés (voir la liste ci-dessus). Il ne manque plus que les illustrations pour les activer.</p></section>;
}

function Leaderboard() {
  const s = useGame();
  const total = s.wins + s.losses;
  const winRate = total > 0 ? Math.round((s.wins / total) * 100) : 0;
  return <section><h2>Classement</h2><p className="hint">Le classement en ligne demande un serveur partagé entre joueurs, qui n'existe pas encore dans ce projet — en attendant, voici ton propre palmarès.</p><div className="options-grid"><article className="options-card"><b>{s.playerName}</b><p className="hint">Niveau {s.level} · {s.wins} victoires · {s.losses} défaites</p><p className="hint">Taux de victoire : {winRate}%</p></article></div></section>;
}

function Replay() {
  const { id } = useParams();
  const s = useGame();
  const go = useNavigate();
  const replay = s.replays.find((r) => r.id === id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = replay?.snapshots.length ?? 0;
  useEffect(() => { document.body.classList.add('in-battle'); return () => document.body.classList.remove('in-battle'); }, []);
  useEffect(() => {
    if (!playing || !replay || step >= total - 1) { if (step >= total - 1) setPlaying(false); return; }
    const timer = window.setTimeout(() => setStep((n) => Math.min(total - 1, n + 1)), 1100);
    return () => window.clearTimeout(timer);
  }, [playing, step, replay, total]);
  if (!replay) return <section><h2>Replay introuvable</h2><p className="hint">Il a peut-être été supprimé.</p><button className="secondary" onClick={() => go('/profil')}>← Retour au profil</button></section>;
  const snap = replay.snapshots[Math.min(step, total - 1)];
  const opponentAvatarImage = getCard(replay.opponentFaction === 'Chevalier' ? 'capitaine-du-royaume' : 'croc-de-fer').image;
  const playerFaction: Faction = replay.opponentFaction === 'Chevalier' ? 'Meute' : 'Chevalier';
  // Rejoue exactement l'écran de duel réel (même fond WebGL, mêmes zones,
  // mêmes cartes) au lieu d'une maquette séparée — juste sans interaction,
  // piloté par l'instantané du tour affiché plutôt que par une partie en cours.
  return <section className="battle">
    <ArenaBackground className="battle-bg-video" paused={false} />
    <button className="battle-pause-btn" type="button" aria-label="Retour au profil" onClick={() => go('/profil')}>←</button>
    <div className="replay-info-bar"><b>{replay.label}</b><span className={replay.result}>{replay.result === 'win' ? '🏆 Victoire' : '💀 Défaite'}</span><span>vs {replay.opponentFaction} · {new Date(replay.date).toLocaleDateString()}</span></div>
    <div className="profile-float enemy"><div className="duel-profile"><span className="duel-profile-avatar"><img src={opponentAvatarImage} alt={replay.opponentFaction} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = cardBack; }} /></span><div className="duel-profile-text"><b>Rival Nexus</b><small>{replay.opponentFaction}</small></div></div><span className="life">♥ {snap.enemy.life}</span><span className="mana">◆ {snap.enemy.mana}/{snap.enemy.maxMana}</span></div>
    <div className="enemy-hand-row" aria-label={`Main de l'adversaire : ${snap.enemy.hand.length} cartes`}><div className="enemy-hand-inner">{snap.enemy.hand.map((_, i) => <span key={i} className="enemy-hand-card" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} />)}</div></div>
    <div className="battle-main">
      <div className="pile-rail left"><div className="card-pile grave"><span className="pile-stack" /><span className="pile-icon">☠</span><b>FOSSE</b><em>{snap.player.graveyard.length}</em></div></div>
      <div className="battle-center">
        <Zone title="ADVERSAIRE" units={snap.enemy.field} isEnemy taunted={false} selectable={false} selectedId={null} fx={null} support={snap.enemy.support} damagePulses={{}} />
        <div className="turn-strip"><b>{snap.activePlayer === 'player' ? 'TOUR DU JOUEUR' : "TOUR DE L'ADVERSAIRE"}</b><span>Tour {snap.turn}</span></div>
        <Zone title="TON TERRAIN" units={snap.player.field} isEnemy={false} taunted={false} selectable={false} selectedId={null} fx={null} support={snap.player.support} damagePulses={{}} />
      </div>
      <div className="pile-rail right"><div className="card-pile evo"><span className="pile-stack" /><span className="pile-icon">✦</span><b>ÉVOSPHÈRE</b><em>{snap.player.evosphere.length}</em></div><div className="card-pile deck"><span className="pile-stack" /><span className="pile-icon">▣</span><b>DECK</b><em>{snap.player.deck.length}</em></div></div>
    </div>
    <div className="profile-float player"><div className="duel-profile"><span className="duel-profile-avatar"><b>✦</b></span><div className="duel-profile-text"><b>{s.playerName}</b><small>{playerFaction}</small></div></div><span className="life">♥ {snap.player.life}</span><span className="mana">◆ {snap.player.mana}/{snap.player.maxMana}</span></div>
    <div className="hand open">{snap.player.hand.map((cardId, i) => { const card = getCard(cardId); return <div key={i} className="hand-card-wrap affordable"><CardView card={card} fullArt disabled /></div>; })}</div>
    <div className="battle-footer"><span className="hud-pill turn-readout">Tour {snap.turn}</span></div>
    <div className="replay-playback-bar">
      <button className="secondary" onClick={() => { setPlaying(false); setStep(0); }} disabled={step === 0}>⏮</button>
      <button className="secondary" onClick={() => { setPlaying(false); setStep((n) => Math.max(0, n - 1)); }} disabled={step === 0}>◀</button>
      <span className="replay-step">{step + 1}/{total}</span>
      <button className="secondary" onClick={() => { setPlaying(false); setStep((n) => Math.min(total - 1, n + 1)); }} disabled={step === total - 1}>▶</button>
      <button className="secondary" onClick={() => { setPlaying(false); setStep(total - 1); }} disabled={step === total - 1}>⏭</button>
      <button className="primary" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸ Pause' : '▶ Lecture auto'}</button>
    </div>
  </section>;
}

function FactionOnboarding() { const s = useGame(); const wolfArt = `${import.meta.env.BASE_URL}cards/evo-loup-de-givre.png`; const knightArt = getCard('capitaine-du-royaume').image; const blurbs: Record<Faction, string> = { Meute: 'Rejoins les loups des brumes. Instinct, meute et lune rouge — frappe vite, en nombre.', Chevalier: "Sers l'ordre du royaume. Discipline, provocation et lumière sacrée — tiens la ligne." }; return <div className="onboarding"><div className="onboarding-inner"><p className="eyebrow">CHOISIS TON SERMENT</p><h2>Quel camp défendras-tu ?</h2><p>Ce choix détermine ton deck de départ. L'autre faction reste verrouillée jusqu'à ce que tu remportes les {UNLOCK_SECOND_FACTION_AT} premiers chapitres de la campagne.</p><div className="onboarding-choices"><button className="onboarding-card" onClick={() => s.chooseStartingFaction('Meute')}><span className="onboarding-art" style={{ backgroundImage: `url(${wolfArt}), radial-gradient(circle at 50% 25%, #1c3a42, #050d0d 75%)` }} /><b>Meute</b><small>{blurbs.Meute}</small></button><button className="onboarding-card" onClick={() => s.chooseStartingFaction('Chevalier')}><span className="onboarding-art" style={{ backgroundImage: `url(${knightArt}), radial-gradient(circle at 50% 25%, #3a2f10, #0a0704 75%)` }} /><b>Chevalier</b><small>{blurbs.Chevalier}</small></button></div></div></div>; }

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

export default function App() { const factionChosen = useGame((s) => s.factionChosen); const hasLegacyDeck = useGame((s) => s.deck.length > 0); if (!factionChosen && !hasLegacyDeck) return <FactionOnboarding />; return <><DisplaySettingsBridge /><Shell><Routes><Route path="/" element={<Home />} /><Route path="/campagne" element={<Campaign />} /><Route path="/collection" element={<Collection />} /><Route path="/decks" element={<Decks />} /><Route path="/profil" element={<Profile />} /><Route path="/replay/:id" element={<Replay />} /><Route path="/combat" element={<Combat />} /><Route path="/paramètres" element={<Options />} /><Route path="/classement" element={<Leaderboard />} /><Route path="/boutique" element={<Shop />} /><Route path="/tutoriel" element={<Tutorial />} /></Routes></Shell></>; }
