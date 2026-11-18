function matchScore(product, profile) {
  if (product.ingredients.some(id => profile.avoid.has(id))) return 0;
  const total = profile.concerns.reduce((sum, [, severity]) => sum + severity, 0);
  const weighted = profile.concerns.reduce(
    (sum, [id, severity]) => sum + severity * (product.concerns[id] || 0), 0);
  const concernPoints = total ? 60 * weighted / (total * 3) : 30;
  const skinPoints = product.types.includes(profile.type) ? 30 : 0;
  const targetingPoints = !profile.gender || product.gender === 'unisex' ||
    product.gender === profile.gender ? 10 : 0;
  return Math.round((concernPoints + skinPoints + targetingPoints) * 100) / 100;
}

const form = document.querySelector('#profile-form');
const titleCase = value => value.charAt(0).toUpperCase() + value.slice(1);
const formatPrice = new Intl.NumberFormat('en-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
const skinTypes = [...new Set(catalog.products.flatMap(p => p.types))].sort();
for (const type of skinTypes) form.elements.type.add(new Option(titleCase(type), type));

function addField(parent, text, input, className) {
  const label = document.createElement('label');
  label.className = className;
  label.append(text, input);
  parent.append(label);
}

for (const [id, name] of Object.entries(catalog.concerns)) {
  const select = document.createElement('select');
  select.name = 'concern-' + id;
  for (const [severity, label] of ['Skip', 'Mild', 'Moderate', 'High'].entries()) {
    select.add(new Option(label, String(severity)));
  }
  addField(document.querySelector('#concerns'), name, select, 'field');
}

for (const [id, name] of Object.entries(catalog.ingredients)) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'avoid';
  checkbox.value = id;
  addField(document.querySelector('#ingredients'), name, checkbox, 'toggle chip');
}

function renderProducts(container, entries) {
  container.className = 'cards';
  container.replaceChildren();
  for (const { product, score } of entries) {
    const card = document.createElement('article');
    card.className = 'pcard';
    const body = document.createElement('div');
    body.className = 'pbody';
    const brand = document.createElement('div');
    brand.className = 'brand';
    brand.textContent = product.brand + ' · ' + titleCase(product.category);
    const name = document.createElement('div');
    name.className = 'pname';
    name.textContent = product.name;
    const details = document.createElement('details');
    const label = document.createElement('summary');
    label.textContent = 'Ingredients';
    details.append(label, product.ingredients.map(id => catalog.ingredients[id]).join(', '));
    body.append(brand, name, formatPrice.format(product.price) + ' · ' + product.size + ' mL', details);
    card.append(body);
    if (score !== undefined) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = score + '%';
      badge.setAttribute('aria-label', score + ' out of 100 match score');
      card.append(badge);
    }
    container.append(card);
  }
}

function showPage(page) {
  for (const section of document.querySelectorAll('main section')) section.hidden = section.id !== page;
  for (const button of document.querySelectorAll('nav [data-go]')) {
    const active = button.dataset.go === page;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.go));
});

const summary = document.querySelector('#match-summary');
summary.textContent = 'Choose your skin type in My Skin to see matches.';
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const profile = {
    type: data.get('type'), gender: data.get('gender'),
    avoid: new Set(data.getAll('avoid').map(Number)),
    concerns: Object.keys(catalog.concerns)
      .map(id => [id, Number(data.get('concern-' + id))]).filter(([, severity]) => severity > 0),
  };
  const excluded = catalog.products.filter(p => p.ingredients.some(id => profile.avoid.has(id))).length;
  const ranked = catalog.products.map(product => ({ product, score: matchScore(product, profile) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.id - b.product.id)
    .slice(0, 6);
  summary.textContent = ranked.length
    ? 'Showing ' + ranked.length + ' top matches. ' + excluded + ' products excluded by your ingredient filters.'
    : 'No matches for this profile. Try changing the selected ingredients or concerns.';
  renderProducts(document.querySelector('#match-list'), ranked);
  showPage('matches');
});

const search = document.querySelector('#search');
function renderCatalog() {
  const q = search.value.trim().toLowerCase();
  const products = catalog.products.filter(product =>
    [product.name, product.brand, product.category].some(value => value.toLowerCase().includes(q)));
  document.querySelector('#catalog-count').textContent = products.length + ' products';
  renderProducts(document.querySelector('#product-list'), products.map(product => ({ product })));
}
search.addEventListener('input', renderCatalog);
renderCatalog();
