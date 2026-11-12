import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Logo, ArchMascot } from '../components/Brand.jsx';

/** Split screen from the Figma: saffron story panel left, cream form right. */
export function AuthLayout({ headline, story, topLink, children }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative flex flex-col bg-saffron-400 px-6 py-6 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <Link to="/"><Logo light /></Link>
          <span className="hidden pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink/70 sm:block">Your neighbourhood, online</span>
        </div>
        <h1 className="mt-8 max-w-sm text-3xl font-extrabold leading-tight text-maroon-600 sm:text-4xl">{headline}</h1>
        <div className="dots relative mt-8 hidden flex-1 items-center justify-center py-6 lg:flex">
          <ArchMascot />
        </div>
        <div className="mt-6 hidden text-center lg:block">
          <p className="font-bold text-maroon-600">Shopping Nayi, Bharosa Wahi!</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink/80">{story}</p>
        </div>
        <p className="mt-8 hidden border-t border-ink/10 pt-4 text-center text-[11px] text-ink/60 lg:block">Your local kirana · Fresh every day · Pay at the counter</p>
      </section>

      <section className="flex flex-col bg-cream px-6 py-6 sm:px-10">
        <div className="text-right text-xs font-semibold">{topLink}</div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </section>
    </main>
  );
}

export function Tabs({ value, onChange, options }) {
  return (
    <div className="mb-6 grid grid-cols-2 rounded-lg border border-cream-line bg-cream-deep p-1">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-md py-2 text-xs font-semibold transition ${value === v ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}{hint && <span className="font-normal text-ink-faint"> {hint}</span>}</span>
      <input className="input" {...props} />
    </label>
  );
}

export function PhoneField({ value, onChange, required }) {
  return (
    <label className="block">
      <span className="label">Mobile number{!required && <span className="font-normal text-ink-faint"> (optional)</span>}</span>
      <div className="flex gap-2">
        <span className="grid place-items-center rounded-lg border border-cream-line bg-white px-3 text-sm font-semibold">+91</span>
        <input className="input" type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))} required={required} pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" />
      </div>
    </label>
  );
}

export function PasswordField({ value, onChange, autoComplete, label = 'Password' }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input className="input pr-16" type={show ? 'text' : 'password'} value={value} onChange={onChange} required minLength={6} autoComplete={autoComplete} placeholder="Enter your password" />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-maroon-600">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || '/';
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', agree: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password, 'customer');
      else await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password, role: 'customer' });
      nav(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      headline={<>Apna bazaar.<br />Apno ka bharosa.</>}
      story="Your everyday favourites. Your trusted local shops. A little closer, with Dailykart."
      topLink={<Link to="/shop/login" className="link">Own a shop? →</Link>}
    >
      <Tabs value={mode} onChange={(m) => { setMode(m); setError(''); }} options={[['login', 'Log in'], ['register', 'Create account']]} />

      <h2 className="text-2xl font-bold">{mode === 'login' ? 'Namaste, welcome back!' : 'Aapka apna Dailykart.'}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {mode === 'login' ? 'Your local favourites are just a tap away.' : 'Join your neighbourhood. Shop from people you trust.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'register' && (
          <>
            <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" placeholder="Enter your full name" />
            <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          </>
        )}
        <Field label="Email address" type="email" value={form.email} onChange={set('email')} required autoComplete="email" placeholder="you@example.com" />
        <PasswordField value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

        {mode === 'register' && (
          <label className="flex items-start gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} required className="mt-0.5 accent-maroon-600" />
            I agree to the Terms of Service and Privacy Policy
          </label>
        )}

        {error && <p className="rounded-lg bg-maroon-50 px-3 py-2 text-sm text-maroon-700">{error}</p>}
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-soft">
        {mode === 'login'
          ? <>New to Dailykart? <button onClick={() => setMode('register')} className="link">Create an account</button></>
          : <>Already part of Dailykart? <button onClick={() => setMode('login')} className="link">Log in</button></>}
      </p>
      <p className="mt-10 text-center text-xs text-ink-soft">
        Run a local shop? <Link to="/shop/login" className="link">Become a seller</Link>
      </p>
    </AuthLayout>
  );
}
