import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, CATEGORY_EMOJI } from '../lib/api.js';
import { useLocation2 } from '../lib/location.jsx';
import LocationGate from '../components/LocationGate.jsx';
import ProductCard from '../components/ProductCard.jsx';
import RadiusToggle from '../components/RadiusToggle.jsx';
import { SearchIcon, BoltIcon, XIcon } from '../components/icons.jsx';

const SORTS = [
  ['relevance', 'Best match'],
  ['distance', 'Nearest'],
  ['expiry', 'Expiring soon'],
  ['price', 'Lowest price'],
];
const PRICES = [['', 'Any price'], ['50', 'Under ₹50'], ['100', 'Under ₹100'], ['200', 'Under ₹200']];

function SearchInner() {
  const { loc, radius } = useLocation2();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'relevance';
  const maxPrice = params.get('maxPrice') || '';

  const [text, setText] = useState(q);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  // Search as you type (debounced) so typo tolerance is visible live.
  useEffect(() => {
    const t = setTimeout(() => { if (text !== q) update({ q: text.trim() }); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    api('/search', { params: { q, category, sort, maxPrice, lat: loc.lat, lng: loc.lng, radius } })
      .then((r) => { if (id === reqId.current) setData(r); })
      .catch((e) => { if (id === reqId.current) setError(e.message); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [q, category, sort, maxPrice, loc.lat, loc.lng, radius]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:pb-16">
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-2 rounded-2xl bg-canvas px-3 ring-1 ring-black/5 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-400">
          <SearchIcon className="h-5 w-5 text-ink-faint" />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search milk, paneer, chips, mango…"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-base focus:outline-none"
            aria-label="Search products"
          />
          {text && (
            <button onClick={() => setText('')} aria-label="Clear search" className="rounded-lg p-1 text-ink-faint hover:text-ink">
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select value={sort} onChange={(e) => update({ sort: e.target.value === 'relevance' ? '' : e.target.value })} className="input w-auto py-2" aria-label="Sort by">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={maxPrice} onChange={(e) => update({ maxPrice: e.target.value })} className="input w-auto py-2" aria-label="Price">
            {PRICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="ml-auto"><RadiusToggle /></div>
        </div>
      </div>

      {/* Category facets come from an OpenSearch aggregation */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        <button onClick={() => update({ category: '' })} className={`chip ${!category ? 'bg-ink text-white' : 'bg-white hover:bg-brand-50'}`}>All</button>
        {(data?.categories || []).map((c) => (
          <button
            key={c.name}
            onClick={() => update({ category: category === c.name ? '' : c.name })}
            className={`chip ${category === c.name ? 'bg-ink text-white' : 'bg-white hover:bg-brand-50'}`}
          >
            {CATEGORY_EMOJI[c.name]} {c.name} <span className="opacity-60">{c.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm">
        <p className="font-semibold">
          {data ? `${data.total} item${data.total === 1 ? '' : 's'} within ${radius} m` : 'Searching…'}
          {q && <span className="font-normal text-ink-soft"> for “{q}”</span>}
        </p>
        {data && (
          <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-3 py-1 text-xs font-semibold text-mint-700" title="Results served by OpenSearch">
            <BoltIcon className="h-3.5 w-3.5" /> OpenSearch · {data.took_ms} ms
          </span>
        )}
      </div>

      {error && <p className="card mt-4 p-5 text-sm text-red-600">{error}</p>}

      {data && data.hits.length === 0 && !loading && (
        <div className="card mt-4 p-10 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 font-semibold">Nothing nearby matches that</p>
          <p className="mt-1 text-sm text-ink-soft">Try another word, or switch to 750 m.</p>
        </div>
      )}

      <div className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
        {data?.hits.map((p) => (
          <ProductCard key={p.id} product={p} shop={{ id: p.shop_id, name: p.shop_name, distance_m: p.distance_m }} showShop />
        ))}
      </div>
    </main>
  );
}

export default function Search() {
  return <LocationGate><SearchInner /></LocationGate>;
}
