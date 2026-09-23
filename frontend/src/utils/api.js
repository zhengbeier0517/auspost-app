export async function api(path, signal) {
  const response = await fetch(`/api${path}`, { signal })
  if (!response.ok) throw new Error('We could not load this information. Please try again.')
  return response.json()
}
export const money = value => value == null ? '—' : new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', currencyDisplay: 'code' }).format(value).replace('AUD', 'A$').replace(/\s/g, '')
export const date = value => value ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Not provided'
export function eventDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not provided'
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney', timeZoneName: 'short' }).format(new Date(value))
}
