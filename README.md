# Friday Match Wallet

Mini-application interne pour gérer le match de football du vendredi.

## Stack

- Next.js 16 avec App Router
- TypeScript strict
- Tailwind CSS
- Prisma ORM + PostgreSQL
- Auth.js
- Zod
- React Hook Form
- date-fns
- lucide-react

## Démarrage

1. Charger NVM et activer Node 22.11.0.
2. Vérifier la version avec `node --version` et obtenir `v22.11.0`.
3. Copier `.env.example` vers `.env.local`.
4. Renseigner `DATABASE_URL`, `AUTH_URL`, `AUTH_SECRET` et `AUTH_TRUST_HOST=true`.
5. Installer les dépendances avec `npm install` ou `npm ci`.
6. Lancer `prisma migrate dev`.
7. Lancer `prisma db seed`.
8. Démarrer l’app avec `npm run dev`.

## Automatisation des sondages

- Synchronisation manuelle ou cron via `npm run polls:sync`
- Ligne cron de production recommandée :

```cron
0 1 * * * cd /chemin/vers/friday-match-wallet && /bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use 22.11.0 >/dev/null && npm run polls:sync'
```

## Sauvegardes PostgreSQL

- Script de backup: `./scripts/backup-db.sh`
- Cron quotidien recommandé:

```cron
0 2 * * * cd /chemin/vers/friday-match-wallet && /bin/bash ./scripts/backup-db.sh
```

- Les sauvegardes sont stockées dans `/var/backups/mini-sporty`
- Les 14 dernières sauvegardes sont conservées automatiquement

### Restauration

1. Choisir le fichier de sauvegarde souhaité dans `/var/backups/mini-sporty`.
2. Restaurer avec:

```bash
gunzip -c /var/backups/mini-sporty/mini-sporty-YYYYMMDD-HHMMSS.sql.gz | psql "$DATABASE_URL"
```

## Sécurité HTTP et Nginx

En production, la plateforme applique déjà des en-têtes de base côté Next.js:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

Variables d’environnement recommandées en production:

- `AUTH_URL=https://sporty.omjep.ma`
- `AUTH_TRUST_HOST=true`
- `AUTH_SECRET=<secret robuste et long>`
- `DATABASE_URL=postgresql://...`

Proposition Nginx complémentaire:

```nginx
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Pour les exports CSV, les reçus PDF et les écrans sensibles, conserver `no-store` côté application afin d’éviter tout cache intermédiaire persistant.

## PWA

- L’application est installable grâce au manifest, aux icônes et au service worker.
- Le bouton `Installer l’application` apparaît quand le navigateur le permet.
- Une page hors ligne est disponible sur `/offline`.

## Déploiement

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run prisma:deploy
```

## Comptes de seed

- Admin: `admin@fridaymatch.local` / `Admin123!`
- Joueurs: `player01@fridaymatch.local` à `player12@fridaymatch.local`
- Mot de passe joueurs: `Player123!`
