import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PlayerRecruitCard } from "../components/player-recruit-card";

describe("lot mobile premium", () => {
  it("conserve une configuration viewport accessible", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");

    expect(layout).toContain('width: "device-width"');
    expect(layout).toContain("initialScale: 1");
    expect(layout).toContain('viewportFit: "cover"');
    expect(layout).not.toContain("userScalable");
    expect(layout).not.toContain("user-scalable=no");
  });

  it("empêche le zoom iPhone et les débordements globaux", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("input:not([type=\"hidden\"]),");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("font-size: 16px !important");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".football-ball");
  });

  it("rend les contrôles avec des tailles tactiles confortables", () => {
    const inputHtml = renderToStaticMarkup(React.createElement(Input, { name: "email", type: "email" }));
    const buttonHtml = renderToStaticMarkup(React.createElement(Button, null, "Action"));

    expect(inputHtml).toContain("text-base");
    expect(inputHtml).toContain("min-w-0");
    expect(buttonHtml).toContain("min-h-11");
    expect(buttonHtml).toContain("min-w-11");
  });

  it("affiche une création joueur premium mobile-first", () => {
    const playersPage = readFileSync("app/(dashboard)/admin/joueurs/page.tsx", "utf8");
    const recruitHtml = renderToStaticMarkup(React.createElement(PlayerRecruitCard));

    expect(playersPage).toContain("Prêt à rejoindre l’équipe ?");
    expect(playersPage).toContain("Ajouter le joueur");
    expect(playersPage).toContain("sticky bottom-0");
    expect(playersPage).toContain("inputMode=\"decimal\"");
    expect(playersPage).toContain("autoComplete=\"new-password\"");
    expect(recruitHtml).toContain("Un nouveau joueur entre sur le terrain.");
    expect(recruitHtml).toContain("football-ball");
    expect(recruitHtml).toContain("football-goal-line");
  });
});
