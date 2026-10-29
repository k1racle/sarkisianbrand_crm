/**
 * The fiscal policy must be explicitly supplied by the merchant for the
 * terminal's legal entity. No tax rate or settlement method is inferred.
 * This builder supports a single digital course, not a mixed goods basket.
 * Sources: https://developer.tbank.ru/eacq/api/init
 *          https://docs.robokassa.ru/ru/fiscalization
 */
export type CourseFiscalPolicy = {
  taxation: string;
  tax: string;
  paymentMethod: string;
  paymentObject: string;
};
export type CourseFiscalSnapshot = {
  name: string;
  amount: string;
  email?: string;
  phone?: string;
  taxation: string;
  tax: string;
  paymentMethod: string;
  paymentObject: string;
};
export type CourseFiscalContext = { receipt: CourseFiscalSnapshot; issuerName: string; issuerInn: string; integrationId: string; integrationVersion: string };
const taxations = new Set(['osn', 'usn_income', 'usn_income_outcome', 'esn', 'patent']);
// Intersection of the two providers' documented current values.
const taxes = new Set(['none', 'vat0', 'vat5', 'vat7', 'vat10', 'vat22', 'vat105', 'vat107', 'vat110', 'vat122']);
const methods = new Set(['full_payment', 'full_prepayment', 'prepayment', 'advance', 'partial_payment', 'credit', 'credit_payment']);
const objects = new Set(['service', 'intellectual_activity', 'another']);

export function courseFiscalPolicyFromConfig(config: Record<string, unknown>): CourseFiscalPolicy & { issuerName: string; issuerInn: string } {
  const issuerName = typeof config.courseIssuerName === 'string' ? config.courseIssuerName.trim() : '';
  const issuerInn = typeof config.courseIssuerInn === 'string' ? config.courseIssuerInn.trim() : '';
  const digits = [...issuerInn].map(Number);
  const checksum = (weights: number[]) => weights.reduce((sum, value, index) => sum + value * digits[index], 0) % 11 % 10;
  if (config.courseFiscalMode !== 'PROVIDER' || config.courseFiscalConfirmed !== 'YES' || issuerName.length < 3 || issuerName.length > 160 || /[\x00-\x1f\x7f]/.test(issuerName) || !/^\d{12}$/.test(issuerInn) || checksum([7,2,4,10,3,5,9,4,6,8]) !== digits[10] || checksum([3,7,2,4,10,3,5,9,4,6,8]) !== digits[11]) throw new Error('Укажите и подтвердите реквизиты владельца ИП и настройки кассы курсов');
  const policy = { taxation: String(config.courseTaxation || ''), tax: String(config.courseTax || ''), paymentMethod: String(config.coursePaymentMethod || ''), paymentObject: String(config.coursePaymentObject || '') };
  if (!taxations.has(policy.taxation) || !taxes.has(policy.tax) || !methods.has(policy.paymentMethod) || !objects.has(policy.paymentObject)) throw new Error('Заполните налоговые настройки чека для курса');
  if (policy.paymentMethod !== 'full_payment') throw new Error('Для выбранного способа расчёта требуется второй чек; он пока не реализован');
  return { ...policy, issuerName, issuerInn };
}

function amountInKopecks(value: string): number {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,12})\.\d{2}$/.test(value)) throw new Error('Некорректная сумма курса для чека');
  const [whole, fractional] = value.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fractional);
  if (cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Некорректная сумма курса для чека');
  const number = Number(cents);
  // Robokassa expects decimal roubles; fail closed if JS cannot preserve cents.
  if ((number / 100).toFixed(2) !== value) throw new Error('Сумма не может быть точно передана в чеке');
  return number;
}

export function makeCourseFiscalSnapshot(input: { name: string; amount: string; email?: string | null; phone?: string | null; policy: CourseFiscalPolicy }): CourseFiscalSnapshot {
  const policy = input.policy;
  if (!policy || !taxations.has(policy.taxation) || !taxes.has(policy.tax) || !methods.has(policy.paymentMethod) || !objects.has(policy.paymentObject)) throw new Error('Заполните налоговые настройки чека для курса');
  amountInKopecks(input.amount);
  const name = typeof input.name === 'string' ? Array.from(input.name.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 128).join('') : '';
  if (!name) throw new Error('Укажите название курса для чека');
  const email = String(input.email || '').trim(), phone = String(input.phone || '').trim();
  const validEmail = email.length <= 64 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validPhone = /^\+[1-9]\d{6,14}$/.test(phone);
  if (!validEmail && !validPhone) throw new Error('Для чека нужен корректный email или телефон покупателя');
  return { name, amount: input.amount, ...(validEmail ? { email } : {}), ...(validPhone ? { phone } : {}), taxation: policy.taxation, tax: policy.tax, paymentMethod: policy.paymentMethod, paymentObject: policy.paymentObject };
}

export function courseReceiptForTBank(snapshot: CourseFiscalSnapshot) {
  const checked = makeCourseFiscalSnapshot({ ...snapshot, policy: snapshot });
  const amount = amountInKopecks(checked.amount);
  return { Taxation: checked.taxation, ...(checked.email ? { Email: checked.email } : {}), ...(checked.phone ? { Phone: checked.phone } : {}), Items: [{ Name: checked.name, Price: amount, Quantity: 1, Amount: amount, Tax: checked.tax, PaymentMethod: checked.paymentMethod, PaymentObject: checked.paymentObject }] };
}

export function courseReceiptForRobokassa(snapshot: CourseFiscalSnapshot) {
  const checked = makeCourseFiscalSnapshot({ ...snapshot, policy: snapshot });
  const amount = amountInKopecks(checked.amount);
  return { sno: checked.taxation, items: [{ name: checked.name, quantity: 1, sum: amount / 100, tax: checked.tax, payment_method: checked.paymentMethod, payment_object: checked.paymentObject }] };
}
