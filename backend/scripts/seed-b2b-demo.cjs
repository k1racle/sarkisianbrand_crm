const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const email = process.env.B2B_DEMO_EMAIL || 'b2b-demo@sarkisianbrand.ru';
const password = process.env.B2B_DEMO_PASSWORD || 'SarkisianB2B!2026';

function atFutureDay(days, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: await bcrypt.hash(password, 12), role: 'CUSTOMER_B2B', isActive: true },
    create: {
      email,
      password: await bcrypt.hash(password, 12),
      firstName: 'Анна',
      lastName: 'Волкова',
      phone: '+79990002026',
      role: 'CUSTOMER_B2B',
      city: 'Москва',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: user.id },
    update: { segment: 'B2B', status: 'ACTIVE' },
    create: {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      normalizedEmail: user.email.toLowerCase(),
      normalizedPhone: '79990002026',
      segment: 'B2B',
      source: 'DEMO',
    },
  });

  await prisma.b2BProfile.upsert({
    where: { userId: user.id },
    update: { companyName: 'Студия красоты «Форма»', inn: '7700123456' },
    create: { userId: user.id, companyName: 'Студия красоты «Форма»', inn: '7700123456', kpp: '770001001', legalAddress: 'Москва, Цветной бульвар, 15' },
  });

  const organization = await prisma.organization.upsert({
    where: { inn: '7700123456' },
    update: { name: 'Студия красоты «Форма»', status: 'ACTIVE', discountTier: 15 },
    create: {
      name: 'Студия красоты «Форма»',
      legalName: 'ООО «Студия Форма»',
      inn: '7700123456',
      kpp: '770001001',
      legalAddress: 'Москва, Цветной бульвар, 15',
      status: 'ACTIVE',
      discountTier: 15,
      creditLimit: 150000,
    },
  });

  const member = await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { customerId: customer.id, role: 'OWNER', isActive: true, canOrder: true, canSeeFinance: true },
    create: { organizationId: organization.id, userId: user.id, customerId: customer.id, role: 'OWNER', jobTitle: 'Руководитель студии', canOrder: true, canSeeFinance: true },
  });

  const legacyIds = ['b2b-demo-booking-001', 'b2b-demo-booking-002', 'b2b-demo-booking-003'];
  await prisma.b2BBooking.deleteMany({ where: { id: { in: legacyIds } } });
  await prisma.b2BClient.deleteMany({ where: { id: { in: ['b2b-demo-client-001', 'b2b-demo-client-002', 'b2b-demo-client-003', 'b2b-demo-client-004'] } } });
  await prisma.b2BService.deleteMany({ where: { id: { in: ['b2b-demo-service-001', 'b2b-demo-service-002', 'b2b-demo-service-003'] } } });

  const clients = [
    ['10000000-0000-4000-8000-000000000101', 'Мария', 'Орлова', '+79991112233', 'VIP, гель-лак', 14, 63800],
    ['10000000-0000-4000-8000-000000000102', 'Елена', 'Соколова', '+79992223344', 'маникюр', 8, 32600],
    ['10000000-0000-4000-8000-000000000103', 'София', 'Ким', '+79993334455', 'новый клиент', 2, 7200],
    ['10000000-0000-4000-8000-000000000104', 'Виктория', 'Лебедева', '+79994445566', 'дизайн', 6, 28100],
  ];
  for (const [id, firstName, lastName, phone, tag, totalVisits, totalSpent] of clients) {
    await prisma.b2BClient.upsert({
      where: { id },
      update: { organizationId: organization.id, firstName, lastName, phone, tags: [tag], totalVisits, totalSpent, status: 'ACTIVE' },
      create: { id, organizationId: organization.id, firstName, lastName, phone, tags: [tag], totalVisits, totalSpent, lastVisitAt: atFutureDay(-7, 12), consentPersonalDataAt: new Date(), source: 'DEMO' },
    });
  }

  const services = [
    ['20000000-0000-4000-8000-000000000201', 'Маникюр с покрытием', 'Полный комплекс с выравниванием ногтевой пластины', 90, 3200, '#f8604a'],
    ['20000000-0000-4000-8000-000000000202', 'Укрепление и коррекция', 'Коррекция формы и укрепление материалами Sarkisian', 120, 4100, '#222326'],
    ['20000000-0000-4000-8000-000000000203', 'Экспресс-дизайн', 'Акцентный дизайн до четырёх ногтей', 30, 1400, '#c89f77'],
  ];
  for (const [id, name, description, duration, price, color] of services) {
    await prisma.b2BService.upsert({
      where: { id },
      update: { organizationId: organization.id, name, description, duration, price, color, isActive: true },
      create: { id, organizationId: organization.id, name, description, duration, price, color },
    });
  }

  const bookings = [
    ['30000000-0000-4000-8000-000000000301', clients[0][0], services[0][0], 0, 18, 30, 'CONFIRMED'],
    ['30000000-0000-4000-8000-000000000302', clients[1][0], services[1][0], 1, 11, 0, 'NEW'],
    ['30000000-0000-4000-8000-000000000303', clients[3][0], services[2][0], 2, 15, 30, 'CONFIRMED'],
  ];
  for (const [id, clientId, serviceId, day, hour, minute, status] of bookings) {
    const service = services.find((item) => item[0] === serviceId);
    const startTime = atFutureDay(day, hour, minute);
    await prisma.b2BBooking.upsert({
      where: { id },
      update: { organizationId: organization.id, clientId, serviceId, masterMemberId: member.id, startTime, endTime: new Date(startTime.getTime() + service[3] * 60000), status },
      create: { id, organizationId: organization.id, clientId, serviceId, masterMemberId: member.id, startTime, endTime: new Date(startTime.getTime() + service[3] * 60000), status, notes: 'Демонстрационная запись' },
    });
  }

  console.log(JSON.stringify({ email, password, organization: organization.name, clients: clients.length, services: services.length, bookings: bookings.length }, null, 2));
}

main().finally(() => prisma.$disconnect());
