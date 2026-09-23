import test from 'node:test';
import assert from 'node:assert/strict';
import { readStore } from '../db/store.js';
import { mockTracking } from './mockTracking.js';
test('23 orders use unique identifiers and coherent offline tracking histories', async () => {
  const { orders } = await readStore();
  assert.equal(orders.length, 23);
  assert.equal(new Set(orders.map(o => o.orderNo)).size, 23);
  const numbers = new Set();
  const statuses = new Set();
  for (const order of orders) for (const shipment of order.shipments) {
    assert.ok(!numbers.has(shipment.trackingNumber));
    numbers.add(shipment.trackingNumber);
    const result = mockTracking(shipment);
    assert.equal(result.environment, 'mock');
    assert.equal(result.isSimulated, true);
    assert.equal(result.availability, 'available');
    assert.equal(result.queriedAt, null);
    assert.equal(result.events[0].description, result.status);
    assert.equal(result.lastUpdated, result.events[0].date);
    assert.ok(result.events.every(e => Date.parse(e.date) >= Date.parse(`${order.orderDate}T00:00:00+10:00`)));
    assert.ok(result.events.every((e,i,a) => !i || Date.parse(a[i-1].date) >= Date.parse(e.date)));
    if (order.status === 'Completed') assert.equal(result.status, 'Delivered');
    statuses.add(result.status);
  }
  assert.ok(statuses.size >= 5);
});
test('missing mock history is unavailable, not a fabricated delivery', () => {
  assert.equal(mockTracking({ trackingNumber: 'MOCK-EMPTY' }).availability, 'unavailable');
});
