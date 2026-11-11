const Svg = ({ children, className = 'h-5 w-5', ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...p}>
    {children}
  </svg>
);

export const HomeIcon = (p) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>;
export const SearchIcon = (p) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const CartIcon = (p) => <Svg {...p}><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.3a1 1 0 0 0 1 .7h9.7a1 1 0 0 0 1-.8L21 7H6" /></Svg>;
export const PinIcon = (p) => <Svg {...p}><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>;
export const StoreIcon = (p) => <Svg {...p}><path d="M3 9 4.5 4h15L21 9M3 9h18M3 9v1.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9M5 13v8h14v-8" /></Svg>;
export const ClockIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const SnowIcon = (p) => <Svg {...p}><path d="M12 2v20M4.9 6l14.2 12M4.9 18 19.1 6M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" /></Svg>;
export const WalkIcon = (p) => <Svg {...p}><circle cx="13" cy="4" r="1.6" /><path d="m9 21 2.5-6.5L14 17v4M7 11l3-3.5 3.5 1.5 2 3.5 2.5 1M11.5 14.5 10 8" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const XIcon = (p) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const BoltIcon = (p) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>;
export const CheckIcon = (p) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7" /></Svg>;
export const BellIcon = (p) => <Svg {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 21h4" /></Svg>;
