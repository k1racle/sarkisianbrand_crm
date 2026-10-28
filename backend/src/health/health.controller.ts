import { Controller, Get, Header, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

/** Infrastructure probes return no configuration, exception or customer data. */
@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly redis: Redis;
  private checking?: Promise<{ status: string }>;
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    this.redis = new Redis(config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379'), {
      lazyConnect: true, connectTimeout: 1500, commandTimeout: 1500, maxRetriesPerRequest: 0,
      enableOfflineQueue: false, retryStrategy: () => null,
    });
    this.redis.on('error', () => undefined);
  }
  readiness() {
    // Coalesce simultaneous load-balancer requests into one bounded probe.
    return this.checking ||= this.check().finally(() => { this.checking = undefined; });
  }
  private async check() {
    let timeout: NodeJS.Timeout;
    try {
      await Promise.race([
        Promise.all([
          this.prisma.$queryRaw`SELECT 1`,
          (async () => {
            if (['wait', 'end'].includes(this.redis.status)) await this.redis.connect();
            if (await this.redis.ping() !== 'PONG') throw new Error();
          })(),
        ]),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error()), 2000); timeout.unref(); }),
      ]);
      return { status: 'ready' };
    } catch { throw new ServiceUnavailableException('Not ready'); }
    finally { clearTimeout(timeout!); }
  }
  onModuleDestroy() { this.redis.disconnect(); }
}

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get('live') @Header('Cache-Control', 'no-store')
  live() { return { status: 'ok' }; }
  @Get('ready') @Header('Cache-Control', 'no-store')
  ready() { return this.health.readiness(); }
}
