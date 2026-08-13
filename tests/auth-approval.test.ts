import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountApprovalStatus, Role } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import {
  applyAuthUserToToken,
  applySnapshotToToken,
  applyTokenToSession,
  canAccountSignIn,
  clearAuthToken
} from "../auth";
import { isSessionSnapshotValid, type SessionUserSnapshot } from "../lib/auth-security";
import { NoticeBanner } from "../components/notice-banner";

function approvedSnapshot(role: Role): SessionUserSnapshot {
  return {
    role,
    isActive: true,
    approvalStatus: AccountApprovalStatus.APPROVED,
    mustChangePassword: false,
    sessionVersion: 0,
    passwordChangedAt: new Date("2026-01-01T10:00:00.000Z")
  };
}

function tokenFromSnapshot(snapshot: SessionUserSnapshot): JWT {
  return {
    sub: `${snapshot.role.toLowerCase()}-id`,
    role: snapshot.role,
    isActive: snapshot.isActive,
    approvalStatus: snapshot.approvalStatus,
    mustChangePassword: snapshot.mustChangePassword,
    sessionVersion: snapshot.sessionVersion,
    passwordChangedAt: snapshot.passwordChangedAt?.toISOString() ?? null
  };
}

describe("approbation Auth.js", () => {
  it("autorise les comptes actifs attendus et refuse les joueurs non validés", () => {
    expect(canAccountSignIn({ role: Role.ADMIN, isActive: true, approvalStatus: AccountApprovalStatus.APPROVED })).toBe(true);
    expect(canAccountSignIn({ role: Role.CAPTAIN, isActive: true, approvalStatus: AccountApprovalStatus.APPROVED })).toBe(true);
    expect(canAccountSignIn({ role: Role.ADMIN, isActive: true, approvalStatus: AccountApprovalStatus.PENDING })).toBe(true);
    expect(canAccountSignIn({ role: Role.CAPTAIN, isActive: true, approvalStatus: AccountApprovalStatus.PENDING })).toBe(true);
    expect(canAccountSignIn({ role: Role.PLAYER, isActive: true, approvalStatus: AccountApprovalStatus.APPROVED })).toBe(true);
    expect(canAccountSignIn({ role: Role.PLAYER, isActive: true, approvalStatus: AccountApprovalStatus.PENDING })).toBe(false);
    expect(canAccountSignIn({ role: Role.PLAYER, isActive: true, approvalStatus: AccountApprovalStatus.REJECTED })).toBe(false);
    expect(canAccountSignIn({ role: Role.ADMIN, isActive: false, approvalStatus: AccountApprovalStatus.APPROVED })).toBe(false);
  });

  it("conserve une session valide pour ADMIN, CAPTAIN et PLAYER approuvés", () => {
    for (const role of [Role.ADMIN, Role.CAPTAIN, Role.PLAYER]) {
      const snapshot = approvedSnapshot(role);

      expect(isSessionSnapshotValid(tokenFromSnapshot(snapshot), snapshot)).toBe(true);
    }
  });

  it("ne bloque pas une session staff active à cause du statut d’approbation public", () => {
    for (const role of [Role.ADMIN, Role.CAPTAIN]) {
      const snapshot = {
        ...approvedSnapshot(role),
        approvalStatus: AccountApprovalStatus.PENDING
      };

      expect(isSessionSnapshotValid(tokenFromSnapshot(snapshot), snapshot)).toBe(true);
    }
  });

  it("propage approvalStatus du user vers le JWT puis la session", () => {
    const user = {
      id: "player-id",
      name: "Player Test",
      email: "player@test.local",
      role: Role.PLAYER,
      isActive: true,
      approvalStatus: AccountApprovalStatus.APPROVED,
      mustChangePassword: false,
      sessionVersion: 2,
      passwordChangedAt: "2026-01-01T10:00:00.000Z"
    } satisfies User;

    const token = applyAuthUserToToken({}, user);
    expect(token.approvalStatus).toBe(AccountApprovalStatus.APPROVED);

    const session = applyTokenToSession(
      {
        user: {
          id: "",
          name: null,
          email: null,
          image: null
        },
        expires: "2026-01-01T11:00:00.000Z"
      } satisfies Session,
      token
    );

    expect(session.user.id).toBe("player-id");
    expect(session.user.role).toBe(Role.PLAYER);
    expect(session.user.approvalStatus).toBe(AccountApprovalStatus.APPROVED);
    expect(session.user.isAdmin).toBe(false);
    expect(session.user.isCaptain).toBe(false);
  });

  it("rafraîchit le JWT depuis la base et efface approvalStatus quand la session est invalidée", () => {
    const snapshot = approvedSnapshot(Role.ADMIN);
    const token = applySnapshotToToken({ sub: "admin-id" }, snapshot);

    expect(token.approvalStatus).toBe(AccountApprovalStatus.APPROVED);
    expect(token.passwordChangedAt).toBe("2026-01-01T10:00:00.000Z");

    const cleared = clearAuthToken(token);
    expect(cleared.sub).toBeUndefined();
    expect(cleared.approvalStatus).toBeUndefined();
  });

  it("invalide une ancienne session quand approvalStatus change", () => {
    const oldSnapshot = approvedSnapshot(Role.PLAYER);
    const token = tokenFromSnapshot(oldSnapshot);

    expect(
      isSessionSnapshotValid(token, {
        ...oldSnapshot,
        approvalStatus: AccountApprovalStatus.PENDING
      })
    ).toBe(false);

    expect(
      isSessionSnapshotValid(token, {
        ...oldSnapshot,
        approvalStatus: AccountApprovalStatus.REJECTED
      })
    ).toBe(false);
  });

  it("présente registration_pending comme un état informatif", () => {
    const html = renderToStaticMarkup(React.createElement(NoticeBanner, { error: "registration_pending" }));

    expect(html).toContain("Inscription enregistrée");
    expect(html).toContain("Votre demande a bien été envoyée.");
    expect(html).toContain("En attente de validation");
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Erreur");
    expect(html).not.toContain("bg-red-50");
  });

  it("la page d’accueil redirige un ADMIN valide vers le dashboard admin", () => {
    const homePage = readFileSync("app/page.tsx", "utf8");

    expect(homePage).toContain('if (session?.user?.isAdmin) redirect("/admin")');
  });
});
