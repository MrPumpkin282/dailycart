import { useLocation2 } from '../lib/location.jsx';

export default function RadiusToggle() {
  const { radius, setRadius } = useLocation2();
  return (
    <div className="inline-flex rounded-2xl bg-white p-1 ring-1 ring-black/5" role="group" aria-label="Walking distance">
      {[500, 750].map((r) => (
        <button
          key={r}
          onClick={() => setRadius(r)}
          aria-pressed={radius === r}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${radius === r ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'}`}
        >
          {r} m
        </button>
      ))}
    </div>
  );
}
