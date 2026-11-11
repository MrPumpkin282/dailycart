import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, metres, walkMins, CATEGORY_EMOJI } from '../lib/api.js';
import { useLocation2 } from '../lib/location.jsx';
import { useCart } from '../lib/cart.jsx';
import LocationGate from '../components/LocationGate.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { WalkIcon, ClockIcon, PinIcon } from '../components/icons.jsx';

function ShopInner() {
  const { id } = useParams();
  const { loc } = useLocation2();
  const { cart } = useCart();
  const [shop, setShop] = useState(null);
  const [error, setError] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    api(`/shops/${id}`, { params: { lat: loc.lat, lng: loc.lng } }).then(setShop).catch((e) => setError(e.message));
  }, [id, loc.lat, loc.lng]);

  const cats = useMemo(() => [...new Set((shop?.products || []).map((p) => p.category))], [shop]);
  const inCart = cart[id] ? Object.values(cart[id].items).reduce((n, i) => n + i.qty, 0) : 0;

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="card p-10 text-center">
          <p className="text-4xl">🚶</p>
          <p className="mt-3 font-semibold">{error}</p>
          <Link to="/" className="btn-soft mt-6">Back to nearby shops</Link>
        </div>
      </main>
    );
  }
  if (!shop) return <main className="mx-auto max-w-6xl px-4 py-10"><div className="h-48 animate-pulse rounded-3xl bg-white" /></main>;

  const products = cat ? shop.products.filter((p) => p.category === cat) : shop.products;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:pb-24">
      <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-brand-50 text-4xl">🏪</div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{shop.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft"><PinIcon className="h-4 w-4" />{shop.address}, {shop.city}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-3 py-1 text-mint-700"><WalkIcon className="h-3.5 w-3.5" />{metres(shop.distance_m)} · {walkMins(shop.distance_m)} min walk</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-ink-soft"><ClockIcon className="h-3.5 w-3.5" />Open {shop.opens_at}–{shop.closes_at}</span>
          </div>
        </div>
        <a
          className="btn-ghost"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}&travelmode=walking`}
        >
          Directions
        </a>
      </section>

      <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
        <button onClick={() => setCat('')} className={`chip ${!cat ? 'bg-ink text-white' : 'bg-white'}`}>All · {shop.products.length}</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'bg-ink text-white' : 'bg-white'}`}>{CATEGORY_EMOJI[c]} {c}</button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} shop={shop} />)}
      </div>

      {inCart > 0 && (
        <div className="fixed inset-x-3 bottom-20 z-30 sm:bottom-6">
          <Link to="/cart" className="btn-primary mx-auto flex w-full max-w-md justify-between rounded-3xl px-6 py-4">
            <span>{inCart} item{inCart > 1 ? 's' : ''} from this shop</span>
            <span>Review &amp; freeze →</span>
          </Link>
        </div>
      )}
    </main>
  );
}

export default function Shop() {
  return <LocationGate><ShopInner /></LocationGate>;
}
