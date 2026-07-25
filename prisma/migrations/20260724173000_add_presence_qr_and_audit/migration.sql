DO $$
BEGIN
  CREATE TYPE "PresenceSource" AS ENUM ('QR', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Match"
  ADD COLUMN IF NOT EXISTS "qrTokenId" TEXT,
  ADD COLUMN IF NOT EXISTS "qrTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "qrTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qrDisabledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qrGeneratedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Match_qrTokenId_key" ON "Match"("qrTokenId");

CREATE TABLE IF NOT EXISTS "MatchPresenceLog" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "participantId" TEXT,
  "actorId" TEXT,
  "source" "PresenceSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchPresenceLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MatchPresenceLog_matchId_createdAt_idx" ON "MatchPresenceLog"("matchId", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchPresenceLog_userId_createdAt_idx" ON "MatchPresenceLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchPresenceLog_participantId_idx" ON "MatchPresenceLog"("participantId");

DO $$
BEGIN
  ALTER TABLE "MatchPresenceLog"
    ADD CONSTRAINT "MatchPresenceLog_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "MatchPresenceLog"
    ADD CONSTRAINT "MatchPresenceLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "MatchPresenceLog"
    ADD CONSTRAINT "MatchPresenceLog_participantId_fkey"
    FOREIGN KEY ("participantId") REFERENCES "MatchParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TABLE "MatchPresenceLog"
    ADD CONSTRAINT "MatchPresenceLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
