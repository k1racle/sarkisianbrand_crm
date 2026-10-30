ALTER TABLE "LmsLiveSession" ADD COLUMN "mediaOpen" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "LmsLiveMediaGrant" (
  "id" TEXT NOT NULL,
  "liveSessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userSessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LmsLiveMediaGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LmsLiveMediaGrant_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LmsLiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LmsLiveMediaGrant_liveSessionId_revokedAt_idx" ON "LmsLiveMediaGrant"("liveSessionId", "revokedAt");
CREATE INDEX "LmsLiveMediaGrant_userId_userSessionId_idx" ON "LmsLiveMediaGrant"("userId", "userSessionId");
