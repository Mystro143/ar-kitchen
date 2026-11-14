/* =====================================================================
   Reads the store written in index.html (<store-catalog>) and builds the
   site from it. You don't need to edit this file to add products.
   ===================================================================== */

const catalogEl = document.querySelector('store-catalog');
const STORE_NAME = (catalogEl && catalogEl.getAttribute('name')) || 'My Store';
const splitList = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
const toNumber = s => { const n = parseFloat(s); return isNaN(n) ? null : n; };

const CATEGORIES = [...document.querySelectorAll('store-category')]
  .map(el => ({ id: el.id, name: el.getAttribute('name') || el.id }))
  .filter(c => c.id);

const PRODUCTS = [...document.querySelectorAll('store-product')].map(el => {
  if (!el.id) console.warn('A <store-product> has no id, so it was skipped:', el);
  return {
    id: el.id,
    name: el.getAttribute('name') || el.id,
    category: el.getAttribute('category') || '',
    price: el.getAttribute('price') || '',
    description: el.textContent.replace(/\s+/g, ' ').trim(),
    height: toNumber(el.getAttribute('height')),
    width: toNumber(el.getAttribute('width')),
    capacity: el.getAttribute('capacity') || '',
    images: splitList(el.getAttribute('images')),
    model: el.getAttribute('model') || '',
    iosModel: el.getAttribute('ios-model') || '',
    placement: el.getAttribute('placement') || 'floor',
    tags: splitList(el.getAttribute('tags')),
    comingSoon: el.hasAttribute('coming-soon'),
  };
}).filter(p => p.id);

/* =====================================================================
   SITE CODE (no need to edit below)
   ===================================================================== */

const ICON_BOX = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>';
const ICON_IMAGE = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>';
const ICON_BACK = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

const app = document.getElementById('app');
const chipsEl = document.getElementById('chips');
const searchEl = document.getElementById('search');
const modal = document.getElementById('tryon');
const mv = document.getElementById('mv');

const state = { category: 'all', query: '', productId: null, view: null };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;
const inches = cm => (cm / 2.54).toFixed(1);
const fmtSize = cm => `${cm} cm (${inches(cm)} in)`;
const findProduct = id => PRODUCTS.find(p => p.id === id);

function placeholder(text, icon = ICON_IMAGE) {
  return `<div class="ph">${icon}<span>${text}</span></div>`;
}
function img(src, alt) {
  if (!src) return placeholder('Photo coming soon');
  return `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" data-file="${esc(src)}" onerror="imgFallback(this)">`;
}
// If a photo file is missing, show which file name to upload instead of a broken image
function imgFallback(el) {
  const div = document.createElement('div');
  div.innerHTML = placeholder(`Add photo:<br><code>${esc(el.dataset.file)}</code>`);
  el.replaceWith(div.firstElementChild);
}

/* ---------- Categories ---------- */
function renderChips() {
  const active = state.view === 'product' ? (findProduct(state.productId) || {}).category : state.category;
  const all = [{ id: 'all', name: 'All' }, ...CATEGORIES];
  chipsEl.innerHTML = all.map(c =>
    `<button class="chip" data-cat="${c.id}" aria-pressed="${c.id === active}">${esc(c.name)}</button>`
  ).join('');
}
chipsEl.addEventListener('click', e => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  state.query = '';
  searchEl.value = '';
  location.hash = btn.dataset.cat === 'all' ? '#/' : `#/category/${btn.dataset.cat}`;
  if (state.view === 'home') renderHome();
});

/* ---------- Product cards ---------- */
function card(p) {
  if (p.comingSoon) {
    return `<div class="card soon" aria-label="${esc(p.name)}, coming soon">
      <div class="media">${placeholder('3D model in progress', ICON_BOX)}</div>
      <div class="body"><h3>${esc(p.name)}</h3><span class="tag-soon">Coming soon</span></div>
    </div>`;
  }
  const meta = [catName(p.category), p.height ? `${p.height} cm tall` : ''].filter(Boolean).join(' · ');
  return `<a class="card" href="#/product/${p.id}">
    <div class="media">
      ${img(p.images && p.images[0], p.name)}
      ${p.model ? `<span class="badge">${ICON_BOX}See it in your home</span>` : ''}
    </div>
    <div class="body">
      <h3>${esc(p.name)}</h3>
      <div class="meta">${esc(meta)}</div>
      ${p.price ? `<div class="price">${esc(p.price)}</div>` : ''}
    </div>
  </a>`;
}
function group(title, list) {
  const ready = list.filter(p => !p.comingSoon).length;
  return `<section class="group">
    <div class="group-head"><h2>${esc(title)}</h2><span class="count">${ready ? `${ready} in 3D` : 'Coming soon'}</span></div>
    <div class="grid">${list.map(card).join('')}</div>
  </section>`;
}

/* ---------- Home / category / search ---------- */
function matches(p, q) {
  const text = [p.name, catName(p.category), p.description, ...(p.tags || [])].join(' ').toLowerCase();
  return q.split(/\s+/).every(word => text.includes(word));
}
function renderHome() {
  const q = state.query.trim().toLowerCase();
  const inCat = PRODUCTS.filter(p => state.category === 'all' || p.category === state.category);
  let html = '';

  if (state.category === 'all' && !q) {
    html += `<div class="hero">
      <div>
        <h1>See it in your home before you buy.</h1>
        <p>Open any product with the 3D badge and tap <strong>Try it in your household</strong> to place it on your counter, table or floor at its real size, using your phone's camera.</p>
      </div>
      <span class="pill">${ICON_BOX}True-to-size AR</span>
    </div>`;
  }

  if (q) {
    const results = inCat.filter(p => matches(p, q));
    const where = state.category === 'all' ? '' : ` in ${catName(state.category)}`;
    if (!results.length) {
      html += `<div class="empty"><p>No products match "<strong>${esc(state.query.trim())}</strong>"${esc(where)}.</p>
        <button type="button" id="clear-search">Clear search</button></div>`;
    } else {
      html += `<section class="group">
        <div class="group-head"><h2>Results for "${esc(state.query.trim())}"${esc(where)}</h2><span class="count">${results.length} found</span></div>
        <div class="grid">${results.map(card).join('')}</div></section>`;
    }
  } else if (state.category === 'all') {
    // Products with 3D models first within each category
    CATEGORIES.forEach(c => {
      const list = PRODUCTS.filter(p => p.category === c.id).sort((a, b) => !!a.comingSoon - !!b.comingSoon);
      if (list.length) html += group(c.name, list);
    });
  } else {
    html += group(catName(state.category), inCat.sort((a, b) => !!a.comingSoon - !!b.comingSoon));
  }

  app.innerHTML = html;
  const clear = document.getElementById('clear-search');
  if (clear) clear.addEventListener('click', () => { searchEl.value = ''; state.query = ''; renderHome(); searchEl.focus(); });
}

searchEl.addEventListener('input', () => {
  state.query = searchEl.value;
  if (state.view !== 'home') {
    location.hash = state.category === 'all' ? '#/' : `#/category/${state.category}`;
  } else {
    renderHome();
  }
});

/* ---------- Product page ---------- */
function renderProduct(p) {
  const images = (p.images && p.images.length) ? p.images : [null];
  const specs = [
    p.height && ['Height', fmtSize(p.height)],
    p.width && ['Width', fmtSize(p.width)],
    p.capacity && ['Capacity', p.capacity],
    ['Category', catName(p.category)],
  ].filter(Boolean);

  app.innerHTML = `
    <a class="back" href="${state.category === 'all' ? '#/' : `#/category/${state.category}`}">${ICON_BACK}Back to products</a>
    <div class="product">
      <div class="gallery">
        <div class="main" id="main-img">${img(images[0], p.name)}</div>
        ${images.length > 1 ? `<div class="thumbs">${images.map((src, i) =>
          `<button class="thumb" data-i="${i}" aria-label="Photo ${i + 1}" aria-current="${i === 0}">${img(src, '')}</button>`
        ).join('')}</div>` : ''}
      </div>
      <div class="info">
        <a class="cat" href="#/category/${p.category}">${esc(catName(p.category))}</a>
        <h1>${esc(p.name)}</h1>
        ${p.price ? `<div class="price">${esc(p.price)}</div>` : ''}
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
        <div class="try-card">
          ${p.model
            ? `<button class="try-btn" id="try-btn">${ICON_BOX}Try it in your household</button>
               <p>See it at its real size on your counter or table, using your phone's camera.</p>`
            : `<button class="try-btn" disabled>${ICON_BOX}3D preview coming soon</button>`}
        </div>
        <dl class="specs">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </div>
    </div>`;

  app.querySelectorAll('.thumb').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('main-img').innerHTML = img(images[+btn.dataset.i], p.name);
    app.querySelectorAll('.thumb').forEach(t => t.setAttribute('aria-current', t === btn));
  }));
  const tryBtn = document.getElementById('try-btn');
  if (tryBtn) tryBtn.addEventListener('click', () => { location.hash = `#/product/${p.id}/try`; });
}

/* ---------- Try it in your household ---------- */
let modalOpen = false;

function showHelp() {
  const canAR = !!mv.canActivateAR;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  document.getElementById('help-phone').hidden = !canAR;
  document.getElementById('help-noar').hidden = canAR || !touch;
  document.getElementById('help-desktop').hidden = canAR || touch;
}

function openTryOn(p) {
  document.getElementById('tryon-title').textContent = p.name;
  document.getElementById('tryon-size').textContent =
    [p.height && `${fmtSize(p.height)} tall`, p.width && `${fmtSize(p.width)} wide`].filter(Boolean).join(' · ');
  document.getElementById('viewer-error').hidden = true;

  mv.setAttribute('alt', `3D model of ${p.name}`);
  mv.setAttribute('ar-placement', p.placement || 'floor');
  if (p.iosModel) mv.setAttribute('ios-src', p.iosModel); else mv.removeAttribute('ios-src');
  if (mv.getAttribute('src') !== p.model) mv.setAttribute('src', p.model);

  // QR code for computers: opens this product's 3D view on the phone
  const qrEl = document.getElementById('qr');
  qrEl.innerHTML = '';
  const url = `${location.href.split('#')[0]}#/product/${p.id}/try`;
  if (window.QRCode) new QRCode(qrEl, { text: url, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });

  modal.hidden = false;
  modalOpen = true;
  document.body.style.overflow = 'hidden';
  showHelp();
  customElements.whenDefined('model-viewer').then(showHelp);
  document.getElementById('tryon-close').focus();
}

function closeTryOn() {
  if (!modalOpen) return;
  modal.hidden = true;
  modalOpen = false;
  document.body.style.overflow = '';
}

mv.addEventListener('load', showHelp);
mv.addEventListener('error', () => {
  document.getElementById('viewer-error').hidden = false;
  document.getElementById('viewer-error-text').innerHTML =
    `Check that <code>${esc(mv.getAttribute('src'))}</code> is uploaded next to index.html and the name matches exactly.`;
});

function leaveTryOn() { location.hash = `#/product/${state.productId}`; }
document.getElementById('tryon-close').addEventListener('click', leaveTryOn);
modal.addEventListener('click', e => { if (e.target === modal) leaveTryOn(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modalOpen) leaveTryOn(); });

/* ---------- Page routing (#/, #/category/kitchen, #/product/id, #/product/id/try) ---------- */
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const prevView = state.view, prevId = state.productId;

  if (parts[0] === 'product') {
    const p = findProduct(parts[1]);
    if (!p || p.comingSoon) { location.replace('#/'); return; }
    state.view = 'product';
    state.productId = p.id;
    if (prevView !== 'product' || prevId !== p.id) { renderProduct(p); window.scrollTo(0, 0); }
    renderChips();
    if (parts[2] === 'try' && p.model) openTryOn(p); else closeTryOn();
    document.title = `${p.name} | ${STORE_NAME}`;
    return;
  }

  closeTryOn();
  state.view = 'home';
  state.productId = null;
  state.category = (parts[0] === 'category' && CATEGORIES.some(c => c.id === parts[1])) ? parts[1] : 'all';
  renderChips();
  renderHome();
  if (prevView !== 'home') window.scrollTo(0, 0);
  document.title = state.category === 'all' ? `${STORE_NAME} | See it in your home` : `${catName(state.category)} | ${STORE_NAME}`;
}

document.getElementById('footer-name').textContent = `© ${new Date().getFullYear()} ${STORE_NAME}`;
window.addEventListener('hashchange', route);
route();