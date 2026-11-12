import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, metres, walkMins, CATEGORY_EMOJI } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useLocation2 } from '../lib/location.jsx';
import LocationGate from '../components/LocationGate.jsx';
import ProductCard from '../components/ProductCard.jsx';
import RadiusToggle from '../components/RadiusToggle.jsx';
import { Mascot } from '../components/Brand.jsx';

const CATS = ['Dairy', 'Bakery', 'Fruits & Veg', 'Snacks', 'Beverages', 'Ready to eat', 'Other'];

function SectionHead({ title, sub, action }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="text-xs text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function HomeInner() {
  const { user } = useAuth();
  const { loc, radius } = useLocation2();
  const [shops, setShops] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = { lat: loc.lat, lng: loc.lng, radius };
    setError('');
    api('/shops/nearby', { params }).then(setShops).catch((e) => setError(e.message));
    api('/search', { params: { ...params, sort: 'expiry' } })
      .then((r) => setItems(r.hits.filter((h) => h.stock > 0).slice(0, 12)))
      .catch(() => setItems([]));
  }, [loc.lat, loc.lng, radius]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pb-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Namaste{user ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="text-sm text-ink-soft">
            {shops ? `${shops.length} neighbourhood shop${shops.length === 1 ? '' : 's'} within ${radius} m of ${loc.label}` : 'Finding shops near you…'}
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="relative flex overflow-hidden rounded-2xl bg-saffron-400">
          <div className="relative z-10 p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-700">Fresh from your lane</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight text-maroon-600 sm:text-3xl">Ghar ki zarooratein.<br />Bas, Dailykart se.</h2>
            <p className="mt-2 max-w-xs text-sm text-ink/80">Milk, bread, sabzi and snacks from shops you already trust.</p>
            <Link to="/search" className="btn-primary mt-5">Start your daily basket →</Link>
          </div>
          <div className="dots ml-auto hidden items-end pr-6 sm:flex"><Mascot className="h-48" /></div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-maroon-600 p-6 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-saffron-300">How it works</p>
            <h3 className="mt-2 text-xl font-bold">Reserve now.<br />Pay at the shop.</h3>
            <p className="mt-2 text-sm text-white/80">We hold your items for 30 minutes. No online payment, no delivery fee.</p>
          </div>
          <Link to="/cart" className="mt-4 rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-maroon-600 hover:bg-cream">View my basket</Link>
        </div>
      </section>

      {error && <p className="card mt-6 p-4 text-sm text-maroon-600">{error}</p>}

      {/* Categories */}
      <section className="mt-8">
        <SectionHead title="What's on your list today?" sub="Shop by category" action={<Link to="/search" className="link text-sm">Shop all →</Link>} />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
          {CATS.map((c) => (
            <Link key={c} to={`/search?category=${encodeURIComponent(c)}`} className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border border-cream-line bg-white p-3 text-center hover:border-saffron-400 sm:w-auto">
              <span className="grid h-14 w-14 place-items-center rounded-lg bg-cream text-3xl" aria-hidden="true">{CATEGORY_EMOJI[c]}</span>
              <span className="text-xs font-semibold">{c}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="mt-8">
        <SectionHead title="Everyday favourites" sub="Freshest first: grab these before they're gone" action={<Link to="/search?sort=expiry" className="link text-sm">View all →</Link>} />
        {items === null ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <p className="card p-6 text-sm text-ink-soft">Nothing listed within {radius} m yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} shop={{ id: p.shop_id, name: p.shop_name, distance_m: p.distance_m }} showShop />
            ))}
          </div>
        )}
      </section>

      {/* Shops */}
      <section className="mt-8">
        <SectionHead title="Your neighbourhood, online" sub="Shops you can walk to" action={<RadiusToggle />} />
        {shops === null ? (
          <Skeleton />
        ) : shops.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl">🏪</p>
            <p className="mt-2 font-semibold">No Dailykart shops within {radius} m yet</p>
            <p className="mt-1 text-sm text-ink-soft">Know a shop nearby? Ask them to <Link to="/shop/login?register=1" className="link">list their dukaan</Link>.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link key={s.id} to={`/shops/${s.id}`} className="flex gap-3 rounded-xl border border-cream-line bg-white p-3 hover:border-saffron-400">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-saffron-50 text-2xl">🏪</div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{s.name}</h3>
                  <p className="truncate text-xs text-ink-soft">{s.address}</p>
                  <p className="mt-1 text-xs">
                    <span className="font-semibold text-leaf-600">{metres(s.distance_m)} · {walkMins(s.distance_m)} min walk</span>
                    <span className="text-ink-faint"> · {s.in_stock} in stock</span>
                  </p>
                </div>
                <span className="self-center text-maroon-600" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-cream-line bg-cream-deep p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-600">Pick up on your walk</p>
          <h3 className="mt-1 text-xl font-bold">Your daily needs. One less thing to remember.</h3>
        </div>
        <Link to="/search" className="btn-primary shrink-0">Explore nearby shops →</Link>
      </section>
    </main>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-52 animate-pulse rounded-xl bg-white" />)}
    </div>
  );
}

export default function Home() {
  return <LocationGate><HomeInner /></LocationGate>;
}
