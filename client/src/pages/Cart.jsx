import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, rupees } from '../lib/api.js';
import ProductImage from '../components/ProductImage.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { useToast } from '../components/Toast.jsx';
import Countdown from '../components/Countdown.jsx';
import { QtyStepper } from '../components/ProductCard.jsx';
import { BellIcon } from '../components/icons.jsx';

/** One shop's basket, styled like the Figma "Your neighbourhood basket" panel. */
function Basket({ group, onReserved }) {
  const { user } = useAuth();
  const { setQty, clearShop, applyStock } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const items = Object.values(group.items);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shop = { id: group.shopId, name: group.shopName };

  const reserve = async () => {
    if (!user) return nav('/login', { state: { from: '/cart' } });
    setBusy(true);
    try {
      const f = await api('/freezes', {
        method: 'POST',
        body: { shopId: group.shopId, items: items.map((i) => ({ productId: i.id, qty: i.qty })) },
      });
      clearShop(group.shopId);
      toast(`Reserved! Show code ${f.code} at ${group.shopName}`, 'success');
      onReserved();
    } catch (e) {
      if (e.data?.stock) applyStock(group.shopId, e.data.stock);
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-cream-line bg-cream shadow-card">
      <header className="flex items-start justify-between gap-3 p-4">
        <div>
          <h2 className="font-bold">Your neighbourhood basket</h2>
          <Link to={`/shops/${group.shopId}`} className="text-xs text-ink-soft hover:underline">From · <span className="font-semibold text-ink">{group.shopName}</span></Link>
        </div>
        <button onClick={() => clearShop(group.shopId)} className="text-xs font-semibold text-ink-faint hover:text-maroon-600">Clear</button>
      </header>

      <div className="mx-4 rounded-lg bg-saffron-50 px-3 py-2 text-xs">
        <span className="font-bold text-maroon-600">Held for 30 minutes</span>
        <span className="text-ink-soft"> once you reserve. Walk over and pay at the counter.</span>
      </div>

      <ul className="mx-4 mt-3 divide-y divide-cream-line rounded-xl border border-cream-line bg-white">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 p-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream"><ProductImage product={i} emojiSize="text-2xl" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{i.name}</p>
              <p className="text-xs text-ink-soft">{i.unit}</p>
              <p className="text-sm font-bold">{rupees(i.price * i.qty)}</p>
            </div>
            <QtyStepper qty={i.qty} max={Math.min(i.stock, 5)} onChange={(n) => setQty(shop, i, n)} size="sm" />
          </li>
        ))}
      </ul>

      <div className="m-4 rounded-xl border border-cream-line bg-white p-4 text-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Bill details</p>
        <div className="mt-2 space-y-1.5">
          <div className="flex justify-between"><span className="text-ink-soft">Item total</span><span>{rupees(total)}</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Pickup</span><span className="font-semibold text-leaf-600">Free</span></div>
          <div className="flex justify-between"><span className="text-ink-soft">Online payment</span><span className="text-ink-soft">None, pay at shop</span></div>
        </div>
        <div className="mt-3 flex justify-between border-t border-cream-line pt-3 font-bold"><span>To pay at shop</span><span>{rupees(total)}</span></div>
      </div>

      <div className="px-4 pb-4">
        <button onClick={reserve} disabled={busy} className="btn-primary w-full py-3">
          {busy ? 'Reserving…' : user ? `Reserve for pickup · ${rupees(total)}` : 'Log in to reserve'}
        </button>
      </div>
    </section>
  );
}

function ActiveOrder({ f, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!confirm('Release these items back to the shop?')) return;
    setBusy(true);
    try {
      await api(`/freezes/${f.id}`, { method: 'DELETE' });
      toast('Reservation cancelled');
      onChange();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-maroon-600 bg-white">
      <div className="flex items-center justify-between bg-maroon-600 px-4 py-2.5 text-sm text-white">
        <span className="font-semibold">Ready for pickup</span>
        <span>Time left <Countdown until={f.expires_at} onDone={onChange} className="text-saffron-300" /></span>
      </div>
      <div className="p-4">
        <p className="font-bold">{f.shop_name}</p>
        <p className="text-xs text-ink-soft">{f.shop_address}</p>
        <div className="mt-3 rounded-xl border-2 border-dashed border-saffron-400 bg-saffron-50 p-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-600">Show this code at the counter</p>
          <p className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-maroon-700">{f.code}</p>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {f.items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="truncate">{i.qty} × {i.name}</span>
              <span>{rupees(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-cream-line pt-3 font-bold"><span>Pay at shop</span><span>{rupees(f.total)}</span></div>
        <button onClick={cancel} disabled={busy} className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-ink-soft hover:bg-maroon-50 hover:text-maroon-600">Cancel reservation</button>
      </div>
    </article>
  );
}

export default function Cart() {
  const { user } = useAuth();
  const { cart } = useCart();
  const [freezes, setFreezes] = useState(null);
  const [notes, setNotes] = useState([]);
  const groups = Object.values(cart);

  const load = useCallback(() => {
    if (!user || user.role !== 'customer') return;
    api('/freezes').then(setFreezes).catch(() => setFreezes([]));
    api('/notifications').then(setNotes).catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const active = (freezes || []).filter((f) => f.status === 'active');

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-24 pt-6 sm:pb-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Your basket</h1>
        {groups.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl">🧺</p>
            <p className="mt-3 font-semibold">Your basket is empty</p>
            <p className="mt-1 text-sm text-ink-soft">Add a few things from the shops around you.</p>
            <Link to="/" className="btn-primary mt-5">Browse nearby shops</Link>
          </div>
        ) : (
          groups.map((g) => <Basket key={g.shopId} group={g} onReserved={load} />)
        )}
      </div>

      <aside className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Ready for pickup</h2>
          {user && <Link to="/orders" className="link text-sm">All orders →</Link>}
        </div>
        {!user ? (
          <p className="card p-4 text-sm text-ink-soft"><Link to="/login" state={{ from: '/cart' }} className="link">Log in</Link> to reserve items and see your pickups.</p>
        ) : freezes === null ? (
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
        ) : active.length === 0 ? (
          <p className="card p-4 text-sm text-ink-soft">Nothing reserved right now.</p>
        ) : (
          active.map((f) => <ActiveOrder key={f.id} f={f} onChange={load} />)
        )}

        {user && notes.length > 0 && (
          <section className="card p-4">
            <h3 className="flex items-center gap-2 font-bold"><BellIcon className="h-4 w-4 text-saffron-600" />Updates</h3>
            <ul className="mt-3 space-y-3">
              {notes.slice(0, 5).map((n) => (
                <li key={n.id} className="text-sm">
                  <p>{n.message}</p>
                  <p className="text-xs text-ink-faint">{new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </main>
  );
}
