import { Client } from '@opensearch-project/opensearch';
import { config } from './config.js';
import { query } from './db.js';

export const os = new Client({
  node: config.opensearch.url,
  ssl: { rejectUnauthorized: !/localhost|127\.0\.0\.1/.test(config.opensearch.url) },
});

const INDEX = config.opensearch.index;

const MAPPINGS = {
  properties: {
    product_id: { type: 'integer' },
    name: {
      type: 'text',
      analyzer: 'standard',
      fields: { keyword: { type: 'keyword' } },
    },
    brand: { type: 'text' },
    category: { type: 'keyword' },
    unit: { type: 'keyword', index: false },
    price: { type: 'float' },
    stock: { type: 'integer' },
    expires_on: { type: 'date' },
    active: { type: 'boolean' },
    shop_id: { type: 'integer' },
    shop_name: { type: 'text' },
    city: { type: 'keyword' },
    location: { type: 'geo_point' },
    updated_at: { type: 'date' },
    image_id: { type: 'integer', index: false },
  },
};

export async function ensureIndex() {
  const exists = await os.indices.exists({ index: INDEX });
  if (!exists.body) {
    await os.indices.create({ index: INDEX, body: { mappings: MAPPINGS } });
    console.log(`[opensearch] created index ${INDEX}`);
  } else {
    // Add any fields introduced since the index was created (adding fields is allowed in place).
    await os.indices.putMapping({ index: INDEX, body: { properties: { image_id: MAPPINGS.properties.image_id } } })
      .catch((e) => console.warn('[opensearch] mapping update skipped:', e.message));
  }
}

const PRODUCT_SQL = `
  SELECT p.id, p.name, p.brand, p.category, p.unit, p.price, p.stock, p.expires_on,
         p.active, p.updated_at, p.image_id, s.id AS shop_id, s.name AS shop_name, s.city, s.lat, s.lng
  FROM products p JOIN shops s ON s.id = p.shop_id`;

function toDoc(r) {
  return {
    product_id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    unit: r.unit,
    price: r.price,
    stock: r.stock,
    expires_on: r.expires_on,
    active: r.active,
    shop_id: r.shop_id,
    shop_name: r.shop_name,
    city: r.city,
    location: { lat: r.lat, lon: r.lng },
    updated_at: r.updated_at,
    image_id: r.image_id,
  };
}

/** Re-read a product from Postgres and write it to the index (or delete it). */
export async function syncProduct(productId) {
  const { rows } = await query(`${PRODUCT_SQL} WHERE p.id = $1`, [productId]);
  if (!rows.length) {
    await os.delete({ index: INDEX, id: String(productId) }).catch((e) => {
      if (e.meta?.statusCode !== 404) throw e;
    });
    return 'deleted';
  }
  await os.index({ index: INDEX, id: String(productId), body: toDoc(rows[0]) });
  return `stock=${rows[0].stock}`;
}

export async function reindexAll() {
  const { rows } = await query(PRODUCT_SQL);
  if (!rows.length) return 0;
  const body = rows.flatMap((r) => [{ index: { _index: INDEX, _id: String(r.id) } }, toDoc(r)]);
  const res = await os.bulk({ body, refresh: true });
  if (res.body.errors) throw new Error('Bulk index had errors');
  return rows.length;
}

/**
 * Search products near a point.
 * Typo tolerant (fuzziness AUTO + prefix match), filtered by walking radius,
 * category and price, sorted by relevance or nearest expiry.
 */
export async function searchProducts({ q, category, minPrice, maxPrice, lat, lng, radius, sort, size = 40 }) {
  const filter = [{ term: { active: true } }];
  if (category) filter.push({ term: { category } });
  if (minPrice != null || maxPrice != null) {
    filter.push({ range: { price: { gte: minPrice ?? undefined, lte: maxPrice ?? undefined } } });
  }
  if (lat != null && lng != null) {
    filter.push({ geo_distance: { distance: `${radius}m`, location: { lat, lon: lng } } });
  }

  const must = q
    ? [
        {
          bool: {
            should: [
              {
                multi_match: {
                  query: q,
                  fields: ['name^3', 'brand^2', 'shop_name', 'category'],
                  fuzziness: 'AUTO',
                  prefix_length: 1,
                },
              },
              { match_phrase_prefix: { name: { query: q, boost: 2 } } },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [{ match_all: {} }];

  const geoSort =
    lat != null && lng != null
      ? [{ _geo_distance: { location: { lat, lon: lng }, order: 'asc', unit: 'm' } }]
      : [];

  let sortSpec;
  if (sort === 'expiry') sortSpec = [{ expires_on: { order: 'asc', missing: '_last' } }, ...geoSort];
  else if (sort === 'price') sortSpec = [{ price: 'asc' }, ...geoSort];
  else if (sort === 'distance') sortSpec = geoSort.length ? geoSort : ['_score'];
  else sortSpec = ['_score', ...geoSort];

  const res = await os.search({
    index: INDEX,
    body: {
      size,
      query: { bool: { must, filter } },
      sort: sortSpec,
      track_scores: true,
      aggs: { categories: { terms: { field: 'category', size: 20 } } },
    },
  });

  const geoIdx = sortSpec.findIndex((s) => typeof s === 'object' && s._geo_distance);
  const hits = res.body.hits.hits.map((h) => ({
    ...h._source,
    id: h._source.product_id,
    score: h._score,
    distance_m: geoIdx >= 0 ? Math.round(h.sort[geoIdx]) : null,
  }));

  return {
    total: res.body.hits.total.value,
    took_ms: res.body.took,
    categories: res.body.aggregations.categories.buckets.map((b) => ({ name: b.key, count: b.doc_count })),
    hits,
  };
}
