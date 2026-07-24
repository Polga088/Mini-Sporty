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

## Comptes de seed

- Admin: `admin@fridaymatch.local` / `Admin123!`
- Joueurs: `player01@fridaymatch.local` à `player12@fridaymatch.local`
- Mot de passe joueurs: `Player123!`
