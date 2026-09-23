import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackingService, normalizeTracking } from './tracking.js';
const shipment = { carrier: 'StarTrack', trackingNumber: 'TEST123', trackingId: 'Track 1' };
const env = { AUSPOST_API_KEY: 'test-key', AUSPOST_API_PASSWORD: 'test-password', STARTRACK_ACCOUNT_NUMBER: '01234567' };
const payload = { tracking_results: [{ tracking_id: 'TEST123', status: 'In transit', trackable_items: [{ events: [
  { description: 'Received', date: '2026-09-20T10:00:00+10:00', location: 'Sydney' },
  { description: 'Processed', date: '2026-09-21T11:00:00+10:00', location: 'Melbourne' },
] }] }] };
test('normalizes the matching result and picks newest event, never another identifier', () => {
  const result = normalizeTracking(payload, 'TEST123');
  assert.equal(result.lastUpdated, '2026-09-21T11:00:00+10:00');
  assert.equal(result.events[0].description, 'Processed');
  assert.equal(normalizeTracking(payload, 'OTHER'), null);
  assert.equal(normalizeTracking({ tracking_results: [{ tracking_id: 'TEST123', errors: [{}] }] }, 'TEST123'), null);
});
test('uses verified request contract and caches concurrent requests', async () => {
  let calls = 0;
  const track = createTrackingService({ env, fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url.pathname, '/test/shipping/v1/track');
    assert.equal(url.searchParams.get('tracking_ids'), 'TEST123');
    assert.equal(options.headers['Account-Number'], '01234567');
    assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('test-key:test-password').toString('base64'));
    return { ok: true, json: async () => payload };
  } });
  const results = await Promise.all([track(shipment), track(shipment)]);
  assert.ok(results.every(r => r.availability === 'available'));
  assert.equal((await track(shipment)).cached, true);
  assert.equal(calls, 1);
});
test('returns controlled states for missing credentials, TNT, auth failures and malformed response', async () => {
  assert.equal((await createTrackingService({ env: {} })(shipment)).availability, 'not_configured');
  assert.equal((await createTrackingService({ env })({ ...shipment, carrier: 'TNT' })).availability, 'not_implemented');
  for (const fetchImpl of [async () => ({ ok: false, status: 401 }), async () => { throw new Error('SECRET'); }, async () => ({ ok: true, json: async () => ({}) }), async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })]) {
    const result = await createTrackingService({ env, fetchImpl })(shipment);
    assert.equal(result.availability, 'unavailable');
    assert.equal(result.status, null);
    assert.ok(!JSON.stringify(result).includes('SECRET'));
  }
});
test('rejects a non-official endpoint without sending credentials', async () => {
  let calls = 0;
  const track = createTrackingService({ env: { ...env, AUSPOST_BASE_URL: 'https://example.com/' }, fetchImpl: async () => { calls++; } });
  assert.equal((await track(shipment)).availability, 'unavailable');
  assert.equal(calls, 0);
});
test('limits outbound requests to ten per minute', async () => {
  let calls = 0;
  const track = createTrackingService({ env, now: () => 1000, fetchImpl: async () => { calls++; return { ok: false, status: 503 }; } });
  for (let i = 0; i < 11; i++) await track({ ...shipment, trackingNumber: String(i) });
  assert.equal(calls, 10);
});

test('generated identifiers are never sent to the courier even in testbed mode', async () => {
  let calls = 0;
  const track = createTrackingService({ env, fetchImpl: async () => { calls++; } });
  const result = await track({ ...shipment, trackingNumber: 'MOCK-ST-0001' });
  assert.equal(result.availability, 'unavailable');
  assert.equal(calls, 0);
});
