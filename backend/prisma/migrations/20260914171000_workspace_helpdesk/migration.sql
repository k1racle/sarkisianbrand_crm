ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONTENT_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MARKETPLACE_MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EXECUTIVE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'IT_SUPPORT';

CREATE TYPE "TicketSource" AS ENUM ('EMPLOYEE', 'B2C', 'B2B', 'SYSTEM');
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'OPEN', 'WAITING_REQUESTER', 'WAITING_INTERNAL', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TABLE "HelpdeskTicket" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "source" "TicketSource" NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "queue" TEXT NOT NULL DEFAULT 'Первая линия',
  "requesterUserId" TEXT,
  "requesterName" TEXT,
  "requesterEmail" TEXT,
  "assignedToId" TEXT,
  "orderId" TEXT,
  "organizationRef" TEXT,
  "affectedService" TEXT,
  "firstResponseDueAt" TIMESTAMP(3),
  "resolutionDueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HelpdeskTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HelpdeskComment" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpdeskComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HelpdeskTicket_number_key" ON "HelpdeskTicket"("number");
CREATE INDEX "HelpdeskTicket_status_priority_idx" ON "HelpdeskTicket"("status", "priority");
CREATE INDEX "HelpdeskTicket_queue_assignedToId_idx" ON "HelpdeskTicket"("queue", "assignedToId");
CREATE INDEX "HelpdeskTicket_requesterUserId_idx" ON "HelpdeskTicket"("requesterUserId");
CREATE INDEX "HelpdeskTicket_createdAt_idx" ON "HelpdeskTicket"("createdAt");
CREATE INDEX "HelpdeskComment_ticketId_createdAt_idx" ON "HelpdeskComment"("ticketId", "createdAt");

ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HelpdeskComment" ADD CONSTRAINT "HelpdeskComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "HelpdeskTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpdeskComment" ADD CONSTRAINT "HelpdeskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
