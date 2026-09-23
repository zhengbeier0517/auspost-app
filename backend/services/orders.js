import { cents, roundDivide, dollars } from '../utils/money.js';
export function buildOrder(order, products) {
  const index = new Map();
  for (const product of products) {
    const key = String(product.SKU || '').trim();
    index.set(key, index.has(key) ? null : product);
  }
  let subtotal = 0n;
  const items = order.items.map(item => {
    const sku = String(item.sku || '').trim();
    const product = index.get(sku);
    let error = !product ? (index.has(sku) ? 'Duplicate product SKU' : 'Product not found') : null;
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) error = 'Quantity must be a positive integer';
    const price = product ? cents(product.RRP) : null;
    if (product && price === null) error = 'Invalid product price';
    let line = null;
    if (!error) {
      line = roundDivide(price * BigInt(item.quantity) * 10n, 11n);
      if (line > BigInt(Number.MAX_SAFE_INTEGER)) error = 'Amount exceeds supported range';
      else subtotal += line;
    }
    return { ...item, product: product || null, error, rrp: price === null ? null : dollars(price),
      unitExGst: price === null ? null : dollars(roundDivide(price * 10n, 11n)),
      lineSubtotal: error ? null : dollars(line) };
  });
  const complete = items.every(item => !item.error) && items.length > 0 && subtotal <= BigInt(Number.MAX_SAFE_INTEGER) / 2n;
  const gst = roundDivide(subtotal, 10n);
  return { ...order, items, itemCount: items.reduce((sum, i) => sum + (Number.isSafeInteger(i.quantity) && i.quantity > 0 ? i.quantity : 0), 0),
    amounts: { currency: 'AUD', calculationStatus: complete ? 'complete' : 'incomplete',
      subtotalExGst: complete ? dollars(subtotal) : null, gst: complete ? dollars(gst) : null,
      shipmentFee: 0, total: complete ? dollars(subtotal + gst) : null,
      shippingStatus: 'not_estimated', shippingReason: 'Shipping has not been estimated. A$0.00 is a placeholder, not free delivery.' } };
}
