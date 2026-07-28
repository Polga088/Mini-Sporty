---
name: sporty-ui-ux
description: Ameliorer l'interface Mini Sporty avec une approche mobile-first, accessible et coherente avec le design system existant.
---

# Sporty UI/UX

## Instructions
- Respecter les composants existants, Tailwind CSS et les conventions shadcn/ui du projet.
- Concevoir mobile-first, puis verifier tablette et desktop.
- Garder toute l'interface en francais et afficher les montants en DH.
- Utiliser des etats loading, empty, error et disabled quand l'action ou la page peut attendre.
- Garantir contraste lisible, focus visible, navigation clavier et zones cliquables confortables.
- Utiliser un Portal pour les menus, popovers ou actions qui risquent d'etre coupes par un tableau, une carte ou un conteneur scrollable.
- Garder les modales non destructives par defaut et confirmer clairement les actions sensibles.

## Criteres de validation
- Les pages principales restent lisibles sur mobile, tablette et desktop.
- Aucun texte de bouton ou menu n'est coupe, masque ou sans contraste.
- Les actions critiques ont confirmation, feedback utilisateur et etat disabled/loading.
- Les composants suivent le design system existant sans refonte non demandee.
- `npm run typecheck`, `npm run lint`, les tests et `npm run build` passent avant validation.

## Erreurs a eviter
- Creer une interface generique, surchargee ou incoherente avec Mini Sporty.
- Cacher les permissions ou erreurs metier uniquement cote UI.
- Utiliser des largeurs fixes qui cassent le responsive.
- Laisser plusieurs menus ouverts ou coupes dans un tableau.
- Modifier la logique metier pour corriger un probleme visuel.
