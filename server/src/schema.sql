-- DailyCart schema. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('customer', 'shopkeeper')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shops (
  id         SERIAL PRIMARY KEY,
  owner_id   INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL,
  city       TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  opens_at   TEXT NOT NULL DEFAULT '07:00',
  closes_at  TEXT NOT NULL DEFAULT '22:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id         SERIAL PRIMARY KEY,
  shop_id    INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  brand      TEXT,
  category   TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT '1 pc',
  price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  stock      INT NOT NULL CHECK (stock >= 0),   -- units still free to freeze
  expires_on DATE,
  active     BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_shop_idx ON products(shop_id);

-- A "freeze" is the order: stock is held for a short time, paid for in the shop.
CREATE TABLE IF NOT EXISTS freezes (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,              -- pickup code shown at the counter
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id    INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('active', 'collected', 'expired', 'cancelled')),
  total      NUMERIC(10, 2) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS freezes_active_idx ON freezes(status, expires_at);
CREATE INDEX IF NOT EXISTS freezes_user_idx ON freezes(user_id);

CREATE TABLE IF NOT EXISTS freeze_items (
  freeze_id  INT NOT NULL REFERENCES freezes(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  unit       TEXT NOT NULL,
  price      NUMERIC(10, 2) NOT NULL,
  qty        INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (freeze_id, product_id)
);

-- Written by Kafka consumers: messages for customers and shopkeepers.
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);

-- Product photos uploaded by shopkeepers (shrunk to ~100 KB in the browser first).
CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  shop_id    INT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  mime       TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
  data       BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_id INT REFERENCES product_images(id) ON DELETE SET NULL;

-- Every event a Kafka consumer handled, as proof for the demo.
CREATE TABLE IF NOT EXISTS event_log (
  id           SERIAL PRIMARY KEY,
  topic        TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  consumer     TEXT NOT NULL,
  payload      JSONB NOT NULL,
  result       TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
