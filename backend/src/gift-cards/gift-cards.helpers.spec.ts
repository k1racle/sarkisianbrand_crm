import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IssueGiftCardDto, SaveGiftCardProductDto, UpdateGiftCardDto } from './gift-cards.dto';
import { generateGiftCode, giftAmountMinor, giftCodeHash, giftMoney, giftMoneyMinor, giftNominal, giftValidityDays, maskGiftCode, normalizeGiftCode } from './gift-cards.helpers';

const code = '01234567-89ABCDEF-01234567-89ABCDEF';
describe('gift card pure helpers', () => {
  it('normalizes outer whitespace, case and hyphens identically for lookup', () => {
    expect(normalizeGiftCode(` ${code.toLowerCase()} `)).toBe('0123456789ABCDEF0123456789ABCDEF');
    expect(giftCodeHash(code)).toBe(giftCodeHash(normalizeGiftCode(code)));
    expect(giftCodeHash(code)).toHaveLength(64);
    expect(maskGiftCode(code)).toBe('••••-••••-••••-CDEF');
  });
  it.each(['abc', 'G'.repeat(32), '0'.repeat(31), '0'.repeat(33), `0${' '.repeat(1)}${'1'.repeat(31)}`, `${'0'.repeat(32)}-`, '-'.repeat(32), 'Я'.repeat(32)])('rejects malformed code %s', value => {
    expect(() => normalizeGiftCode(value)).toThrow();
  });
  it('generates distinct 128-bit codes with 32 hex characters', () => {
    const generated = Array.from({ length: 100 }, generateGiftCode);
    expect(new Set(generated).size).toBe(100);
    generated.forEach(value => expect(value).toMatch(/^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/));
  });
  it.each([[0.29, 29], ['1.01', 101], ['1250.00', 125000], [1_000_000, 100_000_000]])('parses exact money %s', (value, expected) => {
    expect(giftMoneyMinor(value)).toBe(expected);
    expect(giftMoney(expected)).toMatch(/^\d+\.\d{2}$/);
  });
  it.each([true, null, undefined, -1, NaN, Infinity, '1.001', '1e3', '100000001', '1,00', {}, []])('rejects nonmoney %s', value => {
    expect(() => giftMoneyMinor(value)).toThrow();
  });
  it.each([0, -1, 1.1, NaN, Number.MAX_SAFE_INTEGER, '100'])('rejects invalid positive kopecks %s', value => {
    expect(() => giftAmountMinor(value as number)).toThrow();
  });
  it('validates custom whole RUB denominations and TTL', () => {
    expect(giftNominal(1)).toBe(1); expect(giftNominal(1_000_000)).toBe(1_000_000);
    expect(() => giftNominal(1.01)).toThrow(); expect(() => giftNominal(1_000_001)).toThrow();
    expect(giftValidityDays(3650)).toBe(3650); expect(() => giftValidityDays(null)).toThrow();
  });
});

describe('gift card DTO validation under global implicit conversion', () => {
  const product = { nameRu: ' Сертификат ', descriptionRu: '', denominations: [1, 1000], isActive: false, validityDays: 365 };
  const errors = async (cls: any, input: any) => validate(plainToInstance(cls, input, { enableImplicitConversion: true }) as object, { whitelist: true, forbidNonWhitelisted: true });
  it('accepts trimmed product and manual code', async () => {
    expect(await errors(SaveGiftCardProductDto, product)).toHaveLength(0);
    expect(await errors(IssueGiftCardDto, { nominal: 1000, code: ` ${code} `, reason: 'Выпуск' })).toHaveLength(0);
  });
  it.each([{ denominations: [1, 1] }, { denominations: [1.5] }, { denominations: ['1000'] }, { denominations: [] }, { validityDays: true }, { validityDays: null }, { isActive: 'false' }, { nameRu: '   ' }])('rejects invalid product %j', async patch => {
    expect((await errors(SaveGiftCardProductDto, { ...product, ...patch })).length).toBeGreaterThan(0);
  });
  it.each([{ nominal: true }, { nominal: '1000' }, { nominal: 0 }, { reason: ' ' }, { code: 'DEMO' }, { code: null }])('rejects invalid issue %j', async patch => {
    expect((await errors(IssueGiftCardDto, { nominal: 1000, reason: 'Выпуск', ...patch })).length).toBeGreaterThan(0);
  });
  it('requires revision and forbids financial editing', async () => {
    expect((await errors(UpdateGiftCardDto, { isActive: false })).length).toBeGreaterThan(0);
    expect((await errors(UpdateGiftCardDto, { revision: 1, balance: 1000 })).length).toBeGreaterThan(0);
    expect((await errors(UpdateGiftCardDto, { revision: 1, expiresAt: '2027-09-16' })).length).toBeGreaterThan(0);
  });
});
