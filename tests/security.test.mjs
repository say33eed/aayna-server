import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const base = { ...process.env, NODE_ENV: 'production', CLIENT_ORIGIN: 'https://example.com', BETTER_AUTH_URL: 'https://example.com', BETTER_AUTH_SECRET: 'test-only-not-a-real-secret-1234567890', MONGODB_URI: 'mongodb://localhost:27017', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', STRIPE_SECRET_KEY: 'sk_test_placeholder', STRIPE_WEBHOOK_SECRET: 'whsec_placeholder', IMGBB_API_KEY: 'test' };
function config(overrides) { return spawnSync(process.execPath, ['--input-type=module','-e','await import("./dist/config/env.js")'], { env: {...base,...overrides}, encoding:'utf8' }); }
test('production accepts complete HTTPS test configuration', () => assert.equal(config({}).status,0));
for (const [key,value] of Object.entries({CLIENT_ORIGIN:'http://example.com', BETTER_AUTH_URL:'http://example.com', BETTER_AUTH_SECRET:'short', STRIPE_SECRET_KEY:'sk_live_placeholder', IMGBB_API_KEY:'', GOOGLE_CLIENT_SECRET:''})) {
  test(`production rejects unsafe ${key}`, () => assert.notEqual(config({[key]:value}).status,0));
}
test('OpenAPI readiness documents failure', async () => { const {openapi}=await import('../dist/openapi.js'); assert.ok(openapi.paths['/health/ready'].get.responses['503']); });
