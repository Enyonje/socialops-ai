CREATE SCHEMA IF NOT EXISTS "socialops";

-- Initial SocialOps database schema.
-- This migration creates the tables required by the subsequent publication
-- delivery tracking migration.

CREATE TYPE "socialops"."SocialPlatform" AS ENUM (
  'INSTAGRAM',
  'FACEBOOK',
  'LINKEDIN',
  'TIKTOK',
  'YOUTUBE',
  'X',
  'PINTEREST',
  'THREADS'
);

CREATE TYPE "socialops"."ContentStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'FAILED'
);

CREATE TYPE "socialops"."PublicationStatus" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "socialops"."ApprovalStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "socialops"."Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."SocialAccount" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "platform" "socialops"."SocialPlatform" NOT NULL,
  "accountName" TEXT NOT NULL,
  "externalId" TEXT,
  "encryptedToken" TEXT,
  "isDevelopment" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."ContentItem" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "platform" "socialops"."SocialPlatform",
  "status" "socialops"."ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."Publication" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "socialAccountId" TEXT,
  "status" "socialops"."PublicationStatus" NOT NULL DEFAULT 'QUEUED',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."Approval" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "status" "socialops"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."AgentRun" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "result" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."SocialInteraction" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "platform" "socialops"."SocialPlatform" NOT NULL,
  "author" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "SocialInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."AnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "platform" "socialops"."SocialPlatform",
  "metric" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "socialops"."BrandProfile" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "voice" TEXT NOT NULL DEFAULT '',
  "audience" TEXT NOT NULL DEFAULT '',
  "guidelines" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialAccount_workspaceId_platform_accountName_key"
  ON "socialops"."SocialAccount"("workspaceId", "platform", "accountName");

CREATE UNIQUE INDEX "BrandProfile_workspaceId_key"
  ON "socialops"."BrandProfile"("workspaceId");

ALTER TABLE "socialops"."Workspace"
  ADD CONSTRAINT "Workspace_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "socialops"."Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."SocialAccount"
  ADD CONSTRAINT "SocialAccount_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."ContentItem"
  ADD CONSTRAINT "ContentItem_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."Publication"
  ADD CONSTRAINT "Publication_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."Publication"
  ADD CONSTRAINT "Publication_contentItemId_fkey"
  FOREIGN KEY ("contentItemId") REFERENCES "socialops"."ContentItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."Publication"
  ADD CONSTRAINT "Publication_socialAccountId_fkey"
  FOREIGN KEY ("socialAccountId") REFERENCES "socialops"."SocialAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "socialops"."Approval"
  ADD CONSTRAINT "Approval_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."AgentRun"
  ADD CONSTRAINT "AgentRun_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."SocialInteraction"
  ADD CONSTRAINT "SocialInteraction_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."AnalyticsSnapshot"
  ADD CONSTRAINT "AnalyticsSnapshot_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "socialops"."BrandProfile"
  ADD CONSTRAINT "BrandProfile_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "socialops"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
