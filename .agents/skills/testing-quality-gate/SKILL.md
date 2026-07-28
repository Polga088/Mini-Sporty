---
name: testing-quality-gate
description: Appliquer la barriere qualite Mini Sporty avec typecheck, lint, tests Vitest sur base de test et build.
---

# Testing Quality Gate

## Instructions
- Executer les validations avant de declarer une tache terminee.
- Utiliser uniquement une base de donnees explicitement dediee aux tests Prisma.
- Commande de test standard:

```bash
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5433/mini_sporty_test?schema=public' npm test
```

- Sequence de validation:

```bash
npm run typecheck
npm run lint
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5433/mini_sporty_test?schema=public' npm test
npm run build
```

## Criteres de validation
- `npm run typecheck` passe.
- `npm run lint` passe.
- Les tests Vitest passent avec `mini_sporty_test`.
- `npm run build` passe.
- Les echecs sont corriges ou clairement signales avec la cause exacte.

## Erreurs a eviter
- Declarer la tache terminee si une validation echoue.
- Lancer les tests Prisma sans `DATABASE_URL` explicite de test.
- Utiliser `mini_sporty_db`, UAT ou production pour les tests.
- Masquer un test au lieu de corriger la cause.
- Ignorer un echec intermittent.
