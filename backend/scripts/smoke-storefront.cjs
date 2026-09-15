const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const api = 'http://localhost:3000/api/v1';
const email = `storefront-smoke-${Date.now()}@example.test`;

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  let userId;
  try {
    const session = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'Storefront12345', firstName: 'Тест', lastName: 'Магазина', phone: `+7999${String(Date.now()).slice(-7)}` }) });
    userId = session.user.id;
    const authorization = { Authorization: `Bearer ${session.accessToken}` };
    const products = await request('/products?limit=1');
    if (!products.items.length) throw new Error('В каталоге нет товара для проверки');
    const product = products.items[0];
    const cartSession = `smoke-${Date.now()}`;
    await request('/cart/items', { method: 'POST', headers: { 'x-cart-session': cartSession }, body: JSON.stringify({ variantId: product.variants[0].id, quantity: 1 }) });
    const cart = await request('/storefront/cart/bind', { method: 'POST', headers: { ...authorization, 'x-cart-session': cartSession } });
    await request(`/storefront/favorites/${product.id}`, { method: 'POST', headers: authorization });
    const address = await request('/storefront/addresses', { method: 'POST', headers: authorization, body: JSON.stringify({ label: 'Тестовый', recipientName: 'Тест Магазина', phone: '+79990000000', city: 'Москва', street: 'Тестовая', house: '1', isDefault: true }) });
    const dashboard = await request('/storefront/dashboard', { headers: authorization });
    const favorites = await request('/storefront/favorites', { headers: authorization });
    if (cart.userId !== userId || cart.items.length !== 1) throw new Error('Корзина не привязалась к покупателю');
    if (!favorites.some(item => item.productId === product.id)) throw new Error('Избранное не сохранилось');
    if (!dashboard.addresses.some(item => item.id === address.id)) throw new Error('Адрес не попал в кабинет');
    if (!dashboard.loyalty || dashboard.loyalty.levelLabel !== 'Старт') throw new Error('Программа лояльности не инициализирована');
    console.log(JSON.stringify({ registration: true, cartBinding: true, favorites: true, addressBook: true, loyalty: dashboard.loyalty.levelLabel, dashboard: true }, null, 2));
  } finally {
    if (userId) {
      await prisma.cart.deleteMany({ where: { userId } });
      await prisma.customer.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
