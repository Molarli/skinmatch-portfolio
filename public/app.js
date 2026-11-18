// public/app.js - SkinMatch front-end.
// The browser never talks to MySQL: every action is a fetch() to our Express API (Lab 6/12).

// ---------------------------------------------------------------------------
// English labels for the ENUM values stored in the database
// ---------------------------------------------------------------------------
const SKIN = {
  dry: ['Dry', 'Tight, flakes easily'],
  oily: ['Oily', 'Shiny, breaks out easily'],
  combination: ['Combination', 'Oily T-zone, dry cheeks'],
  sensitive: ['Sensitive', 'Easily irritated'],
  normal: ['Normal', 'Well balanced']
};
const AGE = { under18: 'Under 18', '18-24': '18–24', '25-34': '25–34', '35-44': '35–44', '45plus': '45+' };
const GENDER = { female: 'Female', male: 'Male', other: 'Other / prefer not to say' };
const TONE = { fair: 'Fair', light: 'Light', medium: 'Medium', tan: 'Tan', deep: 'Deep' };
const CAT = { cleanser: 'Cleanser', toner: 'Toner', serum: 'Serum', moisturizer: 'Moisturizer', sunscreen: 'Sunscreen', mask: 'Mask' };
const TARGET = { unisex: 'Unisex', female: 'Women', male: 'Men' };
const SEV = { 1: 'Mild', 2: 'Moderate', 3: 'Severe' };
const TITLES = { profile: 'My Skin', reco: 'For You', catalog: 'All Products', product: 'Product Details', admin: 'Admin', login: 'Log In' };
const DROP = '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 7.4 6 11a6 6 0 0 1-12 0c0-3.6 3-7 6-11z"/></svg>';

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------
const state = {
  user: null,          // { id, full_name, email, role } from the session
  meta: null,          // lookup lists from GET /meta
  profile: null,       // my saved profile
  draft: null,         // profile form being edited
  reco: null,          // last recommendation result
  filters: { q: '', category: '', sort: 'rating', max_price: '', exclude_allergens: false },
  adminTab: 'brands',
  view: 'catalog',
  productId: null
};

const $view = document.getElementById('view');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// escape user text before it goes into innerHTML: shown, never run
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function baht(n) { return '฿' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
function stars(avg) {
  if (avg == null) return '<span class="muted" style="font-size:13px">No reviews yet</span>';
  const full = Math.round(avg);
  return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)} ${Number(avg).toFixed(1)}</span>`;
}
function thumbClass(cat) { return { serum: 't-rose', mask: 't-rose', moisturizer: 't-sage', toner: 't-sage', sunscreen: 't-tan', cleanser: 't-tan' }[cat] || 't-sage'; }
function ago(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''} ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function toast(msg, isErr) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}

// one helper for every request; also writes the API log panel
async function api(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res, data;
  try {
    res = await fetch(url, opts);
    data = await res.json().catch(() => ({}));
  } catch (e) {
    logRequest(method, url, 0, 'network error');
    return { ok: false, status: 0, data: { error: 'Cannot reach the server' } };
  }
  logRequest(method, url, res.status, res.ok ? '' : data.error);
  return { ok: res.ok, status: res.status, data };
}

function logRequest(method, url, status, note) {
  const li = document.createElement('li');
  const cls = status >= 500 || status === 0 ? 's5' : status >= 400 ? 's4' : 's2';
  li.innerHTML = `<span class="${cls}">${status || 'ERR'}</span> ${esc(method)} ${esc(url)}${note ? ` <span class="muted">— ${esc(note)}</span>` : ''}`;
  const list = document.getElementById('logList');
  list.prepend(li);
  while (list.children.length > 40) list.lastChild.remove();
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function go(view, productId) {
  state.view = view;
  if (productId) state.productId = productId;
  document.getElementById('pageTitle').textContent = TITLES[view] || '';
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.go === view));
  window.scrollTo(0, 0);
  render();
}

function render() {
  const v = state.view;
  if (v === 'login') return renderLogin();
  if (v === 'profile') return renderProfile();
  if (v === 'reco') return renderReco();
  if (v === 'product') return renderProduct();
  if (v === 'admin') return renderAdmin();
  return renderCatalog();
}

function updateUserUI() {
  const btn = document.getElementById('userBtn');
  btn.textContent = state.user ? `${state.user.full_name.split(' ')[0]} · Log out` : 'Log in';
  document.getElementById('navAdmin').hidden = !(state.user && state.user.role === 'admin');
}

function needLogin(what) {
  $view.innerHTML = `
    <div class="empty">
      <div class="thumb t-rose" style="margin:0 auto 14px;width:72px;height:72px">${DROP}</div>
      <p>${esc(what)}</p>
      <button class="btn small" data-go="login">Log in / Sign up</button>
    </div>`;
}

// ---------------------------------------------------------------------------
// Login / register
// ---------------------------------------------------------------------------
let loginMode = 'login';
function renderLogin() {
  const reg = loginMode === 'register';
  $view.innerHTML = `
    <h1>${reg ? 'Create an account' : 'Welcome back'}</h1>
    <p class="lead">${reg ? 'Create an account to save your skin profile and get recommendations' : 'Log in to see recommendations that match your skin'}</p>
    <div class="chips" style="margin-bottom:6px">
      <button class="chip g ${!reg ? 'on' : ''}" data-mode="login">Log in</button>
      <button class="chip g ${reg ? 'on' : ''}" data-mode="register">Sign up</button>
    </div>
    <form id="authForm">
      ${reg ? '<label class="field">Full name<input type="text" name="full_name" required maxlength="100"></label>' : ''}
      <label class="field">Email<input type="email" name="email" required></label>
      <label class="field">Password${reg ? ' (at least 8 characters)' : ''}<input type="password" name="password" required></label>
      <button class="btn" type="submit">${reg ? 'Sign up' : 'Log in'}</button>
    </form>
    <div class="hint">Demo accounts (click to fill in):<br>
      <button class="chip" data-fill="member1@example.com|member1234">Member: Member 1</button>
      <button class="chip" data-fill="member3@example.com|member1234">Member: Member 3 (sensitive skin)</button>
      <button class="chip" data-fill="new-member@example.com|member1234">New member (no profile yet)</button>
      <button class="chip" data-fill="demo-admin@example.com|admin1234">Admin</button>
    </div>`;

  $view.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => { loginMode = b.dataset.mode; renderLogin(); });
  $view.querySelectorAll('[data-fill]').forEach((b) => b.onclick = () => {
    const [e, p] = b.dataset.fill.split('|');
    loginMode = 'login'; renderLogin();
    $view.querySelector('[name=email]').value = e;
    $view.querySelector('[name=password]').value = p;
  });
  document.getElementById('authForm').onsubmit = async (ev) => {
    ev.preventDefault();
    const body = Object.fromEntries(new FormData(ev.target).entries());
    const r = await api('POST', reg ? '/auth/register' : '/auth/login', body);
    if (!r.ok) return toast(r.data.error, true);
    state.user = r.data.user;
    state.profile = null; state.reco = null; state.draft = null;
    updateUserUI();
    toast(`Hello, ${state.user.full_name}`);
    await loadProfile();
    go(state.user.role === 'admin' ? 'admin' : (state.profile ? 'reco' : 'profile'));
  };
}

async function logout() {
  await api('POST', '/auth/logout');
  state.user = null; state.profile = null; state.reco = null; state.draft = null;
  updateUserUI();
  toast('Logged out');
  go('catalog');
}

// ---------------------------------------------------------------------------
// Skin profile (the quiz)
// ---------------------------------------------------------------------------
async function loadProfile() {
  if (!state.user) return;
  const r = await api('GET', '/me/profile');
  if (r.ok) {
    state.profile = r.data.profile;
    state.gender = r.data.user ? r.data.user.gender : null;
  }
}

function draftFromProfile() {
  const p = state.profile;
  return {
    skin_type: p ? p.skin_type : '',
    age_group: p ? p.age_group : '',
    skin_tone: p ? (p.skin_tone || '') : '',
    gender: state.gender || '',
    concerns: p ? Object.fromEntries(p.concerns.map((c) => [c.concern_id, c.severity_level])) : {},
    allergens: p ? p.allergens.map((a) => a.ingredient_id) : []
  };
}

function renderProfile() {
  if (!state.user) return needLogin('Log in to save your skin profile');
  if (!state.draft) state.draft = draftFromProfile();
  const d = state.draft;
  const m = state.meta;
  const ready = d.skin_type && d.age_group && d.gender;

  $view.innerHTML = `
    <h1>Let's get to know your skin</h1>
    <p class="lead">Answer a few quick questions to get facial skincare recommendations made for you
      ${state.profile ? `<br><span class="muted">Last updated ${esc(new Date(state.profile.updated_at).toLocaleString('en-GB'))}</span>` : ''}</p>

    <h2><span class="req">Your skin type</span></h2>
    <div class="typegrid">
      ${Object.entries(SKIN).map(([k, [t, s]]) => `
        <button class="typecard ${d.skin_type === k ? 'on' : ''}" data-type="${k}">${DROP}<b>${t}</b><span>${s}</span></button>`).join('')}
    </div>

    <h2>Skin concerns <small>Choose any that apply</small></h2>
    <div class="chips">
      ${m.concerns.map((c) => `<button class="chip ${d.concerns[c.concern_id] ? 'on' : ''}" data-concern="${c.concern_id}">${esc(c.name_th)}</button>`).join('')}
    </div>
    <div style="margin-top:8px">
      ${m.concerns.filter((c) => d.concerns[c.concern_id]).map((c) => `
        <div class="sev"><span>${esc(c.name_th)}: level</span>
          ${[1, 2, 3].map((s) => `<button class="${d.concerns[c.concern_id] === s ? 'on' : ''}" data-sev="${c.concern_id}:${s}">${SEV[s]}</button>`).join('')}
        </div>`).join('')}
    </div>

    <h2>Ingredient allergies <small>Skip if none</small></h2>
    <div class="chips">
      ${m.allergens.map((a) => `<button class="chip ${d.allergens.includes(a.ingredient_id) ? 'on' : ''}" data-allergen="${a.ingredient_id}" title="${esc(a.ingredient_name)}">${esc(a.name_th)}</button>`).join('')}
    </div>
    <div class="row" style="margin-top:10px">
      <select id="moreAllergen">
        <option value="">+ Add another allergy, e.g. retinol</option>
        ${m.ingredients.filter((i) => !i.is_allergen && !d.allergens.includes(i.ingredient_id))
          .map((i) => `<option value="${i.ingredient_id}">${esc(i.name_th || i.ingredient_name)} (${esc(i.ingredient_name)})</option>`).join('')}
      </select>
    </div>
    ${d.allergens.filter((id) => !m.allergens.some((a) => a.ingredient_id === id)).length ? `
      <div class="chips" style="margin-top:8px">
        ${d.allergens.filter((id) => !m.allergens.some((a) => a.ingredient_id === id)).map((id) => {
          const i = m.ingredients.find((x) => x.ingredient_id === id);
          return `<button class="chip on" data-allergen="${id}">${esc(i ? (i.name_th || i.ingredient_name) : id)}</button>`;
        }).join('')}
      </div>` : ''}

    <h2><span class="req">Gender</span></h2>
    <div class="chips">${Object.entries(GENDER).map(([k, t]) => `<button class="chip g ${d.gender === k ? 'on' : ''}" data-gender="${k}">${t}</button>`).join('')}</div>

    <h2><span class="req">Age group</span></h2>
    <div class="chips">${Object.entries(AGE).map(([k, t]) => `<button class="chip g ${d.age_group === k ? 'on' : ''}" data-age="${k}">${t}</button>`).join('')}</div>

    <h2>Skin tone <small>Optional</small></h2>
    <div class="chips">${Object.entries(TONE).map(([k, t]) => `<button class="chip g ${d.skin_tone === k ? 'on' : ''}" data-tone="${k}">${t}</button>`).join('')}</div>

    <button class="btn" id="saveProfile" ${ready ? '' : 'disabled'}>Show my recommendations</button>`;

  const q = (sel, fn) => $view.querySelectorAll(sel).forEach((el) => el.onclick = () => { fn(el); renderProfile(); });
  q('[data-type]', (el) => d.skin_type = el.dataset.type);
  q('[data-concern]', (el) => {
    const id = Number(el.dataset.concern);
    if (d.concerns[id]) delete d.concerns[id]; else d.concerns[id] = 2;
  });
  q('[data-sev]', (el) => { const [id, s] = el.dataset.sev.split(':').map(Number); d.concerns[id] = s; });
  q('[data-allergen]', (el) => {
    const id = Number(el.dataset.allergen);
    d.allergens = d.allergens.includes(id) ? d.allergens.filter((x) => x !== id) : [...d.allergens, id];
  });
  q('[data-gender]', (el) => d.gender = el.dataset.gender);
  q('[data-age]', (el) => d.age_group = el.dataset.age);
  q('[data-tone]', (el) => d.skin_tone = d.skin_tone === el.dataset.tone ? '' : el.dataset.tone);
  document.getElementById('moreAllergen').onchange = (e) => {
    if (e.target.value) { d.allergens.push(Number(e.target.value)); renderProfile(); }
  };
  document.getElementById('saveProfile').onclick = saveProfile;
}

async function saveProfile() {
  const d = state.draft;
  const body = {
    skin_type: d.skin_type,
    age_group: d.age_group,
    skin_tone: d.skin_tone || null,
    gender: d.gender || null,
    concerns: Object.entries(d.concerns).map(([id, s]) => ({ concern_id: Number(id), severity_level: s })),
    allergens: d.allergens
  };
  const r = await api('PUT', '/me/profile', body);          // one transaction on the server
  if (!r.ok) return toast(r.data.error, true);
  await loadProfile();
  state.draft = null;
  toast('Skin profile saved');
  await makeRecommendations();
  go('reco');
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------
async function makeRecommendations() {
  const r = await api('POST', '/me/recommendations', { limit: 6 });   // CALL sp_generate_recommendations
  if (!r.ok) { toast(r.data.error, true); return false; }
  state.reco = r.data;
  return true;
}

function profileSummary() {
  const p = state.profile;
  if (!p) return '';
  const parts = [SKIN[p.skin_type][0]];
  if (p.concerns.length) parts.push('Concerns: ' + p.concerns.map((c) => c.name_th).join(', '));
  if (p.allergens.length) parts.push('Allergic to ' + p.allergens.map((a) => a.name_th || a.ingredient_name).join(', '));
  return parts.map(esc).join(' · ');
}

async function renderReco() {
  if (!state.user) return needLogin('Log in to get recommendations that match your skin');
  if (!state.profile) await loadProfile();
  if (!state.profile) {
    $view.innerHTML = `<div class="empty"><p>You don't have a skin profile yet.<br>Answer a few quick questions first.</p>
      <button class="btn small" data-go="profile">Create my skin profile</button></div>`;
    return;
  }
  if (!state.reco) {
    $view.innerHTML = '<p class="muted">Matching products to your skin…</p>';
    if (!(await makeRecommendations())) return;
  }
  const items = state.reco.items;
  $view.innerHTML = `
    <h1>Products that suit you</h1>
    <p class="lead">Ranked by how well each product suits your skin (scored by fn_match_score in the database)</p>
    <div class="summary"><span>${profileSummary()}</span><button class="linkbtn" data-go="profile">Edit</button></div>
    <div class="cards">${items.length ? items.map(cardHTML).join('') : '<div class="empty">No suitable products found. Try removing some allergies.</div>'}</div>
    <button class="btn light" id="again">Recalculate recommendations</button>
    <h2>Recommendation history <small>from the RECOMMENDATION table</small></h2>
    <div id="history" class="muted" style="font-size:13px">Loading…</div>`;
  bindCards();
  document.getElementById('again').onclick = async () => {
    if (await makeRecommendations()) { toast(`Saved ${state.reco.saved} items to history`); renderReco(); }
  };
  const h = await api('GET', '/me/recommendations/history');
  const box = document.getElementById('history');
  if (h.ok && box) {
    box.innerHTML = h.data.length ? `<div class="tablewrap"><table>
      <tr><th>Time</th><th>Product</th><th class="num">Score</th></tr>
      ${h.data.map((x) => `<tr><td>${esc(new Date(x.recommended_date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }))}</td>
        <td>${esc(x.brand_name)} · ${esc(x.product_name)}</td><td class="num">${Math.round(x.match_score)}%</td></tr>`).join('')}
      </table></div>` : 'No history yet';
  }
}

// ---------------------------------------------------------------------------
// Product cards (used by recommendations and the catalogue)
// ---------------------------------------------------------------------------
function cardHTML(p) {
  const myType = state.profile ? state.profile.skin_type : null;
  const types = [...(p.skin_types || [])].sort((a, b) => (b === myType) - (a === myType));
  const typeTag = types.length ? `<span class="tag">${SKIN[types[0]][0]}${types.length > 1 ? ' +' + (types.length - 1) : ''}</span>` : '';
  const concernTags = (p.concerns || []).slice(0, 2).map((c) => `<span class="tag r">${esc(c)}</span>`).join('');
  let alTag = '';
  if (p.my_allergen_hits > 0) alTag = '<span class="tag d">Contains your allergen</span>';
  else if (p.allergen_count > 0) alTag = '<span class="tag t">Contains allergens</span>';

  let badge = '';
  if (p.my_allergen_hits > 0) badge = '<div class="badge no"><b>✕</b><small>Not advised</small></div>';
  else if (p.match_score > 0) badge = `<div class="badge"><b>${Math.round(p.match_score)}%</b><small>match</small></div>`;

  const fitParts = [];
  if (types.length) fitParts.push('For ' + SKIN[types[0]][0].toLowerCase() + ' skin');
  if ((p.concerns || []).length) fitParts.push('Helps with ' + p.concerns[0].toLowerCase());

  return `
    <div class="pcard" data-product="${p.product_id}">
      <div class="thumb ${thumbClass(p.category)}">${DROP}</div>
      <div class="pbody">
        <div class="brand">${esc(p.brand_name)} · ${CAT[p.category] || ''}</div>
        <div class="pname">${esc(p.product_name)}</div>
        <div class="price">${baht(p.price)} <span style="font-weight:400">${p.avg_rating != null ? stars(p.avg_rating) : ''}</span></div>
        <div class="tags">${typeTag}${concernTags}${alTag}</div>
        <div class="fit">${esc(fitParts.join(' · '))}</div>
      </div>
      ${badge}
    </div>`;
}

function bindCards() {
  $view.querySelectorAll('[data-product]').forEach((el) => el.onclick = () => go('product', Number(el.dataset.product)));
}

// ---------------------------------------------------------------------------
// Catalogue with filters
// ---------------------------------------------------------------------------
async function renderCatalog() {
  const f = state.filters;
  $view.innerHTML = `
    <h1>All products</h1>
    <div class="searchrow">
      <input type="text" id="q" placeholder="Search products or brands" value="${esc(f.q)}">
      <button class="btn small" id="searchBtn">Search</button>
    </div>
    <div class="chips" id="cats">
      <button class="chip g ${!f.category ? 'on' : ''}" data-cat="">All</button>
      ${Object.entries(CAT).map(([k, t]) => `<button class="chip g ${f.category === k ? 'on' : ''}" data-cat="${k}">${t}</button>`).join('')}
    </div>
    <div class="row" style="margin-top:10px">
      <select id="sort">
        <option value="rating">Sort by: rating</option>
        <option value="price_asc">Price: low → high</option>
        <option value="price_desc">Price: high → low</option>
        ${state.user ? '<option value="match">Best match for my skin</option>' : ''}
      </select>
      <select id="maxPrice">
        <option value="">Any price</option>
        <option value="400">Up to ฿400</option>
        <option value="600">Up to ฿600</option>
        <option value="800">Up to ฿800</option>
      </select>
    </div>
    <label class="toggle"><input type="checkbox" id="noAllergen" ${f.exclude_allergens ? 'checked' : ''}>
      ${state.user ? 'Hide products with my allergens' : 'Hide products with allergens'}</label>
    <div class="cards" id="list"><p class="muted">Loading…</p></div>`;

  document.getElementById('sort').value = f.sort;
  document.getElementById('maxPrice').value = f.max_price;
  const reload = () => renderCatalog();
  document.getElementById('searchBtn').onclick = () => { f.q = document.getElementById('q').value; reload(); };
  document.getElementById('q').onkeydown = (e) => { if (e.key === 'Enter') { f.q = e.target.value; reload(); } };
  $view.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { f.category = b.dataset.cat; reload(); });
  document.getElementById('sort').onchange = (e) => { f.sort = e.target.value; reload(); };
  document.getElementById('maxPrice').onchange = (e) => { f.max_price = e.target.value; reload(); };
  document.getElementById('noAllergen').onchange = (e) => { f.exclude_allergens = e.target.checked; reload(); };

  const params = new URLSearchParams();
  if (f.q) params.set('q', f.q);
  if (f.category) params.set('category', f.category);
  if (f.max_price) params.set('max_price', f.max_price);
  if (f.exclude_allergens) params.set('exclude_allergens', '1');
  params.set('sort', f.sort);
  const r = await api('GET', '/products?' + params.toString());
  const list = document.getElementById('list');
  if (!list) return;
  if (!r.ok) { list.innerHTML = `<div class="empty">${esc(r.data.error)}</div>`; return; }
  list.innerHTML = r.data.length
    ? `<p class="muted" style="margin:0;font-size:13px">${r.data.length} products found</p>` + r.data.map(cardHTML).join('')
    : '<div class="empty">No products match these filters</div>';
  bindCards();
}

// ---------------------------------------------------------------------------
// Product page
// ---------------------------------------------------------------------------
async function renderProduct() {
  $view.innerHTML = '<p class="muted">Loading…</p>';
  const r = await api('GET', '/products/' + state.productId);
  if (!r.ok) { $view.innerHTML = `<div class="empty">${esc(r.data.error)}</div>`; return; }
  const p = r.data;
  const mine = p.ingredients.filter((i) => i.is_my_allergen);

  let match = '';
  if (p.logged_in && state.profile) {
    if (mine.length) {
      match = `<div class="matchcard no"><div class="ring">✕</div><div><b>Not recommended for you</b>
        <small>Contains ingredients you're allergic to: ${mine.map((i) => esc(i.name_th || i.ingredient_name)).join(', ')}</small></div></div>`;
    } else {
      const fit = [];
      if (p.skin_types.includes(state.profile.skin_type)) fit.push('For ' + SKIN[state.profile.skin_type][0].toLowerCase() + ' skin');
      if (p.concerns.length) fit.push('Helps with ' + p.concerns[0].toLowerCase());
      match = `<div class="matchcard"><div class="ring">${Math.round(p.match_score)}%</div><div><b>Match for your skin</b>
        <small>${esc(fit.join(' · ') || 'Based on your skin profile')}</small></div></div>`;
    }
  }

  const specs = [];
  if (p.texture) specs.push(['Texture', p.texture], ['Finish', p.finish]);
  if (p.key_active) specs.push(['Key active', p.key_active + (p.active_percent != null ? ` ${p.active_percent}%` : '')]);
  if (p.spf) specs.push(['SPF', p.spf], ['PA', p.pa_rating], ['Filter type', p.filter_type]);
  specs.push(['Size', p.volume_ml ? p.volume_ml + ' ml' : '-'], ['For', TARGET[p.gender_target]]);

  $view.innerHTML = `
    <div class="back"><button id="backBtn" aria-label="Back">‹</button><b>Product details</b></div>
    <div class="hero ${thumbClass(p.category)}">${DROP}</div>
    <div class="brand" style="margin-top:16px;color:var(--green)">${esc(p.brand_name)} · ${CAT[p.category]}</div>
    <h1 style="margin-top:2px">${esc(p.product_name)}</h1>
    <div class="ptitle"><div class="price">${baht(p.price)}</div>${stars(p.avg_rating)}</div>
    ${match}

    <h2>Product information <small>${p.category === 'moisturizer' || p.category === 'serum' || p.category === 'sunscreen' ? 'subtype: ' + p.category.toUpperCase() : ''}</small></h2>
    <div class="specs">${specs.map(([k, v]) => `<div class="spec">${esc(k)}<b>${esc(v)}</b></div>`).join('')}</div>

    <h2>Ingredients <small>${p.ingredients.length} items</small></h2>
    <div>${p.ingredients.map((i) => `
      <span class="ingchip ${i.is_my_allergen ? 'mine' : i.is_allergen ? 'al' : ''}" title="${esc(i.ingredient_name)}: ${esc(i.function_benefit)}">
        🌿 ${esc(i.name_th || i.ingredient_name)}${i.concentration_percent != null ? ' ' + Number(i.concentration_percent) + '%' : ''}
        ${i.is_my_allergen ? '· your allergen' : i.is_allergen ? '· allergen' : ''}</span>`).join('')}</div>

    <h2>Suitable for</h2>
    <div class="tags">
      ${p.skin_types.map((t) => `<span class="tag">${SKIN[t][0]}</span>`).join('')}
      ${p.concern_list.map((c) => `<span class="tag r">${esc(c.name_th)} ${'●'.repeat(c.effectiveness_level)}</span>`).join('')}
    </div>

    <h2>Reviews <small>${p.reviews.length} review${p.reviews.length === 1 ? '' : 's'}</small></h2>
    ${p.reviews.map((rv) => `
      <div class="review"><div class="review-head"><span class="avatar">${esc(rv.reviewer.charAt(0))}</span>
        <div><b>${esc(rv.reviewer)}</b><small>${ago(rv.review_date)}</small></div>${stars(rv.rating)}</div>
        <p>${esc(rv.comment || '')}</p></div>`).join('') || '<p class="muted">No reviews yet. Be the first to write one!</p>'}

    <div class="box" id="reviewBox">
      ${state.user ? `
        <b>Write a review</b>
        <div class="starpick" id="starPick">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}">★</button>`).join('')}</div>
        <textarea id="reviewText" maxlength="500" placeholder="How did your skin feel after using it?"></textarea>
        <button class="btn small" id="sendReview" style="margin-top:10px">Submit review</button>`
      : '<span class="muted">Log in to write a review</span> <button class="linkbtn" data-go="login">Log in</button>'}
    </div>`;

  document.getElementById('backBtn').onclick = () => go(state.prevView || 'catalog');
  if (state.user) {
    let rating = 0;
    const paint = () => $view.querySelectorAll('[data-star]').forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= rating));
    $view.querySelectorAll('[data-star]').forEach((b) => b.onclick = () => { rating = Number(b.dataset.star); paint(); });
    document.getElementById('sendReview').onclick = async () => {
      if (!rating) return toast('Please choose a star rating first', true);
      const res = await api('POST', `/products/${p.product_id}/reviews`, { rating, comment: document.getElementById('reviewText').value });
      if (!res.ok) return toast(res.data.error, true);
      toast('Thanks for your review!');
      renderProduct();
    };
  }
}

// ---------------------------------------------------------------------------
// Admin pages
// ---------------------------------------------------------------------------
const ADMIN_TABS = { brands: 'Brand report', categories: 'Category report', users: 'Members', products: 'Manage products', add: 'Add product', log: 'Price history' };

async function renderAdmin() {
  if (!state.user || state.user.role !== 'admin') return needLogin('This page is for administrators only');
  const t = state.adminTab;
  $view.innerHTML = `
    <h1>Admin</h1>
    <div class="tabs">${Object.entries(ADMIN_TABS).map(([k, v]) => `<button class="chip g ${t === k ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>
    <div id="adminBody"><p class="muted">Loading…</p></div>`;
  $view.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => { state.adminTab = b.dataset.tab; renderAdmin(); });
  const body = document.getElementById('adminBody');
  const n = (v, d = 2) => (v == null ? '-' : Number(v).toFixed(d));

  if (t === 'brands') {
    const r = await api('GET', '/admin/report/brands');
    if (!r.ok) return (body.innerHTML = esc(r.data.error));
    body.innerHTML = `<p class="muted" style="font-size:13px">From view <b>v_brand_report</b> (JOIN + GROUP BY + derived table)</p>
      <div class="tablewrap"><table><tr><th>Brand</th><th>Country</th><th class="num">Products</th><th class="num">Avg price</th><th class="num">Rating</th><th class="num">Reviews</th></tr>
      ${r.data.map((x) => `<tr><td>${esc(x.brand_name)}</td><td>${esc(x.country_of_origin || '-')}</td><td class="num">${x.product_count}</td>
        <td class="num">${n(x.avg_price)}</td><td class="num">${n(x.avg_rating)}</td><td class="num">${x.total_reviews}</td></tr>`).join('')}</table></div>`;
  }

  if (t === 'categories') {
    const r = await api('GET', '/admin/report/categories');
    if (!r.ok) return (body.innerHTML = esc(r.data.error));
    body.innerHTML = `<div class="tablewrap"><table><tr><th>Category</th><th class="num">Products</th><th class="num">Avg price</th><th class="num">Avg rating</th><th class="num">Reviews</th></tr>
      ${r.data.map((x) => `<tr><td>${CAT[x.category]}</td><td class="num">${x.products}</td><td class="num">${n(x.avg_price)}</td>
        <td class="num">${n(x.avg_rating)}</td><td class="num">${x.reviews}</td></tr>`).join('')}</table></div>`;
  }

  if (t === 'users') {
    const r = await api('GET', '/admin/users');
    if (!r.ok) return (body.innerHTML = esc(r.data.error));
    body.innerHTML = `<p class="muted" style="font-size:13px">From view <b>v_user_profile_summary</b> (LEFT JOIN + GROUP_CONCAT)</p>
      <div class="tablewrap"><table><tr><th>#</th><th>Name</th><th>Role</th><th>Skin</th><th>Concerns</th><th class="num">Reviews</th></tr>
      ${r.data.map((x) => `<tr><td>${x.user_id}</td><td>${esc(x.full_name)}<br><small class="muted">${esc(x.email)}</small></td><td>${esc(x.role)}</td>
        <td>${x.skin_type ? SKIN[x.skin_type][0] : '<span class="muted">-</span>'}</td><td>${esc(x.concerns || '-')}</td><td class="num">${x.review_count}</td></tr>`).join('')}</table></div>`;
  }

  if (t === 'log') {
    const r = await api('GET', '/admin/price-log');
    if (!r.ok) return (body.innerHTML = esc(r.data.error));
    body.innerHTML = `<p class="muted" style="font-size:13px">Table <b>product_price_log</b> is written only by the trigger <b>trg_product_price_audit</b></p>
      <div class="tablewrap"><table><tr><th>Time</th><th>Product</th><th class="num">Old</th><th class="num">New</th><th>By</th></tr>
      ${r.data.map((x) => `<tr><td>${esc(new Date(x.changed_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }))}</td><td>${esc(x.product_name)}</td>
        <td class="num">${n(x.old_price)}</td><td class="num">${n(x.new_price)}</td><td>${esc(x.changed_by)}</td></tr>`).join('') || '<tr><td colspan="5">None yet</td></tr>'}</table></div>`;
  }

  if (t === 'products') {
    const r = await api('GET', '/products?sort=');
    if (!r.ok) return (body.innerHTML = esc(r.data.error));
    body.innerHTML = `<p class="muted" style="font-size:13px">Edit a price and press Save: the trigger records the price history · Delete: ON DELETE CASCADE removes its ingredients and reviews</p>
      <div class="tablewrap"><table><tr><th>#</th><th>Product</th><th>Price</th><th></th></tr>
      ${r.data.map((x) => `<tr><td>${x.product_id}</td><td>${esc(x.brand_name)}<br>${esc(x.product_name)}</td>
        <td><input type="number" class="mini" step="0.01" min="1" value="${x.price}" data-price="${x.product_id}"></td>
        <td><button class="btn small" data-save="${x.product_id}">Save</button>
            <button class="btn small danger" data-del="${x.product_id}" style="margin-top:4px">Delete</button></td></tr>`).join('')}</table></div>`;
    body.querySelectorAll('[data-save]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.save;
      const price = body.querySelector(`[data-price="${id}"]`).value;
      const res = await api('PATCH', '/admin/products/' + id, { price: Number(price) });
      toast(res.ok ? 'Price saved (see the Price history tab)' : res.data.error, !res.ok);
    });
    body.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Confirm delete?'; return; }
      const res = await api('DELETE', '/admin/products/' + b.dataset.del);
      toast(res.ok ? 'Product deleted' : res.data.error, !res.ok);
      if (res.ok) renderAdmin();
    });
  }

  if (t === 'add') renderAddProduct(body);
}

function renderAddProduct(body) {
  const m = state.meta;
  body.innerHTML = `
    <form id="addForm" class="box">
      <b>Add a new product</b> <span class="muted" style="font-size:13px">(saved in a single transaction)</span>
      <label class="field">Product name<input type="text" name="product_name" maxlength="150" required></label>
      <div class="row">
        <label class="field">Brand<select name="brand_id" required><option value="">Choose</option>
          ${m.brands.map((b) => `<option value="${b.brand_id}">${esc(b.brand_name)}</option>`).join('')}</select></label>
        <label class="field">Category<select name="category" id="catSel" required><option value="">Choose</option>
          ${Object.entries(CAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      </div>
      <div class="row">
        <label class="field">Price (THB)<input type="number" name="price" min="1" step="0.01" required></label>
        <label class="field">Size (ml)<input type="number" name="volume_ml" min="1"></label>
        <label class="field">Gender<select name="gender_target">${Object.entries(TARGET).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      </div>
      <div id="subtypeBox"></div>
      <label class="field">Suitable skin types</label>
      <div class="chips">${Object.entries(SKIN).map(([k, [t]]) => `<label class="chip"><input type="checkbox" name="skin_types" value="${k}"> ${t}</label>`).join('')}</div>
      <label class="field">Helps with (effectiveness 1-3)</label>
      ${m.concerns.map((c) => `<div class="sev"><span>${esc(c.name_th)}</span>
        <select class="mini" name="concern_${c.concern_id}"><option value="">-</option><option>1</option><option>2</option><option>3</option></select></div>`).join('')}
      <label class="field">Ingredients (choose several, add % if known)</label>
      <div id="ingRows"></div>
      <button type="button" class="btn small light" id="addIng" style="margin-top:6px">+ Add ingredient</button>
      <button class="btn" type="submit">Save product</button>
    </form>`;

  const ingOptions = m.ingredients.map((i) => `<option value="${i.ingredient_id}">${esc(i.ingredient_name)}${i.is_allergen ? ' ⚠' : ''}</option>`).join('');
  const addIng = () => {
    const div = document.createElement('div');
    div.className = 'row'; div.style.marginTop = '6px';
    div.innerHTML = `<select class="ing"><option value="">Choose an ingredient</option>${ingOptions}</select>
      <input type="number" class="pct" placeholder="%" step="0.01" min="0" max="100" style="flex:0 0 90px">`;
    document.getElementById('ingRows').appendChild(div);
  };
  addIng(); addIng();
  document.getElementById('addIng').onclick = addIng;

  const sub = document.getElementById('subtypeBox');
  document.getElementById('catSel').onchange = (e) => {
    const c = e.target.value;
    if (c === 'moisturizer') sub.innerHTML = `<div class="row">
      <label class="field">Texture<select name="texture"><option>gel</option><option>lotion</option><option>cream</option><option>balm</option></select></label>
      <label class="field">Finish<select name="finish"><option>matte</option><option>natural</option><option>dewy</option></select></label></div>`;
    else if (c === 'serum') sub.innerHTML = `<div class="row">
      <label class="field">Key active<input type="text" name="key_active" maxlength="100"></label>
      <label class="field">Active %<input type="number" name="active_percent" step="0.01" min="0" max="100"></label></div>`;
    else if (c === 'sunscreen') sub.innerHTML = `<div class="row">
      <label class="field">SPF<input type="number" name="spf" min="1" max="100"></label>
      <label class="field">PA<select name="pa_rating"><option>PA+</option><option>PA++</option><option>PA+++</option><option selected>PA++++</option></select></label>
      <label class="field">Filter<select name="filter_type"><option>chemical</option><option>physical</option><option>hybrid</option></select></label></div>`;
    else sub.innerHTML = '';
  };

  document.getElementById('addForm').onsubmit = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const g = (k) => fd.get(k);
    const body = {
      product_name: g('product_name'), brand_id: Number(g('brand_id')), category: g('category'),
      price: Number(g('price')), volume_ml: g('volume_ml') ? Number(g('volume_ml')) : null, gender_target: g('gender_target'),
      skin_types: fd.getAll('skin_types'),
      concerns: m.concerns.filter((c) => g('concern_' + c.concern_id)).map((c) => ({ concern_id: c.concern_id, effectiveness_level: Number(g('concern_' + c.concern_id)) })),
      ingredients: [...document.querySelectorAll('#ingRows .row')]
        .map((row) => ({ ingredient_id: Number(row.querySelector('.ing').value), concentration_percent: row.querySelector('.pct').value }))
        .filter((i) => i.ingredient_id),
      subtype: { texture: g('texture'), finish: g('finish'), key_active: g('key_active'), active_percent: g('active_percent'),
        spf: g('spf') ? Number(g('spf')) : null, pa_rating: g('pa_rating'), filter_type: g('filter_type') }
    };
    const r = await api('POST', '/admin/products', body);
    if (!r.ok) return toast(r.data.error, true);
    toast(`Product #${r.data.product_id} added`);
    go('product', r.data.product_id);
  };
}

// ---------------------------------------------------------------------------
// Start-up and global clicks
// ---------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-go]');
  if (!el) return;
  e.preventDefault();
  if (['catalog', 'reco'].includes(state.view)) state.prevView = state.view;
  go(el.dataset.go);
});
// remember where the product page should go back to
const _go = go;
go = function (view, id) {
  if (view === 'product' && state.view !== 'product') state.prevView = state.view;
  return _go(view, id);
};
document.getElementById('userBtn').onclick = () => (state.user ? logout() : go('login'));
document.getElementById('logBtn').onclick = () => { const p = document.getElementById('logPanel'); p.hidden = !p.hidden; };
document.getElementById('logClose').onclick = () => { document.getElementById('logPanel').hidden = true; };

(async function start() {
  const [me, meta] = await Promise.all([api('GET', '/auth/me'), api('GET', '/meta')]);
  if (!meta.ok) {
    $view.innerHTML = `<div class="empty">Cannot connect to the database<br><small>${esc(meta.data.error)}</small><br><br>
      Check that MySQL is running and that sql/01-04 have been run</div>`;
    return;
  }
  state.meta = meta.data;
  state.user = me.ok ? me.data.user : null;
  updateUserUI();
  if (state.user) await loadProfile();
  go('catalog');
})();
