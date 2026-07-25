import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function presenceQrSecret() {
  const secret = process.env.PRESENCE_QR_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("PRESENCE_QR_SECRET manquant.");
  }
  return secret;
}

export function createPresenceToken(matchId: string, expiresAt: Date, tokenId = randomBytes(16).toString("base64url")) {
  const payload = `${matchId}:${tokenId}:${expiresAt.toISOString()}`;
  const signature = createHmac("sha256", presenceQrSecret()).update(payload).digest("base64url");
  const token = `${tokenId}.${signature}`;
  return {
    tokenId,
    token,
    tokenHash: hashPresenceToken(token)
  };
}

export function buildPresenceToken(matchId: string, tokenId: string, expiresAt: Date) {
  return createPresenceToken(matchId, expiresAt, tokenId).token;
}

export function hashPresenceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyPresenceToken(matchId: string, tokenId: string, token: string, expiresAt?: Date | null) {
  if (!expiresAt) return false;
  const [receivedTokenId, receivedSignature] = token.split(".");
  if (!receivedTokenId || !receivedSignature) return false;
  if (receivedTokenId !== tokenId) return false;

  const payload = `${matchId}:${tokenId}:${expiresAt.toISOString()}`;
  const expectedSignature = createHmac("sha256", presenceQrSecret()).update(payload).digest("base64url");
  const expectedToken = `${tokenId}.${expectedSignature}`;
  const expectedHash = Buffer.from(hashPresenceToken(expectedToken), "hex");
  const receivedHash = Buffer.from(hashPresenceToken(token), "hex");

  try {
    return timingSafeEqual(expectedHash, receivedHash);
  } catch {
    return false;
  }
}

export function buildPresenceUrl(token: string) {
  const fallbackOrigin = "https://sporty.omjep.ma";
  const configuredOrigin = process.env.APP_URL ?? process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? fallbackOrigin;
  const normalizedOrigin = configuredOrigin.replace(/\/$/, "");
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalOrigin = /localhost|127\.0\.0\.1|:3000/i.test(normalizedOrigin);
  const origin = isProduction && isLocalOrigin ? fallbackOrigin : normalizedOrigin || fallbackOrigin;

  return `${origin}/presence/${encodeURIComponent(token)}`;
}
