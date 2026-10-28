import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';

export const BUSINESS_CONSENT_POLICY = 'business-access-2026-10-26';
export const BUSINESS_CONSENT_TEXT = 'Принимаю политику конфиденциальности и публичную оферту.';
export type BusinessRequestContext = { ipAddress?: string; userAgent?: string };
type TermsDatabase = Pick<Prisma.TransactionClient, 'storefrontPage'>;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The version changes with the actual published legal text, not only its URL. */
export async function loadBusinessTerms(db: TermsDatabase) {
  const pages = await db.storefrontPage.findMany({ where: { slug: { in: ['privacy', 'oferta'] }, isActive: true }, select: { slug: true, title: true, lead: true, blocks: true, revision: true, reviewRequired: true }, orderBy: { slug: 'asc' } });
  if (pages.length !== 2) throw new ServiceUnavailableException('Условия регистрации временно недоступны. Попробуйте позже.');
  const snapshots = pages.map(page => ({ ...page, url: `/${page.slug}` }));
  const version = sha256(JSON.stringify({ policy: BUSINESS_CONSENT_POLICY, text: BUSINESS_CONSENT_TEXT, documents: snapshots }));
  return { version, policyVersion: BUSINESS_CONSENT_POLICY, documents: snapshots.map(page => ({ url: page.url, revision: page.revision, sha256: sha256(JSON.stringify(page)) })), snapshots };
}

export async function recordBusinessConsent(tx: Prisma.TransactionClient, userId: string, organizationId: string, context: BusinessRequestContext, source: string, expectedVersion: string) {
  // A document edited during registration cannot silently change the edition
  // accepted by the applicant. Publication waits until this transaction ends.
  await tx.$queryRaw`SELECT slug FROM "StorefrontPage" WHERE slug IN ('privacy', 'oferta') FOR SHARE`;
  const terms = await loadBusinessTerms(tx);
  if (terms.version !== expectedVersion) throw new ConflictException({ code: 'BUSINESS_TERMS_CHANGED', message: 'Условия обновились. Откройте документы и подтвердите согласие ещё раз.' });
  await tx.auditLog.create({ data: { actorId: userId, action: 'ACCEPT_TERMS', resource: 'business-consent', resourceId: organizationId, ipAddress: context.ipAddress?.slice(0, 80), userAgent: context.userAgent?.slice(0, 1000), payload: { accepted: true, acceptedAt: new Date().toISOString(), source, policyVersion: terms.policyVersion, termsVersion: terms.version, text: BUSINESS_CONSENT_TEXT, documents: terms.snapshots } } });
}
