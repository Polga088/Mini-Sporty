---
name: nextjs-feature-workflow
description: Guider le developpement de fonctionnalites Mini Sporty avec Next.js App Router, Server Actions, Prisma et TypeScript.
---

# Next.js Feature Workflow

## Instructions
- Lire les pages, Server Actions, validateurs, modeles Prisma et tests existants avant de coder.
- Conserver App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Auth.js et Vitest.
- Preferer les Server Actions existantes et les helpers locaux plutot qu'une nouvelle abstraction.
- Valider les entrees avec Zod ou les validateurs existants.
- Revalider les pages impactees avec `revalidatePath`.
- Conserver les roles ADMIN et PLAYER et les permissions existantes.
- Garder les textes en francais et les montants en DH.

## Criteres de validation
- La fonctionnalite est couverte par tests sur les chemins heureux et erreurs metier.
- Les operations Prisma sensibles sont atomiques quand elles modifient plusieurs tables.
- Les routes directes et actions serveur verifient session et role cote serveur.
- Aucun changement non demande n'est introduit dans les autres modules.
- Typecheck, lint, tests et build passent.

## Erreurs a eviter
- Ajouter une fonctionnalite hors sprint.
- Se fier a l'interface pour bloquer une action sensible.
- Modifier Prisma sans migration claire et necessite demontree.
- Casser les routes joueur/admin existantes.
- Introduire du code anglais visible dans l'interface.
