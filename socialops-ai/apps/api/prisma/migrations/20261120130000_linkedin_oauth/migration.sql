ALTER TABLE "socialops"."SocialAccount"
  ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "scopes" TEXT;

CREATE TABLE "socialops"."LinkedInOAuthState" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LinkedInOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LinkedInOAuthState_stateHash_key"
  ON "socialops"."LinkedInOAuthState"("stateHash");

CREATE INDEX "LinkedInOAuthState_expiresAt_idx"
  ON "socialops"."LinkedInOAuthState"("expiresAt");

ALTER TABLE "socialops"."LinkedInOAuthState"
  ADD CONSTRAINT "LinkedInOAuthState_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
