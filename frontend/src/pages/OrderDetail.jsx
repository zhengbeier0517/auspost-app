import { useEffect, useState } from 'react'
import Icon from '../../components/Icon'
import ProductImage from '../../components/ProductImage'
import { api, money, date, eventDate } from '../utils/api'

export default function OrderDetail({ order, onBack }) {
  const [tracking, setTracking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api(`/orders/${encodeURIComponent(order.orderNo)}/tracking`, controller.signal)
      .then(data => { setTracking(data.shipments); setError('') })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [order.orderNo, attempt])
  const refresh = () => { setLoading(true); setAttempt(attempt + 1) }
  const exportOrder = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...order, tracking }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${order.orderNo}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    // Keep the blob available until the browser has consumed the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const address = order.shippingAddress
  const totals = order.amounts
  return <>
    <button className="back-link" onClick={onBack}><Icon name="back" size={16}/> Back to orders</button>
    <div className="detail-heading"><div><div className="eyebrow">ORDER DETAILS</div><h1>{order.orderNo}</h1><div className="order-meta"><span>{date(order.orderDate)}</span><span className="meta-dot">·</span><span>{order.itemCount} items</span><span className="meta-dot">·</span><span className={`status ${order.status.toLowerCase().replaceAll(' ','-')}`}><span/>{order.status}</span></div></div><button className="button secondary" onClick={exportOrder}><Icon name="download" size={17}/> Export order</button></div>
    <div className="test-banner"><span>TEST ORDER</span>Fictional order and customer · Prices from the supplied product catalog · Tracking uses the courier testbed</div>
    <div className="detail-grid"><div className="detail-primary">
      <section className="panel"><div className="section-heading"><div className="section-title"><Icon name="box"/><h2>Order items</h2><span className="count-badge">{order.items.length}</span></div><span className="muted">Prices in AUD</span></div>
        <div className="table-scroll"><table className="items-table"><thead><tr><th>PRODUCT</th><th>UNIT PRICE</th><th>QTY</th><th>SUBTOTAL</th></tr></thead><tbody>{order.items.map((item,i) => <tr key={`${item.sku}-${i}`}><td><div className="product-cell"><ProductImage product={item.product} index={i}/><div><h3>{item.product?.ProductName?.trim() || 'Product not found'}</h3><code>{item.sku}</code><span className="tracking-tag"><Icon name="truck" size={12}/>{item.trackingId}</span>{item.error && <small className="error-text">{item.error}</small>}</div></div></td><td className="price-cell"><strong>{money(item.rrp)}</strong><small>incl. GST</small><small>{money(item.unitExGst)} ex GST</small></td><td><span className="qty">{item.quantity}</span></td><td className="amount">{money(item.lineSubtotal)}<small>ex GST</small></td></tr>)}</tbody></table></div>
        <div className="items-note"><Icon name="info" size={15}/> Product illustrations are placeholders. Line subtotals exclude GST.</div>
      </section>
      <section className="panel tracking-panel"><div className="section-heading"><div className="section-title"><Icon name="truck"/><h2>Shipment tracking</h2><span className="count-badge">{order.shipments.length}</span></div><button className="text-button" onClick={refresh} disabled={loading}><Icon name="refresh" size={15} className={loading ? 'spin' : ''}/>{loading ? 'Checking…' : 'Refresh'}</button></div>
        {error && <div role="alert" className="tracking-error">{error} <button className="text-button" onClick={refresh}>Retry</button></div>}
        <div aria-live="polite">{order.shipments.map(s => {
          const result = tracking.find(t => t.trackingId === s.trackingId)
          return <div className="shipment" key={s.trackingId}><div className="shipment-header"><span className={`carrier-icon ${s.carrier === 'TNT' ? 'tnt' : ''}`}>{s.carrier === 'TNT' ? 'TNT' : <Icon name="truck" size={22}/>}</span><div><h3>{s.carrier === 'StarTrack' ? 'StarTrack / Australia Post' : s.carrier}</h3><div className="shipment-number">{s.trackingNumber}<span>·</span>{s.trackingId}</div></div><span className="subtle-chip">Testbed</span></div>
            {loading ? <div className="tracking-state" role="status"><Icon name="clock"/><div><strong>Checking the courier testbed</strong><p>Retrieving the latest available response…</p></div></div> : result?.availability === 'available' ? <><div className="live-status"><span className="green-dot"/>{result.status}</div><div className="timeline">{result.events.map((e,i) => <div className="timeline-item" key={i}><span className="timeline-dot"/><strong>{e.description}</strong><p>{e.location || 'Location not provided'}</p><small>{eventDate(e.date)}</small></div>)}</div><p className="tracking-caption">Last event: {eventDate(result.lastUpdated)} · Testbed response, not a live delivery.</p></> : <div className="tracking-state"><Icon name={result?.availability === 'not_implemented' ? 'info' : 'clock'}/><div><strong>{result?.availability === 'not_implemented' ? 'Integration not implemented' : result?.availability === 'not_configured' ? 'Credentials not configured' : 'Tracking unavailable'}</strong><p>{result?.message || 'Tracking information could not be loaded.'}</p></div></div>}
            {!loading && result?.queriedAt && <p className="tracking-caption">Checked {eventDate(result.queriedAt)}{result.cached ? ' · Cached for up to 60 seconds' : ''}</p>}
          </div>
        })}</div>
        <div className="panel-bottom-note"><Icon name="info" size={15}/> Order status and courier tracking status are independent.</div>
      </section>
    </div><aside className="detail-secondary">
      <section className="panel summary-panel"><div className="section-heading"><div className="section-title"><Icon name="grid"/><h2>Order summary</h2></div></div><div className="summary-body"><div className="summary-row"><span>Subtotal <small>(ex GST)</small></span><strong>{money(totals.subtotalExGst)}</strong></div><div className="summary-row"><span>GST <small>(10%)</small></span><strong>{money(totals.gst)}</strong></div><div className="summary-row"><span>Shipping <span className="mini-tag">Not estimated</span></span><strong>{money(totals.shipmentFee)}</strong></div><div className="summary-total"><span>Total <small>AUD</small></span><strong>{money(totals.total)}</strong></div>{totals.calculationStatus !== 'complete' && <p className="error-text">Unable to calculate the complete total. Check the item errors.</p>}<p className="summary-note">Includes GST. Shipping has not been estimated and may be charged separately.</p></div></section>
      <section className="panel"><div className="section-heading"><div className="section-title"><Icon name="pin"/><h2>Delivery details</h2></div></div><div className="address-body"><span className="overline">RECIPIENT</span><h3>{order.customer.company}</h3><p>{order.customer.name}</p><span className="overline space-top">SHIPPING ADDRESS</span><p>{address.line1}<br/>{address.suburb} {address.state} {address.postcode}<br/>Australia</p><div className="contact-detail"><Icon name="mail" size={15}/><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></div><div className="contact-detail"><span className="phone-icon">↗</span><a href={`tel:${order.customer.phone.replaceAll(' ','')}`}>{order.customer.phone}</a></div></div><div className="origin"><span className="green-dot"/><span>Dispatch origin <strong>Ryde, NSW 2111</strong></span></div></section>
      <div className="quiet-note"><Icon name="leaf" size={19}/><div><strong>A little clarity, every step.</strong><p>Amounts are calculated from catalog prices. Nothing is hard-coded.</p></div></div>
    </aside></div>
  </>
}
