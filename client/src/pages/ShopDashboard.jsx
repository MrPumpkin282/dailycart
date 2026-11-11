import { useCallback, useEffect, useState } from 'react';
import { api, rupees, CATEGORY_EMOJI, expiryLabel } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import Countdown from '../components/Countdown.jsx';
import { PlusIcon, MinusIcon, SnowIcon, CheckIcon, BoltIcon, XIcon, BellIcon } from '../components/icons.jsx';

const CATEGORIES = ['Dairy', 'Bakery', 'Snacks', 'Fruits & Veg', 'Beverages', 'Ready to eat', 'Other'];
const EMPTY = { name: '', brand: '', category: 'Dairy', unit: '', price: '', stock: '', expires_on: '' };

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-3xl p-5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial, expires_on: initial.expires_on || '' } : EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({ ...form, price: Number(form.price), stock: Number(form.stock), expires_on: form.expires_on || null });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg rounded-b-none p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{initial ? 'Edit item' : 'Add an item'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 hover:bg-canvas"><XIcon /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">Item name</span><input className="input" value={form.name} onChange={set('name')} required placeholder="Toned Milk" /></label>
          <label><span className="label">Brand</span><input className="input" value={form.brand || ''} onChange={set('brand')} placeholder="Nandini" /></label>
          <label><span className="label">Pack size</span><input className="input" value={form.unit} onChange={set('unit')} placeholder="500 ml" /></label>
          <label><span className="label">Category</span>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label><span className="label">Best before</span><input className="input" type="date" value={form.expires_on} onChange={set('expires_on')} /></label>
          <label><span className="label">Price (₹)</span><input className="input" type="number" min="0" step="0.5" value={form.price} onChange={set('price')} required /></label>
          <label><span className="label">Units on shelf</span><input className="input" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required /></label>
        </div>
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn-primary mt-6 w-full">{busy ? 'Saving…' : initial ? 'Save changes' : 'List item'}</button>
      </form>
    </div>
  );
}

function EventFeed() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const load = () => api('/events').then(setEvents).catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-bold"><BoltIcon className="h-5 w-5 text-brand-500" />Live event stream</h2>
      <p className="text-xs text-ink-soft">Kafka events handled by the consumers</p>
      <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
        {events.length === 0 && <li className="text-sm text-ink-faint">No events yet. Freeze something as a customer.</li>}
        {events.map((e) => (
          <li key={e.id} className="rounded-2xl bg-canvas p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-brand-600">{e.event_type}</span>
              <span className="text-ink-faint">{new Date(e.processed_at).toLocaleTimeString('en-IN')}</span>
            </div>
            <p className="mt-1 text-ink-soft"><span className="font-semibold text-ink">{e.consumer}</span> → {e.result}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ShopDashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [freezes, setFreezes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | product
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/shop/me').then(setData).catch((e) => setError(e.message));
    api('/shop/freezes').then(setFreezes).catch(() => {});
    api('/notifications').then(setNotes).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const saveProduct = async (p) => {
    if (editing === 'new') await api('/shop/products', { method: 'POST', body: p });
    else await api(`/shop/products/${editing.id}`, { method: 'PATCH', body: p });
    toast(editing === 'new' ? 'Item listed' : 'Item updated', 'success');
    load();
  };

  const bump = async (p, delta) => {
    setData((d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, stock: Math.max(0, x.stock + delta) } : x)) }));
    try {
      const r = await api(`/shop/products/${p.id}/adjust`, { method: 'POST', body: { delta } });
      setData((d) => ({ ...d, products: d.products.map((x) => (x.id === p.id ? { ...x, stock: r.stock } : x)) }));
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  const remove = async (p) => {
    if (!confirm(`Remove ${p.name} from your listing?`)) return;
    try {
      const r = await api(`/shop/products/${p.id}`, { method: 'DELETE' });
      toast(r.hidden ? 'Hidden. It has active freezes, so it stays until they close.' : 'Item removed');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const collect = async (body) => {
    try {
      const r = await api('/shop/freezes/collect', { method: 'POST', body });
      toast(`${r.code} collected · ${rupees(r.total)} received`, 'success');
      setCode('');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (error) return <main className="mx-auto max-w-6xl px-4 py-10"><p className="card p-6 text-red-600">{error}</p></main>;
  if (!data) return <main className="mx-auto max-w-6xl px-4 py-10"><div className="h-40 animate-pulse rounded-3xl bg-white" /></main>;

  const { shop, products, stats } = data;
  const active = freezes.filter((f) => f.status === 'active');
  const recent = freezes.filter((f) => f.status !== 'active').slice(0, 6);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-soft">Shop dashboard</p>
          <h1 className="text-3xl font-extrabold">{shop.name}</h1>
          <p className="text-sm text-ink-soft">{shop.address}, {shop.city}</p>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary"><PlusIcon className="h-4 w-4" />Add item</button>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting for pickup" value={stats.active} tone="bg-brand-500 text-white" />
        <Stat label="Collected today" value={stats.collected_today} tone="bg-mint-50 text-mint-700" />
        <Stat label="Sales today" value={rupees(stats.sales_today)} tone="bg-peach-50 text-peach-700" />
        <Stat label="Items listed" value={products.filter((p) => p.active).length} tone="bg-white text-ink shadow-card" />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Pickups */}
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><SnowIcon className="h-5 w-5 text-brand-500" />Pickups</h2>
              <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) collect({ code: code.trim() }); }} className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DC-XXXXX" className="input w-36 py-2 font-mono uppercase" aria-label="Pickup code" />
                <button className="btn bg-ink px-4 py-2 text-white">Collect</button>
              </form>
            </div>
            {active.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-canvas p-6 text-center text-sm text-ink-soft">No one is on their way right now.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {active.map((f) => (
                  <li key={f.id} className="rounded-2xl p-4 ring-1 ring-brand-200">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-extrabold text-brand-700">{f.code}</span>
                      <span className="text-xs text-ink-soft">⏱ <Countdown until={f.expires_at} onDone={load} /></span>
                    </div>
                    <p className="text-sm font-semibold">{f.customer_name}{f.customer_phone && <span className="font-normal text-ink-soft"> · {f.customer_phone}</span>}</p>
                    <ul className="mt-2 text-sm text-ink-soft">
                      {f.items.map((i) => <li key={i.productId}>{i.qty} × {i.name}</li>)}
                    </ul>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-extrabold">{rupees(f.total)}</span>
                      <button onClick={() => collect({ id: f.id })} className="btn bg-mint-500 px-3 py-2 text-white hover:bg-mint-700"><CheckIcon className="h-4 w-4" />Paid &amp; collected</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {recent.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Recent ({recent.length})</summary>
                <ul className="mt-2 divide-y divide-black/5 text-sm">
                  {recent.map((f) => (
                    <li key={f.id} className="flex justify-between py-2">
                      <span><span className="font-mono">{f.code}</span> · {f.customer_name}</span>
                      <span className="capitalize text-ink-soft">{f.status} · {rupees(f.total)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {/* Inventory */}
          <section className="card p-5">
            <h2 className="text-lg font-extrabold">Shelf</h2>
            <p className="text-sm text-ink-soft">Tap − / + as items sell over the counter. Frozen units are already taken out.</p>
            <ul className="mt-4 divide-y divide-black/5">
              {products.map((p) => {
                const exp = expiryLabel(p.expires_on);
                return (
                  <li key={p.id} className={`flex flex-wrap items-center gap-3 py-3 ${p.active ? '' : 'opacity-50'}`}>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-canvas text-xl">{CATEGORY_EMOJI[p.category]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name} <span className="text-xs font-normal text-ink-faint">{p.unit}</span></p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span className="text-ink-soft">{rupees(p.price)}</span>
                        {exp && <span className={`rounded-full px-2 ${exp.tone}`}>{exp.text}</span>}
                        {p.frozen > 0 && <span className="rounded-full bg-brand-50 px-2 text-brand-600">{p.frozen} frozen</span>}
                        {!p.active && <span className="rounded-full bg-slate-100 px-2">hidden</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl bg-canvas p-1">
                      <button onClick={() => bump(p, -1)} disabled={p.stock === 0} aria-label={`One less ${p.name}`} className="grid h-8 w-8 place-items-center rounded-xl bg-white disabled:opacity-40"><MinusIcon className="h-4 w-4" /></button>
                      <span className={`w-8 text-center font-bold ${p.stock === 0 ? 'text-red-600' : ''}`}>{p.stock}</span>
                      <button onClick={() => bump(p, 1)} aria-label={`One more ${p.name}`} className="grid h-8 w-8 place-items-center rounded-xl bg-white"><PlusIcon className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => setEditing(p)} className="rounded-xl px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50">Edit</button>
                    <button onClick={() => remove(p)} className="rounded-xl px-3 py-2 text-xs font-semibold text-ink-faint hover:bg-red-50 hover:text-red-600">Remove</button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          {notes.length > 0 && (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-bold"><BellIcon className="h-5 w-5 text-peach-500" />Alerts</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {notes.slice(0, 5).map((n) => <li key={n.id}>{n.message}</li>)}
              </ul>
            </section>
          )}
          <EventFeed />
        </aside>
      </div>

      {editing && <ProductForm initial={editing === 'new' ? null : editing} onSave={saveProduct} onClose={() => setEditing(null)} />}
    </main>
  );
}
