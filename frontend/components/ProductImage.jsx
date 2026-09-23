export default function ProductImage({ product, index = 0 }) {
  const oil = product?.DosageType?.toLowerCase().includes('liquid')
  return <div className={`product-image tone-${index % 4}`} role="img" aria-label={`${product?.ProductName || 'Product'} placeholder illustration`}>
    <div className={`bottle ${oil ? 'oil' : ''}`}><div className="bottle-cap"/><div className="bottle-label"><span>BOTANICAL</span><strong>{oil ? 'OIL' : 'Rx'}</strong><small>PRODUCT</small></div></div>
  </div>
}
