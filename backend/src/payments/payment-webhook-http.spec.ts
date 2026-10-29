import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AlternativePaymentsService } from './alternative-payments.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

describe('payment callbacks: loopback HTTP contract', () => {
  let app: INestApplication, base: string;
  const callbacks = { roboResult: jest.fn(async () => 'OK123'), tbankResult: jest.fn(async () => 'OK'), providers: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [PaymentsController], providers: [{ provide: PaymentsService, useValue: {} }, { provide: AlternativePaymentsService, useValue: callbacks }] }).overrideGuard(OptionalJwtAuthGuard).useValue({ canActivate: () => true }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address(); base = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => { await app?.close(); });
  it('Robokassa form POST reaches the verifier without losing scalar fields and returns exact text', async () => {
    const response = await fetch(`${base}/payments/webhook/robokassa`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ OutSum: '12.000000', InvId: '123', SignatureValue: 'signed', Shp_bad: 'untrusted' }) });
    expect(response.status).toBe(200); expect(response.headers.get('content-type')).toMatch(/^text\/plain/); expect(await response.text()).toBe('OK123');
    expect(callbacks.roboResult).toHaveBeenCalledWith(expect.objectContaining({ OutSum: '12.000000', InvId: '123', Shp_bad: 'untrusted' }));
  });
  it('T-Bank JSON POST reaches the verifier and returns exact OK', async () => {
    const response = await fetch(`${base}/payments/webhook/tbank`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ TerminalKey: 'fixture', Amount: 1200, Success: true }) });
    expect(response.status).toBe(200); expect(await response.text()).toBe('OK');
    expect(callbacks.tbankResult).toHaveBeenCalledWith(expect.objectContaining({ TerminalKey: 'fixture', Amount: 1200, Success: true }));
  });
});
