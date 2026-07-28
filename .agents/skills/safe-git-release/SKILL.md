---
name: safe-git-release
description: Encadrer les operations Git et release Mini Sporty sans staging large, sans deploiement accidentel et sans travail direct sur VPS.
---

# Safe Git Release

## Instructions
- Travailler sur Mac local; le VPS sert au deploiement et aux validations, pas au developpement direct.
- Ne jamais developper ou committer directement sur le VPS.
- Verifier `git status` et `git diff` avant tout staging.
- Ne jamais utiliser `git add .` sans avoir verifie les fichiers modifies.
- Stager explicitement les fichiers lies a la mission.
- Ne pas pousser, taguer ou deployer sans demande explicite.
- Ne pas modifier ou revert des changements utilisateur non lies a la mission.

## Criteres de validation
- Le diff correspond au perimetre demande.
- Les fichiers generes, secrets, backups et artefacts locaux ne sont pas stages.
- Les validations typecheck, lint, tests et build sont executees avant release.
- Le message de commit decrit le changement reel.
- Les commandes de deploiement sont documentees quand necessaire.

## Erreurs a eviter
- `git add .` reflexe.
- Committer `.env`, backups, logs, captures sensibles ou artefacts non demandes.
- Revert des changements non faits par l'agent.
- Pousser ou deployer automatiquement.
- Corriger directement en production/VPS.
