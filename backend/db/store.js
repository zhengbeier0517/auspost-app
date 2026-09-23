import { readFile } from 'node:fs/promises';
const dataUrl = new URL('../../docs/', import.meta.url);
export async function readStore() {
  const [catalog, fixtures] = await Promise.all([
    readFile(new URL('db-data.json', dataUrl), 'utf8').then(JSON.parse),
    readFile(new URL('test-data.json', dataUrl), 'utf8').then(JSON.parse),
  ]);
  if (!Array.isArray(catalog.rows) || !Array.isArray(fixtures.orders)) throw new Error('Invalid data structure');
  return { products: catalog.rows, orders: fixtures.orders, originPostcode: fixtures.originPostcode };
}
