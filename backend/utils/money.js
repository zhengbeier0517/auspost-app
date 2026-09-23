// Exact positive decimal parsing and half-up division, in cents.
export function cents(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const match = String(value).trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const result = BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? result : null;
}
export const roundDivide = (value, divisor) => (value + divisor / 2n) / divisor;
export const dollars = value => Number(value) / 100;
