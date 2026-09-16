import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SmtpMailService } from './smtp-mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('SMTP safety (transport mocked, no outbound calls)', () => {
  const mail = { recipient: 'test@example.test', subject: 'Тема', text: 'Текст' };
  const configuration = (values: Record<string, any>) => ({
    get: (key: string, fallback?: any) => values[key] ?? fallback,
  }) as unknown as ConfigService;
  beforeEach(() => jest.clearAllMocks());

  it.each([
    {},
    { MAIL_DELIVERY_ENABLED: 'true' },
    { STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true' },
    { MAIL_DELIVERY_ENABLED: 'false', STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true' },
    { MAIL_DELIVERY_ENABLED: '1', STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true' },
  ])('never creates an SMTP transport unless both flags are explicitly true: %j', async (flags) => {
    const service = new SmtpMailService(configuration(flags));
    expect(service.deliveryEnabled()).toBe(false);
    await expect(service.send(mail)).rejects.toThrow('MAIL_DELIVERY_DISABLED');
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it.each([465, 587])('requires verified TLS, no file/URL access and no protocol logging on port %i', async (port) => {
    const sendMail = jest.fn().mockResolvedValue({ accepted: [mail.recipient], rejected: [] });
    const close = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, close });
    const service = new SmtpMailService(configuration({
      MAIL_DELIVERY_ENABLED: 'true', STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true',
      SMTP_HOST: 'smtp.example.test', SMTP_FROM: 'sender@example.test', SMTP_PORT: port,
    }));
    await service.send(mail);
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      secure: port === 465, requireTLS: port !== 465,
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: { name: '', address: mail.recipient }, envelope: { from: 'sender@example.test', to: [mail.recipient] },
    }));
    expect(close).toHaveBeenCalled();
  });

  it('fails closed for incomplete SMTP configuration before creating a transport', async () => {
    const service = new SmtpMailService(configuration({ MAIL_DELIVERY_ENABLED: true, STOREFRONT_EXTERNAL_CALLS_ENABLED: true }));
    await expect(service.send(mail)).rejects.toThrow('SMTP_CONFIGURATION_INVALID');
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});
