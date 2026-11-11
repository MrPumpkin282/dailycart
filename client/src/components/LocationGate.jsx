import { useLocation2 } from '../lib/location.jsx';
import { PinIcon } from './icons.jsx';

/** Asks for location before showing anything: customers only see shops within walking range. */
export default function LocationGate({ children }) {
  const { loc, locate, useDemo, status, error } = useLocation2();
  if (loc) return children;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="card relative overflow-hidden p-8 sm:p-12">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-100 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-mint-100 blur-2xl" aria-hidden="true" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
            <PinIcon className="h-4 w-4" /> Within 750 m of you
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            Fresh milk, bread and snacks from the shop <span className="text-brand-500">around the corner.</span>
          </h1>
          <p className="mt-4 text-ink-soft">
            See what your local stores have on the shelf right now. Freeze it for 30 minutes, walk over, and pay at the counter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={locate} disabled={status === 'locating'} className="btn-primary">
              <PinIcon className="h-4 w-4" />
              {status === 'locating' ? 'Finding you…' : 'Use my location'}
            </button>
            <button onClick={useDemo} className="btn-ghost">Try the demo area</button>
          </div>
          {status === 'error' && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <dl className="mt-10 grid grid-cols-3 gap-4 text-center sm:max-w-md">
            {[['1', 'Find nearby'], ['2', 'Freeze items'], ['3', 'Pay in store']].map(([n, t]) => (
              <div key={n} className="rounded-2xl bg-canvas p-3">
                <dt className="text-lg font-extrabold text-brand-500">{n}</dt>
                <dd className="text-xs font-medium text-ink-soft">{t}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </main>
  );
}
