import { Router } from 'express';
import { listOrders, getOrder, getTracking, getProducts } from '../controllers/orders.js';
const router = Router();
router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.get('/orders', listOrders);
router.get('/orders/:orderNo', getOrder);
router.get('/orders/:orderNo/tracking', getTracking);
router.get('/products', getProducts);
export default router;
