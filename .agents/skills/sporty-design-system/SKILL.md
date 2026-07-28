---
name: sporty-design-system
description: Documenter et appliquer les regles graphiques existantes de Mini Sporty pour boutons, cartes, badges, tableaux, formulaires, modales, alertes et variantes d'etat.
---

# Sporty Design System

## Regles
- Observer le design system existant avant de proposer une evolution.
- Ne pas imposer arbitrairement une nouvelle palette.
- Identifier les couleurs, espacements, radius, ombres et styles deja utilises.
- Utiliser les tokens, composants reutilisables et helpers locaux.
- Interdire la duplication de composants visuellement equivalents.
- Signaler les incoherences avant de les corriger.
- Garder toute evolution progressive et compatible avec l'existant.

## Workflow
- Auditer les composants concernes: boutons, cartes, badges, tableaux, formulaires, modales et alertes.
- Relever les variantes existantes: success, warning, error, info et neutral.
- Verifier la typographie, la hierarchie des titres et les tailles compactes en dashboard.
- Aligner les nouveaux usages sur les composants partages.
- Extraire un composant seulement si la duplication est reelle et durable.
- Tester le rendu en desktop, tablette et mobile.

## Checklist
- PASS/FAIL: les couleurs et espacements suivent l'existant.
- PASS/FAIL: les boutons, badges et alertes utilisent des variantes coherentes.
- PASS/FAIL: les titres respectent la hierarchie de page, section et carte.
- PASS/FAIL: aucune duplication visuelle inutile n'est ajoutee.
- PASS/FAIL: le changement reste compatible avec les ecrans existants.

## Erreurs a eviter
- Creer un nouveau composant pour un style deja couvert.
- Melanger plusieurs styles de radius, ombres ou boutons sur une meme page.
- Introduire une palette sans audit de l'existant.
- Utiliser des titres trop grands dans les cartes et tableaux.
- Corriger localement en degradant une autre page.
