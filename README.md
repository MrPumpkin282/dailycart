# DailyCart

**See what's on the shelf at the shops around you, freeze it for 30 minutes, walk over, and pay at the counter.**

Small neighbourhood stores sell milk, bread, curd and snacks that spoil within days, but nobody knows what's in stock until they walk in. DailyCart lets shopkeepers list today's fresh stock, and lets anyone within walking distance (500–750 m) reserve it. No delivery, no online payment, no wasted trip.

## How it uses Aiven

| Service | Job in DailyCart |
|---|---|
| **PostgreSQL** | Source of truth: shops, products, stock, customers and freezes (orders). Freezing locks product rows with `SELECT … FOR UPDATE`, so two people can't both get the last packet of milk. |
| **Apache Kafka** | Every freeze, pickup, cancellation, expiry and stock change is published as an event. Two consumers react: **search-indexer** keeps OpenSearch in sync, and **notifier** sends confirmations to customers and alerts to shopkeepers. |
| **OpenSearch** | Search that tolerates typos ("bred" finds bread, "paner" finds paneer), a `geo_distance` filter for the walking radius, category facets, and sorting by distance, price or expiry. |

```
Customer freezes items
  → Postgres transaction (lock rows, check stock, reduce stock, save freeze)
  → Kafka: dailycart.freeze-events      → notifier:       "Show code DC-XXXXX by 5:30 pm"
  → Kafka: dailycart.inventory-changed  → search-indexer: OpenSearch stock updated
Unclaimed after 30 min → expiry job returns stock → events → index and alerts updated
```

The shopkeeper dashboard has a **Live event stream** panel showing every Kafka event the consumers handled, for the demo.

## Pages

| Route | Who | What |
|---|---|---|
| `/login` | customer | Log in or sign up |
| `/shop/login` | shopkeeper | Log in or register a shop with its location |
| `/` | customer | Shops within 500/750 m, items expiring soon |
| `/search` | customer | Typo-tolerant search with filters (OpenSearch) |
| `/shops/:id` | customer | A shop's shelf |
| `/cart` | customer | Cart grouped by shop, freeze, pickup code with countdown, updates |
| `/shop/dashboard` | shopkeeper | Pickups and collect by code, shelf stock −/+, add or edit items, alerts, Kafka event stream |

## Freeze rules
- Hold time 30 min (`FREEZE_MINUTES`), at most 3 active freezes per customer, at most 5 of each item.
- Customers only see shops within 750 m of their location (500 m with the toggle). The server enforces this, not only the UI.
- Expired or cancelled freezes put the stock back automatically.

## Run it locally

Requires Node 20+ and Docker Desktop.

```bash
npm run install:all
npm run services:up     # Postgres (port 5433), Kafka (9092), OpenSearch (9200) in Docker
npm run seed            # demo shops and products, also builds the search index
npm run dev           # API on :4000, web app on http://localhost:5173
```

Production-style: `npm run build && npm start`, then open http://localhost:4000.

**Demo accounts** (password `demo1234`): customer `priya@demo.in`, shopkeeper `ravi@demo.in`. Click **Try the demo area** to browse around Koramangala, Bengaluru.

## Switch to Aiven

1. Create PostgreSQL, Kafka and OpenSearch services in one Aiven project.
2. `cp .env.example .env` and fill in each service URI from its **Overview** page.
3. Download the certificates into a `certs/` folder (it's git-ignored):
   - PostgreSQL CA certificate → `certs/pg-ca.pem`
   - Kafka CA certificate, access certificate and access key → `certs/kafka-ca.pem`, `certs/kafka.cert`, `certs/kafka.key`
4. `npm run seed`, then `npm start`. The topics and search index are created automatically.

Credentials only ever go in `.env` and `certs/`, and both are git-ignored.

## Tech
React 18, Vite, Tailwind CSS · Node.js, Express · `pg`, `kafkajs`, `@opensearch-project/opensearch`
