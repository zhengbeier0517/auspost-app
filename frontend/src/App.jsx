import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import ProductImage from '../components/ProductImage'
import OrderDetail from './pages/OrderDetail'
import { api, money, date } from './utils/api'
import './App.css'

export default function App() {
  const [view, setView] = useState('orders')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All orders')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api('/orders', controller.signal), api('/products', controller.signal)])
      .then(([a, b]) => { setOrders(a.orders); setProducts(b.products); setError('') })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  const navigate = next => { setView(next); setSelected(null); setQuery('') }
  const active = orders.find(o => o.orderNo === selected)
  const visibleOrders = orders.filter(o => (filter === 'All orders' || o.status === filter) && `${o.orderNo} ${o.customer.name} ${o.customer.company}`.toLowerCase().includes(query.toLowerCase()))
  const visibleProducts = products.filter(p => `${p.SKU} ${p.ProductName}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('orders')} aria-label="Parcel desk home"><span className="brand-mark"><Icon name="box" size={25}/></span><span>parcel<span className="brand-light">desk</span><small>ORDER OPERATIONS</small></span></button>
      <div className="workspace"><span className="workspace-icon">A</span><div>Aeris Health<small>Australia workspace</small></div><span className="workspace-dot"/></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">
        <button className={view === 'orders' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('orders')}><Icon name="box"/>Orders<span className="nav-count">{orders.length}</span></button>
        <button className={view === 'catalog' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('catalog')}><Icon name="grid"/>Product catalog</button>
      </nav>
      <div className="sidebar-bottom"><div className="environment"><span className="workspace-dot"/> Test environment<small>Sample orders · Testbed tracking</small></div><div className="profile"><span className="avatar">AH</span><div>Aeris Health<small>Operations workspace</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs">Workspace <Icon name="arrow" size={13}/><button onClick={() => navigate(view)}>{view === 'catalog' ? 'Product catalog' : 'Orders'}</button>{active && <><Icon name="arrow" size={13}/><span>Order details</span></>}</div><span className="region"><span className="green-dot"/> Australia <span className="region-divider">/</span> AUD</span></header>
      <main>
        {active ? <OrderDetail key={active.orderNo} order={active} onBack={() => setSelected(null)}/> : <>
          <div className="page-heading"><div><div className="eyebrow">YOUR OPERATIONS, AT A GLANCE</div><h1>{view === 'orders' ? 'Orders' : 'Product catalog'}<span className="heading-dot">.</span></h1><p>{view === 'orders' ? 'Every order, every parcel. All in one place.' : 'Your source of truth for product details and pricing.'}</p></div><span className="subtle-chip"><Icon name="clock" size={15}/> {view === 'orders' ? 'Generated test data' : `${products.length} source products`}</span></div>
          {loading ? <div className="empty-state" role="status">Loading your workspace…</div> : error ? <div className="empty-state" role="alert"><h3>Unable to load workspace</h3><p>{error}</p><button className="button" onClick={() => { setLoading(true); setReload(reload + 1) }}>Try again</button></div> : <>
          {view === 'orders' ? <>
            <div className="stats-grid">{[
              ['Total orders',orders.length,'Across your workspace','box'],
              ['In transit',orders.filter(o => o.status === 'In Transit').length,'On the move','truck'],
              ['Processing',orders.filter(o => o.status === 'Processing').length,'Preparing for dispatch','clock'],
              ['Completed',orders.filter(o => o.status === 'Completed').length,'Order status from test data','check'],
            ].map(([label,value,description,icon]) => <div className="stat-card" key={label}><span className="stat-icon"><Icon name={icon}/></span><p>{label}</p><strong>{String(value).padStart(2,'0')}</strong><small>{description}</small></div>)}</div>
            <section className="panel orders-panel"><div className="panel-title"><div><h2>All orders <span className="count-badge">{orders.length}</span></h2><p>A clear view from order to delivery.</p></div><label className="search"><Icon name="search" size={18}/><input aria-label="Search orders" placeholder="Search orders or customers…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
              <div className="filter-tabs" aria-label="Filter orders">{['All orders','In Transit','Processing','Completed'].map(f => <button className={filter === f ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>{f}</button>)}</div>
              <div className="table-scroll"><table className="order-table"><thead><tr><th>ORDER</th><th>CUSTOMER</th><th>STATUS</th><th>ITEMS</th><th>TOTAL</th><th><span className="sr-only">View</span></th></tr></thead><tbody>{visibleOrders.map(o => <tr key={o.orderNo}><td><button className="order-link" onClick={() => setSelected(o.orderNo)}>{o.orderNo}</button><small>{date(o.orderDate)}</small></td><td><strong>{o.customer.company}</strong><small>{o.customer.name}</small></td><td><Status value={o.status}/></td><td>{o.itemCount} items<small>{o.items.length} products</small></td><td className="amount">{money(o.amounts.total)}<small>Including GST</small></td><td><button className="icon-button" aria-label={`View order ${o.orderNo}`} onClick={() => setSelected(o.orderNo)}><Icon name="arrow" size={17}/></button></td></tr>)}</tbody></table></div>
              {!visibleOrders.length && <div className="empty-state"><h3>No orders found</h3><p>Try another search or status filter.</p></div>}
              <div className="table-footer"><span>Showing {visibleOrders.length} of {orders.length} orders</span><span>All amounts in AUD</span></div>
            </section>
            <div className="info-banner"><Icon name="info" size={18}/><p><strong>A workspace built for testing.</strong> Orders and customers are generated. Product details and prices come from the supplied catalog.</p></div>
          </> : <>
            <div className="catalog-toolbar"><h2>Products <span className="count-badge">{visibleProducts.length}</span></h2><label className="search"><Icon name="search" size={18}/><input aria-label="Search products" placeholder="Search name or SKU…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
            <div className="catalog-grid">{visibleProducts.map((p,i) => <article className="panel catalog-card" key={p.SKU}><ProductImage product={p} index={i}/><div className="catalog-content"><span className="product-type">{p.DosageType?.trim()}</span><h3>{p.ProductName.trim()}</h3><code>{p.SKU}</code><p>{p.Description}</p><div className="catalog-price"><strong>{money(Number(p.RRP))}</strong><span>RRP incl. GST</span></div><div className="dimensions"><span>Weight {p.weight}</span><span>{p.length} × {p.width} × {p.height}</span></div></div></article>)}</div>
            {!visibleProducts.length && <div className="empty-state">No products match your search.</div>}
          </>}
          </>}
        </>}
        <footer className="page-footer"><span>PARCELDESK <span> / </span> Thoughtfully organised.</span><span>Assessment workspace · Australia</span></footer>
      </main>
    </div>
  </div>
}
function Status({ value }) { return <span className={`status ${value.toLowerCase().replaceAll(' ','-')}`}><span/>{value}</span> }
