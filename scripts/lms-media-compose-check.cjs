/* Check only a synthetic Compose configuration; never print credentials. */
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const env = { ...process.env, DB_PASSWORD:'fixture_db', DB_MIGRATION_PASSWORD:'fixture_migration', REDIS_PASSWORD:'fixture_redis', JWT_SECRET:'fixture_jwt', JWT_REFRESH_SECRET:'fixture_refresh', INTEGRATION_ENCRYPTION_KEY:'fixture_encryption', SITE_HOST:'fixture.invalid', ACME_EMAIL:'fixture@example.invalid', PORTAINER_PROXY_NETWORK:'fixture-network', LMS_LIVE_ENABLED:'false', LMS_LIVEKIT_URL:'wss://media.example.invalid', LMS_LIVEKIT_API_KEY:'fixture-key', LMS_LIVEKIT_API_SECRET:'fixture-only-secret-longer-than-32-characters', LMS_LIVEKIT_GATEWAY_KEY:'a'.repeat(64) };
const result = spawnSync('docker',['compose','-f','docker-compose.production.yml','-f','docker-compose.portainer.yml','-f','docker-compose.lms-media.yml','config','--format','json'],{encoding:'utf8',env});
if (result.status !== 0) throw new Error('Unable to validate isolated LMS media Compose configuration');
const config = JSON.parse(result.stdout), s = config.services;
assert.equal(String(s.backend.environment.LMS_LIVE_ENABLED),'false');
assert.equal(s.backend.environment.LMS_LIVEKIT_API_URL,'http://livekit-lms:7880');
assert.equal(s.frontend.environment.NUXT_PUBLIC_LMS_MEDIA_ORIGIN,'wss://media.example.invalid');
assert.ok(!s['livekit-lms'].ports.some(port => Number(port.target) === 7880),'LiveKit signal/control API must not be published on the host');
assert.deepEqual(s['livekit-lms'].ports.map(port => `${port.target}/${port.protocol}`).sort(),['7881/tcp','7882/udp']);
assert.ok(!s['lms-media-gateway'].ports?.length,'Media gateway has no host ports');
assert.ok(Object.hasOwn(s.backend.networks,'lms_media') && Object.hasOwn(s['livekit-lms'].networks,'lms_media') && Object.hasOwn(s['lms-media-gateway'].networks,'lms_media'));
assert.ok(s['lms-media-gateway'].networks.portainer_proxy.aliases.includes('sarkisian-lms-gateway'));
assert.ok(!s['livekit-lms'].networks.portainer_proxy,'NPM must not bypass the authorized signal gateway');
assert.ok(s['livekit-lms'].image.includes('@sha256:'),'Media server image must be pinned');
console.log('PASS LMS media Compose: disabled by default, private control API, isolated signalling and explicit RTC ports');
