import { courseFiscalPolicyFromConfig, courseReceiptForRobokassa, courseReceiptForTBank, makeCourseFiscalSnapshot } from './course-fiscal-receipt';

describe('course fiscal receipt preparation', () => {
  const policy = { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' };
  const sample = { name: 'Курс маникюра', amount: '1200.01', email: 'student@example.invalid', policy };
  it('uses identical explicitly chosen fiscal fields and exact totals for both providers', () => {
    const snapshot = makeCourseFiscalSnapshot(sample);
    expect(courseReceiptForTBank(snapshot)).toEqual({ Taxation: 'usn_income', Email: sample.email, Items: [{ Name: sample.name, Price: 120001, Quantity: 1, Amount: 120001, Tax: 'none', PaymentMethod: 'full_payment', PaymentObject: 'service' }] });
    expect(courseReceiptForRobokassa(snapshot)).toEqual({ sno: 'usn_income', items: [{ name: sample.name, quantity: 1, sum: 1200.01, tax: 'none', payment_method: 'full_payment', payment_object: 'service' }] });
  });
  it('never guesses tax policy, contact, amount or a course name', () => {
    for (const value of [undefined, '', 'vat20', 'unexpected']) expect(() => makeCourseFiscalSnapshot({ ...sample, policy: { ...policy, tax: value as string } })).toThrow();
    for (const amount of ['0.00', '-1.00', '1.001', '01.00', 'NaN', '999999999999999.99']) expect(() => makeCourseFiscalSnapshot({ ...sample, amount })).toThrow();
    expect(() => makeCourseFiscalSnapshot({ ...sample, email: 'invalid', phone: '123' })).toThrow();
    expect(() => makeCourseFiscalSnapshot({ ...sample, name: '\n\t' })).toThrow();
  });
  it('caps and sanitizes names, and supports a valid phone without leaking an invalid email', () => {
    const snapshot = makeCourseFiscalSnapshot({ ...sample, name: 'К'.repeat(150) + '\n', email: 'invalid', phone: '+79991234567' });
    expect(Array.from(snapshot.name)).toHaveLength(128);
    expect(courseReceiptForTBank(snapshot)).toMatchObject({ Phone: '+79991234567' });
    expect(courseReceiptForTBank(snapshot)).not.toHaveProperty('Email');
  });
  it('revalidates a stored snapshot and rejects altered fiscal fields', () => {
    const snapshot = makeCourseFiscalSnapshot(sample);
    expect(() => courseReceiptForTBank({ ...snapshot, paymentObject: 'commodity' })).toThrow();
    expect(() => courseReceiptForRobokassa({ ...snapshot, amount: '0.00' })).toThrow();
  });
  it('requires an explicitly confirmed fiscal policy and a valid 12-digit INN for the merchant IP', () => {
    const config = { courseFiscalMode: 'PROVIDER', courseFiscalConfirmed: 'YES', courseIssuerName: 'Иванова Анна Ивановна', courseIssuerInn: '500100732259', courseTaxation: 'usn_income', courseTax: 'none', coursePaymentMethod: 'full_payment', coursePaymentObject: 'service' };
    expect(courseFiscalPolicyFromConfig(config)).toMatchObject({ ...policy, issuerInn: config.courseIssuerInn, issuerName: config.courseIssuerName });
    for (const patch of [{ courseFiscalMode: 'EXTERNAL' }, { courseFiscalConfirmed: '' }, { courseIssuerInn: '500100732250' }, { courseIssuerInn: '7707083893' }, { courseIssuerName: '' }, { courseTax: '' }, ...['full_prepayment', 'prepayment', 'advance', 'partial_payment', 'credit', 'credit_payment'].map(coursePaymentMethod => ({ coursePaymentMethod }))]) expect(() => courseFiscalPolicyFromConfig({ ...config, ...patch })).toThrow();
  });
});
