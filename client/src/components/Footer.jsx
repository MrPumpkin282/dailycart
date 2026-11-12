import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 bg-maroon-600 pb-20 text-white sm:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="font-brand text-2xl text-saffron-300">Shopping Nayi, Bharosa Wahi!</p>
          <p className="mt-2 max-w-sm text-sm text-white/80">
            Everything from your neighbourhood shops, reserved in seconds and picked up on your walk.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold">Dailykart</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/search" className="hover:text-white">Search</Link></li>
            <li><Link to="/orders" className="hover:text-white">My orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold">For shops</p>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li><Link to="/shop/login" className="hover:text-white">Shopkeeper login</Link></li>
            <li><Link to="/shop/login?register=1" className="hover:text-white">List your dukaan</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/70">© {new Date().getFullYear()} Dailykart. Made for Indian neighbourhoods.</p>
      </div>
    </footer>
  );
}
