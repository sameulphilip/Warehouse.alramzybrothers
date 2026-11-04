const LABELS = {
  ar: {
    dir: 'rtl', otherLabel: 'English', home: 'الرئيسية', all: 'كل الأصناف', brands: 'الماركات', sections: 'الأقسام',
    featured: 'أصناف مميزة', contact: 'تواصل معنا', search: 'ابحث بالاسم أو رقم القطعة', allBrands: 'كل الماركات',
    allSections: 'كل الأقسام', partNumber: 'رقم القطعة', origin: 'المنشأ والماركة', fits: 'بيركب على',
    available: 'متوفر', unavailable: 'غير متوفر', ask: 'اسأل على واتساب', add: 'أضف لقائمة الطلب',
    added: 'اتضاف لقائمة الطلب', similar: 'أصناف من نفس القسم', request: 'قائمة الطلب',
    send: 'ابعت الطلب على واتساب', empty: 'القائمة فاضية', qty: 'الكمية', remove: 'حذف',
    noResults: 'مفيش أصناف مطابقة', products: 'صنف', call: 'اتصل بنا', address: 'العنوان',
    notFound: 'الصفحة مش موجودة', backHome: 'رجوع للرئيسية', close: 'إغلاق', company: 'الرمزي إخوان',
    tagline: 'تجارة واستيراد قطع غيار النقل الثقيل', code: 'الكود', specs: 'المواصفات الفنية',
    details: 'التفاصيل', print: 'طباعة الكتالوج'
  },
  en: {
    dir: 'ltr', otherLabel: 'العربية', home: 'Home', all: 'All products', brands: 'Brands', sections: 'Categories',
    featured: 'Featured products', contact: 'Contact us', search: 'Search by name or part number', allBrands: 'All brands',
    allSections: 'All categories', partNumber: 'Part number', origin: 'Origin & make', fits: 'Fits',
    available: 'In stock', unavailable: 'Out of stock', ask: 'Ask on WhatsApp', add: 'Add to request list',
    added: 'Added to request list', similar: 'More from this category', request: 'Request list',
    send: 'Send request on WhatsApp', empty: 'Your list is empty', qty: 'Qty', remove: 'Remove',
    noResults: 'No matching products', products: 'products', call: 'Call us', address: 'Address',
    notFound: 'Page not found', backHome: 'Back to home', close: 'Close', company: 'Al Ramzy Brothers',
    tagline: 'Heavy truck spare parts — trading and import', code: 'Code', specs: 'Technical specifications',
    details: 'Details', print: 'Print catalog'
  }
};

const ICON_LIST = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5h10M9 12h10M9 19h10"/><path d="M4 5h.01M4 12h.01M4 19h.01"/></svg>';
const ICON_PRINT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="20" height="20"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>';
const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function paragraphs(text) {
  return String(text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

function noImage() {
  return '<span class="noimg"><img src="/assets/logo.png" alt=""></span>';
}

function badge(lang, p) {
  if (p.available === undefined) return '';
  const L = LABELS[lang];
  return `<span class="badge ${p.available ? 'in' : 'out'}">${p.available ? L.available : L.unavailable}</span>`;
}

function card(lang, p) {
  const image = p.images[0]
    ? `<img src="/media/${esc(p.images[0])}-sm.webp" alt="${esc(p.name)}" loading="lazy" width="480" height="480">`
    : noImage();
  return `<a class="card" href="/${lang}/p/${esc(p.id)}/" data-card data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}" data-brand="${esc(p.brandId)}" data-section="${esc(p.sectionId)}"><span class="card-media">${image}</span><span class="card-body"><strong>${esc(p.name)}</strong>${p.brandName ? `<small>${esc(p.brandName)}</small>` : ''}${badge(lang, p)}</span></a>`;
}

function specValues(values) {
  return values.map((value) => `<span dir="ltr">${esc(value)}</span>`).join('');
}

function codeLabel(lang, p, fallback) {
  return p.partNumber ? `${LABELS[lang].code}: <bdi dir="ltr">${esc(p.partNumber)}</bdi>` : esc(fallback || '');
}

function sheetCard(lang, p) {
  const L = LABELS[lang];
  const href = `/${lang}/p/${esc(p.id)}/`;
  const image = p.images[0]
    ? `<img src="/media/${esc(p.images[0])}-sm.webp" alt="${esc(p.name)}" loading="lazy" width="480" height="480">`
    : noImage();
  const groups = (p.specs || []).slice(0, 6);
  const rows = groups.filter((g) => g.label).map((g) => `<dt>${esc(g.label)}</dt><dd>${specValues(g.values)}</dd>`).join('')
    + (p.origin ? `<dt>${L.origin}</dt><dd>${esc(p.origin)}</dd>` : '');
  const notes = groups.filter((g) => !g.label).map((g) => `<p class="spec-note">${specValues(g.values)}</p>`).join('');
  return `<article class="sheet-card" data-card data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}" data-brand="${esc(p.brandId)}" data-section="${esc(p.sectionId)}">
<header class="sheet-bar"><span class="sheet-code">${codeLabel(lang, p, p.sectionName)}</span><span>${esc(p.brandName || '')}</span></header>
<div class="sheet-body"><a class="sheet-media" href="${href}" tabindex="-1" aria-hidden="true">${image}</a>
<div class="sheet-info"><h3><a href="${href}">${esc(p.name)}</a></h3>${rows ? `<dl class="spec-list">${rows}</dl>` : ''}${notes}<div class="sheet-foot">${badge(lang, p)}<a class="sheet-link" href="${href}">${L.details}</a></div></div></div>
</article>`;
}

function printHead(lang, site, title) {
  return `<div class="print-head"><img src="${esc(site.logo)}" alt="" width="56" height="56"><div><strong>${esc(site.name[lang])}</strong><span>${esc(title)}</span></div></div>`;
}

function printFoot(lang, site) {
  const parts = [site.whatsapp ? `WhatsApp +${esc(site.whatsapp)}` : '', site.phone ? esc(site.phone) : '', esc(site.address[lang] || '')].filter(Boolean);
  return parts.length ? `<p class="print-foot">${parts.join(' · ')}</p>` : '';
}

function printButton(lang) {
  return `<button type="button" class="btn outline print-btn" data-print>${ICON_PRINT}${LABELS[lang].print}</button>`;
}

function tiles(lang, list, kind) {
  const L = LABELS[lang];
  return list.map((t) => `<a class="tile" href="/${lang}/${kind}/${esc(t.id)}/"><span class="media">${t.image ? `<img src="/media/${esc(t.image)}-sm.webp" alt="" loading="lazy">` : noImage()}</span><strong>${esc(t.name)}</strong><small>${t.count} ${L.products}</small></a>`).join('');
}

function footer(lang, site) {
  const L = LABELS[lang];
  const items = [];
  if (site.whatsapp) items.push(`<a href="https://wa.me/${esc(site.whatsapp)}" target="_blank" rel="noopener"><small>WhatsApp</small><strong dir="ltr">+${esc(site.whatsapp)}</strong></a>`);
  if (site.phone) items.push(`<a href="tel:${esc(site.phone.replace(/[^\d+]/g, ''))}"><small>${L.call}</small><strong dir="ltr">${esc(site.phone)}</strong></a>`);
  if (site.address[lang]) items.push(`<div><small>${L.address}</small><strong>${esc(site.address[lang])}</strong></div>`);
  const contact = items.length ? `<div class="wrap section"><h2>${L.contact}</h2><div class="contact-grid">${items.join('')}</div></div>` : '';
  return `<footer class="contact">${contact}<div class="foot">© ${site.year} ${esc(site.name[lang])}</div></footer>`;
}

function layout(lang, site, page) {
  const L = LABELS[lang];
  const other = lang === 'ar' ? 'en' : 'ar';
  const url = esc(`${site.baseUrl}/${lang}${page.path}`);
  const title = page.title ? `${page.title} | ${site.name[lang]}` : site.name[lang];
  const description = page.description || site.about[lang];
  const image = esc(page.image ? `${site.baseUrl}/media/${page.image}-lg.webp` : `${site.baseUrl}/assets/logo.png`);
  const labels = JSON.stringify({ added: L.added, empty: L.empty, qty: L.qty, remove: L.remove, partNumber: L.partNumber }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${lang}" dir="${L.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ar" href="${esc(`${site.baseUrl}/ar${page.path}`)}">
<link rel="alternate" hreflang="en" href="${esc(`${site.baseUrl}/en${page.path}`)}">`}
<meta property="og:type" content="${page.type || 'website'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${image}">
${page.noindex ? '' : `<meta property="og:url" content="${url}">
`}<meta name="theme-color" content="#1b2559">
<link rel="icon" href="/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/catalog.css?v=${esc(site.buildId)}">
</head>
<body data-lang="${lang}" data-wa="${esc(site.whatsapp)}">
<header class="top"><div class="wrap top-row">
<a class="brand" href="/${lang}/"><img src="${esc(site.logo)}" alt="${esc(site.name[lang])}" width="44" height="44"><span>${esc(site.name[lang])}</span></a>
<nav class="top-nav"><a href="/${lang}/products/">${L.all}</a><a href="/${other}${esc(page.path)}" hreflang="${other}" lang="${other}">${L.otherLabel}</a><button type="button" class="request-btn" data-open-request aria-label="${L.request}">${ICON_LIST}<span data-request-count hidden>0</span></button></nav>
</div></header>
<main>${page.body}</main>
${footer(lang, site)}
<aside id="request" class="request" hidden role="dialog" aria-modal="true" aria-labelledby="request-title" aria-label="${L.request}"><div class="request-card">
<header><h2 id="request-title">${L.request}</h2><button type="button" data-close-request aria-label="${L.close}">×</button></header>
<ul data-request-rows></ul>
<a class="btn wa" data-request-send target="_blank" rel="noopener" hidden>${ICON_WA}${L.send}</a>
</div></aside>
<dialog id="zoom"><img alt=""></dialog>
<script type="application/json" id="labels">${labels}</script>
<script src="/assets/catalog.js?v=${esc(site.buildId)}" defer></script>
</body>
</html>`;
}

function homePage(lang, site, model) {
  const L = LABELS[lang];
  const wa = site.whatsapp ? `<a class="btn wa" href="https://wa.me/${esc(site.whatsapp)}" target="_blank" rel="noopener">${ICON_WA}${L.contact}</a>` : '';
  const block = (title, inner, link) => `<section class="section"><div class="wrap"><div class="section-head"><h2>${title}</h2>${link || ''}</div>${inner}</div></section>`;
  const body = `<section class="hero"><div class="wrap hero-grid"><div class="hero-text"><h1>${esc(site.name[lang])}</h1><p>${esc(site.about[lang])}</p><div class="hero-actions"><a class="btn light" href="/${lang}/products/">${L.all}</a>${wa}</div></div><div class="hero-logo"><img src="${esc(site.logo)}" alt="${esc(site.name[lang])}" width="240" height="240"></div></div></section>
${model.brands.length ? block(L.brands, `<div class="tiles">${tiles(lang, model.brands, 'brand')}</div>`) : ''}
${model.sections.length ? block(L.sections, `<div class="tiles">${tiles(lang, model.sections, 'section')}</div>`) : ''}
${model.featured.length ? block(L.featured, `<div class="grid">${model.featured.map((p) => card(lang, p)).join('')}</div>`, `<a href="/${lang}/products/">${L.all} (${model.total})</a>`) : ''}`;
  return layout(lang, site, { path: '/', body });
}

function allPage(lang, site, model) {
  const L = LABELS[lang];
  const options = (list, all) => `<option value="">${all}</option>${list.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}`;
  const body = `<div class="wrap">${printHead(lang, site, L.all)}<header class="page-head"><nav class="crumbs"><a href="/${lang}/">${L.home}</a><span>›</span><span>${L.all}</span></nav><div class="page-title"><div><h1>${L.all}</h1><p>${model.products.length} ${L.products}</p></div>${printButton(lang)}</div></header>
<form class="filters" data-filters role="search"><input type="search" name="q" placeholder="${L.search}" aria-label="${L.search}">${model.brands.length ? `<select name="brand" aria-label="${L.brands}">${options(model.brands, L.allBrands)}</select>` : ''}${model.sections.length ? `<select name="section" aria-label="${L.sections}">${options(model.sections, L.allSections)}</select>` : ''}</form>
<div class="sheet-grid section" data-results>${model.products.map((p) => sheetCard(lang, p)).join('')}</div>
<p class="empty-note" data-no-results hidden>${L.noResults}</p>${printFoot(lang, site)}</div>`;
  return layout(lang, site, { path: '/products/', title: L.all, body });
}

function listPage(lang, site, model) {
  const L = LABELS[lang];
  const body = `<div class="wrap">${printHead(lang, site, model.title)}<header class="page-head"><nav class="crumbs"><a href="/${lang}/">${L.home}</a><span>›</span><span>${esc(model.title)}</span></nav><div class="page-title"><div><h1>${esc(model.title)}</h1><p>${model.products.length} ${L.products}</p></div>${printButton(lang)}</div></header>
<div class="sheet-grid section">${model.products.map((p) => sheetCard(lang, p)).join('')}</div>${printFoot(lang, site)}</div>`;
  return layout(lang, site, { path: model.path, title: model.title, body });
}

function productPage(lang, site, p, similar) {
  const L = LABELS[lang];
  const url = esc(`${site.baseUrl}/${lang}/p/${p.id}/`);
  const slides = p.images.length
    ? p.images.map((id, i) => `<button type="button" data-zoom="/media/${esc(id)}-lg.webp" aria-label="${esc(p.name)} ${i + 1}"><img src="/media/${esc(id)}-lg.webp" alt="${esc(p.name)}" width="1600" height="1600"${i ? ' loading="lazy"' : ''}></button>`).join('')
    : noImage();
  const thumbs = p.images.length > 1
    ? `<div class="thumbs">${p.images.map((id, i) => `<button type="button" data-thumb="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"><img src="/media/${esc(id)}-sm.webp" alt="" loading="lazy"></button>`).join('')}</div>`
    : '';
  const row = (label, cell) => `<tr><th scope="row">${label}</th><td>${cell}</td></tr>`;
  const groups = p.specs || [];
  const rows = [
    p.partNumber ? row(L.partNumber, specValues([p.partNumber])) : '',
    ...groups.filter((g) => g.label).map((g) => row(esc(g.label), specValues(g.values))),
    p.origin ? row(L.origin, esc(p.origin)) : '',
    p.fits ? row(L.fits, esc(p.fits)) : '',
    ...groups.filter((g) => !g.label).map((g) => `<tr><td colspan="2" class="spec-note">${specValues(g.values)}</td></tr>`)
  ].join('');
  const crumbs = [`<a href="/${lang}/">${L.home}</a>`, `<a href="/${lang}/products/">${L.all}</a>`];
  if (p.brandName) crumbs.push(`<a href="/${lang}/brand/${esc(p.brandId)}/">${esc(p.brandName)}</a>`);
  const ask = site.whatsapp
    ? `<a class="btn wa" data-ask data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}" data-url="${url}" href="https://wa.me/${esc(site.whatsapp)}" target="_blank" rel="noopener">${ICON_WA}${L.ask}</a>`
    : '';
  const body = `<div class="wrap"><nav class="crumbs page-crumbs">${crumbs.join('<span>›</span>')}</nav>
<div class="product"><div class="gallery"><div class="gallery-track" data-track>${slides}</div>${thumbs}</div>
<div class="info"><div class="sheet-bar"><span class="sheet-code">${codeLabel(lang, p, p.brandName)}</span><span>${esc(p.sectionName || '')}</span></div>
<h1>${esc(p.name)}</h1>
<div class="chips">${p.brandName ? `<a href="/${lang}/brand/${esc(p.brandId)}/">${esc(p.brandName)}</a>` : ''}${p.sectionName ? `<a href="/${lang}/section/${esc(p.sectionId)}/">${esc(p.sectionName)}</a>` : ''}${badge(lang, p)}</div>
${rows ? `<table class="spec-table"><caption>${L.specs}</caption><tbody>${rows}</tbody></table>` : ''}
${p.description ? `<div class="desc">${paragraphs(p.description)}</div>` : ''}
<div class="actions">${ask}<button type="button" class="btn outline" data-add data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-part="${esc(p.partNumber || '')}">${L.add}</button></div>
</div></div>
${similar.length ? `<section class="section"><h2>${L.similar}</h2><div class="grid">${similar.map((s) => card(lang, s)).join('')}</div></section>` : ''}</div>`;
  return layout(lang, site, {
    path: `/p/${p.id}/`, title: p.name, description: String(p.description || p.name).replace(/\s+/g, ' ').slice(0, 160),
    image: p.images[0], type: 'product', body
  });
}

function notFoundPage(lang, site) {
  const L = LABELS[lang];
  const body = `<div class="wrap empty-note"><h1>${L.notFound}</h1><p><a class="btn" href="/${lang}/">${L.backHome}</a></p></div>`;
  return layout(lang, site, { path: '/', title: L.notFound, body, noindex: true });
}

module.exports = { LABELS, esc, homePage, allPage, listPage, productPage, notFoundPage };
