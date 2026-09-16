/* Explicit local catalogue setup, not a seed, payment test or card issuance. */
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { ConfigService } = require('@nestjs/config');
const { GiftCardsService } = require('../dist/src/gift-cards/gift-cards.service');
const { IntegrationSecretsService } = require('../dist/src/system-settings/integration-secrets.service');

async function main() {
  const database = new URL(process.env.DATABASE_URL || '');
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.port !== '5432') throw new Error('Only the local PostgreSQL on port 5432 is allowed');
  const prisma = new PrismaClient();
  try {
    const config = new ConfigService(process.env);
    const service = new GiftCardsService(prisma, new IntegrationSecretsService(config), config);
    let product = await service.getProduct();
    if (process.argv.includes('--publish-defaults') && !product.id) {
      product = await service.saveProduct({ nameRu: product.nameRu, descriptionRu: product.descriptionRu, denominations: product.denominations, validityDays: product.validityDays, isActive: true }, null);
      console.log('Created and published the local gift-card product. No cards, orders or payments issued.');
    } else console.log('Existing catalogue settings preserved; no mutation.');
    console.log(JSON.stringify({ id: product.id, slug: product.slug, isActive: product.isActive, denominations: product.denominations, validityDays: product.validityDays }));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
