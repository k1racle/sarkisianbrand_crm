/* Compact right-click menu; fixture-only reads and no API writes. */
const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');

const fixtures = new Map([
  ['/b2b/profile', { id: 'qa-company', name: 'Тестовый салон', membership: { role: 'OWNER', canOrder: true, canSeeFinance: true }, members: [] }],
  ['/b2b/dashboard', { clients: 0, bookingsToday: 0, upcoming: 0, serviceRevenueMonth: 0, purchasesMonth: 0, recentOrders: [], nextBookings: [] }],
  ...['clients', 'services', 'bookings', 'catalog', 'orders', 'support'].map(id => ['/b2b/' + id, []]),
]);

for (const width of [1440, 390]) for (const b2b of [false, true]) {
  test(`Compact workspace context menu ${b2b ? 'B2B' : 'admin'} ${width}`, async ({ browser }, testInfo) => {
    const f = await isolatedContext(browser, width, false, false, {
      b2b, fixtures, ...(b2b ? { actor: { id: 'qa-b2b', firstName: 'Партнёр', email: 'qa@example.invalid', role: 'CUSTOMER_B2B' } } : {}),
    });
    try {
      await f.page.goto(b2b ? '/b2b' : '/admin-workspace/dashboard');
      const heading = f.page.locator(b2b ? '.portal h1' : '.workspace-frame h1').first();
      await expect(heading).toBeVisible();
      await f.page.evaluate(() => document.fonts.ready);
      await heading.click({ button: 'right' });
      const menu = f.page.getByRole('menu', { exact: true });
      await expect(menu).toBeVisible();
      await expect.poll(() => menu.evaluate(el => getComputedStyle(el).transform)).toBe('none');
      await expect(menu.getByRole('menuitem')).toHaveCount(4);
      const dimensions = await menu.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const items = [...el.querySelectorAll('[role="menuitem"]')];
        return {
          width: rect.width,
          withinViewport: rect.left >= 8 && rect.top >= 8 && rect.right <= innerWidth - 8 && rect.bottom <= innerHeight - 8,
          titleSize: getComputedStyle(el.querySelector('strong')).fontSize,
          closeHeight: el.querySelector('header button').getBoundingClientRect().height,
          items: items.map(item => ({
            fontSize: getComputedStyle(item.querySelector('span')).fontSize,
            height: item.getBoundingClientRect().height,
            fits: item.scrollWidth <= item.clientWidth && item.querySelector('span').scrollWidth <= item.querySelector('span').clientWidth,
            iconWidth: item.querySelector('svg').getBoundingClientRect().width,
          })),
        };
      });
      expect(dimensions.width).toBeLessThanOrEqual(260);
      expect(dimensions.withinViewport).toBe(true);
      expect(dimensions.titleSize).toBe('12px');
      expect(dimensions.closeHeight).toBe(28);
      for (const item of dimensions.items) {
        expect(item.fontSize).toBe('12px');
        expect(item.height).toBeGreaterThanOrEqual(36);
        expect(item.height).toBeLessThanOrEqual(38);
        expect(item.fits).toBe(true);
        expect(item.iconWidth).toBe(16);
      }
      await testInfo.attach('compact-context-menu', { body: await menu.screenshot(), contentType: 'image/png' });
      await f.page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      // Near the bottom-right corner the same menu must be repositioned onscreen.
      await heading.evaluate((el, x) => el.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, button: 2, clientX: x, clientY: 940,
      })), width - 2);
      await expect(menu).toBeVisible();
      await expect.poll(() => menu.evaluate(el => getComputedStyle(el).transform)).toBe('none');
      expect(await menu.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 8 && rect.top >= 8 && rect.right <= innerWidth - 8 && rect.bottom <= innerHeight - 8;
      })).toBe(true);
      await menu.getByRole('button', { name: 'Закрыть', exact: true }).click();
      await expect(menu).toBeHidden();
      for (const key of ['unknownReads', 'externalRequests', 'prohibitedWrites', 'credentialLeaks']) expect(f.traffic[key]).toEqual([]);
      expect(f.errors).toEqual([]);
    } finally { await f.context.close(); }
  });
}
