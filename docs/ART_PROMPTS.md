# Nexus Card Arena — Brief d'illustration des cartes

Document à donner à ChatGPT (ou tout autre générateur d'images) pour produire
les illustrations des 60 cartes du jeu. Il contient : la direction artistique
commune à coller en premier, les specs techniques, puis un prompt individuel
par carte.

## Comment l'utiliser

1. Colle d'abord la section **Direction artistique commune** dans la
   conversation pour fixer le style.
2. Pour chaque carte, envoie le prompt individuel correspondant (il répète les
   points clés du style pour rester cohérent même dans une nouvelle
   conversation).
3. Enregistre chaque image sous le nom de fichier exact indiqué
   (`{id}.png`) dans `public/cards/` à la racine du projet. Tant qu'un
   fichier n'existe pas, le jeu affiche automatiquement le dos de carte
   générique à la place — aucune casse visuelle en attendant.

## Direction artistique commune

> Illustration de carte à jouer, style dark fantasy médiéval peint
> numériquement (pas de rendu 3D, pas de style cartoon/anime). Inspiration :
> Dark Souls, Elden Ring, Magic: The Gathering, Legends of Runeterra.
> Éclairage dramatique et clair-obscur marqué, textures rugueuses (fer,
> fourrure, pierre, tissu usé), palette sombre et désaturée ponctuée
> d'accents précis : jade/turquoise (`#46d9ad`), or terni (`#f2c56a`),
> rouge sang profond (`#ef6c6c`). Cadrage serré sur le sujet, composition
> dynamique, une seule créature ou scène par carte — jamais de texte, logo,
> cadre de carte, chiffres ni interface dans l'image : uniquement
> l'illustration brute, l'UI du jeu ajoute le texte par-dessus.
>
> Deux factions à distinguer visuellement :
> - **Meute** (loups) : nature sauvage, forêts brumeuses, lune, givre,
>   fourrure, os et lanières de cuir, teintes gris-bleu et argent.
> - **Chevalier** : ordre sacré en décadence, armures dorées ternies,
>   cathédrales et bannières, lumière dorée/blanche perçant les ténèbres.
>
> La rareté indique l'intensité du traitement : **Commune** = sujet simple
> et posé ; **Rare** = léger effet de lumière/magie ; **Épique** = pose
> dynamique en pleine action avec effet visuel marqué ; **Légendaire** =
> échelle épique, composition impressionnante ; **Mythique** (cartes
> évoluées) = version transcendée, plus grande, plus lumineuse ou plus
> menaçante que la carte de base dont elle évolue.

## Spécifications techniques

- Format portrait, ratio proche de 3:4 (ex. 1024×1365 px ou plus), fond
  plein (pas de transparence).
- Un fichier PNG par carte, nommé exactement comme indiqué entre
  backticks ci-dessous.
- Aucun texte, cadre, symbole de coût ou d'attaque dans l'image — géré par
  l'interface.

---

## Meute — cartes de base (niveau 1)

1. **Louve Veilleuse** (Commune) — `louve-veilleuse.png` — Louve gris-argent en position de garde, oreilles dressées, posture protectrice et alerte, lisière de forêt éclairée par la lune.
2. **Loup Éclaireur** (Commune) — `loup-eclaireur.png` — Loup filiforme en pleine traque, museau bas suivant une piste, sous-bois brumeux à l'aube.
3. **Jeune Croc** (Commune) — `jeune-croc.png` — Jeune loup fougueux babines retroussées, pelage brun hirsute, posture rageuse et un peu maladroite.
4. **Loup des Brumes** (Rare) — `loup-des-brumes.png` — Loup spectral émergeant d'une brume épaisse, yeux pâles luminescents, contours flous et fantomatiques.
5. **Chasseuse Grise** (Rare) — `chasseuse-grise.png` — Louve grise musclée bondissant à l'attaque, scène de chasse au crépuscule.
6. **Loup de Givre** (Rare) — `loup-de-givre.png` — Loup couvert de givre, souffle glacé visible, fourrure cristallisée, paysage hivernal désolé.
7. **Pisteur Alpha** (Épique) — `pisteur-alpha.png` — Alpha traqueur balafré hurlant au sommet d'une crête rocheuse, pleine lune en arrière-plan, autorité naturelle.
8. **Loup Sentinelle** (Épique) — `loup-sentinelle.png` — Loup massif harnaché d'os et de cuir, posté entre la meute et le danger, posture protectrice immobile.
9. **Hurleur de Nuit** (Épique) — `hurleur-de-nuit.png` — Loup hurlant sous une lune rouge sang, onde d'énergie ralliant la meute autour de lui.
10. **Croc de Fer** (Légendaire) — `croc-de-fer.png` — Bête colossale aux crocs et griffes semblant forgés de fer, corps couturé de cicatrices, présence terrifiante.
11. **Meute Rassemblée** (Rare, sort) — `meute-rassemblee.png` — Silhouettes de plusieurs loups convergeant depuis l'ombre vers un point de ralliement, clair de lune.
12. **Appel de la Lune** (Rare, sort) — `appel-de-la-lune.png` — Silhouette d'un loup hurlant face à une lune immense, énergie mystique ascendante.
13. **Instinct de Survie** (Commune, sort) — `instinct-de-survie.png` — Œil de loup luminescent seul dans l'obscurité du sous-bois, composition minimaliste et tendue.
14. **Morsure Sauvage** (Rare, sort) — `morsure-sauvage.png` — Gros plan sur des crocs de loup mordant, action viscérale, accents rouge sang.
15. **Territoire Sacré** (Épique, sort) — `territoire-sacre.png` — Totem d'arbre griffé marquant le territoire de la meute, racines luminescentes, esprit du clan.
16. **Emprise de la Meute** (Épique, sort) — `emprise-de-la-meute.png` — Mâchoires de loups spectraux se refermant sur une silhouette ennemie, énergie d'ombre entravante.
17. **Lune Rouge** (Légendaire, sort) — `lune-rouge.png` — Éclipse rouge sang dominant un ciel dramatique au-dessus d'une meute hurlante, puissance déchaînée.
18. **Totem Alpha** (Rare) — `totem-alpha.png` — Totem de bois sculpté en forme de loup, runes tribales gravées, cercle de pierres, énergie protectrice.
19. **Pacte des Crocs** (Commune, sort) — `pacte-des-crocs.png` — Deux museaux de loups se touchant en signe de pacte rituel, symbole gravé dans une écorce voisine.
20. **Dernière Trace** (Rare, sort) — `derniere-trace.png` — Empreinte de patte de loup luminescente dans la neige, menant vers une brume inconnue, magie de pistage.

## Meute — évolutions (niveau 2, Mythique)

21. **Alpha des Brumes** (évolution de Louve Veilleuse) — `evo-louve-veilleuse.png` — Louve alpha imposante enveloppée de brume tourbillonnante, armure légère, regard luminescent, aura de commandement.
22. **Traqueur Lunaire** (évolution de Loup Éclaireur) — `evo-loup-eclaireur.png` — Loup éclaireur baigné de lumière lunaire, marques runiques argentées sur le pelage, concentration prédatrice accrue.
23. **Croc du Premier Sang** (évolution de Jeune Croc) — `evo-jeune-croc.png` — Jeune loup devenu guerrier aguerri, crocs teintés de rouge, museau balafré, trophées de chasse récents.
24. **Spectre de la Meute** (évolution de Loup des Brumes) — `evo-loup-des-brumes.png` — Loup des brumes devenu quasi spectral, forme fumeuse translucide, lueur pâle et hantée.
25. **Matriarche Grise** (évolution de Chasseuse Grise) — `evo-chasseuse-grise.png` — Chasseuse devenue matriarche du clan, louve grise balafrée et royale, entourée de silhouettes de louveteaux.
26. **Fléau de Givre** (évolution de Loup de Givre) — `evo-loup-de-givre.png` — Loup de givre en armure de glace déchiquetée, souffle gelant l'air visiblement, menace glaciale.
27. **Alpha Pisteur** (évolution de Pisteur Alpha) — `evo-pisteur-alpha.png` — Traqueur alpha devenu chef légendaire de la meute, hurlant sur une falaise sous une aurore lunaire.
28. **Gardien du Territoire** (évolution de Loup Sentinelle) — `evo-loup-sentinelle.png` — Sentinelle en armure osseuse renforcée, posture inébranlable, racines et lianes enserrant ses pattes.
29. **Hurleur des Mille Lunes** (évolution de Hurleur de Nuit) — `evo-hurleur-de-nuit.png` — Hurleur entouré d'échos spectraux d'autres loups, résonance mystique de son cri.
30. **Bête de Fer** (évolution de Croc de Fer) — `evo-croc-de-fer.png` — Loup légendaire entièrement cuirassé de métal, yeux incandescents comme une forge, taille colossale et terrifiante.

## Chevalier — cartes de base (niveau 1)

31. **Écuyer Doré** (Commune) — `ecuyer-dore.png` — Jeune écuyer en armure dorée tenant fermement un bouclier, posture brave malgré l'inexpérience.
32. **Novice du Serment** (Commune) — `novice-du-serment.png` — Jeune acolyte agenouillé en prière devant un tome sacré, faible lumière divine.
33. **Lame Blanche** (Commune) — `lame-blanche.png` — Jeune épéiste agile en pleine frappe, lame d'acier clair, posture vive.
34. **Garde du Portail** (Rare) — `garde-du-portail.png` — Garde stoïque au bouclier-tour, bloquant l'entrée d'une porte de château ornée.
35. **Paladin des Cendres** (Rare) — `paladin-des-cendres.png` — Paladin marqué de cendres traversant des ruines fumantes, armure fissurée, détermination sombre.
36. **Chevalier Azur** (Rare) — `chevalier-azur.png` — Chevalier en armure bleue tenant une lance enchantée, énergie glaciale crépitante.
37. **Porte-Étendard** (Épique) — `porte-etendard.png` — Porte-étendard brandissant haut la bannière royale, ralliant les troupes derrière lui.
38. **Sentinelle Dorée** (Épique) — `sentinelle-doree.png` — Garde d'élite en armure dorée, aura de bouclier radiante, immobile devant une entrée de salle du trône.
39. **Duelliste Royal** (Épique) — `duelliste-royal.png` — Duelliste élégant en pleine fente, rapière ornée, cape flottante.
40. **Capitaine du Royaume** (Légendaire) — `capitaine-du-royaume.png` — Capitaine aguerri commandant ses troupes, casque à panache, épée levée sur un champ de bataille.
41. **Ordre de Ralliement** (Rare, sort) — `ordre-de-ralliement.png` — Chevaliers répondant à l'appel d'un cor, émergeant de la brume en formation, bannières levées.
42. **Grande Bibliothèque** (Rare, sort) — `grande-bibliotheque.png` — Vaste bibliothèque royale à la lueur des chandelles, tomes anciens flottants, magie du savoir.
43. **Bouclier de Lumière** (Commune, sort) — `bouclier-de-lumiere.png` — Bouclier sacré lumineux se matérialisant dans les airs, barrière protectrice radiante.
44. **Jugement Solaire** (Rare, sort) — `jugement-solaire.png` — Rayon de lumière solaire s'abattant depuis les cieux, jugement divin.
45. **Bannière du Royaume** (Épique, sort) — `banniere-du-royaume.png` — Bannière royale se déployant dramatiquement, emblème doré, troupes galvanisées.
46. **Sceau d'Immobilité** (Épique, sort) — `sceau-immobilite.png` — Sceau magique lumineux enchaînant les pieds d'un ennemi au sol, chaînes de lumière sacrée.
47. **Aube Victorieuse** (Légendaire, sort) — `aube-victorieuse.png` — Aurore triomphante sur un champ de bataille victorieux, chevaliers en silhouette, lumière dorée du matin.
48. **Reliquaire du Roi** (Rare) — `reliquaire-du-roi.png` — Coffret-reliquaire doré rayonnant de puissance royale, relique gardée de la couronne.
49. **Serment de Garde** (Commune, sort) — `serment-de-garde.png` — Chevalier agenouillé prêtant serment sur son épée, lumière de bougie illuminant le vœu.
50. **Voie du Paladin** (Rare, sort) — `voie-du-paladin.png` — Allée ensoleillée d'une cathédrale menant vers une lumière sacrée lointaine, pèlerinage d'un paladin.

## Chevalier — évolutions (niveau 2, Mythique)

51. **Chevalier d'Or** (évolution d'Écuyer Doré) — `evo-ecuyer-dore.png` — Écuyer devenu chevalier d'or accompli, armure ornée et polie, posture assurée, aura de lumière sacrée.
52. **Paladin du Serment** (évolution de Novice du Serment) — `evo-novice-du-serment.png` — Novice devenu paladin assermenté, épée lumineuse, halo de lumière sacrée.
53. **Lame de l'Aube** (évolution de Lame Blanche) — `evo-lame-blanche.png` — Épéiste devenu maître-lame béni par l'aube, lame blanche laissant une traînée de lumière.
54. **Rempart Royal** (évolution de Garde du Portail) — `evo-garde-du-portail.png` — Garde du portail devenu rempart royal colossal, bouclier massif, présence de forteresse.
55. **Flamme du Royaume** (évolution de Paladin des Cendres) — `evo-paladin-des-cendres.png` — Paladin des cendres renaissant dans les flammes, armure enveloppée de feu royal, résurgence quasi-phénix.
56. **Croisé Azur** (évolution de Chevalier Azur) — `evo-chevalier-azur.png` — Chevalier azur devenu champion croisé, armure bleu profond enchantée, lance glaciale crépitante de puissance.
57. **Maréchal des Bannières** (évolution de Porte-Étendard) — `evo-porte-etendard.png` — Porte-étendard devenu maréchal de campagne, multiples bannières flottantes, autorité sur le champ de bataille.
58. **Gardien du Trône** (évolution de Sentinelle Dorée) — `evo-sentinelle-doree.png` — Garde d'élite devenu gardien du trône, armure dorée radiante, décor imposant de salle du trône.
59. **Champion de la Couronne** (évolution de Duelliste Royal) — `evo-duelliste-royal.png` — Duelliste devenu champion couronné, armure cérémonielle ornée, pose victorieuse d'arène.
60. **Seigneur du Royaume** (évolution de Capitaine du Royaume) — `evo-capitaine-du-royaume.png` — Capitaine devenu seigneur suprême du royaume, armure de plates grandiose, champ de bataille couvert de bannières, échelle légendaire.
