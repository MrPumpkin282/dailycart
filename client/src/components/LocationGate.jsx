import { useLocation2 } from '../lib/location.jsx';
import { Mascot } from './Brand.jsx';
import { PinIcon } from './icons.jsx';

/** Customers only see shops within walking range, so ask where they are first. */
export default function LocationGate({ children }) {
  const { loc, setPickerOpen } = useLocation2();
  if (loc) return children;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="relative grid overflow-hidden rounded-2xl bg-saffron-400 sm:grid-cols-[1.4fr_1fr]">
        <div className="p-8 sm:p-12">
          <p className="text-xs font-bold uppercase tracking-wider text-maroon-700">Your neighbourhood, online</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-maroon-600 sm:text-5xl">Ghar ki zarooratein.<br />Bas, Dailykart se.</h1>
          <p className="mt-4 max-w-md text-ink/80">
            See what the shops around you have on the shelf right now. Reserve it, walk over, and pay at the counter.
          </p>
          <button onClick={() => setPickerOpen(true)} className="btn-primary mt-8">
            <PinIcon className="h-4 w-4" /> Set my location
          </button>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center">
            {[['1', 'Find nearby'], ['2', 'Reserve items'], ['3', 'Pay in store']].map(([n, t]) => (
              <div key={n} className="rounded-xl bg-white/60 p-3">
                <p className="text-lg font-extrabold text-maroon-600">{n}</p>
                <p className="text-xs font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="dots hidden items-end justify-center sm:flex"><Mascot className="h-80" /></div>
      </section>
    </main>
  );
}
