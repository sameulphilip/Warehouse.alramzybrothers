const fs = require('fs');
const path = require('path');
const T = require('./templates');

const ASSETS = path.join(__dirname, 'assets');
const LANGS = ['ar', 'en'];

function pick(entry, lang, ar, en) {
  return lang === 'en' ? (entry[en] || entry[ar] || '') : (entry[ar] || '');
}

function viewModel(catalog, products, availability, lang) {
  const brands = new Map(catalog.brands.map((entry) => [entry.id, entry]));
  const sections = new Map(catalog.sections.map((entry) => [entry.id, entry]));
  const list = [];
  for (const item of Object.values(catalog.items)) {
    if (!item.published) continue;
    const product = products.get(Number(item.productId));
    if (!product) continue;
    const nameAr = item.nameAr || product.name;
    const brand = brands.get(item.brandId);
    const section = sections.get(item.sectionId);
    const view = {
      id: Number(item.productId),
      name: lang === 'en' ? (item.nameEn || nameAr) : nameAr,
      description: pick(item, lang, 'descriptionAr', 'descriptionEn'),
      images: (item.images || []).slice(0, 5),
      brandId: brand ? brand.id : '',
      sectionId: section ? section.id : '',
      brandName: brand ? pick(brand, lang, 'nameAr', 'nameEn') : '',
      sectionName: section ? pick(section, lang, 'nameAr', 'nameEn') : '',
      featured: Boolean(item.featured),
      updatedAt: item.updatedAt || ''
    };
    if (item.showPartNumber) view.partNumber = item.partNumber || product.code || '';
    if (item.showOrigin) view.origin = pick(item, lang, 'originAr', 'originEn');
    if (item.showFits) view.fits = pick(item, lang, 'fitsAr', 'fitsEn');
    if (item.showAvailability) view.available = Boolean(availability.get(Number(item.productId)));
    list.push(view);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, lang));
}

function taxonomy(entries, list, key, lang) {
  return entries.slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((entry) => {
      const members = list.filter((p) => p[key] === entry.id);
      const withImage = members.find((p) => p.images.length);
      return { id: entry.id, name: pick(entry, lang, 'nameAr', 'nameEn'), count: members.length, image: withImage ? withImage.images[0] : '' };
    })
    .filter((entry) => entry.count > 0);
}

function siteInfo(catalog, baseUrl, now) {
  const c = catalog.company;
  return {
    baseUrl,
    buildId: now.getTime().toString(36),
    year: now.getFullYear(),
    whatsapp: c.whatsapp || '',
    phone: c.phone || '',
    address: { ar: c.addressAr || '', en: c.addressEn || c.addressAr || '' },
    about: { ar: c.aboutAr || T.LABELS.ar.tagline, en: c.aboutEn || T.LABELS.en.tagline },
    name: { ar: T.LABELS.ar.company, en: T.LABELS.en.company },
    logo: c.logoId ? `/media/${c.logoId}-sm.webp` : '/assets/logo.png'
  };
}

function swapInto(temp, siteDir) {
  const old = `${siteDir}.old-${Date.now()}`;
  if (fs.existsSync(siteDir)) fs.renameSync(siteDir, old);
  fs.renameSync(temp, siteDir);
  fs.rmSync(old, { recursive: true, force: true });
}

async function buildSite({ catalog, products, availability, mediaDir, siteDir, baseUrl, logoFallback, now = new Date() }) {
  const site = siteInfo(catalog, baseUrl, now);
  const temp = `${siteDir}.building-${site.buildId}`;
  fs.rmSync(temp, { recursive: true, force: true });
  const write = (rel, content) => {
    const file = path.join(temp, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const urls = [];
  const media = new Set(catalog.company.logoId ? [catalog.company.logoId] : []);
  let total = 0;
  try {
    for (const lang of LANGS) {
      const list = viewModel(catalog, products, availability, lang);
      total = list.length;
      list.forEach((p) => p.images.forEach((id) => media.add(id)));
      const brands = taxonomy(catalog.brands, list, 'brandId', lang);
      const sections = taxonomy(catalog.sections, list, 'sectionId', lang);
      const featured = list.filter((p) => p.featured);
      const highlight = (featured.length ? featured : list.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))).slice(0, 8);
      write(`${lang}/index.html`, T.homePage(lang, site, { brands, sections, featured: highlight, total: list.length }));
      urls.push(`/${lang}/`);
      write(`${lang}/products/index.html`, T.allPage(lang, site, { products: list, brands, sections }));
      urls.push(`/${lang}/products/`);
      for (const brand of brands) {
        write(`${lang}/brand/${brand.id}/index.html`, T.listPage(lang, site, { title: brand.name, path: `/brand/${brand.id}/`, products: list.filter((p) => p.brandId === brand.id) }));
        urls.push(`/${lang}/brand/${brand.id}/`);
      }
      for (const section of sections) {
        write(`${lang}/section/${section.id}/index.html`, T.listPage(lang, site, { title: section.name, path: `/section/${section.id}/`, products: list.filter((p) => p.sectionId === section.id) }));
        urls.push(`/${lang}/section/${section.id}/`);
      }
      for (const p of list) {
        const similar = p.sectionId
          ? list.filter((x) => x.id !== p.id && x.sectionId === p.sectionId).slice(0, 8).map(({ available, ...s }) => s)
          : [];
        write(`${lang}/p/${p.id}/index.html`, T.productPage(lang, site, p, similar));
        urls.push(`/${lang}/p/${p.id}/`);
      }
    }
    write('index.html', `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/ar/"><link rel="canonical" href="${baseUrl}/ar/"><title>${T.esc(site.name.ar)}</title></head><body><a href="/ar/">${T.esc(site.name.ar)}</a></body></html>`);
    write('404.html', T.notFoundPage('ar', site));
    write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${baseUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
    fs.mkdirSync(path.join(temp, 'assets'), { recursive: true });
    for (const name of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, name), path.join(temp, 'assets', name));
    fs.copyFileSync(logoFallback, path.join(temp, 'assets', 'logo.png'));
    fs.mkdirSync(path.join(temp, 'media'), { recursive: true });
    for (const id of media) {
      for (const size of ['lg', 'sm']) {
        const from = path.join(mediaDir, `${id}-${size}.webp`);
        if (fs.existsSync(from)) fs.copyFileSync(from, path.join(temp, 'media', `${id}-${size}.webp`));
      }
    }
    swapInto(temp, siteDir);
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw error;
  }
  return { buildId: site.buildId, products: total, pages: urls.length };
}

module.exports = { buildSite, viewModel };
