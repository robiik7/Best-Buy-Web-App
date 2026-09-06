const $ = (id) => document.getElementById(id);
const form = $('searchForm');
const template = $('cardTemplate');

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : 'Price unavailable';
}

function showNotice(message, error = false) {
  const el = $('notice');
  el.hidden = !message;
  el.textContent = message || '';
  el.classList.toggle('error', error);
}

function render(items) {
  $('results').replaceChildren();
  $('empty').hidden = items.length > 0;
  let best = 0;
  items.forEach((item) => {
    const card = template.content.cloneNode(true);
    const saving = Math.max(0, Number(item.regularPrice || 0) - Number(item.price || 0));
    best = Math.max(best, saving);
    const image = card.querySelector('.product-image');
    image.src = item.image || '';
    image.alt = item.title || 'Best Buy product';
    image.onerror = () => image.closest('.image-wrap').remove();
    card.querySelector('.condition').textContent = item.condition || 'Listing';
    card.querySelector('.sku').textContent = item.sku ? `SKU ${item.sku}` : '';
    card.querySelector('.product-title').textContent = item.title || 'Untitled product';
    card.querySelector('.sale-price').textContent = money(item.price);
    card.querySelector('.regular-price').textContent = item.regularPrice > item.price ? money(item.regularPrice) : '';
    card.querySelector('.saving').textContent = saving ? `Save ${money(saving)}${item.discountPercent ? ` · ${item.discountPercent}% off` : ''}` : '';
    card.querySelector('.availability').textContent = item.availability || `Check availability near ${$('zip').value}`;
    const link = card.querySelector('.product-link');
    link.href = item.url || 'https://www.bestbuy.com/';
    $('results').append(card);
  });
  $('resultCount').textContent = items.length;
  $('bestSavings').textContent = best ? money(best) : '—';
  $('updatedAt').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

async function checkHealth() {
  try {
    const response = await fetch('/api/search');
    const data = await response.json();
    $('apiState').textContent = data.configured ? 'Live service ready' : 'Needs APIFY_TOKEN';
    $('apiState').classList.toggle('live', data.configured);
  } catch { $('apiState').textContent = 'Service unavailable'; }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('searchButton');
  button.disabled = true;
  button.textContent = 'Searching…';
  showNotice('');
  try {
    const payload = {
      query: $('query').value.trim(), zip: $('zip').value.trim(),
      limit: Number($('limit').value), minimumDiscount: Number($('discount').value),
      openBoxOnly: $('openBoxOnly').checked
    };
    const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Search failed');
    render(data.items || []);
    if (data.message) showNotice(data.message);
  } catch (error) {
    render([]);
    showNotice(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Search inventory';
  }
});

checkHealth();
