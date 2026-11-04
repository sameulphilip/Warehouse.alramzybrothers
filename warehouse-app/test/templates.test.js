const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../catalog/templates');

const site = {
  baseUrl: 'https://catalog.example', buildId: 'b1', year: 2026, whatsapp: '201001234567', phone: '0222',
  address: { ar: 'القاهرة', en: 'Cairo' }, about: { ar: 'نبذة', en: 'About' },
  name: { ar: 'الرمزي إخوان', en: 'Al Ramzy Brothers' }, logo: '/assets/logo.png'
};

const product = {
  id: 7212, name: 'مروحة <أكتروس>', description: 'سطر 1\n\nسطر 2', images: ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'],
  brandId: 'b1', sectionId: 's1', brandName: 'أكتروس', sectionName: 'تبريد', featured: true, updatedAt: '',
  partNumber: 'PN-1', available: true
};

test('productPage escapes text and shows only present fields', () => {
  const html = T.productPage('ar', site, product, []);
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /مروحة &lt;أكتروس&gt;/);
  assert.doesNotMatch(html, /مروحة <أكتروس>/);
  assert.match(html, /PN-1/);
  assert.match(html, /متوفر/);
  assert.doesNotMatch(html, /المنشأ والماركة/);
  assert.match(html, /data-thumb="1"/);
  assert.match(html, /<p>سطر 1<\/p><p>سطر 2<\/p>/);
  assert.match(html, /href="\/en\/p\/7212\/"/);
});

test('productPage omits hidden part number and availability', () => {
  const { partNumber, available, ...hidden } = product;
  const html = T.productPage('en', site, hidden, []);
  assert.match(html, /dir="ltr"/);
  assert.doesNotMatch(html, /PN-1/);
  assert.doesNotMatch(html, /In stock|Out of stock/);
  assert.match(html, /data-part=""/);
});

test('allPage renders filter controls and one card per product', () => {
  const html = T.allPage('ar', site, { products: [product], brands: [{ id: 'b1', name: 'أكتروس', count: 1, image: '' }], sections: [] });
  assert.match(html, /data-filters/);
  assert.match(html, /<option value="b1">أكتروس<\/option>/);
  assert.equal((html.match(/data-card /g) || []).length, 1);
});

test('homePage hides WhatsApp buttons when no number is set', () => {
  const html = T.homePage('ar', { ...site, whatsapp: '' }, { brands: [], sections: [], featured: [], total: 0 });
  assert.doesNotMatch(html, /wa\.me/);
});

test('templates escape hostile ids and urls in attributes', () => {
  const hostileSite = { ...site, baseUrl: 'https://c.test" onload="x' };
  const hostileProduct = {
    ...product,
    id: '1" onfocus="alert(1)',
    images: ['x" onerror="alert(1)'],
    brandId: 'b" x="1',
  };
  for (const html of [
    T.productPage('ar', hostileSite, hostileProduct, [hostileProduct]),
    T.allPage('ar', hostileSite, {
      products: [hostileProduct],
      brands: [{ id: hostileProduct.brandId, name: 'B', count: 1, image: hostileProduct.images[0] }],
      sections: [],
    }),
  ]) {
    assert.doesNotMatch(html, /" onfocus="/);
    assert.doesNotMatch(html, /" onerror="/);
    assert.doesNotMatch(html, /" onload="/);
    assert.doesNotMatch(html, /" x="1/);
    assert.match(html, /&quot;/);
  }
});

test('listPage and notFoundPage render escaped titles', () => {
  const html = T.listPage('en', site, { title: '<b>Volvo</b>', path: '/brand/b1/', products: [product] });
  assert.match(html, /&lt;b&gt;Volvo&lt;\/b&gt;/);
  assert.match(html, /dir="ltr"/);
  assert.equal((html.match(/data-card /g) || []).length, 1);

  const nf = T.notFoundPage('ar', site);
  assert.match(nf, /الصفحة مش موجودة/);
  assert.match(nf, /href="\/ar\/"/);
});

test('productPage request drawer is an accessible dialog', () => {
  const html = T.productPage('ar', site, product, []);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-label="إغلاق"/);
});
test('notFoundPage is noindex and has no canonical or hreflang links', () => {
  const nf = T.notFoundPage('ar', site);
  assert.match(nf, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(nf, /rel="canonical"/);
  assert.doesNotMatch(nf, /hreflang="(ar|en)" href=/);
  assert.doesNotMatch(nf, /property="og:url"/);
  const home = T.homePage('ar', site, { brands: [], sections: [], featured: [], total: 0 });
  assert.match(home, /rel="canonical"/);
  assert.doesNotMatch(home, /name="robots"/);
});
