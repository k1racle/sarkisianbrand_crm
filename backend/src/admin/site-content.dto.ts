import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min, Validate, ValidatorConstraint, ValidatorConstraintInterface, isEmail } from 'class-validator';

export const SITE_CONTENT_MAX_BYTES = 32 * 1024;
export const SITE_CONTENT_SECTION_KEYS = ['hero', 'categories', 'bestsellers', 'club', 'manifesto', 'story', 'benefits'] as const;
export type SiteContent = Record<string, unknown>;
type Rule = { kind: 'text'; max: number; format?: 'image' | 'url' | 'email' } |
  { kind: 'enum'; values: readonly string[] } | { kind: 'integer'; max: number } |
  { kind: 'boolean' } | { kind: 'object'; fields: Record<string, Rule> } |
  { kind: 'array'; item: Rule; max: number; exact?: number; unique?: string | true };
const text = (max: number, format?: 'image' | 'url' | 'email'): Rule => ({ kind: 'text', max, format });
const enumeration = (...values: string[]): Rule => ({ kind: 'enum', values });
const object = (fields: Record<string, Rule>): Rule => ({ kind: 'object', fields });
const array = (item: Rule, max: number, unique?: string | true, exact?: number): Rule => ({ kind: 'array', item, max, unique, exact });
const heading = { eyebrow: text(100), title: text(200), buttonLabel: text(80) };
const link = { id: text(80), label: text(80), url: text(500, 'url'), newTab: { kind: 'boolean' } as Rule };
const schema = object({
  contacts: object({ phone: text(30), email: text(254, 'email'), country: text(80) }),
  brand: object({ name: text(80), logoUrl: text(500, 'image'), footerText: text(500) }),
  home: object({
    order: array(enumeration(...SITE_CONTENT_SECTION_KEYS), 7, true, 7),
    hidden: array(enumeration(...SITE_CONTENT_SECTION_KEYS), 7, true),
    categories: object(heading),
    bestsellers: object({ ...heading, mode: enumeration('popular', 'manual'), productIds: array(text(80), 8, true) }),
    club: object({ label: text(80), title: text(200), accent: text(200),
      benefits: array(object({ id: text(80), icon: enumeration('award', 'gift', 'shield'), text: text(250) }), 6, 'id'),
      joinLabel: text(80), aboutLabel: text(80), previewLabel: text(100), previewBalance: { kind: 'integer', max: 1000000 } }),
    manifesto: object({ text: text(500) }),
    story: object({ ...heading, accent: text(200), body: text(2000), portraitUrl: text(500, 'image') }),
    benefits: array(object({ id: text(80), icon: enumeration('package', 'shield', 'award', 'sparkles'),
      eyebrow: text(100), title: text(200), body: text(1000) }), 8, 'id'),
  }),
  footer: object({
    columns: array(object({ id: text(80), title: text(100),
      items: array(object({ ...link, action: enumeration('none', 'account', 'favorites', 'cart') }), 12, 'id') }), 4, 'id'),
    legalLinks: array(object(link), 8, 'id'),
  }),
});
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' &&
  !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** No fetching or DNS. Reject ambiguous/encoded traversal, credentials, local hosts and unsafe schemes. */
export function siteContentUrlValid(value: string, image = false): boolean {
  if (!value) return true; // Explicitly cleared optional link/image; frontend owns defaults.
  if (value !== value.trim() || /[\u0000-\u0020\u007f\\]/.test(value) || value.startsWith('//')) return false;
  let decoded = value;
  try { for (let i = 0; i < 3; i++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } }
  catch { return false; }
  if (/[\u0000-\u0020\u007f\\]/.test(decoded) || decoded.startsWith('//') || /(^|\/)\.\.(\/|$|[?#])/.test(decoded)) return false;
  if (value.startsWith('/')) {
    if (image) return /^\/storefront\/[^?#]+$/.test(value) ||
      /^\/api\/v1\/media\/files\/[a-zA-Z0-9._-]+$/.test(value) || value === '/sarkisian-logo.png';
    return true;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host.includes('.') || /[:\[\]]/.test(host) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b] = host.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
    }
    return true;
  } catch { return false; }
}

function walk(value: unknown, rule: Rule, path: string): unknown {
  const fail = (): never => { throw new BadRequestException(`Некорректное поле контента: ${path}`); };
  if (rule.kind === 'text') {
    if (typeof value !== 'string' || value.length > rule.max || value.includes('\u0000')) return fail();
    const result = value.trim();
    if (path.endsWith('.id') || path.endsWith('.productIds[]')) { if (!result) return fail(); }
    if (rule.format === 'email' && !isEmail(result)) return fail();
    if ((rule.format === 'url' || rule.format === 'image') &&
      (/[\u0000-\u001f\u007f]/.test(value) || !siteContentUrlValid(result, rule.format === 'image'))) return fail();
    return result;
  }
  if (rule.kind === 'enum') return typeof value === 'string' && rule.values.includes(value) ? value : fail();
  if (rule.kind === 'boolean') return typeof value === 'boolean' ? value : fail();
  if (rule.kind === 'integer') return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= rule.max ? value : fail();
  if (rule.kind === 'object') {
    if (!plain(value)) return fail();
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(rule.fields, key)) return fail();
      result[key] = walk(value[key], rule.fields[key], `${path}.${key}`);
    }
    return result;
  }
  if (!Array.isArray(value) || value.length > rule.max || (rule.exact !== undefined && value.length !== rule.exact)) return fail();
  const result = value.map(item => walk(item, rule.item, `${path}[]`));
  if (rule.unique) {
    const ids = result.map(item => rule.unique === true ? item : (item as Record<string, unknown>)[rule.unique as string]).filter(id => id !== undefined);
    if (new Set(ids).size !== ids.length) return fail();
  }
  return result;
}

/** Validates ORIGINAL JSON, then returns a bounded plain snapshot. All content fields are optional. */
export function validateSiteContent(value: unknown): SiteContent {
  let serialized: string | undefined;
  try { serialized = JSON.stringify(value); } catch { throw new BadRequestException('Некорректный JSON контента'); }
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > SITE_CONTENT_MAX_BYTES) throw new BadRequestException('Контент должен быть не больше 32 КБ');
  return walk(value, schema, 'content') as SiteContent;
}

@ValidatorConstraint({ name: 'boundedSiteContent', async: false })
export class BoundedSiteContentConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean { try { validateSiteContent(value); return true; } catch { return false; } }
  defaultMessage(): string { return 'Контент содержит неизвестные поля, неверные типы, ссылки или превышает 32 КБ'; }
}
const original = ({ obj, key }: any) => obj[key];
export class UpdateSiteContentDto {
  @Transform(original) @IsInt() @Min(0) @Max(2147483646) revision: number;
  @Transform(original) @Validate(BoundedSiteContentConstraint) content: SiteContent;
}
export class RestoreSiteContentDto {
  @Transform(original) @IsInt() @Min(0) @Max(2147483646) revision: number;
  @Transform(original) @IsInt() @Min(0) @Max(2147483646) targetRevision: number;
}
