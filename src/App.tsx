import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ALL_CARDS, ALL_FACTIONS, AnimationMode, AVATAR_PRICE_GEMS, BOOSTER_PULL_COUNT, copiesInDeck, defaultAvatarFor, EVOSPHERE_MAX, FOIL_CRAFT_COST, InterfaceScale, Language, MAIN_DECK_MAX, MAIN_DECK_MIN, maxCopiesAllowed, purchasableAvatarCards, TERRAIN_PRICE_GEMS, TERRAINS, UNLOCK_SECOND_FACTION_AT, UNLOCK_THIRD_FACTION_AT, useGame, VisualQuality, WIN_GEMS_REWARD, XP_PER_LEVEL } from './store/game';
import { cardsByFaction, getCard } from './engine/cards';
import { CardDef, Faction, FieldUnit, GameState, MAX_MANA, Rarity, SupportCard } from './engine/types';
import { DEFAULT_RANKED_RATING, RANKED_LADDER, aiDifficultyForRating, formatRank, rankForRating, rankedRatingDelta, type RankedTier } from './engine/ranked';
import { CHAPTERS, chapterById } from './engine/campaign';
import { activateSupportCard, activateUnitEffect, aiDrawPhase, aiEndPhase, aiMainPhase, aiPrepareBattlePlan, aiResolveOneAttack, availableReactionSupportIds, declareAttack, evolveUnit, MAX_FIELD_UNITS, MAX_SUPPORT, newGame, passReactionWindow, playCard } from './engine/engine';
import { canFightTarget } from './engine/combat-rules';
import { archetypeIdentity } from './engine/archetypes';
import cardBack from './assets/cards/nexus-card-back.jpg';
import ArenaBackground, { ArenaBackgroundHandle } from './components/ArenaBackground';
import VfxLayer, { DashTone, VfxHandle } from './components/VfxLayer';
import HomeSparkles from './components/HomeSparkles';
import AudioDirector from './components/AudioDirector';
import { CodexPanel } from './components/CodexPanel';
import { NarrativeCampaign } from './components/NarrativeCampaign';
import { SecretDragonReward } from './components/SecretDragonReward';
import { t, type UiKey } from './i18n';

// Chargé à la demande : embarque le SDK Firebase (auth + firestore), inutile pour le reste
// du jeu — évite d'alourdir le chargement initial pour les joueurs qui ne visitent jamais
// l'écran Échanges.
const Trades = lazy(() => import('./Trades'));
const GoogleAccountSection = lazy(() => import('./GoogleAccount'));
const GoogleSignInGate = lazy(() => import('./GoogleAccount').then((m) => ({ default: m.GoogleSignInGate })));

// Navigation consolidée : 5 sections au lieu de 10 onglets — Campagne/Duel/Replay
// vivent sous "Jouer" (déjà la page d'accueil), Decks sous "Collection", et
// Profil/Échanges/Classement sous "Social", chacune avec ses propres sous-onglets
// internes. Le Tutoriel reste accessible via un petit bouton d'aide (voir Shell).
const NAV_SECTIONS: {
  label: string;
  to: string;
  icon: string;
  matchPaths: string[];
}[] = [
  {
    label: 'Jouer',
    to: '/',
    icon: '⚔',
    matchPaths: ['/', '/campagne', '/combat', '/replay'],
  },
  {
    label: 'Collection',
    to: '/collection',
    icon: '▣',
    matchPaths: ['/collection', '/decks'],
  },
  {
    label: 'Social',
    to: '/profil',
    icon: '👥',
    matchPaths: ['/profil', '/échanges', '/classement'],
  },
  { label: 'Boutique', to: '/boutique', icon: '🛒', matchPaths: ['/boutique'] },
  {
    label: 'Paramètres',
    to: '/paramètres',
    icon: '⚙',
    matchPaths: ['/paramètres'],
  },
];

const UI_ASSET = {
  coin: `${import.meta.env.BASE_URL}ui/nexus-coin.png`,
  gem: `${import.meta.env.BASE_URL}ui/nexus-gem.png`,
  mana: `${import.meta.env.BASE_URL}ui/mana-rune.png`,
} as const;

const RANK_BADGES: Record<RankedTier, string> = {
  'Aspirant du Nexus': 'aspirant-du-nexus',
  'Éclaireur des Failles': 'eclaireur-des-failles',
  'Gardien des Runes': 'gardien-des-runes',
  'Champion du Nexus': 'champion-du-nexus',
  'Maître des Évosphères': 'maitre-des-evospheres',
  'Seigneur des Failles': 'seigneur-des-failles',
  'Légende du Nexus': 'legende-du-nexus',
};

function CurrencyIcon({ kind, className = '' }: { kind: keyof typeof UI_ASSET; className?: string }) {
  return <img className={`currency-icon ${kind} ${className}`} src={UI_ASSET[kind]} alt="" aria-hidden="true" />;
}

function CurrencyAmount({ kind, amount, label }: { kind: keyof typeof UI_ASSET; amount: number; label?: string }) {
  return (
    <span className={`currency-amount ${kind}`}>
      <CurrencyIcon kind={kind} />
      <b>{amount}</b>
      {label && <small>{label}</small>}
    </span>
  );
}

function RankBadge({ tier, className = '' }: { tier: RankedTier; className?: string }) {
  return <img className={`rank-badge ${className}`} src={`${import.meta.env.BASE_URL}ranks/${RANK_BADGES[tier]}.png`} alt={`Médaille ${tier}`} />;
}

function RuneMeter({ mana, maxMana, enemy = false }: { mana: number; maxMana: number; enemy?: boolean }) {
  const capacity = Math.max(1, maxMana);
  const safeMana = Math.max(0, Math.min(mana, capacity));
  return (
    <div className={`rune-meter${enemy ? ' enemy' : ''}`} aria-label={`${safeMana} runes disponibles sur ${maxMana}`}>
      <span className="mana-reservoir" aria-hidden="true">
        <CurrencyIcon kind="mana" />
        <span className="mana-value"><b>{safeMana}</b><small>/{maxMana}</small></span>
      </span>
      <span className="mana-pips" aria-hidden="true">
        {Array.from({ length: MAX_MANA }, (_, index) => (
          <i key={index} className={`${index < capacity ? 'unlocked' : 'locked'}${index < safeMana ? ' charged' : ''}`} />
        ))}
      </span>
    </div>
  );
}
/** React Router laisse le pathname pourcent-encodé pour les caractères
    accentués (ex. "/échanges" devient "/%C3%A9changes") — on décode avant
    toute comparaison stricte pour ne pas rater ces routes. */
function decodedPathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}
function isSectionActive(section: (typeof NAV_SECTIONS)[number], pathname: string): boolean {
  const p2 = decodedPathname(pathname);
  return section.matchPaths.some((p) => (p === '/' ? p2 === '/' : p2 === p || p2.startsWith(p + '/')));
}
const CARD_BACK_URL = `${import.meta.env.BASE_URL}cards/card-back.jpg`;
const LOGO_URL = `${import.meta.env.BASE_URL}icons/logo-mark.png`;

/** Faction adverse pour un duel rapide : rotation stable (pas aléatoire, pour
    ne pas changer à chaque rendu) parmi les DEUX AUTRES factions du jeu. */
function rivalFactionFor(faction: Faction): Faction {
  const others = ALL_FACTIONS.filter((f) => f !== faction);
  return others[0] ?? faction;
}

/** Teinte de la traînée d'attaque WebGL selon la faction — chaque archétype
    a sa propre signature visuelle (givre Meute, feu Chevalier, sang Orc). */
function dashToneFor(faction: Faction): DashTone {
  if (faction === 'Meute') return 'frost';
  if (faction === 'Orc') return 'blood';
  return 'fire';
}

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
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
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
const COMBAT_TRACKS = ['audio/combat/duel-1-dark-intense.mp3', 'audio/combat/duel-2-epique-choeurs.mp3', 'audio/combat/duel-3-agressive.mp3'];
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
    if (enabled) {
      audio.load();
      audio.play().catch(() => {});
    }
  }, [track]);
  useEffect(() => {
    const audio = sharedAudioRef.current;
    if (audio) audio.volume = (inCombat ? 0.4 : 0.45) * (musicVolume / 100);
  }, [inCombat, musicVolume]);
  useEffect(() => {
    const audio = sharedAudioRef.current;
    if (audio && enabled) audio.play().catch(() => {});
    else if (audio && !enabled) audio.pause();
  }, [enabled]);
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
    const audio = sharedAudioRef.current;
    if (audio) next ? (audio.load(), audio.play().catch(() => {})) : audio.pause();
  };
  return (
    <button className="music-toggle" onClick={onClick} title={enabled ? 'Couper la musique' : 'Activer la musique du menu'}>
      {enabled ? '🔊' : '🔈'}
    </button>
  );
}

function navTranslationKey(label: string): UiKey | null {
  const map: Record<string, UiKey> = {
    Jouer: 'nav.play',
    Collection: 'nav.collection',
    Social: 'nav.social',
    Boutique: 'nav.shop',
    Paramètres: 'nav.settings',
  };
  return map[label] ?? null;
}

type MenuTheme = 'campaign' | 'collection' | 'ranked' | 'shop' | 'settings';

function menuThemeForPath(pathname: string): MenuTheme | null {
  const path = decodedPathname(pathname);
  if (path === '/' || path.startsWith('/combat') || path.startsWith('/replay')) return null;
  if (path.startsWith('/campagne') || path.startsWith('/chroniques')) return 'campaign';
  if (path.startsWith('/collection') || path.startsWith('/decks')) return 'collection';
  if (path.startsWith('/profil') || path.startsWith('/échanges') || path.startsWith('/classement') || path.startsWith('/multijoueur')) return 'ranked';
  if (path.startsWith('/boutique')) return 'shop';
  return 'settings';
}

function MenuAtmosphere({ theme }: { theme: MenuTheme | null }) {
  const animationMode = useGame((state) => state.animationMode);
  const batterySaver = useGame((state) => state.batterySaver);
  const videoRef = useRef<HTMLVideoElement>(null);
  const paused = animationMode === 'off' || batterySaver;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused, theme]);
  useEffect(() => {
    if (!theme || paused) return;
    const move = (event: PointerEvent) => {
      const x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      document.documentElement.style.setProperty('--scene-shift-x', `${(-x * 7).toFixed(2)}px`);
      document.documentElement.style.setProperty('--scene-shift-y', `${(-y * 5).toFixed(2)}px`);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [paused, theme]);
  if (!theme) return null;
  const background = theme === 'campaign' ? `${import.meta.env.BASE_URL}story/chapter-1/scene-01-nexus-fragment.png` : theme === 'ranked' ? `${import.meta.env.BASE_URL}backgrounds/ranked-hall.png` : `${import.meta.env.BASE_URL}backgrounds/collection-archive.png`;
  return (
    <div className={`menu-atmosphere theme-${theme}`} aria-hidden="true">
      {theme === 'shop' ? (
        <video ref={videoRef} className="menu-atmosphere-media" autoPlay={!paused} loop muted playsInline poster={`${import.meta.env.BASE_URL}backgrounds/shop-merchant-frame-a.png`}>
          <source src={`${import.meta.env.BASE_URL}backgrounds/shop-merchant-loop.mp4`} type="video/mp4" />
        </video>
      ) : (
        <div className="menu-atmosphere-media menu-atmosphere-image" style={{ backgroundImage: `url(${background})` }} />
      )}
      <div className="menu-atmosphere-shade" />
      <div className="menu-atmosphere-depth back" />
      <div className="menu-atmosphere-depth front" />
      <div className="menu-atmosphere-lantern one" />
      <div className="menu-atmosphere-lantern two" />
      <div className="menu-atmosphere-rift one" />
      <div className="menu-atmosphere-rift two" />
      <HomeSparkles className="menu-atmosphere-sparkles" paused={paused} />
    </div>
  );
}

function ShopMerchantReaction() {
  const lines = ['Une relique pour ta collection ?', 'La chance sourit aux audacieux.', 'Tout se gagne dans l’arène, ami.'];
  const [line, setLine] = useState(0);
  return (
    <button className="merchant-reaction" type="button" onClick={() => setLine((value) => (value + 1) % lines.length)}>
      <span className="merchant-speech">{lines[line]}</span>
      <span className="merchant-prompt">✦ Parler à Marrek</span>
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const language = useGame((state) => state.language);
  const theme = menuThemeForPath(location.pathname);
  const navItems = NAV_SECTIONS.map((section) => ({
    section,
    active: isSectionActive(section, location.pathname),
  }));
  return (
    <>
      <PortraitGate />
      <MusicManager />
      <MenuAtmosphere theme={theme} />
      {theme === 'shop' && <ShopMerchantReaction />}
      <aside className="app-sidebar">
        <h1>
          <img className="brand-mark" src={LOGO_URL} alt="Nexus Arena" /> NEXUS <small>CARD ARENA</small>
        </h1>
        {navItems.map(({ section, active }) => (
          <Link key={section.label} to={section.to} className={'nav-link' + (active ? ' active' : '')}>
            <span className="nav-link-icon">{section.icon}</span>
            {navTranslationKey(section.label) ? t(language, navTranslationKey(section.label)!) : section.label}
          </Link>
        ))}
      </aside>
      <main className={theme ? `menu-main theme-${theme}` : ''}>{children}</main>
      <div className="hud-buttons">
        <Link to="/tutoriel" className="help-toggle" title="Tutoriel">
          ﹖
        </Link>
        <MusicToggle />
        <FullscreenButton />
      </div>
    </>
  );
}

const CardView = ({ card, onClick, disabled, badge, fullArt }: { card: CardDef; onClick?: () => void; disabled?: boolean; badge?: string; fullArt?: boolean }) => {
  const [showName, setShowName] = useState(false);
  if (fullArt) {
    return (
      <motion.button whileHover={disabled ? undefined : { y: -8, rotate: 1 }} className={'card full-art ' + card.rarity} onClick={onClick} disabled={disabled} data-card-type={card.type} data-card-name={card.name} data-effect-text={card.text} onPointerDown={() => setShowName(true)} onPointerUp={() => window.setTimeout(() => setShowName(false), 900)} onPointerLeave={() => setShowName(false)}>
        <img
          className="card-art-full"
          src={card.image}
          alt={card.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = cardBack;
          }}
        />
        <span className={'card-name-tooltip' + (showName ? ' show' : '')}>{card.name}</span>
        {badge && <em className="card-badge">{badge}</em>}
      </motion.button>
    );
  }
  return (
    <motion.button whileHover={disabled ? undefined : { y: -8, rotate: 1 }} className={'card ' + card.rarity} onClick={onClick} disabled={disabled} data-card-type={card.type}>
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
        <span className="card-cost">
          <CurrencyIcon kind="mana" />
          {card.cost}
        </span>
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
};

function EvolutionInfo({ card, turnsOnField }: { card: CardDef; turnsOnField?: number }) {
  if (!card.evolvesTo) return null;
  const evolution = ALL_CARDS.find((entry) => entry.id === card.evolvesTo);
  if (!evolution)
    return (
      <div className="evolution-info missing">
        <b>Évolution</b>
        <span>Forme suivante introuvable dans les données.</span>
      </div>
    );
  const required = card.waitTurns ?? 0;
  const current = turnsOnField ?? 0;
  const remaining = Math.max(0, required - current);
  const ready = turnsOnField !== undefined && remaining === 0;
  const status = turnsOnField === undefined ? 'Disponible après ' + required + ' tour' + (required > 1 ? 's' : '') + ' sur le terrain.' : ready ? '✓ ÉVOLUTION PRÊTE' : 'Encore ' + remaining + ' tour' + (remaining > 1 ? 's' : '') + ' à survivre.';
  return (
    <div className={'evolution-info' + (ready ? ' ready' : '')}>
      <img
        src={evolution.image}
        alt={evolution.name}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = cardBack;
        }}
      />
      <div>
        <b>Évolution → {evolution.name}</b>
        <span>
          ⚔ {evolution.attack} · ♥ {evolution.health}
        </span>
        {required > 0 && <small>{status}</small>}
      </div>
    </div>
  );
}

function Home() {
  const go = useNavigate();
  const s = useGame();
  const { available: canInstall, install } = useInstallPrompt();
  const opponentFaction: Faction = rivalFactionFor(s.faction);
  const heroBg = `${import.meta.env.BASE_URL}backgrounds/home-hero.jpg`;
  const heroVideo = `${import.meta.env.BASE_URL}backgrounds/home-hero.mp4`;
  const reduceMotion = s.animationMode !== 'full';
  const fadeUp = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: 'easeOut' as const },
        };
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;
    if (s.animationMode === 'off' || s.batterySaver) video.pause();
    else video.play().catch(() => {});
  }, [s.animationMode, s.batterySaver]);
  useEffect(() => {
    document.body.classList.add('on-home');
    return () => document.body.classList.remove('on-home');
  }, []);
  return (
    <section className="home-hero">
      <video className="home-hero-bg" ref={bgVideoRef} autoPlay loop muted playsInline poster={heroBg}>
        <source src={heroVideo} type="video/mp4" />
      </video>
      <div className="home-glow a" />
      <div className="home-glow b" />
      <HomeSparkles className="home-sparkles" paused={s.animationMode === 'off' || s.batterySaver} />
      <motion.header className="home-topbar" {...fadeUp(0)}>
        <div className="home-logo">
          <span className="home-logo-mark">
            <img src={LOGO_URL} alt="Nexus Arena" />
          </span>
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
      </motion.header>
      <motion.div className="home-showcase" {...fadeUp(0.12)}>
        <div className="home-copy">
          <p className="eyebrow">LE SERMENT ET LA MEUTE</p>
          <h2>
            Entre dans
            <br />
            <em>l'Évosphère</em>
          </h2>
          <p>Construis ton héritage, affronte les gardiens de Nexus et découvre ce que la Reine a effacé.</p>
          <div className="faction-pick compact">
            {ALL_FACTIONS.map((f) => {
              const unlocked = s.unlockedFactions.includes(f);
              return (
                <button key={f} className={'faction-button' + (s.faction === f ? ' active' : '') + (unlocked ? '' : ' locked')} disabled={!unlocked} title={unlocked ? undefined : `Verrouillé — gagne ${f === 'Orc' ? UNLOCK_THIRD_FACTION_AT : UNLOCK_SECOND_FACTION_AT} chapitres de campagne pour débloquer`} onClick={() => s.setFaction(f)}>
                  {unlocked ? f : `🔒 ${f}`}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
      <motion.div className="menu-cards" {...fadeUp(0.24)}>
        <button className="menu-card" onClick={() => go('/campagne')}>
          <span className="menu-card-icon gold">✦</span>
          <span className="menu-card-body">
            <small>HISTOIRE</small>
            <b>Mode Campagne</b>
            <em>
              {s.campaignChapter}/{CHAPTERS.length} chapitres terminés
            </em>
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
        <button className="menu-card" onClick={() => go('/multijoueur')}>
          <span className="menu-card-icon red">👥</span>
          <span className="menu-card-body">
            <small>EN LIGNE</small>
            <b>Multijoueur</b>
            <em>Classique ou Classé</em>
          </span>
          <span className="menu-card-arrow">→</span>
        </button>
      </motion.div>
      <motion.div className="stats" {...fadeUp(0.36)}>
        <b>
          {s.playerName} · Niveau {s.level}
        </b>
        <span>
          {s.xp}/{XP_PER_LEVEL} XP · {s.wins} victoires · {s.losses} défaites
        </span>
        <span className="wallet">
          <CurrencyAmount kind="gem" amount={s.gems} />
          <CurrencyAmount kind="coin" amount={s.gold} />
        </span>
      </motion.div>
    </section>
  );
}

function Campaign() {
  const s = useGame();
  const go = useNavigate();
  return (
    <section>
      <h2>Campagne</h2>
      <p className="hint">
        {s.campaignChapter} / {CHAPTERS.length} chapitres terminés
      </p>
      <div className="chapter-list">
        {CHAPTERS.map((chapter, i) => {
          const locked = i > s.campaignChapter;
          const done = i < s.campaignChapter;
          return (
            <article key={chapter.id} className={'chapter' + (locked ? ' locked' : '')}>
              <span className="number">0{i + 1}</span>
              <div className="chapter-body">
                <b>{chapter.title}</b>
                <small>{done ? 'Victoire inscrite dans les archives' : locked ? 'Scellé par la Reine' : `Gardien ${chapter.opponentFaction} · IA ${chapter.aiDifficulty}`}</small>
              </div>
              {!locked && <button onClick={() => go('/combat', { state: { chapterId: chapter.id } })}>{done ? 'Rejouer' : 'Jouer'}</button>}
              {locked && <span>◌</span>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Regroupe Collection et Decks sous un seul onglet de navigation, avec des
    sous-onglets internes — remplace deux entrées de nav par une. */
function CollectionHub() {
  const location = useLocation();
  const tab = location.pathname === '/decks' ? 'decks' : 'cartes';
  return (
    <>
      <div className="subtabs">
        <Link to="/collection" className={'subtab' + (tab === 'cartes' ? ' active' : '')}>
          {t(useGame.getState().language, 'common.cards')}
        </Link>
        <Link to="/decks" className={'subtab' + (tab === 'decks' ? ' active' : '')}>
          {t(useGame.getState().language, 'common.decks')}
        </Link>
      </div>
      {tab === 'cartes' ? <Collection /> : <Decks />}
    </>
  );
}

function Collection() {
  const [query, setQuery] = useState('');
  const s = useGame();
  const visibleCards = ALL_CARDS.filter((c) => s.unlockedFactions.includes(c.faction));
  const filtered = visibleCards.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const lockedFactions = ALL_FACTIONS.filter((f) => !s.unlockedFactions.includes(f));
  const craftFoil = (card: CardDef) => {
    const count = s.inventory[card.id] ?? 0;
    if (count < FOIL_CRAFT_COST) return;
    if (window.confirm(`Détruire ${FOIL_CRAFT_COST} exemplaires de ${card.name} pour forger 1 exemplaire foil ?`)) s.craftFoil(card.id);
  };
  return (
    <section>
      <h2>Collection</h2>
      <input placeholder="Rechercher une carte…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="grid">
        {filtered.map((c) => {
          const count = s.inventory[c.id] ?? 0;
          const foilCount = s.foilInventory[c.id] ?? 0;
          // Une évolution n'est jamais tirée en booster : elle est débloquée dès que sa
          // carte de base est possédée (voir Évosphère du deck builder, même logique).
          const badge = c.evolvesFrom ? (s.owned.includes(c.evolvesFrom) ? 'Débloquée' : 'Non débloquée') : count === 0 && foilCount === 0 ? 'Non possédée' : `×${count}${foilCount ? ` · ✨×${foilCount}` : ''}`;
          const craftable = !c.evolvesFrom && count >= FOIL_CRAFT_COST;
          return (
            <div key={c.id} className={'collection-entry' + (foilCount > 0 ? ' has-foil' : '')}>
              <CardView card={c} badge={badge} disabled={!craftable} onClick={craftable ? () => craftFoil(c) : undefined} />
            </div>
          );
        })}
      </div>
      <p className="hint">
        {s.owned.length}/{visibleCards.filter((c) => c.level === 1).length} cartes de base possédées · touche une carte avec {FOIL_CRAFT_COST}+ exemplaires pour la forger en foil
      </p>
      {lockedFactions.length > 0 && <p className="hint">🔒 Les cartes {lockedFactions.join(' et ')} restent cachées tant que ces factions ne sont pas débloquées — progresse dans la campagne.</p>}
    </section>
  );
}

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
                  <small>
                    {d.faction} · {count}/{MAIN_DECK_MAX} cartes · {status}
                  </small>
                </div>
                <div className="deck-menu-actions">
                  <button className="secondary" onClick={() => onEdit(d.id)}>
                    Modifier
                  </button>
                  <button className="secondary" onClick={() => s.setActiveDeck(d.id)} disabled={s.activeDeckId === d.id}>
                    {s.activeDeckId === d.id ? 'Actif' : 'Utiliser'}
                  </button>
                  <button
                    className="secondary danger"
                    onClick={() => {
                      if (confirm(`Supprimer "${d.name}" ?`)) s.deleteDeck(d.id);
                    }}
                  >
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
          <button className="primary" onClick={confirmCreate}>
            Créer {creatingFaction}
          </button>
          <button className="secondary" onClick={() => setCreatingFaction(null)}>
            Annuler
          </button>
        </div>
      ) : (
        <div className="faction-pick compact">
          {ALL_FACTIONS.map((f) => {
            const unlocked = s.unlockedFactions.includes(f);
            return (
              <button key={f} className={'faction-button' + (unlocked ? '' : ' locked')} disabled={!unlocked} title={unlocked ? undefined : `Verrouillé — gagne ${f === 'Orc' ? UNLOCK_THIRD_FACTION_AT : UNLOCK_SECOND_FACTION_AT} chapitres de campagne`} onClick={() => startCreate(f)}>
                {unlocked ? `+ ${f}` : `🔒 ${f}`}
              </button>
            );
          })}
        </div>
      )}
      <p className="hint">
        Règles : {MAIN_DECK_MIN} à {MAIN_DECK_MAX} cartes · mélange libre des archétypes débloqués · 3 exemplaires max par carte, 1 seule Mythique · l'Évosphère (max {EVOSPHERE_MAX}) ne propose que les évolutions des unités réellement présentes dans le deck · uniquement les cartes possédées.
      </p>
    </section>
  );
}

function DeckEditor({ deckId, onBack }: { deckId: string; onBack: () => void }) {
  const s = useGame();
  const savedDeck = s.decks.find((d) => d.id === deckId);
  // Un deck garde une faction principale pour son identité visuelle, mais les cartes
  // de toutes les factions débloquées peuvent être mélangées librement.
  const pool = savedDeck ? ALL_CARDS.filter((c) => c.level === 1 && !c.assetMissing && s.unlockedFactions.includes(c.faction) && s.owned.includes(c.id)) : [];
  // Cartes d'évolution que le joueur possède réellement (la carte de base
  // dont elles évoluent fait partie de sa collection) — jamais limité aux
  // 20 emplacements de l'ancienne dérivation automatique.
  const evoPool = savedDeck ? ALL_CARDS.filter((c) => c.level === 2 && !c.assetMissing && c.evolvesFrom && savedDeck.main.includes(c.evolvesFrom) && s.owned.includes(c.evolvesFrom)) : [];
  const [customizingEvo, setCustomizingEvo] = useState(false);
  const identity = savedDeck ? archetypeIdentity(savedDeck.faction) : null;
  if (!savedDeck)
    return (
      <section>
        <h2>Deck introuvable</h2>
        <button className="secondary" onClick={onBack}>
          Retour
        </button>
      </section>
    );

  const main = savedDeck.main;
  const count = main.length;
  // Le nombre d'exemplaires jouables en deck ne dépasse jamais ce que le joueur possède
  // vraiment (voir s.inventory) — la règle des 3 exemplaires maximum reste un plafond, pas une
  // dotation gratuite.
  const maxCopiesOwned = (id: string) => Math.min(maxCopiesAllowed(id), (s.inventory[id] ?? 0) + (s.foilInventory[id] ?? 0));
  const add = (id: string) => {
    if (count >= MAIN_DECK_MAX) return;
    if (copiesInDeck(main, id) < maxCopiesOwned(id)) s.setDeckCards(deckId, [...main, id]);
  };
  const removeAt = (i: number) =>
    s.setDeckCards(
      deckId,
      main.filter((_, n) => n !== i)
    );
  const statusClass = count < MAIN_DECK_MIN ? 'warn' : count > MAIN_DECK_MAX ? 'danger' : 'ok';

  const evosphere = savedDeck.evosphere ?? [];
  const evoIsCustom = !!savedDeck.evosphere && savedDeck.evosphere.length > 0;
  const evoCount = evosphere.length;
  const addEvo = (id: string) => {
    if (evoCount >= EVOSPHERE_MAX) return;
    if (copiesInDeck(evosphere, id) < maxCopiesAllowed(id)) s.setDeckEvosphere(deckId, [...evosphere, id]);
  };
  const removeEvoAt = (i: number) =>
    s.setDeckEvosphere(
      deckId,
      evosphere.filter((_, n) => n !== i)
    );
  const resetEvo = () => s.setDeckEvosphere(deckId, []);

  return (
    <section>
      <div className="deck-editor-head">
        <button className="secondary" onClick={onBack}>
          ← Menu des decks
        </button>
        <h2>{savedDeck.name}</h2>
      </div>
      <p className={'hint deck-count ' + statusClass}>
        {count}/{MAIN_DECK_MAX} cartes ({MAIN_DECK_MIN} minimum pour jouer) · identité {savedDeck.faction} · archétypes mélangeables
      </p>
      {identity && (
        <div className="archetype-identity">
          <div>
            <small>MÉCANIQUE SIGNATURE</small>
            <b>{identity.title}</b>
            <p>{identity.summary}</p>
          </div>
          <div className="archetype-columns">
            <span>
              <strong>FORCES</strong>
              {identity.strengths.map((item) => (
                <em key={item}>+ {item}</em>
              ))}
            </span>
            <span>
              <strong>FAIBLESSES</strong>
              {identity.weaknesses.map((item) => (
                <em key={item}>− {item}</em>
              ))}
            </span>
          </div>
        </div>
      )}
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
            <CardView key={c.id} card={c} badge={`${copiesInDeck(main, c.id)}/${maxCopiesOwned(c.id)}`} disabled={copiesInDeck(main, c.id) >= maxCopiesOwned(c.id) || count >= MAIN_DECK_MAX} onClick={() => add(c.id)} />
          ))}
        </div>
      </div>

      <div className="deck-editor-evo-head">
        <h3>Évosphère {evoIsCustom ? `(${evoCount}/${EVOSPHERE_MAX})` : '(automatique)'}</h3>
        <button className="secondary" onClick={() => setCustomizingEvo((v) => !v)}>
          {customizingEvo ? 'Fermer' : 'Personnaliser'}
        </button>
      </div>
      {!customizingEvo && <p className="hint">{evoIsCustom ? `Sélection manuelle active — ${evoCount} carte(s) dans l'évosphère.` : "Se remplit automatiquement avec les évolutions de ton deck (jusqu'à 20 emplacements). Clique sur Personnaliser pour choisir toi-même."}</p>}
      {customizingEvo && (
        <>
          <p className="hint">Choisis les évolutions à mettre dans ton évosphère (max {EVOSPHERE_MAX}, 3 exemplaires max par carte).</p>
          <div className="builder">
            <div>
              <h3>Sélection</h3>
              {evosphere.length === 0 && <p className="hint">Aucune sélection — l'évosphère automatique sera utilisée tant que tu n'ajoutes rien ici.</p>}
              {evosphere.map((id, i) => {
                const c = evoPool.find((card) => card.id === id);
                return (
                  <button className="deck-row" key={i} onClick={() => removeEvoAt(i)}>
                    {c?.name ?? id} <span>×</span>
                  </button>
                );
              })}
              {evoIsCustom && (
                <button className="secondary" onClick={resetEvo}>
                  ↺ Revenir à l'automatique
                </button>
              )}
            </div>
            <div className="grid">
              {evoPool.map((c) => (
                <CardView key={c.id} card={c} badge={`${copiesInDeck(evosphere, c.id)}/${maxCopiesAllowed(c.id)}`} disabled={copiesInDeck(evosphere, c.id) >= maxCopiesAllowed(c.id) || evoCount >= EVOSPHERE_MAX} onClick={() => addEvo(c.id)} />
              ))}
            </div>
          </div>
        </>
      )}
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

type BattleFx =
  | { type: 'summon'; side: 'player' | 'enemy'; instanceId?: string }
  | {
      type: 'attack';
      side: 'player' | 'enemy';
      instanceId: string;
      dx?: number;
      dy?: number;
    }
  | { type: 'effect'; side: 'player' | 'enemy'; instanceId: string }
  | { type: 'evolution'; side: 'player' | 'enemy'; cardName: string }
  | null;
type EvoSeq = {
  instanceId: string;
  stage: 'rise' | 'flash' | 'reveal' | 'settle';
  rect: { left: number; top: number; width: number; height: number };
  beforeCard: CardDef;
  evolvedCard: CardDef;
};

/** Nombre d'activations manuelles par tour d'un effet ("à l'invocation" se déclenche seul, hors de ce compte). */
function effectMaxUses(def: CardDef): number {
  if (!def.effect || def.text.toLowerCase().includes('à l’invocation') || def.text.toLowerCase().includes('cri de guerre')) return 0;
  return def.text.toLowerCase().includes('2 fois par tour') ? 2 : 1;
}

/** Le moteur clone systématiquement l'état (JSON.parse/stringify), donc même un
    coup refusé renvoie un nouvel objet : `next === before` ne détecte jamais
    un échec. On compare le contenu pour de vrai. */
function stateChanged(before: GameState, after: GameState): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function FieldCard({ unit, isEnemy, taunted, selectable, selected, fx, onSelect, damagePulse, registerRef, hidden }: { unit: FieldUnit; isEnemy: boolean; taunted: boolean; selectable: boolean; selected: boolean; fx: BattleFx; onSelect?: (id: string) => void; damagePulse?: { key: string; amount: number }; registerRef?: (id: string, el: HTMLElement | null) => void; hidden?: boolean }) {
  const card = ALL_CARDS.find((entry) => entry.id === unit.cardId);
  if (!card) return null;
  const isSummoning = fx?.type === 'summon' && fx.side === (isEnemy ? 'enemy' : 'player') && (!fx.instanceId || fx.instanceId === unit.instanceId);
  const isAttacking = fx?.type === 'attack' && fx.instanceId === unit.instanceId;
  const isHit = !!damagePulse;
  const isEffect = fx?.type === 'effect' && fx.instanceId === unit.instanceId;
  const strikeX = isAttacking ? fx.dx ?? 0 : 0;
  const strikeY = isAttacking ? fx.dy ?? (isEnemy ? 32 : -32) : 0;
  return (
    <motion.button
      ref={(el) => registerRef?.(unit.instanceId, el)}
      layout
      initial={{ scale: 0.15, opacity: 0, rotateY: 100 }}
      animate={
        isAttacking
          ? {
              scale: [1, 1.1, 1],
              x: [0, strikeX, 0],
              y: [0, strikeY, 0],
              opacity: 1,
              rotateY: 0,
              zIndex: 40,
            }
          : isSummoning
          ? { scale: [0.35, 1.18, 1], opacity: [0, 1, 1], rotateY: [90, -8, 0] }
          : isHit
          ? {
              scale: 1,
              opacity: 1,
              rotateY: 0,
              y: 0,
              x: [0, -7, 7, -5, 5, -2, 2, 0],
            }
          : { scale: 1, opacity: 1, rotateY: 0, y: 0, x: 0, zIndex: 1 }
      }
      transition={{
        duration: isAttacking ? 0.62 : isHit ? 0.4 : 0.62,
        ease: 'easeOut',
      }}
      className={'field-card ' + card.rarity + (isEnemy && taunted && !unit.taunt ? ' not-targetable' : '') + (unit.taunt ? ' taunt' : '') + (unit.stunnedTurns > 0 ? ' stunned' : '') + (isHit ? ' hit-flash' : '') + (selected ? ' selected' : '') + (hidden ? ' evolving-hidden' : '') + (isEffect ? (isEnemy ? ' effect-active enemy-effect' : ' effect-active ally-effect') : '')}
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
      data-effect-max={effectMaxUses(card)}
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
      {card.evolvesTo && card.waitTurns && <span className={'field-card-evo' + (unit.turnsOnField >= card.waitTurns ? ' ready' : '')}>{unit.turnsOnField >= card.waitTurns ? 'ÉVO ✓' : 'ÉVO ' + unit.turnsOnField + '/' + card.waitTurns}</span>}
      <span className="field-card-atk">⚔ {unit.attack}</span>
      <span className="field-card-hp">♥ {unit.health}</span>
      <span className="field-card-tags">
        {card.flying && <em>VOL</em>}
        {card.ranged && <em>À DISTANCE</em>}
        {card.blitz && <em>BLITZ</em>}
        {card.attackDelayTurns && unit.turnsOnField < card.attackDelayTurns && <em>INERTIE {card.attackDelayTurns - unit.turnsOnField}</em>}
        {unit.taunt && <em>PROVOCATION</em>}
        {unit.stunnedTurns > 0 && <em>ÉTOURDI</em>}
      </span>
      {damagePulse && (
        <motion.span key={damagePulse.key} className="dmg-float" initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: [1, 1, 0], y: -46, scale: [0.8, 1.25, 1] }} transition={{ duration: 0.85, ease: 'easeOut' }}>
          -{damagePulse.amount}
        </motion.span>
      )}
    </motion.button>
  );
}

function Zone({ title, units, isEnemy, taunted, selectable, selectedId, fx, onSelect, support, onActivateSupport, damagePulses, registerCardRef, evolvingId, placeableField, placeableSupport, onPlaceField, onPlaceSupport }: { title: string; units: FieldUnit[]; isEnemy: boolean; taunted: boolean; selectable: boolean; selectedId?: string | null; fx: BattleFx; onSelect?: (id: string) => void; support: SupportCard[]; onActivateSupport?: (instanceId: string) => void; damagePulses: Record<string, { key: string; amount: number }>; registerCardRef?: (id: string, el: HTMLElement | null) => void; evolvingId?: string | null; placeableField?: boolean; placeableSupport?: boolean; onPlaceField?: (slot: number) => void; onPlaceSupport?: (slot: number) => void }) {
  return (
    <div className={'zone-wrap ' + (isEnemy ? 'enemy-zone' : 'player-zone')}>
      <b>{title}</b>
      <div className="board">
        {Array.from({ length: 3 }, (_, index) => {
          const unit = units.find((u) => u.slot === index);
          return unit ? (
            <FieldCard key={unit.instanceId} unit={unit} isEnemy={isEnemy} taunted={taunted} selectable={selectable} selected={selectedId === unit.instanceId} fx={fx} onSelect={onSelect} damagePulse={damagePulses[unit.instanceId]} registerRef={registerCardRef} hidden={evolvingId === unit.instanceId} />
          ) : (
            <button type="button" className={'field-slot' + (placeableField ? ' placeable' : '')} key={`slot-${index}`} disabled={!placeableField} onClick={() => onPlaceField?.(index)}>
              ◇
            </button>
          );
        })}
      </div>
      <div className="support-row" aria-label="Zone de soutien">
        {Array.from({ length: 5 }, (_, index) => {
          const item = support.find((s) => s.slot === index);
          if (!item)
            return (
              <button type="button" key={`sup-empty-${index}`} className={'support-slot' + (placeableSupport ? ' placeable' : '')} disabled={!placeableSupport} onClick={() => onPlaceSupport?.(index)}>
                ◇
              </button>
            );
          const def = getCard(item.cardId);
          return <button key={item.instanceId} className="support-card" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} disabled={isEnemy || !onActivateSupport} title={isEnemy ? 'Sort adverse posé face cachée' : `${def.name} — clique pour voir l'aperçu`} onClick={() => onActivateSupport?.(item.instanceId)} />;
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
  const arenaBgPaused = s.animationMode === 'off' || s.batterySaver;
  const routeState = location.state as {
    chapterId?: number;
    onlineMode?: 'classic' | 'ranked';
  } | null;
  const chapterId = routeState?.chapterId;
  const chapter = chapterId !== undefined ? chapterById(chapterId) : undefined;
  const onlineMode = chapter ? undefined : routeState?.onlineMode;
  const opponentFaction = chapter ? chapter.opponentFaction : rivalFactionFor(s.faction);
  const opponentAvatarImage = getCard(defaultAvatarFor(opponentFaction)).image;
  const playerAvatarCard = ALL_CARDS.find((c) => c.id === s.avatarCardId) ?? ALL_CARDS.find((c) => c.type === 'unit' && c.level === 1 && c.faction === s.faction);
  const activeDeck = s.decks.find((d) => d.id === s.activeDeckId);
  const activeDeckName = activeDeck?.name ?? s.faction;
  // Aucun serveur de matchmaking temps réel n'est branché : "en ligne" retombe sur un bot —
  // niveau aléatoire en Classique, niveau reflétant le rang du joueur en Classé (voir Multiplayer()).
  const AI_DIFFICULTIES = ['novice', 'veteran', 'maitre'] as const;
  const onlineAiDifficulty = onlineMode === 'ranked' ? aiDifficultyForRating(s.rankedRating ?? DEFAULT_RANKED_RATING) : onlineMode === 'classic' ? AI_DIFFICULTIES[Math.floor(Math.random() * AI_DIFFICULTIES.length)] : undefined;
  const aiDifficulty = chapter ? chapter.aiDifficulty : onlineAiDifficulty ?? 'novice';
  const lifeBonus = chapter ? chapter.enemyLifeBonus : 0;
  const reward = chapter ? chapter.reward : 35;
  const ratingBeforeMatch = s.rankedRating ?? DEFAULT_RANKED_RATING;
  // Filet de sécurité : même si un deck sauvegardé contenait encore une
  // carte non possédée (donnée ancienne d'avant ce correctif), elle ne
  // doit jamais atterrir dans une vraie partie.
  const customEvosphere = activeDeck?.evosphere?.filter((id) => s.owned.includes(getCard(id).evolvesFrom ?? id));
  const startMatch = () =>
    newGame(
      s.faction,
      opponentFaction,
      aiDifficulty,
      s.deck.filter((id) => s.owned.includes(id)),
      lifeBonus,
      customEvosphere && customEvosphere.length ? customEvosphere : undefined
    );
  const [match, setMatch] = useState<GameState>(startMatch);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [effectHint, setEffectHint] = useState('');
  const [inspectedUnit, setInspectedUnit] = useState<string | null>(null);
  const [unitPulses, setUnitPulses] = useState<Record<string, { key: string; amount: number }>>({});
  const [heroPulses, setHeroPulses] = useState<{
    player?: { key: string; amount: number };
    enemy?: { key: string; amount: number };
  }>({});
  const [handOpen, setHandOpen] = useState(false);
  const [phase, setPhase] = useState<'draw' | 'main' | 'battle' | 'end'>('draw');
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [drawStage, setDrawStage] = useState<'idle' | 'prompt' | 'reveal'>('prompt');
  const [pauseOpen, setPauseOpen] = useState(false);
  const [aiTurnStage, setAiTurnStage] = useState<'idle' | 'draw' | 'main' | 'battle' | 'end'>('idle');
  const [aiDrawCount, setAiDrawCount] = useState(0);
  const [effectPrompt, setEffectPrompt] = useState<string | null>(null);
  const [supportReveal, setSupportReveal] = useState<{
    cardId: string;
    name: string;
    kind: 'support' | 'unit';
  } | null>(null);
  const [evoSeq, setEvoSeq] = useState<EvoSeq | null>(null);
  const [placingCard, setPlacingCard] = useState<{
    id: string;
    type: 'unit' | 'spell';
  } | null>(null);
  const [reactionPrompt, setReactionPrompt] = useState<{
    attackerId: string;
    targetId: string | null;
  } | null>(null);
  const reactionResumeRef = useRef<((state: GameState) => void) | null>(null);
  const PHASE_ORDER: ('draw' | 'main' | 'battle' | 'end')[] = ['draw', 'main', 'battle', 'end'];
  const pulseFromDiff = (before: GameState, after: GameState) => {
    const units: Record<string, { key: string; amount: number }> = {};
    const heroes: {
      player?: { key: string; amount: number };
      enemy?: { key: string; amount: number };
    } = {};
    for (const side of ['player', 'enemy'] as const) {
      const beforeMap = new Map(before[side].field.map((u) => [u.instanceId, u]));
      const afterIds = new Set(after[side].field.map((u) => u.instanceId));
      for (const u of after[side].field) {
        if (side === 'enemy' && !beforeMap.has(u.instanceId)) {
          const id = u.instanceId;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const el = cardRefs.current[id];
              if (el) {
                const r = el.getBoundingClientRect();
                vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'summon');
              }
            })
          );
        }
        const prevUnit = beforeMap.get(u.instanceId);
        const prevHp = prevUnit?.health;
        if (side === 'enemy' && prevUnit && (u.effectUsesThisTurn ?? 0) > (prevUnit.effectUsesThisTurn ?? 0)) {
          const el = cardRefs.current[u.instanceId];
          if (el) {
            const r = el.getBoundingClientRect();
            triggerFx({ type: 'effect', side: 'enemy', instanceId: u.instanceId }, 900);
            vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'effect-enemy');
          }
        }
        if (prevHp != null && u.health < prevHp) {
          units[u.instanceId] = {
            key: `${u.instanceId}-${Date.now()}-${Math.random()}`,
            amount: prevHp - u.health,
          };
          const el = cardRefs.current[u.instanceId];
          if (el) {
            const r = el.getBoundingClientRect();
            vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'attack');
          }
        }
      }
      for (const [id, deadUnit] of beforeMap) {
        if (afterIds.has(id)) continue;
        const el = cardRefs.current[id];
        if (el) {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const def = getCard(deadUnit.cardId);
          vfxRef.current?.spawnBurst(cx, cy, 'crack');
          vfxRef.current?.spawnShatter(cx, cy, r.width, r.height, def.image);
        }
        delete cardRefs.current[id];
      }
      if (after[side].life < before[side].life) {
        heroes[side] = {
          key: `${side}-${Date.now()}`,
          amount: before[side].life - after[side].life,
        };
        const heroEl = heroRefs.current[side];
        if (heroEl) {
          const r = heroEl.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          vfxRef.current?.spawnBurst(cx, cy, 'attack');
          arenaBgRef.current?.triggerCrack(cx, cy);
          if (s.screenShake) triggerShake();
        }
      }
    }
    if (Object.keys(units).length || Object.keys(heroes).length) {
      setUnitPulses(units);
      setHeroPulses(heroes);
      window.setTimeout(() => {
        setUnitPulses({});
        setHeroPulses({});
      }, 950);
    }
  };
  const [fx, setFx] = useState<BattleFx>(null);
  const [pileOpen, setPileOpen] = useState<null | 'grave' | 'evo' | 'deck' | 'log'>(null);
  const [inspectedEnemyId, setInspectedEnemyId] = useState<string | null>(null);
  const fxTimer = useRef<number | null>(null);
  const turnTokenRef = useRef(0);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const heroRefs = useRef<{
    player: HTMLElement | null;
    enemy: HTMLElement | null;
  }>({ player: null, enemy: null });
  const attackLockRef = useRef(false);
  const vfxRef = useRef<VfxHandle>(null);
  const arenaBgRef = useRef<ArenaBackgroundHandle>(null);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<number | null>(null);
  const triggerShake = () => {
    setShake(true);
    if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShake(false), 420);
  };
  const replaySnapshots = useRef<GameState[]>([]);
  const stripForReplay = (state: GameState): GameState => ({
    ...state,
    log: [],
  });
  const updateMatch = (next: GameState) => {
    setMatch(next);
    replaySnapshots.current.push(stripForReplay(next));
  };
  useEffect(() => {
    replaySnapshots.current = [stripForReplay(match)];
  }, []);
  const [replaySaved, setReplaySaved] = useState(false);
  const registerCardRef = (id: string, el: HTMLElement | null) => {
    cardRefs.current[id] = el;
  };
  const measureStrike = (attackerSide: 'player' | 'enemy', attackerId: string, targetId: string | null) => {
    const attackerEl = cardRefs.current[attackerId];
    const targetEl = targetId ? cardRefs.current[targetId] : heroRefs.current[attackerSide === 'player' ? 'enemy' : 'player'];
    if (!attackerEl || !targetEl) return null;
    const a = attackerEl.getBoundingClientRect();
    const t = targetEl.getBoundingClientRect();
    const x1 = a.left + a.width / 2;
    const y1 = a.top + a.height / 2;
    const x2 = t.left + t.width / 2;
    const y2 = t.top + t.height / 2;
    return { dx: x2 - x1, dy: y2 - y1, x1, y1, x2, y2 };
  };
  const triggerFx = (nextFx: BattleFx, duration = 700) => {
    if (fxTimer.current) window.clearTimeout(fxTimer.current);
    setFx(nextFx);
    fxTimer.current = window.setTimeout(() => setFx(null), duration);
  };
  useEffect(
    () => () => {
      if (fxTimer.current) window.clearTimeout(fxTimer.current);
    },
    []
  );
  useEffect(() => {
    document.body.classList.add('in-battle');
    return () => document.body.classList.remove('in-battle');
  }, []);
  const playOpeningDraw = () => {
    setDrawStage('reveal');
    vfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'draw');
    window.setTimeout(() => {
      setDrawStage('idle');
      setPhase('main');
    }, 900);
  };
  // useLayoutEffect (pas useEffect) : évite tout flash visible de l'overlay "touche pour piocher"
  // avant le passage automatique en Draw Phase révélée au tout premier rendu du duel.
  useLayoutEffect(() => {
    playOpeningDraw();
  }, []);
  useEffect(() => {
    if (!match.winner || reported) return;
    const won = match.winner === 'player';
    s.record(won);
    if (won) {
      s.addGold(reward);
      s.addGems(WIN_GEMS_REWARD);
      if (chapter) s.completeChapter(chapter.id);
    }
    if (onlineMode === 'ranked') s.recordRanked(won);
    setReported(true);
  }, [match.winner, reported, reward, chapter, onlineMode, s]);
  const rankedDelta = onlineMode === 'ranked' ? rankedRatingDelta(match.winner === 'player', ratingBeforeMatch) : undefined;
  const showHint = (message: string, duration = 2000) => {
    setEffectHint(message);
    window.setTimeout(() => setEffectHint(''), duration);
  };
  const openHandCard = (id: string) => {
    if (match.activePlayer !== 'player' || match.winner) return;
    if (!handOpen) {
      setHandOpen(true);
      return;
    }
    setInspectedUnit(null);
    setPreviewCardId(id);
  };
  const confirmPlay = (id: string, slotIndex?: number) => {
    if (match.activePlayer !== 'player' || match.winner) return;
    if (phase !== 'main') {
      showHint('Passe en Main Phase pour jouer une carte.');
      setPreviewCardId(null);
      setPlacingCard(null);
      return;
    }
    const card = ALL_CARDS.find((entry) => entry.id === id);
    const before = match;
    const next = playCard(match, 'player', id, slotIndex);
    setPreviewCardId(null);
    setPlacingCard(null);
    if (!stateChanged(match, next)) return;
    updateMatch(next);
    setHandOpen(false);
    pulseFromDiff(before, next);
    if (card?.type === 'unit') {
      const newest = next.player.field[next.player.field.length - 1];
      triggerFx({ type: 'summon', side: 'player', instanceId: newest?.instanceId }, 720);
      if (newest) {
        const id = newest.instanceId;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = cardRefs.current[id];
            if (el) {
              const r = el.getBoundingClientRect();
              vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'summon');
            }
          })
        );
      }
      if (newest && effectMaxUses(card) > 0) {
        const promptId = newest.instanceId;
        window.setTimeout(() => setEffectPrompt(promptId), 760);
      }
    }
  };
  const beginPlacement = (id: string) => {
    const def = getCard(id);
    if (def.type === 'unit' && match.player.field.length >= MAX_FIELD_UNITS) {
      showHint('Ton terrain est plein.');
      setPreviewCardId(null);
      return;
    }
    if (def.type === 'spell' && match.player.support.length >= MAX_SUPPORT) {
      showHint('Ta zone de Soutien est pleine.');
      setPreviewCardId(null);
      return;
    }
    setPreviewCardId(null);
    setPlacingCard({ id, type: def.type });
    showHint(def.type === 'unit' ? 'Choisis un emplacement sur ton terrain.' : 'Choisis un emplacement dans ta zone de Soutien.', 4000);
  };
  const placeCard = (slotIndex: number) => {
    if (!placingCard) return;
    confirmPlay(placingCard.id, slotIndex);
  };
  const selectAttacker = (id: string) => {
    setHandOpen(false);
    setPreviewCardId(null);
    setInspectedEnemyId(null);
    setInspectedUnit((current) => (current === id ? null : id));
    if (match.activePlayer !== 'player' || match.winner || attackLockRef.current) return;
    if (phase !== 'battle') {
      showHint('Passe en Battle Phase pour attaquer.');
      return;
    }
    const unit = match.player.field.find((entry) => entry.instanceId === id);
    if (!unit || !unit.canAttack || unit.stunnedTurns > 0) return;
    setSelectedAttacker((current) => (current === id ? null : id));
  };
  const inspectEnemyUnit = (id: string) => {
    if (selectedAttacker && phase === 'battle' && !attackLockRef.current) {
      attackUnit(id);
      return;
    }
    setInspectedUnit(null);
    setInspectedEnemyId((current) => (current === id ? null : id));
  };
  const resolveStrike = (attackerId: string, targetId: string | null) => {
    const measured = measureStrike('player', attackerId, targetId);
    const { dx, dy } = measured ?? { dx: 0, dy: 0 };
    attackLockRef.current = true;
    triggerFx({ type: 'attack', side: 'player', instanceId: attackerId, dx, dy }, 640);
    if (measured) {
      const attackerUnit = match.player.field.find((entry) => entry.instanceId === attackerId);
      const def = attackerUnit && getCard(attackerUnit.cardId);
      const tone = dashToneFor(def?.faction ?? 'Chevalier');
      vfxRef.current?.spawnDashTrail(measured.x1, measured.y1, measured.x2, measured.y2, 0.3, tone);
    }
    window.setTimeout(() => {
      const before = match;
      const next = declareAttack(before, 'player', attackerId, targetId);
      updateMatch(next);
      pulseFromDiff(before, next);
      attackLockRef.current = false;
    }, 300);
  };
  const attackUnit = (targetId: string) => {
    setHandOpen(false);
    setPreviewCardId(null);
    if (!selectedAttacker || phase !== 'battle' || attackLockRef.current) return;
    resolveStrike(selectedAttacker, targetId);
    setSelectedAttacker(null);
    setInspectedEnemyId(null);
  };
  const attackHero = () => {
    setHandOpen(false);
    setPreviewCardId(null);
    if (!selectedAttacker || phase !== 'battle' || attackLockRef.current) return;
    resolveStrike(selectedAttacker, null);
    setSelectedAttacker(null);
  };
  const evolve = (instanceId: string) => {
    setHandOpen(false);
    setPreviewCardId(null);
    setInspectedUnit(null);
    if (phase !== 'main') {
      showHint('Passe en Main Phase pour évoluer une créature.');
      return;
    }
    const beforeUnit = match.player.field.find((entry) => entry.instanceId === instanceId);
    if (!beforeUnit) return;
    const beforeCard = ALL_CARDS.find((entry) => entry.id === beforeUnit.cardId);
    const evolvedCard = beforeCard?.evolvesTo ? ALL_CARDS.find((entry) => entry.id === beforeCard.evolvesTo) : undefined;
    const next = evolveUnit(match, 'player', instanceId);
    if (!stateChanged(match, next) || !beforeCard || !evolvedCard) return;
    const el = cardRefs.current[instanceId];
    const rect = el?.getBoundingClientRect();
    if (!rect) {
      updateMatch(next);
      triggerFx({ type: 'evolution', side: 'player', cardName: evolvedCard.name }, 1000);
      return;
    }
    setEvoSeq({
      instanceId,
      stage: 'rise',
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      beforeCard,
      evolvedCard,
    });
    window.setTimeout(() => setEvoSeq((seq) => (seq ? { ...seq, stage: 'flash' } : seq)), 650);
    window.setTimeout(() => {
      updateMatch(next);
      vfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'evolution');
      if (s.screenShake) triggerShake();
      setEvoSeq((seq) => (seq ? { ...seq, stage: 'reveal' } : seq));
    }, 900);
    window.setTimeout(() => setEvoSeq((seq) => (seq ? { ...seq, stage: 'settle' } : seq)), 1550);
    window.setTimeout(() => {
      const r = cardRefs.current[instanceId]?.getBoundingClientRect();
      if (r) vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'evolution');
      if (s.screenShake) triggerShake();
    }, 2000);
    window.setTimeout(() => setEvoSeq(null), 2150);
  };
  const activateEffect = (instanceId: string) => {
    setHandOpen(false);
    setPreviewCardId(null);
    if (phase !== 'main') {
      showHint('Passe en Main Phase pour activer un effet.');
      return;
    }
    const before = match;
    const unit = before.player.field.find((entry) => entry.instanceId === instanceId);
    if (!unit) return;
    const card = ALL_CARDS.find((entry) => entry.id === unit.cardId);
    const next = activateUnitEffect(before, 'player', instanceId);
    if (!stateChanged(before, next)) {
      showHint('Cet effet ne peut pas être activé maintenant.');
      return;
    }
    updateMatch(next);
    pulseFromDiff(before, next);
    triggerFx({ type: 'effect', side: 'player', instanceId }, 900);
    if (card) {
      setSupportReveal({ cardId: card.id, name: card.name, kind: 'unit' });
      window.setTimeout(() => setSupportReveal((current) => (current?.cardId === card.id ? null : current)), 1050);
    }
    const effectEl = cardRefs.current[instanceId];
    if (effectEl) {
      const r = effectEl.getBoundingClientRect();
      vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'effect-ally');
    }
    showHint(card ? `Effet de ${card.name} activé !` : 'Effet activé !');
  };
  const [supportPreview, setSupportPreview] = useState<string | null>(null);
  const openSupportPreview = (instanceId: string) => {
    setHandOpen(false);
    setPreviewCardId(null);
    setSupportPreview(instanceId);
  };
  const activateSupport = (instanceId: string) => {
    setHandOpen(false);
    setPreviewCardId(null);
    if (phase !== 'main') {
      showHint('Passe en Main Phase pour activer un soutien.');
      return;
    }
    const before = match;
    const item = before.player.support.find((entry) => entry.instanceId === instanceId);
    if (!item) return;
    const card = getCard(item.cardId);
    const next = activateSupportCard(before, 'player', instanceId);
    if (!stateChanged(before, next)) {
      showHint(`${card.name} ne peut pas être activé maintenant.`);
      return;
    }
    setSupportReveal({ cardId: card.id, name: card.name, kind: 'support' });
    window.setTimeout(() => {
      updateMatch(next);
      pulseFromDiff(before, next);
      const newest = next.player.field[next.player.field.length - 1];
      if (next.player.field.length > before.player.field.length) {
        triggerFx({ type: 'summon', side: 'player', instanceId: newest?.instanceId }, 720);
        if (newest) {
          const newestId = newest.instanceId;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const el = cardRefs.current[newestId];
              if (el) {
                const r = el.getBoundingClientRect();
                vfxRef.current?.spawnBurst(r.left + r.width / 2, r.top + r.height / 2, 'summon');
              }
            })
          );
        }
      }
      setSupportReveal(null);
      showHint(`${card.name} activé !`);
    }, 1050);
  };
  const runAiAttackStep = (token: number, state: GameState, plan: ReturnType<typeof aiPrepareBattlePlan>, index: number, onDone: (finalState: GameState) => void) => {
    if (turnTokenRef.current !== token) return;
    if (index >= plan.attackerIds.length || state.winner) {
      onDone(state);
      return;
    }
    const attackerId = plan.attackerIds[index];
    const step = aiResolveOneAttack(state, attackerId, plan.lethal, plan.keepBackId);
    if (step.skipped) {
      runAiAttackStep(token, state, plan, index + 1, onDone);
      return;
    }
    if (step.pendingReaction && step.state.reactionWindow) {
      updateMatch(step.state);
      setReactionPrompt({ attackerId, targetId: step.targetId });
      reactionResumeRef.current = (reactedState: GameState) => {
        if (turnTokenRef.current !== token) return;
        const beforeAttack = reactedState;
        const afterAttack = declareAttack(reactedState, 'enemy', attackerId, step.targetId);
        updateMatch(afterAttack);
        pulseFromDiff(beforeAttack, afterAttack);
        setReactionPrompt(null);
        reactionResumeRef.current = null;
        window.setTimeout(() => runAiAttackStep(token, afterAttack, plan, index + 1, onDone), 280);
      };
      return;
    }
    const measured = measureStrike('enemy', attackerId, step.targetId);
    if (measured) {
      triggerFx(
        {
          type: 'attack',
          side: 'enemy',
          instanceId: attackerId,
          dx: measured.dx,
          dy: measured.dy,
        },
        640
      );
      const attackerUnit = state.enemy.field.find((entry) => entry.instanceId === attackerId);
      const attackerDef = attackerUnit && getCard(attackerUnit.cardId);
      const tone = dashToneFor(attackerDef?.faction ?? 'Chevalier');
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
  const resolveReaction = (supportInstanceId?: string) => {
    if (!reactionPrompt || !match.reactionWindow) return;
    const before = match;
    const next = supportInstanceId ? activateSupportCard(match, 'player', supportInstanceId) : passReactionWindow(match, 'player');
    if (supportInstanceId && next.reactionWindow) {
      showHint('Ce Sortilège ne peut pas être activé dans cette fenêtre.');
      return;
    }
    updateMatch(next);
    pulseFromDiff(before, next);
    if (supportInstanceId) {
      const support = before.player.support.find((item) => item.instanceId === supportInstanceId);
      if (support) {
        const def = getCard(support.cardId);
        setSupportReveal({ cardId: def.id, name: def.name, kind: 'support' });
        window.setTimeout(() => setSupportReveal(null), 1050);
      }
    }
    const resume = reactionResumeRef.current;
    window.setTimeout(() => resume?.(next), supportInstanceId ? 500 : 100);
  };
  const nextTurn = () => {
    setHandOpen(false);
    setPreviewCardId(null);
    if (match.activePlayer !== 'player' || match.winner) return;
    setSelectedAttacker(null);
    setPhase('draw');
    triggerFx(null);
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
  const confirmDraw = () => {
    setDrawStage('reveal');
    vfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'draw');
    window.setTimeout(() => {
      setDrawStage('idle');
      setPhase('main');
    }, 900);
  };
  const goToPhase = (target: 'draw' | 'main' | 'battle' | 'end') => {
    if (match.activePlayer !== 'player' || match.winner) return;
    if (PHASE_ORDER.indexOf(target) < PHASE_ORDER.indexOf(phase)) return;
    if (target === 'end') {
      nextTurn();
      return;
    }
    setPhase(target);
  };
  const restart = () => {
    turnTokenRef.current++;
    attackLockRef.current = false;
    const fresh = startMatch();
    setMatch(fresh);
    replaySnapshots.current = [stripForReplay(fresh)];
    setReplaySaved(false);
    setReported(false);
    setSelectedAttacker(null);
    setEffectHint('');
    setInspectedUnit(null);
    setUnitPulses({});
    setHeroPulses({});
    setHandOpen(false);
    setPreviewCardId(null);
    setPhase('draw');
    setDrawStage('prompt');
    setPauseOpen(false);
    setAiTurnStage('idle');
    setAiDrawCount(0);
    setEffectPrompt(null);
    setSupportReveal(null);
    setSupportPreview(null);
    setReactionPrompt(null);
    reactionResumeRef.current = null;
    setEvoSeq(null);
    setInspectedEnemyId(null);
    setPileOpen(null);
    playOpeningDraw();
  };
  const forfeitMatch = () => {
    if (!window.confirm('Abandonner cette partie ? Elle comptera comme une défaite.')) return;
    if (!match.winner) s.record(false);
    go('/');
  };
  const saveReplay = () => {
    if (!match.winner || replaySaved) return;
    s.saveReplay({
      playerFaction: s.faction,
      opponentFaction,
      result: match.winner === 'player' ? 'win' : 'loss',
      turns: match.turn,
      label: chapter ? chapter.title : `Duel rapide vs ${opponentFaction}`,
      snapshots: replaySnapshots.current,
    });
    setReplaySaved(true);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setInspectedUnit(null);
      setSelectedAttacker(null);
      setPreviewCardId(null);
      setEffectPrompt(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const selectedAttackerUnit = selectedAttacker ? match.player.field.find((unit) => unit.instanceId === selectedAttacker) : undefined;
  const selectedAttackerDef = selectedAttackerUnit ? getCard(selectedAttackerUnit.cardId) : undefined;
  const enemyHasTaunt = match.enemy.field.some((unit) => unit.taunt && unit.stunnedTurns === 0 && (!selectedAttackerDef || canFightTarget(selectedAttackerDef, getCard(unit.cardId))));
  const activePlayerUnit = inspectedUnit ? match.player.field.find((unit) => unit.instanceId === inspectedUnit) : undefined;
  const canAttackFaceNow = !!selectedAttacker && !enemyHasTaunt && phase === 'battle' && !attackLockRef.current;
  const pileCards: CardDef[] = pileOpen === 'grave' ? match.player.graveyard.map((id: string) => getCard(id)) : pileOpen === 'evo' ? match.player.evosphere.map((id: string) => getCard(id)) : pileOpen === 'deck' ? match.player.deck.map((id: string) => getCard(id)) : [];
  const displayPhase = aiTurnStage !== 'idle' ? aiTurnStage : phase;
  const drawnCardId = drawStage !== 'idle' ? match.player.hand[match.player.hand.length - 1] : undefined;
  const visibleHand = drawStage !== 'idle' ? match.player.hand.slice(0, -1) : match.player.hand;
  return (
    <section
      className={'battle' + (shake ? ' battle-shake' : '')}
      onClick={(event) => {
        if (handOpen && !(event.target as HTMLElement).closest('.hand')) setHandOpen(false);
        if (placingCard && !(event.target as HTMLElement).closest('.board, .support-row')) setPlacingCard(null);
      }}
    >
      <ArenaBackground ref={arenaBgRef} terrain={s.selectedTerrain} className="battle-bg-video" paused={arenaBgPaused} />
      <VfxLayer ref={vfxRef} active={!arenaBgPaused} />
      <button className="battle-pause-btn" type="button" aria-label="Menu de la partie" onClick={() => setPauseOpen(true)}>
        ☰
      </button>
      {aiTurnStage !== 'idle' && <div className="ai-turn-lock" aria-hidden="true" />}
      <div
        className="profile-float enemy"
        ref={(el) => {
          heroRefs.current.enemy = el;
        }}
      >
        <div className="duel-profile">
          <span className="duel-profile-avatar">
            <img
              src={opponentAvatarImage}
              alt={opponentFaction}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = cardBack;
              }}
            />
          </span>
          <div className="duel-profile-text">
            <b>{chapter ? chapter.title : onlineMode === 'ranked' ? 'Bot classé' : onlineMode === 'classic' ? 'Bot en ligne' : 'Rival Nexus'}</b>
            <small>
              {opponentFaction}
              {onlineMode ? ` · IA ${match.aiDifficulty === 'maitre' ? 'Maître' : match.aiDifficulty === 'veteran' ? 'Vétéran' : 'Novice'}` : ''}
            </small>
          </div>
        </div>
        <button type="button" className={'life' + (canAttackFaceNow ? ' life-attackable' : '')} disabled={!canAttackFaceNow} title={canAttackFaceNow ? 'Attaquer directement' : undefined} onClick={attackHero}>
          ♥ {match.enemy.life}
        </button>
        <RuneMeter mana={match.enemy.mana} maxMana={match.enemy.maxMana} enemy />
        {heroPulses.enemy && (
          <motion.span key={heroPulses.enemy.key} className="hero-dmg" initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], y: -38, scale: [0.6, 1.3, 1, 1] }} transition={{ duration: 0.95, ease: 'easeOut' }}>
            -{heroPulses.enemy.amount}
          </motion.span>
        )}
      </div>
      <div className={'enemy-hand-row' + (aiTurnStage === 'draw' ? ' drawing' : '')} aria-label={`Main de l'adversaire : ${match.enemy.hand.length} cartes`}>
        <div className="enemy-hand-inner">
          {Array.from({ length: match.enemy.hand.length }, (_, i) => {
            const isDrawn = aiTurnStage === 'draw' && i >= match.enemy.hand.length - aiDrawCount;
            return <motion.span key={i} className={'enemy-hand-card' + (isDrawn ? ' drawn-in' : '')} style={{ backgroundImage: `url(${CARD_BACK_URL})` }} initial={isDrawn ? { opacity: 0, y: -70, scale: 0.4, rotate: -14 } : false} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} />;
          })}
        </div>
      </div>
      <div className="battle-main">
        <div className="pile-rail left">
          <button
            className="card-pile grave"
            onClick={() => {
              setHandOpen(false);
              setPreviewCardId(null);
              setPileOpen('grave');
            }}
          >
            <span className="pile-stack" />
            <span className="pile-icon">☠</span>
            <b>FOSSE</b>
            <em>{match.player.graveyard.length}</em>
          </button>
          <button
            className="card-pile log"
            onClick={() => {
              setHandOpen(false);
              setPreviewCardId(null);
              setPileOpen('log');
            }}
          >
            <span className="pile-stack" />
            <span className="pile-icon">📜</span>
            <b>JOURNAL</b>
            <em>{match.log.length}</em>
          </button>
        </div>
        <div className="battle-center">
          <Zone title="ADVERSAIRE" units={match.enemy.field} isEnemy taunted={enemyHasTaunt} selectable onSelect={inspectEnemyUnit} selectedId={inspectedEnemyId} fx={fx} support={match.enemy.support} damagePulses={unitPulses} registerCardRef={registerCardRef} />
          <div className={'turn-strip' + (aiTurnStage !== 'idle' ? ' ai-turn' : '')}>
            <b>{aiTurnStage === 'draw' ? "L'ADVERSAIRE PIOCHE…" : aiTurnStage !== 'idle' || match.activePlayer !== 'player' ? "TOUR DE L'ADVERSAIRE" : 'À TOI DE JOUER'}</b>
            <span>Tour {match.turn}</span>
            <div className="nexus-phases">
              {PHASE_ORDER.map((p) => (
                <button key={p} type="button" className={(displayPhase === p ? 'active' : '') + (PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(displayPhase) ? ' passed' : '')} disabled={aiTurnStage !== 'idle' || PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(phase) || match.activePlayer !== 'player' || !!match.winner} onClick={() => goToPhase(p)}>
                  {p === 'draw' ? 'DRAW' : p === 'main' ? 'MAIN' : p === 'battle' ? 'BATTLE' : 'END'}
                </button>
              ))}
            </div>
            {selectedAttacker && (
              <button className="attack-face" disabled={enemyHasTaunt} onClick={attackHero}>
                Attaquer directement
              </button>
            )}
          </div>
          <Zone title="TON TERRAIN" units={match.player.field} isEnemy={false} taunted={false} selectable={match.activePlayer === 'player'} selectedId={selectedAttacker} fx={fx} onSelect={selectAttacker} support={match.player.support} onActivateSupport={openSupportPreview} damagePulses={unitPulses} registerCardRef={registerCardRef} evolvingId={evoSeq?.instanceId} placeableField={placingCard?.type === 'unit'} placeableSupport={placingCard?.type === 'spell'} onPlaceField={placeCard} onPlaceSupport={placeCard} />
        </div>
        <div className="pile-rail right">
          <button
            className="card-pile evo"
            onClick={() => {
              setHandOpen(false);
              setPreviewCardId(null);
              setPileOpen('evo');
            }}
          >
            <span className="pile-stack" />
            <span className="pile-icon">✦</span>
            <b>ÉVOSPHÈRE</b>
            <em>{match.player.evosphere.length}</em>
          </button>
          <button
            className="card-pile deck"
            type="button"
            onClick={() => {
              setHandOpen(false);
              setPreviewCardId(null);
              setPileOpen('deck');
            }}
          >
            <span className="pile-stack" />
            <span className="pile-icon">▣</span>
            <b>DECK</b>
            <em>{match.player.deck.length}</em>
          </button>
        </div>
      </div>
      <div className="profile-float player">
        <div className="duel-profile">
          <span className="duel-profile-avatar">
            {playerAvatarCard ? (
              <img
                src={playerAvatarCard.image}
                alt={playerAvatarCard.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = cardBack;
                }}
              />
            ) : (
              <b>✦</b>
            )}
          </span>
          <div className="duel-profile-text">
            <b>{s.playerName}</b>
            <small>{activeDeckName}</small>
          </div>
        </div>
        <span className="life">♥ {match.player.life}</span>
        <RuneMeter mana={match.player.mana} maxMana={match.player.maxMana} />
        {heroPulses.player && (
          <motion.span key={heroPulses.player.key} className="hero-dmg" initial={{ opacity: 0, y: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 1, 0], y: -38, scale: [0.6, 1.3, 1, 1] }} transition={{ duration: 0.95, ease: 'easeOut' }}>
            -{heroPulses.player.amount}
          </motion.span>
        )}
      </div>
      <div className={'hand' + (handOpen ? ' open' : '')} onClick={(event) => event.stopPropagation()}>
        {visibleHand.map((id: string, index: number) => {
          const card = getCard(id);
          return (
            <div key={`${id}-${index}`} className={'hand-card-wrap ' + (card.type === 'spell' || card.cost <= match.player.mana ? 'affordable' : 'unaffordable')}>
              <CardView card={card} fullArt disabled={match.activePlayer !== 'player' || !!match.winner} onClick={() => openHandCard(id)} />
            </div>
          );
        })}
      </div>
      <div className="battle-footer">
        <span className="hud-pill turn-readout">Tour {match.turn}</span>
      </div>
      {fx?.type === 'evolution' && (
        <div className="evolution-flash">
          <span>ÉVOLUTION</span>
          <b>{fx.cardName}</b>
        </div>
      )}
      {evoSeq &&
        (() => {
          const { stage, rect, beforeCard, evolvedCard } = evoSeq;
          const aspect = rect.width / rect.height;
          const bigH = Math.min(window.innerHeight * 0.56, 460);
          const bigW = bigH * aspect;
          const centerX = window.innerWidth / 2;
          const centerY = window.innerHeight / 2;
          const target =
            stage === 'settle'
              ? {
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                }
              : {
                  left: centerX - bigW / 2,
                  top: centerY - bigH / 2,
                  width: bigW,
                  height: bigH,
                };
          const showEvolved = stage === 'reveal' || stage === 'settle';
          const cardOpacity = stage === 'flash' ? 0 : 1;
          const haloOpacity = stage === 'rise' ? 0.85 : stage === 'flash' ? 1 : stage === 'reveal' ? 0.5 : 0;
          const haloScale = stage === 'rise' ? 1.5 : stage === 'flash' ? 2.3 : stage === 'reveal' ? 1.9 : 0.6;
          return (
            <div className="evo-seq-overlay" aria-hidden="true">
              <motion.div className="evo-seq-halo" style={{ left: centerX, top: centerY }} animate={{ opacity: haloOpacity, scale: haloScale }} transition={{ duration: 0.55, ease: 'easeOut' }} />
              <motion.img
                className="evo-seq-card"
                src={showEvolved ? evolvedCard.image : beforeCard.image}
                alt={showEvolved ? evolvedCard.name : beforeCard.name}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = cardBack;
                }}
                initial={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  opacity: 1,
                }}
                animate={{
                  left: target.left,
                  top: target.top,
                  width: target.width,
                  height: target.height,
                  opacity: cardOpacity,
                }}
                transition={{
                  left: {
                    duration: stage === 'settle' ? 0.5 : 0.6,
                    ease: 'easeInOut',
                  },
                  top: {
                    duration: stage === 'settle' ? 0.5 : 0.6,
                    ease: 'easeInOut',
                  },
                  width: {
                    duration: stage === 'settle' ? 0.5 : 0.6,
                    ease: 'easeInOut',
                  },
                  height: {
                    duration: stage === 'settle' ? 0.5 : 0.6,
                    ease: 'easeInOut',
                  },
                  opacity: { duration: stage === 'reveal' ? 0.15 : 0.25 },
                }}
              />
              {stage === 'flash' && <motion.div className="evo-seq-whiteout" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5 }} />}
              {stage === 'reveal' && (
                <motion.b className="evo-seq-label" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
                  {evolvedCard.name}
                </motion.b>
              )}
            </div>
          );
        })()}
      {pileOpen && (
        <div className="pile-modal" role="dialog" aria-modal="true" onClick={() => setPileOpen(null)}>
          <div className="pile-modal-content" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>{pileOpen === 'grave' ? 'Fosse' : pileOpen === 'evo' ? 'Évosphère' : pileOpen === 'deck' ? 'Deck' : 'Journal du duel'}</h3>
              <button onClick={() => setPileOpen(null)}>×</button>
            </header>
            {pileOpen === 'log' ? <ul className="duel-log">{match.log.length ? [...match.log].reverse().map((entry, i) => <li key={i}>{entry}</li>) : <p className="hint">Aucun événement pour l'instant.</p>}</ul> : <div className="pile-grid">{pileCards.length ? pileCards.map((card: CardDef, i: number) => <CardView key={`${card.id}-${i}`} card={card} />) : <p className="hint">Aucune carte.</p>}</div>}
          </div>
        </div>
      )}
      {inspectedEnemyId &&
        (() => {
          const unit = match.enemy.field.find((entry) => entry.instanceId === inspectedEnemyId);
          if (!unit) return null;
          const def = getCard(unit.cardId);
          return (
            <div className="hand-preview-overlay" role="dialog" aria-modal="true" onClick={() => setInspectedEnemyId(null)}>
              <div className="hand-preview" onClick={(e) => e.stopPropagation()}>
                <button className="hand-preview-close" type="button" aria-label="Fermer l'aperçu" onClick={() => setInspectedEnemyId(null)}>
                  ✕
                </button>
                <img
                  className="hand-preview-art"
                  src={def.image}
                  alt={def.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = cardBack;
                  }}
                />
                <div className="hand-preview-body">
                  <b>{def.name}</b>
                  <div className="hand-preview-stats">
                    <span>⚔ {unit.attack}</span>
                    <span>♥ {unit.health}</span>
                    {unit.taunt && <span>PROVOCATION</span>}
                    {unit.stunnedTurns > 0 && <span>ÉTOURDI ({unit.stunnedTurns})</span>}
                  </div>
                  <p>{def.text || "Cette carte n'a pas d'effet."}</p>
                  <EvolutionInfo card={def} turnsOnField={unit.turnsOnField} />
                  <div className="hand-preview-actions">
                    <button className="secondary" onClick={() => setInspectedEnemyId(null)}>
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      {previewCardId &&
        (() => {
          const def = getCard(previewCardId);
          const isSpell = def.type === 'spell';
          const affordable = isSpell || def.cost <= match.player.mana;
          return (
            <div className="hand-preview-overlay" role="dialog" aria-modal="true" onClick={() => setPreviewCardId(null)}>
              <div className="hand-preview" onClick={(e) => e.stopPropagation()}>
                <button className="hand-preview-close" type="button" aria-label="Fermer l'aperçu" onClick={() => setPreviewCardId(null)}>
                  ✕
                </button>
                <img
                  className="hand-preview-art"
                  src={def.image}
                  alt={def.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = cardBack;
                  }}
                />
                <div className="hand-preview-body">
                  <b>{def.name}</b>
                  <div className="hand-preview-stats">
                    <span className="mana-cost-label">
                      <CurrencyIcon kind="mana" /> {def.cost}
                      {isSpell ? ' à l’activation' : ''}
                    </span>
                    {def.type === 'unit' && <span>⚔ {def.attack}</span>}
                    {def.type === 'unit' && <span>♥ {def.health}</span>}
                  </div>
                  <p>{def.text || "Cette carte n'a pas d'effet."}</p>
                  {def.type === 'unit' && <EvolutionInfo card={def} />}
                  {isSpell && <small className="hand-preview-warn spell">Se pose gratuitement face cachée — le coût en runes n'est payé qu'à l'activation.</small>}
                  <div className="hand-preview-actions">
                    <button className="secondary" onClick={() => setPreviewCardId(null)}>
                      Annuler
                    </button>
                    <button className="primary" disabled={!affordable || phase !== 'main'} onClick={() => beginPlacement(previewCardId)}>
                      {def.type === 'unit' ? 'INVOQUER' : 'POSER FACE CACHÉE'}
                    </button>
                  </div>
                  {!affordable && <small className="hand-preview-warn">Mana insuffisant.</small>}
                  {affordable && phase !== 'main' && <small className="hand-preview-warn">Passe en Main Phase pour jouer une carte.</small>}
                </div>
              </div>
            </div>
          );
        })()}
      {effectPrompt &&
        (() => {
          const unit = match.player.field.find((entry) => entry.instanceId === effectPrompt);
          if (!unit) return null;
          const def = getCard(unit.cardId);
          return (
            <div className="effect-prompt-overlay" role="dialog" aria-modal="true" onClick={() => setEffectPrompt(null)}>
              <div className="effect-prompt" onClick={(e) => e.stopPropagation()}>
                <img
                  className="effect-prompt-art"
                  src={def.image}
                  alt={def.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = cardBack;
                  }}
                />
                <b>{def.name}</b>
                <p className="effect-prompt-question">Activer son effet tout de suite ?</p>
                <p className="effect-prompt-text">{def.text}</p>
                <div className="effect-prompt-actions">
                  <button className="secondary" onClick={() => setEffectPrompt(null)}>
                    Plus tard
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      activateEffect(effectPrompt);
                      setEffectPrompt(null);
                    }}
                  >
                    Activer
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      {supportPreview &&
        (() => {
          const item = match.player.support.find((entry) => entry.instanceId === supportPreview);
          if (!item) return null;
          const def = getCard(item.cardId);
          const affordable = def.cost <= match.player.mana;
          return (
            <div className="hand-preview-overlay" role="dialog" aria-modal="true" onClick={() => setSupportPreview(null)}>
              <div className="hand-preview" onClick={(e) => e.stopPropagation()}>
                <button className="hand-preview-close" type="button" aria-label="Fermer l'aperçu" onClick={() => setSupportPreview(null)}>
                  ✕
                </button>
                <img
                  className="hand-preview-art"
                  src={def.image}
                  alt={def.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = cardBack;
                  }}
                />
                <div className="hand-preview-body">
                  <b>{def.name}</b>
                  <div className="hand-preview-stats">
                    <span className="mana-cost-label">
                      <CurrencyIcon kind="mana" /> {def.cost} à l’activation
                    </span>
                  </div>
                  <p>{def.text || "Cette carte n'a pas d'effet."}</p>
                  <div className="hand-preview-actions">
                    <button className="secondary" onClick={() => setSupportPreview(null)}>
                      Annuler
                    </button>
                    <button
                      className="primary"
                      disabled={!affordable || phase !== 'main'}
                      onClick={() => {
                        setSupportPreview(null);
                        activateSupport(item.instanceId);
                      }}
                    >
                      Activer
                    </button>
                  </div>
                  {!affordable && <small className="hand-preview-warn">Mana insuffisant.</small>}
                  {affordable && phase !== 'main' && <small className="hand-preview-warn">Passe en Main Phase pour activer un soutien.</small>}
                </div>
              </div>
            </div>
          );
        })()}
      {reactionPrompt &&
        match.reactionWindow &&
        (() => {
          const ids = availableReactionSupportIds(match, 'player', match.reactionWindow.trigger);
          const attacker = match.enemy.field.find((u) => u.instanceId === reactionPrompt.attackerId);
          const attackerDef = attacker ? getCard(attacker.cardId) : undefined;
          return (
            <div className="reaction-window" role="dialog" aria-modal="true">
              <div className="reaction-window-head">
                <span>⚡ RÉPONSE</span>
                <b>{attackerDef ? `${attackerDef.name} attaque` : 'Action adverse'}</b>
                <small>Active un Sortilège ou laisse l'action se résoudre.</small>
              </div>
              <div className="reaction-window-cards">
                {ids.map((id) => {
                  const support = match.player.support.find((s) => s.instanceId === id);
                  if (!support) return null;
                  const def = getCard(support.cardId);
                  return (
                    <button key={id} onClick={() => resolveReaction(id)}>
                      <img src={def.image} alt={def.name} />
                      <span>
                        <b>{def.name}</b>
                        <small>{def.text}</small>
                        <em className="mana-cost-label">
                          <CurrencyIcon kind="mana" /> {def.cost}
                        </em>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button className="secondary reaction-pass" onClick={() => resolveReaction()}>
                PASSER
              </button>
            </div>
          );
        })()}
      {supportReveal &&
        (() => {
          const def = getCard(supportReveal.cardId);
          return (
            <div className={`support-reveal-overlay activation-${supportReveal.kind}`} aria-hidden="true">
              <div className="activation-rings">
                <i />
                <i />
                <i />
              </div>
              <div className="activation-flash" />
              <motion.div className="support-reveal-card" initial={{ rotateY: 180, scale: 0.35, opacity: 0 }} animate={{ rotateY: 0, scale: [0.35, 1.08, 1], opacity: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }}>
                <img
                  src={def.image}
                  alt={def.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = cardBack;
                  }}
                />
                <span className="activation-scan" />
              </motion.div>
              <motion.div className="support-reveal-label" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.35 }}>
                <small>{supportReveal.kind === 'unit' ? "POUVOIR D'UNITÉ" : 'SORTILÈGE DU NEXUS'}</small>
                <b>{def.name.toUpperCase()}</b>
              </motion.div>
            </div>
          );
        })()}
      {activePlayerUnit &&
        (() => {
          const def = getCard(activePlayerUnit.cardId);
          const canEvolve = !!def.evolvesTo && !!def.waitTurns && activePlayerUnit.turnsOnField >= def.waitTurns;
          const maxUses = effectMaxUses(def);
          return (
            <div className="hand-preview-overlay" role="dialog" aria-modal="true" onClick={() => setInspectedUnit(null)}>
              <div className="hand-preview" onClick={(e) => e.stopPropagation()}>
                <button className="hand-preview-close" type="button" aria-label="Fermer l'aperçu" onClick={() => setInspectedUnit(null)}>
                  ✕
                </button>
                <img
                  className="hand-preview-art"
                  src={def.image}
                  alt={def.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = cardBack;
                  }}
                />
                <div className="hand-preview-body">
                  <b>{def.name}</b>
                  <div className="hand-preview-stats">
                    <span>⚔ {activePlayerUnit.attack}</span>
                    <span>♥ {activePlayerUnit.health}</span>
                  </div>
                  <p>{def.text || "Cette carte n'a pas d'effet."}</p>
                  <EvolutionInfo card={def} turnsOnField={activePlayerUnit.turnsOnField} />
                  {(maxUses > 0 || canEvolve) && (
                    <div className="hand-preview-actions">
                      {maxUses > 0 && (
                        <button className="secondary" onClick={() => activateEffect(activePlayerUnit.instanceId)}>
                          Activer l'effet ({activePlayerUnit.effectUsesThisTurn ?? 0}/{maxUses})
                        </button>
                      )}
                      {canEvolve && (
                        <button className="primary" onClick={() => evolve(activePlayerUnit.instanceId)}>
                          ÉVOLUER
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      {drawStage === 'prompt' && (
        <div className="draw-pile-overlay" role="dialog" aria-modal="true">
          <button className="draw-pile" onClick={confirmDraw}>
            <span className="draw-pile-stack" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} />
            <b>Nouvelle carte</b>
            <small>TOUCHE POUR PIOCHER</small>
          </button>
        </div>
      )}
      {drawStage === 'reveal' && drawnCardId && (
        <div className="draw-reveal-overlay">
          <motion.img
            className="draw-reveal-card"
            src={getCard(drawnCardId).image}
            alt={getCard(drawnCardId).name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = cardBack;
            }}
            initial={{ rotateY: 180, scale: 0.6, opacity: 0 }}
            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        </div>
      )}
      {effectHint && <div className="effect-hint">💡 {effectHint}</div>}
      {match.winner && (
        <div className="match-result">
          <p className={match.winner === 'player' ? 'win' : 'loss'}>
            {match.winner === 'player' ? (
              <span className="victory-rewards">
                Victoire ! <CurrencyAmount kind="coin" amount={reward} />
                <CurrencyAmount kind="gem" amount={WIN_GEMS_REWARD} />
              </span>
            ) : (
              'Défaite — retente ta chance.'
            )}
            {rankedDelta !== undefined && (
              <>
                <br />
                <span className="match-result-ranked">{rankedDelta >= 0 ? `+${rankedDelta}` : rankedDelta} points classés</span>
              </>
            )}
          </p>
          <div className="match-result-actions">
            <button className="primary" onClick={() => go(chapter ? '/campagne' : '/')}>
              {chapter ? 'Retour à la campagne' : 'Retour au menu'}
            </button>
            <button className="secondary" onClick={restart}>
              {chapter ? 'Rejouer ce chapitre' : 'Nouveau duel'}
            </button>
            <button className="secondary" disabled={replaySaved} onClick={saveReplay}>
              {replaySaved ? '✓ Replay sauvegardé' : '💾 Sauvegarder le replay'}
            </button>
          </div>
        </div>
      )}
      {pauseOpen && (
        <div className="battle-pause-overlay" role="dialog" aria-modal="true" onClick={() => setPauseOpen(false)}>
          <div className="battle-pause-menu" onClick={(e) => e.stopPropagation()}>
            <b>Menu de la partie</b>
            <button className="secondary" onClick={() => setPauseOpen(false)}>
              Reprendre
            </button>
            <button className="secondary" onClick={restart}>
              ↺ Recommencer
            </button>
            <button className="secondary danger" onClick={forfeitMatch}>
              Abandonner
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Regroupe Profil, Échanges et Classement sous un seul onglet "Social", avec
    des sous-onglets internes — remplace trois entrées de nav par une. */
function SocialHub() {
  const location = useLocation();
  const pathname = decodedPathname(location.pathname);
  const tab = pathname === '/échanges' ? 'echanges' : pathname === '/classement' ? 'classement' : 'profil';
  return (
    <>
      <div className="subtabs">
        <Link to="/profil" className={'subtab' + (tab === 'profil' ? ' active' : '')}>
          {t(useGame.getState().language, 'common.profile')}
        </Link>
        <Link to="/échanges" className={'subtab' + (tab === 'echanges' ? ' active' : '')}>
          {t(useGame.getState().language, 'common.trades')}
        </Link>
        <Link to="/classement" className={'subtab' + (tab === 'classement' ? ' active' : '')}>
          {t(useGame.getState().language, 'common.ranking')}
        </Link>
      </div>
      {tab === 'profil' && <Profile />}
      {tab === 'echanges' && (
        <Suspense
          fallback={
            <section>
              <h2>Échanges</h2>
              <p className="hint">Chargement…</p>
            </section>
          }
        >
          <Trades />
        </Suspense>
      )}
      {tab === 'classement' && <Leaderboard />}
    </>
  );
}

function Profile() {
  const s = useGame();
  const rankedProfile = rankForRating(s.rankedRating ?? DEFAULT_RANKED_RATING);
  const go = useNavigate();
  const [name, setName] = useState(s.playerName);
  const avatarCards = ALL_CARDS.filter((card) => card.type === 'unit' && card.level === 1 && s.unlockedFactions.includes(card.faction)).concat(purchasableAvatarCards().filter((card) => s.purchasedAvatars.includes(card.id)));
  const avatar = ALL_CARDS.find((card) => card.id === s.avatarCardId) ?? avatarCards[0];
  const saveName = () => s.setPlayerName(name);
  return (
    <section>
      <h2>Profil du joueur</h2>
      <Suspense fallback={null}>
        <GoogleAccountSection />
      </Suspense>
      <div className="profile profile-editor">
        <div className="profile-avatar">
          {avatar ? (
            <img
              src={avatar.image}
              alt={avatar.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = cardBack;
              }}
            />
          ) : (
            <b>✦</b>
          )}
        </div>
        <div className="profile-main">
          <label>
            Pseudo
            <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
          </label>
          <button className="secondary" onClick={saveName}>
            Enregistrer le pseudo
          </button>
          <p>
            Niveau {s.level} · {s.wins} victoires · {s.losses} défaites
          </p>
          <p className="profile-rank">
            <RankBadge tier={rankedProfile.tier} />{' '}
            <span>
              {formatRank(rankedProfile)} · {s.rankedRating ?? 0} pts · {s.rankedWins ?? 0}V/{s.rankedLosses ?? 0}D
            </span>
          </p>
          <div className="xp-row">
            <progress value={s.xp} max={XP_PER_LEVEL} />
            <span>
              {s.xp}/{XP_PER_LEVEL} XP
            </span>
          </div>
          <p className="wallet">
            <CurrencyAmount kind="gem" amount={s.gems} label="gemmes" />
            <CurrencyAmount kind="coin" amount={s.gold} label="or" />
          </p>
        </div>
      </div>
      <h3>Choisir une image de profil</h3>
      <div className="avatar-grid">
        {avatarCards.map((card) => (
          <button key={card.id} className={'avatar-choice' + (s.avatarCardId === card.id ? ' active' : '')} onClick={() => s.setAvatarCardId(card.id)} title={card.name}>
            <img
              src={card.image}
              alt={card.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = cardBack;
              }}
            />
            <span>{card.name}</span>
          </button>
        ))}
      </div>
      <h3>Mes replays</h3>
      <p className="hint">Enregistrés sur cet appareil uniquement — pas de serveur partagé entre joueurs dans ce projet.</p>
      {s.replays.length === 0 ? (
        <p className="hint">Aucun replay sauvegardé pour l'instant. Termine un duel et choisis « Sauvegarder le replay ».</p>
      ) : (
        <div className="replay-list">
          {s.replays.map((r) => (
            <article key={r.id} className={'replay-entry ' + r.result}>
              <div>
                <b>{r.label}</b>
                <small>
                  {new Date(r.date).toLocaleDateString()} · vs {r.opponentFaction} · {r.turns} tours · {r.result === 'win' ? 'Victoire' : 'Défaite'}
                </small>
              </div>
              <div className="replay-entry-actions">
                <button className="secondary" onClick={() => go(`/replay/${r.id}`)}>
                  ▶ Regarder
                </button>
                <button
                  className="secondary danger"
                  onClick={() => {
                    if (confirm('Supprimer ce replay ?')) s.deleteReplay(r.id);
                  }}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const LANGUAGE_LABELS: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  zh: '简体中文',
};
const QUALITY_LABELS: Record<VisualQuality, string> = {
  eco: 'Économie',
  balanced: 'Équilibrée',
  high: 'Élevée',
};
const SCALE_LABELS: Record<InterfaceScale, string> = {
  small: 'Petite',
  normal: 'Normale',
  large: 'Grande',
};
function Toggle({ on, onToggle, labelOn = 'Activé', labelOff = 'Désactivé' }: { on: boolean; onToggle: () => void; labelOn?: string; labelOff?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={'switch' + (on ? ' on' : '')} onClick={onToggle}>
      <span className="switch-thumb" />
      <span className="switch-state">{on ? labelOn : labelOff}</span>
    </button>
  );
}

const FRAMECAP_LABELS: Record<AnimationMode, string> = {
  full: 'Illimité',
  reduced: '60 IPS',
  off: '30 IPS (économie max.)',
};
const RESET_CONFIRM_WORD = 'SUPPRIMER';
function Options() {
  const s = useGame();
  const go = useNavigate();
  const { active: fullscreenActive, toggle: toggleFullscreen } = useFullscreen();
  const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const closeResetConfirm = () => {
    setResetConfirmOpen(false);
    setResetConfirmText('');
  };
  const doHardReset = () => {
    s.resetProgress();
    closeResetConfirm();
    go('/');
  };
  return (
    <section>
      <h2>{t(s.language, 'settings.title')}</h2>
      <div className="options-grid settings-grid">
        <article className="options-card settings-card">
          <div className="options-card-head">
            <span className="menu-card-icon teal">🔊</span>
            <b>{t(s.language, 'settings.audio')}</b>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Musique</b>
              <small>Thème du menu et musiques de duel.</small>
            </div>
            <Toggle on={s.musicEnabled} onToggle={() => s.setMusicEnabled(!s.musicEnabled)} labelOn="Activée" labelOff="Coupée" />
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Volume musique</b>
            </div>
            <div className="option-row-slider">
              <input type="range" min={0} max={100} value={s.musicVolume} onChange={(e) => s.setMusicVolume(Number(e.target.value))} />
              <span>{s.musicVolume}%</span>
            </div>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Volume effets</b>
            </div>
            <div className="option-row-slider">
              <input type="range" min={0} max={100} value={s.sfxVolume} onChange={(e) => s.setSfxVolume(Number(e.target.value))} />
              <span>{s.sfxVolume}%</span>
            </div>
          </div>
        </article>
        <article className="options-card settings-card">
          <div className="options-card-head">
            <span className="menu-card-icon violet">🖥</span>
            <b>{t(s.language, 'settings.display')}</b>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Qualité visuelle</b>
              <small>Résolution des effets et du rendu des cartes.</small>
            </div>
            <select value={s.visualQuality} onChange={(e) => s.setVisualQuality(e.target.value as VisualQuality)}>
              {(Object.keys(QUALITY_LABELS) as VisualQuality[]).map((value) => (
                <option key={value} value={value}>
                  {QUALITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Limite d'images/seconde</b>
              <small>Réduit les animations pour économiser la batterie sur mobile.</small>
            </div>
            <select value={s.animationMode} onChange={(e) => s.setAnimationMode(e.target.value as AnimationMode)}>
              {(Object.keys(FRAMECAP_LABELS) as AnimationMode[]).map((value) => (
                <option key={value} value={value}>
                  {FRAMECAP_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Taille de l'interface</b>
            </div>
            <select value={s.interfaceScale} onChange={(e) => s.setInterfaceScale(e.target.value as InterfaceScale)}>
              {(Object.keys(SCALE_LABELS) as InterfaceScale[]).map((value) => (
                <option key={value} value={value}>
                  {SCALE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Effets lumineux</b>
            </div>
            <Toggle on={s.glowEffects} onToggle={() => s.setGlowEffects(!s.glowEffects)} />
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Tremblements d'écran</b>
            </div>
            <Toggle on={s.screenShake} onToggle={() => s.setScreenShake(!s.screenShake)} />
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Compteur FPS</b>
            </div>
            <Toggle on={s.showFps} onToggle={() => s.setShowFps(!s.showFps)} labelOn="Affiché" labelOff="Masqué" />
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>Mode batterie</b>
              <small>Coupe les vidéos et animations non essentielles.</small>
            </div>
            <Toggle on={s.batterySaver} onToggle={() => s.setBatterySaver(!s.batterySaver)} />
          </div>
          {isCoarsePointer && (
            <div className="option-row">
              <div className="option-row-text">
                <b>Vibration</b>
              </div>
              <Toggle on={s.vibrationEnabled} onToggle={() => s.setVibrationEnabled(!s.vibrationEnabled)} />
            </div>
          )}
          {!isCoarsePointer && (
            <div className="option-row">
              <div className="option-row-text">
                <b>Plein écran</b>
              </div>
              <button className="secondary" onClick={toggleFullscreen}>
                {fullscreenActive ? '⤡ Quitter' : '⛶ Activer'}
              </button>
            </div>
          )}
        </article>
        <article className="options-card settings-card">
          <div className="options-card-head">
            <span className="menu-card-icon gold">🌐</span>
            <b>{t(s.language, 'settings.language')}</b>
          </div>
          <div className="option-row">
            <div className="option-row-text">
              <b>{t(s.language, 'settings.interfaceLanguage')}</b>
            </div>
            <select value={s.language} onChange={(e) => s.setLanguage(e.target.value as Language)}>
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_LABELS[language]}
                </option>
              ))}
            </select>
          </div>
          <p className="hint">Interface multilingue active — les écrans principaux utilisent immédiatement la langue choisie.</p>
        </article>
        <article className="options-card settings-card">
          <div className="options-card-head">
            <span className="menu-card-icon teal">↺</span>
            <b>Réinitialisation</b>
          </div>
          <p className="hint">Remet Audio / Affichage / Langue à leurs valeurs par défaut. Ne touche pas à ta progression (decks, cartes, XP).</p>
          <button
            className="secondary"
            onClick={() => {
              if (window.confirm('Réinitialiser tous les paramètres (audio, affichage, langue) ?')) s.resetSettings();
            }}
          >
            ↺ Réinitialiser les paramètres
          </button>
        </article>
        <article className="options-card settings-card danger">
          <div className="options-card-head">
            <span className="menu-card-icon red">⚠</span>
            <b>Zone dangereuse</b>
          </div>
          <p className="hint">Efface définitivement toute ta progression : decks, cartes possédées, niveau, XP, victoires/défaites, campagne, pseudo et replays sauvegardés. Cette action est irréversible.</p>
          <button className="secondary danger" onClick={() => setResetConfirmOpen(true)}>
            🗑 Recommencer le jeu à zéro
          </button>
        </article>
      </div>
      {resetConfirmOpen && (
        <div className="reset-confirm-overlay" role="dialog" aria-modal="true" onClick={closeResetConfirm}>
          <div className="reset-confirm" onClick={(e) => e.stopPropagation()}>
            <b>⚠ Réinitialisation totale</b>
            <p>
              Tu es sur le point d'effacer <u>définitivement</u> toute ta progression : decks, cartes, niveau, XP, victoires, défaites, campagne et replays sauvegardés.
            </p>
            <p>
              Cette action est <b>irréversible</b> — il n'existe aucun moyen de récupérer ces données ensuite. Assure-toi d'être sûr à 100 % avant de continuer.
            </p>
            <p className="reset-confirm-hint">
              Pour confirmer, tape <b>{RESET_CONFIRM_WORD}</b> ci-dessous :
            </p>
            <input value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder={RESET_CONFIRM_WORD} autoFocus />
            <div className="reset-confirm-actions">
              <button className="secondary" onClick={closeResetConfirm}>
                Annuler
              </button>
              <button className="secondary danger" disabled={resetConfirmText.trim().toUpperCase() !== RESET_CONFIRM_WORD} onClick={doHardReset}>
                Tout supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const TUTORIAL_STEPS: { title: string; text: string }[] = [
  {
    title: '1. Le but du duel',
    text: 'Réduis les PV de ton adversaire à 0 pour gagner. Chaque joueur commence à 25 PV. Attaque son héros directement, ou élimine ses créatures pour dégager le passage.',
  },
  {
    title: '2. Les runes',
    text: "Tu gagnes +1 rune maximum à chacun de tes tours (jusqu'à 10), et tes runes se rechargent entièrement à chaque tour. Chaque carte a un coût en runes : tu ne peux la jouer que si tu as assez de ressources disponibles.",
  },
  {
    title: '3. La main en tiroir',
    text: "Tes cartes sont rangées en bas de l'écran, à moitié cachées au repos. Touche une carte ou la poignée pour ouvrir la main en entier. Touche le terrain pour la refermer sans jouer.",
  },
  {
    title: '4. Invoquer une unité',
    text: "En Main Phase, tu disposes d'une seule invocation normale par tour, payée avec tes runes. Les effets de cartes peuvent effectuer des invocations spéciales supplémentaires. Une unité ne peut normalement pas attaquer le tour où elle arrive, sauf si elle possède Blitz.",
  },
  {
    title: '5. Enchantements et Sortilèges',
    text: "Les cartes de Soutien occupent 5 emplacements. Les Enchantements s'utilisent pendant ton tour. Les Sortilèges sont des réactions : ils restent face cachée et peuvent être proposés pendant le tour adverse lorsqu'un déclencheur compatible survient, par exemple une attaque.",
  },
  {
    title: '6. Combat, Vol et portée',
    text: "En Battle Phase, sélectionne une unité puis sa cible. Provocation doit être respectée lorsqu'elle est atteignable. Une unité avec Vol ne peut pas être combattue par une unité de mêlée : il faut une unité À distance, comme un archer, un tireur ou un lanceur de sorts.",
  },
  {
    title: '7. Évoluer une créature',
    text: "En Main Phase, une créature qui reste assez longtemps sur le terrain (indiqué dans son texte) peut évoluer : touche-la, puis choisis ÉVOLUER dans le panneau qui s'affiche à droite. Elle devient une version plus forte.",
  },
  {
    title: '8. Effets et Blitz',
    text: "Certaines unités ont un effet activable limité par tour. Blitz permet à une unité légère et rapide d'attaquer immédiatement après son invocation. Les unités Blitz ont en général des statistiques plus faibles : leur avantage principal est le tempo.",
  },
  {
    title: "9. La Fosse et l'Évosphère",
    text: "Les cartes défaussées ou détruites vont dans la Fosse (à gauche). Les formes d'évolution possibles de ton deck constituent ton Évosphère (à droite). Touche ces piles pour voir leur contenu.",
  },
  {
    title: '10. Fin de tour',
    text: "Fais défiler les phases dans l'ordre : Draw → Main → Battle → End. Passer en End Phase termine ton tour. Ton adversaire joue alors, puis c'est de nouveau à toi, en Draw Phase.",
  },
];

function Tutorial() {
  return (
    <section>
      <h2>Tutoriel</h2>
      <p className="hint">Les bases pour ton premier duel — relis cette page à tout moment depuis le menu.</p>
      <div className="options-grid">
        {TUTORIAL_STEPS.map((step) => (
          <article key={step.title} className="options-card">
            <b>{step.title}</b>
            <p className="hint">{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function boosterArtwork(faction: Faction): string {
  return `${import.meta.env.BASE_URL}boosters/${faction.toLowerCase()}.png`;
}

function rarityAuraClass(rarity: Rarity): string {
  if (rarity === 'Mythique') return 'rarity-mythique';
  if (rarity === 'Légendaire') return 'rarity-legendaire';
  if (rarity === 'Épique') return 'rarity-epique';
  if (rarity === 'Rare') return 'rarity-rare';
  return 'rarity-commune';
}

const BOOSTERS: {
  id: Faction;
  name: string;
  price: number;
  blurb: string;
  available?: boolean;
}[] = [
  {
    id: 'Meute',
    name: 'Booster Meute',
    price: 150,
    blurb: 'Nouvelles cartes Meute, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.',
  },
  {
    id: 'Chevalier',
    name: 'Booster Chevalier',
    price: 150,
    blurb: 'Nouvelles cartes Chevalier, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.',
  },
  {
    id: 'Orc',
    name: 'Booster Orc',
    price: 150,
    blurb: 'Nouvelles cartes Orc, pensées pour renforcer les decks qui possèdent déjà les 3 exemplaires maximum de chaque carte actuelle.',
  },
  {
    id: 'Dragon',
    name: 'Booster Dragon',
    price: 150,
    blurb: 'Archétype lent et terrifiant : gros Dragons à forte puissance, inertie de 2 tours avant attaque et évolutions dévastatrices.',
  },
  {
    id: 'Gobelin',
    name: 'Booster Gobelin',
    price: 150,
    blurb: 'Archétype essaim ultra-agressif : petites unités fragiles avec Blitz et invocations spéciales depuis le deck.',
  },
  {
    id: 'Squelette',
    name: 'Booster Squelette',
    price: 150,
    blurb: 'Archétype d’attrition : transforme la fosse en réserve et réanime les guerriers tombés pour bâtir une légion sans fin.',
  },
];

function Shop() {
  const s = useGame();
  const [reveal, setReveal] = useState<{
    faction: Faction;
    packs: { cards: CardDef[]; isNew: boolean[] }[];
    packIndex: number;
    revealedCount: number;
    summary: boolean;
    stage: 'sealed' | 'tearing' | 'reveal';
  } | null>(null);
  const boosterVfxRef = useRef<VfxHandle>(null);
  const openingTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (openingTimerRef.current) window.clearTimeout(openingTimerRef.current);
    },
    []
  );

  const openBooster = (booster: (typeof BOOSTERS)[number], count = 1) => {
    if (s.gold < booster.price * count) return;
    const before = s.inventory;
    const pulledIds = s.openBooster(booster.id, booster.price, count);
    if (pulledIds.length === 0) return;
    const pulledCards = pulledIds.map((id) => getCard(id));
    const packs = Array.from({ length: Math.ceil(pulledCards.length / BOOSTER_PULL_COUNT) }, (_, packIndex) => {
      const start = packIndex * BOOSTER_PULL_COUNT;
      const cards = pulledCards.slice(start, start + BOOSTER_PULL_COUNT);
      return {
        cards,
        isNew: pulledIds.slice(start, start + BOOSTER_PULL_COUNT).map((id) => (before[id] ?? 0) === 0),
      };
    });
    setReveal({
      faction: booster.id,
      packs,
      packIndex: 0,
      revealedCount: 0,
      summary: false,
      stage: 'sealed',
    });
  };
  const closeReveal = () => {
    if (openingTimerRef.current) window.clearTimeout(openingTimerRef.current);
    setReveal(null);
  };
  const beginBoosterTear = () => {
    if (!reveal || reveal.stage !== 'sealed') return;
    setReveal((current) => (current ? { ...current, stage: 'tearing' } : current));
    boosterVfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'crack');
    openingTimerRef.current = window.setTimeout(() => {
      setReveal((current) => (current ? { ...current, stage: 'reveal' } : current));
      boosterVfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight / 2, 'evolution');
    }, 780);
  };
  const revealCurrentPack = () => {
    if (!reveal || reveal.stage !== 'reveal') return;
    const card = reveal.packs[reveal.packIndex].cards[reveal.revealedCount];
    if (card) {
      const premium = card.rarity === 'Épique' || card.rarity === 'Légendaire' || card.rarity === 'Mythique';
      boosterVfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight * 0.48, premium ? 'evolution' : 'draw');
    }
    setReveal((current) =>
      current
        ? {
            ...current,
            revealedCount: Math.min(current.revealedCount + 1, current.packs[current.packIndex].cards.length),
          }
        : current
    );
  };
  const revealAllCurrentPack = () => {
    boosterVfxRef.current?.spawnBurst(window.innerWidth / 2, window.innerHeight * 0.48, 'evolution');
    setReveal((current) =>
      current
        ? {
            ...current,
            revealedCount: current.packs[current.packIndex].cards.length,
          }
        : current
    );
  };
  const nextRevealPack = () =>
    setReveal((current) => {
      if (!current) return current;
      if (current.packIndex >= current.packs.length - 1)
        return {
          ...current,
          summary: true,
          revealedCount: current.packs[current.packIndex].cards.length,
        };
      return {
        ...current,
        packIndex: current.packIndex + 1,
        revealedCount: 0,
        stage: 'sealed',
      };
    });
  const skipRevealPacks = () =>
    setReveal((current) =>
      current
        ? {
            ...current,
            summary: true,
            revealedCount: current.packs[current.packIndex].cards.length,
          }
        : current
    );

  return (
    <section className="shop-screen">
      <VfxLayer ref={boosterVfxRef} active={s.animationMode !== 'off' && !s.batterySaver} />
      <div className="shop-title-row">
        <div>
          <small className="eyebrow">L'ÉCHOPPE DE MARREK</small>
          <h2>{t(s.language, 'shop.title')}</h2>
          <p className="hint">Le marchand du Nexus renouvelle ses faveurs pour ceux qui jouent.</p>
        </div>
        <div className="wallet shop-wallet">
          <CurrencyAmount kind="gem" amount={s.gems} label="gemmes" />
          <CurrencyAmount kind="coin" amount={s.gold} label="or Nexus" />
        </div>
      </div>
      <div className="options-grid">
        {BOOSTERS.map((booster) => {
          const preview = ALL_CARDS.filter((c) => c.faction === booster.id && c.boosterOnly);
          const available = booster.available !== false;
          const affordable = available && s.gold >= booster.price;
          return (
            <article key={booster.id} className="options-card booster-product-card">
              <img className={`booster-shop-art${booster.id === 'Squelette' ? ' booster-skeleton-art' : ''}`} src={boosterArtwork(booster.id)} alt={booster.name} loading="lazy" />
              <b className="booster-product-title">{booster.name}</b>
              <p className="hint">{booster.blurb}</p>
              <p className="hint booster-price">
                Prix : <CurrencyAmount kind="coin" amount={booster.price} /> · {BOOSTER_PULL_COUNT} cartes par booster, doublons compris
              </p>
              <ul className="hint booster-preview">
                {preview.map((card) => (
                  <li key={card.id}>
                    {card.name} (
                    <span className="inline-mana">
                      <CurrencyIcon kind="mana" />
                      {card.cost}
                    </span>
                    ) — {card.text}
                  </li>
                ))}
              </ul>
              <div className="booster-buy-row">
                <button className="primary" disabled={!affordable} onClick={() => openBooster(booster)}>
                  {!available ? (
                    'Illustrations à installer'
                  ) : affordable ? (
                    <span className="button-price">
                      Ouvrir <CurrencyIcon kind="coin" />
                      {booster.price}
                    </span>
                  ) : (
                    'Or insuffisant'
                  )}
                </button>
                <button className="secondary" disabled={!available || s.gold < booster.price * 10} onClick={() => openBooster(booster, 10)}>
                  {available ? (
                    <span className="button-price">
                      Ouvrir ×10 <CurrencyIcon kind="coin" />
                      {booster.price * 10}
                    </span>
                  ) : (
                    'Booster bientôt disponible'
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="hint">Chaque booster tire {BOOSTER_PULL_COUNT} cartes de sa faction (doublons possibles). Une carte Épique ou plus est garantie tous les 10 boosters au maximum. Une Mythique exclusive de booster, lorsqu'elle est installée, tombe uniquement sur son jet indépendant de 0,0001 % — environ 1 chance sur 1 000 000 par carte tirée — et n'est jamais forcée par le pity.</p>
      <h3>{t(s.language, 'shop.avatars')}</h3>
      <p className="hint">Débloque des illustrations d'évolution comme avatar, en gemmes — visibles ensuite dans ton profil.</p>
      <div className="avatar-grid">
        {purchasableAvatarCards().map((card) => {
          const owned = s.purchasedAvatars.includes(card.id);
          return (
            <button key={card.id} type="button" className={'avatar-choice' + (owned ? ' active' : '')} disabled={owned || s.gems < AVATAR_PRICE_GEMS} onClick={() => s.purchaseAvatar(card.id)}>
              <img
                src={card.image}
                alt={card.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = cardBack;
                }}
              />
              <span>{card.name}</span>
              <span className="hint avatar-price">{owned ? '✓ Débloqué' : <CurrencyAmount kind="gem" amount={AVATAR_PRICE_GEMS} />}</span>
            </button>
          );
        })}
      </div>
      <h3>{t(s.language, 'shop.terrains')}</h3>
      <p className="hint">Change le décor de tes duels, en gemmes — purement cosmétique, sans effet sur les règles.</p>
      <div className="terrain-grid">
        {TERRAINS.map((terrain) => {
          const owned = s.purchasedTerrains.includes(terrain.id);
          const active = s.selectedTerrain === terrain.id;
          return (
            <article key={terrain.id} className={'terrain-card' + (active ? ' active' : '')}>
              <div className="terrain-preview">
                <ArenaBackground terrain={terrain.id} className="terrain-preview-bg" />
              </div>
              <b>{terrain.name}</b>
              <p className="hint">{terrain.blurb}</p>
              {owned ? (
                <button className={active ? 'primary' : 'secondary'} disabled={active} onClick={() => s.selectTerrain(terrain.id)}>
                  {active ? '✓ Actif' : 'Sélectionner'}
                </button>
              ) : (
                <button className="primary" disabled={s.gems < TERRAIN_PRICE_GEMS} onClick={() => s.purchaseTerrain(terrain.id)}>
                  <span className="button-price">
                    <CurrencyIcon kind="gem" />
                    {TERRAIN_PRICE_GEMS}
                  </span>
                </button>
              )}
            </article>
          );
        })}
      </div>
      {reveal &&
        (() => {
          const currentPack = reveal.packs[reveal.packIndex];
          const allCards = reveal.packs.flatMap((pack) => pack.cards);
          const allNew = reveal.packs.flatMap((pack) => pack.isNew);
          const allRevealed = reveal.revealedCount >= currentPack.cards.length;
          if (reveal.summary)
            return (
              <div className="booster-opening-overlay" role="dialog" aria-modal="true">
                <div className="booster-summary">
                  <header>
                    <div>
                      <small>OUVERTURE TERMINÉE</small>
                      <h3>
                        {reveal.packs.length} booster
                        {reveal.packs.length > 1 ? 's' : ''} {reveal.faction}
                      </h3>
                    </div>
                    <button onClick={closeReveal}>×</button>
                  </header>
                  <div className="booster-summary-grid">
                    {allCards.map((card, i) => (
                      <motion.div
                        key={`${card.id}-${i}`}
                        className={card.rarity === 'Mythique' ? 'mythic-pull' : ''}
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: Math.min(i * 0.025, 0.6),
                          duration: 0.28,
                        }}
                      >
                        <CardView card={card} badge={allNew[i] ? 'Nouveau' : 'Doublon'} />
                      </motion.div>
                    ))}
                  </div>
                  <button className="primary booster-done" onClick={closeReveal}>
                    Récupérer les cartes
                  </button>
                </div>
              </div>
            );
          return (
            <div className="booster-opening-overlay" role="dialog" aria-modal="true">
              <div className="booster-opening-stage">
                <header>
                  <div>
                    <small>
                      BOOSTER {reveal.packIndex + 1}/{reveal.packs.length}
                    </small>
                    <h3>{reveal.faction}</h3>
                  </div>
                  <div className="booster-opening-actions">
                    {reveal.packs.length > 1 && (
                      <button className="secondary" onClick={skipRevealPacks}>
                        Passer
                      </button>
                    )}
                    <button className="secondary" onClick={closeReveal}>
                      ×
                    </button>
                  </div>
                </header>
                {reveal.stage !== 'reveal' ? (
                  <button className={`booster-sealed-stage ${reveal.stage}`} type="button" onClick={beginBoosterTear} disabled={reveal.stage === 'tearing'}>
                    <span className="booster-pack-shell">
                      <span
                        className="booster-pack-half top"
                        style={{
                          backgroundImage: `url(${boosterArtwork(reveal.faction)})`,
                        }}
                      />
                      <span
                        className="booster-pack-half bottom"
                        style={{
                          backgroundImage: `url(${boosterArtwork(reveal.faction)})`,
                        }}
                      />
                      <span className="booster-tear-line" />
                      <span className="booster-pack-flare" />
                    </span>
                    <b>{reveal.stage === 'sealed' ? 'TOUCHE POUR DÉCHIRER LE SCEAU' : 'OUVERTURE DU NEXUS…'}</b>
                    <small>Le contenu du booster n'est révélé qu'après l'ouverture.</small>
                  </button>
                ) : (
                  <>
                    <button type="button" className={'booster-card-fan' + (allRevealed ? ' revealed' : '')} onClick={allRevealed ? undefined : revealCurrentPack} aria-label={allRevealed ? 'Cartes révélées' : 'Révéler la prochaine carte'}>
                      {currentPack.cards.map((card, i) => {
                        const revealed = i < reveal.revealedCount;
                        return (
                          <motion.div
                            key={`${card.id}-${i}-${revealed ? 'front' : 'back'}`}
                            className={'booster-pull-card ' + rarityAuraClass(card.rarity) + (card.rarity === 'Mythique' ? ' mythic-pull' : '')}
                            initial={{
                              opacity: 0,
                              y: revealed ? 25 : -70,
                              rotateY: revealed ? 180 : 0,
                              rotate: (i - 2) * 5,
                              scale: 0.72,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              rotateY: 0,
                              rotate: (i - 2) * 4,
                              scale: revealed ? 1.04 : 1,
                            }}
                            transition={{
                              delay: i * 0.055,
                              duration: revealed ? 0.62 : 0.38,
                              ease: 'easeOut',
                            }}
                          >
                            {revealed ? (
                              <CardView card={card} badge={currentPack.isNew[i] ? 'Nouveau' : 'Doublon'} />
                            ) : (
                              <div
                                className="booster-card-back"
                                style={{
                                  backgroundImage: `url(${CARD_BACK_URL})`,
                                }}
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </button>
                    <div className="booster-opening-footer">
                      {!allRevealed ? (
                        <>
                          <b>TOUCHE LES CARTES POUR RÉVÉLER</b>
                          <small>
                            Carte {reveal.revealedCount + 1}/{currentPack.cards.length}
                          </small>
                          <span className="reveal-progress">
                            {currentPack.cards.map((_, index) => (
                              <i key={index} className={index < reveal.revealedCount ? 'done' : ''} />
                            ))}
                          </span>
                          <button className="secondary" onClick={revealAllCurrentPack}>
                            Tout révéler
                          </button>
                        </>
                      ) : (
                        <button className="primary" onClick={nextRevealPack}>
                          {reveal.packIndex < reveal.packs.length - 1 ? 'Booster suivant' : 'Voir tout le tirage'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
    </section>
  );
}

/** Durée simulée de recherche d'adversaire avant le repli sur un bot — juste assez
    long pour qu'un "RECHERCHE..." lise comme une vraie tentative de matchmaking,
    pas un faux suspense artificiel. */
const MATCHMAKING_SEARCH_MS = 1800;

function Multiplayer() {
  const s = useGame();
  const go = useNavigate();
  const currentRating = s.rankedRating ?? DEFAULT_RANKED_RATING;
  const rankedWins = s.rankedWins ?? 0;
  const rankedLosses = s.rankedLosses ?? 0;
  const rank = rankForRating(currentRating);
  const next = RANKED_LADDER.find((entry) => entry.minRating > currentRating);
  const [searching, setSearching] = useState<'classic' | 'ranked' | null>(null);
  const searchTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    },
    []
  );
  const startSearch = (mode: 'classic' | 'ranked') => {
    setSearching(mode);
    searchTimer.current = window.setTimeout(() => go('/combat', { state: { onlineMode: mode } }), MATCHMAKING_SEARCH_MS);
  };
  const cancelSearch = () => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    setSearching(null);
  };
  const botDifficultyHint = searching === 'ranked' ? `IA de niveau ${aiDifficultyForRating(currentRating) === 'maitre' ? 'Maître' : aiDifficultyForRating(currentRating) === 'veteran' ? 'Vétéran' : 'Novice'} (ton rang)` : 'IA de niveau aléatoire';
  return (
    <section className="multiplayer-page">
      <h2>Multijoueur</h2>
      <p className="hint">Aucun serveur de matchmaking temps réel n'est encore branché : si aucun joueur n'est trouvé après une courte recherche, un bot prend le relais — niveau aléatoire en Classique, niveau équivalent à ton rang en Classé.</p>
      <div className="multiplayer-modes">
        <article className="multiplayer-mode">
          <span className="menu-card-icon teal">⚔</span>
          <h3>Classique</h3>
          <p>Duels sans impact sur le rang. Idéal pour tester un deck hybride, apprendre un nouvel archétype ou jouer entre amis.</p>
          <button className="primary" disabled={searching !== null} onClick={() => startSearch('classic')}>
            {searching === 'classic' ? 'RECHERCHE…' : 'RECHERCHER UN ADVERSAIRE'}
          </button>
          <small>Repli automatique sur un bot de niveau aléatoire si personne n'est trouvé</small>
        </article>
        <article className="multiplayer-mode ranked">
          <span className="menu-card-icon gold">✦</span>
          <h3>Classé</h3>
          <p>Les victoires et défaites font évoluer ton statut dans le Nexus.</p>
          <div className="rank-card">
            <RankBadge tier={rank.tier} className="current-rank-badge" />
            <div className="rank-card-copy">
              <b>{formatRank(rank)}</b>
              <span>
                {currentRating} points · {rankedWins}V / {rankedLosses}D
              </span>
              {next && <small>Prochain palier à {next.minRating} points</small>}
            </div>
          </div>
          <button className="primary" disabled={searching !== null} onClick={() => startSearch('ranked')}>
            {searching === 'ranked' ? 'RECHERCHE…' : 'LANCER UN DUEL CLASSÉ'}
          </button>
          <small>Repli automatique sur un bot de ton rang si personne n'est trouvé</small>
        </article>
      </div>
      <h3>Rangs du Nexus</h3>
      <div className="rank-ladder">
        {RANKED_LADDER.filter((entry, index, arr) => index === 0 || arr[index - 1].tier !== entry.tier).map((entry) => (
          <div key={entry.tier}>
            <RankBadge tier={entry.tier} />
            <span className="rank-tier-copy">
              <b>{entry.tier}</b>
              <small>{entry.tier === 'Légende du Nexus' ? String(entry.minRating) + '+' : String(entry.minRating) + '–' + String(RANKED_LADDER.filter((r) => r.tier === entry.tier).at(-1)?.maxRating ?? '')} points</small>
            </span>
          </div>
        ))}
      </div>
      {searching && (
        <div className="matchmaking-overlay" role="dialog" aria-modal="true">
          <div className="matchmaking-card">
            <span className="matchmaking-spinner" aria-hidden="true" />
            <b>Recherche d'un adversaire{searching === 'ranked' ? ' classé' : ''}…</b>
            <small>{botDifficultyHint} si aucun joueur n'est disponible</small>
            <button className="secondary" onClick={cancelSearch}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Leaderboard() {
  const s = useGame();
  const total = s.wins + s.losses;
  const winRate = total > 0 ? Math.round((s.wins / total) * 100) : 0;
  const ranked = rankForRating(s.rankedRating ?? DEFAULT_RANKED_RATING);
  return (
    <section>
      <h2>Classement</h2>
      <p className="hint">Le classement en ligne demande un serveur partagé entre joueurs, qui n'existe pas encore dans ce projet — en attendant, voici ton propre palmarès.</p>
      <div className="options-grid">
        <article className="options-card leaderboard-rank-card">
          <RankBadge tier={ranked.tier} />
          <div>
            <b>{s.playerName}</b>
            <p className="hint">
              Niveau {s.level} · {s.wins} victoires · {s.losses} défaites
            </p>
            <p className="hint">Taux de victoire : {winRate}%</p>
            <p className="profile-rank">
              Classé : {formatRank(ranked)} · {s.rankedRating ?? 0} points
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function Replay() {
  const { id } = useParams();
  const s = useGame();
  const go = useNavigate();
  const replay = s.replays.find((r) => r.id === id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const total = replay?.snapshots.length ?? 0;
  useEffect(() => {
    document.body.classList.add('in-battle');
    return () => document.body.classList.remove('in-battle');
  }, []);
  useEffect(() => {
    if (!playing || !replay || step >= total - 1) {
      if (step >= total - 1) setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((n) => Math.min(total - 1, n + 1)), 1100);
    return () => window.clearTimeout(timer);
  }, [playing, step, replay, total]);
  if (!replay)
    return (
      <section>
        <h2>Replay introuvable</h2>
        <p className="hint">Il a peut-être été supprimé.</p>
        <button className="secondary" onClick={() => go('/profil')}>
          ← Retour au profil
        </button>
      </section>
    );
  const snap = replay.snapshots[Math.min(step, total - 1)];
  const opponentAvatarImage = getCard(defaultAvatarFor(replay.opponentFaction)).image;
  // Anciens replays (avant l'ajout de la 3e faction) n'ont pas playerFaction
  // enregistré — on retombe alors sur l'ancienne inférence binaire.
  const playerFaction: Faction = replay.playerFaction ?? rivalFactionFor(replay.opponentFaction);
  // Rejoue exactement l'écran de duel réel (même fond WebGL, mêmes zones,
  // mêmes cartes) au lieu d'une maquette séparée — juste sans interaction,
  // piloté par l'instantané du tour affiché plutôt que par une partie en cours.
  return (
    <section className="battle">
      <ArenaBackground terrain={s.selectedTerrain} className="battle-bg-video" paused={false} />
      <button className="battle-pause-btn" type="button" aria-label="Retour au profil" onClick={() => go('/profil')}>
        ←
      </button>
      <div className="replay-info-bar">
        <b>{replay.label}</b>
        <span className={replay.result}>{replay.result === 'win' ? '🏆 Victoire' : '💀 Défaite'}</span>
        <span>
          vs {replay.opponentFaction} · {new Date(replay.date).toLocaleDateString()}
        </span>
      </div>
      <div className="profile-float enemy">
        <div className="duel-profile">
          <span className="duel-profile-avatar">
            <img
              src={opponentAvatarImage}
              alt={replay.opponentFaction}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = cardBack;
              }}
            />
          </span>
          <div className="duel-profile-text">
            <b>Rival Nexus</b>
            <small>{replay.opponentFaction}</small>
          </div>
        </div>
        <span className="life">♥ {snap.enemy.life}</span>
        <RuneMeter mana={snap.enemy.mana} maxMana={snap.enemy.maxMana} enemy />
      </div>
      <div className="enemy-hand-row" aria-label={`Main de l'adversaire : ${snap.enemy.hand.length} cartes`}>
        <div className="enemy-hand-inner">
          {snap.enemy.hand.map((_, i) => (
            <span key={i} className="enemy-hand-card" style={{ backgroundImage: `url(${CARD_BACK_URL})` }} />
          ))}
        </div>
      </div>
      <div className="battle-main">
        <div className="pile-rail left">
          <div className="card-pile grave">
            <span className="pile-stack" />
            <span className="pile-icon">☠</span>
            <b>FOSSE</b>
            <em>{snap.player.graveyard.length}</em>
          </div>
        </div>
        <div className="battle-center">
          <Zone title="ADVERSAIRE" units={snap.enemy.field} isEnemy taunted={false} selectable={false} selectedId={null} fx={null} support={snap.enemy.support} damagePulses={{}} />
          <div className="turn-strip">
            <b>{snap.activePlayer === 'player' ? 'TOUR DU JOUEUR' : "TOUR DE L'ADVERSAIRE"}</b>
            <span>Tour {snap.turn}</span>
          </div>
          <Zone title="TON TERRAIN" units={snap.player.field} isEnemy={false} taunted={false} selectable={false} selectedId={null} fx={null} support={snap.player.support} damagePulses={{}} />
        </div>
        <div className="pile-rail right">
          <div className="card-pile evo">
            <span className="pile-stack" />
            <span className="pile-icon">✦</span>
            <b>ÉVOSPHÈRE</b>
            <em>{snap.player.evosphere.length}</em>
          </div>
          <div className="card-pile deck">
            <span className="pile-stack" />
            <span className="pile-icon">▣</span>
            <b>DECK</b>
            <em>{snap.player.deck.length}</em>
          </div>
        </div>
      </div>
      <div className="profile-float player">
        <div className="duel-profile">
          <span className="duel-profile-avatar">
            <b>✦</b>
          </span>
          <div className="duel-profile-text">
            <b>{s.playerName}</b>
            <small>{playerFaction}</small>
          </div>
        </div>
        <span className="life">♥ {snap.player.life}</span>
        <RuneMeter mana={snap.player.mana} maxMana={snap.player.maxMana} />
      </div>
      <div className="hand open">
        {snap.player.hand.map((cardId, i) => {
          const card = getCard(cardId);
          return (
            <div key={i} className="hand-card-wrap affordable">
              <CardView card={card} fullArt disabled />
            </div>
          );
        })}
      </div>
      <div className="battle-footer">
        <span className="hud-pill turn-readout">Tour {snap.turn}</span>
      </div>
      <div className="replay-playback-bar">
        <button
          className="secondary"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
          disabled={step === 0}
        >
          ⏮
        </button>
        <button
          className="secondary"
          onClick={() => {
            setPlaying(false);
            setStep((n) => Math.max(0, n - 1));
          }}
          disabled={step === 0}
        >
          ◀
        </button>
        <span className="replay-step">
          {step + 1}/{total}
        </span>
        <button
          className="secondary"
          onClick={() => {
            setPlaying(false);
            setStep((n) => Math.min(total - 1, n + 1));
          }}
          disabled={step === total - 1}
        >
          ▶
        </button>
        <button
          className="secondary"
          onClick={() => {
            setPlaying(false);
            setStep(total - 1);
          }}
          disabled={step === total - 1}
        >
          ⏭
        </button>
        <button className="primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ Pause' : '▶ Lecture auto'}
        </button>
      </div>
    </section>
  );
}

function FactionOnboarding() {
  const s = useGame();
  const wolfArt = `${import.meta.env.BASE_URL}cards/evo-loup-de-givre.png`;
  const knightArt = getCard('capitaine-du-royaume').image;
  // Seules Meute et Chevalier se choisissent au départ — l'Orc se débloque
  // plus tard dans la campagne (voir UNLOCK_THIRD_FACTION_AT), donc ce
  // record n'a volontairement que ces deux clés.
  const blurbs: Record<'Meute' | 'Chevalier', string> = {
    Meute: 'Rejoins les loups des brumes. Instinct, meute et lune rouge — frappe vite, en nombre.',
    Chevalier: "Sers l'ordre du royaume. Discipline, provocation et lumière sacrée — tiens la ligne.",
  };
  return (
    <div className="onboarding">
      <div className="onboarding-inner">
        <p className="eyebrow">CHOISIS TON SERMENT</p>
        <h2>Quel camp défendras-tu ?</h2>
        <p>Ce choix détermine ton deck de départ. Les autres factions restent verrouillées jusqu'à ce que tu progresses dans la campagne.</p>
        <div className="onboarding-choices">
          <button className="onboarding-card" onClick={() => s.chooseStartingFaction('Meute')}>
            <span
              className="onboarding-art"
              style={{
                backgroundImage: `url(${wolfArt}), radial-gradient(circle at 50% 25%, #1c3a42, #050d0d 75%)`,
              }}
            />
            <b>Meute</b>
            <small>{blurbs.Meute}</small>
          </button>
          <button className="onboarding-card" onClick={() => s.chooseStartingFaction('Chevalier')}>
            <span
              className="onboarding-art"
              style={{
                backgroundImage: `url(${knightArt}), radial-gradient(circle at 50% 25%, #3a2f10, #0a0704 75%)`,
              }}
            />
            <b>Chevalier</b>
            <small>{blurbs.Chevalier}</small>
          </button>
        </div>
      </div>
    </div>
  );
}

function DisplaySettingsBridge() {
  const s = useGame();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.quality = s.visualQuality;
    root.dataset.animations = s.animationMode;
    root.dataset.glow = s.glowEffects ? 'on' : 'off';
    root.dataset.shake = s.screenShake ? 'on' : 'off';
    root.dataset.uiScale = s.interfaceScale;
    root.lang = s.language === 'zh' ? 'zh-CN' : s.language;
  }, [s.visualQuality, s.animationMode, s.glowEffects, s.screenShake, s.interfaceScale]);
  return null;
}

export default function App() {
  const factionChosen = useGame((s) => s.factionChosen);
  const hasLegacyDeck = useGame((s) => s.deck.length > 0);
  if (!factionChosen && !hasLegacyDeck)
    return (
      <>
        <AudioDirector />
        <SecretDragonReward />
        <FactionOnboarding />
      </>
    );
  return (
    <>
      <DisplaySettingsBridge />
      <AudioDirector />
      <SecretDragonReward />
      <Suspense fallback={null}>
        <GoogleSignInGate />
      </Suspense>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/campagne" element={<NarrativeCampaign />} />
          <Route path="/chroniques" element={<CodexPanel />} />
          <Route path="/collection" element={<CollectionHub />} />
          <Route path="/decks" element={<CollectionHub />} />
          <Route path="/échanges" element={<SocialHub />} />
          <Route path="/profil" element={<SocialHub />} />
          <Route path="/replay/:id" element={<Replay />} />
          <Route path="/combat" element={<Combat />} />
          <Route path="/multijoueur" element={<Multiplayer />} />
          <Route path="/paramètres" element={<Options />} />
          <Route path="/classement" element={<SocialHub />} />
          <Route path="/boutique" element={<Shop />} />
          <Route path="/tutoriel" element={<Tutorial />} />
        </Routes>
      </Shell>
    </>
  );
}
