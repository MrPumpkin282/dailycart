import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, rupees } from '../lib/api.js';
import Countdown from '../components/Countdown.jsx';

const STATUS = {
  active: ['Ready for pickup', 'bg-saffron-100 text-maroon-700'],
  collected: ['Collected', 'bg-leaf-50 text-leaf-600'],
  expired: ['Expired', 'bg-cream-deep text-ink-soft'],
  cancelled: ['Cancelled', 'bg-cream-deep text-ink-soft'],
};

function OrderCard({ f }) {
  const [open, setOpen] = useState(false);
  const [label, tone] = STATUS[f.status];
  const count = f.items.reduce((n, i) => n + i.qty, 0);
  return (
    <article className="rounded-xl border border-cream-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-bold">{f.shop_name}</h2>
          <p className="text-xs text-ink-soft">
            <span className={`mr-1.5 rounded px-1.5 py-0.5 font-semibold ${tone}`}>{label}</span>
            {new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {f.status === 'active' && <span className="shrink-0 text-xs text-ink-soft">⏱ <Countdown until={f.expires_at} /></span>}
      </div>
      <p className="mt-2 text-sm">{count} item{count === 1 ? '' : 's'} · <span className="font-bold">{rupees(f.total)}</span></p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-xs text-ink-faint">#{f.code}</span>
        <button onClick={() => setOpen((o) => !o)} className="link text-xs">{open ? 'Hide details' : 'View details →'}</button>
      </div>
      {open && (
        <ul className="mt-3 space-y-1 border-t border-cream-line pt-3 text-sm">
          {f.items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="truncate">{i.qty} × {i.name} <span className="text-ink-faint">({i.unit})</span></span>
              <span>{rupees(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/freezes').then(setOrders).catch((e) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pb-6">
      <div className="rounded-2xl border border-cream-line bg-cream-deep/60 p-5">
        <h1 className="text-2xl font-bold">Your orders</h1>
        <p className="text-sm text-ink-soft">Good things, from around the corner.</p>

        {error && <p className="mt-4 text-sm text-maroon-600">{error}</p>}
        <div className="mt-4 space-y-3">
          {orders === null && !error ? (
            <div className="h-28 animate-pulse rounded-xl bg-white" />
          ) : orders?.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center">
              <p className="text-3xl">🧾</p>
              <p className="mt-2 font-semibold">No orders yet</p>
              <Link to="/" className="btn-primary mt-4">Start shopping</Link>
            </div>
          ) : (
            orders?.map((f) => <OrderCard key={f.id} f={f} />)
          )}
        </div>
      </div>
    </main>
  );
}
