from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src' / 'App.tsx'
CSS = ROOT / 'src' / 'styles.css'

app = APP.read_text(encoding='utf-8')

helper_anchor = "const BOOSTERS: { id: Faction; name: string; price: number; blurb: string; available?: boolean }[] = ["
helper = """function boosterArtwork(faction: Faction): string {\n  return `${import.meta.env.BASE_URL}boosters/${faction.toLowerCase()}.png`;\n}\n\nfunction rarityAuraClass(rarity: Rarity): string {\n  if (rarity === 'Mythique') return 'rarity-mythique';\n  if (rarity === 'Légendaire') return 'rarity-legendaire';\n  if (rarity === 'Épique') return 'rarity-epique';\n  if (rarity === 'Rare') return 'rarity-rare';\n  return 'rarity-commune';\n}\n\n"""

# Rarity est déjà exportée par les types du moteur : on complète uniquement l'import si nécessaire.
old_import = "import { CardDef, Faction, FieldUnit, GameState, SupportCard } from './engine/types';"
new_import = "import { CardDef, Faction, FieldUnit, GameState, Rarity, SupportCard } from './engine/types';"
if old_import in app:
    app = app.replace(old_import, new_import, 1)

if 'function boosterArtwork(' not in app:
    if helper_anchor not in app:
        raise SystemExit('Ancre BOOSTERS introuvable')
    app = app.replace(helper_anchor, helper + helper_anchor, 1)

old_article = '<article key={booster.id} className="options-card">\n              <b>{booster.name}</b>'
new_article = '<article key={booster.id} className="options-card booster-product-card">\n              <img className="booster-shop-art" src={boosterArtwork(booster.id)} alt={booster.name} loading="lazy" />\n              <b className="booster-product-title">{booster.name}</b>'
if old_article in app:
    app = app.replace(old_article, new_article, 1)
elif 'className="options-card booster-product-card"' not in app:
    raise SystemExit('Bloc produit booster introuvable')

old_pack = '<div className="booster-pack-shell"><span>NEXUS</span><b>{reveal.faction}</b><i /></div><div className="booster-tear-line" />'
new_pack = '<img className="booster-pack-art" src={boosterArtwork(reveal.faction)} alt={`Booster ${reveal.faction}`} /><div className="booster-tear-line" />'
if old_pack in app:
    app = app.replace(old_pack, new_pack, 1)
elif 'className="booster-pack-art"' not in app:
    raise SystemExit('Ancienne pochette CSS introuvable')

old_pull = "className={'booster-pull-card ' + (card.rarity === 'Mythique' ? 'mythic-pull' : '')}"
new_pull = "className={'booster-pull-card ' + rarityAuraClass(card.rarity) + (card.rarity === 'Mythique' ? ' mythic-pull' : '')}"
if old_pull in app:
    app = app.replace(old_pull, new_pull, 1)
elif 'rarityAuraClass(card.rarity)' not in app:
    raise SystemExit('Classe des cartes révélées introuvable')

APP.write_text(app, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
marker = '/* NEXUS BOOSTER ARTWORK 2026 */'
if marker not in css:
    css += r'''\n\n/* NEXUS BOOSTER ARTWORK 2026 */
.booster-product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.booster-shop-art {
  display: block;
  width: min(100%, 260px);
  aspect-ratio: 2 / 3;
  object-fit: contain;
  margin: .15rem auto .45rem;
  filter: drop-shadow(0 18px 24px rgba(0,0,0,.42));
  transition: transform .22s ease, filter .22s ease;
}

.booster-product-card:hover .booster-shop-art {
  transform: translateY(-5px) scale(1.025);
  filter: drop-shadow(0 22px 30px rgba(0,0,0,.58));
}

.booster-product-title {
  display: block;
  width: 100%;
  text-align: center;
  font-size: 1.06rem;
  margin-bottom: .4rem;
}

.booster-pack-animation {
  position: relative;
  display: grid;
  place-items: center;
}

.booster-pack-art {
  display: block;
  width: min(32vw, 290px);
  max-height: 42vh;
  object-fit: contain;
  filter: drop-shadow(0 22px 38px rgba(0,0,0,.62));
  transform-origin: center top;
  animation: nexus-booster-arrive .5s cubic-bezier(.2,.8,.2,1) both;
}

.booster-tear-line {
  position: absolute;
  left: 50%;
  top: 10%;
  width: min(30vw, 270px);
  height: 3px;
  transform: translateX(-50%) scaleX(0);
  transform-origin: left center;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.98), transparent);
  box-shadow: 0 0 16px rgba(255,255,255,.9);
  animation: nexus-booster-tear .46s .35s ease-out forwards;
  pointer-events: none;
}

@keyframes nexus-booster-arrive {
  from { opacity: 0; transform: translateY(-26px) scale(.9) rotate(-1deg); }
  to { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
}

@keyframes nexus-booster-tear {
  0% { opacity: 0; transform: translateX(-50%) scaleX(0); }
  45% { opacity: 1; }
  100% { opacity: 0; transform: translateX(-50%) scaleX(1); }
}

.booster-pull-card {
  border-radius: 14px;
  transition: filter .25s ease, box-shadow .25s ease, transform .25s ease;
}
.booster-pull-card.rarity-commune { box-shadow: 0 0 18px rgba(235,240,255,.28); }
.booster-pull-card.rarity-rare { box-shadow: 0 0 25px rgba(50,145,255,.72), 0 0 55px rgba(50,145,255,.26); }
.booster-pull-card.rarity-epique { box-shadow: 0 0 28px rgba(170,65,255,.9), 0 0 68px rgba(170,65,255,.34); }
.booster-pull-card.rarity-legendaire { box-shadow: 0 0 32px rgba(255,191,45,.92), 0 0 74px rgba(255,191,45,.38); }
.booster-pull-card.rarity-mythique { box-shadow: 0 0 36px rgba(255,42,42,1), 0 0 88px rgba(255,42,42,.52); }
.booster-card-fan.revealed .booster-pull-card.rarity-epique,
.booster-card-fan.revealed .booster-pull-card.rarity-legendaire,
.booster-card-fan.revealed .booster-pull-card.rarity-mythique {
  animation: nexus-rarity-pulse 1.45s ease-in-out infinite alternate;
}
@keyframes nexus-rarity-pulse {
  from { filter: brightness(1); }
  to { filter: brightness(1.16) saturate(1.18); }
}

@media (max-height: 650px) and (orientation: landscape) {
  .booster-shop-art { width: min(22vh, 170px); }
  .booster-pack-art { width: min(24vw, 190px); max-height: 34vh; }
}
'''
    CSS.write_text(css, encoding='utf-8')

print('Boutique et ouverture boosters mises à jour.')
