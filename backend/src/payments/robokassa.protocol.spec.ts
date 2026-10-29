import { createHash } from 'crypto';
import { makeRobokassaUrl, verifyRobokassaResult, RobokassaHash } from './robokassa.protocol';

const digest = (algorithm: string, text: string) => createHash(algorithm).update(text, 'utf8').digest('hex');
const paymentId = '8ed571e4-0f14-4fac-a435-ac4f88754d80';
const custom = `Shp_payment=${paymentId}`;

describe('Robokassa signed payment protocol (no network)', () => {
  it.each([['MD5', 'md5'], ['SHA256', 'sha256'], ['SHA512', 'sha512']] as [RobokassaHash, string][])('builds an exact signed test payment using %s', (algorithm, nodeAlgorithm) => {
    const url = new URL(makeRobokassaUrl({ merchantLogin: 'store', amount: '150.5', invoiceId: 42, localPaymentId: paymentId, password1: 'secret-1', algorithm, isTest: true, description: 'Заказ 42' }));
    expect(url.origin).toBe('https://auth.robokassa.ru');
    expect(url.pathname).toBe('/Merchant/Index.aspx');
    expect(url.searchParams.get('OutSum')).toBe('150.50');
    expect(url.searchParams.get('InvId')).toBe('42');
    expect(url.searchParams.get('Shp_payment')).toBe(paymentId);
    expect(url.searchParams.get('SignatureValue')).toBe(digest(nodeAlgorithm, `store:150.50:42:secret-1:${custom}`));
    expect(url.searchParams.get('IsTest')).toBe('1');
    expect(url.toString()).not.toContain('secret-1');
  });

  it('signs the URL-encoded receipt and sends the same value', () => {
    const receipt = { items: [{ name: 'Услуга', quantity: 1, sum: 150, tax: 'none' }] };
    const encoded = encodeURIComponent(JSON.stringify(receipt));
    const url = new URL(makeRobokassaUrl({ merchantLogin: 'store', amount: '150.00', invoiceId: 42, localPaymentId: paymentId, password1: 'secret-1', algorithm: 'SHA256', isTest: false, receipt }));
    expect(url.searchParams.get('Receipt')).toBe(encoded);
    expect(url.searchParams.get('SignatureValue')).toBe(digest('sha256', `store:150.00:42:${encoded}:secret-1:${custom}`));
    expect(url.searchParams.has('IsTest')).toBe(false);
  });

  it('verifies the raw six-digit production amount before normalizing', () => {
    const payload = { outSum: '100.000000', invId: '450009', signatureValue: digest('sha256', `100.000000:450009:secret-2:${custom}`).toUpperCase(), extra: { Shp_payment: paymentId } };
    expect(verifyRobokassaResult(payload, 'secret-2', 'SHA256')).toEqual({ invoiceId: 450009, amount: '100.00', localPaymentId: paymentId });
    expect(() => verifyRobokassaResult({ ...payload, outSum: '100.00' }, 'secret-2', 'SHA256')).toThrow();
    expect(() => verifyRobokassaResult({ ...payload, invId: '450010' }, 'secret-2', 'SHA256')).toThrow();
    expect(() => verifyRobokassaResult(payload, 'wrong-password', 'SHA256')).toThrow();
  });

  it.each(['0', '-1', '1.001', 'Infinity', '1e2', '99999999999999.00'])('rejects invalid amount %s', amount => {
    expect(() => makeRobokassaUrl({ merchantLogin: 'store', amount, invoiceId: 1, localPaymentId: paymentId, password1: 'p', algorithm: 'SHA256', isTest: true })).toThrow();
  });

  it('rejects unplanned custom parameters, duplicate input and noncanonical invoice ids', () => {
    const signatureValue = digest('md5', `10.00:1:secret-2:${custom}`);
    const result = { outSum: '10.00', invId: '1', signatureValue, extra: { Shp_payment: paymentId } };
    expect(verifyRobokassaResult(result, 'secret-2', 'MD5')).toEqual({ invoiceId: 1, amount: '10.00', localPaymentId: paymentId });
    expect(() => verifyRobokassaResult({ ...result, extra: { Shp_payment: paymentId, Shp_user: 'x' } }, 'secret-2', 'MD5')).toThrow();
    expect(() => verifyRobokassaResult({ ...result, extra: { Shp_payment: '8ed571e4-0f14-4fac-a435-ac4f88754d81' } }, 'secret-2', 'MD5')).toThrow();
    expect(() => verifyRobokassaResult({ ...result, extra: {} }, 'secret-2', 'MD5')).toThrow();
    expect(() => verifyRobokassaResult({ ...result, outSum: ['10.00', '11.00'] }, 'secret-2', 'MD5')).toThrow();
    expect(() => verifyRobokassaResult({ ...result, invId: '01' }, 'secret-2', 'MD5')).toThrow();
    expect(() => makeRobokassaUrl({ merchantLogin: 'store', amount: '1.00', invoiceId: 2147483648, localPaymentId: paymentId, password1: 'p', algorithm: 'SHA256', isTest: true })).toThrow();
  });
});
