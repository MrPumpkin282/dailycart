import { useLocation2 } from '../lib/location.jsx';

export default function RadiusToggle() {
  const { radius, setRadius } = useLocation2();
  return (
    <div className="inline-flex rounded-lg border border-cream-line bg-white p-0.5" role="group" aria-label="Walking distance">
      {[500, 750].map((r) => (
        <button
          key={r}
          onClick={() => setRadius(r)}
          aria-pressed={radius === r}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition ${radius === r ? 'bg-maroon-600 text-white' : 'text-ink-soft hover:text-ink'}`}
        >
          {r} m
        </button>
      ))}
    </div>
  );
}
