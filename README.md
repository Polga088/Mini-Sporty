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
4. Renseigner `DATABASE_URL` et `NEXTAUTH_SECRET`.
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
