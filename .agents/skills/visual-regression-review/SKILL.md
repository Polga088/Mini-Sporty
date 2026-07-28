---
name: visual-regression-review
description: Relire les modifications UI Mini Sporty avant validation pour detecter regressions visuelles, debordements, problemes responsive, z-index, Portals et accessibilite.
---

# Visual Regression Review

## Regles
- Analyser les modifications UI avant validation.
- Verifier desktop, tablette et mobile.
- Tester listes vides, listes longues et textes longs.
- Verifier menus, dropdowns, modales et Portals.
- Controler les debordements horizontaux et verticaux.
- Controler les elements sticky, overlays et z-index.
- Verifier focus clavier, touche Escape et clic exterieur.
- Verifier contrastes, etats disabled et feedback utilisateur.
- Ne pas declarer termine en presence d'un defaut visuel important.

## Workflow
- Identifier les pages et composants impactes par le diff.
- Ouvrir ou inspecter les ecrans representatifs: admin, joueur, mobile et desktop.
- Tester les etats limites: vide, charge, erreur, texte long, derniere ligne de tableau.
- Controler que la correction locale ne degrade pas une autre page.
- Noter les points PASS, FAIL ou NON TESTE.
- Corriger les FAIL bloquants avant la validation finale.

## Checklist
- PASS/FAIL/NON TESTE: desktop.
- PASS/FAIL/NON TESTE: tablette.
- PASS/FAIL/NON TESTE: mobile.
- PASS/FAIL/NON TESTE: menus, dropdowns et Portals.
- PASS/FAIL/NON TESTE: modales, Escape et clic exterieur.
- PASS/FAIL/NON TESTE: listes vides, longues et textes longs.
- PASS/FAIL/NON TESTE: contrastes, disabled et focus clavier.
- PASS/FAIL/NON TESTE: absence de regression sur pages voisines.

## Erreurs a eviter
- Valider uniquement le cas visible au premier chargement.
- Oublier la derniere ligne d'un tableau ou un conteneur scrollable.
- Ignorer un texte coupe, un bouton invisible ou un menu tronque.
- Laisser un overlay sous une carte, un header sticky ou un tableau.
- Marquer PASS sans verification effective.
