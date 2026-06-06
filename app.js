const cfg = window.ROCKSTOK_CONFIG || {};
const $ = (selector) => document.querySelector(selector);
const GIG_STORE_KEY = 'rockstokAdminGigs';

function readStoredGigs() {
  try {
    const stored = JSON.parse(localStorage.getItem(GIG_STORE_KEY) || 'null');
    return Array.isArray(stored) ? stored : null;
  } catch {
    return null;
  }
}

function getSiteGigs() {
  return readStoredGigs() || cfg.gigs || [];
}

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

function isGigVisible(gig) {
  if (!gig?.date) return false;
  const expiry = new Date(`${gig.date}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return false;
  expiry.setDate(expiry.getDate() + 1);
  return expiry >= new Date();
}

function renderGigs() {
  const list = $('#gigList');
  if (!list) return;
  const gigs = [...getSiteGigs()]
    .filter(gig => gig && gig.date)
    .filter(isGigVisible)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!gigs.length) {
    // Keep this visitor-facing; maintenance notes belong in README.md.
    list.innerHTML = `
      <article class="empty-card glass-panel">
        <span class="pill">Coming soon</span>
        <h3>Fresh dates coming soon</h3>
        <p>Rockstok is lining up the next run of shows. For private events, venues and party bookings, get in touch below.</p>
        <a class="button ghost" href="booking.html">Enquire about bookings</a>
      </article>`;
    const nextGigTitle = $('#nextGigTitle');
    const nextGigDetails = $('#nextGigDetails');
    if (nextGigTitle) nextGigTitle.textContent = 'Bookings open now';
    if (nextGigDetails) nextGigDetails.textContent = 'Want Rockstok at your venue or event? Send an enquiry and we will get back to you.';
    return;
  }

  list.innerHTML = gigs.map(gig => {
    const d = formatDate(gig.date);
    const href = gig.ticketUrl || 'booking.html';
    const buttonText = gig.ticketUrl ? 'Details / Tickets' : 'Enquire';
    return `
      <article class="gig-card glass-panel">
        <div class="gig-date"><span>${d ? d.month : 'TBC'}</span><strong>${d ? d.day : '--'}</strong></div>
        <div>
          <h3>${gig.title}</h3>
          <p class="gig-meta">${d ? d.full : 'Date TBC'} - ${gig.time || 'Time TBC'} - ${gig.venue || 'Venue TBC'}${gig.location ? ` - ${gig.location}` : ''}</p>
        </div>
        <a class="button ghost" href="${href}" ${gig.ticketUrl ? 'target="_blank" rel="noopener"' : ''}>${buttonText}</a>
      </article>`;
  }).join('');

  const next = gigs.find(gig => new Date(`${gig.date}T23:59:59`) >= new Date()) || gigs[0];
  const d = formatDate(next.date);
  const nextGigTitle = $('#nextGigTitle');
  const nextGigDetails = $('#nextGigDetails');
  if (nextGigTitle) nextGigTitle.textContent = next.venue || next.title;
  if (nextGigDetails) nextGigDetails.textContent = `${d ? d.full : 'Date TBC'} - ${next.time || 'Time TBC'}${next.location ? ` - ${next.location}` : ''}`;
}

function renderSongTags() {
  if (!$('#songTags')) return;
  const tags = cfg.songTags || [];
  $('#songTags').innerHTML = tags.map(tag => `<span>${tag}</span>`).join('');
}

function renderBand() {
  if (!$('#bandGrid')) return;
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
  if (!notice || !grid || !shopButton) return;
  const base = cleanBaseUrl();

  if (base) {
    shopButton.href = `${base}/collections/${cfg.FOURTHWALL_COLLECTION_HANDLE || 'all'}`;
  } else {
    shopButton.style.display = 'none';
  }

  if (!cfg.FOURTHWALL_STOREFRONT_TOKEN) {
    notice.textContent = 'Merch is coming soon. Ask the band about shirts, hoodies and extras.';
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
        ${getProductImage(product) ? `<img src="${getProductImage(product)}" alt="${product.name || product.title || 'Rockstok merch'}">` : `<div class="placeholder-product"><img src="assets/logo.png" alt="Rockstok logo" /></div>`}
        <div class="product-info">
          <h3>${product.name || product.title || 'Rockstok Merch'}</h3>
          <span class="price">${getProductPrice(product)}</span>
          <a class="button primary" href="${productUrl(product)}" target="_blank" rel="noopener">View / Buy</a>
        </div>
      </article>`).join('');
  } catch (err) {
    console.warn(err);
    // Keep this visitor-facing; setup/debug details belong in README.md.
    notice.textContent = 'Merch is warming up. Use the full shop link or ask the band what is available.';
    renderFallbackProducts();
  }
}

function renderFallbackProducts() {
  const fallback = [
    { title: 'Rockstok Tee', price: 'Coming soon', note: 'Classic tee for loud nights and late choruses.' },
    { title: 'Logo Hoodie', price: 'Coming soon', note: 'Warm gear with the Rockstok mark up front.' },
    { title: 'Sticker Pack', price: 'Coming soon', note: 'Small, loud, and ready for guitar cases.' }
  ];

  $('#productGrid').innerHTML = fallback.map(item => `
    <article class="product-card glass-panel">
      <div class="placeholder-product">
        <img src="assets/logo.png" alt="Rockstok logo" />
      </div>
      <div class="product-info">
        <h3>${item.title}</h3>
        <span class="price">${item.price}</span>
        <p>${item.note}</p>
        <a class="button ghost" href="booking.html">Ask about merch</a>
      </div>
    </article>`).join('');
}

function setupBookingForm() {
  document.querySelectorAll('.booking-form').forEach((formEl) => {
    formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const subject = encodeURIComponent('Rockstok booking enquiry');
      const body = encodeURIComponent(
        `Name: ${form.get('name')}\n` +
        `Event date: ${form.get('date') || 'TBC'}\n` +
        `Venue / Suburb / City: ${form.get('venue') || 'TBC'}\n` +
        `Phone / Email: ${form.get('contact') || 'TBC'}\n` +
        `Event type: ${form.get('eventType') || 'TBC'}\n\n` +
        `Extra notes:\n${form.get('notes') || 'None provided'}`
      );
      window.location.href = `mailto:${cfg.bookingEmail}?subject=${subject}&body=${body}`;
    });
  });
}

function setupNav() {
  const toggle = $('.nav-toggle');
  const links = $('#nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

function setupReadMore() {
  document.querySelectorAll('[data-collapsible-copy]').forEach((block) => {
    const button = block.querySelector('.read-more-toggle');
    if (!button) return;

    button.addEventListener('click', () => {
      const expanded = block.classList.toggle('expanded');
      button.setAttribute('aria-expanded', String(expanded));
      button.textContent = expanded ? 'Show less' : 'Read more...';
    });
  });
}

renderGigs();
renderSongTags();
renderBand();
loadFourthwallProducts();
setupBookingForm();
setupNav();
setupReadMore();
