import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, rupees, CATEGORY_EMOJI } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { useToast } from '../components/Toast.jsx';
import Countdown from '../components/Countdown.jsx';
import { QtyStepper } from '../components/ProductCard.jsx';
import { SnowIcon, BellIcon, StoreIcon } from '../components/icons.jsx';

const STATUS_STYLE = {
  active: 'bg-brand-50 text-brand-600',
  collected: 'bg-mint-50 text-mint-700',
  expired: 'bg-slate-100 text-ink-soft',
  cancelled: 'bg-slate-100 text-ink-soft',
};

function CartGroup({ group, onFrozen }) {
  const { user } = useAuth();
  const { setQty, clearShop, applyStock } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const items = Object.values(group.items);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shop = { id: group.shopId, name: group.shopName };

  const freeze = async () => {
    if (!user) return nav('/login', { state: { from: '/cart' } });
    setBusy(true);
    try {
      const f = await api('/freezes', {
        method: 'POST',
        body: { shopId: group.shopId, items: items.map((i) => ({ productId: i.id, qty: i.qty })) },
      });
      clearShop(group.shopId);
      toast(`Frozen! Show code ${f.code} at ${group.shopName}`, 'success');
      onFrozen();
    } catch (e) {
      if (e.data?.stock) applyStock(group.shopId, e.data.stock);
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <header className="flex items-center justify-between gap-3">
        <Link to={`/shops/${group.shopId}`} className="flex items-center gap-2 font-bold hover:text-brand-600">
          <StoreIcon className="h-5 w-5 text-brand-500" />{group.shopName}
        </Link>
        <button onClick={() => clearShop(group.shopId)} className="text-xs font-semibold text-ink-faint hover:text-red-600">Remove all</button>
      </header>
      <ul className="mt-4 divide-y divide-black/5">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas text-2xl">{CATEGORY_EMOJI[i.category] || '🛍️'}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.name}</p>
              <p className="text-xs text-ink-soft">{i.unit} · {rupees(i.price)}</p>
            </div>
            <QtyStepper qty={i.qty} max={Math.min(i.stock, 5)} onChange={(n) => setQty(shop, i, n)} size="sm" />
            <span className="w-16 text-right font-bold">{rupees(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <footer className="mt-4 flex flex-col gap-3 rounded-2xl bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-ink-soft">Pay at the shop</p>
          <p className="text-xl font-extrabold">{rupees(total)}</p>
        </div>
        <button onClick={freeze} disabled={busy} className="btn-primary">
          <SnowIcon className="h-4 w-4" />
          {busy ? 'Freezing…' : user ? 'Freeze for 30 min' : 'Log in to freeze'}
        </button>
      </footer>
    </section>
  );
}

function FreezeCard({ f, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const active = f.status === 'active';

  const cancel = async () => {
    if (!confirm('Release these items back to the shop?')) return;
    setBusy(true);
    try {
      await api(`/freezes/${f.id}`, { method: 'DELETE' });
      toast('Freeze cancelled, items released');
      onChange();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`card overflow-hidden ${active ? 'ring-2 ring-brand-200' : ''}`}>
      {active && (
        <div className="flex items-center justify-between bg-brand-500 px-5 py-3 text-white">
          <span className="flex items-center gap-2 text-sm font-semibold"><SnowIcon className="h-4 w-4" />Held for you</span>
          <span className="text-sm">Time left <Countdown until={f.expires_at} onDone={onChange} className="text-white" /></span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{f.shop_name}</p>
            <p className="truncate text-xs text-ink-soft">{f.shop_address}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[f.status]}`}>{f.status}</span>
        </div>

        {active && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Show this code at the counter</p>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-brand-700">{f.code}</p>
          </div>
        )}

        <ul className="mt-4 space-y-1 text-sm">
          {f.items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="truncate">{i.qty} × {i.name} <span className="text-ink-faint">({i.unit})</span></span>
              <span className="font-medium">{rupees(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
          <span className="text-sm text-ink-soft">{active ? 'Pay at shop' : new Date(f.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          <span className="font-extrabold">{rupees(f.total)}</span>
        </div>
        {active && (
          <button onClick={cancel} disabled={busy} className="mt-4 w-full rounded-2xl py-2 text-sm font-semibold text-ink-soft hover:bg-red-50 hover:text-red-600">
            Cancel freeze
          </button>
        )}
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
  const past = (freezes || []).filter((f) => f.status !== 'active');

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-28 pt-6 sm:pb-16 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-extrabold">Your cart</h1>
          <p className="text-sm text-ink-soft">Each shop is frozen separately. Items are held for 30 minutes, then go back on the shelf.</p>
          <div className="mt-4 space-y-4">
            {groups.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-4xl">🧺</p>
                <p className="mt-3 font-semibold">Your cart is empty</p>
                <Link to="/" className="btn-soft mt-5">Browse nearby shops</Link>
              </div>
            ) : (
              groups.map((g) => <CartGroup key={g.shopId} group={g} onFrozen={load} />)
            )}
          </div>
        </section>

        {user && past.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold">Past freezes</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {past.map((f) => <FreezeCard key={f.id} f={f} onChange={load} />)}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-6">
        <section>
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><SnowIcon className="h-5 w-5 text-brand-500" />Active freezes</h2>
          <div className="mt-3 space-y-4">
            {!user ? (
              <p className="card p-5 text-sm text-ink-soft"><Link to="/login" state={{ from: '/cart' }} className="font-semibold text-brand-600">Log in</Link> to freeze items and see your pickups.</p>
            ) : freezes === null ? (
              <div className="h-40 animate-pulse rounded-3xl bg-white" />
            ) : active.length === 0 ? (
              <p className="card p-5 text-sm text-ink-soft">Nothing frozen right now.</p>
            ) : (
              active.map((f) => <FreezeCard key={f.id} f={f} onChange={load} />)
            )}
          </div>
        </section>

        {user && notes.length > 0 && (
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><BellIcon className="h-5 w-5 text-peach-500" />Updates</h2>
            <ul className="mt-3 space-y-3">
              {notes.slice(0, 6).map((n) => (
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
