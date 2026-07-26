import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PasswordResetModal } from "../components/password-reset-modal";

vi.mock("@/app/actions/players", () => ({
  clearPasswordResetFlash: vi.fn()
}));

describe("modale de réinitialisation du mot de passe", () => {
  it("affiche le mot de passe temporaire et les actions explicites", () => {
    const html = renderToStaticMarkup(
      createElement(PasswordResetModal, {
        playerName: "Joueur Test",
        temporaryPassword: "Fm-ab12cd34-2026!"
      })
    );

    expect(html).toContain("Mot de passe temporaire");
    expect(html).toContain("Joueur Test");
    expect(html).toContain("Fm-ab12cd34-2026!");
    expect(html).toContain("Ce mot de passe ne sera plus affiché après la fermeture.");
    expect(html).toContain("Copier");
    expect(html).toContain("J’ai copié, fermer");
    expect(html).toContain("aria-modal=\"true\"");
  });
});
