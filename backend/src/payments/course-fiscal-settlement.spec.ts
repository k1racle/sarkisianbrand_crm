import { randomUUID } from 'crypto';
import { validCourseFiscalSettlement } from './course-fiscal-settlement';
import { courseReceiptForRobokassa, makeCourseFiscalSnapshot } from './course-fiscal-receipt';
import { makeRobokassaPost } from './robokassa.protocol';

describe('fiscal evidence before opening course access', () => {
  const policy = { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' };
  const order = { finalAmount: '1200.00', buyerEmail: 'student@example.invalid', buyerPhone: null };
  const purchase = { courseTitle: 'Курс' };
  const receipt = makeCourseFiscalSnapshot({ name: purchase.courseTitle, amount: '1200.00', email: order.buyerEmail, policy });
  const fiscal = { integrationId: randomUUID(), integrationVersion: new Date().toISOString(), issuerName: 'Иванова Анна Ивановна', issuerInn: '500100732259', receipt };
  it('requires a complete immutable fiscal snapshot, verified environment and initiated T-Bank operation', () => {
    const p = { provider: 'TBANK', transactionId: 'TBANK:123', metadata: { courseOrder: true, environment: 'PRODUCTION', initStarted: true, courseFiscal: fiscal } };
    expect(validCourseFiscalSettlement(p, order, purchase, false)).toBe(true);
    for (const changed of [
      { ...p, provider: 'YOOKASSA' },
      { ...p, metadata: {} },
      { ...p, metadata: { ...p.metadata, initStarted: false } },
      { ...p, metadata: { ...p.metadata, environment: 'TEST' } },
      { ...p, metadata: { ...p.metadata, courseFiscal: { ...fiscal, issuerInn: '500100732250' } } },
      { ...p, metadata: { ...p.metadata, courseFiscal: { ...fiscal, receipt: { ...receipt, amount: '1.00' } } } },
      { ...p, metadata: { ...p.metadata, courseFiscal: { ...fiscal, receipt: { ...receipt, paymentMethod: 'prepayment' } } } },
    ]) expect(validCourseFiscalSettlement(changed, order, purchase, false)).toBe(false);
    expect(validCourseFiscalSettlement(p, { ...order, buyerEmail: 'another@example.invalid' }, purchase, false)).toBe(false);
    expect(validCourseFiscalSettlement(p, { ...order, finalAmount: '1201.00' }, purchase, false)).toBe(false);
  });
  it('binds the Robokassa form, invoice, exact encoded receipt and payer to the attempt', () => {
    const id = randomUUID(), form = makeRobokassaPost({ merchantLogin: 'shop', amount: '1200.00', invoiceId: 42, password1: 'password', algorithm: 'SHA256', isTest: false, localPaymentId: id, description: 'Заказ SB', receipt: courseReceiptForRobokassa(receipt), email: order.buyerEmail });
    const p = { id, invoiceId: 42, provider: 'ROBOKASSA', transactionId: 'ROBOKASSA:42', metadata: { courseOrder: true, environment: 'PRODUCTION', courseFiscal: fiscal, confirmationForm: form } };
    expect(validCourseFiscalSettlement(p, order, purchase, false)).toBe(true);
    for (const fields of [{ ...form.fields, OutSum: '1.00' }, { ...form.fields, Receipt: encodeURIComponent('{}') }, { ...form.fields, Email: 'other@example.invalid' }, { ...form.fields, InvId: '43' }, { ...form.fields, Shp_payment: randomUUID() }, { ...form.fields, SignatureValue: '' }, { ...form.fields, IsTest: '1' }]) expect(validCourseFiscalSettlement({ ...p, metadata: { ...p.metadata, confirmationForm: { ...form, fields } } }, order, purchase, false)).toBe(false);
    expect(validCourseFiscalSettlement({ ...p, metadata: { ...p.metadata, confirmationForm: { ...form, action: 'https://evil.invalid' } } }, order, purchase, false)).toBe(false);
  });
});
