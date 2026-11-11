const TOKEN_KEY = 'dailycart.token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} },
};

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }
  }
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Request failed', data);
  return data;
}

export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const metres = (m) => (m == null ? '' : m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`);

/** About 80 m per minute walking. */
export const walkMins = (m) => Math.max(1, Math.round(m / 80));

export const CATEGORY_EMOJI = {
  Dairy: '🥛',
  Bakery: '🍞',
  Snacks: '🍪',
  'Fruits & Veg': '🥬',
  Beverages: '🧃',
  'Ready to eat': '🥟',
  Other: '🛍️',
};

export const CATEGORY_TINT = {
  Dairy: 'bg-sky-50',
  Bakery: 'bg-amber-50',
  Snacks: 'bg-peach-50',
  'Fruits & Veg': 'bg-mint-50',
  Beverages: 'bg-brand-50',
  'Ready to eat': 'bg-rose-50',
  Other: 'bg-slate-50',
};

/** Days until a YYYY-MM-DD date (0 = today). */
export function daysLeft(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.round((d - today) / 86400000);
}

export function expiryLabel(dateStr) {
  const n = daysLeft(dateStr);
  if (n == null) return null;
  if (n < 0) return { text: 'Expired', tone: 'bg-red-100 text-red-700' };
  if (n === 0) return { text: 'Best today', tone: 'bg-peach-100 text-peach-700' };
  if (n === 1) return { text: 'Expires tomorrow', tone: 'bg-peach-100 text-peach-700' };
  if (n <= 4) return { text: `${n} days left`, tone: 'bg-amber-100 text-amber-800' };
  return { text: `${n} days left`, tone: 'bg-mint-50 text-mint-700' };
}
