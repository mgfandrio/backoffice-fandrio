# FANDRIO · Back-office web

Application web des administrateurs FANDRIO (admin système et admin compagnie), au bureau sur ordinateur. Elle reprend toutes les fonctionnalités admin de l'app mobile et utilise la même API.

## Démarrer

```bash
npm install
cp .env.example .env   # renseigner VITE_API_URL et VITE_API_KEY
npm run dev            # http://localhost:5174
```

- `VITE_API_URL` : adresse de l'API, sans `/api` (ex. `http://localhost:8000`).
- `VITE_API_KEY` : la même clé que l'app mobile (en-tête `X-API-KEY`).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run typecheck` | vérification TypeScript |
| `npm run build` | vérification puis version de production dans `dist/` |

## Organisation

```
src/
  api/          client de l'API (clé, jeton, renouvellement, erreurs) et requêtes partagées
  auth/         session (sessionStorage), connexion, routes protégées par rôle
  components/ui composants du thème Océan (Bouton, Carte, Champ, Pastille, Dialogue…)
  layout/       cadre : menu latéral selon le rôle, barre du haut
  navigation/   menus : toutes les fonctionnalités, avec l'étape qui les livre
  pages/        écrans (compagnie/, systeme/, commun/)
  utils/        formats (ariary, dates)
```

Couleurs : `tailwind.config.js`, identiques à `app-fandrio/app/theme/ocean.ts`.

## Points à connaître

- **Session** : gardée dans l'onglet (sessionStorage). Fermer l'onglet déconnecte. Le jeton expiré est renouvelé automatiquement (`/api/rafraichir-token`) ; sinon retour à la connexion avec un message.
- **Rôles** : 2 = admin compagnie (`/compagnie`), 3 = admin système (`/systeme`). Les comptes clients sont refusés.
- **Raccourci** : F2 ouvre la vente au guichet (admin compagnie).
- **Installable** : Chrome et Edge proposent « Installer l'application » (fichier `public/manifest.webmanifest`).
- **Déploiement** : `npm run build`, puis servir `dist/` en renvoyant toute adresse inconnue vers `index.html` (application à une seule page).
