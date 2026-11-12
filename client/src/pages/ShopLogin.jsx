import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { searchPlaces } from '../lib/location.jsx';
import { AuthLayout, Tabs, Field, PhoneField, PasswordField } from './Login.jsx';
import { PinIcon } from '../components/icons.jsx';

export default function ShopLogin() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('register') ? 'register' : 'login');
  const [form, setForm] = useState({ name: '', shopName: '', phone: '', address: '', city: '', pincode: '', email: '', password: '', agree: false });
  const [pin, setPin] = useState(null); // { lat, lng, label }
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (['address', 'city', 'pincode'].includes(k)) setPin(null); };

  /** Turn the typed address + PIN code into a map position. */
  const findOnMap = async () => {
    setError('');
    const text = [form.address, form.city, form.pincode].filter(Boolean).join(', ');
    if (!form.pincode && !form.address) return setError('Enter your shop address and PIN code first');
    setLocating(true);
    try {
      let [hit] = await searchPlaces(text);
      if (!hit && form.pincode) [hit] = await searchPlaces(form.pincode);
      if (!hit) throw new Error("Couldn't find that address. Check the PIN code, or use your current location while at the shop.");
      setPin({ lat: hit.lat, lng: hit.lng, label: hit.detail });
      if (!form.city && hit.city) setForm((f) => ({ ...f, city: hit.city }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLocating(false);
    }
  };

  const hereNow = () => {
    setError('');
    if (!navigator.geolocation) return setError("This browser can't share location");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setPin({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'Current location' }); setLocating(false); },
      () => { setError('Location is blocked on this device. Use "Find on map" with your address instead.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !pin) return setError('Find your shop on the map first, so nearby customers can see it');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password, 'shopkeeper');
      else {
        await register({
          name: form.name, email: form.email, phone: form.phone, password: form.password, role: 'shopkeeper',
          shop: {
            name: form.shopName,
            address: [form.address, form.pincode].filter(Boolean).join(' - '),
            city: form.city,
            lat: pin.lat,
            lng: pin.lng,
          },
        });
      }
      nav('/shop/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      headline={<>Apni dukaan.<br />Ab online.</>}
      story="Bring your neighbourhood shop online. Connect with customers, one order at a time."
      topLink={<Link to="/login" className="link">Shopping instead? →</Link>}
    >
      <Tabs value={mode} onChange={(m) => { setMode(m); setError(''); }} options={[['login', 'Shopkeeper login'], ['register', 'Register your shop']]} />

      <h2 className="text-2xl font-bold">{mode === 'login' ? 'Namaste, shopkeeper!' : "Let's grow your dukaan."}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {mode === 'login' ? 'Manage your orders, products and shop in one place.' : 'Share a few details about you and your shop.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner's full name" value={form.name} onChange={set('name')} required placeholder="Enter your name" />
              <Field label="Shop name" value={form.shopName} onChange={set('shopName')} required placeholder="Enter shop name" />
            </div>
            <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
            <Field label="Shop address" value={form.address} onChange={set('address')} required placeholder="Shop no., street, area" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" value={form.city} onChange={set('city')} required placeholder="City" />
              <Field label="Shop PIN code" value={form.pincode} onChange={(e) => set('pincode')({ target: { value: e.target.value.replace(/\D/g, '').slice(0, 6) } })} required inputMode="numeric" pattern="[1-9][0-9]{5}" title="6-digit PIN code" placeholder="6-digit PIN" />
            </div>

            <div className={`rounded-lg border p-3 ${pin ? 'border-leaf-600 bg-leaf-50' : 'border-cream-line bg-white'}`}>
              <p className="flex items-center gap-1.5 text-xs font-semibold"><PinIcon className="h-4 w-4 text-maroon-600" />Shop on the map</p>
              {pin
                ? <p className="mt-1 line-clamp-2 text-xs text-leaf-600">✓ {pin.label}</p>
                : <p className="mt-1 text-xs text-ink-soft">Customers within 750 m will see your shop.</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={findOnMap} disabled={locating} className="btn-outline px-3 py-1.5 text-xs">{locating ? 'Finding…' : 'Find on map'}</button>
                <button type="button" onClick={hereNow} disabled={locating} className="btn-ghost px-3 py-1.5 text-xs">I'm at my shop</button>
              </div>
            </div>
          </>
        )}

        <Field label="Email address" type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="you@example.com" />
        <PasswordField value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

        {mode === 'register' && (
          <label className="flex items-start gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} required className="mt-0.5 accent-maroon-600" />
            I agree to the Seller Terms and Privacy Policy
          </label>
        )}

        {error && <p className="rounded-lg bg-maroon-50 px-3 py-2 text-sm text-maroon-700">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Please wait…' : mode === 'login' ? 'Log in to your shop' : 'Register my shop'}</button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-soft">
        {mode === 'login'
          ? <>New to Dailykart? <button onClick={() => setMode('register')} className="link">Register your shop</button></>
          : <>Already a seller? <button onClick={() => setMode('login')} className="link">Log in</button></>}
      </p>
      <p className="mt-8 text-center text-xs text-ink-soft">
        Not a shop owner? <Link to="/login" className="link">Customer login</Link>
      </p>
    </AuthLayout>
  );
}
