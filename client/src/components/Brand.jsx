import { useState } from 'react';

export function Logo({ light = false, small = false }) {
  return (
    <span className="inline-flex flex-col leading-none">
      <span className={`font-brand ${small ? 'text-2xl' : 'text-3xl'} ${light ? 'text-white' : 'text-maroon-600'}`}>Dailykart</span>
      <span className={`mt-0.5 text-[10px] font-medium tracking-wide ${light ? 'text-white/90' : 'text-ink-soft'}`}>
        Shopping Nayi, Bharosa Wahi!
      </span>
    </span>
  );
}

/**
 * The turbaned mascot from the Figma file. Export it from Figma as PNG
 * (transparent background) and save it as client/public/mascot.png.
 * Until then a simple stand-in is shown.
 */
export function Mascot({ className = 'h-56' }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div className={`${className} grid aspect-[3/4] place-items-center`} aria-hidden="true">
        <span className="text-[7rem] leading-none">🙏</span>
      </div>
    );
  }
  return <img src="/mascot.png" alt="" onError={() => setMissing(true)} className={`${className} w-auto object-contain`} />;
}

/** The mascot inside the arch frame used on the login screens. */
export function ArchMascot() {
  return (
    <div className="relative mx-auto flex h-72 w-56 items-end justify-center overflow-hidden rounded-t-full border-2 border-white/80 bg-saffron-300/40">
      <Mascot className="h-64" />
    </div>
  );
}
