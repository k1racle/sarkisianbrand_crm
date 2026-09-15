CREATE TABLE "OAuthLoginState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "codeVerifier" TEXT,
    "returnUrl" TEXT NOT NULL DEFAULT '/account',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthLoginState_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SocialLoginTicket" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialLoginTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OAuthLoginState_stateHash_key" ON "OAuthLoginState"("stateHash");
CREATE INDEX "OAuthLoginState_provider_expiresAt_idx" ON "OAuthLoginState"("provider", "expiresAt");
CREATE INDEX "OAuthLoginState_expiresAt_usedAt_idx" ON "OAuthLoginState"("expiresAt", "usedAt");
CREATE UNIQUE INDEX "SocialLoginTicket_tokenHash_key" ON "SocialLoginTicket"("tokenHash");
CREATE INDEX "SocialLoginTicket_userId_expiresAt_idx" ON "SocialLoginTicket"("userId", "expiresAt");
CREATE INDEX "SocialLoginTicket_expiresAt_usedAt_idx" ON "SocialLoginTicket"("expiresAt", "usedAt");
ALTER TABLE "SocialLoginTicket" ADD CONSTRAINT "SocialLoginTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
