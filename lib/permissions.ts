import { Role } from "@prisma/client";

export function isAdmin(role?: Role | null) {
  return role === "ADMIN";
}

export function isCaptain(role?: Role | null) {
  return role === "CAPTAIN";
}

export function canManageSport(role?: Role | null) {
  return isAdmin(role) || isCaptain(role);
}

export function canAccessSensitiveAdmin(role?: Role | null) {
  return isAdmin(role);
}

export function canAccessFinancialAdmin(role?: Role | null) {
  return isAdmin(role);
}

export function canAccessAdmin(role?: Role | null) {
  return canManageSport(role) || canAccessSensitiveAdmin(role);
}

export function roleLabel(role?: Role | null) {
  if (role === "ADMIN") return "ADMIN";
  if (role === "CAPTAIN") return "CAPTAIN";
  return "PLAYER";
}
