import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminService } from './admin.service';
import { CreateStorefrontPageDto } from './dto/admin.dto';

describe('editable partnership pages (mock database only)', () => {
  const block = { id: 'referral', title: 'Рекомендуйте друзьям', body: 'Текст', kind: 'feature', icon: 'gift', buttonLabel: 'Кабинет', buttonUrl: '/account?tab=referrals' };
  const page = (blocks: any[] = [block]) => plainToInstance(CreateStorefrontPageDto, { slug: 'partnerships', title: 'Сотрудничество', eyebrow: 'SARKISIAN', lead: 'Введение', blocks, isActive: true, reviewRequired: false });
  function fixture() { const db: any = { storefrontPage: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(async ({ data }) => data) } }; return { db, service: new AdminService(db, {} as any, {} as any) }; }
  it('validates and stores formatting, icons and safe CTA links instead of dropping metadata', async () => {
    expect(await validate(page(), { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    const f = fixture(); const result = await f.service.createStorefrontPage(page());
    expect(result.blocks).toEqual([block]);
  });
  it.each(['javascript:alert(1)', '//evil.example/x', 'https://localhost/x', '/%2f%2fevil.example'])('rejects unsafe CTA %s without writing', async url => {
    const f = fixture(); await expect(f.service.createStorefrontPage(page([{ ...block, buttonUrl: url }]))).rejects.toThrow(); expect(f.db.storefrontPage.create).not.toHaveBeenCalled();
  });
  it('rejects a half-filled CTA and more than one cover', async () => {
    const f = fixture(); await expect(f.service.createStorefrontPage(page([{ ...block, buttonUrl: '' }]))).rejects.toThrow();
    await expect(f.service.createStorefrontPage(page([{ ...block, kind: 'hero' }, { ...block, id: 'second', kind: 'hero' }]))).rejects.toThrow();
  });
  it('rejects unknown formats and icons', async () => {
    expect((await validate(page([{ ...block, kind: 'script', icon: 'unknown' }]))).length).toBeGreaterThan(0);
  });
  it('keeps the legacy plain-text block contract', async () => {
    const f = fixture(); const legacy = { id: 'old', title: 'Старый блок', body: 'Не менять' }; expect((await f.service.createStorefrontPage(page([legacy]))).blocks).toEqual([legacy]);
  });
  it('validates and retains editable biography images', async () => {
    const biography = { id: 'founder', kind: 'biography', title: 'Светлана Саркисян', body: 'Биография', images: ['/storefront/svetlana-portrait.png', 'https://example.com/photo.jpg'] };
    expect(await validate(page([biography]), { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect((await fixture().service.createStorefrontPage(page([biography]))).blocks).toEqual([biography]);
  });
  it('keeps personal socials separate and allows clearing them', async () => {
    const bio = { id: 'founder', kind: 'biography', title: 'Светлана Саркисян', body: 'Биография', socials: { telegram: 'https://t.me/sarkisian_sv', vk: '' } };
    expect(await validate(page([bio]), { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    const saved: any = await fixture().service.createStorefrontPage(page([bio]));
    const cleared: any = await fixture().service.createStorefrontPage(page([{ ...bio, socials: {} }]));
    expect(saved.blocks[0].socials).toEqual({ telegram: 'https://t.me/sarkisian_sv' });
    expect(cleared.blocks[0].socials).toEqual({});
  });
  it.each(['javascript:alert(1)', '//evil.example/x', 'https://localhost/x', 'http://example.com/x', '/account'])('rejects unsafe personal social %s without writes', async url => {
    const f = fixture(); await expect(f.service.createStorefrontPage(page([{ ...block, socials: { telegram: url } }]))).rejects.toThrow(); expect(f.db.storefrontPage.create).not.toHaveBeenCalled();
  });
  it('rejects unknown personal social keys', async () => {
    expect((await validate(page([{ ...block, socials: { unknown: 'https://example.com/x' } }]), { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0);
  });
  it.each(['javascript:alert(1)', '//evil.example/photo.jpg', 'https://localhost/photo.jpg'])('rejects unsafe biography image %s', async url => {
    const f = fixture(); await expect(f.service.createStorefrontPage(page([{ ...block, images: [url] }]))).rejects.toThrow(); expect(f.db.storefrontPage.create).not.toHaveBeenCalled();
  });
});
