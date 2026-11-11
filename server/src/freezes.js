import crypto from 'node:crypto';
import { tx, query } from './db.js';
import { config } from './config.js';
import { publish, TOPICS } from './kafka.js';
import { HttpError } from './auth.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  'DC-' + Array.from(crypto.randomBytes(5), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

/**
 * Freeze (reserve) items at one shop. This is the "place order" step.
 *
 * Concurrency: the product rows are locked with SELECT ... FOR UPDATE (in id
 * order to avoid deadlocks), so if two people try to freeze the last unit at
 * the same moment, the second waits, then sees stock = 0 and is refused.
 * The user row is locked too, so the active-freeze limit can't be raced.
 */
export async function createFreeze(user, shopId, items) {
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your cart is empty');

  const wanted = new Map();
  for (const it of items) {
    const id = Number(it.productId);
    const qty = Number(it.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'Invalid cart item');
    if (qty > config.freeze.maxQtyPerItem)
      throw new HttpError(400, `You can freeze at most ${config.freeze.maxQtyPerItem} of each item`);
    wanted.set(id, (wanted.get(id) || 0) + qty);
  }
  const ids = [...wanted.keys()].sort((a, b) => a - b);

  const result = await tx(async (c) => {
    const { rows: [u] } = await c.query(`SELECT id, name FROM users WHERE id = $1 FOR UPDATE`, [user.id]);
    if (!u) throw new HttpError(401, 'Account not found');

    const { rows: [{ count }] } = await c.query(
      `SELECT count(*)::int AS count FROM freezes WHERE user_id = $1 AND status = 'active'`,
      [user.id]
    );
    if (count >= config.freeze.maxActivePerUser)
      throw new HttpError(409, `You already have ${count} active freezes. Pick those up or cancel one first.`);

    const { rows: [shop] } = await c.query(`SELECT id, name, owner_id FROM shops WHERE id = $1`, [shopId]);
    if (!shop) throw new HttpError(404, 'Shop not found');

    const { rows: products } = await c.query(
      `SELECT id, name, unit, price, stock FROM products
       WHERE id = ANY($1::int[]) AND shop_id = $2 AND active
       ORDER BY id FOR UPDATE`,
      [ids, shopId]
    );
    if (products.length !== ids.length) throw new HttpError(409, 'Some items are no longer listed at this shop');

    const short = products.filter((p) => p.stock < wanted.get(p.id));
    if (short.length) {
      const err = new HttpError(
        409,
        short.map((p) => (p.stock === 0 ? `${p.name} just sold out` : `Only ${p.stock} ${p.name} left`)).join('. ')
      );
      err.stock = Object.fromEntries(short.map((p) => [p.id, p.stock]));
      throw err;
    }

    for (const p of products) {
      await c.query(`UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2`, [wanted.get(p.id), p.id]);
    }

    const total = products.reduce((sum, p) => sum + p.price * wanted.get(p.id), 0);
    const { rows: [freeze] } = await c.query(
      `INSERT INTO freezes (code, user_id, shop_id, status, total, expires_at)
       VALUES ($1, $2, $3, 'active', $4, now() + make_interval(mins => $5))
       RETURNING id, code, status, total, expires_at, created_at`,
      [makeCode(), user.id, shopId, total.toFixed(2), config.freeze.minutes]
    );
    const lines = products.map((p) => ({ productId: p.id, name: p.name, unit: p.unit, price: p.price, qty: wanted.get(p.id) }));
    for (const l of lines) {
      await c.query(
        `INSERT INTO freeze_items (freeze_id, product_id, name, unit, price, qty) VALUES ($1, $2, $3, $4, $5, $6)`,
        [freeze.id, l.productId, l.name, l.unit, l.price, l.qty]
      );
    }
    return { freeze: { ...freeze, shop_id: shop.id, shop_name: shop.name, items: lines }, shop, customer: u };
  });

  const { freeze, shop, customer } = result;
  await publish(
    TOPICS.freeze,
    'freeze.created',
    {
      freezeId: freeze.id,
      code: freeze.code,
      userId: user.id,
      customerName: customer.name,
      shopId: shop.id,
      shopName: shop.name,
      shopOwnerId: shop.owner_id,
      total: freeze.total,
      expiresAt: freeze.expires_at,
      items: freeze.items,
    },
    shop.id
  );
  await publish(TOPICS.inventory, 'inventory.changed', { reason: 'freeze.created', productIds: ids }, shop.id);
  return freeze;
}

/**
 * Close an active freeze. 'collected' keeps the stock taken (it was sold);
 * 'cancelled' and 'expired' put it back on the shelf.
 */
async function closeFreeze(c, freezeId, status) {
  const { rows: [f] } = await c.query(
    `UPDATE freezes SET status = $2, closed_at = now()
     WHERE id = $1 AND status = 'active' RETURNING id, code, user_id, shop_id, total`,
    [freezeId, status]
  );
  if (!f) return null;
  const { rows: items } = await c.query(`SELECT product_id, name, qty FROM freeze_items WHERE freeze_id = $1`, [freezeId]);
  if (status !== 'collected') {
    for (const it of items) {
      await c.query(`UPDATE products SET stock = stock + $1, updated_at = now() WHERE id = $2`, [it.qty, it.product_id]);
    }
  }
  const { rows: [shop] } = await c.query(`SELECT name, owner_id FROM shops WHERE id = $1`, [f.shop_id]);
  return { ...f, items, shop };
}

async function announce(closed, status) {
  await publish(
    TOPICS.freeze,
    `freeze.${status}`,
    {
      freezeId: closed.id,
      code: closed.code,
      userId: closed.user_id,
      shopId: closed.shop_id,
      shopName: closed.shop.name,
      shopOwnerId: closed.shop.owner_id,
      total: closed.total,
      items: closed.items.map((i) => ({ productId: i.product_id, name: i.name, qty: i.qty })),
    },
    closed.shop_id
  );
  if (status !== 'collected') {
    await publish(
      TOPICS.inventory,
      'inventory.changed',
      { reason: `freeze.${status}`, productIds: closed.items.map((i) => i.product_id) },
      closed.shop_id
    );
  }
}

export async function cancelFreeze(userId, freezeId) {
  const closed = await tx(async (c) => {
    const { rows: [f] } = await c.query(`SELECT id FROM freezes WHERE id = $1 AND user_id = $2 FOR UPDATE`, [freezeId, userId]);
    if (!f) throw new HttpError(404, 'Freeze not found');
    const done = await closeFreeze(c, freezeId, 'cancelled');
    if (!done) throw new HttpError(409, 'This freeze is no longer active');
    return done;
  });
  await announce(closed, 'cancelled');
}

/** Shopkeeper confirms the customer paid at the counter. Accepts the id or the pickup code. */
export async function collectFreeze(shopId, { id, code }) {
  const closed = await tx(async (c) => {
    const { rows: [f] } = await c.query(
      `SELECT id, status, expires_at FROM freezes
       WHERE shop_id = $1 AND (id = $2 OR upper(code) = upper($3)) FOR UPDATE`,
      [shopId, id ?? -1, code ?? '']
    );
    if (!f) throw new HttpError(404, 'No freeze with that code at your shop');
    if (f.status !== 'active') throw new HttpError(409, `This freeze is already ${f.status}`);
    return closeFreeze(c, f.id, 'collected');
  });
  await announce(closed, 'collected');
  return closed;
}

/** Release freezes whose time ran out. Runs on a timer; SKIP LOCKED makes it safe with several servers. */
export async function expireDueFreezes() {
  const expired = await tx(async (c) => {
    const { rows } = await c.query(
      `SELECT id FROM freezes WHERE status = 'active' AND expires_at <= now()
       ORDER BY expires_at LIMIT 50 FOR UPDATE SKIP LOCKED`
    );
    const out = [];
    for (const r of rows) {
      const done = await closeFreeze(c, r.id, 'expired');
      if (done) out.push(done);
    }
    return out;
  });
  for (const e of expired) await announce(e, 'expired');
  return expired.length;
}

export async function freezesForUser(userId) {
  const { rows } = await query(
    `SELECT f.id, f.code, f.status, f.total, f.expires_at, f.created_at, f.closed_at,
            s.id AS shop_id, s.name AS shop_name, s.address AS shop_address,
            json_agg(json_build_object('productId', i.product_id, 'name', i.name, 'unit', i.unit, 'price', i.price, 'qty', i.qty)
                     ORDER BY i.name) AS items
     FROM freezes f JOIN shops s ON s.id = f.shop_id JOIN freeze_items i ON i.freeze_id = f.id
     WHERE f.user_id = $1
     GROUP BY f.id, s.id
     ORDER BY (f.status = 'active') DESC, f.created_at DESC
     LIMIT 30`,
    [userId]
  );
  return rows;
}

export async function freezesForShop(shopId) {
  const { rows } = await query(
    `SELECT f.id, f.code, f.status, f.total, f.expires_at, f.created_at, f.closed_at,
            u.name AS customer_name, u.phone AS customer_phone,
            json_agg(json_build_object('productId', i.product_id, 'name', i.name, 'unit', i.unit, 'price', i.price, 'qty', i.qty)
                     ORDER BY i.name) AS items
     FROM freezes f JOIN users u ON u.id = f.user_id JOIN freeze_items i ON i.freeze_id = f.id
     WHERE f.shop_id = $1
     GROUP BY f.id, u.id
     ORDER BY (f.status = 'active') DESC, f.created_at DESC
     LIMIT 50`,
    [shopId]
  );
  return rows;
}
