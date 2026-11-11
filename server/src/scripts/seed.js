// Demo data: 6 shops around Koramangala, Bengaluru (5 within walking range, 1 outside).
// Demo accounts (local test data only), password for all: demo1234
//   customer:     priya@demo.in
//   shopkeepers:  ravi@demo.in, anita@demo.in, suresh@demo.in, fatima@demo.in, john@demo.in, far@demo.in
import bcrypt from 'bcryptjs';
import { pool, tx } from '../db.js';
import { applySchema } from './schema.js';
import { os, ensureIndex, reindexAll } from '../search.js';
import { config } from '../config.js';

// This script DELETES every table's data. Only allow it on a local database,
// or when someone explicitly passes --wipe-everything.
const local = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(config.pg.connectionString);
if (!local && !process.argv.includes('--wipe-everything')) {
  console.error('Refusing to seed: DATABASE_URL is not a local database.');
  console.error('Seeding deletes ALL shops, products, users and orders. It is for local development only.');
  console.error('If you really mean it: npm run seed -- --wipe-everything');
  process.exit(1);
}
if (config.isProduction) {
  console.error('Refusing to seed with NODE_ENV=production.');
  process.exit(1);
}

export const DEMO_CENTER = { lat: 12.9352, lng: 77.6245 };
const PASSWORD = 'demo1234';

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// dLat/dLng in degrees: 0.001 lat ≈ 111 m
const SHOPS = [
  {
    owner: ['Ravi Kumar', 'ravi@demo.in'], name: 'Sri Lakshmi Dairy & Bakery', address: '5th Block, 80 Feet Road', dLat: 0.0012, dLng: 0.0004,
    products: [
      ['Toned Milk', 'Nandini', 'Dairy', '500 ml', 27, 18, 1],
      ['Full Cream Milk', 'Nandini', 'Dairy', '1 L', 60, 8, 1],
      ['Curd', 'Nandini', 'Dairy', '500 g', 30, 10, 3],
      ['Paneer', 'Milky Mist', 'Dairy', '200 g', 95, 4, 4],
      ['Butter', 'Amul', 'Dairy', '100 g', 58, 6, 60],
      ['Fresh Bread', 'Modern', 'Bakery', '400 g', 45, 7, 2],
      ['Rusk', 'Britannia', 'Bakery', '200 g', 40, 12, 90],
      ['Veg Puff', 'House baked', 'Bakery', '1 pc', 20, 9, 0],
    ],
  },
  {
    owner: ['Anita Sharma', 'anita@demo.in'], name: 'Anita General Store', address: '6th Block, near Sony Signal', dLat: -0.0021, dLng: 0.0012,
    products: [
      ['Amul Taaza Milk', 'Amul', 'Dairy', '500 ml', 28, 2, 1],
      ['Greek Yogurt', 'Epigamia', 'Dairy', '90 g', 50, 5, 9],
      ['Masala Chips', 'Lays', 'Snacks', '52 g', 20, 25, 120],
      ['Bhujia', 'Haldiram', 'Snacks', '200 g', 55, 10, 150],
      ['Bourbon Biscuits', 'Britannia', 'Snacks', '150 g', 30, 14, 180],
      ['Bananas', 'Local', 'Fruits & Veg', '6 pc', 48, 6, 3],
      ['Tomatoes', 'Local', 'Fruits & Veg', '1 kg', 40, 5, 4],
      ['Coconut Water', 'Paper Boat', 'Beverages', '200 ml', 45, 8, 30],
    ],
  },
  {
    owner: ['Suresh Reddy', 'suresh@demo.in'], name: 'Fresh Fold Fruits & Veg', address: '4th Block, Jyoti Nivas Road', dLat: 0.0008, dLng: -0.0032,
    products: [
      ['Spinach Bunch', 'Farm fresh', 'Fruits & Veg', '1 bunch', 25, 12, 1],
      ['Coriander', 'Farm fresh', 'Fruits & Veg', '1 bunch', 10, 20, 1],
      ['Alphonso Mango', 'Ratnagiri', 'Fruits & Veg', '1 kg', 320, 3, 4],
      ['Apples', 'Shimla', 'Fruits & Veg', '1 kg', 180, 6, 10],
      ['Sweet Corn', 'Farm fresh', 'Fruits & Veg', '2 pc', 40, 10, 2],
      ['Tender Coconut', 'Local', 'Beverages', '1 pc', 50, 15, 5],
    ],
  },
  {
    owner: ['Fatima Begum', 'fatima@demo.in'], name: 'Bismillah Sweets & Snacks', address: '7th Block, 100 Feet Road', dLat: -0.0004, dLng: 0.0058,
    products: [
      ['Samosa', 'House made', 'Ready to eat', '2 pc', 30, 16, 0],
      ['Kachori', 'House made', 'Ready to eat', '2 pc', 35, 10, 0],
      ['Gulab Jamun', 'House made', 'Snacks', '250 g', 90, 6, 3],
      ['Mysore Pak', 'House made', 'Snacks', '250 g', 140, 4, 7],
      ['Masala Chaas', 'Amul', 'Beverages', '200 ml', 15, 20, 5],
      ['Lassi', 'House made', 'Beverages', '250 ml', 40, 8, 1],
    ],
  },
  {
    owner: ['John Mathew', 'john@demo.in'], name: 'Daily Needs Mini Mart', address: '8th Block, Ejipura Main Road', dLat: 0.0046, dLng: 0.0041,
    products: [
      ['Eggs', 'Farm fresh', 'Dairy', '6 pc', 48, 12, 10],
      ['Brown Bread', 'Harvest Gold', 'Bakery', '400 g', 55, 5, 3],
      ['Cheese Slices', 'Amul', 'Dairy', '200 g', 135, 3, 45],
      ['Instant Noodles', 'Maggi', 'Snacks', '70 g', 14, 40, 200],
      ['Cold Coffee', 'Starbucks', 'Beverages', '180 ml', 99, 6, 60],
      ['Idli Batter', 'iD', 'Ready to eat', '1 kg', 80, 4, 2],
    ],
  },
  {
    // ~1.7 km away: never shows up for the demo location (outside 750 m).
    owner: ['Far Away Stores', 'far@demo.in'], name: 'Indiranagar Organic Store', address: 'HAL 2nd Stage', dLat: 0.0155, dLng: 0.0030,
    products: [
      ['Organic Milk', 'Akshayakalpa', 'Dairy', '500 ml', 45, 10, 2],
      ['Sourdough Bread', 'Artisan', 'Bakery', '450 g', 160, 4, 2],
    ],
  },
];

const CUSTOMERS = [['Priya Nair', 'priya@demo.in', '9800000001']];

try {
  await applySchema();
  const hash = await bcrypt.hash(PASSWORD, 10);

  await tx(async (c) => {
    await c.query('TRUNCATE event_log, notifications, freeze_items, freezes, products, shops, users RESTART IDENTITY CASCADE');

    for (const [name, email, phone] of CUSTOMERS) {
      await c.query(`INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, 'customer')`, [name, email, phone, hash]);
    }
    for (const s of SHOPS) {
      const { rows: [u] } = await c.query(
        `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'shopkeeper') RETURNING id`,
        [s.owner[0], s.owner[1], hash]
      );
      const { rows: [shop] } = await c.query(
        `INSERT INTO shops (owner_id, name, address, city, lat, lng) VALUES ($1, $2, $3, 'Bengaluru', $4, $5) RETURNING id`,
        [u.id, s.name, s.address, DEMO_CENTER.lat + s.dLat, DEMO_CENTER.lng + s.dLng]
      );
      for (const [name, brand, category, unit, price, stock, expiresInDays] of s.products) {
        await c.query(
          `INSERT INTO products (shop_id, name, brand, category, unit, price, stock, expires_on) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [shop.id, name, brand, category, unit, price, stock, day(expiresInDays)]
        );
      }
    }
  });
  console.log(`Seeded ${SHOPS.length} shops, ${SHOPS.reduce((n, s) => n + s.products.length, 0)} products.`);

  await os.indices.delete({ index: config.opensearch.index }).catch(() => {});
  await ensureIndex();
  console.log(`Indexed ${await reindexAll()} products in OpenSearch.`);
  console.log(`Demo password for every account: ${PASSWORD}`);
} finally {
  await pool.end();
}
