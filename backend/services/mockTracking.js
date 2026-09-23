// Offline fixtures are explicitly labelled; this function never calls a courier.
export function mockTracking(shipment) {
  const { mockTracking: fixture, ...identity } = shipment;
  const events = (fixture?.events || []).map(event => ({ ...event }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return { ...identity, environment: 'mock', availability: fixture ? 'available' : 'unavailable',
    status: fixture?.status || null, events, lastUpdated: events[0]?.date || null,
    queriedAt: null, cached: false, isSimulated: true,
    message: fixture ? 'Simulated tracking history from local test data. No courier API was called.'
      : 'No simulated tracking history is available for this shipment.' };
}
