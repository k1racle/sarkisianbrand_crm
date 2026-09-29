import { CrmService } from './crm.service';

describe('Explicit first-deal pipeline initialization', () => {
  function fixture(existing = false) {
    const stage = { id: 'new-stage', code: 'NEW', name: 'Новые', probability: 10, isWon: false, isLost: false };
    const pipeline = { id: 'pipeline', isActive: true, isDefault: true, requiredFields: ['contactName', 'contactPhone'], stages: [stage] };
    const lead = { id: 'lead', stageId: stage.id, stage };
    const db: any = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      crmPipeline: { findFirst: jest.fn().mockResolvedValue(existing ? pipeline : null), create: jest.fn().mockResolvedValue(pipeline) },
      customer: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'customer' }) },
      lead: { create: jest.fn().mockResolvedValue(lead), findUnique: jest.fn().mockResolvedValue(lead) },
      interaction: { create: jest.fn().mockResolvedValue({}) }, auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    db.$transaction = jest.fn(fn => fn(db));
    return { db, service: new CrmService(db) };
  }
  it('creates all default stages in one nested write under a transaction lock', async () => {
    const { db, service } = fixture();
    const lead = await service.createLead({ source: 'MANUAL', contactName: 'Contact', contactPhone: '+79990000000' }, 'actor', { customerId: null, initializePipeline: true });
    expect(lead.stageId).toBe('new-stage');
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.crmPipeline.create).toHaveBeenCalledTimes(1);
    const data = db.crmPipeline.create.mock.calls[0][0].data;
    expect(data.isActive).toBe(true); expect(data.isDefault).toBe(true);
    expect(data.requiredFields).toEqual(['contactName', 'contactPhone']);
    expect(data.stages.create.map((stage: any) => stage.code)).toEqual(['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST']);
    expect(db.lead.create.mock.calls[0][0].data.stageId).toBe('new-stage');
    // No lead.findMany/update delegate exists: implicit mass migration would fail this test.
  });
  it('uses an existing active pipeline without creating or migrating anything', async () => {
    const { db, service } = fixture(true);
    await service.createLead({ source: 'MANUAL', contactName: 'Contact', contactPhone: '+79990000000' }, 'actor');
    expect(db.crmPipeline.create).not.toHaveBeenCalled(); expect(db.lead.create).toHaveBeenCalledTimes(1);
  });
  it('does not initialize global configuration without explicit company authority', async () => {
    const { db, service } = fixture();
    await expect(service.createLead({ source: 'MANUAL', contactName: 'Contact', contactPhone: '+79990000000' }, 'actor')).rejects.toThrow('администратора');
    expect(db.crmPipeline.create).not.toHaveBeenCalled(); expect(db.lead.create).not.toHaveBeenCalled();
  });
  it('never searches or creates customers inside the low-level deal write', async () => {
    const { db, service } = fixture(true);
    await service.createLead({ source: 'MANUAL', contactName: 'Contact', contactPhone: '+79990000000' }, 'actor', { customerId: 'validated-customer', compact: true });
    expect(db.customer.findFirst).not.toHaveBeenCalled(); expect(db.customer.create).not.toHaveBeenCalled();
    expect(db.lead.create.mock.calls[0][0].data.customerId).toBe('validated-customer');
    expect(db.lead.findUnique).not.toHaveBeenCalled();
  });
});
