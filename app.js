const cfg = window.ROCKSTOK_CONFIG || {};
const $ = (selector) => document.querySelector(selector);

// Storefront and shop helpers keep Fourthwall settings normalized before links are built.
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

// Public gigs stay visible through the day after the event, matching the Firebase live loader.
function isGigVisible(gig) {
  if (!gig?.date) return false;
  const expiry = new Date(`${gig.date}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return false;
  expiry.setDate(expiry.getDate() + 1);
  return expiry >= new Date();
}

// Map links use a saved pin address first, then fall back to venue plus location.
function getMapAddress(gig) {
  return (gig.mapAddress || [gig.venue, gig.location].filter(Boolean).join(', ')).trim();
}

function getGoogleMapsUrl(address, placeId = '') {
  const params = new URLSearchParams({
    api: '1',
    query: address
  });

  if (placeId) {
    params.set('query_place_id', placeId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

// Renders static fallback gigs from config.js. Firebase live gigs replace this on pages that load gigs-live.js.
function renderGigs() {
  const list = $('#gigList');
  if (!list) return;
  const gigs = [...(cfg.gigs || [])]
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
    const mapAddress = getMapAddress(gig);
    const calendarLink = window.ROCKSTOK_CALENDAR?.getCalendarLink(gig);
    return `
      <article class="gig-card glass-panel">
        <div class="gig-date"><span>${d ? d.month : 'TBC'}</span><strong>${d ? d.day : '--'}</strong></div>
        <div>
          <h3>${gig.title}</h3>
          <p class="gig-meta">${d ? d.full : 'Date TBC'} - ${gig.time || 'Time TBC'} - ${gig.venue || 'Venue TBC'}${gig.location ? ` - ${gig.location}` : ''}</p>
          ${mapAddress ? `<a class="gig-map-link" href="${getGoogleMapsUrl(mapAddress, gig.mapPlaceId)}" target="_blank" rel="noopener"><span class="map-pin-icon" aria-hidden="true"></span><span>${mapAddress}</span></a>` : ''}
        </div>
        <div class="gig-actions">
          <a class="button ghost" href="${href}" ${gig.ticketUrl ? 'target="_blank" rel="noopener"' : ''}>${buttonText}</a>
          ${calendarLink ? `<a class="button ghost calendar-button" href="${calendarLink.href}" download="${calendarLink.filename}">Add to Calendar</a>` : ''}
        </div>
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

// Band data comes from config.js so names, roles, bios and photos can be updated in one place.
function renderBand() {
  if (!$('#bandGrid')) return;
  const members = cfg.band || [];

  if (!members.length) {
    $('#bandGrid').innerHTML = `
      <article class="empty-card glass-panel">
        <span class="pill">Coming soon</span>
        <h3>Band member profiles are coming soon.</h3>
        <p>In the meantime, follow Rockstok on social media or get in touch for bookings.</p>
      </article>`;
    return;
  }

  const performers = members.filter(member => member.type !== 'tech');
  const techMembers = members.filter(member => member.type === 'tech');

  const performerCards = performers.map(member => `
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

  const techCards = techMembers.length ? `
    <section class="tech-section">
      <div class="section-heading tech-heading">
        <div>
          <p class="eyebrow">Production</p>
          <h3>Sound and lighting support.</h3>
        </div>
        <p>The live show depends on the people making the room sound and look right.</p>
      </div>
      <div class="tech-grid">
        ${techMembers.map(member => `
          <article class="tech-card glass-panel">
            <div class="tech-image-wrap">
              <img class="tech-image" src="${member.image}" alt="${member.name}" />
            </div>
            <div class="band-content">
              <h3>${member.name}</h3>
              <p class="price">${member.role}</p>
              <p>${member.bio}</p>
            </div>
          </article>`).join('')}
      </div>
    </section>` : '';

  $('#bandGrid').innerHTML = performerCards + techCards;
}

// Fourthwall product shapes can vary slightly, so these helpers try the known image/price fields.
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
  return base || '#';
}

// Loads live merch from Fourthwall and falls back to simple placeholder cards if the API is unavailable.
async function loadFourthwallProducts() {
  const notice = $('#merchNotice');
  const grid = $('#productGrid');
  const shopButton = $('#viewFourthwallShop');
  if (!notice || !grid || !shopButton) return;
  const base = cleanBaseUrl();

  if (base) {
    shopButton.href = base;
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
    grid.innerHTML = products.slice(0, 6).map(product => `
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

// The same form handles bookings and general queries; hidden groups are disabled so Formspree only receives relevant fields.
function setupBookingForm() {
  document.querySelectorAll('form[data-query-booking-form]').forEach((formEl) => {
    const typeSelect = formEl.querySelector('[data-query-type]');
    const messageField = formEl.querySelector('[data-message-field]');
    const submitButton = formEl.querySelector('button[type="submit"]');
    const subjectField = formEl.querySelector('input[name="_subject"]');
    const sendingMessages = {
      booking: 'Sending your booking enquiry...',
      query: 'Sending your query...'
    };
    const successMessages = {
      booking: 'Thanks! Your booking enquiry has been sent. We will be in touch soon.',
      query: 'Thanks! Your query has been sent. We will be in touch soon.'
    };

    const updateFormType = () => {
      const selectedType = typeSelect?.value || 'booking';
      const isBooking = selectedType === 'booking';

      formEl.querySelectorAll('[data-purpose-fields]').forEach((group) => {
        const isActive = group.dataset.purposeFields === selectedType;
        group.hidden = !isActive;
        group.querySelectorAll('input, select, textarea').forEach((field) => {
          field.disabled = !isActive;
        });
      });

      if (messageField) {
        messageField.placeholder = isBooking
          ? 'Tell us about timing, crowd size, setup, song requests or anything useful...'
          : 'What would you like to ask?';
      }

      if (submitButton) {
        submitButton.textContent = isBooking ? 'Send Booking Enquiry' : 'Send Query';
      }

      if (subjectField) {
        subjectField.value = isBooking ? 'New Rockstok Booking Enquiry' : 'New Rockstok Query';
      }

      formEl.dataset.sendingMessage = sendingMessages[selectedType];
      formEl.dataset.successMessage = successMessages[selectedType];
    };

    // Reset happens before browser fields return to defaults, so defer the visual update one tick.
    typeSelect?.addEventListener('change', updateFormType);
    formEl.addEventListener('reset', () => {
      window.setTimeout(updateFormType, 0);
    });
    updateFormType();
  });

  document.querySelectorAll('form[data-ajax-form]').forEach((formEl) => {
    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();

      const status = formEl.querySelector('.form-status');
      const submitButton = formEl.querySelector('button[type="submit"]');
      const sendingMessage = formEl.dataset.sendingMessage || 'Sending...';
      const successMessage = formEl.dataset.successMessage || 'Thanks, your message has been sent.';
      const errorMessage = formEl.dataset.errorMessage || 'Sorry, something went wrong. Please try again.';

      if (status) status.textContent = sendingMessage;
      if (submitButton) submitButton.disabled = true;

      try {
        // Formspree accepts regular FormData, so the site can stay fully static.
        const response = await fetch(formEl.action, {
          method: formEl.method || 'POST',
          body: new FormData(formEl),
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Form returned ${response.status}`);
        }

        if (status) status.textContent = successMessage;
        formEl.reset();
      } catch (error) {
        console.warn(error);
        if (status) status.textContent = errorMessage;
      }

      if (submitButton) submitButton.disabled = false;
    });
  });
}

// Mobile navigation is shared across every public page.
function setupNav() {
  const toggle = $('.nav-toggle');
  const links = $('#nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

// About-page copy is shortened on small screens until the visitor expands it.
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

// Package buttons preselect the matching option before the lighting enquiry form scrolls into view.
function setupLightingPackageButtons() {
  const packageSelect = document.querySelector('[data-lighting-package-select]');
  if (!packageSelect) return;

  document.querySelectorAll('[data-lighting-package]').forEach((button) => {
    button.addEventListener('click', () => {
      packageSelect.value = button.dataset.lightingPackage || '';
    });
  });
}

// Page bootstrap: each renderer exits early when its target element is not on the current page.
renderGigs();
renderSongTags();
renderBand();
loadFourthwallProducts();
setupBookingForm();
setupNav();
setupReadMore();
setupLightingPackageButtons();
