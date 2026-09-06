const ACTOR = process.env.APIFY_ACTOR_ID || 'benthepythondev~bestbuy-scraper';
const API_BASE = 'https://api.apify.com/v2';

function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function number(...values) {
  for (const value of values) {
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}
function first(source, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], source);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}
function normalize(raw) {
  const price = number(first(raw, ['price', 'currentPrice', 'salePrice', 'offers.price', 'finalPrice']));
  const regularPrice = number(first(raw, ['regularPrice', 'originalPrice', 'listPrice', 'wasPrice'])) ?? price;
  const condition = text(first(raw, ['condition', 'conditionLabel', 'openBoxCondition', 'buyingOption'])) || 'Listing';
  const discountPercent = price && regularPrice > price ? Math.round((1 - price / regularPrice) * 100) : 0;
  return {
    title: text(first(raw, ['title', 'name', 'productName'])),
    sku: String(first(raw, ['sku', 'skuId', 'id']) || ''),
    url: text(first(raw, ['url', 'productUrl', 'link'])),
    image: text(first(raw, ['image', 'imageUrl', 'thumbnail', 'primaryImage.url', 'images.0'])),
    price, regularPrice, discountPercent, condition,
    availability: text(first(raw, ['availability', 'availabilityText', 'stockStatus', 'fulfillment.availability']))
  };
}
function isOpenBox(item) {
  return /open.?box|excellent|fair|satisfactory|good|refurb|pre.?owned|clearance/i.test(`${item.condition} ${item.title} ${item.availability}`);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'GET') return res.status(200).json({ ok: true, configured: Boolean(process.env.APIFY_TOKEN), actor: ACTOR });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.APIFY_TOKEN) return res.status(503).json({ error: 'Live search needs APIFY_TOKEN configured in Vercel.' });

  const query = text(req.body?.query).slice(0, 500);
  const zip = text(req.body?.zip).replace(/\D/g, '').slice(0, 5);
  const limit = Math.min(48, Math.max(1, Number(req.body?.limit) || 24));
  const minimumDiscount = Math.min(90, Math.max(0, Number(req.body?.minimumDiscount) || 0));
  if (!query) return res.status(400).json({ error: 'Enter a product, SKU, or Best Buy URL.' });
  if (zip.length !== 5) return res.status(400).json({ error: 'Enter a valid five-digit ZIP code.' });

  const isUrl = /^https:\/\/([\w-]+\.)?bestbuy\.com\//i.test(query);
  const actorInput = isUrl
    ? { mode: 'urls', urls: [query], maxProducts: limit }
    : { mode: 'search', searchQuery: query, maxProducts: limit };
  const endpoint = `${API_BASE}/acts/${encodeURIComponent(ACTOR)}/run-sync-get-dataset-items?timeout=120&clean=true`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
      body: JSON.stringify(actorInput),
      signal: AbortSignal.timeout(125000)
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message || `Apify returned ${response.status}`);
    const rows = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
    let items = rows.map(normalize).filter((item) => item.title && item.price !== null);
    if (req.body?.openBoxOnly) items = items.filter(isOpenBox);
    items = items.filter((item) => item.discountPercent >= minimumDiscount).slice(0, limit);
    const message = items.length ? `Public Best Buy listings matching your filters. Confirm Store 599 pickup on the linked product page.` : 'No public listings matched every filter. Try lowering the discount or turning off “Open-box only.”';
    return res.status(200).json({ items, message, zip, actor: ACTOR });
  } catch (error) {
    return res.status(502).json({ error: `Inventory provider error: ${error.message}` });
  }
}
