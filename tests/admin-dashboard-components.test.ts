import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminMatchHero } from "../components/admin-match-hero";
import { PriorityPanel } from "../components/priority-panel";
import { ActivityTimeline, FinanceCard, MetricCard, QuickActionCard } from "../components/premium-dashboard";

describe("dashboard admin premium", () => {
  it("rend le hero avec un vrai prochain match et une progression accessible", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminMatchHero, {
        match: {
          id: "match_1",
          title: "Match du vendredi",
          dateLabel: "vendredi 31 juillet 2026",
          timeLabel: "19:00 - 20:30",
          location: "Terrain Rabat Animation",
          capacity: 16,
          confirmedCount: 12,
          waitlistCount: 2,
          participationFee: 10,
          statusLabel: "Ouvert",
          statusTone: "success"
        }
      })
    );

    expect(html).toContain("Prochain coup d’envoi");
    expect(html).toContain("Match du vendredi");
    expect(html).toContain("12 / 16 confirmés");
    expect(html).toContain("4 places libres");
    expect(html).toContain("2 en attente");
    expect(html).toContain("role=\"progressbar\"");
    expect(html).toContain("aria-valuenow=\"75\"");
    expect(html).toContain("/admin/matchs/match_1");
    expect(html).not.toContain("Réponses de sondage globales");
    expect(html).not.toContain("Total global");
  });

  it("rend un état vide clair quand aucun match à venir n’existe", () => {
    const html = renderToStaticMarkup(React.createElement(AdminMatchHero, { match: null }));

    expect(html).toContain("Aucun match à venir");
    expect(html).toContain("Créez le prochain rendez-vous quand le terrain est confirmé.");
    expect(html).toContain("/admin/matchs/nouveau");
    expect(html).not.toContain("undefined");
  });

  it("rend les priorités actionnables avec des libellés explicites", () => {
    const html = renderToStaticMarkup(
      React.createElement(PriorityPanel, {
        items: [
          {
            href: "/admin/alimentations?status=PENDING",
            label: "Valider les paiements",
            description: "3 demandes en attente côté portefeuille.",
            count: 3,
            badgeLabel: "Finance",
            tone: "warning",
            icon: React.createElement("span", null, "DH")
          },
          {
            href: "/admin/joueurs?status=active",
            label: "Relancer les soldes",
            description: "2 joueurs sous le seuil.",
            count: 2,
            badgeLabel: "Alerte",
            tone: "error",
            icon: React.createElement("span", null, "!")
          }
        ]
      })
    );

    expect(html).toContain("À traiter");
    expect(html).toContain("Les décisions du jour");
    expect(html).toContain("Valider les paiements");
    expect(html).toContain("Relancer les soldes");
    expect(html).toContain("/admin/alimentations?status=PENDING");
    expect(html).toContain("/admin/joueurs?status=active");
  });

  it("rend un état positif compact quand aucune priorité n’est présente", () => {
    const html = renderToStaticMarkup(React.createElement(PriorityPanel, { items: [] }));

    expect(html).toContain("Tout est à jour");
    expect(html).toContain("Aucune action urgente pour le moment.");
  });

  it("rend les indicateurs finance sans couper les montants DH", () => {
    const html = renderToStaticMarkup(
      React.createElement(FinanceCard, {
        balance: React.createElement("span", null, "1 240 DH"),
        pendingTopUps: 2,
        lowBalancePlayers: 1,
        recentInflows: React.createElement("span", null, "300 DH"),
        recentOutflows: React.createElement("span", null, "120 DH"),
        alertThreshold: React.createElement("span", null, "20 DH")
      })
    );

    expect(html).toContain("Solde total des portefeuilles joueurs");
    expect(html).toContain("1 240 DH");
    expect(html).toContain("À valider");
    expect(html).toContain("Soldes faibles");
    expect(html).toContain("Entrées récentes");
    expect(html).toContain("Sorties récentes");
  });

  it("rend la timeline d’activité avec liens fiables et état vide", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActivityTimeline, {
        title: "Activité récente",
        description: "Flux trié.",
        emptyLabel: "Aucune activité récente pour le moment.",
        items: [
          {
            id: "match-1",
            date: new Date("2026-07-31T18:00:00.000Z"),
            href: "/admin/matchs/match-1",
            type: "match",
            title: "Match du vendredi",
            description: "Terrain central · 10 DH",
            meta: "Ouvert",
            tone: "emerald"
          },
          {
            id: "poll-1",
            date: new Date("2026-07-30T18:00:00.000Z"),
            href: "/admin/sondages/poll-1",
            type: "poll",
            title: "Sondage vendredi",
            description: "16 places",
            meta: "ouvert",
            tone: "sky"
          }
        ]
      })
    );

    expect(html).toContain("Ce qui vient de bouger");
    expect(html).toContain("Match du vendredi");
    expect(html).toContain("/admin/matchs/match-1");
    expect(html).toContain("Sondage vendredi");
    expect(html).toContain("/admin/sondages/poll-1");

    const emptyHtml = renderToStaticMarkup(
      React.createElement(ActivityTimeline, {
        title: "Activité récente",
        description: "Flux trié.",
        emptyLabel: "Aucune activité récente pour le moment.",
        items: []
      })
    );

    expect(emptyHtml).toContain("Aucune activité récente pour le moment.");
  });

  it("rend les cartes métriques et raccourcis avec des libellés courts", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        "div",
        null,
        React.createElement(MetricCard, {
          label: "Joueurs actifs",
          value: 24,
          hint: "Comptes joueurs actuellement connectables.",
          icon: React.createElement("span", null, "J")
        }),
        React.createElement(QuickActionCard, {
          href: "/admin/sondages",
          label: "Sondages",
          description: "Ouvrir, suspendre, clôturer.",
          icon: React.createElement("span", null, "S")
        })
      )
    );

    expect(html).toContain("Joueurs actifs");
    expect(html).toContain("Comptes joueurs actuellement connectables.");
    expect(html).toContain("Sondages");
    expect(html).toContain("/admin/sondages");
  });
});
