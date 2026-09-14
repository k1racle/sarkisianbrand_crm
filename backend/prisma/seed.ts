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

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminPassword) {
    const admin = await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@sarkisianbrand.ru' },
      update: { password: await bcrypt.hash(adminPassword, 12), role: 'ADMIN' },
      create: { email: process.env.SEED_ADMIN_EMAIL || 'admin@sarkisianbrand.ru', password: await bcrypt.hash(adminPassword, 12), firstName: 'SARKISIAN', lastName: 'Admin', role: 'ADMIN' },
    });
    console.log(`Seeded admin ${admin.email}`);
  }
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
