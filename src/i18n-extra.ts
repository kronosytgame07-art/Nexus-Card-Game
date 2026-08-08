import type { Language } from './store/game';
import type { UiKey } from './i18n';

type Extra = Partial<Record<UiKey, string>>;

export const EXTRA_TRANSLATIONS: Partial<Record<Language, Extra>> = {
  es: {
    'settings.quality':'Calidad visual','settings.fpsLimit':'Límite de imágenes por segundo','settings.uiScale':'Escala de interfaz','settings.glow':'Efectos luminosos','settings.shake':'Vibración de pantalla','settings.fpsCounter':'Contador FPS','settings.battery':'Ahorro de batería','settings.vibration':'Vibración','settings.fullscreen':'Pantalla completa','settings.reset':'Restablecer','settings.resetAll':'Restablecer ajustes','settings.danger':'Zona peligrosa','shop.avatars':'Imágenes de perfil','shop.terrains':'Arenas','duel.draw':'ROBO','duel.main':'PRINCIPAL','duel.battle':'BATALLA','duel.end':'FIN','duel.grave':'FOSA','duel.evosphere':'EVOSFERA','duel.deck':'MAZO','duel.log':'REGISTRO'
  },
  de: {
    'settings.audio':'Audio','settings.quality':'Grafikqualität','settings.fpsLimit':'Bildratenlimit','settings.uiScale':'Oberflächengröße','settings.glow':'Leuchteffekte','settings.shake':'Bildschirmwackeln','settings.fpsCounter':'FPS-Anzeige','settings.battery':'Akkusparmodus','settings.vibration':'Vibration','settings.fullscreen':'Vollbild','settings.reset':'Zurücksetzen','settings.resetAll':'Einstellungen zurücksetzen','settings.danger':'Gefahrenzone','shop.title':'Shop','shop.avatars':'Profilbilder','shop.terrains':'Arenen','duel.draw':'ZIEHEN','duel.main':'HAUPT','duel.battle':'KAMPF','duel.end':'ENDE','duel.grave':'FRIEDHOF','duel.evosphere':'EVOSPHÄRE','duel.deck':'DECK','duel.log':'PROTOKOLL'
  },
  it: {
    'settings.audio':'Audio','settings.quality':'Qualità visiva','settings.fpsLimit':'Limite fotogrammi','settings.uiScale':'Scala interfaccia','settings.glow':'Effetti luminosi','settings.shake':'Tremolio schermo','settings.fpsCounter':'Contatore FPS','settings.battery':'Risparmio batteria','settings.vibration':'Vibrazione','settings.fullscreen':'Schermo intero','settings.reset':'Ripristino','settings.resetAll':'Ripristina impostazioni','settings.danger':'Zona pericolosa','shop.title':'Negozio','shop.avatars':'Immagini profilo','shop.terrains':'Arene','duel.draw':'PESCA','duel.main':'PRINCIPALE','duel.battle':'BATTAGLIA','duel.end':'FINE','duel.grave':'FOSSA','duel.evosphere':'EVOSFERA','duel.deck':'MAZZO','duel.log':'REGISTRO'
  },
  pt: {
    'settings.audio':'Áudio','settings.quality':'Qualidade visual','settings.fpsLimit':'Limite de imagens por segundo','settings.uiScale':'Escala da interface','settings.glow':'Efeitos luminosos','settings.shake':'Tremor de ecrã','settings.fpsCounter':'Contador FPS','settings.battery':'Poupança de bateria','settings.vibration':'Vibração','settings.fullscreen':'Ecrã inteiro','settings.reset':'Repor','settings.resetAll':'Repor definições','settings.danger':'Zona de perigo','shop.title':'Loja','shop.avatars':'Imagens de perfil','shop.terrains':'Arenas','duel.draw':'COMPRA','duel.main':'PRINCIPAL','duel.battle':'BATALHA','duel.end':'FIM','duel.grave':'FOSSA','duel.evosphere':'EVOSFERA','duel.deck':'DECK','duel.log':'REGISTO'
  },
  ja: {
    'settings.audio':'オーディオ','settings.quality':'画質','settings.fpsLimit':'フレームレート上限','settings.uiScale':'UIサイズ','settings.glow':'発光エフェクト','settings.shake':'画面振動','settings.fpsCounter':'FPS表示','settings.battery':'省電力モード','settings.vibration':'振動','settings.fullscreen':'フルスクリーン','settings.reset':'リセット','settings.resetAll':'設定をリセット','settings.danger':'危険な操作','shop.title':'ショップ','shop.avatars':'プロフィール画像','shop.terrains':'アリーナ','duel.draw':'ドロー','duel.main':'メイン','duel.battle':'バトル','duel.end':'エンド','duel.grave':'墓地','duel.evosphere':'エボスフィア','duel.deck':'デッキ','duel.log':'ログ'
  },
  ko: {
    'settings.audio':'오디오','settings.quality':'화질','settings.fpsLimit':'프레임 제한','settings.uiScale':'인터페이스 크기','settings.glow':'발광 효과','settings.shake':'화면 흔들림','settings.fpsCounter':'FPS 표시','settings.battery':'배터리 절약','settings.vibration':'진동','settings.fullscreen':'전체 화면','settings.reset':'초기화','settings.resetAll':'설정 초기화','settings.danger':'위험 구역','shop.title':'상점','shop.avatars':'프로필 이미지','shop.terrains':'아레나','duel.draw':'드로우','duel.main':'메인','duel.battle':'배틀','duel.end':'엔드','duel.grave':'무덤','duel.evosphere':'에보스피어','duel.deck':'덱','duel.log':'로그'
  },
  zh: {
    'settings.audio':'音频','settings.quality':'画面质量','settings.fpsLimit':'帧率上限','settings.uiScale':'界面缩放','settings.glow':'发光效果','settings.shake':'屏幕震动','settings.fpsCounter':'FPS显示','settings.battery':'省电模式','settings.vibration':'振动','settings.fullscreen':'全屏','settings.reset':'重置','settings.resetAll':'重置设置','settings.danger':'危险区域','shop.title':'商店','shop.avatars':'头像','shop.terrains':'竞技场','duel.draw':'抽牌','duel.main':'主要','duel.battle':'战斗','duel.end':'结束','duel.grave':'墓地','duel.evosphere':'进化领域','duel.deck':'卡组','duel.log':'记录'
  },
};
