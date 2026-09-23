import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrder } from './orders.js';
import { readStore } from '../db/store.js';
const order = items => ({ orderNo: 'TEST', items, shipments: [] });
const item = (sku, quantity) => ({ sku, quantity, trackingId: 'Track 1' });
test('99 AUD including GST, two units: 180 subtotal + 18 GST', () => {
  const result = buildOrder(order([item('A', 2)]), [{ SKU: 'A', RRP: '99.00' }]);
  assert.equal(result.amounts.subtotalExGst, 180);
  assert.equal(result.amounts.gst, 18);
  assert.equal(result.amounts.total, 198);
});
test('rounds each line half-up before summing and deriving tax', () => {
  const result = buildOrder(order([item('A', 3), item('B', 1)]), [{ SKU: 'A', RRP: '175.00' }, { SKU: 'B', RRP: '120.00' }]);
  assert.deepEqual(result.items.map(i => i.lineSubtotal), [477.27, 109.09]);
  assert.equal(result.amounts.subtotalExGst, 586.36);
  assert.equal(result.amounts.gst, 58.64);
  assert.equal(result.amounts.total, 645);
});
test('missing products make total incomplete instead of substituting zero', () => {
  const result = buildOrder(order([item('missing', 2)]), []);
  assert.equal(result.items[0].error, 'Product not found');
  assert.equal(result.amounts.total, null);
  assert.equal(result.amounts.calculationStatus, 'incomplete');
});
test('rejects invalid quantities, prices and duplicate product keys', () => {
  for (const quantity of [0, -1, 1.5, '2', NaN]) {
    assert.equal(buildOrder(order([item('A', quantity)]), [{ SKU: 'A', RRP: '99.00' }]).amounts.total, null);
  }
  for (const RRP of ['-1', '', 'abc', '1.999', null, Infinity]) {
    assert.equal(buildOrder(order([item('A', 1)]), [{ SKU: 'A', RRP }]).amounts.total, null);
  }
  assert.equal(buildOrder(order([item('A', 1)]), [{ SKU: 'A', RRP: '1' }, { SKU: 'A', RRP: '2' }]).items[0].error, 'Duplicate product SKU');
});
test('all generated fixtures reference actual catalog products and valid shipment groups', async () => {
  const store = await readStore();
  const referenced = new Set();
  for (const input of store.orders) {
    const result = buildOrder(input, store.products);
    assert.equal(result.amounts.calculationStatus, 'complete');
    assert.equal(result.isTestData, true);
    for (const line of input.items) {
      referenced.add(line.sku);
      assert.ok(input.shipments.some(s => s.trackingId === line.trackingId));
    }
  }
  assert.equal(referenced.size, store.products.length);
  assert.equal(buildOrder(store.orders[0], store.products).amounts.total, 668);
});
