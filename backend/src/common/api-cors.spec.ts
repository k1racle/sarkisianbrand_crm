import { apiCorsOrigins } from './api-cors';

describe('API CORS configuration', () => {
  it('uses the canonical singular variable', () => {
    expect(apiCorsOrigins({ NODE_ENV: 'production', CORS_ORIGIN: 'http://localhost:3001,http://127.0.0.1:3001' })).toEqual(['http://localhost:3001', 'http://127.0.0.1:3001']);
  });
  it('accepts the plural variable used by older local launch scripts', () => {
    expect(apiCorsOrigins({ NODE_ENV: 'production', CORS_ORIGINS: 'http://localhost:3001' })).toEqual(['http://localhost:3001']);
  });
  it('prefers an explicit canonical value over the alias', () => {
    expect(apiCorsOrigins({ CORS_ORIGIN: 'https://store.example.test', CORS_ORIGINS: 'http://localhost:3001' })).toEqual(['https://store.example.test']);
  });
  it('trims, deduplicates and removes empty entries', () => {
    expect(apiCorsOrigins({ CORS_ORIGIN: ' http://localhost:3001, ,http://localhost:3001 ' })).toEqual(['http://localhost:3001']);
  });
  it('keeps unconfigured production closed', () => {
    expect(apiCorsOrigins({ NODE_ENV: 'production' })).toBe(false);
  });
  it('keeps the loopback development defaults', () => {
    expect(apiCorsOrigins({ NODE_ENV: 'development' })).toEqual(['http://localhost:3001', 'http://127.0.0.1:3001']);
  });
});
