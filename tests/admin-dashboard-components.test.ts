import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminMatchHero } from "../components/admin-match-hero";
import { PriorityPanel } from "../components/priority-panel";

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

    expect(html).toContain("Prochain rendez-vous");
    expect(html).toContain("Match du vendredi");
    expect(html).toContain("12 / 16 confirmés");
    expect(html).toContain("4 places restantes");
    expect(html).toContain("2 en liste d’attente");
    expect(html).toContain("role=\"progressbar\"");
    expect(html).toContain("aria-valuenow=\"75\"");
    expect(html).toContain("/admin/matchs/match_1");
    expect(html).not.toContain("Réponses de sondage globales");
    expect(html).not.toContain("Total global");
  });

  it("rend un état vide clair quand aucun match à venir n’existe", () => {
    const html = renderToStaticMarkup(React.createElement(AdminMatchHero, { match: null }));

    expect(html).toContain("Aucun match à venir");
    expect(html).toContain("Créez le prochain rendez-vous pour lancer les inscriptions.");
    expect(html).toContain("/admin/matchs/nouveau");
    expect(html).not.toContain("undefined");
  });

  it("rend les priorités actionnables avec des libellés explicites", () => {
    const html = renderToStaticMarkup(
      React.createElement(PriorityPanel, {
        items: [
          {
            href: "/admin/alimentations?status=PENDING",
            label: "3 alimentations à valider",
            description: "Demandes joueur en attente de validation administrative.",
            count: 3,
            badgeLabel: "À valider",
            tone: "warning",
            icon: React.createElement("span", null, "DH")
          },
          {
            href: "/admin/joueurs?status=active",
            label: "2 joueurs avec un solde faible",
            description: "Portefeuilles actifs sous le seuil.",
            count: 2,
            badgeLabel: "Solde faible",
            tone: "error",
            icon: React.createElement("span", null, "!")
          }
        ]
      })
    );

    expect(html).toContain("À traiter");
    expect(html).toContain("3 alimentations à valider");
    expect(html).toContain("2 joueurs avec un solde faible");
    expect(html).toContain("/admin/alimentations?status=PENDING");
    expect(html).toContain("/admin/joueurs?status=active");
  });

  it("rend un état positif compact quand aucune priorité n’est présente", () => {
    const html = renderToStaticMarkup(React.createElement(PriorityPanel, { items: [] }));

    expect(html).toContain("Tout est à jour");
    expect(html).toContain("Aucune action urgente pour le moment.");
  });
});
