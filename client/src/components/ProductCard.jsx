import { Link } from 'react-router-dom';
import { useCart } from '../lib/cart.jsx';
import { useToast } from './Toast.jsx';
import { rupees, metres, expiryLabel, daysLeft } from '../lib/api.js';
import ProductImage from './ProductImage.jsx';
import { PlusIcon, MinusIcon } from './icons.jsx';

export function QtyStepper({ qty, max, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  return (
    <div className="inline-flex items-center rounded-lg bg-maroon-600 text-white">
      <button aria-label="Remove one" onClick={() => onChange(qty - 1)} className={`grid ${pad} place-items-center rounded-l-lg hover:bg-maroon-700`}>
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-bold">{qty}</span>
      <button aria-label="Add one" disabled={qty >= max} onClick={() => onChange(qty + 1)} className={`grid ${pad} place-items-center rounded-r-lg hover:bg-maroon-700 disabled:opacity-40`}>
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * product: { id, name, brand, category, unit, price, stock, expires_on }
 * shop:    { id, name } and optionally distance_m.
 */
export default function ProductCard({ product, shop, showShop = false }) {
  const { qtyOf, setQty } = useCart();
  const toast = useToast();
  const qty = qtyOf(product.id);
  const soldOut = product.stock <= 0;
  const exp = expiryLabel(product.expires_on);
  const left = daysLeft(product.expires_on);
  const fresh = exp && left != null && left >= 0 && left <= 3; // badge only for items about to expire
  const max = Math.min(product.stock, 5);

  const change = (n) => {
    if (n > max) return toast(`Only ${max} can be reserved`, 'error');
    setQty(shop, product, n);
  };

  return (
    <article className={`flex flex-col rounded-xl border border-cream-line bg-white p-2.5 transition hover:shadow-card ${soldOut ? 'opacity-60' : ''}`}>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-cream">
        <ProductImage product={product} className="p-1.5" />
        {fresh && (
          <span className="absolute left-1.5 top-1.5 rounded bg-saffron-400 px-1.5 py-0.5 text-[10px] font-bold text-ink">{exp.text}</span>
        )}
        {!soldOut && product.stock <= 3 && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-maroon-600">Only {product.stock} left</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
        <p className="text-xs text-ink-soft">{product.unit}{product.brand ? ` · ${product.brand}` : ''}</p>
        {showShop && (
          <Link to={`/shops/${shop.id}`} className="mt-1 truncate text-[11px] font-medium text-maroon-600 hover:underline">
            {shop.name}{shop.distance_m != null && ` · ${metres(shop.distance_m)}`}
          </Link>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-bold">{rupees(product.price)}</span>
          {soldOut ? (
            <span className="text-[11px] font-semibold text-ink-faint">Sold out</span>
          ) : qty > 0 ? (
            <QtyStepper qty={qty} max={max} onChange={change} size="sm" />
          ) : (
            <button onClick={() => change(1)} className="rounded-lg border border-maroon-600 px-3 py-1 text-xs font-bold text-maroon-600 hover:bg-maroon-50">ADD</button>
          )}
        </div>
      </div>
    </article>
  );
}
