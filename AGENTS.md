# Mini Sporty Agents Guide

## Projet
- Application Next.js App Router en TypeScript.
- Interface Tailwind CSS avec composants shadcn/ui.
- Donnees via Prisma et PostgreSQL.
- Authentification Auth.js.
- Tests Vitest.
- Application en francais, mobile prioritaire, montants en DH.
- Roles principaux: ADMIN et PLAYER.

## Regles de travail
- Developper uniquement sur Mac local.
- Utiliser le VPS pour le deploiement et les validations, jamais pour developper ou committer directement.
- Conserver la logique metier et les permissions existantes.
- Verifier les permissions cote serveur pour les routes, endpoints et Server Actions.
- Ne jamais journaliser mots de passe, tokens, cookies, secrets ou valeurs sensibles.
- Ne jamais executer `npm audit fix --force`.
- Ne jamais lancer les tests Prisma sur une base non explicitement dediee aux tests.
- Ne jamais utiliser `git add .` sans verifier les fichiers modifies.
- Ne pas faire de commit, push ou deploiement automatiquement.

## Quality Gate
Avant de declarer une tache terminee, executer:

```bash
npm run typecheck
npm run lint
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5433/mini_sporty_test?schema=public' npm test
npm run build
```

Si une validation echoue, corriger ou signaler clairement le blocage.

## Skills disponibles
- `sporty-ui-ux`: UI mobile-first, accessibilite, responsive, menus et modales.
- `receipt-image-design`: evolution progressive des recus vers PNG premium partageables.
- `nextjs-feature-workflow`: workflow fonctionnalite Next.js, Server Actions et Prisma.
- `security-review`: audit Auth.js, permissions, routes directes et operations financieres.
- `testing-quality-gate`: validations obligatoires et securite base de test.
- `safe-git-release`: staging, commit et release sans risque.
- `ui-art-director`: direction artistique avant modification UI importante.
- `sporty-design-system`: regles graphiques et composants visuels reutilisables.
- `visual-regression-review`: revue responsive, overlays, menus, focus et regressions visuelles.

## Conventions Mini Sporty
- Garder les textes visibles en francais.
- Afficher les montants avec le format DH existant.
- Reutiliser les helpers, validateurs, composants et patterns locaux.
- Utiliser des transactions Prisma pour les operations financieres atomiques.
- Ajouter ou adapter les tests quand le comportement utilisateur ou metier change.
