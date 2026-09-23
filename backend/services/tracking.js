const text = value => typeof value === 'string' ? value : null;
export function normalizeTracking(payload, trackingNumber) {
  const result = payload?.tracking_results?.find?.(r => r.tracking_id === trackingNumber);
  if (!result || result.errors?.length || payload.errors?.length) return null;
  const events = (Array.isArray(result.trackable_items) ? result.trackable_items : [])
    .flatMap(item => Array.isArray(item.events) ? item.events : [])
    .map(event => ({ description: text(event.description) || 'Tracking event', location: text(event.location), date: text(event.date) }))
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  if (!text(result.status) && !events.length) return null;
  return { status: text(result.status) || events[0].description, events, lastUpdated: events.find(e => Number.isFinite(Date.parse(e.date)))?.date || null };
}
export function createTrackingService({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map();
  const pending = new Map();
  let calls = [];
  async function request(shipment) {
    const base = { ...shipment, environment: 'testbed', availability: 'unavailable', status: null, lastUpdated: null, events: [], queriedAt: null };
    if (shipment.trackingNumber.startsWith('MOCK-')) return { ...base, message: 'This is a generated tracking identifier. Use mock mode to view its simulated history.' };
    if (shipment.carrier === 'TNT') return { ...base, availability: 'not_implemented', message: 'TNT tracking is not implemented. Shipping is not estimated.' };
    if (!['StarTrack', 'Australia Post'].includes(shipment.carrier)) return { ...base, availability: 'not_implemented', message: 'This carrier is not supported.' };
    const account = shipment.carrier === 'StarTrack' ? env.STARTRACK_ACCOUNT_NUMBER : env.AUSPOST_ACCOUNT_NUMBER;
    if (!env.AUSPOST_API_KEY || !env.AUSPOST_API_PASSWORD || !account) return { ...base, availability: 'not_configured', message: 'Courier credentials are not configured on the server.' };
    calls = calls.filter(t => now() - t < 60000);
    if (calls.length >= 10) return { ...base, message: 'Tracking request limit reached. Please retry in one minute.' };
    calls.push(now());
    base.queriedAt = new Date(now()).toISOString();
    try {
      const url = new URL('track', (env.AUSPOST_BASE_URL || 'https://digitalapi.auspost.com.au/test/shipping/v1/').replace(/\/?$/, '/'));
      // Credentials may only be sent to the official testbed host.
      if (url.origin !== 'https://digitalapi.auspost.com.au' || !url.pathname.startsWith('/test/shipping/v1/')) throw new Error('Invalid testbed URL');
      url.searchParams.set('tracking_ids', shipment.trackingNumber);
      const response = await fetchImpl(url, { headers: { Accept: 'application/json', 'Account-Number': account,
        Authorization: `Basic ${Buffer.from(`${env.AUSPOST_API_KEY}:${env.AUSPOST_API_PASSWORD}`).toString('base64')}` },
        signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) return { ...base, message: response.status === 401 || response.status === 403
        ? 'The courier testbed rejected the credentials or account (HTTP ' + response.status + ').'
        : response.status === 429 ? 'The courier rate limit was reached. Please try again later.'
          : `The courier testbed is unavailable (HTTP ${response.status}).` };
      const result = normalizeTracking(await response.json(), shipment.trackingNumber);
      return result ? { ...base, ...result, availability: 'available', message: 'Response from the courier testbed; not a live delivery.' }
        : { ...base, message: 'No matching tracking information was returned by the courier testbed.' };
    } catch {
      return { ...base, message: 'The courier could not be reached, timed out, or returned an invalid response. Please try again later.' };
    }
  }
  return async shipment => {
    const key = `${shipment.carrier}:${shipment.trackingNumber}`;
    const existing = cache.get(key);
    if (existing && now() - existing.at < 60000) return { ...existing.value, trackingId: shipment.trackingId, cached: true };
    if (!pending.has(key)) pending.set(key, request(shipment).then(value => { cache.set(key, { at: now(), value }); return value; }).finally(() => pending.delete(key)));
    return { ...await pending.get(key), trackingId: shipment.trackingId, cached: false };
  };
}
