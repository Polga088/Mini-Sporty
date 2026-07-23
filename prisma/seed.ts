import bcrypt from "bcryptjs";
import {
  ContributionParticipantStatus,
  ContributionStatus,
  MatchParticipantStatus,
  MatchPaymentStatus,
  MatchStatus,
  NotificationType,
  PaymentMethod,
  PrismaClient,
  Role,
  TopUpStatus,
  WalletTransactionType
} from "@prisma/client";
import { getNextFriday } from "../lib/dates";

const prisma = new PrismaClient();

const adminEmail = "admin@fridaymatch.local";
const adminPassword = "Admin123!";
const captainEmail = "captain@fridaymatch.local";
const captainPassword = "Captain123!";
const playerPassword = "Player123!";

const playerSeeds = [
  { name: "Yassine Benali", email: "player01@fridaymatch.local", balance: "60.00" },
  { name: "Siham El Idrissi", email: "player02@fridaymatch.local", balance: "45.00" },
  { name: "Omar Lahcen", email: "player03@fridaymatch.local", balance: "32.00" },
  { name: "Salma Ait", email: "player04@fridaymatch.local", balance: "18.00" },
  { name: "Ayoub Cherkaoui", email: "player05@fridaymatch.local", balance: "70.00" },
  { name: "Imane Rami", email: "player06@fridaymatch.local", balance: "55.00" },
  { name: "Hicham Nouri", email: "player07@fridaymatch.local", balance: "40.00" },
  { name: "Meryem El Fassi", email: "player08@fridaymatch.local", balance: "25.00" },
  { name: "Anas Ziani", email: "player09@fridaymatch.local", balance: "35.00" },
  { name: "Sara Bennis", email: "player10@fridaymatch.local", balance: "50.00" },
  { name: "Hamza Ait", email: "player11@fridaymatch.local", balance: "65.00" },
  { name: "Nour El Amrani", email: "player12@fridaymatch.local", balance: "22.00" }
];

async function main() {
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const playerHash = await bcrypt.hash(playerPassword, 10);
  const nextFriday = getNextFriday(new Date());

  const result = await prisma.$transaction(async (tx) => {
    const admin = await tx.user.upsert({
      where: { email: adminEmail },
      update: {
        name: "Administrateur",
        passwordHash: adminHash,
        role: Role.ADMIN,
        phone: "+212600000000",
        isActive: true
      },
      create: {
        name: "Administrateur",
        email: adminEmail,
        passwordHash: adminHash,
        role: Role.ADMIN,
        phone: "+212600000000"
      }
    });

    await tx.wallet.upsert({
      where: { userId: admin.id },
      update: { balance: "250.00" },
      create: { userId: admin.id, balance: "250.00" }
    });

    const captain = await tx.user.upsert({
      where: { email: captainEmail },
      update: {
        name: "Capitaine",
        passwordHash: await bcrypt.hash(captainPassword, 10),
        role: Role.CAPTAIN,
        phone: "+212600111111",
        isActive: true
      },
      create: {
        name: "Capitaine",
        email: captainEmail,
        passwordHash: await bcrypt.hash(captainPassword, 10),
        role: Role.CAPTAIN,
        phone: "+212600111111"
      }
    });

    await tx.wallet.upsert({
      where: { userId: captain.id },
      update: { balance: "180.00" },
      create: { userId: captain.id, balance: "180.00" }
    });

    const players = [];

    for (const [index, playerSeed] of playerSeeds.entries()) {
      const user = await tx.user.upsert({
        where: { email: playerSeed.email },
        update: {
          name: playerSeed.name,
          passwordHash: playerHash,
          role: Role.PLAYER,
          phone: `+212600000${String(index + 1).padStart(3, "0")}`,
          isActive: true
        },
        create: {
          name: playerSeed.name,
          email: playerSeed.email,
          passwordHash: playerHash,
          role: Role.PLAYER,
          phone: `+212600000${String(index + 1).padStart(3, "0")}`
        }
      });

      await tx.wallet.upsert({
        where: { userId: user.id },
        update: { balance: playerSeed.balance },
        create: { userId: user.id, balance: playerSeed.balance }
      });

      const topUpId = `seed-topup-${index + 1}`;
      const walletTransactionId = `seed-tx-topup-${index + 1}`;

      const topUp = await tx.walletTopUp.upsert({
        where: { id: topUpId },
        update: {
          userId: user.id,
          amount: playerSeed.balance,
          paymentMethod: PaymentMethod.CASH,
          note: "Alimentation initiale du seed",
          proofUrl: null,
          status: TopUpStatus.APPROVED,
          reviewedById: admin.id,
          reviewedAt: new Date()
        },
        create: {
          id: topUpId,
          userId: user.id,
          amount: playerSeed.balance,
          paymentMethod: PaymentMethod.CASH,
          note: "Alimentation initiale du seed",
          status: TopUpStatus.APPROVED,
          reviewedById: admin.id,
          reviewedAt: new Date()
        }
      });

      await tx.walletTransaction.upsert({
        where: { id: walletTransactionId },
        update: {
          walletId: (await tx.wallet.findUnique({ where: { userId: user.id } }))!.id,
          type: WalletTransactionType.TOP_UP,
          amount: playerSeed.balance,
          balanceBefore: "0.00",
          balanceAfter: playerSeed.balance,
          description: `Seed: alimentation initiale de ${playerSeed.name}`,
          referenceType: "WalletTopUp",
          referenceId: topUp.id,
          createdById: admin.id
        },
        create: {
          id: walletTransactionId,
          walletId: (await tx.wallet.findUnique({ where: { userId: user.id } }))!.id,
          type: WalletTransactionType.TOP_UP,
          amount: playerSeed.balance,
          balanceBefore: "0.00",
          balanceAfter: playerSeed.balance,
          description: `Seed: alimentation initiale de ${playerSeed.name}`,
          referenceType: "WalletTopUp",
          referenceId: topUp.id,
          createdById: admin.id
        }
      });

      players.push({ user });
    }

    const pendingTopUpUser = await tx.user.findUnique({
      where: { email: "player05@fridaymatch.local" }
    });

    if (pendingTopUpUser) {
      await tx.walletTopUp.upsert({
        where: { id: "seed-topup-pending" },
        update: {
          userId: pendingTopUpUser.id,
          amount: "40.00",
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          note: "Demande en attente du seed",
          status: TopUpStatus.PENDING,
          proofUrl: null,
          reviewedById: null,
          reviewedAt: null
        },
        create: {
          id: "seed-topup-pending",
          userId: pendingTopUpUser.id,
          amount: "40.00",
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          note: "Demande en attente du seed",
          status: TopUpStatus.PENDING
        }
      });
    }

    const match = await tx.match.upsert({
      where: { id: "seed-match-next-friday" },
      update: {
        title: "Match du vendredi",
        matchDate: nextFriday,
        startTime: "19:00",
        endTime: "21:00",
        location: "Terrain Rabat Animation",
        bookingReference: "RA-2026-001",
        capacity: 12,
        participationFee: "10.00",
        status: MatchStatus.OPEN,
        notes: "Match de démonstration du seed"
      },
      create: {
        id: "seed-match-next-friday",
        title: "Match du vendredi",
        matchDate: nextFriday,
        startTime: "19:00",
        endTime: "21:00",
        location: "Terrain Rabat Animation",
        bookingReference: "RA-2026-001",
        capacity: 12,
        participationFee: "10.00",
        status: MatchStatus.OPEN,
        notes: "Match de démonstration du seed",
        createdById: admin.id
      }
    });

    const confirmedPlayerEmails = [
      "player01@fridaymatch.local",
      "player02@fridaymatch.local",
      "player03@fridaymatch.local",
      "player04@fridaymatch.local"
    ];

    for (const email of confirmedPlayerEmails) {
      const user = await tx.user.findUnique({
        where: { email },
        include: { wallet: true }
      });

      if (!user?.wallet) continue;

      const balanceBefore = user.wallet.balance;
      const participationFee = "10.00";
      const balanceAfter = balanceBefore.sub(participationFee);

      await tx.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: balanceAfter }
      });

      await tx.walletTransaction.upsert({
        where: { id: `seed-match-payment-${email}` },
        update: {
          walletId: user.wallet.id,
          type: WalletTransactionType.MATCH_PAYMENT,
          amount: participationFee,
          balanceBefore,
          balanceAfter,
          description: `Seed: participation au match ${match.title}`,
          referenceType: "Match",
          referenceId: match.id,
          createdById: admin.id
        },
        create: {
          id: `seed-match-payment-${email}`,
          walletId: user.wallet.id,
          type: WalletTransactionType.MATCH_PAYMENT,
          amount: participationFee,
          balanceBefore,
          balanceAfter,
          description: `Seed: participation au match ${match.title}`,
          referenceType: "Match",
          referenceId: match.id,
          createdById: admin.id
        }
      });

      await tx.matchParticipant.upsert({
        where: {
          matchId_userId: { matchId: match.id, userId: user.id }
        },
        update: {
          status: MatchParticipantStatus.CONFIRMED,
          paymentStatus: MatchPaymentStatus.PAID,
          amountCharged: participationFee,
          joinedAt: new Date(),
          cancelledAt: null,
          refundedAt: null
        },
        create: {
          matchId: match.id,
          userId: user.id,
          status: MatchParticipantStatus.CONFIRMED,
          paymentStatus: MatchPaymentStatus.PAID,
          amountCharged: participationFee
        }
      });

      await tx.notification.upsert({
        where: { id: `seed-notification-match-${email}` },
        update: {
          userId: user.id,
          type: NotificationType.MATCH_CONFIRMATION,
          title: "Inscription confirmée",
          message: `Votre participation au match du vendredi a été confirmée.`
        },
        create: {
          id: `seed-notification-match-${email}`,
          userId: user.id,
          type: NotificationType.MATCH_CONFIRMATION,
          title: "Inscription confirmée",
          message: `Votre participation au match du vendredi a été confirmée.`
        }
      });

      if (balanceAfter.lt(20)) {
        await tx.notification.upsert({
          where: { id: `seed-notification-low-balance-${email}` },
          update: {
            userId: user.id,
            type: NotificationType.LOW_BALANCE,
            title: "Solde faible",
            message: `Votre solde est inférieur à 20 DH.`
          },
          create: {
            id: `seed-notification-low-balance-${email}`,
            userId: user.id,
            type: NotificationType.LOW_BALANCE,
            title: "Solde faible",
            message: `Votre solde est inférieur à 20 DH.`
          }
        });
      }
    }

    const contribution = await tx.contribution.upsert({
      where: { id: "seed-contribution-ballon" },
      update: {
        title: "Achat ballon",
        description: "Cotisation exceptionnelle pour financer un ballon de match.",
        amountPerPlayer: "20.00",
        targetAmount: "240.00",
        status: ContributionStatus.ACTIVE,
        dueDate: nextFriday,
        automaticDebit: true
      },
      create: {
        id: "seed-contribution-ballon",
        title: "Achat ballon",
        description: "Cotisation exceptionnelle pour financer un ballon de match.",
        amountPerPlayer: "20.00",
        targetAmount: "240.00",
        status: ContributionStatus.ACTIVE,
        dueDate: nextFriday,
        automaticDebit: true,
        createdById: admin.id
      }
    });

    for (const email of ["player01@fridaymatch.local", "player02@fridaymatch.local", "player06@fridaymatch.local"]) {
      const user = await tx.user.findUnique({
        where: { email },
        include: { wallet: true }
      });

      if (!user?.wallet) continue;

      const contributionFee = "20.00";
      const balanceBefore = user.wallet.balance;
      const balanceAfter = balanceBefore.sub(contributionFee);

      await tx.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: balanceAfter }
      });

      const txId = `seed-contribution-payment-${email}`;
      const payment = await tx.walletTransaction.upsert({
        where: { id: txId },
        update: {
          walletId: user.wallet.id,
          type: WalletTransactionType.CONTRIBUTION_PAYMENT,
          amount: contributionFee,
          balanceBefore,
          balanceAfter,
          description: `Seed: cotisation ${contribution.title}`,
          referenceType: "Contribution",
          referenceId: contribution.id,
          createdById: admin.id
        },
        create: {
          id: txId,
          walletId: user.wallet.id,
          type: WalletTransactionType.CONTRIBUTION_PAYMENT,
          amount: contributionFee,
          balanceBefore,
          balanceAfter,
          description: `Seed: cotisation ${contribution.title}`,
          referenceType: "Contribution",
          referenceId: contribution.id,
          createdById: admin.id
        }
      });

      await tx.contributionParticipant.upsert({
        where: {
          contributionId_userId: { contributionId: contribution.id, userId: user.id }
        },
        update: {
          amount: contributionFee,
          status: ContributionParticipantStatus.PAID,
          paidAt: new Date(),
          walletTransactionId: payment.id
        },
        create: {
          contributionId: contribution.id,
          userId: user.id,
          amount: contributionFee,
          status: ContributionParticipantStatus.PAID,
          paidAt: new Date(),
          walletTransactionId: payment.id
        }
      });
    }

    await tx.expense.upsert({
      where: { id: "seed-expense-water" },
      update: {
        title: "Eau pour le match",
        description: "Achat d'eau pour les joueurs.",
        category: "WATER",
        amount: "25.00",
        expenseDate: nextFriday,
        matchId: match.id,
        contributionId: null,
        receiptUrl: null,
        createdById: admin.id
      },
      create: {
        id: "seed-expense-water",
        title: "Eau pour le match",
        description: "Achat d'eau pour les joueurs.",
        category: "WATER",
        amount: "25.00",
        expenseDate: nextFriday,
        matchId: match.id,
        createdById: admin.id
      }
    });

    await tx.expense.upsert({
      where: { id: "seed-expense-ballon" },
      update: {
        title: "Achat ballon",
        description: "Ballon officiel pour les matchs hebdomadaires.",
        category: "BALL",
        amount: "180.00",
        expenseDate: nextFriday,
        contributionId: contribution.id,
        matchId: null,
        receiptUrl: null,
        createdById: admin.id
      },
      create: {
        id: "seed-expense-ballon",
        title: "Achat ballon",
        description: "Ballon officiel pour les matchs hebdomadaires.",
        category: "BALL",
        amount: "180.00",
        expenseDate: nextFriday,
        contributionId: contribution.id,
        createdById: admin.id
      }
    });

    await tx.notification.upsert({
      where: { id: "seed-general-notification" },
      update: {
        userId: admin.id,
        type: NotificationType.GENERAL,
        title: "Seed initialisé",
        message: "Les données de démonstration ont été générées."
      },
      create: {
        id: "seed-general-notification",
        userId: admin.id,
        type: NotificationType.GENERAL,
        title: "Seed initialisé",
        message: "Les données de démonstration ont été générées."
      }
    });

    return { admin, playersCount: players.length, match, contribution };
  });

    console.log("Seed terminé avec succès.");
    console.log(`Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`Capitaine: ${captainEmail} / ${captainPassword}`);
    console.log(`Joueurs: ${playerSeeds.length} comptes de démonstration créés ou mis à jour.`);
  console.log(`Match seed: ${result.match.title} le ${result.match.matchDate.toISOString()}`);
  console.log(`Cotisation seed: ${result.contribution.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
