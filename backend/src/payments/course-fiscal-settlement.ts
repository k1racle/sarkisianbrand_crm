import { Prisma } from '@prisma/client';
import { isDeepStrictEqual } from 'util';
import { courseFiscalPolicyFromConfig, courseReceiptForRobokassa, makeCourseFiscalSnapshot } from './course-fiscal-receipt';

/** Verify only immutable data attached by our payment creation path. A bank
 * success is not evidence that a fiscal receipt was submitted. */
export function validCourseFiscalSettlement(payment: any, order: any, purchase: any, test: boolean): boolean {
  try {
    const m = payment.metadata as Record<string, any>;
    if (!m || m.courseOrder !== true || m.environment !== (test ? 'TEST' : 'PRODUCTION') || !['TBANK','ROBOKASSA'].includes(payment.provider)) return false;
    const fiscal = m.courseFiscal;
    if (!fiscal || typeof fiscal !== 'object' || Array.isArray(fiscal) || typeof fiscal.integrationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fiscal.integrationId) || typeof fiscal.integrationVersion !== 'string' || !Number.isFinite(Date.parse(fiscal.integrationVersion))) return false;
    const receipt = fiscal.receipt;
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return false;
    const policy = courseFiscalPolicyFromConfig({ courseFiscalMode: 'PROVIDER', courseFiscalConfirmed: 'YES', courseIssuerName: fiscal.issuerName, courseIssuerInn: fiscal.issuerInn, courseTaxation: receipt.taxation, courseTax: receipt.tax, coursePaymentMethod: receipt.paymentMethod, coursePaymentObject: receipt.paymentObject });
    const expected = makeCourseFiscalSnapshot({ name: purchase.courseTitle, amount: new Prisma.Decimal(order.finalAmount).toFixed(2), email: order.buyerEmail, phone: order.buyerPhone, policy });
    if (!isDeepStrictEqual(receipt, expected)) return false;
    if (payment.provider === 'TBANK') return m.initStarted === true && /^TBANK:\d{1,20}$/.test(payment.transactionId || '');
    const form = m.confirmationForm, fields = form?.fields;
    if (!receipt.email || !payment.invoiceId || payment.transactionId !== `ROBOKASSA:${payment.invoiceId}` || !form || form.action !== 'https://auth.robokassa.ru/Merchant/Index.aspx' || form.method !== 'POST' || !fields || typeof fields !== 'object' || Array.isArray(fields)) return false;
    const keys = ['MerchantLogin','OutSum','InvId','Description','Receipt','Shp_payment','SignatureValue','Email', ...(test ? ['IsTest'] : [])].sort();
    if (!isDeepStrictEqual(Object.keys(fields).sort(), keys) || !Object.values(fields).every(value => typeof value === 'string')) return false;
    return typeof fields.MerchantLogin === 'string' && /^[^:\s]{1,100}$/.test(fields.MerchantLogin) && fields.OutSum === expected.amount && fields.InvId === String(payment.invoiceId) && fields.Shp_payment === payment.id && fields.Email === expected.email && fields.Receipt === encodeURIComponent(JSON.stringify(courseReceiptForRobokassa(expected))) && /^[a-f0-9]{32}$|^[a-f0-9]{64}$|^[a-f0-9]{128}$/i.test(fields.SignatureValue) && (!test || fields.IsTest === '1');
  } catch { return false; }
}
