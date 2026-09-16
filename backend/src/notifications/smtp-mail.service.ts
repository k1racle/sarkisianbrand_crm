import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface OutgoingMail {
  recipient: string;
  subject: string;
  text: string;
}

/** Neither creating a transport nor resolving an SMTP host is allowed in safe mode. */
@Injectable()
export class SmtpMailService {
  constructor(private readonly config: ConfigService) {}

  deliveryEnabled(): boolean {
    return this.enabled('MAIL_DELIVERY_ENABLED') && this.enabled('STOREFRONT_EXTERNAL_CALLS_ENABLED');
  }

  private enabled(key: string): boolean {
    const value = this.config.get<string | boolean>(key, false);
    return value === true || value === 'true';
  }

  async send(mail: OutgoingMail): Promise<void> {
    if (!this.deliveryEnabled()) throw new Error('MAIL_DELIVERY_DISABLED');
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    const port = Number(this.config.get<string | number>('SMTP_PORT', 587));
    if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535 || (!!user !== !!pass)) {
      throw new Error('SMTP_CONFIGURATION_INVALID');
    }
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: user && pass ? { user, pass } : undefined,
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      dnsTimeout: 15_000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      // Recheck immediately before the only network operation.
      if (!this.deliveryEnabled()) throw new Error('MAIL_DELIVERY_DISABLED');
      const result = await transport.sendMail({
        from,
        to: { name: '', address: mail.recipient },
        envelope: { from, to: [mail.recipient] },
        subject: mail.subject,
        text: mail.text,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP_RECIPIENT_REJECTED');
    } finally {
      transport.close();
    }
  }
}
