# Vérification de Brickville, 19 septembre 2026

## Couverture exécutée

- Compilation TypeScript et version de production réussies.
- 24 tests automatisés du jeu réussis : 73 références du catalogue, dont 2 640 combinaisons pièce/couleur/orientation ; les 15 plaques ; limites et raccords ; empilement sur support uniforme ; refus hors plateau ; retrait ; historique ; reprise ; gestes ; assemblages et géométries.
- 13 parcours Chrome réussis : démarrage/aide, construction tactile, annuler/rétablir, rotation/couleur, suppression de l'objet touché, glissement aller-retour, pincement, rechargement/reprise, confirmations d'effacement, menus et couleurs, aide sur écran bas, sélection des 73 vignettes, accueil paysage.
- 3 cas supplémentaires Chrome : ville de 25 plaques et 1 000 éléments ; sauvegarde corrompue ; stockage refusé et avertissement visible.
- Contrôles d'affichage : 820×1180, 1180×820, 390×844 et 844×390. Captures inspectées ; aucune erreur JavaScript dans les parcours principaux.

## Corrections

- La suppression vise l'objet visible touché, sans dépendre de la taille de la pièce sélectionnée. Les constructions qui portent d'autres éléments sont protégées jusqu'au retrait des éléments supérieurs.
- Les gestes à plusieurs doigts, les déplacements de caméra, les gestes annulés et les clics secondaires ne construisent pas.
- Sauvegarde immédiate, y compris à la fermeture. Échec de stockage affiché ; sauvegardes invalides refusées sans faire planter le jeu. Identifiants uniques entre sessions.
- Rotation cohérente des bâtiments, voiture alignée sur son empreinte, hauteur du bus correcte, pièces placées au-dessus des plaques.
- Suppression des volumes superposés dans le magasin, le commissariat et la caserne. Les couleurs changent les murs sans repeindre les toits et les vitres ; le café peut réellement changer de couleur.
- Passage Construire/Agrandir avec une sélection adaptée, rotation des routes, aperçu complet des bâtiments, croix d'agrandissement actualisées et masquées à la limite de 25 plaques.
- Historique sans actions vides, boutons indisponibles désactivés, confirmation avant de remplacer une sauvegarde par une nouvelle ville, indication des placements refusés.
- Menus tactiles défilables, couleurs nommées en français, boutons de couleur agrandis, accueil lisible et adapté au paysage, aide défilable.
- Libération des anciennes instances graphiques et des géométries d'agrandissement pour éviter leur accumulation pendant une longue partie.

## Rejouer les vérifications

`npm test` : moteur et catalogue.

`npm run build`, puis `npm run preview -- --port 4187` dans un autre terminal.

`npm run test:browser` et `node tests/scale-browser.mjs` : tests sur Chrome installé. L'adresse peut être changée via la variable `BRICKVILLE_URL`.

Les captures et résultats navigateur sont dans `screenshots/` (non publiés dans Git).

## Limites explicites

Ce contrôle parcourt les fonctionnalités et les éléments disponibles, pas toutes les combinaisons possibles d'une construction libre. Aucun essai physique sur la tablette de l'enfant, sur Safari/iPadOS ou de validation auditive des sons. Une ville de 1 000 éléments a été chargée et rendue, sans garantie de fluidité sur toutes les tablettes.

Le jeu conserve ses règles : maximum 25 plaques, support uniforme sous l'empreinte d'une pièce, bâtiments préassemblés retirés en bloc. Pas de simulation de gravité, d'édition des pièces internes d'un bâtiment ou de fonctionnement hors connexion. Les sauvegardes restent locales au navigateur. Les anciennes villes sont conservées ; les corrections d'assemblage des modèles s'appliquent aux bâtiments nouvellement posés.
