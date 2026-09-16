// One-off, conservative metadata setup for the original SB-LIVE import only.
// Keeps existing category links; never changes prices, inventory, images or custom tags.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const changes = await prisma.$transaction(async tx => {
    const imported = await tx.product.findMany({ where: { sku: { startsWith: 'SB-LIVE-' } }, include: { categories: { include: { category: true } } } });
    const definitions = [
      { slug: 'gels', nameRu: 'Гели', imageUrl: '/storefront/categories/gels.jpg' },
      { slug: 'cutters', nameRu: 'Фрезы', imageUrl: '/storefront/categories/cutters.jpg' },
      { slug: 'instruments', nameRu: 'Инструменты', imageUrl: '/storefront/categories/instruments.jpg' },
    ];
    const categories = new Map();
    for (const definition of definitions) categories.set(definition.slug, await tx.category.upsert({ where: { slug: definition.slug }, create: definition, update: {} }));
    const result = [];
    for (const product of imported) {
      const name = product.nameRu.toLowerCase();
      const category = categories.get(name.startsWith('гель') ? 'gels' : name.startsWith('фреза') ? 'cutters' : name.startsWith('ножницы') ? 'instruments' : '');
      if (!category) continue;
      // Only normalize records not already classified by the content manager.
      if (product.categories.some(link => link.category.slug !== 'professional-care' && link.categoryId !== category.id)) continue;
      if (!product.categories.some(link => link.categoryId === category.id)) {
        await tx.productCategory.updateMany({ where: { productId: product.id }, data: { isPrimary: false } });
        await tx.productCategory.create({ data: { productId: product.id, categoryId: category.id, isPrimary: true } });
      }
      const data = {};
      if (!product.purposes.length) data.purposes = name.includes('маникюр') ? ['Маникюр'] : name.includes('моделирующ') ? ['Моделирование'] : [];
      if (!product.features.length) data.features = [name.includes('камуфлирующ') ? 'Камуфлирующий' : '', name.includes('прозрачн') ? 'Прозрачный' : '', name.includes('шиммер') ? 'Шиммер' : '', name.includes('густой') ? 'Густой' : '', name.includes('левша') ? 'Для левшей' : '', name.includes('правша') ? 'Для правшей' : ''].filter(Boolean);
      if (Object.keys(data).length) await tx.product.update({ where: { id: product.id }, data });
      result.push({ sku: product.sku, category: category.nameRu });
    }
    return result;
  });
  console.log(JSON.stringify({ metadata: changes }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
