import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { transpileModule, ModuleKind } from 'typescript';
import { randomFillSync } from 'crypto';
describe('Request IDs in HTTP LAN preview', () => {
 const path = existsSync('/frontend/shared/request-key.ts') ? '/frontend/shared/request-key.ts' : resolve(__dirname, '../../../frontend/shared/request-key.ts');
 const code = transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
 it('generates distinct UUIDv4 keys without the secure-context randomUUID API', () => {
  const exports: any = {};runInNewContext(code, { exports, crypto: { getRandomValues: (bytes: Uint8Array) => randomFillSync(bytes) } });
  const keys = Array.from({length: 100}, () => exports.requestKey());expect(new Set(keys).size).toBe(100);
  expect(keys.every(key => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key))).toBe(true);
 });
 it('uses the native generator when available', () => {
  const exports: any = {}, randomUUID = jest.fn(() => 'native');runInNewContext(code, { exports, crypto: { randomUUID } });expect(exports.requestKey()).toBe('native');expect(randomUUID).toHaveBeenCalledTimes(1);
 });
});
