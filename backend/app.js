import express from 'express';
import { pathToFileURL } from 'node:url';
import routes from './routes/orders.js';
import { errors } from './middlewares/errors.js';
export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', routes);
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use(errors);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = app.listen(Number(process.env.PORT) || 3001, '0.0.0.0', () => console.log('Order service is ready on port ' + (process.env.PORT || 3001)));
  process.on('SIGTERM', () => server.close());
}
