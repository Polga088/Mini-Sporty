import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FilterBar } from "../components/filter-bar";
import { FormSection } from "../components/form-section";
import { PageContainer } from "../components/page-container";
import { PageHeader } from "../components/page-header";
import { SectionHeader } from "../components/section-header";
import { StatusBadge } from "../components/status-badge";

describe("fondations visuelles Mini Sporty", () => {
  it("structure un conteneur de page responsive et borne la largeur", () => {
    const html = renderToStaticMarkup(React.createElement(PageContainer, null, "Contenu"));

    expect(html).toContain("max-w-7xl");
    expect(html).toContain("px-4");
    expect(html).toContain("Contenu");
  });

  it("affiche un en-tête de page avec titre, description et action", () => {
    const html = renderToStaticMarkup(
      React.createElement(PageHeader, {
        eyebrow: "Administration",
        title: "Sondages",
        description: "Piloter les réponses du vendredi.",
        primaryAction: React.createElement("a", { href: "/admin/sondages/nouveau" }, "Nouveau sondage")
      })
    );

    expect(html).toContain("Administration");
    expect(html).toContain("Sondages");
    expect(html).toContain("Piloter les réponses du vendredi.");
    expect(html).toContain("Nouveau sondage");
  });

  it("rend les sections, filtres et statuts avec des libellés visibles", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        FormSection as React.ComponentType<{
          title: React.ReactNode;
          description?: React.ReactNode;
          actions?: React.ReactNode;
        }>,
        {
          title: "Informations",
          description: "Champs principaux",
          actions: React.createElement("button", { type: "button" }, "Enregistrer")
        },
        React.createElement(
          FilterBar as React.ComponentType<{ actions?: React.ReactNode }>,
          {
            key: "filters",
            actions: React.createElement("button", { type: "reset" }, "Réinitialiser")
          },
          React.createElement("input", { name: "search", "aria-label": "Recherche" })
        ),
        React.createElement(StatusBadge, { key: "status", tone: "success", label: "Ouvert" })
      )
    );

    expect(html).toContain("Informations");
    expect(html).toContain("Champs principaux");
    expect(html).toContain("Réinitialiser");
    expect(html).toContain("Enregistrer");
    expect(html).toContain("Ouvert");
    expect(html).toContain("bg-emerald-100");
  });

  it("conserve une hiérarchie de section simple", () => {
    const html = renderToStaticMarkup(
      React.createElement(SectionHeader, {
        title: "Activité récente",
        description: "Dernières opérations"
      })
    );

    expect(html).toContain("<h2");
    expect(html).toContain("Activité récente");
    expect(html).toContain("Dernières opérations");
  });
});
