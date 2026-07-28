---
name: receipt-image-design
description: Concevoir progressivement des recus PNG premium pour Mini Sporty, lisibles sur mobile et adaptes au partage WhatsApp.
---

# Receipt Image Design

## Instructions
- Remplacer progressivement les recus PDF par des images PNG seulement quand le besoin est explicite.
- Viser un format premium lisible sur WhatsApp, recommande en 1080 x 1350.
- Afficher logo ou nom Mini Sporty, numero de recu, joueur, montant, ancien solde, nouveau solde, date, validateur et identifiant de verification.
- Generer l'image cote serveur quand c'est necessaire pour la fiabilite et la confidentialite.
- Garantir une generation idempotente: un meme recu garde le meme numero et ne provoque aucun double credit ni double transaction.
- Proposer Voir, Telecharger l'image et Partager sur WhatsApp quand le partage est supporte.
- Ne pas modifier la base de donnees sans necessite demontree.

## Criteres de validation
- Le recu PNG est lisible sur mobile, imprimable et partageable.
- Les donnees sensibles ne sont jamais exposees dans l'URL, les logs ou le stockage client.
- Un recu valide reste accessible uniquement aux roles autorises ou via un token de partage securise.
- Les tests couvrent disponibilite, idempotence, acces non autorise et telechargement.
- Les validations typecheck, lint, tests et build passent.

## Erreurs a eviter
- Generer plusieurs recus pour la meme alimentation.
- Modifier le solde ou creer une transaction lors de la generation visuelle.
- Exposer des secrets, tokens, cookies ou mots de passe dans l'image.
- Pretendre joindre automatiquement un fichier a WhatsApp si le navigateur ne le permet pas.
- Remplacer le PDF existant sans compatibilite ou migration progressive.
