import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { useLocation2 } from '../lib/location.jsx';
import { Logo } from './Brand.jsx';
import { HomeIcon, SearchIcon, CartIcon, PinIcon, XIcon } from './icons.jsx';

function AccountMenu({ onClose }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const out = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', out);
    return () => document.removeEventListener('mousedown', out);
  }, [onClose]);

  const item = 'flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-cream-deep';
  return (
    <div ref={ref} className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-cream-line bg-cream shadow-pop">
      <div className="flex items-start justify-between border-b border-cream-line p-4">
        <div>
          <p className="font-bold">Namaste, {user.name.split(' ')[0]}</p>
          <p className="text-xs text-ink-soft">{user.email}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg border border-cream-line bg-white text-maroon-600"><XIcon className="h-4 w-4" /></button>
      </div>
      <Link to="/orders" onClick={onClose} className={item}>My orders <span aria-hidden="true">›</span></Link>
      <Link to="/cart" onClick={onClose} className={item}>My basket <span aria-hidden="true">›</span></Link>
      <button onClick={() => { logout(); onClose(); nav('/'); }} className={`${item} text-maroon-600`}>Log out</button>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { loc, setPickerOpen } = useLocation2();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const isShop = user?.role === 'shopkeeper';

  const submit = (e) => {
    e.preventDefault();
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  const tab = ({ isActive }) => `rounded-md px-3 py-1.5 text-sm font-semibold ${isActive ? 'bg-white/70 text-maroon-700' : 'text-ink hover:bg-white/40'}`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-saffron-400 shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to={isShop ? '/shop/dashboard' : '/'} className="shrink-0"><Logo light small /></Link>

          {!isShop && (
            <>
              <nav className="ml-2 hidden items-center gap-1 lg:flex">
                <NavLink to="/" end className={tab}>Home</NavLink>
                <NavLink to="/search" className={tab}>Categories</NavLink>
                <NavLink to="/orders" className={tab}>Orders</NavLink>
              </nav>

              <button
                onClick={() => setPickerOpen(true)}
                className="hidden max-w-[190px] items-center gap-1.5 truncate rounded-lg bg-maroon-600 px-3 py-2 text-xs font-semibold text-white hover:bg-maroon-700 md:flex"
              >
                <PinIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{loc ? loc.label : 'Set location'}</span>
                <span aria-hidden="true">▾</span>
              </button>

              <form onSubmit={submit} className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 sm:flex">
                <SearchIcon className="h-4 w-4 text-ink-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for milk, atta, vegetables…" aria-label="Search products" className="min-w-0 flex-1 bg-transparent py-2 text-sm focus:outline-none" />
              </form>

              <Link to="/cart" className="ml-auto flex items-center gap-2 rounded-lg bg-maroon-600 px-3 py-2 text-sm font-semibold text-white hover:bg-maroon-700 sm:ml-0">
                <CartIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Cart</span>
                {count > 0 && <span className="rounded-full bg-saffron-400 px-1.5 text-[11px] font-bold text-ink">{count}</span>}
              </Link>
            </>
          )}

          <div className={`relative flex items-center gap-2 ${isShop ? 'ml-auto' : ''}`}>
            {user ? (
              isShop ? (
                <button onClick={() => { logout(); nav('/shop/login'); }} className="btn-ghost py-2">Log out</button>
              ) : (
                <>
                  <button onClick={() => setMenu((m) => !m)} aria-label="Account" className="grid h-9 w-9 place-items-center rounded-full bg-white font-bold text-maroon-600">
                    {user.name[0].toUpperCase()}
                  </button>
                  {menu && <AccountMenu onClose={() => setMenu(false)} />}
                </>
              )
            ) : (
              <Link to="/login" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-maroon-600 hover:bg-cream">Log in</Link>
            )}
          </div>
        </div>

        {!isShop && (
          <div className="flex gap-2 px-4 pb-3 sm:hidden">
            <button onClick={() => setPickerOpen(true)} className="flex shrink-0 items-center gap-1 rounded-lg bg-maroon-600 px-2.5 text-xs font-semibold text-white">
              <PinIcon className="h-4 w-4" /><span className="max-w-[90px] truncate">{loc ? loc.label : 'Location'}</span>
            </button>
            <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3">
              <SearchIcon className="h-4 w-4 text-ink-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search milk, atta…" aria-label="Search products" className="min-w-0 flex-1 bg-transparent py-2 text-sm focus:outline-none" />
            </form>
          </div>
        )}
      </header>

      {!isShop && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-cream-line bg-white py-2 sm:hidden">
          {[['/', 'Home', HomeIcon], ['/search', 'Search', SearchIcon], ['/cart', 'Cart', CartIcon], ['/orders', 'Orders', PinIcon]].map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => `flex flex-col items-center text-[11px] font-semibold ${isActive ? 'text-maroon-600' : 'text-ink-soft'}`}>
              <Icon className="h-5 w-5" />{label}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
