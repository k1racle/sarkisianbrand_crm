import { IntegrationSecretsService } from './integration-secrets.service';
import { SystemSettingsService } from './system-settings.service';

describe('Секреты платёжных подключений', () => {
  it('сохраняет ранее введённые пароли Робокассы и не возвращает их клиенту', async () => {
    const encryption = new IntegrationSecretsService({ get: () => 'fixture-only-encryption-key' } as any);
    let row: any = { id: 'fixture', key: 'ROBOKASSA', provider: 'ROBOKASSA', isEnabled: false, environment: 'TEST', config: {}, encryptedSecrets: null, configuredSecretKeys: [] };
    const db: any = { ecosystemIntegration: { findUnique: jest.fn(async () => row), update: jest.fn(async ({ data }) => (row = { ...row, ...data })) } };
    const settings = new SystemSettingsService(db, {} as any, encryption, {} as any);
    jest.spyOn(settings as any, 'ensureIntegrationCatalog').mockResolvedValue(undefined);
    const values = { password1: 'prod-one-secret', password2: 'prod-two-secret', testPassword1: 'test-one-secret', testPassword2: 'test-two-secret' };
    const first = await settings.updateIntegration('ROBOKASSA', { isEnabled: true, environment: 'TEST', config: { merchantLogin: 'fixture', signatureAlgorithm: 'SHA256', fiscalMode: 'EXTERNAL' }, secrets: values } as any);
    expect(encryption.decrypt(row.encryptedSecrets)).toEqual(values);
    expect(row.encryptedSecrets).not.toContain('secret');
    expect(JSON.stringify(first)).not.toMatch(/prod-one-secret|prod-two-secret|test-one-secret|test-two-secret/);
    const result = await settings.updateIntegration('ROBOKASSA', { isEnabled: true, environment: 'PRODUCTION', config: { merchantLogin: 'fixture' }, secrets: { password1: '', password2: '', testPassword1: '', testPassword2: '' } } as any);
    expect(encryption.decrypt(row.encryptedSecrets)).toEqual(values);
    expect(result.fields.filter(field => field.type === 'secret').every(field => field.configured && field.value === undefined)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/prod-one-secret|prod-two-secret|test-one-secret|test-two-secret/);
  });
});
