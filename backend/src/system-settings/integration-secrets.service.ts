import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class IntegrationSecretsService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const source = config.get<string>('INTEGRATION_ENCRYPTION_KEY') || config.get<string>('JWT_SECRET') || 'local-development-only';
    this.key = createHash('sha256').update(source).digest();
  }

  encrypt(value: Record<string, string>) {
    if (!Object.keys(value).length) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  decrypt(value?: string | null): Record<string, string> {
    if (!value) return {};
    try {
      const [version, iv, tag, payload] = value.split('.');
      if (version !== 'v1' || !iv || !tag || !payload) return {};
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(payload, 'base64url')), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch {
      return {};
    }
  }
}
