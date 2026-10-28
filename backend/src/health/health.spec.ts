import { HealthController, HealthService } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';
const ping = jest.fn(), connect = jest.fn(), disconnect = jest.fn();
jest.mock('ioredis', () => ({ __esModule: true, default: jest.fn(() => ({ status: 'wait', on: jest.fn(), ping, connect, disconnect })) }));
describe('Infrastructure health probes', () => {
  beforeEach(() => { jest.clearAllMocks(); ping.mockResolvedValue('PONG'); connect.mockResolvedValue(undefined); });
  function service(query = jest.fn().mockResolvedValue([{ '?column?': 1 }])) {
    return { health: new HealthService({ $queryRaw: query } as any, { get: () => 'redis://fixture:6379' } as any), query };
  }
  it('liveness does not depend on database or Redis', () => {
    const { health, query } = service(); expect(new HealthController(health).live()).toEqual({ status: 'ok' }); expect(query).not.toHaveBeenCalled(); expect(ping).not.toHaveBeenCalled();
  });
  it('readiness verifies database and Redis without returning internal details', async () => {
    const { health, query } = service(); await expect(health.readiness()).resolves.toEqual({ status: 'ready' }); expect(query).toHaveBeenCalledTimes(1); expect(ping).toHaveBeenCalledTimes(1); health.onModuleDestroy(); expect(disconnect).toHaveBeenCalledTimes(1);
  });
  it('coalesces concurrent probes and recovers after a dependency failure', async () => {
    const { health, query } = service(); query.mockRejectedValueOnce(new Error('postgres://secret')); const first = health.readiness(), second = health.readiness(); expect(first).toBe(second);
    await expect(first).rejects.toThrow('Not ready'); await expect(health.readiness()).resolves.toEqual({ status: 'ready' });
  });
  it('Redis failure makes readiness unavailable', async () => {
    const { health } = service(); ping.mockRejectedValue(new Error('redis password')); await expect(health.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('bounds hanging dependencies to two seconds', async () => {
    jest.useFakeTimers(); const { health } = service(jest.fn(() => new Promise(() => undefined))); const result = health.readiness(); const assertion = expect(result).rejects.toThrow('Not ready'); await jest.advanceTimersByTimeAsync(2000); await assertion; jest.useRealTimers();
  });
});
