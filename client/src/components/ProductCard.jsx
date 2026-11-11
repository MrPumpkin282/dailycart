import { Link } from 'react-router-dom';
import { useCart } from '../lib/cart.jsx';
import { useToast } from './Toast.jsx';
import { rupees, metres, CATEGORY_EMOJI, CATEGORY_TINT, expiryLabel } from '../lib/api.js';
import { PlusIcon, MinusIcon, WalkIcon } from './icons.jsx';

export function QtyStepper({ qty, max, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl bg-brand-50 p-1">
      <button aria-label="Remove one" onClick={() => onChange(qty - 1)} className={`grid ${pad} place-items-center rounded-xl bg-white text-brand-600 shadow-sm hover:bg-brand-100`}>
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="w-6 text-center text-sm font-bold text-brand-700">{qty}</span>
      <button aria-label="Add one" disabled={qty >= max} onClick={() => onChange(qty + 1)} className={`grid ${pad} place-items-center rounded-xl bg-brand-500 text-white shadow-sm hover:bg-brand-600 disabled:opacity-40`}>
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * product: { id, name, brand, category, unit, price, stock, expires_on }
 * shop:    { id, name } and optionally distance_m to show "x m away".
 */
export default function ProductCard({ product, shop, showShop = false }) {
  const { qtyOf, setQty } = useCart();
  const toast = useToast();
  const qty = qtyOf(product.id);
  const soldOut = product.stock <= 0;
  const exp = expiryLabel(product.expires_on);
  const max = Math.min(product.stock, 5);

  const change = (n) => {
    if (n > max) return toast(`Only ${max} can be frozen`, 'error');
    setQty(shop, product, n);
  };

  return (
    <article className={`card flex flex-col p-3 transition hover:-translate-y-0.5 ${soldOut ? 'opacity-60' : ''}`}>
      <div className={`relative grid aspect-[4/3] place-items-center rounded-2xl text-5xl ${CATEGORY_TINT[product.category] || 'bg-slate-50'}`}>
        <span aria-hidden="true">{CATEGORY_EMOJI[product.category] || '🛍️'}</span>
        {exp && <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${exp.tone}`}>{exp.text}</span>}
        {!soldOut && product.stock <= 3 && (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-red-600">Only {product.stock} left</span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{product.brand || product.category}</p>
        <h3 className="mt-0.5 line-clamp-2 font-bold leading-snug">{product.name}</h3>
        <p className="text-xs text-ink-soft">{product.unit}</p>

        {showShop && (
          <Link to={`/shops/${shop.id}`} className="mt-2 inline-flex items-center gap-1 truncate text-xs font-medium text-brand-600 hover:underline">
            <WalkIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{shop.name}{shop.distance_m != null && ` · ${metres(shop.distance_m)}`}</span>
          </Link>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-lg font-extrabold">{rupees(product.price)}</span>
          {soldOut ? (
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-ink-soft">Sold out</span>
          ) : qty > 0 ? (
            <QtyStepper qty={qty} max={max} onChange={change} size="sm" />
          ) : (
            <button onClick={() => change(1)} className="btn-soft px-4 py-2">Add</button>
          )}
        </div>
      </div>
    </article>
  );
}
