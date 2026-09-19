# Brickville

Jeu de construction en briques, extrait du projet créé avec Grok et rendu autonome. Aucun compte Grok, API, serveur applicatif ni clé secrète nécessaires.

## Utilisation

Ouvrir l'adresse du jeu sur la tablette. Dans Safari ou Chrome, utiliser le menu de partage ou le menu du navigateur pour ajouter le jeu à l'écran d'accueil.

Les constructions sont enregistrées dans ce navigateur, sur cet appareil. Elles ne sont pas synchronisées entre appareils et peuvent disparaître si les données du navigateur sont effacées. Les anciennes sauvegardes sur l'adresse Grok ne se transfèrent pas automatiquement. Une connexion Internet est nécessaire pour charger le jeu.

## Développement

Node.js 22. Installer avec `npm ci`, lancer avec `npm run dev`, vérifier et compiler avec `npm run build`.

## Publication

Le dépôt publie le dossier `docs` de la branche `main` avec GitHub Pages. Après une modification, lancer `npm run build`, remplacer le contenu de `docs` par celui de `dist` en conservant `docs/.nojekyll`, puis envoyer le commit sur GitHub. Les chemins relatifs permettent un hébergement sous `/brickville/`.

Avec GitHub Free, GitHub Pages nécessite un dépôt public. Le jeu publié est accessible à toute personne qui possède son adresse.
