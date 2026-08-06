const MENU_TRACKS = [
  'audio/menu/menu-imperator.mp3',
  'audio/menu/noir-et-le-fer.mp3',
];

const LEGACY_MENU_TRACK = 'audio/menu-theme.mp3';
const BASE_URL = import.meta.env.BASE_URL;

let availableTracks: string[] = [];
let currentIndex = -1;
let managedAudio: HTMLAudioElement | null = null;
let syncing = false;

const relativeAudioPath = (audio: HTMLAudioElement) => {
  try {
    const pathname = new URL(audio.currentSrc || audio.src, window.location.href).pathname;
    const basePath = new URL(BASE_URL, window.location.origin).pathname;
    return pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname.replace(/^\//, '');
  } catch {
    return '';
  }
};

const isCombatRoute = () => window.location.pathname.replace(/\/$/, '').endsWith('/combat');
const isMenuTrack = (path: string) => path === LEGACY_MENU_TRACK || MENU_TRACKS.includes(path);

const trackExists = async (track: string) => {
  try {
    const response = await fetch(`${BASE_URL}${track}`, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
};

const setTrack = (audio: HTMLAudioElement, index: number, preservePlayback = true) => {
  if (!availableTracks.length) return;
  const wasPlaying = !audio.paused;
  currentIndex = (index + availableTracks.length) % availableTracks.length;
  const nextSrc = `${BASE_URL}${availableTracks[currentIndex]}`;
  if (audio.getAttribute('src') !== nextSrc) {
    audio.src = nextSrc;
    audio.load();
  }
  audio.loop = false;
  if (preservePlayback && wasPlaying) audio.play().catch(() => {});
};

const onEnded = () => {
  if (!managedAudio || isCombatRoute() || !availableTracks.length) return;
  setTrack(managedAudio, currentIndex + 1, false);
  managedAudio.play().catch(() => {});
};

const syncAudio = () => {
  if (syncing) return;
  syncing = true;
  queueMicrotask(() => {
    syncing = false;
    const audio = document.querySelector<HTMLAudioElement>('audio');
    if (!audio) return;

    if (managedAudio !== audio) {
      managedAudio?.removeEventListener('ended', onEnded);
      managedAudio = audio;
      managedAudio.addEventListener('ended', onEnded);
    }

    const currentPath = relativeAudioPath(audio);
    if (isCombatRoute()) {
      audio.loop = true;
      return;
    }

    if (!availableTracks.length || !isMenuTrack(currentPath)) return;

    const matchingIndex = availableTracks.indexOf(currentPath);
    if (matchingIndex >= 0) {
      currentIndex = matchingIndex;
      audio.loop = false;
      return;
    }

    setTrack(audio, currentIndex >= 0 ? currentIndex : Math.floor(Math.random() * availableTracks.length));
  });
};

const notifyRouteChange = () => window.setTimeout(syncAudio, 0);

const patchHistory = (method: 'pushState' | 'replaceState') => {
  const original = history[method];
  history[method] = function (...args) {
    const result = original.apply(this, args as Parameters<History[typeof method]>);
    notifyRouteChange();
    return result;
  } as History[typeof method];
};

void Promise.all(MENU_TRACKS.map(async (track) => ((await trackExists(track)) ? track : null))).then((tracks) => {
  availableTracks = tracks.filter((track): track is string => track !== null);
  syncAudio();
});

patchHistory('pushState');
patchHistory('replaceState');
window.addEventListener('popstate', notifyRouteChange);

new MutationObserver(syncAudio).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['src'],
});
