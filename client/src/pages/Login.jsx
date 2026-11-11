import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Logo } from '../components/Navbar.jsx';

export function AuthLayout({ title, subtitle, side, children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/"><Logo className="text-xl" /></Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 text-ink-soft">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-brand-500 p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute left-10 top-40 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
        <div className="relative">{side}</div>
      </div>
    </main>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || '/';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password, 'customer');
      else await register({ ...form, role: 'customer' });
      nav(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={mode === 'login' ? 'Welcome back' : 'Create your account'}
      subtitle="Freeze fresh items at shops near you and pick them up on your walk."
      side={
        <>
          <p className="text-6xl">🥛🍞🥬</p>
          <h2 className="mt-6 max-w-md text-4xl font-extrabold leading-tight">Know it's on the shelf before you walk over.</h2>
          <p className="mt-4 max-w-md text-white/80">Live stock from the small shops in your lane. No delivery fees, no waiting.</p>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-black/5">
        {['login', 'register'].map((m) => (
          <button key={m} onClick={() => { setMode(m); setError(''); }} className={`rounded-xl py-2.5 text-sm font-semibold ${mode === m ? 'bg-brand-500 text-white' : 'text-ink-soft'}`}>
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <>
            <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />
            <Field label="Phone (optional)" value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" />
          </>
        )}
        <Field label="Email" value={form.email} onChange={set('email')} type="email" required autoComplete="email" />
        <Field label="Password" value={form.password} onChange={set('password')} type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3.5">{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
      </form>

      <p className="mt-6 rounded-2xl bg-white p-4 text-xs text-ink-soft ring-1 ring-black/5">
        Demo customer: <b>priya@demo.in</b> / <b>demo1234</b>
      </p>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Own a shop? <Link to="/shop/login" className="font-semibold text-brand-600">Shopkeeper login →</Link>
      </p>
    </AuthLayout>
  );
}
