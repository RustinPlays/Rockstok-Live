const cfg = window.ROCKSTOK_CONFIG || {};
const $ = (selector) => document.querySelector(selector);

function cleanBaseUrl() {
  if (cfg.FOURTHWALL_SHOP_BASE_URL) {
    return cfg.FOURTHWALL_SHOP_BASE_URL.replace(/\/$/, '');
  }

  const domain = String(cfg.FOURTHWALL_SHOP_DOMAIN || '').trim();
  if (!domain) return '';

  try {
    const parsed = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.toLocaleDateString('en-NZ', { day: '2-digit' }),
    month: date.toLocaleDateString('en-NZ', { month: 'short' }).toUpperCase(),
    full: date.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  };
}

function renderGigs() {
  const list = $('#gigList');
  const gigs = [...(cfg.gigs || [])]
    .filter(gig => gig && gig.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!gigs.length) {
    list.innerHTML = `
      <article class="empty-card glass-panel">
        <span class="pill">Coming soon</span>
        <h3>No public gigs listed yet</h3>
        <p>Add confirmed dates in <code>config.js</code>. Until then, this section works as a clean placeholder so venues and fans know gigs are coming.</p>
        <a class="button ghost" href="#bookings">Enquire about bookings</a>
      </article>`;
    $('#nextGigTitle').textContent = 'Bookings open now';
    $('#nextGigDetails').textContent = 'Public gig dates can be added in config.js when confirmed.';
    return;
  }

  list.innerHTML = gigs.map(gig => {
    const d = formatDate(gig.date);
    const href = gig.ticketUrl || '#bookings';
    const buttonText = gig.ticketUrl ? 'Details / Tickets' : 'Enquire';
    return `
      <article class="gig-card glass-panel">
        <div class="gig-date"><span>${d ? d.month : 'TBC'}</span><strong>${d ? d.day : '--'}</strong></div>
        <div>
          <h3>${gig.title}</h3>
          <p class="gig-meta">${d ? d.full : 'Date TBC'} · ${gig.time || 'Time TBC'} · ${gig.venue || 'Venue TBC'}${gig.location ? ` · ${gig.location}` : ''}</p>
        </div>
        <a class="button ghost" href="${href}" ${gig.ticketUrl ? 'target="_blank" rel="noopener"' : ''}>${buttonText}</a>
      </article>`;
  }).join('');

  const next = gigs.find(gig => new Date(`${gig.date}T23:59:59`) >= new Date()) || gigs[0];
  const d = formatDate(next.date);
  $('#nextGigTitle').textContent = next.venue || next.title;
  $('#nextGigDetails').textContent = `${d ? d.full : 'Date TBC'} · ${next.time || 'Time TBC'}${next.location ? ` · ${next.location}` : ''}`;
}

function renderSongTags() {
  const tags = cfg.songTags || [];
  $('#songTags').innerHTML = tags.map(tag => `<span>${tag}</span>`).join('');
}

function renderBand() {
  $('#bandGrid').innerHTML = (cfg.band || []).map(member => `
    <article class="band-card glass-panel">
      <div class="band-image-wrap">
        <img class="band-image" src="${member.image}" alt="${member.name}" />
      </div>
      <div class="band-content">
        <h3>${member.name}</h3>
        <p class="price">${member.role}</p>
        <p>${member.bio}</p>
      </div>
    </article>`).join('');
}

function getProductImage(product) {
  return product?.thumbnail?.url || product?.image?.url || product?.images?.[0]?.url || product?.variants?.[0]?.image?.url || '';
}

function getProductPrice(product) {
  const price = product?.price || product?.variants?.[0]?.price || product?.minPrice;
  if (!price) return 'View product';
  if (typeof price === 'string') return price;

  const amount = price.value ?? price.amount ?? (price.cents ? price.cents / 100 : undefined);
  const currency = price.currency || cfg.DEFAULT_CURRENCY || 'NZD';
  if (amount === undefined || amount === null) return 'View product';

  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount);
}

function productUrl(product) {
  const base = cleanBaseUrl();
  if (product?.url) return product.url;
  if (base && product?.slug) return `${base}/products/${product.slug}`;
  return base ? `${base}/collections/${cfg.FOURTHWALL_COLLECTION_HANDLE || 'all'}` : '#';
}

async function loadFourthwallProducts() {
  const notice = $('#merchNotice');
  const grid = $('#productGrid');
  const shopButton = $('#viewFourthwallShop');
  const base = cleanBaseUrl();

  if (base) {
    shopButton.href = `${base}/collections/${cfg.FOURTHWALL_COLLECTION_HANDLE || 'all'}`;
  } else {
    shopButton.style.display = 'none';
  }

  if (!cfg.FOURTHWALL_STOREFRONT_TOKEN) {
    notice.textContent = 'Fourthwall token not added yet. Showing placeholder merch cards.';
    renderFallbackProducts();
    return;
  }

  try {
    const handle = encodeURIComponent(cfg.FOURTHWALL_COLLECTION_HANDLE || 'all');
    const token = encodeURIComponent(cfg.FOURTHWALL_STOREFRONT_TOKEN);
    const endpoint = `https://storefront-api.fourthwall.com/v1/collections/${handle}/products?storefront_token=${token}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Fourthwall returned ${res.status}`);
    const data = await res.json();
    const products = data.products || data.results || data.items || data || [];

    if (!Array.isArray(products) || !products.length) {
      throw new Error('No products returned');
    }

    notice.textContent = '';
    grid.innerHTML = products.slice(0, 8).map(product => `
      <article class="product-card glass-panel">
        ${getProductImage(product) ? `<img src="${getProductImage(product)}" alt="${product.name || product.title || 'Rockstok merch'}">` : `<div class="placeholder-product"><img src="assets/rockstok-logo.jpg" alt="Rockstok logo" /></div>`}
        <div class="product-info">
          <h3>${product.name || product.title || 'Rockstok Merch'}</h3>
          <span class="price">${getProductPrice(product)}</span>
          <a class="button primary" href="${productUrl(product)}" target="_blank" rel="noopener">View / Buy</a>
        </div>
      </article>`).join('');
  } catch (err) {
    console.warn(err);
    notice.textContent = 'Could not load Fourthwall merch yet. Check the Storefront token, collection handle and shop URL.';
    renderFallbackProducts();
  }
}

function renderFallbackProducts() {
  const fallback = [
    { title: 'Rockstok Tee', price: 'Coming soon', note: 'Classic band tee placeholder' },
    { title: 'Logo Hoodie', price: 'Coming soon', note: 'Fourthwall merch will replace this card' },
    { title: 'Sticker Pack', price: 'Coming soon', note: 'Small merch item or bundle slot' }
  ];

  $('#productGrid').innerHTML = fallback.map(item => `
    <article class="product-card glass-panel">
      <div class="placeholder-product">
        <img src="assets/rockstok-logo.jpg" alt="Rockstok logo" />
      </div>
      <div class="product-info">
        <h3>${item.title}</h3>
        <span class="price">${item.price}</span>
        <p>${item.note}</p>
        <a class="button ghost" href="#bookings">Ask about merch</a>
      </div>
    </article>`).join('');
}

function setupBookingForm() {
  $('#bookingForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = encodeURIComponent('Rockstok Covers booking enquiry');
    const body = encodeURIComponent(
      `Name: ${form.get('name')}\n` +
      `Event date: ${form.get('date') || 'TBC'}\n` +
      `Venue / Location: ${form.get('venue') || 'TBC'}\n` +
      `Event type: ${form.get('eventType') || 'TBC'}\n\n` +
      `${form.get('message')}`
    );
    window.location.href = `mailto:${cfg.bookingEmail}?subject=${subject}&body=${body}`;
  });
}

function setupNav() {
  const toggle = $('.nav-toggle');
  const links = $('#nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

renderGigs();
renderSongTags();
renderBand();
loadFourthwallProducts();
setupBookingForm();
setupNav();
