---
name: security-review
description: Auditer les changements Mini Sporty avec attention aux sessions Auth.js, permissions, routes directes et operations financieres.
---

# Security Review

## Instructions
- Controler l'authentification et les autorisations cote serveur pour chaque route, endpoint et Server Action.
- Ne jamais se fier uniquement a l'interface pour appliquer une permission.
- Verifier les acces directs aux routes admin, recus, PDF, exports, QR et endpoints.
- Ne jamais journaliser mots de passe, tokens, cookies, secrets ou donnees de session.
- Verifier l'idempotence des operations financieres et l'absence de double debit, double credit ou double transaction.
- Signaler clairement tout risque avant une modification risquee.
- Ne jamais executer `npm audit fix --force`.

## Criteres de validation
- ADMIN et PLAYER ont des droits coherents avec la matrice du projet.
- Les joueurs non autorises ne peuvent pas lire les donnees d'autres joueurs.
- Les operations wallet conservent `balanceBefore`, `balanceAfter`, auteur et transaction associee.
- Les cookies, redirections et callbacks Auth.js restent securises.
- Les tests couvrent refus d'acces, IDOR, idempotence et routes directes.

## Erreurs a eviter
- Exposer un identifiant previsible sans controle d'acces.
- Mettre un secret dans l'URL, localStorage, logs ou reponse publique.
- Corriger une faille uniquement dans le JSX.
- Relacher une permission pour simplifier un test.
- Utiliser ou reinitialiser une base qui n'est pas explicitement de test.
