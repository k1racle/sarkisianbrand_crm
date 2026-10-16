import { PartnerDocumentsService } from './partner-documents.service';

describe('PartnerDocumentsService', () => {
  const setup = (taxStatus: string, entityType: string) => {
    const prisma: any = {
      partnerParticipant: { findUnique: jest.fn().mockResolvedValue({ id: 'partner-1', status: 'ACTIVE' }) },
      partnerLegalProfile: { findUnique: jest.fn().mockResolvedValue({ taxStatus, fullName: 'Тестовый Исполнитель', inn: taxStatus === 'SELF_EMPLOYED' ? '123456789012' : '1234567890', ogrnip: taxStatus === 'INDIVIDUAL_ENTREPRENEUR' ? '123456789012345' : null, address: 'Москва, Тестовая улица, 1' }) },
      partnerLegalEntity: { findUnique: jest.fn().mockResolvedValue({ id: 'entity-1', entityType, legalName: entityType === 'LLC' ? 'ООО «Тест»' : 'ИП Тестов Тест Тестович', inn: entityType === 'LLC' ? '1234567890' : '123456789012', kpp: entityType === 'LLC' ? '123456789' : null, ogrn: entityType === 'LLC' ? '1234567890123' : null, ogrnip: entityType === 'IP' ? '123456789012345' : null, address: 'Москва, Юридическая улица, 2', signerName: 'Тестов Тест Тестович', signerTitle: entityType === 'LLC' ? 'Генеральный директор' : null, signerBasis: entityType === 'LLC' ? 'Устав' : 'запись о регистрации', isActive: true }) },
      partnerProgramSetting: { findUnique: jest.fn().mockResolvedValue({ customerRewardMode: 'PERCENT', rewardPercent: 7, fixedCustomerRewardAmount: 300, signupRewardAmount: 2500, signupRewardUnit: 'RUB', attributionDays: 30, holdDays: 14, minimumOrderAmount: 1000 }) },
      partnerReward: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 5000 }, _count: { _all: 3 } }) },
      partnerPayout: { findFirst: jest.fn().mockResolvedValue(null) },
      partnerGeneratedDocument: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `doc-${data.documentType}`, ...data, createdAt: new Date() })) },
      partnerDocumentTemplateVersion: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue({ id: 'default' }), upsert: jest.fn() },
    };
    return { service: new PartnerDocumentsService(prisma), prisma };
  };

  test.each([
    ['REFERRAL', 'SELF_EMPLOYED', 'IP'],
    ['REFERRAL', 'SELF_EMPLOYED', 'LLC'],
    ['REFERRAL', 'INDIVIDUAL_ENTREPRENEUR', 'IP'],
    ['REFERRAL', 'INDIVIDUAL_ENTREPRENEUR', 'LLC'],
    ['BLOGGER', 'SELF_EMPLOYED', 'IP'],
    ['BLOGGER', 'SELF_EMPLOYED', 'LLC'],
    ['BLOGGER', 'INDIVIDUAL_ENTREPRENEUR', 'IP'],
    ['BLOGGER', 'INDIVIDUAL_ENTREPRENEUR', 'LLC'],
  ])('generates the complete editable draft pack for %s / %s with customer side %s', async (kind, taxStatus, entityType) => {
    const { service, prisma } = setup(taxStatus, entityType);
    const docs = await service.generate('user-1', kind, { entityId: 'entity-1' });
    expect(docs.map((doc) => doc.documentType)).toEqual(['PEP_CONSENT', 'SERVICE_AGREEMENT', 'REWARD_SCHEDULE', 'SERVICE_ACT', 'PAYOUT_REQUEST']);
    expect(docs.every((doc) => doc.status === 'DRAFT_LEGAL_REVIEW')).toBe(true);
    const html = prisma.partnerGeneratedDocument.create.mock.calls.map(([input]: any[]) => input.data.contentHtml).join('\n');
    expect(html).toContain(entityType === 'LLC' ? 'ООО «Тест»' : 'ИП Тестов Тест Тестович');
    expect(html).toContain('Тестовый Исполнитель');
    expect(html).toContain('7%');
    expect(html).toContain('ПРОЕКТ ШАБЛОНА');
    expect(html).toContain('01.');
  });

  it('renders an active audience and legal-status matched template into generated files', async () => {
    const { service, prisma } = setup('SELF_EMPLOYED', 'IP');
    prisma.partnerDocumentTemplateVersion.findMany.mockResolvedValue([{ templateKey: 'agreement', version: 4, documentType: 'SERVICE_AGREEMENT', title: 'Контракт {{document_number}}', bodyHtml: '<p>{{partner_name}} · {{company_name}} · {{reward_terms}}</p>', audience: 'REFERRAL', taxStatus: 'SELF_EMPLOYED', entityType: 'IP', isActive: true }]);
    await service.generate('user-1', 'REFERRAL', { entityId: 'entity-1' });
    const saved = prisma.partnerGeneratedDocument.create.mock.calls.find(([input]: any[]) => input.data.documentType === 'SERVICE_AGREEMENT')![0].data;
    expect(saved.title).toMatch(/^Контракт P-/);
    expect(saved.templateVersion).toBe('agreement-v4');
    expect(saved.contentHtml).toContain(' · ');
  });

  it('provides editable starting templates for every document type in the CRM', async () => {
    const prisma: any = {
      partnerDocumentTemplateVersion: { findFirst: jest.fn().mockResolvedValue(null), upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      partnerLegalEntity: { findMany: jest.fn().mockResolvedValue([]) },
      partnerDocumentSettings: { upsert: jest.fn().mockResolvedValue({ id: 'default', pepEnabled: false }) },
      ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new PartnerDocumentsService(prisma);
    await service.adminWorkspace();
    expect(prisma.partnerDocumentTemplateVersion.upsert).toHaveBeenCalledTimes(5);
    expect(prisma.partnerDocumentTemplateVersion.upsert.mock.calls.map(([arg]: any[]) => arg.create.documentType)).toEqual(['PEP_CONSENT', 'SERVICE_AGREEMENT', 'REWARD_SCHEDULE', 'SERVICE_ACT', 'PAYOUT_REQUEST']);
  });

  it('keeps SMS signing disabled until the signing workflow is available', async () => {
    const prisma: any = { partnerDocumentSettings: { upsert: jest.fn() } };
    const service = new PartnerDocumentsService(prisma);
    await expect(service.saveDocumentSettings({ pepEnabled: true })).rejects.toThrow();
    expect(prisma.partnerDocumentSettings.upsert).not.toHaveBeenCalled();
  });
});
