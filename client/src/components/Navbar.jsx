import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { useLocation2 } from '../lib/location.jsx';
import { HomeIcon, SearchIcon, CartIcon, PinIcon, StoreIcon } from './icons.jsx';

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-lg text-white shadow-lift">🛒</span>
      <span>Daily<span className="text-brand-500">Cart</span></span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { loc, setLoc } = useLocation2();
  const nav = useNavigate();
  const isShop = user?.role === 'shopkeeper';

  const tab = ({ isActive }) =>
    `flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      isActive ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:text-ink'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to={isShop ? '/shop/dashboard' : '/'}><Logo className="text-lg" /></Link>

          {!isShop && loc && (
            <button
              onClick={() => setLoc(null)}
              className="hidden items-center gap-1.5 truncate rounded-full bg-white px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-black/5 hover:text-ink md:flex"
              title="Change location"
            >
              <PinIcon className="h-4 w-4 text-brand-500" />
              <span className="max-w-[200px] truncate">{loc.label}</span>
            </button>
          )}

          {!isShop && (
            <nav className="ml-auto hidden items-center gap-1 sm:flex">
              <NavLink to="/" end className={tab}><HomeIcon className="h-4 w-4" />Home</NavLink>
              <NavLink to="/search" className={tab}><SearchIcon className="h-4 w-4" />Search</NavLink>
              <NavLink to="/cart" className={tab}>
                <CartIcon className="h-4 w-4" />Cart
                {count > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] text-white">{count}</span>}
              </NavLink>
            </nav>
          )}

          <div className={`flex items-center gap-2 ${isShop ? 'ml-auto' : 'ml-auto sm:ml-2'}`}>
            {user ? (
              <>
                <span className="hidden text-sm text-ink-soft lg:inline">Hi, {user.name.split(' ')[0]}</span>
                <button onClick={() => { logout(); nav(isShop ? '/shop/login' : '/'); }} className="btn-ghost px-4 py-2">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/shop/login" className="hidden items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink md:flex">
                  <StoreIcon className="h-4 w-4" />For shops
                </Link>
                <Link to="/login" className="btn-primary px-4 py-2">Log in</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Bottom tab bar on phones */}
      {!isShop && (
        <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-3xl bg-white p-2 shadow-card ring-1 ring-black/5 sm:hidden">
          <NavLink to="/" end className={tab}><HomeIcon className="h-5 w-5" /></NavLink>
          <NavLink to="/search" className={tab}><SearchIcon className="h-5 w-5" /></NavLink>
          <NavLink to="/cart" className={tab}>
            <CartIcon className="h-5 w-5" />
            {count > 0 && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] text-white">{count}</span>}
          </NavLink>
        </nav>
      )}
    </>
  );
}
