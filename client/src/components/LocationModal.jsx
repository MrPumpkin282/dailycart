import { useEffect, useState } from 'react';
import { useLocation2, searchPlaces } from '../lib/location.jsx';
import { PinIcon, XIcon, SearchIcon } from './icons.jsx';

/** "Where are you?" pop-up: search an area / PIN code, or use GPS. */
export default function LocationModal() {
  const { pickerOpen, setPickerOpen, setLoc, locate, status, error, recent, loc } = useLocation2();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      setSearchErr('');
      try { setResults(await searchPlaces(q.trim())); }
      catch (e) { setSearchErr(e.message); }
      finally { setBusy(false); }
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  if (!pickerOpen) return null;
  const close = () => { setPickerOpen(false); setQ(''); };
  const pick = (p) => { setLoc({ lat: p.lat, lng: p.lng, label: p.label }); close(); };
  const useGps = async () => { if (await locate()) close(); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-20" onClick={loc ? close : undefined}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-cream-line bg-cream p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Where are you?</h2>
          {loc && (
            <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-cream-line bg-white text-maroon-600">
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-soft">We show shops within a short walk of this spot.</p>

        <label className="relative mt-4 block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search area, street or PIN code" className="input pl-9" />
        </label>

        {(busy || results.length > 0 || searchErr) && (
          <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-cream-line bg-white">
            {busy && <li className="px-4 py-3 text-sm text-ink-faint">Searching…</li>}
            {searchErr && <li className="px-4 py-3 text-sm text-maroon-600">{searchErr}</li>}
            {!busy && results.map((p, i) => (
              <li key={i}>
                <button onClick={() => pick(p)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-cream">
                  <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-maroon-600" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.label}</span>
                    <span className="block truncate text-xs text-ink-soft">{p.detail}</span>
                  </span>
                </button>
              </li>
            ))}
            {!busy && !searchErr && q.trim().length >= 3 && results.length === 0 && <li className="px-4 py-3 text-sm text-ink-faint">No places found. Try a PIN code.</li>}
          </ul>
        )}

        <button onClick={useGps} disabled={status === 'locating'} className="btn-primary mt-4 w-full">
          <PinIcon className="h-4 w-4" />
          {status === 'locating' ? 'Finding you…' : 'Use my current location'}
        </button>
        {status === 'error' && <p className="mt-2 text-xs text-maroon-600">{error}</p>}

        {recent.length > 0 && (
          <>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Recent</p>
            <ul className="mt-2 space-y-2">
              {recent.map((r) => (
                <li key={r.label}>
                  <button onClick={() => pick(r)} className={`w-full rounded-lg border bg-white px-4 py-3 text-left hover:border-maroon-500 ${loc?.label === r.label ? 'border-maroon-500' : 'border-cream-line'}`}>
                    <span className="block text-sm font-semibold text-maroon-600">{r.label}</span>
                    <span className="block text-xs text-ink-soft">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
