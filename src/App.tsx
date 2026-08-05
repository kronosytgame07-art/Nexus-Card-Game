import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_CARDS, copiesInDeck, maxCopiesAllowed, useGame } from './store/game';
import { cardsByFaction } from './engine/cards';
import { CardDef, Faction, FieldUnit, GameState } from './engine/types';
import { CHAPTERS, chapterById } from './engine/campaign';
import { declareAttack, endTurn, newGame, playCard } from './engine/engine';
import cardBack from './assets/cards/nexus-card-back.png';

const nav = ['Jouer', 'Campagne', 'Collection', 'Decks', 'Profil', 'Classement', 'Boutique', 'Tutoriel', 'Paramètres'];
const path = (x: string) => (x === 'Jouer' ? '/' : '/' + x.toLowerCase());

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

function MusicManager() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const location = useLocation();
  const enabled = useGame((s) => s.musicEnabled);
  const inCombat = location.pathname === '/combat';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled && !inCombat) {
      audio.volume = 0.45;
      audio.play().catch(() => {
        // Bloqué par la politique d'autoplay du navigateur tant qu'aucune interaction
        // n'a eu lieu — le bouton musique relancera la lecture au prochain clic.
      });
    } else {
      audio.pause();
    }
  }, [enabled, inCombat]);

  return <audio ref={audioRef} src={`${import.meta.env.BASE_URL}audio/menu-theme.mp3`} loop preload="none" />;
}

function MusicToggle() {
  const enabled = useGame((s) => s.musicEnabled);
  const setMusicEnabled = useGame((s) => s.setMusicEnabled);
  return (
    <button
      className="music-toggle"
      onClick={() => setMusicEnabled(!enabled)}
      title={enabled ? 'Couper la musique' : 'Activer la musique du menu'}
    >
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
  return (
    <section className="home">
      <p className="eyebrow">LE SERMENT ET LA MEUTE</p>
      <h2>
        Entre dans
        <br />
        <em>l'Évosphère</em>
      </h2>
      <p>Construis ton héritage et affronte les gardiens de Nexus.</p>
      <div className="faction-pick">
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
      <div className="home-actions">
        <button className="primary" onClick={() => go('/campagne')}>
          ✦ Campagne
        </button>
        <button className="secondary" onClick={() => go('/combat')}>
          ⚔ Duel rapide
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

function Zone({
  title,
  units,
  isEnemy,
  taunted,
  selectable,
  selectedId,
  onSelect,
}: {
  title: string;
  units: FieldUnit[];
  isEnemy: boolean;
  taunted: boolean;
  selectable: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="zone-wrap">
      <b>{title}</b>
      <div className="board slots-6">
        {units.length === 0 && Array.from({ length: 1 }, (_, i) => <div key={i}>—</div>)}
        {units.map((u) => (
          <button
            key={u.instanceId}
            className={
              'field-unit' +
              (isEnemy && taunted && !u.taunt ? ' not-targetable' : '') +
              (u.taunt ? ' taunt' : '') +
              (u.stunnedTurns > 0 ? ' stunned' : '') +
              (selectedId === u.instanceId ? ' selected' : '')
            }
            disabled={!selectable}
            onClick={() => onSelect?.(u.instanceId)}
          >
            <span className="fu-stats">
              ⚔ {u.attack} ♥ {u.health}
            </span>
            {u.taunt && <span className="fu-tag">Provocation</span>}
            {u.stunnedTurns > 0 && <span className="fu-tag">Étourdi</span>}
          </button>
        ))}
      </div>
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

  if (match.winner && !reported) {
    s.record(match.winner === 'player');
    if (match.winner === 'player') {
      s.addGold(reward);
      if (chapter) s.completeChapter(chapter.id);
    }
    setReported(true);
  }

  const restart = () => {
    setReported(false);
    setSelectedAttacker(null);
    setMatch(startMatch());
  };

  const enemyHasTaunt = match.enemy.field.some((u) => u.taunt);

  const onPlayerUnitClick = (id: string) => {
    const unit = match.player.field.find((u) => u.instanceId === id);
    if (!unit || !unit.canAttack || unit.stunnedTurns > 0) return;
    setSelectedAttacker(id === selectedAttacker ? null : id);
  };

  const onEnemyUnitClick = (targetId: string) => {
    if (!selectedAttacker) return;
    setMatch(declareAttack(match, 'player', selectedAttacker, targetId));
    setSelectedAttacker(null);
  };

  const attackFace = () => {
    if (!selectedAttacker || enemyHasTaunt) return;
    setMatch(declareAttack(match, 'player', selectedAttacker, null));
    setSelectedAttacker(null);
  };

  const play = (cardId: string) => {
    setMatch(playCard(match, 'player', cardId));
  };

  const finishTurn = () => {
    setSelectedAttacker(null);
    setMatch(endTurn(match));
  };

  const hand = match.player.hand.map((id) => ALL_CARDS.find((c) => c.id === id)!).filter(Boolean);

  return (
    <section className="battle">
      {chapter && <p className="eyebrow">Chapitre {chapter.id + 1} · {chapter.title}</p>}
      <h2>
        L'adversaire <span>♥ {match.enemy.life}/{match.enemy.maxLife}</span>
      </h2>
      <div className="battle-meta">
        <span>Main adverse : {match.enemy.hand.length} cartes</span>
        <span>Mana {match.enemy.mana}/{match.enemy.maxMana}</span>
      </div>
      <Zone
        title="Créatures adverses"
        units={match.enemy.field}
        isEnemy
        taunted={enemyHasTaunt}
        selectable={!!selectedAttacker}
        onSelect={onEnemyUnitClick}
      />

      <div className="turn-strip">
        <span>Tour {match.turn}</span>
        <span>{match.activePlayer === 'player' ? 'Ton tour' : "Tour de l'adversaire"}</span>
        <span className="mana-readout">Mana {match.player.mana}/{match.player.maxMana}</span>
        <button className="attack-face" disabled={!selectedAttacker || enemyHasTaunt} onClick={attackFace}>
          Attaquer le héros
        </button>
      </div>

      <p className="battle-log">{match.log[match.log.length - 1]}</p>

      <Zone
        title="Tes créatures"
        units={match.player.field}
        isEnemy={false}
        taunted={false}
        selectable={match.activePlayer === 'player'}
        selectedId={selectedAttacker}
        onSelect={onPlayerUnitClick}
      />

      <div className="hand">
        {hand.map((c, i) => (
          <CardView
            key={`${c.id}-${i}`}
            card={c}
            disabled={match.activePlayer !== 'player' || c.cost > match.player.mana}
            onClick={() => play(c.id)}
          />
        ))}
      </div>

      <div className="battle-footer">
        <h3>
          Toi <span>♥ {match.player.life}/{match.player.maxLife}</span>
        </h3>
        <button className="end-turn" disabled={match.activePlayer !== 'player'} onClick={finishTurn}>
          Terminer le tour →
        </button>
      </div>

      {match.winner && (
        <div className="match-result">
          <p className={match.winner === 'player' ? 'win' : 'loss'}>
            {match.winner === 'player' ? `Victoire ! +${reward} ✦` : 'Défaite — retente ta chance.'}
          </p>
          <div className="match-result-actions">
            <button className="primary" onClick={restart}>
              {chapter ? 'Rejouer ce chapitre' : 'Nouveau duel'}
            </button>
            {chapter && (
              <button className="secondary" onClick={() => go('/campagne')}>
                Retour à la campagne
              </button>
            )}
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
        {['classement', 'boutique', 'tutoriel', 'paramètres'].map((x) => (
          <Route key={x} path={'/' + x} element={<Simple title={x[0].toUpperCase() + x.slice(1)} />} />
        ))}
      </Routes>
    </Shell>
  );
}
