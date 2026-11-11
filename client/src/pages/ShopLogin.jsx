import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { AuthLayout, Field } from './Login.jsx';
import { DEMO_AREA } from '../lib/location.jsx';
import { PinIcon } from '../components/icons.jsx';

export default function ShopLogin() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', shopName: '', address: '', city: '', lat: '', lng: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pinHere = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setForm((f) => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => setError('Location permission denied. Enter the coordinates or use the demo area.')
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password, 'shopkeeper');
      else {
        await register({
          name: form.name, email: form.email, phone: form.phone, password: form.password, role: 'shopkeeper',
          shop: { name: form.shopName, address: form.address, city: form.city, lat: form.lat, lng: form.lng },
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
      title={mode === 'login' ? 'Shopkeeper login' : 'List your shop'}
      subtitle="Put today's fresh stock in front of everyone within walking distance."
      side={
        <>
          <p className="text-6xl">🏪</p>
          <h2 className="mt-6 max-w-md text-4xl font-extrabold leading-tight">Sell your fresh stock before it expires.</h2>
          <ul className="mt-6 space-y-3 text-white/90">
            <li>✓ Add items in seconds, update stock anytime</li>
            <li>✓ Customers freeze items and pay you at the counter</li>
            <li>✓ Unclaimed items return to your shelf automatically</li>
          </ul>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-black/5">
        {['login', 'register'].map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} className={`rounded-xl py-2.5 text-sm font-semibold ${mode === m ? 'bg-ink text-white' : 'text-ink-soft'}`}>
            {m === 'login' ? 'Log in' : 'Register shop'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" value={form.name} onChange={set('name')} required />
              <Field label="Phone" value={form.phone} onChange={set('phone')} type="tel" />
            </div>
            <Field label="Shop name" value={form.shopName} onChange={set('shopName')} required />
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Address" value={form.address} onChange={set('address')} required />
              <Field label="City" value={form.city} onChange={set('city')} required />
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <span className="label">Shop location</span>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Latitude" value={form.lat} onChange={set('lat')} required inputMode="decimal" />
                <input className="input" placeholder="Longitude" value={form.lng} onChange={set('lng')} required inputMode="decimal" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={pinHere} className="btn-soft px-3 py-2 text-xs"><PinIcon className="h-4 w-4" />I'm at my shop</button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, lat: (DEMO_AREA.lat + 0.002).toFixed(6), lng: (DEMO_AREA.lng - 0.001).toFixed(6), city: f.city || 'Bengaluru' }))}
                  className="btn-ghost px-3 py-2 text-xs"
                >
                  Use demo area
                </button>
              </div>
            </div>
          </>
        )}
        <Field label="Email" value={form.email} onChange={set('email')} type="email" required autoComplete="email" />
        <Field label="Password" value={form.password} onChange={set('password')} type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn w-full bg-ink py-3.5 text-white hover:bg-black">
          {busy ? 'Please wait…' : mode === 'login' ? 'Open dashboard' : 'Register shop'}
        </button>
      </form>

      <p className="mt-6 rounded-2xl bg-white p-4 text-xs text-ink-soft ring-1 ring-black/5">
        Demo shop: <b>ravi@demo.in</b> / <b>demo1234</b>
      </p>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Shopping instead? <Link to="/login" className="font-semibold text-brand-600">Customer login →</Link>
      </p>
    </AuthLayout>
  );
}
