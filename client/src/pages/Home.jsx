import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, metres, walkMins, CATEGORY_EMOJI } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useLocation2 } from '../lib/location.jsx';
import LocationGate from '../components/LocationGate.jsx';
import ProductCard from '../components/ProductCard.jsx';
import RadiusToggle from '../components/RadiusToggle.jsx';
import { SearchIcon, StoreIcon, ClockIcon, WalkIcon, PinIcon } from '../components/icons.jsx';

const CATS = ['Dairy', 'Bakery', 'Fruits & Veg', 'Snacks', 'Beverages', 'Ready to eat'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function HomeInner() {
  const { user } = useAuth();
  const { loc, radius, setLoc } = useLocation2();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [shops, setShops] = useState(null);
  const [expiring, setExpiring] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = { lat: loc.lat, lng: loc.lng, radius };
    setError('');
    api('/shops/nearby', { params }).then(setShops).catch((e) => setError(e.message));
    api('/search', { params: { ...params, sort: 'expiry' } })
      .then((r) => setExpiring(r.hits.filter((h) => h.stock > 0).slice(0, 10)))
      .catch(() => setExpiring([]));
  }, [loc.lat, loc.lng, radius]);

  const submit = (e) => {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:pb-16">
      {/* Hero */}
      <section className="card relative overflow-hidden bg-brand-500 p-6 text-white sm:p-10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm font-medium text-white/80">{greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''} 👋</p>
          <h1 className="mt-1 max-w-xl text-2xl font-extrabold leading-tight sm:text-4xl">What do you need from the corner shop today?</h1>
          <form onSubmit={submit} className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-lg">
            <SearchIcon className="ml-3 h-5 w-5 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try “milk”, “bred”, “samosa”…"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              aria-label="Search products"
            />
            <button className="btn-primary px-5 py-2.5 shadow-none">Search</button>
          </form>
          <button onClick={() => setLoc(null)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white md:hidden">
            <PinIcon className="h-4 w-4" />{loc.label} · change
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
        {CATS.map((c) => (
          <Link key={c} to={`/search?category=${encodeURIComponent(c)}`} className="chip bg-white hover:bg-brand-50">
            <span aria-hidden="true">{CATEGORY_EMOJI[c]}</span>{c}
          </Link>
        ))}
      </section>

      {error && <p className="card mt-6 p-5 text-sm text-red-600">{error}</p>}

      {/* Expiring soon */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold"><ClockIcon className="h-5 w-5 text-peach-500" />Grab it before it's gone</h2>
            <p className="text-sm text-ink-soft">Fresh items nearby with the shortest shelf life</p>
          </div>
          <Link to="/search?sort=expiry" className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">See all</Link>
        </div>
        {expiring === null ? (
          <SkeletonRow />
        ) : expiring.length === 0 ? (
          <p className="card p-6 text-sm text-ink-soft">Nothing listed within {radius} m yet.</p>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {expiring.map((p) => (
              <div key={p.id} className="w-44 shrink-0 sm:w-52">
                <ProductCard product={p} shop={{ id: p.shop_id, name: p.shop_name, distance_m: p.distance_m }} showShop />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shops */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-extrabold"><StoreIcon className="h-5 w-5 text-brand-500" />Shops within {radius} m</h2>
            <p className="text-sm text-ink-soft">Only stores you can walk to are shown</p>
          </div>
          <RadiusToggle />
        </div>
        {shops === null ? (
          <SkeletonRow />
        ) : shops.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl">🏪</p>
            <p className="mt-2 font-semibold">No DailyCart shops within {radius} m</p>
            <p className="mt-1 text-sm text-ink-soft">Try the demo area to explore the app.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Link key={s.id} to={`/shops/${s.id}`} className="card group flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl">🏪</div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold group-hover:text-brand-600">{s.name}</h3>
                  <p className="truncate text-xs text-ink-soft">{s.address}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2 py-0.5 font-semibold text-mint-700">
                      <WalkIcon className="h-3.5 w-3.5" />{metres(s.distance_m)} · {walkMins(s.distance_m)} min
                    </span>
                    <span className="rounded-full bg-canvas px-2 py-0.5 font-medium text-ink-soft">{s.in_stock} in stock</span>
                  </div>
                  <p className="mt-2 text-sm" aria-label="Categories">
                    {(s.categories || []).map((c) => <span key={c} title={c} className="mr-1">{CATEGORY_EMOJI[c]}</span>)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 w-48 shrink-0 animate-pulse rounded-3xl bg-white" />)}
    </div>
  );
}

export default function Home() {
  return <LocationGate><HomeInner /></LocationGate>;
}
