import { readStore } from '../db/store.js';
import { buildOrder } from '../services/orders.js';
import { createTrackingService } from '../services/tracking.js';
import { mockTracking } from '../services/mockTracking.js';
const track = createTrackingService();
const trackingMode = process.env.TRACKING_MODE || 'mock';
const present = (order, products) => ({ ...buildOrder(order, products), trackingMode });
export async function listOrders(req, res) {
  const store = await readStore();
  res.json({ orders: store.orders.map(order => present(order, store.products)), originPostcode: store.originPostcode });
}
export async function getOrder(req, res) {
  const store = await readStore();
  const order = store.orders.find(o => o.orderNo === req.params.orderNo);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  res.json(present(order, store.products));
}
export async function getTracking(req, res) {
  const store = await readStore();
  const order = store.orders.find(o => o.orderNo === req.params.orderNo);
  if (!order) return res.status(404).json({ message: 'Order not found.' });
  const unique = [...new Map(order.shipments.map(s => [`${s.carrier}:${s.trackingNumber}`, s])).values()];
  res.json({ shipments: await Promise.all(unique.map(shipment => trackingMode === 'testbed' ? track(shipment) : mockTracking(shipment))) });
}
export async function getProducts(req, res) { res.json({ products: (await readStore()).products }); }
