from __future__ import annotations

from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".meute-image-import"
CARDS = ROOT / "public" / "cards"
BOOSTERS = ROOT / "public" / "boosters"

# Mapping validé à partir des 45 images finales fournies.
# 42 visuels sont utilisés : 5 boosters + 20 cartes de deck + 10 évolutions
# + 6 exclus booster Meute + 1 Mythique. Trois variantes restent volontairement ignorées.
MAPPING = {
    # Boosters boutique
    "ChatGPT Image 8 août 2026, 13_04_22.png": "boosters/meute.png",
    "ChatGPT Image 8 août 2026, 13_06_04.png": "boosters/chevalier.png",
    "ChatGPT Image 8 août 2026, 13_09_27.png": "boosters/orc.png",
    "ChatGPT Image 8 août 2026, 17_08_01.png": "boosters/dragon.png",
    "ChatGPT Image 8 août 2026, 17_11_17.png": "boosters/gobelin.png",

    # Deck Meute — unités
    "ChatGPT Image 8 août 2026, 17_25_52(1).png": "cards/louve-veilleuse.png",
    "ChatGPT Image 8 août 2026, 17_25_47(1).png": "cards/loup-eclaireur.png",
    "ChatGPT Image 8 août 2026, 17_26_07(1).png": "cards/jeune-croc.png",
    "ChatGPT Image 8 août 2026, 17_25_39(1).png": "cards/loup-des-brumes.png",
    "ChatGPT Image 8 août 2026, 17_25_31(1).png": "cards/chasseuse-grise.png",
    "ChatGPT Image 8 août 2026, 17_25_27(1).png": "cards/loup-de-givre.png",
    "ChatGPT Image 8 août 2026, 17_25_20.png": "cards/pisteur-alpha.png",
    "ChatGPT Image 8 août 2026, 17_25_16.png": "cards/loup-sentinelle.png",
    "ChatGPT Image 8 août 2026, 17_26_15(1).png": "cards/hurleur-de-nuit.png",
    "ChatGPT Image 8 août 2026, 17_25_57(1).png": "cards/croc-de-fer.png",

    # Deck Meute — sorts / soutiens
    "ChatGPT Image 8 août 2026, 17_26_27(1).png": "cards/meute-rassemblee.png",
    "ChatGPT Image 8 août 2026, 17_25_00.png": "cards/appel-de-la-lune.png",
    "ChatGPT Image 8 août 2026, 17_24_49.png": "cards/instinct-de-survie.png",
    "ChatGPT Image 8 août 2026, 17_25_07.png": "cards/morsure-sauvage.png",
    "ChatGPT Image 8 août 2026, 17_24_43.png": "cards/territoire-sacre.png",
    "ChatGPT Image 8 août 2026, 17_24_37.png": "cards/emprise-de-la-meute.png",
    "ChatGPT Image 8 août 2026, 17_24_31.png": "cards/lune-rouge.png",
    "ChatGPT Image 8 août 2026, 17_24_22.png": "cards/totem-alpha.png",
    "ChatGPT Image 8 août 2026, 17_24_17.png": "cards/pacte-des-crocs.png",
    "ChatGPT Image 8 août 2026, 17_24_08.png": "cards/derniere-trace.png",

    # Évolutions Meute
    "ChatGPT Image 8 août 2026, 17_25_23.png": "cards/evo-louve-veilleuse.png",      # Alpha des Brumes
    "ChatGPT Image 8 août 2026, 17_25_12.png": "cards/evo-loup-eclaireur.png",      # Traqueur Lunaire
    "ChatGPT Image 8 août 2026, 17_30_09(1).png": "cards/evo-jeune-croc.png",        # Croc du Premier Sang
    "ChatGPT Image 8 août 2026, 17_20_15.png": "cards/evo-loup-des-brumes.png",     # Spectre de la Meute
    "ChatGPT Image 8 août 2026, 17_23_53.png": "cards/evo-chasseuse-grise.png",     # Matriarche Grise
    "ChatGPT Image 8 août 2026, 17_31_40(1).png": "cards/evo-loup-de-givre.png",    # Fléau de Givre
    "ChatGPT Image 8 août 2026, 17_23_45.png": "cards/evo-pisteur-alpha.png",       # Alpha Pisteur
    "ChatGPT Image 8 août 2026, 17_23_20.png": "cards/evo-loup-sentinelle.png",     # Gardien du Territoire
    "ChatGPT Image 8 août 2026, 17_32_56(1).png": "cards/evo-hurleur-de-nuit.png",  # Hurleur des Mille Lunes
    "ChatGPT Image 8 août 2026, 17_34_59(1).png": "cards/evo-croc-de-fer.png",      # Bête de Fer

    # Exclus Booster Meute
    "ChatGPT Image 8 août 2026, 17_28_43(1).png": "cards/eclaireuse-des-crocs.png",
    "ChatGPT Image 8 août 2026, 17_41_04(1).png": "cards/chasseuse-des-ombres.png",
    "ChatGPT Image 8 août 2026, 17_45_48(1).png": "cards/meute-enragee.png",
    "ChatGPT Image 8 août 2026, 17_47_11(1).png": "cards/piege-de-givre.png",
    "ChatGPT Image 8 août 2026, 17_51_24(1).png": "cards/sang-pour-sang.png",
    "ChatGPT Image 8 août 2026, 17_52_45(1).png": "cards/rugissement-de-la-meute.png",

    # Mythique
    "ChatGPT Image 8 août 2026, 18_14_08.png": "cards/mythique-loup-du-nexus.png",
}

# Trois variantes/essais conservés dans les ZIP mais non intégrés.
IGNORED = {
    "ChatGPT Image 8 août 2026, 17_22_03.png",
    "ChatGPT Image 8 août 2026, 17_24_01.png",
    "ChatGPT Image 8 août 2026, 17_25_43(1).png",
}


def extract_all() -> dict[str, Path]:
    if TMP.exists():
        shutil.rmtree(TMP)
    TMP.mkdir(parents=True)
    found: dict[str, Path] = {}
    zips = sorted(ROOT.glob("Nexus_Images_Final_Lot_*.zip"))
    if not zips:
        raise SystemExit("Aucun Nexus_Images_Final_Lot_*.zip trouvé à la racine du dépôt")
    for idx, archive in enumerate(zips):
        dest = TMP / f"lot-{idx:02d}"
        dest.mkdir()
        with zipfile.ZipFile(archive) as zf:
            zf.extractall(dest)
        for path in dest.rglob("*.png"):
            found[path.name] = path
    return found


def main() -> None:
    found = extract_all()
    missing = [src for src in MAPPING if src not in found]
    if missing:
        raise SystemExit("Images attendues absentes :\n- " + "\n- ".join(missing))

    CARDS.mkdir(parents=True, exist_ok=True)
    BOOSTERS.mkdir(parents=True, exist_ok=True)

    for src_name, rel_target in MAPPING.items():
        target = ROOT / "public" / rel_target
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(found[src_name], target)
        print(f"{src_name} -> {target.relative_to(ROOT)}")

    print(f"\n{len(MAPPING)} visuels intégrés.")
    ignored_present = sorted(name for name in IGNORED if name in found)
    print(f"{len(ignored_present)} variantes ignorées :")
    for name in ignored_present:
        print(f"- {name}")

    shutil.rmtree(TMP)


if __name__ == "__main__":
    main()
