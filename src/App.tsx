import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_CARDS, copiesInDeck, maxCopiesAllowed, useGame } from './store/game';
import { cardsByFaction, getCard } from './engine/cards';
import { CardDef, Faction, FieldUnit, GameState, SupportCard } from './engine/types';
import { CHAPTERS, chapterById } from './engine/campaign';
import { activateSupportCard, activateUnitEffect, declareAttack, endTurn, evolveUnit, newGame, playCard } from './engine/engine';
import cardBack from './assets/cards/nexus-card-back.png';

const nav = ['Jouer', 'Campagne', 'Collection', 'Decks', 'Profil', 'Classement', 'Boutique', 'Tutoriel', 'Paramètres'];
const path = (x: string) => (x === 'Jouer' ? '/' : '/' + x.toLowerCase());

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
    } catch {
      // Le plein écran / verrouillage d'orientation ne sont pas dispo partout (iOS Safari
      // notamment) : le jeu reste jouable normalement sans, on échoue silencieusement.
    }
  };
  return { active, toggle };
}

function FullscreenButton() {
  const { active, toggle } = useFullscreen();
  return (
    <button className="fullscreen-toggle" onClick={toggle} title={active ? 'Quitter le plein écran' : 'Plein écran'}>
      {active ? '⤡' : '⛶'}
    </button>
  );
}

function PortraitGate() {
  return (
    <div className="portrait-gate" aria-hidden="true">
      <div>
        <span className="rotate-icon">⟳</span>
        <p>Tourne ton appareil</p>
        <small>Nexus Arena se joue en mode paysage.</small>
      </div>
    </div>
  );
}

const MENU_TRACK = 'audio/menu-theme.mp3';
const COMBAT_TRACKS = [
  'audio/combat/duel-1-dark-intense.mp3',
  'audio/combat/duel-2-epique-choeurs.mp3',
  'audio/combat/duel-3-agressive.mp3',
];

// Référence partagée en dehors de React : le bouton musique doit pouvoir appeler
// .play() de façon SYNCHRONE dans son gestionnaire de clic (pas dans un useEffect
// déclenché après coup), sinon Safari iOS et la plupart des navigateurs mobiles
// bloquent silencieusement la lecture car l'appel n'est plus considéré comme
// déclenché directement par un geste utilisateur.
const sharedAudioRef: { current: HTMLAudioElement | null } = { current: null };

function MusicManager() {
  const location = useLocation();
  const enabled = useGame((s) => s.musicEnabled);
  const inCombat = location.pathname === '/combat';
  const wasInCombat = useRef(false);
  const [track, setTrack] = useState(MENU_TRACK);

  // Change de morceau uniquement à la transition menu -> combat (ou l'inverse),
  // jamais à chaque re-render, et tire une piste de duel au hasard à chaque entrée
  // en combat pour varier d'un duel à l'autre.
  useEffect(() => {
    if (inCombat && !wasInCombat.current) {
      setTrack(COMBAT_TRACKS[Math.floor(Math.random() * COMBAT_TRACKS.length)]);
    } else if (!inCombat && wasInCombat.current) {
      setTrack(MENU_TRACK);
    }
    wasInCombat.current = inCombat;
  }, [inCombat]);

  // Change de piste (menu <-> combat) : ici pas de contrainte de geste utilisateur
  // puisque la lecture est déjà en cours, on peut relancer depuis un effet.
  useEffect(() => {
    const audio = sharedAudioRef.current;
    if (!audio) return;
    audio.volume = inCombat ? 0.4 : 0.45;
    if (enabled) {
      audio.load();
      audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  useEffect(() => {
    const audio = sharedAudioRef.current;
    if (audio) audio.volume = inCombat ? 0.4 : 0.45;
  }, [inCombat]);

  return (
    <audio
      ref={(el) => {
        sharedAudioRef.current = el;
      }}
      src={`${import.meta.env.BASE_URL}${track}`}
      loop
      preload="none"
    />
  );
}

function MusicToggle() {
  const enabled = useGame((s) => s.musicEnabled);
  const setMusicEnabled = useGame((s) => s.setMusicEnabled);
  const onClick = () => {
    const next = !enabled;
    setMusicEnabled(next);
    // Appel direct et synchrone dans le clic : c'est ce qui manquait pour que
    // les navigateurs mobiles autorisent la lecture.
    const audio = sharedAudioRef.current;
    if (audio) {
      if (next) {
        audio.load();
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  };
  return (
    <button className="music-toggle" onClick={onClick} title={enabled ? 'Couper la musique' : 'Activer la musique du menu'}>
      {enabled ? '🔊' : '🔈'}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortraitGate />
      <MusicManager />
      <aside>
        <h1>
          ✦ NEXUS <small>CARD ARENA</small>
        </h1>
        {nav.map((x) => (
          <NavLink key={x} to={path(x)} end={x === 'Jouer'}>
            {x}
          </NavLink>
        ))}
      </aside>
      <main>{children}</main>
      <div className="hud-buttons">
        <MusicToggle />
        <FullscreenButton />
      </div>
    </>
  );
}

const CardView = ({
  card,
  onClick,
  disabled,
  badge,
}: {
  card: CardDef;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}) => (
  <motion.button
    whileHover={disabled ? undefined : { y: -8, rotate: 1 }}
    className={'card ' + card.rarity}
    onClick={onClick}
    disabled={disabled}
  >
    <i>{card.faction}</i>
    <b>{card.name}</b>
    <img
      className="card-art"
      src={card.image}
      alt={card.name}
      loading="lazy"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = cardBack;
      }}
    />
    <p>{card.text}</p>
    <footer>
      <span>{card.cost} ◆</span>
      {card.type === 'unit' ? (
        <span>
          ⚔ {card.attack}　♥ {card.health}
        </span>
      ) : (
        <span>Sort</span>
      )}
    </footer>
    {badge && <em className="card-badge">{badge}</em>}
  </motion.button>
);

function Home() {
  const go = useNavigate();
  const s = useGame();
  const { available: canInstall, install } = useInstallPrompt();
  const opponentFaction: Faction = s.faction === 'Meute' ? 'Chevalier' : 'Meute';
  const heroBg = `${import.meta.env.BASE_URL}backgrounds/home-hero.jpg`;

  return (
    <section className="home-hero" style={{ backgroundImage: `url(${heroBg})` }}>
      <header className="home-topbar">
        <div className="home-logo">
          <span className="home-logo-mark">✦</span>
          <div>
            <b>NEXUS</b>
            <small>CARD ARENA</small>
          </div>
        </div>
        {canInstall && (
          <button className="install-button" onClick={install}>
            ↓ Installer
          </button>
        )}
      </header>

      <div className="home-showcase">
        <div className="home-copy">
          <p className="eyebrow">LE SERMENT ET LA MEUTE</p>
          <h2>
            Entre dans
            <br />
            <em>l'Évosphère</em>
          </h2>
          <p>Construis ton héritage, affronte les gardiens de Nexus et découvre ce que la Reine a effacé.</p>
          <div className="faction-pick compact">
            {(['Meute', 'Chevalier'] as Faction[]).map((f) => (
              <button
                key={f}
                className={'faction-button' + (s.faction === f ? ' active' : '')}
                onClick={() => s.setFaction(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="menu-cards">
        <button className="menu-card" onClick={() => go('/campagne')}>
          <span className="menu-card-icon gold">✦</span>
          <span className="menu-card-body">
            <small>HISTOIRE</small>
            <b>Mode Campagne</b>
            <em>{s.campaignChapter}/{CHAPTERS.length} chapitres terminés</em>
          </span>
          <span className="menu-card-arrow">→</span>
        </button>
        <button className="menu-card" onClick={() => go('/combat')}>
          <span className="menu-card-icon teal">⚔</span>
          <span className="menu-card-body">
            <small>ENTRAÎNEMENT</small>
            <b>Duel rapide</b>
            <em>Main mélangée · contre {opponentFaction}</em>
          </span>
          <span className="menu-card-arrow">→</span>
        </button>
        <button className="menu-card" onClick={() => go('/paramètres')}>
          <span className="menu-card-icon violet">⚙</span>
          <span className="menu-card-body">
            <small>NEXUS</small>
            <b>Options</b>
            <em>Graphismes · Langue · Audio</em>
          </span>
          <span className="menu-card-arrow">→</span>
        </button>
      </div>

      <div className="stats">
        <b>Niveau {s.level}</b>
        <span>
          {s.wins} victoires · {s.losses} défaites
        </span>
        <span>{s.gold} ✦</span>
      </div>
    </section>
  );
}

function Campaign() {
  const s = useGame();
  const go = useNavigate();
  return (
    <section>
      <h2>Campagne</h2>
      <p className="hint">{s.campaignChapter} / {CHAPTERS.length} chapitres terminés</p>
      <div className="chapter-list">
        {CHAPTERS.map((chapter, i) => {
          const locked = i > s.campaignChapter;
          const done = i < s.campaignChapter;
          return (
            <article key={chapter.id} className={'chapter' + (locked ? ' locked' : '')}>
              <span className="number">0{i + 1}</span>
              <div className="chapter-body">
                <b>{chapter.title}</b>
                <small>
                  {done
                    ? 'Victoire inscrite dans les archives'
                    : locked
                    ? 'Scellé par la Reine'
                    : `Gardien ${chapter.opponentFaction} · IA ${chapter.aiDifficulty}`}
                </small>
              </div>
              {!locked && (
                <button onClick={() => go('/combat', { state: { chapterId: chapter.id } })}>
                  {done ? 'Rejouer' : 'Jouer'}
                </button>
              )}
              {locked && <span>◌</span>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Collection() {
  const [query, setQuery] = useState('');
  const owned = useGame((s) => s.owned);
  const filtered = ALL_CARDS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <section>
      <h2>Collection</h2>
      <input placeholder="Rechercher une carte…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="grid">
        {filtered.map((c) => (
          <CardView key={c.id} card={c} badge={owned.includes(c.id) ? undefined : 'Non possédée'} />
        ))}
      </div>
      <p className="hint">
        {owned.length}/{ALL_CARDS.filter((c) => c.level === 1).length} cartes de base possédées
      </p>
    </section>
  );
}

function Decks() {
  const s = useGame();
  const pool = cardsByFaction(s.faction).filter((c) => c.level === 1);
  const add = (id: string) => {
    if (copiesInDeck(s.deck, id) < maxCopiesAllowed(id)) s.saveDeck([...s.deck, id]);
  };
  const removeAt = (i: number) => s.saveDeck(s.deck.filter((_, n) => n !== i));
  return (
    <section>
      <h2>Constructeur de decks</h2>
      <p className="hint">{s.deck.length}/40 cartes · faction {s.faction} · minimum 20 pour jouer</p>
      <div className="builder">
        <div>
          <h3>Deck {s.faction}</h3>
          {s.deck.map((id, i) => {
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
              badge={`${copiesInDeck(s.deck, c.id)}/${maxCopiesAllowed(c.id)}`}
              disabled={copiesInDeck(s.deck, c.id) >= maxCopiesAllowed(c.id)}
              onClick={() => add(c.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}


type BattleFx =
  | { type: 'summon'; side: 'player' | 'enemy'; instanceId?: string }
  | { type: 'attack'; side: 'player' | 'enemy'; instanceId: string }
  | { type: 'evolution'; side: 'player' | 'enemy'; cardName: string }
  | null;

function FieldCard({
  unit,
  isEnemy,
  taunted,
  selectable,
  selected,
  fx,
  onSelect,
  damagePulse,
}: {
  unit: FieldUnit;
  isEnemy: boolean;
  taunted: boolean;
  selectable: boolean;
  selected: boolean;
  fx: BattleFx;
  onSelect?: (id: string) => void;
  damagePulse?: { key: string; amount: number };
}) {
  const card = ALL_CARDS.find((entry) => entry.id === unit.cardId);
  if (!card) return null;
  const isSummoning = fx?.type === 'summon' && fx.side === (isEnemy ? 'enemy' : 'player') &&
    (!fx.instanceId || fx.instanceId === unit.instanceId);
  const isAttacking = fx?.type === 'attack' && fx.instanceId === unit.instanceId;
  const isHit = !!damagePulse;

  return (
    <motion.button
      layout
      initial={{ scale: 0.15, opacity: 0, rotateY: 100 }}
      animate={
        isAttacking
          ? { scale: [1, 1.12, 1], y: isEnemy ? [0, 32, 0] : [0, -32, 0], opacity: 1, rotateY: 0 }
          : isSummoning
          ? { scale: [0.35, 1.18, 1], opacity: [0, 1, 1], rotateY: [90, -8, 0] }
          : isHit
          ? { scale: 1, opacity: 1, rotateY: 0, y: 0, x: [0, -7, 7, -5, 5, -2, 2, 0] }
          : { scale: 1, opacity: 1, rotateY: 0, y: 0, x: 0 }
      }
      transition={{ duration: isAttacking ? 0.48 : isHit ? 0.4 : 0.62, ease: 'easeOut' }}
      className={
        'field-card ' +
        card.rarity +
        (isEnemy && taunted && !unit.taunt ? ' not-targetable' : '') +
        (unit.taunt ? ' taunt' : '') +
        (unit.stunnedTurns > 0 ? ' stunned' : '') +
        (isHit ? ' hit-flash' : '') +
        (selected ? ' selected' : '')
      }
      disabled={!selectable}
      onClick={() => onSelect?.(unit.instanceId)}
      data-card-id={card.id}
      data-instance-id={unit.instanceId}
      data-evolvable={Boolean(!isEnemy && card.waitTurns && card.evolvesTo && unit.turnsOnField >= card.waitTurns)}
      data-evolution-name={card.evolvesTo ? ALL_CARDS.find((entry) => entry.id === card.evolvesTo)?.name ?? '' : ''}
      data-card-text={card.text}
      data-card-cost={card.cost}
      data-card-rarity={card.rarity}
      data-card-faction={card.faction}
      data-wait-turns={card.waitTurns ?? ''}
      data-turns-on-field={unit.turnsOnField}
      data-effect-uses={unit.effectUsesThisTurn ?? 0}
      data-effect-max={card.effect && !card.text.toLowerCase().includes('à l’invocation') ? (card.text.toLowerCase().includes('2 fois par tour') ? 2 : 1) : 0}
      data-has-effect={Boolean(card.effect)}
    >
      <img
        src={card.image}
        alt={card.name}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = cardBack;
        }}
      />
      <span className="field-card-name">{card.name}</span>
      <span className="field-card-level">NIV {card.level}</span>
      <span className="field-card-atk">⚔ {unit.attack}</span>
      <span className="field-card-hp">♥ {unit.health}</span>
      <span className="field-card-tags">
        {unit.taunt && <em>PROVOCATION</em>}
        {unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}
      </span>
      {damagePulse && (
        <motion.span
          key={damagePulse.key}
          className="dmg-float"
          initial={{ opacity: 1, y: 0, scale: 0.8 }}
          animate={{ opacity: [1, 1, 0], y: -46, scale: [0.8, 1.25, 1] }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
        >
          -{damagePulse.amount}
        </motion.span>
      )}
    </motion.button>
  );
}

function Zone({
  title,
  units,
  isEnemy,
  taunted,
  selectable,
  selectedId,
  fx,
  onSelect,
  support,
  onActivateSupport,
  damagePulses,
}: {
  title: string;
  units: FieldUnit[];
  isEnemy: boolean;
  taunted: boolean;
  selectable: boolean;
  selectedId?: string | null;
  fx: BattleFx;
  onSelect?: (id: string) => void;
  support: SupportCard[];
  onActivateSupport?: (instanceId: string) => void;
  damagePulses: Record<string, { key: string; amount: number }>;
}) {
  return (
    <div className={'zone-wrap ' + (isEnemy ? 'enemy-zone' : 'player-zone')}>
      <b>{title}</b>
      <div className="board">
        {Array.from({ length: 3 }, (_, index) => {
          const unit = units[index];
          return unit ? (
            <FieldCard
              key={unit.instanceId}
              unit={unit}
              isEnemy={isEnemy}
              taunted={taunted}
              selectable={selectable}
              selected={selectedId === unit.instanceId}
              fx={fx}
              onSelect={onSelect}
              damagePulse={damagePulses[unit.instanceId]}
            />
          ) : (
            <div className="field-slot" key={`slot-${index}`}>◇</div>
          );
        })}
      </div>
      <div className="support-row" aria-label="Zone de soutien">
        {Array.from({ length: 5 }, (_, index) => {
          const item = support[index];
          if (!item) return <div key={`sup-empty-${index}`}>◇</div>;
          const def = getCard(item.cardId);
          return (
            <button
              key={item.instanceId}
              className="support-card"
              disabled={isEnemy || !onActivateSupport}
              title={isEnemy ? 'Sort adverse posé face cachée' : `${def.name} — clique pour tenter de l'activer`}
              onClick={() => onActivateSupport?.(item.instanceId)}
            >
              ✦
            </button>
          );
        })}
      </div>
      <small>SOUTIEN {support.length}/5</small>
    </div>
  );
}

function Combat() {
  const s = useGame();
  const location = useLocation();
  const go = useNavigate();
  const chapterId = (location.state as { chapterId?: number } | null)?.chapterId;
  const chapter = chapterId !== undefined ? chapterById(chapterId) : undefined;
  const opponentFaction = chapter ? chapter.opponentFaction : s.faction === 'Meute' ? 'Chevalier' : 'Meute';
  const aiDifficulty = chapter ? chapter.aiDifficulty : 'novice';
  const lifeBonus = chapter ? chapter.enemyLifeBonus : 0;
  const reward = chapter ? chapter.reward : 35;

  const startMatch = () => newGame(s.faction, opponentFaction, aiDifficulty, s.deck, lifeBonus);
  const [match, setMatch] = useState<GameState>(startMatch);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [inspectedHandCard, setInspectedHandCard] = useState<string | null>(null);
  const [effectHint, setEffectHint] = useState<string>('');
  const [inspectedUnit, setInspectedUnit] = useState<string | null>(null);
  const [unitPulses, setUnitPulses] = useState<Record<string, { key: string; amount: number }>>({});
  const [heroPulses, setHeroPulses] = useState<{ player?: { key: string; amount: number }; enemy?: { key: string; amount: number } }>({});

  // Compare deux états pour détecter les PV perdus (unités + héros) et déclenche
  // les nombres flottants + le tremblement de carte correspondants.
  const pulseFromDiff = (before: GameState, after: GameState) => {
    const units: Record<string, { key: string; amount: number }> = {};
    const heroes: { player?: { key: string; amount: number }; enemy?: { key: string; amount: number } } = {};
    for (const side of ['player', 'enemy'] as const) {
      const beforeMap = new Map(before[side].field.map((u) => [u.instanceId, u.health]));
      for (const u of after[side].field) {
        const prevHp = beforeMap.get(u.instanceId);
        if (prevHp != null && u.health < prevHp) {
          units[u.instanceId] = { key: `${u.instanceId}-${Date.now()}-${Math.random()}`, amount: prevHp - u.health };
        }
      }
      if (after[side].life < before[side].life) {
        heroes[side] = { key: `${side}-${Date.now()}`, amount: before[side].life - after[side].life };
      }
    }
    if (Object.keys(units).length || Object.keys(heroes).length) {
      setUnitPulses(units);
      setHeroPulses(heroes);
      window.setTimeout(() => {
        setUnitPulses({});
        setHeroPulses({});
      }, 900);
    }
  };

  useEffect(() => {
    const onEvolve = (event: Event) => {
      const instanceId = (event as CustomEvent<string>).detail;
      if (!instanceId) return;
      setMatch((current) => evolveUnit(current, 'player', instanceId));
    };
    window.addEventListener('nexus:evolve', onEvolve);
    return () => window.removeEventListener('nexus:evolve', onEvolve);
  }, []);
  const [fx, setFx] = useState<BattleFx>(null);

  const clearFx = (delay = 850) => window.setTimeout(() => setFx(null), delay);

  const detectEvolution = (before: GameState, after: GameState) => {
    for (const side of ['player', 'enemy'] as const) {
      const oldByInstance = new Map(before[side].field.map((unit) => [unit.instanceId, unit.cardId]));
      const evolved = after[side].field.find((unit) => {
        const previousCard = oldByInstance.get(unit.instanceId);
        return previousCard && previousCard !== unit.cardId && unit.cardId.startsWith('evo-');
      });
      if (evolved) {
        const card = ALL_CARDS.find((entry) => entry.id === evolved.cardId);
        setFx({ type: 'evolution', side, cardName: card?.name ?? 'Évolution' });
        clearFx(2200);
        return true;
      }
    }
    return false;
  };

  if (match.winner && !reported) {
    s.record(match.winner === 'player');
    if (match.winner === 'player') {
      s.addGold(reward);
      if (chapter) s.completeChapter(chapter.id);
    }
    setReported(true);
  }

  useEffect(() => {
    const onPlayCard = (event: Event) => {
      const cardId = (event as CustomEvent<string>).detail;
      if (!cardId) return;
      setMatch((current) => playCard(current, 'player', cardId));
      setInspectedHandCard(null);
      setEffectHint('');
    };
    window.addEventListener('nexus:play-card', onPlayCard);
    return () => window.removeEventListener('nexus:play-card', onPlayCard);
  }, []);

  useEffect(() => {
    if (match.activePlayer !== 'player' || match.winner) return;
    const affordable = match.player.hand
      .map((id) => ALL_CARDS.find((card) => card.id === id))
      .filter((card): card is CardDef => Boolean(card && card.cost <= match.player.mana));
    const lethal = affordable.find((card) => card.effect?.kind === 'damage' && match.enemy.field.some((unit) => unit.health <= (card.effect?.value ?? 0)));
    const protect = affordable.find((card) => card.effect?.kind === 'protect' && match.player.field.some((unit) => unit.health <= Math.ceil(unit.maxHealth / 2)));
    const draw = affordable.find((card) => (card.effect?.kind === 'draw' || card.effect?.kind === 'search') && match.player.hand.length <= 2);
    const summon = affordable.find((card) => card.effect?.kind === 'summon' && match.player.field.length < 3);
    const recommended = lethal || protect || draw || summon;
    setEffectHint(recommended ? `C'est le moment d'activer ${recommended.name}.` : '');
  }, [match]);

  const restart = () => {
    setReported(false);
    setSelectedAttacker(null);
    setFx(null);
    setMatch(startMatch());
  };

  const enemyHasTaunt = match.enemy.field.some((unit) => unit.taunt);

  const onPlayerUnitClick = (id: string) => {
    const unit = match.player.field.find((entry) => entry.instanceId === id);
    if (!unit || !unit.canAttack || unit.stunnedTurns > 0) return;
    setSelectedAttacker(id === selectedAttacker ? null : id);
  };

  const resolveAttack = (targetId: string | null) => {
    if (!selectedAttacker) return;
    const attacker = selectedAttacker;
    const before = match;
    setFx({ type: 'attack', side: 'player', instanceId: attacker });
    window.setTimeout(() => {
      const next = declareAttack(match, 'player', attacker, targetId);
      setMatch(next);
      setSelectedAttacker(null);
      pulseFromDiff(before, next);
      clearFx(180);
    }, 330);
  };

  const play = (cardId: string) => {
    const card = ALL_CARDS.find((entry) => entry.id === cardId);
    const beforeIds = new Set(match.player.field.map((unit) => unit.instanceId));
    const next = playCard(match, 'player', cardId);
    setMatch(next);
    if (card?.type === 'unit') {
      const summoned = next.player.field.find((unit) => !beforeIds.has(unit.instanceId));
      setFx({ type: 'summon', side: 'player', instanceId: summoned?.instanceId });
      clearFx();
    }
  };

  const activateEffect = () => {
    if (!inspectedUnit) return;
    const before = match;
    const next = activateUnitEffect(match, 'player', inspectedUnit);
    setMatch(next);
    pulseFromDiff(before, next);
  };

  const finishTurn = () => {
    setSelectedAttacker(null);
    const before = match;
    const next = endTurn(match);
    setMatch(next);
    pulseFromDiff(before, next);
    if (detectEvolution(before, next)) return;
    const beforeEnemy = new Set(before.enemy.field.map((unit) => unit.instanceId));
    const summoned = next.enemy.field.find((unit) => !beforeEnemy.has(unit.instanceId));
    if (summoned) {
      setFx({ type: 'summon', side: 'enemy', instanceId: summoned.instanceId });
      clearFx();
    }
  };

  const hand = match.player.hand.map((id) => ALL_CARDS.find((card) => card.id === id)!).filter(Boolean);

  return (
    <section className="battle">
      {chapter && <p className="eyebrow">Chapitre {chapter.id + 1} · {chapter.title}</p>}
      {chapter && <div className="boss-quote">{chapter.opponentFaction === 'Chevalier' ? 'Jeanne d’Arc : Que la lumière guide ma lame !' : 'Chef de la Meute : Tu es entré sur notre territoire.'}</div>}

      <header className="enemy-hud">
        <strong>L'adversaire</strong>
        <span>Main {match.enemy.hand.length}</span>
        <span>Mana {match.enemy.mana}/{match.enemy.maxMana}</span>
        <b className={heroPulses.enemy ? 'hero-hit' : ''}>
          PV ♥ {match.enemy.life}/{match.enemy.maxLife}
          {heroPulses.enemy && (
            <motion.span
              key={heroPulses.enemy.key}
              className="dmg-float hero-dmg-float"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: [1, 1, 0], y: -30 }}
              transition={{ duration: 0.85 }}
            >
              -{heroPulses.enemy.amount}
            </motion.span>
          )}
        </b>
      </header>

      <Zone
        title="CRÉATURES ADVERSES"
        units={match.enemy.field}
        isEnemy
        taunted={enemyHasTaunt}
        selectable={!!selectedAttacker}
        fx={fx}
        onSelect={(targetId) => resolveAttack(targetId)}
        support={match.enemy.support}
        damagePulses={unitPulses}
      />

      <div className="turn-strip">
        <span>TOUR {match.turn}</span>
        <span>{match.activePlayer === 'player' ? 'À TOI DE JOUER' : "TOUR DE L'ADVERSAIRE"}</span>
        <span className="mana-readout">MANA {match.player.mana}/{match.player.maxMana}</span>
        <button className="attack-face" disabled={!selectedAttacker || enemyHasTaunt} onClick={() => resolveAttack(null)}>
          ATTAQUER LE HÉROS
        </button>
      </div>

      <p className="battle-log">{match.log[match.log.length - 1]}</p>

      <Zone
        title="TES CRÉATURES"
        units={match.player.field}
        isEnemy={false}
        taunted={false}
        selectable={match.activePlayer === 'player'}
        selectedId={selectedAttacker}
        fx={fx}
        onSelect={(id) => { setInspectedUnit(id); onPlayerUnitClick(id); }}
        support={match.player.support}
        damagePulses={unitPulses}
        onActivateSupport={(id) => {
          const before = match;
          const next = activateSupportCard(match, 'player', id);
          setMatch(next);
          pulseFromDiff(before, next);
        }}
      />

      {inspectedUnit && (
        <button className="activate-effect" onClick={activateEffect}>Activer l’effet</button>
      )}

      <div className="hand">
        {hand.map((card, index) => (
          <CardView
            key={`${card.id}-${index}`}
            card={card}
            disabled={match.activePlayer !== 'player' || card.cost > match.player.mana}
            onClick={() => play(card.id)}
          />
        ))}
      </div>

      <footer className="battle-footer">
        <h3 className={heroPulses.player ? 'hero-hit' : ''}>
          Toi <span>PV ♥ {match.player.life}/{match.player.maxLife}</span>
          {heroPulses.player && (
            <motion.span
              key={heroPulses.player.key}
              className="dmg-float hero-dmg-float"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: [1, 1, 0], y: -30 }}
              transition={{ duration: 0.85 }}
            >
              -{heroPulses.player.amount}
            </motion.span>
          )}
        </h3>
        <button className="end-turn" disabled={match.activePlayer !== 'player'} onClick={finishTurn}>
          TERMINER LE TOUR →
        </button>
      </footer>

      {fx?.type === 'summon' && <div className={'summon-shockwave ' + fx.side} />}
      {fx?.type === 'attack' && <div className="attack-flash" />}
      {fx?.type === 'evolution' && (
        <motion.div
          className={'evolution-warning ' + fx.side}
          initial={{ opacity: 0, scale: 1.45 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [1.45, 1, 1, 1.08] }}
          transition={{ duration: 2.1, times: [0, 0.18, 0.82, 1] }}
        >
          <small>⚠ NEXUS ALERT ⚠</small>
          <strong>WARNING</strong>
          <b>EVOLUTION</b>
          <span>{fx.cardName}</span>
        </motion.div>
      )}

      <div className="battle-side-piles" aria-label="Piles de cartes">
        <button className="card-pile evosphere-pile" type="button" title="Évosphère : 20 cartes maximum, 3 exemplaires par évolution">
          <span className="pile-cards" aria-hidden="true" />
          <b>{match.player.evosphere.length}/20</b>
          <small>ÉVOSPHÈRE</small>
        </button>
        <button className="card-pile graveyard-pile" type="button" title="Fosse : cartes utilisées ou détruites">
          <span className="pile-cards" aria-hidden="true" />
          <b>{match.player.graveyard.length}</b>
          <small>FOSSE</small>
        </button>
        <button className="card-pile deck-pile" type="button" title="Cartes restantes dans le deck">
          <span className="pile-cards" aria-hidden="true" />
          <b>{match.player.deck.length}</b>
          <small>DECK</small>
        </button>
      </div>

      {inspectedHandCard && (() => {
        const card = ALL_CARDS.find((entry) => entry.id === inspectedHandCard);
        if (!card) return null;
        return (
          <button
            type="button"
            className="card spell-preview-proxy"
            data-card-id={card.id}
            data-hand-card="true"
            data-effect-text={card.text}
            data-card-type="Sort"
            data-card-cost={card.cost}
            data-card-rarity={card.rarity}
            onClick={() => {}}
          >
            <i>{card.faction}</i>
            <b>{card.name}</b>
            <img className="card-art" src={card.image} alt={card.name} />
            <p>{card.text}</p>
            <footer><span>{card.cost} ◆</span><span>Sort</span></footer>
          </button>
        );
      })()}

      {effectHint && <div className="effect-hint">💡 {effectHint}</div>}

      {match.winner && (
        <div className="match-result">
          <p className={match.winner === 'player' ? 'win' : 'loss'}>
            {match.winner === 'player' ? `Victoire ! +${reward} ✦` : 'Défaite — retente ta chance.'}
          </p>
          <div className="match-result-actions">
            <button className="primary" onClick={restart}>{chapter ? 'Rejouer ce chapitre' : 'Nouveau duel'}</button>
            {chapter && <button className="secondary" onClick={() => go('/campagne')}>Retour à la campagne</button>}
          </div>
        </div>
      )}
    </section>
  );
}

function Profile() {
  const s = useGame();
  return (
    <section>
      <h2>Profil de Chronos</h2>
      <div className="profile">
        <b>✦</b>
        <div>
          <h3>Chronos</h3>
          <p>
            Niveau {s.level} · {s.wins} victoires · {s.losses} défaites
          </p>
          <progress value={s.wins % 5} max="5" />
        </div>
      </div>
    </section>
  );
}

function Options() {
  const s = useGame();
  const { active: fullscreenActive, toggle: toggleFullscreen } = useFullscreen();
  const [confirmReset, setConfirmReset] = useState(false);

  const doReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    s.resetProgress();
    setConfirmReset(false);
  };

  return (
    <section>
      <h2>Options</h2>
      <div className="options-grid">
        <article className="options-card">
          <b>Audio</b>
          <p className="hint">Musique de menu et de duel.</p>
          <button className="secondary" onClick={() => s.setMusicEnabled(!s.musicEnabled)}>
            {s.musicEnabled ? '🔊 Musique activée' : '🔈 Musique coupée'}
          </button>
        </article>
        <article className="options-card">
          <b>Affichage</b>
          <p className="hint">Plein écran, verrouillage paysage sur mobile.</p>
          <button className="secondary" onClick={toggleFullscreen}>
            {fullscreenActive ? '⤡ Quitter le plein écran' : '⛶ Plein écran'}
          </button>
        </article>
        <article className="options-card">
          <b>Faction</b>
          <p className="hint">Détermine ton deck de départ et l'IA du duel rapide.</p>
          <div className="faction-pick compact">
            {(['Meute', 'Chevalier'] as Faction[]).map((f) => (
              <button
                key={f}
                className={'faction-button' + (s.faction === f ? ' active' : '')}
                onClick={() => s.setFaction(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </article>
        <article className="options-card">
          <b>Langue</b>
          <p className="hint">Nexus Arena est actuellement disponible uniquement en français.</p>
        </article>
        <article className="options-card danger">
          <b>Réinitialiser la progression</b>
          <p className="hint">Remet à zéro l'or, le niveau, la campagne et le deck. Irréversible.</p>
          <button className="secondary danger" onClick={doReset}>
            {confirmReset ? 'Confirmer la réinitialisation ?' : 'Réinitialiser'}
          </button>
        </article>
      </div>
    </section>
  );
}

function Simple({ title }: { title: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p className="hint">Cette section arrive dans une prochaine passe de développement.</p>
    </section>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/campagne" element={<Campaign />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/decks" element={<Decks />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/combat" element={<Combat />} />
        <Route path="/paramètres" element={<Options />} />
        {['classement', 'boutique', 'tutoriel'].map((x) => (
          <Route key={x} path={'/' + x} element={<Simple title={x[0].toUpperCase() + x.slice(1)} />} />
        ))}
      </Routes>
    </Shell>
  );
}
