import type { Language } from './store/game';

/**
 * Socle de traduction : les libellés les plus visibles de l'interface sont
 * couverts pour les 9 langues prévues. Le reste du texte de jeu (règles des
 * cartes, campagne...) reste en français pour l'instant — la structure est
 * prête pour être complétée langue par langue sans toucher aux composants.
 */
export const LANGUAGES: Language[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];

export const LANGUAGE_LABELS: Record<Language, string> = {
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

type Dict = Record<string, string>;

const fr: Dict = {
  nav_play: 'Jouer', nav_campaign: 'Campagne', nav_collection: 'Collection', nav_decks: 'Decks',
  nav_profile: 'Profil', nav_ranking: 'Classement', nav_shop: 'Boutique', nav_tutorial: 'Tutoriel', nav_settings: 'Paramètres',
  hp: 'PV', mana: 'Mana', turn: 'Tour', end_turn: 'Fin de tour',
  main_phase: 'Principale', battle_phase: 'Combat',
  play: 'Jouer', activate: 'Activer', cancel: 'Annuler', close: 'Fermer',
  victory: 'Victoire', defeat: 'Défaite', new_duel: 'Nouveau duel',
  options: 'Options', language: 'Langue', music_volume: 'Volume musique', sfx_volume: 'Volume effets',
  graphics_quality: 'Qualité graphique', animations: 'Animations', vibration: 'Vibration',
  show_fps: 'Afficher les FPS', battery_saver: 'Mode batterie', display: 'Affichage',
  fullscreen: 'Plein écran', reset_settings: 'Réinitialiser les paramètres',
};

const en: Dict = {
  nav_play: 'Play', nav_campaign: 'Campaign', nav_collection: 'Collection', nav_decks: 'Decks',
  nav_profile: 'Profile', nav_ranking: 'Ranking', nav_shop: 'Shop', nav_tutorial: 'Tutorial', nav_settings: 'Settings',
  hp: 'HP', mana: 'Mana', turn: 'Turn', end_turn: 'End turn',
  main_phase: 'Main', battle_phase: 'Battle',
  play: 'Play', activate: 'Activate', cancel: 'Cancel', close: 'Close',
  victory: 'Victory', defeat: 'Defeat', new_duel: 'New duel',
  options: 'Options', language: 'Language', music_volume: 'Music volume', sfx_volume: 'SFX volume',
  graphics_quality: 'Graphics quality', animations: 'Animations', vibration: 'Vibration',
  show_fps: 'Show FPS', battery_saver: 'Battery saver', display: 'Display',
  fullscreen: 'Fullscreen', reset_settings: 'Reset settings',
};

const es: Dict = {
  nav_play: 'Jugar', nav_campaign: 'Campaña', nav_collection: 'Colección', nav_decks: 'Mazos',
  nav_profile: 'Perfil', nav_ranking: 'Clasificación', nav_shop: 'Tienda', nav_tutorial: 'Tutorial', nav_settings: 'Ajustes',
  hp: 'PV', mana: 'Maná', turn: 'Turno', end_turn: 'Fin del turno',
  main_phase: 'Principal', battle_phase: 'Combate',
  play: 'Jugar', activate: 'Activar', cancel: 'Cancelar', close: 'Cerrar',
  victory: 'Victoria', defeat: 'Derrota', new_duel: 'Nuevo duelo',
  options: 'Opciones', language: 'Idioma', music_volume: 'Volumen de música', sfx_volume: 'Volumen de efectos',
  graphics_quality: 'Calidad gráfica', animations: 'Animaciones', vibration: 'Vibración',
  show_fps: 'Mostrar FPS', battery_saver: 'Ahorro de batería', display: 'Pantalla',
  fullscreen: 'Pantalla completa', reset_settings: 'Restablecer ajustes',
};

const de: Dict = {
  nav_play: 'Spielen', nav_campaign: 'Kampagne', nav_collection: 'Sammlung', nav_decks: 'Decks',
  nav_profile: 'Profil', nav_ranking: 'Rangliste', nav_shop: 'Shop', nav_tutorial: 'Tutorial', nav_settings: 'Einstellungen',
  hp: 'LP', mana: 'Mana', turn: 'Runde', end_turn: 'Zug beenden',
  main_phase: 'Haupt', battle_phase: 'Kampf',
  play: 'Spielen', activate: 'Aktivieren', cancel: 'Abbrechen', close: 'Schließen',
  victory: 'Sieg', defeat: 'Niederlage', new_duel: 'Neues Duell',
  options: 'Optionen', language: 'Sprache', music_volume: 'Musiklautstärke', sfx_volume: 'Effektlautstärke',
  graphics_quality: 'Grafikqualität', animations: 'Animationen', vibration: 'Vibration',
  show_fps: 'FPS anzeigen', battery_saver: 'Akkusparmodus', display: 'Anzeige',
  fullscreen: 'Vollbild', reset_settings: 'Einstellungen zurücksetzen',
};

const it: Dict = {
  nav_play: 'Gioca', nav_campaign: 'Campagna', nav_collection: 'Collezione', nav_decks: 'Mazzi',
  nav_profile: 'Profilo', nav_ranking: 'Classifica', nav_shop: 'Negozio', nav_tutorial: 'Tutorial', nav_settings: 'Impostazioni',
  hp: 'PV', mana: 'Mana', turn: 'Turno', end_turn: 'Fine turno',
  main_phase: 'Principale', battle_phase: 'Battaglia',
  play: 'Gioca', activate: 'Attiva', cancel: 'Annulla', close: 'Chiudi',
  victory: 'Vittoria', defeat: 'Sconfitta', new_duel: 'Nuovo duello',
  options: 'Opzioni', language: 'Lingua', music_volume: 'Volume musica', sfx_volume: 'Volume effetti',
  graphics_quality: 'Qualità grafica', animations: 'Animazioni', vibration: 'Vibrazione',
  show_fps: 'Mostra FPS', battery_saver: 'Risparmio batteria', display: 'Schermo',
  fullscreen: 'Schermo intero', reset_settings: 'Ripristina impostazioni',
};

const pt: Dict = {
  nav_play: 'Jogar', nav_campaign: 'Campanha', nav_collection: 'Coleção', nav_decks: 'Decks',
  nav_profile: 'Perfil', nav_ranking: 'Classificação', nav_shop: 'Loja', nav_tutorial: 'Tutorial', nav_settings: 'Definições',
  hp: 'PV', mana: 'Mana', turn: 'Turno', end_turn: 'Fim de turno',
  main_phase: 'Principal', battle_phase: 'Combate',
  play: 'Jogar', activate: 'Ativar', cancel: 'Cancelar', close: 'Fechar',
  victory: 'Vitória', defeat: 'Derrota', new_duel: 'Novo duelo',
  options: 'Opções', language: 'Idioma', music_volume: 'Volume da música', sfx_volume: 'Volume dos efeitos',
  graphics_quality: 'Qualidade gráfica', animations: 'Animações', vibration: 'Vibração',
  show_fps: 'Mostrar FPS', battery_saver: 'Poupança de bateria', display: 'Ecrã',
  fullscreen: 'Ecrã inteiro', reset_settings: 'Repor definições',
};

const ja: Dict = {
  nav_play: 'プレイ', nav_campaign: 'キャンペーン', nav_collection: 'コレクション', nav_decks: 'デッキ',
  nav_profile: 'プロフィール', nav_ranking: 'ランキング', nav_shop: 'ショップ', nav_tutorial: 'チュートリアル', nav_settings: '設定',
  hp: 'HP', mana: 'マナ', turn: 'ターン', end_turn: 'ターン終了',
  main_phase: 'メインフェイズ', battle_phase: 'バトルフェイズ',
  play: 'プレイ', activate: '発動', cancel: 'キャンセル', close: '閉じる',
  victory: '勝利', defeat: '敗北', new_duel: '新しいデュエル',
  options: 'オプション', language: '言語', music_volume: '音楽音量', sfx_volume: '効果音音量',
  graphics_quality: 'グラフィック品質', animations: 'アニメーション', vibration: 'バイブレーション',
  show_fps: 'FPS表示', battery_saver: 'バッテリーセーバー', display: '表示',
  fullscreen: 'フルスクリーン', reset_settings: '設定をリセット',
};

const ko: Dict = {
  nav_play: '플레이', nav_campaign: '캠페인', nav_collection: '컬렉션', nav_decks: '덱',
  nav_profile: '프로필', nav_ranking: '랭킹', nav_shop: '상점', nav_tutorial: '튜토리얼', nav_settings: '설정',
  hp: 'HP', mana: '마나', turn: '턴', end_turn: '턴 종료',
  main_phase: '메인 페이즈', battle_phase: '배틀 페이즈',
  play: '플레이', activate: '발동', cancel: '취소', close: '닫기',
  victory: '승리', defeat: '패배', new_duel: '새 듀얼',
  options: '옵션', language: '언어', music_volume: '음악 볼륨', sfx_volume: '효과음 볼륨',
  graphics_quality: '그래픽 품질', animations: '애니메이션', vibration: '진동',
  show_fps: 'FPS 표시', battery_saver: '배터리 절약 모드', display: '화면',
  fullscreen: '전체 화면', reset_settings: '설정 초기화',
};

const zh: Dict = {
  nav_play: '游戏', nav_campaign: '战役', nav_collection: '收藏', nav_decks: '卡组',
  nav_profile: '个人资料', nav_ranking: '排行榜', nav_shop: '商店', nav_tutorial: '教程', nav_settings: '设置',
  hp: '生命值', mana: '法力', turn: '回合', end_turn: '结束回合',
  main_phase: '主要阶段', battle_phase: '战斗阶段',
  play: '打出', activate: '发动', cancel: '取消', close: '关闭',
  victory: '胜利', defeat: '失败', new_duel: '新对局',
  options: '选项', language: '语言', music_volume: '音乐音量', sfx_volume: '音效音量',
  graphics_quality: '画质', animations: '动画', vibration: '振动',
  show_fps: '显示帧率', battery_saver: '省电模式', display: '显示',
  fullscreen: '全屏', reset_settings: '重置设置',
};

const DICTS: Record<Language, Dict> = { fr, en, es, de, it, pt, ja, ko, zh };

export function translate(language: Language, key: string): string {
  return DICTS[language]?.[key] ?? DICTS.fr[key] ?? key;
}
