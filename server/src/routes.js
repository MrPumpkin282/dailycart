import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { config } from './config.js';
import { signToken, requireAuth, HttpError, wrap } from './auth.js';
import { publish, TOPICS } from './kafka.js';
import { searchProducts, os } from './search.js';
import { kafkaStatus } from './status.js';
import {
  createFreeze, cancelFreeze, collectFreeze, freezesForUser, freezesForShop,
} from './freezes.js';

export const CATEGORIES = ['Dairy', 'Bakery', 'Snacks', 'Fruits & Veg', 'Beverages', 'Ready to eat', 'Other'];

const r = Router();

// ---------- helpers ----------

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

function readPoint(q, required = true) {
  const lat = num(q.lat);
  const lng = num(q.lng);
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    if (required) throw new HttpError(400, 'Share your location to see nearby shops');
    return null;
  }
  return { lat, lng };
}

const readRadius = (v) => Math.min(config.radius.max, Math.max(config.radius.min, num(v) || config.radius.default));

const DISTANCE_SQL = (latP, lngP) => `
  6371000 * 2 * asin(sqrt(
    power(sin(radians(s.lat - ${latP}) / 2), 2) +
    cos(radians(${latP})) * cos(radians(s.lat)) * power(sin(radians(s.lng - ${lngP}) / 2), 2)
  ))`;

function cleanProduct(body, partial = false) {
  const out = {};
  const str = (k, max = 80) => {
    if (body[k] === undefined) return;
    const v = String(body[k] ?? '').trim();
    if (v.length > max) throw new HttpError(400, `${k} is too long`);
    out[k] = v;
  };
  str('name'); str('brand'); str('unit', 30);
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) throw new HttpError(400, 'Pick a category from the list');
    out.category = body.category;
  }
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!(p >= 0) || p > 100000) throw new HttpError(400, 'Enter a valid price');
    out.price = p;
  }
  if (body.stock !== undefined) {
    const s = Number(body.stock);
    if (!Number.isInteger(s) || s < 0 || s > 10000) throw new HttpError(400, 'Stock must be a whole number');
    out.stock = s;
  }
  if (body.expires_on !== undefined) {
    out.expires_on = body.expires_on ? String(body.expires_on).slice(0, 10) : null;
  }
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (!partial) {
    for (const k of ['name', 'category', 'price', 'stock']) {
      if (out[k] === undefined || out[k] === '') throw new HttpError(400, `${k} is required`);
    }
  }
  return out;
}

async function myShop(userId) {
  const { rows: [shop] } = await query(`SELECT * FROM shops WHERE owner_id = $1`, [userId]);
  if (!shop) throw new HttpError(404, 'No shop is linked to this account');
  return shop;
}

// ---------- meta ----------

r.get('/config', (req, res) => {
  res.json({ freezeMinutes: config.freeze.minutes, maxActive: config.freeze.maxActivePerUser, radius: config.radius, categories: CATEGORIES });
});

r.get('/health', wrap(async (req, res) => {
  const out = { postgres: false, opensearch: false, kafka: kafkaStatus() };
  try { await query('SELECT 1'); out.postgres = true; } catch {}
  try { await os.ping(); out.opensearch = true; } catch {}
  res.json(out);
}));

/** Last events handled by Kafka consumers, for the live demo panel. */
r.get('/events', wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, topic, event_type, consumer, result, payload, processed_at FROM event_log ORDER BY id DESC LIMIT 25`
  );
  res.json(rows);
}));

// ---------- auth ----------

r.post('/auth/register', wrap(async (req, res) => {
  const { name, email, password, phone, role = 'customer', shop } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) throw new HttpError(400, 'Name, email and password are required');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
  if (!['customer', 'shopkeeper'].includes(role)) throw new HttpError(400, 'Invalid role');
  if (role === 'shopkeeper') {
    if (!shop?.name?.trim() || !shop?.address?.trim() || !shop?.city?.trim()) throw new HttpError(400, 'Shop name, address and city are required');
    if (num(shop.lat) == null || num(shop.lng) == null) throw new HttpError(400, 'Set your shop location');
  }

  const hash = await bcrypt.hash(password, 10);
  let user;
  try {
    ({ rows: [user] } = await query(
      `INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, lower($2), $3, $4, $5)
       RETURNING id, name, email, role`,
      [name.trim(), email.trim(), phone || null, hash, role]
    ));
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'An account with this email already exists');
    throw e;
  }
  if (role === 'shopkeeper') {
    await query(
      `INSERT INTO shops (owner_id, name, address, city, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, shop.name.trim(), shop.address.trim(), shop.city.trim(), num(shop.lat), num(shop.lng)]
    );
  }
  res.status(201).json({ token: signToken(user), user });
}));

r.post('/auth/login', wrap(async (req, res) => {
  const { email, password, role } = req.body || {};
  const { rows: [user] } = await query(`SELECT * FROM users WHERE email = lower($1)`, [email || '']);
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) throw new HttpError(401, 'Wrong email or password');
  if (role && user.role !== role) {
    throw new HttpError(403, user.role === 'shopkeeper' ? 'This is a shopkeeper account. Use the shop login.' : 'This is a customer account. Use the customer login.');
  }
  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ token: signToken(safe), user: safe });
}));

// ---------- customer: browse ----------

r.get('/shops/nearby', wrap(async (req, res) => {
  const { lat, lng } = readPoint(req.query);
  const radius = readRadius(req.query.radius);
  const { rows } = await query(
    `SELECT * FROM (
       SELECT s.id, s.name, s.address, s.city, s.lat, s.lng, s.opens_at, s.closes_at,
              ${DISTANCE_SQL('$1', '$2')} AS distance_m,
              (SELECT count(*)::int FROM products p WHERE p.shop_id = s.id AND p.active AND p.stock > 0) AS in_stock,
              (SELECT array_agg(DISTINCT p.category) FROM products p WHERE p.shop_id = s.id AND p.active) AS categories
       FROM shops s) x
     WHERE distance_m <= $3 ORDER BY distance_m`,
    [lat, lng, radius]
  );
  res.json(rows.map((s) => ({ ...s, distance_m: Math.round(s.distance_m) })));
}));

r.get('/shops/:id', wrap(async (req, res) => {
  const { lat, lng } = readPoint(req.query);
  const { rows: [shop] } = await query(
    `SELECT s.id, s.name, s.address, s.city, s.lat, s.lng, s.opens_at, s.closes_at, ${DISTANCE_SQL('$2', '$3')} AS distance_m
     FROM shops s WHERE s.id = $1`,
    [req.params.id, lat, lng]
  );
  if (!shop) throw new HttpError(404, 'Shop not found');
  if (shop.distance_m > config.radius.max) throw new HttpError(403, `This shop is ${(shop.distance_m / 1000).toFixed(1)} km away, outside your ${config.radius.max} m walking range`);
  const { rows: products } = await query(
    `SELECT id, name, brand, category, unit, price, stock, expires_on FROM products
     WHERE shop_id = $1 AND active ORDER BY category, (stock = 0), name`,
    [shop.id]
  );
  res.json({ ...shop, distance_m: Math.round(shop.distance_m), products });
}));

r.get('/search', wrap(async (req, res) => {
  const point = readPoint(req.query);
  const result = await searchProducts({
    q: (req.query.q || '').toString().trim().slice(0, 100),
    category: req.query.category || null,
    minPrice: num(req.query.minPrice),
    maxPrice: num(req.query.maxPrice),
    lat: point.lat,
    lng: point.lng,
    radius: readRadius(req.query.radius),
    sort: req.query.sort,
  });
  res.json({ source: 'opensearch', ...result });
}));

// ---------- customer: freezes (orders) ----------

r.post('/freezes', requireAuth('customer'), wrap(async (req, res) => {
  const freeze = await createFreeze(req.user, Number(req.body?.shopId), req.body?.items);
  res.status(201).json(freeze);
}));

r.get('/freezes', requireAuth('customer'), wrap(async (req, res) => {
  res.json(await freezesForUser(req.user.id));
}));

r.delete('/freezes/:id', requireAuth('customer'), wrap(async (req, res) => {
  await cancelFreeze(req.user.id, Number(req.params.id));
  res.json({ ok: true });
}));

r.get('/notifications', requireAuth(), wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, message, created_at FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 20`,
    [req.user.id]
  );
  res.json(rows);
}));

// ---------- shopkeeper ----------

const shopOnly = requireAuth('shopkeeper');

r.get('/shop/me', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  const { rows: products } = await query(
    `SELECT p.*, COALESCE((SELECT sum(i.qty) FROM freeze_items i JOIN freezes f ON f.id = i.freeze_id
                           WHERE i.product_id = p.id AND f.status = 'active'), 0)::int AS frozen
     FROM products p WHERE p.shop_id = $1 ORDER BY p.active DESC, p.category, p.name`,
    [shop.id]
  );
  const { rows: [stats] } = await query(
    `SELECT count(*) FILTER (WHERE status = 'active')::int AS active,
            count(*) FILTER (WHERE status = 'collected' AND closed_at::date = current_date)::int AS collected_today,
            COALESCE(sum(total) FILTER (WHERE status = 'collected' AND closed_at::date = current_date), 0) AS sales_today
     FROM freezes WHERE shop_id = $1`,
    [shop.id]
  );
  res.json({ shop, products, stats });
}));

r.post('/shop/products', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  const p = cleanProduct(req.body || {});
  const { rows: [created] } = await query(
    `INSERT INTO products (shop_id, name, brand, category, unit, price, stock, expires_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [shop.id, p.name, p.brand || null, p.category, p.unit || '1 pc', p.price, p.stock, p.expires_on || null]
  );
  await publish(TOPICS.inventory, 'inventory.changed', { reason: 'product.added', productIds: [created.id] }, shop.id);
  res.status(201).json(created);
}));

r.patch('/shop/products/:id', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  const p = cleanProduct(req.body || {}, true);
  const keys = Object.keys(p);
  if (!keys.length) throw new HttpError(400, 'Nothing to update');
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  const { rows: [updated] } = await query(
    `UPDATE products SET ${sets}, updated_at = now() WHERE id = $1 AND shop_id = $2 RETURNING *`,
    [req.params.id, shop.id, ...keys.map((k) => p[k])]
  );
  if (!updated) throw new HttpError(404, 'Product not found');
  await publish(TOPICS.inventory, 'inventory.changed', { reason: 'product.updated', productIds: [updated.id] }, shop.id);
  res.json(updated);
}));

/** Counter sales: relative change so it can't overwrite units a customer froze meanwhile. */
r.post('/shop/products/:id/adjust', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  const delta = Number(req.body?.delta);
  if (!Number.isInteger(delta) || Math.abs(delta) > 1000) throw new HttpError(400, 'Invalid change');
  const { rows: [p] } = await query(
    `UPDATE products SET stock = GREATEST(0, stock + $3), updated_at = now()
     WHERE id = $1 AND shop_id = $2 RETURNING id, stock`,
    [req.params.id, shop.id, delta]
  );
  if (!p) throw new HttpError(404, 'Product not found');
  await publish(TOPICS.inventory, 'inventory.changed', { reason: 'counter.adjust', productIds: [p.id] }, shop.id);
  res.json(p);
}));

r.delete('/shop/products/:id', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  const id = Number(req.params.id);
  // Products in active freezes are hidden instead of deleted, so pickups still work.
  const { rows: [busy] } = await query(
    `SELECT 1 FROM freeze_items i JOIN freezes f ON f.id = i.freeze_id WHERE i.product_id = $1 AND f.status = 'active' LIMIT 1`,
    [id]
  );
  const { rowCount } = busy
    ? await query(`UPDATE products SET active = false, updated_at = now() WHERE id = $1 AND shop_id = $2`, [id, shop.id])
    : await query(`DELETE FROM products WHERE id = $1 AND shop_id = $2`, [id, shop.id]);
  if (!rowCount) throw new HttpError(404, 'Product not found');
  await publish(TOPICS.inventory, 'inventory.changed', { reason: 'product.removed', productIds: [id] }, shop.id);
  res.json({ ok: true, hidden: Boolean(busy) });
}));

r.get('/shop/freezes', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  res.json(await freezesForShop(shop.id));
}));

r.post('/shop/freezes/collect', shopOnly, wrap(async (req, res) => {
  const shop = await myShop(req.user.id);
  const closed = await collectFreeze(shop.id, { id: num(req.body?.id), code: req.body?.code?.trim() });
  res.json({ ok: true, code: closed.code, total: closed.total });
}));

export default r;
