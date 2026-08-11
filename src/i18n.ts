import type { Language } from './store/game';
import { EXTRA_TRANSLATIONS } from './i18n-extra';

export type UiKey =
  | 'nav.play' | 'nav.collection' | 'nav.social' | 'nav.shop' | 'nav.settings'
  | 'common.cards' | 'common.decks' | 'common.profile' | 'common.trades' | 'common.ranking'
  | 'settings.title' | 'settings.audio' | 'settings.music' | 'settings.musicVolume' | 'settings.sfxVolume'
  | 'settings.display' | 'settings.quality' | 'settings.fpsLimit' | 'settings.uiScale' | 'settings.glow'
  | 'settings.shake' | 'settings.fpsCounter' | 'settings.battery' | 'settings.vibration' | 'settings.fullscreen'
  | 'settings.language' | 'settings.interfaceLanguage' | 'settings.reset' | 'settings.resetAll' | 'settings.danger'
  | 'settings.musicHint' | 'settings.musicOn' | 'settings.musicOff' | 'settings.qualityHint' | 'settings.fpsLimitHint'
  | 'settings.fpsShown' | 'settings.fpsHidden' | 'settings.batteryHint' | 'settings.fullscreenEnable' | 'settings.fullscreenExit'
  | 'settings.languageHint' | 'settings.resetHint' | 'settings.resetConfirmPrompt' | 'settings.dangerHint'
  | 'settings.hardResetButton' | 'settings.hardResetTitle' | 'settings.hardResetWarn1' | 'settings.hardResetWarn2'
  | 'settings.hardResetTypePrompt' | 'settings.hardResetConfirmButton'
  | 'shop.title' | 'shop.open' | 'shop.open10' | 'shop.insufficientGold' | 'shop.avatars' | 'shop.terrains'
  | 'duel.yourTurn' | 'duel.enemyTurn' | 'duel.enemyDraw' | 'duel.draw' | 'duel.main' | 'duel.battle' | 'duel.end'
  | 'duel.grave' | 'duel.evosphere' | 'duel.deck' | 'duel.log' | 'duel.surrender' | 'duel.restart'
  | 'duel.resume' | 'duel.evolve' | 'duel.activate' | 'duel.close' | 'duel.cancel'
  | 'rarity.common' | 'rarity.rare' | 'rarity.epic' | 'rarity.legendary' | 'rarity.mythic'
  | 'multiplayer.title' | 'multiplayer.hintPvp' | 'multiplayer.hintBotOnly' | 'multiplayer.classic' | 'multiplayer.classicDesc'
  | 'multiplayer.classicFallback' | 'multiplayer.ranked' | 'multiplayer.rankedDesc' | 'multiplayer.searchButton' | 'multiplayer.searching'
  | 'multiplayer.rankedSearchButton' | 'multiplayer.rankedFallback'
  | 'settings.on' | 'settings.off'
  | 'settings.qualityEco' | 'settings.qualityBalanced' | 'settings.qualityHigh'
  | 'settings.scaleSmall' | 'settings.scaleNormal' | 'settings.scaleLarge'
  | 'settings.fpsFull' | 'settings.fpsReduced' | 'settings.fpsOff';

type Dict = Record<UiKey, string>;

const fr: Dict = {
  'nav.play': 'Jouer', 'nav.collection': 'Collection', 'nav.social': 'Social', 'nav.shop': 'Boutique', 'nav.settings': 'Paramètres',
  'common.cards': 'Cartes', 'common.decks': 'Mes Decks', 'common.profile': 'Profil', 'common.trades': 'Échanges', 'common.ranking': 'Classement',
  'settings.title': 'Options', 'settings.audio': 'Audio', 'settings.music': 'Musique', 'settings.musicVolume': 'Volume musique', 'settings.sfxVolume': 'Volume effets',
  'settings.display': 'Affichage & performance', 'settings.quality': 'Qualité visuelle', 'settings.fpsLimit': "Limite d'images/seconde", 'settings.uiScale': "Taille de l'interface", 'settings.glow': 'Effets lumineux',
  'settings.shake': "Tremblements d'écran", 'settings.fpsCounter': 'Compteur FPS', 'settings.battery': 'Mode batterie', 'settings.vibration': 'Vibration', 'settings.fullscreen': 'Plein écran',
  'settings.language': 'Langue', 'settings.interfaceLanguage': "Langue de l'interface", 'settings.reset': 'Réinitialisation', 'settings.resetAll': 'Réinitialiser les paramètres', 'settings.danger': 'Zone dangereuse',
  'settings.musicHint': 'Thème du menu et musiques de duel.', 'settings.musicOn': 'Activée', 'settings.musicOff': 'Coupée',
  'settings.qualityHint': 'Résolution des effets et du rendu des cartes.', 'settings.fpsLimitHint': "Réduit les animations pour économiser la batterie sur mobile.",
  'settings.fpsShown': 'Affiché', 'settings.fpsHidden': 'Masqué', 'settings.batteryHint': 'Coupe les vidéos et animations non essentielles.',
  'settings.fullscreenEnable': 'Activer', 'settings.fullscreenExit': 'Quitter',
  'settings.languageHint': 'Interface multilingue active — les écrans principaux utilisent immédiatement la langue choisie.',
  'settings.resetHint': 'Remet Audio / Affichage / Langue à leurs valeurs par défaut. Ne touche pas à ta progression (decks, cartes, XP).',
  'settings.resetConfirmPrompt': 'Réinitialiser tous les paramètres (audio, affichage, langue) ?',
  'settings.dangerHint': 'Efface définitivement toute ta progression : decks, cartes possédées, niveau, XP, victoires/défaites, campagne, pseudo et replays sauvegardés. Cette action est irréversible.',
  'settings.hardResetButton': 'Recommencer le jeu à zéro', 'settings.hardResetTitle': 'Réinitialisation totale',
  'settings.hardResetWarn1': "Tu es sur le point d'effacer définitivement toute ta progression : decks, cartes, niveau, XP, victoires, défaites, campagne et replays sauvegardés.",
  'settings.hardResetWarn2': "Cette action est irréversible — il n'existe aucun moyen de récupérer ces données ensuite. Assure-toi d'être sûr à 100 % avant de continuer.",
  'settings.hardResetTypePrompt': 'Pour confirmer, tape ci-dessous :', 'settings.hardResetConfirmButton': 'Tout supprimer définitivement',
  'shop.title': 'Boutique', 'shop.open': 'Ouvrir', 'shop.open10': 'Ouvrir ×10', 'shop.insufficientGold': 'Or insuffisant', 'shop.avatars': 'Images de profil', 'shop.terrains': 'Terrains',
  'duel.yourTurn': 'À TOI DE JOUER', 'duel.enemyTurn': "TOUR DE L'ADVERSAIRE", 'duel.enemyDraw': "L'ADVERSAIRE PIOCHE…", 'duel.draw': 'DRAW', 'duel.main': 'MAIN', 'duel.battle': 'BATTLE', 'duel.end': 'END',
  'duel.grave': 'FOSSE', 'duel.evosphere': 'ÉVOSPHÈRE', 'duel.deck': 'DECK', 'duel.log': 'JOURNAL', 'duel.surrender': 'Abandonner', 'duel.restart': 'Recommencer', 'duel.resume': 'Reprendre', 'duel.evolve': 'ÉVOLUER', 'duel.activate': 'Activer', 'duel.close': 'Fermer', 'duel.cancel': 'Annuler',
  'rarity.common': 'Commune', 'rarity.rare': 'Rare', 'rarity.epic': 'Épique', 'rarity.legendary': 'Légendaire', 'rarity.mythic': 'Mythique',
  'multiplayer.title': 'Multijoueur',
  'multiplayer.hintPvp': "Recherche un vrai adversaire en ligne ; si personne n'est trouvé après une courte recherche, un bot prend le relais — niveau aléatoire en Classique, niveau équivalent à ton rang en Classé.",
  'multiplayer.hintBotOnly': "Aucun serveur de matchmaking temps réel n'est encore branché : un bot prend le relais — niveau aléatoire en Classique, niveau équivalent à ton rang en Classé.",
  'multiplayer.classic': 'Classique', 'multiplayer.classicDesc': 'Duels sans impact sur le rang. Idéal pour tester un deck hybride, apprendre un nouvel archétype ou jouer entre amis.',
  'multiplayer.classicFallback': "Repli automatique sur un bot de niveau aléatoire si personne n'est trouvé",
  'multiplayer.ranked': 'Classé', 'multiplayer.rankedDesc': 'Les victoires et défaites font évoluer ton statut dans le Nexus.',
  'multiplayer.searchButton': 'RECHERCHER UN ADVERSAIRE', 'multiplayer.searching': 'RECHERCHE…',
  'multiplayer.rankedSearchButton': 'LANCER UN DUEL CLASSÉ', 'multiplayer.rankedFallback': "Repli automatique sur un bot de ton rang si personne n'est trouvé",
  'settings.on': 'Activé', 'settings.off': 'Désactivé',
  'settings.qualityEco': 'Économie', 'settings.qualityBalanced': 'Équilibrée', 'settings.qualityHigh': 'Élevée',
  'settings.scaleSmall': 'Petite', 'settings.scaleNormal': 'Normale', 'settings.scaleLarge': 'Grande',
  'settings.fpsFull': 'Illimité', 'settings.fpsReduced': '60 IPS', 'settings.fpsOff': '30 IPS (économie max.)',
};

const en: Dict = {
  'nav.play': 'Play', 'nav.collection': 'Collection', 'nav.social': 'Social', 'nav.shop': 'Shop', 'nav.settings': 'Settings',
  'common.cards': 'Cards', 'common.decks': 'My Decks', 'common.profile': 'Profile', 'common.trades': 'Trades', 'common.ranking': 'Ranking',
  'settings.title': 'Settings', 'settings.audio': 'Audio', 'settings.music': 'Music', 'settings.musicVolume': 'Music volume', 'settings.sfxVolume': 'SFX volume',
  'settings.display': 'Display & performance', 'settings.quality': 'Visual quality', 'settings.fpsLimit': 'Frame-rate limit', 'settings.uiScale': 'Interface scale', 'settings.glow': 'Glow effects',
  'settings.shake': 'Screen shake', 'settings.fpsCounter': 'FPS counter', 'settings.battery': 'Battery saver', 'settings.vibration': 'Vibration', 'settings.fullscreen': 'Fullscreen',
  'settings.language': 'Language', 'settings.interfaceLanguage': 'Interface language', 'settings.reset': 'Reset', 'settings.resetAll': 'Reset settings', 'settings.danger': 'Danger zone',
  'settings.musicHint': 'Menu theme and duel music.', 'settings.musicOn': 'On', 'settings.musicOff': 'Off',
  'settings.qualityHint': 'Effect and card-render resolution.', 'settings.fpsLimitHint': 'Reduces animations to save battery on mobile.',
  'settings.fpsShown': 'Shown', 'settings.fpsHidden': 'Hidden', 'settings.batteryHint': 'Disables non-essential videos and animations.',
  'settings.fullscreenEnable': 'Enable', 'settings.fullscreenExit': 'Exit',
  'settings.languageHint': 'Multilingual interface active — main screens immediately use the selected language.',
  'settings.resetHint': 'Resets Audio / Display / Language to their defaults. Does not affect your progress (decks, cards, XP).',
  'settings.resetConfirmPrompt': 'Reset all settings (audio, display, language)?',
  'settings.dangerHint': 'Permanently erases all your progress: decks, owned cards, level, XP, wins/losses, campaign, name and saved replays. This action is irreversible.',
  'settings.hardResetButton': 'Restart the game from scratch', 'settings.hardResetTitle': 'Full reset',
  'settings.hardResetWarn1': "You're about to permanently erase all your progress: decks, cards, level, XP, wins, losses, campaign, and saved replays.",
  'settings.hardResetWarn2': "This action is irreversible — there is no way to recover this data afterwards. Make sure you're 100% sure before continuing.",
  'settings.hardResetTypePrompt': 'To confirm, type below:', 'settings.hardResetConfirmButton': 'Delete everything permanently',
  'shop.title': 'Shop', 'shop.open': 'Open', 'shop.open10': 'Open ×10', 'shop.insufficientGold': 'Not enough gold', 'shop.avatars': 'Profile pictures', 'shop.terrains': 'Arenas',
  'duel.yourTurn': 'YOUR TURN', 'duel.enemyTurn': "OPPONENT'S TURN", 'duel.enemyDraw': 'OPPONENT DRAWS…', 'duel.draw': 'DRAW', 'duel.main': 'MAIN', 'duel.battle': 'BATTLE', 'duel.end': 'END',
  'duel.grave': 'GRAVE', 'duel.evosphere': 'EVOSPHERE', 'duel.deck': 'DECK', 'duel.log': 'LOG', 'duel.surrender': 'Surrender', 'duel.restart': 'Restart', 'duel.resume': 'Resume', 'duel.evolve': 'EVOLVE', 'duel.activate': 'Activate', 'duel.close': 'Close', 'duel.cancel': 'Cancel',
  'rarity.common': 'Common', 'rarity.rare': 'Rare', 'rarity.epic': 'Epic', 'rarity.legendary': 'Legendary', 'rarity.mythic': 'Mythic',
  'multiplayer.title': 'Multiplayer',
  'multiplayer.hintPvp': "Looks for a real opponent online; if nobody is found after a short search, a bot takes over — random level in Casual, level matching your rank in Ranked.",
  'multiplayer.hintBotOnly': "No real-time matchmaking server is wired up yet: a bot takes over — random level in Casual, level matching your rank in Ranked.",
  'multiplayer.classic': 'Casual', 'multiplayer.classicDesc': "Duels with no impact on rank. Great for testing a hybrid deck, learning a new archetype, or playing with friends.",
  'multiplayer.classicFallback': 'Automatically falls back to a random-level bot if nobody is found',
  'multiplayer.ranked': 'Ranked', 'multiplayer.rankedDesc': 'Wins and losses shape your status in the Nexus.',
  'multiplayer.searchButton': 'FIND AN OPPONENT', 'multiplayer.searching': 'SEARCHING…',
  'multiplayer.rankedSearchButton': 'START A RANKED DUEL', 'multiplayer.rankedFallback': 'Automatically falls back to a bot matching your rank if nobody is found',
  'settings.on': 'On', 'settings.off': 'Off',
  'settings.qualityEco': 'Battery saver', 'settings.qualityBalanced': 'Balanced', 'settings.qualityHigh': 'High',
  'settings.scaleSmall': 'Small', 'settings.scaleNormal': 'Normal', 'settings.scaleLarge': 'Large',
  'settings.fpsFull': 'Uncapped', 'settings.fpsReduced': '60 FPS', 'settings.fpsOff': '30 FPS (max battery saving)',
};

const es: Dict = { ...en,
  'nav.play':'Jugar','nav.collection':'Colección','nav.social':'Social','nav.shop':'Tienda','nav.settings':'Ajustes','common.cards':'Cartas','common.decks':'Mis mazos','common.profile':'Perfil','common.trades':'Intercambios','common.ranking':'Clasificación',
  'settings.title':'Ajustes','settings.audio':'Audio','settings.music':'Música','settings.musicVolume':'Volumen de música','settings.sfxVolume':'Volumen de efectos','settings.display':'Pantalla y rendimiento','settings.language':'Idioma','settings.interfaceLanguage':'Idioma de la interfaz','shop.title':'Tienda','shop.open':'Abrir','shop.open10':'Abrir ×10','shop.insufficientGold':'Oro insuficiente','duel.yourTurn':'TU TURNO','duel.enemyTurn':'TURNO DEL RIVAL','duel.enemyDraw':'EL RIVAL ROBA…','duel.surrender':'Rendirse','duel.restart':'Reiniciar','duel.resume':'Continuar','duel.evolve':'EVOLUCIONAR','duel.activate':'Activar','duel.close':'Cerrar','duel.cancel':'Cancelar','rarity.common':'Común','rarity.rare':'Rara','rarity.epic':'Épica','rarity.legendary':'Legendaria','rarity.mythic':'Mítica'
};
const de: Dict = { ...en,
  'nav.play':'Spielen','nav.collection':'Sammlung','nav.social':'Sozial','nav.shop':'Shop','nav.settings':'Einstellungen','common.cards':'Karten','common.decks':'Meine Decks','common.profile':'Profil','common.trades':'Tausch','common.ranking':'Rangliste','settings.title':'Einstellungen','settings.music':'Musik','settings.musicVolume':'Musiklautstärke','settings.sfxVolume':'Effektlautstärke','settings.display':'Anzeige & Leistung','settings.language':'Sprache','settings.interfaceLanguage':'Oberflächensprache','shop.open':'Öffnen','shop.open10':'10 öffnen','shop.insufficientGold':'Nicht genug Gold','duel.yourTurn':'DU BIST DRAN','duel.enemyTurn':'GEGNER AM ZUG','duel.enemyDraw':'GEGNER ZIEHT…','duel.surrender':'Aufgeben','duel.restart':'Neustart','duel.resume':'Fortsetzen','duel.evolve':'ENTWICKELN','duel.activate':'Aktivieren','duel.close':'Schließen','duel.cancel':'Abbrechen','rarity.common':'Gewöhnlich','rarity.rare':'Selten','rarity.epic':'Episch','rarity.legendary':'Legendär','rarity.mythic':'Mythisch'
};
const it: Dict = { ...en,
  'nav.play':'Gioca','nav.collection':'Collezione','nav.social':'Social','nav.shop':'Negozio','nav.settings':'Impostazioni','common.cards':'Carte','common.decks':'I miei mazzi','common.profile':'Profilo','common.trades':'Scambi','common.ranking':'Classifica','settings.title':'Impostazioni','settings.music':'Musica','settings.musicVolume':'Volume musica','settings.sfxVolume':'Volume effetti','settings.display':'Schermo e prestazioni','settings.language':'Lingua','settings.interfaceLanguage':'Lingua interfaccia','shop.open':'Apri','shop.open10':'Apri ×10','shop.insufficientGold':'Oro insufficiente','duel.yourTurn':'TOCCA A TE','duel.enemyTurn':'TURNO AVVERSARIO','duel.enemyDraw':'AVVERSARIO PESCA…','duel.surrender':'Abbandona','duel.restart':'Ricomincia','duel.resume':'Riprendi','duel.evolve':'EVOLVI','duel.activate':'Attiva','duel.close':'Chiudi','duel.cancel':'Annulla','rarity.common':'Comune','rarity.rare':'Rara','rarity.epic':'Epica','rarity.legendary':'Leggendaria','rarity.mythic':'Mitica'
};
const pt: Dict = { ...en,
  'nav.play':'Jogar','nav.collection':'Coleção','nav.social':'Social','nav.shop':'Loja','nav.settings':'Definições','common.cards':'Cartas','common.decks':'Meus decks','common.profile':'Perfil','common.trades':'Trocas','common.ranking':'Classificação','settings.title':'Definições','settings.music':'Música','settings.musicVolume':'Volume da música','settings.sfxVolume':'Volume dos efeitos','settings.display':'Ecrã e desempenho','settings.language':'Idioma','settings.interfaceLanguage':'Idioma da interface','shop.open':'Abrir','shop.open10':'Abrir ×10','shop.insufficientGold':'Ouro insuficiente','duel.yourTurn':'A TUA VEZ','duel.enemyTurn':'VEZ DO ADVERSÁRIO','duel.enemyDraw':'ADVERSÁRIO COMPRA…','duel.surrender':'Desistir','duel.restart':'Recomeçar','duel.resume':'Continuar','duel.evolve':'EVOLUIR','duel.activate':'Ativar','duel.close':'Fechar','duel.cancel':'Cancelar','rarity.common':'Comum','rarity.rare':'Rara','rarity.epic':'Épica','rarity.legendary':'Lendária','rarity.mythic':'Mítica'
};
const ja: Dict = { ...en,
  'nav.play':'プレイ','nav.collection':'コレクション','nav.social':'ソーシャル','nav.shop':'ショップ','nav.settings':'設定','common.cards':'カード','common.decks':'デッキ','common.profile':'プロフィール','common.trades':'トレード','common.ranking':'ランキング','settings.title':'設定','settings.music':'音楽','settings.musicVolume':'音楽音量','settings.sfxVolume':'効果音量','settings.display':'表示とパフォーマンス','settings.language':'言語','settings.interfaceLanguage':'表示言語','shop.open':'開封','shop.open10':'10個開封','shop.insufficientGold':'ゴールド不足','duel.yourTurn':'あなたのターン','duel.enemyTurn':'相手のターン','duel.enemyDraw':'相手がドロー…','duel.surrender':'降参','duel.restart':'再開','duel.resume':'続ける','duel.evolve':'進化','duel.activate':'発動','duel.close':'閉じる','duel.cancel':'キャンセル','rarity.common':'コモン','rarity.rare':'レア','rarity.epic':'エピック','rarity.legendary':'レジェンダリー','rarity.mythic':'ミシック'
};
const ko: Dict = { ...en,
  'nav.play':'플레이','nav.collection':'컬렉션','nav.social':'소셜','nav.shop':'상점','nav.settings':'설정','common.cards':'카드','common.decks':'내 덱','common.profile':'프로필','common.trades':'교환','common.ranking':'랭킹','settings.title':'설정','settings.music':'음악','settings.musicVolume':'음악 볼륨','settings.sfxVolume':'효과음 볼륨','settings.display':'화면 및 성능','settings.language':'언어','settings.interfaceLanguage':'인터페이스 언어','shop.open':'열기','shop.open10':'10개 열기','shop.insufficientGold':'골드 부족','duel.yourTurn':'내 턴','duel.enemyTurn':'상대 턴','duel.enemyDraw':'상대가 드로우…','duel.surrender':'항복','duel.restart':'다시 시작','duel.resume':'계속','duel.evolve':'진화','duel.activate':'발동','duel.close':'닫기','duel.cancel':'취소','rarity.common':'일반','rarity.rare':'희귀','rarity.epic':'영웅','rarity.legendary':'전설','rarity.mythic':'신화'
};
const zh: Dict = { ...en,
  'nav.play':'游玩','nav.collection':'收藏','nav.social':'社交','nav.shop':'商店','nav.settings':'设置','common.cards':'卡牌','common.decks':'我的卡组','common.profile':'个人资料','common.trades':'交换','common.ranking':'排名','settings.title':'设置','settings.music':'音乐','settings.musicVolume':'音乐音量','settings.sfxVolume':'音效音量','settings.display':'显示与性能','settings.language':'语言','settings.interfaceLanguage':'界面语言','shop.open':'开启','shop.open10':'开启×10','shop.insufficientGold':'金币不足','duel.yourTurn':'你的回合','duel.enemyTurn':'对手回合','duel.enemyDraw':'对手抽牌…','duel.surrender':'投降','duel.restart':'重新开始','duel.resume':'继续','duel.evolve':'进化','duel.activate':'发动','duel.close':'关闭','duel.cancel':'取消','rarity.common':'普通','rarity.rare':'稀有','rarity.epic':'史诗','rarity.legendary':'传说','rarity.mythic':'神话'
};

export const UI_TRANSLATIONS: Record<Language, Dict> = { fr, en, es, de, it, pt, ja, ko, zh };

export function t(language: Language, key: UiKey): string {
  return EXTRA_TRANSLATIONS[language]?.[key] ?? UI_TRANSLATIONS[language]?.[key] ?? fr[key] ?? key;
}
