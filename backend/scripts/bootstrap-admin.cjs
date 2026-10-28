// Explicit first installation command. Credentials arrive on stdin, never argv/logs.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
async function main() {
  process.stdin.setEncoding('utf8');
  let input = ''; for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error('Input too large'); }
  const data = JSON.parse(input), email = String(data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Invalid email');
  if (typeof data.password !== 'string' || data.password.length < 16 || Buffer.byteLength(data.password, 'utf8') > 72 || !/[a-zа-я]/i.test(data.password) || !/\d/.test(data.password)) throw new Error('Password must contain at least 16 characters, a letter and a digit, within 72 UTF-8 bytes');
  const db = new PrismaClient();
  try {
    const password = await bcrypt.hash(data.password, 12);
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(782431102)`;
      if (await tx.user.count({ where: { role: 'ADMIN' } })) throw new Error('Administrator already exists; use CRM account management');
      if (await tx.user.findUnique({ where: { email } })) throw new Error('Account already exists; no existing account was modified');
      await tx.user.create({ data: { email, password, role: 'ADMIN', firstName: 'Администратор', forcePasswordChange: true, passwordChangedAt: new Date() } });
    });
    console.log('First administrator created. Change the password after signing in.');
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error?.message?.startsWith('Administrator already') || error?.message?.startsWith('Account already') || error?.message?.startsWith('Password must') || error?.message === 'Invalid email' ? error.message : 'Administrator bootstrap failed; no existing account was modified'); process.exitCode = 1; });
