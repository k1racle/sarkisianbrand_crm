import { PrismaClient, Currency } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: 'professional-care' },
    update: {},
    create: { nameRu: 'Профессиональный уход', nameEn: 'Professional care', slug: 'professional-care' },
  });

  const product = await prisma.product.upsert({
    where: { sku: 'SB-DEMO-001' },
    update: {},
    create: {
      sku: 'SB-DEMO-001',
      nameRu: 'Демонстрационный продукт Sarkisian Brand',
      nameEn: 'Sarkisian Brand demo product',
      slug: 'demo-product',
      descriptionRu: 'Тестовая позиция для проверки каталога и сквозного сценария.',
      basePrice: 1990,
      currency: Currency.RUB,
      categories: { create: { categoryId: category.id, isPrimary: true } },
      variants: { create: { name: 'Основной вариант', options: {}, sku: 'SB-DEMO-001-STD', price: 1990, stock: 10 } },
    },
    include: { variants: true },
  });

  console.log(`Seeded ${product.sku} with ${product.variants.length} variant(s)`);

  const liveProducts = [
    ['Гель-мусс прозрачный, 15 гр', 780, 'gel-muss-prozrachnyi-15-gr'],
    ['Ножницы для маникюра ПРО Правша', 1995, 'nozhnitsy-pro-pravsha'],
    ['Фреза для маникюра алмазная Шар 4,0 мм, 5 шт', 920, 'freza-almaznaya-shar-40-mm'],
    ['Гель-мусс конструирующий камуфлирующий № 23, 15 гр', 780, 'gel-muss-kamufliruyushchiy-23'],
    ['Гель скоростной № 002, 30 мл', 1440, 'gel-skorostnoy-002-30-ml'],
    ['Гель скоростной № 021 с шиммером, 30 мл', 1440, 'gel-skorostnoy-021-shimmer-30-ml'],
    ['Гель моделирующий № 201, 30 мл', 1440, 'gel-modeliruyushchiy-201-30-ml'],
    ['Гель скоростной № 011, 30 мл', 1440, 'gel-skorostnoy-011-30-ml'],
    ['Ножницы для маникюра ПРО Левша', 1995, 'nozhnitsy-pro-levsha'],
    ['Гель скоростной густой № 111, 30 мл', 1440, 'gel-skorostnoy-111-30-ml'],
  ] as const;
  for (let i = 0; i < liveProducts.length; i += 1) {
    const [name, price, slug] = liveProducts[i];
    const sku = `SB-LIVE-${String(i + 1).padStart(3, '0')}`;
    const productLive = await prisma.product.upsert({
      where: { sku },
      update: { nameRu: name, basePrice: price, isActive: true },
      create: {
        sku, externalId: `sarkisian-live-${i + 1}`, nameRu: name, nameEn: name, slug,
        descriptionRu: `${name}. Оригинальный товар Sarkisian Brand для профессионального мастера.`,
        basePrice: price, currency: Currency.RUB, isSynced: true,
        categories: { create: { categoryId: category.id, isPrimary: true } },
        variants: { create: { name: 'Основной вариант', options: {}, sku: `${sku}-STD`, price, stock: 25 } },
      }, include: { variants: true },
    });
    if (await prisma.productImage.count({ where: { productId: productLive.id } }) === 0) {
      await prisma.productImage.create({ data: { productId: productLive.id, url: `/catalog/${slug}.jpg`, alt: name } });
    }
  }
  console.log(`Seeded ${liveProducts.length} catalog products from the current store.`);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminPassword) {
    const admin = await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@sarkisianbrand.ru' },
      update: { password: await bcrypt.hash(adminPassword, 12), role: 'ADMIN' },
      create: { email: process.env.SEED_ADMIN_EMAIL || 'admin@sarkisianbrand.ru', password: await bcrypt.hash(adminPassword, 12), firstName: 'SARKISIAN', lastName: 'Admin', role: 'ADMIN' },
    });
    console.log(`Seeded admin ${admin.email}`);

    const helpdeskSamples = [
      { number: 'HD-DEMO-001', subject: 'Не обновились остатки после обмена с 1С', description: 'После последней синхронизации часть складских остатков не изменилась.', source: 'SYSTEM' as const, priority: 'HIGH' as const, status: 'OPEN' as const, affectedService: 'Интеграция 1С', queue: 'Интеграции' },
      { number: 'HD-DEMO-002', subject: 'Клиент не видит историю заказа', description: 'Покупатель вошёл в кабинет, но заказ отсутствует в истории покупок.', source: 'B2C' as const, priority: 'MEDIUM' as const, status: 'NEW' as const, requesterName: 'Анна Петрова', requesterEmail: 'client@example.ru', affectedService: 'B2C кабинет', queue: 'Первая линия' },
      { number: 'HD-DEMO-003', subject: 'Нужен доступ к отчёту по продажам', description: 'Руководителю направления требуется доступ к сводному отчёту за месяц.', source: 'EMPLOYEE' as const, priority: 'LOW' as const, status: 'WAITING_INTERNAL' as const, requesterUserId: admin.id, assignedToId: admin.id, affectedService: 'Workspace', queue: 'Доступы' },
    ];
    for (const [index, item] of helpdeskSamples.entries()) {
      const ticket = await prisma.helpdeskTicket.upsert({
        where: { number: item.number },
        update: {},
        create: { ...item, firstResponseDueAt: new Date(Date.now() + (index + 1) * 60 * 60 * 1000), resolutionDueAt: new Date(Date.now() + (index + 1) * 8 * 60 * 60 * 1000) },
      });
      if (index === 0 && await prisma.helpdeskComment.count({ where: { ticketId: ticket.id } }) === 0) {
        await prisma.helpdeskComment.create({ data: { ticketId: ticket.id, authorId: admin.id, body: 'Проверяем журнал обмена и расхождения по SKU.', isInternal: true } });
      }
    }
    console.log(`Seeded ${helpdeskSamples.length} Helpdesk tickets`);
  }
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
