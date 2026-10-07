const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icons = {
  dashboard: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  stock: svg('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'),
  products: svg('<path d="M20.6 13.4L13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1"/>'),
  newSale: svg('<path d="M6 2h9l5 5v15H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6M12 11v6M9 14h6"/>'),
  newPurchase: svg('<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.2 11h11.3l2-7H7"/><path d="M9 9h6"/>'),
  sales: svg('<path d="M6 2h9l5 5v15H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
  purchases: svg('<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.2 11h11.3l2-7H7"/>'),
  clients: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.75"/>'),
  suppliers: svg('<rect x="1" y="7" width="15" height="10" rx="1"/><path d="M16 10h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'),
  stores: svg('<path d="M3 10l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
  accounts: svg('<path d="M12 3l7 3v6c0 4.2-2.8 7.4-7 8.5C7.8 19.4 5 16.2 5 12V6l7-3z"/><path d="M9 12l2 2 4-4"/>'),
  activity: svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>'),
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>')
};
const icon = (name) => `<span class="ico">${icons[name] || ''}</span>`;

const sections = [
  { id: 'dashboard', label: 'لوحة التحكم', title: 'لوحة التحكم', subtitle: 'ملخص حي من قاعدة بيانات الفروع' },
  { id: 'stock', label: 'المخزون', title: 'المخزون حسب المخزن', subtitle: 'الرصيد الحالي لكل منتج داخل كل مخزن' },
  { id: 'products', label: 'المنتجات', title: 'المنتجات', subtitle: 'تعديل بيانات المنتج وسعر البيع، أو إضافة منتج جديد' },
  { id: 'newSale', label: 'فاتورة بيع جديدة', title: 'فاتورة بيع جديدة', subtitle: 'تسجّل الفاتورة والمخزون والقيد مثل البرنامج الأصلي' },
  { id: 'sales', label: 'فواتير البيع', title: 'فواتير البيع', subtitle: 'اضغط الفاتورة لعرض الأصناف' },
  { id: 'newPurchase', label: 'فاتورة شراء جديدة', title: 'فاتورة شراء جديدة', subtitle: 'تسجّل الفاتورة والمخزون والقيد مثل البرنامج الأصلي' },
  { id: 'purchases', label: 'فواتير الشراء', title: 'فواتير الشراء', subtitle: 'اضغط الفاتورة لعرض الأصناف' },
  { id: 'clients', label: 'العملاء', title: 'العملاء', subtitle: 'بيانات العملاء وأرقام التواصل' },
  { id: 'suppliers', label: 'الموردين', title: 'الموردين', subtitle: 'اضغط المورد لعرض كل فواتير الشراء' },
  { id: 'stores', label: 'المخازن', title: 'المخازن', subtitle: 'فروع ومخازن الشركة' },
  { id: 'activity', label: 'سجل الحركات', title: 'سجل الحركات', subtitle: 'كل حساب واللي عمله: فواتير، أسعار، وبحث' },
  { id: 'accounts', label: 'إدارة الحسابات', title: 'إدارة الحسابات', subtitle: 'حسابات الدخول وصلاحيات المديرين', admin: true }
];

const state = { section: 'dashboard', page: 1, q: '', storeId: '0', stores: [], user: null };

function visibleSections() {
  return sections.filter((section) => !section.admin || state.user?.role === 'superadmin');
}

const roleLabel = (role) => role === 'superadmin' ? 'سوبر أدمن' : 'مدير';
const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const content = document.getElementById('content');
const nav = document.getElementById('nav');
const drawer = document.getElementById('drawer');

const money = (value) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const kpiMoney = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} مليون`;
  return money(amount);
};
const num = (value) => Number(value || 0).toLocaleString('ar-EG');
const dateText = (value) => value ? new Date(value).toLocaleDateString('ar-EG') : '-';
const whenText = (value) => value ? new Date(value).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '-';
const whoText = (value) => value ? esc(value) : '—';
const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (response.status === 401 && !url.endsWith('/api/login') && !url.endsWith('/api/me')) {
    showLogin();
    throw new Error('انتهت الجلسة');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'خطأ في التحميل');
  return data;
}

function showLogin() {
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

function showApp(user) {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  state.user = user;
  document.getElementById('who').textContent = user.name || user.username;
  if (!visibleSections().some((section) => section.id === state.section)) state.section = 'dashboard';
  renderNav();
  openSection(state.section);
}

function renderNav() {
  nav.innerHTML = visibleSections().map((item) =>
    `<button type="button" data-id="${item.id}" class="${item.id === state.section ? 'active' : ''}">${icon(item.id)}<span>${item.label}</span></button>`
  ).join('');
  const open = (id) => {
    state.page = 1;
    state.q = '';
    closeMenu();
    openSection(id);
  };
  nav.querySelectorAll('button').forEach((button) => { button.onclick = () => open(button.dataset.id); });
  document.querySelectorAll('#bottomNav button[data-id]').forEach((button) => {
    const item = sections.find((section) => section.id === button.dataset.id);
    if (!button.dataset.label) button.dataset.label = button.textContent.trim();
    button.innerHTML = `${icon(item.id)}<em>${button.dataset.label}</em>`;
    button.classList.toggle('active', button.dataset.id === state.section);
    button.onclick = () => open(button.dataset.id);
  });
}

function closeMenu() {
  document.querySelector('.side').classList.remove('open');
  document.getElementById('scrim').classList.add('hidden');
}

function openMenu() {
  document.querySelector('.side').classList.add('open');
  document.getElementById('scrim').classList.remove('hidden');
}

function setHeading() {
  const item = sections.find((section) => section.id === state.section);
  document.getElementById('title').innerHTML = `${icon(item.id)}<span>${item.title}</span>`;
  document.getElementById('subtitle').textContent = item.subtitle;
}

async function openSection(id) {
  if (!visibleSections().some((section) => section.id === id)) id = 'dashboard';
  state.section = id;
  renderNav();
  setHeading();
  drawer.classList.add('hidden');
  content.innerHTML = '<div class="skeleton"><span></span><span></span><span></span><span></span></div>';
  try {
    if (id === 'dashboard') return renderDashboard(await api('/api/dashboard'));
    if (id === 'stores') return renderStores(await api('/api/stores'));
    if (!state.stores.length) state.stores = (await api('/api/stores')).stores;
    if (id === 'stock') return renderStock(await api(stockUrl()));
    if (id === 'products') return renderProducts(await api(listUrl('/api/products')));
    if (id === 'clients' || id === 'suppliers') {
      const data = await api(listUrl(`/api/${id}`));
      return renderSimple(id, data, grid(
        [
          { label: 'الاسم', width: '1.4fr' },
          { label: 'الهاتف', width: '0.9fr' },
          { label: 'الموبايل', width: '0.9fr' },
          { label: 'العنوان', width: '1.4fr' },
          { label: 'الحساب', width: '0.8fr' }
        ],
        data.rows.map((row) => ({
          clickable: id === 'suppliers',
          attrs: id === 'suppliers' ? `data-id="${row.id}" data-name="${esc(row.name)}" data-acc="${esc(row.accCode)}"` : '',
          cells: [esc(row.name), esc(row.phone), esc(row.mobile), esc(row.address), esc(row.accCode)]
        }))
      ));
    }
    if (id === 'activity') return renderActivity(await api(listUrl('/api/activity')));
    if (id === 'accounts') return renderAccounts(await api('/api/users'));
    if (id === 'newSale') {
      if (!draft.hold) resetSaleDraft();
      draft.hold = false;
      return renderNewSale();
    }
    if (id === 'newPurchase') {
      if (!purchaseDraft.hold) resetPurchaseDraft();
      purchaseDraft.hold = false;
      return renderNewPurchase();
    }
    if (id === 'sales') return renderInvoices('sales', await api(listUrl('/api/sales')), 'عميل');
    if (id === 'purchases') return renderInvoices('purchases', await api(listUrl('/api/purchases')), 'مورد');
  } catch (error) {
    content.innerHTML = `<div class="error">${esc(error.message)}</div>`;
  }
}

function listUrl(path) {
  const params = new URLSearchParams({ q: state.q, page: String(state.page), pageSize: '30' });
  return `${path}?${params}`;
}

function stockUrl() {
  const params = new URLSearchParams({ q: state.q, storeId: state.storeId, page: String(state.page), pageSize: '40' });
  return `/api/stock?${params}`;
}

function toolbar(extra = '') {
  return `<div class="toolbar">
    <input id="q" value="${esc(state.q)}" placeholder="بحث">
    ${extra}
    <button id="go" type="button">عرض</button>
  </div>`;
}

function bindSearch(reload) {
  const input = document.getElementById('q');
  const go = () => { state.q = input.value.trim(); state.page = 1; reload(); };
  document.getElementById('go').onclick = go;
  input.onkeydown = (event) => { if (event.key === 'Enter') go(); };
}

function pager(total) {
  const pages = Math.max(1, Math.ceil(total / 30));
  return `<div class="meta"><span>${num(total)} سجل</span><span>صفحة ${state.page} من ${pages}</span></div>
    <div class="pager">
      <button type="button" id="prev" ${state.page <= 1 ? 'disabled' : ''}>السابق</button>
      <button type="button" id="next" ${state.page >= pages ? 'disabled' : ''}>التالي</button>
    </div>`;
}

function bindPager(total, reload) {
  const pages = Math.max(1, Math.ceil(total / 30));
  document.getElementById('prev').onclick = () => { if (state.page > 1) { state.page -= 1; reload(); } };
  document.getElementById('next').onclick = () => { if (state.page < pages) { state.page += 1; reload(); } };
}

function grid(columns, rows) {
  const head = columns.map((column) => `<span>${column.label}</span>`).join('');
  const body = rows.length
    ? rows.map((row) => {
      const cells = columns.map((column, index) =>
        `<span data-label="${column.label}" class="${row.classes?.[index] || ''}">${row.cells[index]}</span>`
      ).join('');
      return `<div class="data-row${row.clickable ? ' clickable' : ''}${row.card ? ' product-card' : ''}" ${row.attrs || ''}>${cells}</div>`;
    }).join('')
    : '<div class="empty">لا توجد نتائج</div>';
  return `<div class="data" style="--cols:${columns.map((column) => column.width).join(' ')}"><div class="data-head">${head}</div>${body}</div>`;
}

function bindRows(reloadKind) {
  content.querySelectorAll('.data-row.clickable').forEach((row) => {
    row.onclick = () => openInvoice(reloadKind, row.dataset.id);
  });
}
function renderDashboard(data) {
  const cards = [
    ['products', 'المنتجات', data.counts.products, false],
    ['clients', 'العملاء', data.counts.clients, false],
    ['suppliers', 'الموردين', data.counts.suppliers, false],
    ['sales', 'فواتير البيع', data.counts.sales, false],
    ['purchases', 'فواتير الشراء', data.counts.purchases, false],
    ['stores', 'المخازن', data.counts.stores, false],
    ['sales', 'متبقي بيع', data.counts.salesDue, true],
    ['purchases', 'متبقي شراء', data.counts.purchaseDue, true]
  ];
  const recent = grid(
    [
      { label: 'الرقم', width: '0.6fr' },
      { label: 'التاريخ', width: '0.8fr' },
      { label: 'العميل', width: '1.3fr' },
      { label: 'المستخدم', width: '0.9fr' },
      { label: 'الإجمالي', width: '0.8fr' },
      { label: 'المتبقي', width: '0.8fr' }
    ],
    data.recentSales.map((row) => ({
      clickable: true,
      attrs: `data-id="${row.id}"`,
      cells: [row.no, dateText(row.date), esc(row.name), whoText(row.byName), money(row.total), money(row.due)],
      classes: ['', '', '', '', '', Number(row.due) > 0 ? 'due' : 'ok']
    }))
  );
  content.innerHTML = `<div class="kpis">${cards.map(([iconName, label, value, isMoney], index) =>
    `<article class="kpi" style="animation-delay:${index * 45}ms"><span class="kpi-mark">${icon(iconName)}</span><span>${label}</span><strong>${isMoney ? kpiMoney(value) : num(value)}</strong></article>`
  ).join('')}</div>
  <section class="panel"><h3>${icon('sales')}<span>آخر فواتير البيع</span></h3>${recent}</section>`;
  bindRows('sales');
}

const productTypes = [
  { id: 0, name: 'سلعة' },
  { id: 1, name: 'خدمة' },
  { id: 2, name: 'مجموعة' }
];
const productPhases = [
  { id: 5, name: 'منتج كامل' },
  { id: 1, name: 'خام ليس للبيع' },
  { id: 2, name: 'خام يمكن بيعه' },
  { id: 3, name: 'تحت التصنيع ليس للبيع' },
  { id: 4, name: 'تحت التصنيع يمكن بيعه' }
];

function renderProducts(data) {
  const rows = grid(
    [
      { label: 'المنتج', width: '1.7fr' },
      { label: 'الكود', width: '0.8fr' },
      { label: 'سعر البيع', width: '0.7fr' },
      { label: 'سعر الشراء', width: '0.7fr' },
      { label: 'الرصيد', width: '0.55fr' },
      { label: 'حد الطلب', width: '0.55fr' }
    ],
    data.rows.map((row) => ({
      clickable: true,
      card: true,
      attrs: `data-id="${row.id}"`,
      cells: [esc(row.name), esc(row.code), money(row.salePrice), money(row.buyPrice), num(row.stock), num(row.reorderLevel)],
      classes: ['', '', '', '', Number(row.stock) < 0 ? 'neg' : '', '']
    }))
  );
  content.innerHTML = `${toolbar('<button id="addProduct" type="button">منتج جديد</button>')}${rows}${pager(data.total)}`;
  bindSearch(() => openSection('products'));
  bindPager(data.total, () => openSection('products'));
  document.getElementById('addProduct').onclick = () => openProductForm(null);
  content.querySelectorAll('.data-row.clickable').forEach((row) => {
    row.onclick = () => openProductForm(row.dataset.id);
  });
}

function field(label, control, wide) {
  return `<label class="${wide ? 'wide' : ''}">${label}${control}</label>`;
}

async function openProductForm(id) {
  let loaded = null;
  let inquiries = [];
  if (id) {
    try {
      const data = await api('/api/products/' + id);
      loaded = data.product;
      inquiries = data.inquiries || [];
    } catch (error) {
      content.insertAdjacentHTML('afterbegin', `<div class="error">${esc(error.message)}</div>`);
      return;
    }
  }
  const product = loaded || {
    code: '', name: '', productType: 0, phaseId: 5, salePrice: 0, buyPrice: 0, openingCost: 0,
    salesTax: 0, priceIncludesTax: false, reorderLevel: 0, warrantyMonths: 0,
    weight: 0, requireSerial: false, requireExpiry: false, stock: 0, unitName: ''
  };
  const phases = Number(product.phaseId) === 0 ? [{ id: 0, name: 'غير محدد' }, ...productPhases] : productPhases;
  const options = (list, selected) => list.map((item) =>
    `<option value="${item.id}" ${Number(item.id) === Number(selected) ? 'selected' : ''}>${item.name}</option>`
  ).join('');
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet">
    <header>
      <div><h2>${id ? 'تعديل المنتج' : 'منتج جديد'}</h2><p>${id ? esc(product.code) + ' · ' + esc(product.name) : 'يُحفظ في دليل المنتجات وقائمة سعر البيع'}</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    <form id="productForm" class="form-grid">
      ${id ? '<button id="saleHistory" class="history-btn wide" type="button">تاريخ البيع</button><button id="buyHistory" class="history-btn wide" type="button">تاريخ الشراء</button>' : ''}
      ${id ? `<div class="wide note"><strong>استعلامات السعر</strong>${inquiries.map((row) => `<div>${esc(row.name)} · ${whenText(row.at)}</div>`).join('') || '<div>لا يوجد</div>'}</div>` : ''}
      ${field('الكود', `<input id="pCode" value="${esc(product.code)}" maxlength="50">`)}
      ${field('اسم المنتج', `<input id="pName" value="${esc(product.name)}" maxlength="100" required>`, true)}
      ${field('النوع', `<select id="pType">${options(productTypes, product.productType)}</select>`)}
      ${field('المرحلة', `<select id="pPhase">${options(phases, product.phaseId)}</select>`)}
      ${field('سعر البيع', `<input id="pPrice" type="number" min="0" step="0.01" value="${Number(product.salePrice)}">`)}
      ${field('سعر الشراء', `<input id="pBuy" type="number" min="0" step="0.01" value="${Number(product.buyPrice || 0)}">`)}
      ${field('تكلفة أول المدة', `<input id="pCost" type="number" min="0" step="0.01" value="${Number(product.openingCost)}">`)}
      ${field('ضريبة المبيعات', `<input id="pTax" type="number" min="0" step="0.01" value="${Number(product.salesTax)}">`)}
      ${field('حد الطلب', `<input id="pReorder" type="number" min="0" step="0.01" value="${Number(product.reorderLevel)}">`)}
      ${field('الضمان بالشهر', `<input id="pWarranty" type="number" min="0" step="1" value="${Number(product.warrantyMonths)}">`)}
      ${field('الوزن', `<input id="pWeight" type="number" min="0" step="0.01" value="${Number(product.weight)}">`)}
      ${field('السعر شامل الضريبة', `<span class="checkline"><input id="pTaxIncluded" type="checkbox" ${product.priceIncludesTax ? 'checked' : ''}> شامل</span>`)}
      ${field('الوحدة', `<input value="${esc(product.unitName || 'غير محدد')}" readonly>`)}
      ${id ? field('الرصيد الحالي', `<input value="${num(product.stock)}" readonly>`, true) : ''}
      ${field('يتطلب رقم مسلسل', `<span class="checkline"><input id="pSerial" type="checkbox" ${product.requireSerial ? 'checked' : ''}> نعم</span>`)}
      ${field('يتطلب تاريخ صلاحية', `<span class="checkline"><input id="pExpiry" type="checkbox" ${product.requireExpiry ? 'checked' : ''}> نعم</span>`)}
      <div class="wide actions">
        <button type="submit">${id ? 'حفظ التعديل' : 'إضافة المنتج'}</button>
        <button id="closeDrawer2" class="ghost" type="button">إلغاء</button>
      </div>
    </form>
    <p class="note">سعر البيع وسعر الشراء هما السعران الأساسيان في البرنامج. الرصيد يتغير من الفواتير فقط.</p>
    <div id="productError" class="error"></div>
  </article>`;
  const close = () => drawer.classList.add('hidden');
  document.getElementById('closeDrawer').onclick = close;
  document.getElementById('closeDrawer2').onclick = close;
  if (id) {
    document.getElementById('saleHistory').onclick = () => openProductHistory('sales', id, product);
    document.getElementById('buyHistory').onclick = () => openProductHistory('purchases', id, product);
  }
  drawer.onclick = (event) => { if (event.target === drawer) close(); };
  document.getElementById('productForm').onsubmit = async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const error = document.getElementById('productError');
    error.textContent = '';
    button.disabled = true;
    const payload = {
      code: document.getElementById('pCode').value.trim(),
      name: document.getElementById('pName').value.trim(),
      productType: Number(document.getElementById('pType').value),
      phaseId: Number(document.getElementById('pPhase').value),
      salePrice: Number(document.getElementById('pPrice').value),
      buyPrice: Number(document.getElementById('pBuy').value),
      openingCost: Number(document.getElementById('pCost').value),
      salesTax: Number(document.getElementById('pTax').value),
      reorderLevel: Number(document.getElementById('pReorder').value),
      warrantyMonths: Number(document.getElementById('pWarranty').value),
      weight: Number(document.getElementById('pWeight').value),
      priceIncludesTax: document.getElementById('pTaxIncluded').checked,
      requireSerial: document.getElementById('pSerial').checked,
      requireExpiry: document.getElementById('pExpiry').checked
    };
    try {
      const result = await api(id ? '/api/products/' + id : '/api/products', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      close();
      if (!id) {
        state.page = 1;
        state.q = result.code || payload.code;
      }
      await openSection('products');
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  };
}

async function openProductHistory(kind, id, product, page = 1) {
  const view = kind === 'purchases'
    ? { title: 'تاريخ الشراء', party: 'المورد', empty: 'لا توجد مشتريات لهذا المنتج', unit: 'عملية شراء' }
    : { title: 'تاريخ البيع', party: 'العميل', empty: 'لا توجد مبيعات لهذا المنتج', unit: 'عملية بيع' };
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet"><header><div><h2>${view.title}</h2><p>${esc(product.code)} · ${esc(product.name)}</p></div><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="skeleton"><span></span><span></span><span></span></div></article>`;
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  try {
    const data = await api(`/api/products/${id}/${kind}?page=${page}&pageSize=20`);
    const pages = Math.max(1, Math.ceil(data.total / 20));
    const rows = grid(
      [
        { label: 'التاريخ', width: '0.8fr' },
        { label: view.party, width: '1.2fr' },
        { label: 'المستخدم', width: '0.9fr' },
        { label: 'الكمية', width: '0.5fr' },
        { label: 'السعر', width: '0.6fr' },
        { label: 'الفاتورة', width: '0.5fr' }
      ],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}"`,
        cells: [dateText(row.date), esc(row.name), whoText(row.byName), num(row.qty), money(row.price), row.no]
      }))
    );
    drawer.innerHTML = `<article class="sheet">
      <header>
        <div><h2>${view.title}</h2><p>${esc(product.code)} · ${esc(product.name)}</p></div>
        <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
      </header>
      <p class="meta"><span>${num(data.total)} ${view.unit}</span></p>
      ${data.rows.length ? rows : `<div class="empty">${view.empty}</div>`}
      <div class="pager">
        <button type="button" id="histPrev" ${page <= 1 ? 'disabled' : ''}>السابق</button>
        <button type="button" id="histNext" ${page >= pages ? 'disabled' : ''}>التالي</button>
      </div>
      <button id="backProduct" class="ghost" type="button">رجوع للمنتج</button>
    </article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
    document.getElementById('backProduct').onclick = () => openProductForm(id);
    document.getElementById('histPrev').onclick = () => { if (page > 1) openProductHistory(kind, id, product, page - 1); };
    document.getElementById('histNext').onclick = () => { if (page < pages) openProductHistory(kind, id, product, page + 1); };
    drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
    drawer.querySelectorAll('.data-row.clickable').forEach((row) => {
      row.onclick = () => openInvoice(kind, row.dataset.id);
    });
  } catch (error) {
    drawer.innerHTML = `<article class="sheet"><header><h2>${view.title}</h2><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="error">${esc(error.message)}</div></article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  }
}

function renderAccounts(data) {
  const rows = grid(
    [
      { label: 'الاسم', width: '1.3fr' },
      { label: 'اسم الدخول', width: '1fr' },
      { label: 'الصلاحية', width: '0.9fr' },
      { label: 'الحالة', width: '0.7fr' }
    ],
    data.users.map((user) => ({
      clickable: true,
      attrs: `data-id="${esc(user.id)}"`,
      cells: [esc(user.name), esc(user.username), roleLabel(user.role), user.active ? 'نشط' : 'موقوف'],
      classes: ['', '', '', user.active ? 'ok' : 'due']
    }))
  );
  content.innerHTML = `<div class="toolbar"><button id="addAccount" type="button">حساب جديد</button></div>${rows}<p class="note">قسم الحسابات ظاهر لصاحب النظام فقط. المدير يقدر يستخدم المخزون والفواتير من غير ما يدير الحسابات.</p>`;
  document.getElementById('addAccount').onclick = () => openAccountForm(null);
  content.querySelectorAll('.data-row.clickable').forEach((row) => {
    const user = data.users.find((item) => item.id === row.dataset.id);
    row.onclick = () => openAccountForm(user);
  });
}

function openAccountForm(user) {
  const creating = !user;
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet">
    <header>
      <div><h2>${creating ? 'حساب جديد' : 'تعديل الحساب'}</h2><p>${creating ? 'مدير فرع أو سوبر أدمن' : esc(user.username)}</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    <form id="accountForm" class="form-grid">
      ${creating ? field('اسم الدخول', `<input id="aUser" maxlength="32" autocomplete="off" required>`) : field('اسم الدخول', `<input value="${esc(user.username)}" readonly>`)}
      ${field('الاسم', `<input id="aName" maxlength="60" value="${esc(user?.name || '')}" required>`, true)}
      ${field('الصلاحية', `<select id="aRole"><option value="manager" ${user?.role === 'superadmin' ? '' : 'selected'}>مدير</option><option value="superadmin" ${user?.role === 'superadmin' ? 'selected' : ''}>سوبر أدمن</option></select>`)}
      ${field(creating ? 'كلمة السر' : 'كلمة سر جديدة', `<input id="aPassword" type="password" minlength="8" autocomplete="new-password" ${creating ? 'required' : ''} placeholder="${creating ? '' : 'اتركها فارغة للإبقاء على الحالية'}">`)}
      ${creating ? '' : field('الحالة', `<span class="checkline"><input id="aActive" type="checkbox" ${user.active ? 'checked' : ''}> نشط</span>`)}
      <div class="wide actions">
        <button type="submit">${creating ? 'إضافة الحساب' : 'حفظ'}</button>
        <button id="closeDrawer2" class="ghost" type="button">إلغاء</button>
      </div>
    </form>
    <div id="accountError" class="error"></div>
  </article>`;
  const close = () => drawer.classList.add('hidden');
  document.getElementById('closeDrawer').onclick = close;
  document.getElementById('closeDrawer2').onclick = close;
  drawer.onclick = (event) => { if (event.target === drawer) close(); };
  document.getElementById('accountForm').onsubmit = async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const error = document.getElementById('accountError');
    error.textContent = '';
    button.disabled = true;
    const payload = {
      name: document.getElementById('aName').value.trim(),
      role: document.getElementById('aRole').value,
      password: document.getElementById('aPassword').value
    };
    if (creating) payload.username = document.getElementById('aUser').value.trim();
    else payload.active = document.getElementById('aActive').checked;
    try {
      const result = await api(creating ? '/api/users' : '/api/users/' + user.id, {
        method: creating ? 'POST' : 'PUT',
        body: JSON.stringify(payload)
      });
      if (result.user && state.user && result.user.id === state.user.id) {
        state.user = result.user;
        document.getElementById('who').textContent = result.user.name;
      }
      close();
      await openSection('accounts');
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  };
}

function renderActivity(data) {
  const rows = grid(
    [
      { label: 'الوقت', width: '0.9fr' },
      { label: 'المستخدم', width: '0.8fr' },
      { label: 'الحركة', width: '2fr' }
    ],
    data.rows.map((row) => ({
      cells: [whenText(row.at), esc(row.name), esc(row.detail)]
    }))
  );
  content.innerHTML = `${toolbar()}${rows}${pager(data.total)}<p class="note">فتح منتج يسجّل استعلام السعر. الفاتورة يظهر اسم حسابها في قائمة الفواتير وفي البرنامج الأصلي.</p>`;
  bindSearch(() => openSection('activity'));
  bindPager(data.total, () => openSection('activity'));
}

function renderSimple(kind, data, rows) {
  content.innerHTML = `${toolbar()}${rows}${pager(data.total)}`;
  bindSearch(() => openSection(kind));
  bindPager(data.total, () => openSection(kind));
  if (kind === 'suppliers') {
    content.querySelectorAll('.data-row.clickable').forEach((row) => {
      row.onclick = () => openSupplierPurchases(row.dataset.id, row.dataset.name, row.dataset.acc);
    });
  }
}

async function openSupplierPurchases(id, name, acc, page = 1) {
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet"><header><div><h2>فواتير الشراء</h2><p>${esc(name)}</p></div><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="skeleton"><span></span><span></span><span></span></div></article>`;
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  try {
    const data = await api(`/api/suppliers/${id}/purchases?page=${page}&pageSize=20`);
    const supplier = data.supplier || { name, accCode: acc };
    const pages = Math.max(1, Math.ceil(data.total / 20));
    const rows = grid(
      [
        { label: 'الرقم', width: '0.6fr' },
        { label: 'التاريخ', width: '0.8fr' },
        { label: 'المستخدم', width: '0.9fr' },
        { label: 'الإجمالي', width: '0.8fr' },
        { label: 'المدفوع', width: '0.7fr' },
        { label: 'المتبقي', width: '0.7fr' }
      ],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}"`,
        cells: [row.no, dateText(row.date), whoText(row.byName), money(row.amount), money(row.paid), money(row.due)]
      }))
    );
    drawer.innerHTML = `<article class="sheet">
      <header>
        <div><h2>فواتير الشراء</h2><p>${esc(supplier.name)}${supplier.accCode ? ` · ${esc(supplier.accCode)}` : ''}</p></div>
        <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
      </header>
      <p class="meta"><span>${num(data.total)} فاتورة</span></p>
      ${data.rows.length ? rows : '<div class="empty">لا توجد فواتير شراء لهذا المورد</div>'}
      <div class="pager">
        <button type="button" id="histPrev" ${page <= 1 ? 'disabled' : ''}>السابق</button>
        <button type="button" id="histNext" ${page >= pages ? 'disabled' : ''}>التالي</button>
      </div>
    </article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
    document.getElementById('histPrev').onclick = () => { if (page > 1) openSupplierPurchases(id, supplier.name, supplier.accCode, page - 1); };
    document.getElementById('histNext').onclick = () => { if (page < pages) openSupplierPurchases(id, supplier.name, supplier.accCode, page + 1); };
    drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
    drawer.querySelectorAll('.data-row.clickable').forEach((row) => {
      row.onclick = async () => {
        await openInvoice('purchases', row.dataset.id);
        const close = document.getElementById('closeDrawer');
        if (close) close.onclick = () => openSupplierPurchases(id, supplier.name, supplier.accCode, page);
      };
    });
  } catch (error) {
    drawer.innerHTML = `<article class="sheet"><header><h2>فواتير الشراء</h2><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="error">${esc(error.message)}</div></article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  }
}

function renderInvoices(kind, data, party) {
  const create = kind === 'purchases'
    ? '<div class="toolbar"><button id="newPurchaseBtn" type="button">فاتورة شراء جديدة</button></div>'
    : '';
  const rows = grid(
    [
      { label: 'الرقم', width: '0.6fr' },
      { label: 'التاريخ', width: '0.7fr' },
      { label: party, width: '1.3fr' },
      { label: 'المستخدم', width: '0.9fr' },
      { label: 'الإجمالي', width: '0.8fr' },
      { label: 'المدفوع', width: '0.7fr' },
      { label: 'المتبقي', width: '0.7fr' }
    ],
    data.rows.map((row) => ({
      clickable: true,
      attrs: `data-id="${row.id}"`,
      cells: [row.no, dateText(row.date), esc(row.name), whoText(row.byName), money(row.amount), money(row.paid), money(row.due)],
      classes: ['', '', '', '', '', '', Number(row.due) > 0 ? 'due' : 'ok']
    }))
  );
  content.innerHTML = `${create}${toolbar()}${rows}${pager(data.total)}`;
  if (kind === 'purchases') document.getElementById('newPurchaseBtn').onclick = () => openSection('newPurchase');
  bindSearch(() => openSection(kind));
  bindPager(data.total, () => openSection(kind));
  bindRows(kind);
}

function renderStock(data) {
  const options = ['<option value="0">كل المخازن</option>']
    .concat(state.stores.map((store) => `<option value="${store.id}" ${String(store.id) === String(state.storeId) ? 'selected' : ''}>${esc(store.name)}</option>`))
    .join('');
  const pages = Math.max(1, Math.ceil(data.total / 40));
  const rows = grid(
    [
      { label: 'الكود', width: '0.8fr' },
      { label: 'المنتج', width: '2fr' },
      { label: 'المخزن', width: '1.2fr' },
      { label: 'الكمية', width: '0.7fr' }
    ],
    data.rows.map((row) => ({
      cells: [esc(row.code), esc(row.name), esc(row.storeName), num(row.qty)],
      classes: ['', '', '', Number(row.qty) < 0 ? 'neg' : '']
    }))
  );
  content.innerHTML = `<div class="toolbar">
      <input id="q" value="${esc(state.q)}" placeholder="كود أو اسم المنتج">
      <select id="store">${options}</select>
      <button id="go" type="button">عرض</button>
    </div>
    <div class="meta"><span>${num(data.total)} سطر</span><span>صفحة ${state.page} من ${pages}</span></div>
    ${rows}
    <div class="pager">
      <button type="button" id="prev" ${state.page <= 1 ? 'disabled' : ''}>السابق</button>
      <button type="button" id="next" ${state.page >= pages ? 'disabled' : ''}>التالي</button>
    </div>`;
  document.getElementById('go').onclick = () => {
    state.q = document.getElementById('q').value.trim();
    state.storeId = document.getElementById('store').value;
    state.page = 1;
    openSection('stock');
  };
  document.getElementById('prev').onclick = () => { if (state.page > 1) { state.page -= 1; openSection('stock'); } };
  document.getElementById('next').onclick = () => { if (state.page < pages) { state.page += 1; openSection('stock'); } };
}

function renderStores(data) {
  content.innerHTML = grid(
    [
      { label: 'المخزن', width: '1.2fr' },
      { label: 'العنوان', width: '1.6fr' },
      { label: 'الهاتف', width: '0.8fr' },
      { label: 'الموبايل', width: '0.8fr' }
    ],
    data.stores.map((store) => ({
      cells: [esc(store.name), esc(store.address), esc(store.phone), esc(store.mobile)]
    }))
  );
}

const draft = { clientId: 0, clientName: 'عميل نقدي', lines: [], editId: null, editNo: null, paid: true, partial: 0, storeId: null, hold: false };
const purchaseDraft = { supplierId: 0, supplierName: 'مشتريات نقدية', lines: [], editId: null, editNo: null, paid: true, partial: 0, storeId: null, hold: false };

function resetSaleDraft() {
  draft.clientId = 0;
  draft.clientName = 'عميل نقدي';
  draft.lines = [];
  draft.editId = null;
  draft.editNo = null;
  draft.paid = true;
  draft.partial = 0;
  draft.storeId = null;
  draft.hold = false;
}

function resetPurchaseDraft() {
  purchaseDraft.supplierId = 0;
  purchaseDraft.supplierName = 'مشتريات نقدية';
  purchaseDraft.lines = [];
  purchaseDraft.editId = null;
  purchaseDraft.editNo = null;
  purchaseDraft.paid = true;
  purchaseDraft.partial = 0;
  purchaseDraft.storeId = null;
  purchaseDraft.hold = false;
}

function storeOptions(selected) {
  const chosen = selected === null || selected === undefined || selected === '' ? null : Number(selected);
  return state.stores.map((store) => `<option value="${store.id}" ${chosen !== null && Number(store.id) === chosen ? 'selected' : ''}>${esc(store.name)}</option>`).join('');
}

function inlineProductHtml(prefix) {
  return `<button id="${prefix}Show" class="ghost wide-ghost" type="button">إضافة منتج غير موجود</button>
    <div id="${prefix}Box" class="mini-product hidden">
      <input id="${prefix}Name" maxlength="100" placeholder="اسم المنتج">
      <input id="${prefix}Code" maxlength="50" placeholder="الكود، ويمكن تركه فارغاً">
      <input id="${prefix}Sale" type="number" min="0" step="0.01" placeholder="سعر البيع">
      <input id="${prefix}Buy" type="number" min="0" step="0.01" placeholder="سعر الشراء">
      <button id="${prefix}Save" type="button">حفظ المنتج وإضافته للفاتورة</button>
    </div>`;
}

function bindInlineProduct(prefix, priceKind, onCreated, errorId) {
  document.getElementById(prefix + 'Show').onclick = () => document.getElementById(prefix + 'Box').classList.toggle('hidden');
  document.getElementById(prefix + 'Save').onclick = async () => {
    const error = document.getElementById(errorId);
    const button = document.getElementById(prefix + 'Save');
    error.textContent = '';
    const name = document.getElementById(prefix + 'Name').value.trim();
    const code = document.getElementById(prefix + 'Code').value.trim();
    const salePrice = Number(document.getElementById(prefix + 'Sale').value || 0);
    const buyPrice = Number(document.getElementById(prefix + 'Buy').value || 0);
    if (!name) {
      error.textContent = 'اسم المنتج مطلوب';
      return;
    }
    button.disabled = true;
    try {
      const result = await api('/api/products', {
        method: 'POST',
        body: JSON.stringify({ name, code, salePrice, buyPrice })
      });
      const typed = Number(document.getElementById('linePrice').value);
      const qty = Number(document.getElementById('lineQty').value);
      onCreated({
        productId: Number(result.id),
        name: `${result.code || code || result.id} - ${name}`,
        qty: qty > 0 ? qty : 1,
        price: typed > 0 ? typed : (priceKind === 'buy' ? buyPrice : salePrice)
      });
      document.getElementById(prefix + 'Name').value = '';
      document.getElementById(prefix + 'Code').value = '';
      document.getElementById(prefix + 'Sale').value = '';
      document.getElementById(prefix + 'Buy').value = '';
      document.getElementById(prefix + 'Box').classList.add('hidden');
    } catch (err) {
      error.textContent = err.message;
    }
    button.disabled = false;
  };
}

function readLineInputs(lines) {
  document.querySelectorAll('.line-qty').forEach((input) => {
    const line = lines[Number(input.dataset.i)];
    if (line) line.qty = Number(input.value);
  });
  document.querySelectorAll('.line-price').forEach((input) => {
    const line = lines[Number(input.dataset.i)];
    if (line) line.price = Number(input.value);
  });
  document.querySelectorAll('.line-store').forEach((input) => {
    const line = lines[Number(input.dataset.i)];
    if (line) line.storeId = Number(input.value);
  });
}

function editHeading(kind, no) {
  const title = document.querySelector('#title span');
  if (title) title.textContent = kind === 'sales' ? `تعديل فاتورة بيع ${no}` : `تعديل فاتورة شراء ${no}`;
  document.getElementById('subtitle').textContent = 'التعديل يحدّث الأصناف والمخزون والقيد في قاعدة البيانات الفعلية';
}

function renderNewSale() {
  if (!state.stores.length) state.stores = [];
  const editing = Boolean(draft.editId);
  if (editing) editHeading('sales', draft.editNo);
  content.innerHTML = `
    <div class="panel panel-pad sale-form">
      <div class="toolbar">
        <input id="clientQ" placeholder="ابحث عن عميل للبيع الآجل">
        <select id="saleStore">${storeOptions(draft.storeId)}</select>
        <label class="checkline"><input id="paidNow" type="checkbox" ${!editing || draft.paid ? 'checked' : ''}> تحصيل نقدي</label>
        <button id="findClient" type="button" class="ghost">بحث عميل</button>
      </div>
      <div id="clientPick" class="meta">العميل: ${esc(draft.clientName || 'عميل نقدي')}</div>
      <div id="clientResults"></div>
      <div class="toolbar">
        <input id="productQ" placeholder="كود أو اسم المنتج">
        <input id="lineQty" type="number" min="0.01" step="0.01" value="1" placeholder="الكمية">
        <input id="linePrice" type="number" min="0" step="0.01" placeholder="السعر">
        <button id="findProduct" type="button" class="ghost">بحث منتج</button>
      </div>
      <div id="productResults"></div>
      ${inlineProductHtml('saleNew')}
      <div class="data line-grid${editing ? ' line-grid-edit' : ''}">
        <div class="data-head"><span>الصنف</span>${editing ? '<span>المخزن</span>' : ''}<span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>
        <div id="draftLines"></div>
      </div>
      <div class="meta"><span id="draftTotal">الإجمالي: 0</span></div>
      ${draft.partial ? `<p class="note">المحصّل حالياً ${money(draft.partial)}. لو سيبت التحصيل غير محدد، المبلغ المحصّل يفضل كما هو.</p>` : ''}
      <button id="saveSale" type="button">${editing ? 'حفظ التعديل' : 'حفظ الفاتورة'}</button>
      ${editing ? '<button id="cancelEdit" class="ghost wide-ghost" type="button">رجوع للفاتورة</button>' : ''}
      <p class="note">${editing ? 'حفظ التعديل يغيّر أصناف الفاتورة والمخزون والقيد على قاعدة البيانات الفعلية.' : 'الحفظ ينزل على قاعدة البيانات الفعلية: فاتورة، أصناف، مخزون، قيد، وتحصيل نقدي لو تم اختياره.'}</p>
      <div id="saleError" class="error"></div>
    </div>`;
  const drawLines = () => {
    const total = draft.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    document.getElementById('draftLines').innerHTML = draft.lines.map((line, index) =>
      `<div class="data-row"><span data-label="الصنف">${esc(line.name)}</span>${editing ? `<span data-label="المخزن"><select data-i="${index}" class="line-store">${storeOptions(line.storeId)}</select></span>` : ''}<span data-label="الكمية"><input class="line-qty" data-i="${index}" type="number" min="0.01" step="0.01" value="${line.qty}"></span><span data-label="السعر"><input class="line-price" data-i="${index}" type="number" min="0" step="0.01" value="${line.price}"></span><span data-label="الإجمالي" class="line-sum">${money(line.qty * line.price)}</span><span data-label="حذف"><button type="button" data-i="${index}" class="ghost remove-line">حذف</button></span></div>`
    ).join('') || '<div class="empty">لم تُضف أصناف</div>';
    document.getElementById('draftTotal').textContent = 'الإجمالي: ' + money(total);
    document.querySelectorAll('.line-qty, .line-price').forEach((input) => {
      input.oninput = () => {
        readLineInputs(draft.lines);
        const row = input.closest('.data-row');
        const line = draft.lines[Number(input.dataset.i)];
        row.querySelector('.line-sum').textContent = money(line.qty * line.price);
        const next = draft.lines.reduce((sum, item) => sum + item.qty * item.price, 0);
        document.getElementById('draftTotal').textContent = 'الإجمالي: ' + money(next);
      };
    });
    document.querySelectorAll('.remove-line').forEach((button) => {
      button.onclick = () => { readLineInputs(draft.lines); draft.lines.splice(Number(button.dataset.i), 1); drawLines(); };
    });
  };
  drawLines();
  document.getElementById('findClient').onclick = async () => {
    const q = document.getElementById('clientQ').value.trim();
    const data = await api('/api/clients?q=' + encodeURIComponent(q) + '&page=1&pageSize=8');
    document.getElementById('clientResults').innerHTML = grid(
      [{ label: 'العميل', width: '1.4fr' }, { label: 'الهاتف', width: '1fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-name="${esc(row.name)}"`,
        cells: [esc(row.name), esc(row.phone || row.mobile)]
      }))
    );
    document.querySelectorAll('#clientResults .data-row').forEach((row) => {
      row.onclick = () => {
        draft.clientId = Number(row.dataset.id);
        draft.clientName = row.dataset.name;
        document.getElementById('clientPick').textContent = 'العميل: ' + row.dataset.name;
        document.getElementById('paidNow').checked = false;
      };
    });
  };
  document.getElementById('findProduct').onclick = async () => {
    const q = document.getElementById('productQ').value.trim();
    const data = await api('/api/products?q=' + encodeURIComponent(q) + '&page=1&pageSize=8');
    document.getElementById('productResults').innerHTML = grid(
      [{ label: 'الكود', width: '0.8fr' }, { label: 'المنتج', width: '1.6fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-name="${esc(row.code + ' - ' + row.name)}" data-price="${Number(row.salePrice || 0)}"`,
        cells: [esc(row.code), esc(row.name)]
      }))
    );
    document.querySelectorAll('#productResults .data-row').forEach((row) => {
      row.onclick = () => {
        const qty = Number(document.getElementById('lineQty').value);
        if (!(Number(document.getElementById('linePrice').value) > 0) && Number(row.dataset.price) > 0) {
          document.getElementById('linePrice').value = row.dataset.price;
        }
        const price = Number(document.getElementById('linePrice').value);
        if (!(qty > 0) || !(price >= 0)) {
          document.getElementById('saleError').textContent = 'اكتب الكمية والسعر قبل اختيار المنتج';
          return;
        }
        draft.lines.push({
          productId: Number(row.dataset.id),
          name: row.dataset.name,
          storeId: Number(document.getElementById('saleStore').value),
          qty,
          price
        });
        document.getElementById('saleError').textContent = '';
        drawLines();
      };
    });
  };
  bindInlineProduct('saleNew', 'sale', (line) => {
    readLineInputs(draft.lines);
    draft.lines.push({ ...line, storeId: Number(document.getElementById('saleStore').value) });
    drawLines();
  }, 'saleError');
  const cancelEdit = document.getElementById('cancelEdit');
  if (cancelEdit) cancelEdit.onclick = async () => {
    const id = draft.editId;
    resetSaleDraft();
    await openSection('sales');
    await openInvoice('sales', id);
  };
  document.getElementById('saveSale').onclick = async () => {
    const button = document.getElementById('saveSale');
    document.getElementById('saleError').textContent = '';
    readLineInputs(draft.lines);
    button.disabled = true;
    const editingNow = Boolean(draft.editId);
    try {
      const payload = {
        clientId: draft.clientId,
        storeId: Number(document.getElementById('saleStore').value),
        paid: document.getElementById('paidNow').checked,
        lines: draft.lines.map((line) => ({
          lineId: line.lineId,
          productId: line.productId,
          storeId: editingNow ? line.storeId : Number(document.getElementById('saleStore').value),
          qty: line.qty,
          price: line.price
        }))
      };
      const result = await api(editingNow ? '/api/sales/' + draft.editId : '/api/sales', {
        method: editingNow ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      resetSaleDraft();
      state.section = 'sales';
      state.page = 1;
      state.q = '';
      await openSection('sales');
      await openInvoice('sales', result.id);
    } catch (error) {
      document.getElementById('saleError').textContent = error.message;
      button.disabled = false;
    }
  };
}

function renderNewPurchase() {
  const editing = Boolean(purchaseDraft.editId);
  if (editing) editHeading('purchases', purchaseDraft.editNo);
  content.innerHTML = `
    <div class="panel panel-pad sale-form">
      <div class="toolbar">
        <input id="supplierQ" placeholder="ابحث عن مورد للشراء الآجل">
        <select id="purchaseStore">${storeOptions(purchaseDraft.storeId)}</select>
        <label class="checkline"><input id="paidNow" type="checkbox" ${!editing || purchaseDraft.paid ? 'checked' : ''}> سداد نقدي</label>
        <button id="findSupplier" type="button" class="ghost">بحث مورد</button>
      </div>
      <div id="supplierPick" class="meta">المورد: ${esc(purchaseDraft.supplierName || 'مشتريات نقدية')}</div>
      <div id="supplierResults"></div>
      <div class="toolbar">
        <input id="productQ" placeholder="كود أو اسم المنتج">
        <input id="lineQty" type="number" min="0.01" step="0.01" value="1" placeholder="الكمية">
        <input id="linePrice" type="number" min="0" step="0.01" placeholder="سعر الشراء">
        <button id="findProduct" type="button" class="ghost">بحث منتج</button>
      </div>
      <div id="productResults"></div>
      ${inlineProductHtml('buyNew')}
      <div class="data line-grid${editing ? ' line-grid-edit' : ''}">
        <div class="data-head"><span>الصنف</span>${editing ? '<span>المخزن</span>' : ''}<span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>
        <div id="draftLines"></div>
      </div>
      <div class="meta"><span id="draftTotal">الإجمالي: 0</span></div>
      ${purchaseDraft.partial ? `<p class="note">المدفوع حالياً ${money(purchaseDraft.partial)}. لو سيبت السداد غير محدد، المبلغ المدفوع يفضل كما هو.</p>` : ''}
      <button id="savePurchase" type="button">${editing ? 'حفظ التعديل' : 'حفظ فاتورة الشراء'}</button>
      ${editing ? '<button id="cancelEdit" class="ghost wide-ghost" type="button">رجوع للفاتورة</button>' : ''}
      <p class="note">${editing ? 'حفظ التعديل يغيّر أصناف الفاتورة والمخزون والقيد على قاعدة البيانات الفعلية.' : 'الحفظ ينزل على قاعدة البيانات الفعلية: فاتورة شراء، أصناف، زيادة المخزون، قيد، وسداد نقدي لو تم اختياره.'}</p>
      <div id="purchaseError" class="error"></div>
    </div>`;
  const drawLines = () => {
    const total = purchaseDraft.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    document.getElementById('draftLines').innerHTML = purchaseDraft.lines.map((line, index) =>
      `<div class="data-row"><span data-label="الصنف">${esc(line.name)}</span>${editing ? `<span data-label="المخزن"><select data-i="${index}" class="line-store">${storeOptions(line.storeId)}</select></span>` : ''}<span data-label="الكمية"><input class="line-qty" data-i="${index}" type="number" min="0.01" step="0.01" value="${line.qty}"></span><span data-label="السعر"><input class="line-price" data-i="${index}" type="number" min="0" step="0.01" value="${line.price}"></span><span data-label="الإجمالي" class="line-sum">${money(line.qty * line.price)}</span><span data-label="حذف"><button type="button" data-i="${index}" class="ghost remove-line">حذف</button></span></div>`
    ).join('') || '<div class="empty">لم تُضف أصناف</div>';
    document.getElementById('draftTotal').textContent = 'الإجمالي: ' + money(total);
    document.querySelectorAll('.line-qty, .line-price').forEach((input) => {
      input.oninput = () => {
        readLineInputs(purchaseDraft.lines);
        const row = input.closest('.data-row');
        const line = purchaseDraft.lines[Number(input.dataset.i)];
        row.querySelector('.line-sum').textContent = money(line.qty * line.price);
        const next = purchaseDraft.lines.reduce((sum, item) => sum + item.qty * item.price, 0);
        document.getElementById('draftTotal').textContent = 'الإجمالي: ' + money(next);
      };
    });
    document.querySelectorAll('.remove-line').forEach((button) => {
      button.onclick = () => { readLineInputs(purchaseDraft.lines); purchaseDraft.lines.splice(Number(button.dataset.i), 1); drawLines(); };
    });
  };
  drawLines();
  document.getElementById('findSupplier').onclick = async () => {
    const q = document.getElementById('supplierQ').value.trim();
    const data = await api('/api/suppliers?q=' + encodeURIComponent(q) + '&page=1&pageSize=8');
    document.getElementById('supplierResults').innerHTML = grid(
      [{ label: 'المورد', width: '1.4fr' }, { label: 'الهاتف', width: '1fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-name="${esc(row.name)}"`,
        cells: [esc(row.name), esc(row.phone || row.mobile)]
      }))
    );
    document.querySelectorAll('#supplierResults .data-row').forEach((row) => {
      row.onclick = () => {
        purchaseDraft.supplierId = Number(row.dataset.id);
        purchaseDraft.supplierName = row.dataset.name;
        document.getElementById('supplierPick').textContent = 'المورد: ' + row.dataset.name;
        document.getElementById('paidNow').checked = false;
      };
    });
  };
  document.getElementById('findProduct').onclick = async () => {
    const q = document.getElementById('productQ').value.trim();
    const data = await api('/api/products?q=' + encodeURIComponent(q) + '&page=1&pageSize=8');
    document.getElementById('productResults').innerHTML = grid(
      [{ label: 'الكود', width: '0.8fr' }, { label: 'المنتج', width: '1.6fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-name="${esc(row.code + ' - ' + row.name)}" data-price="${Number(row.buyPrice || 0)}"`,
        cells: [esc(row.code), esc(row.name)]
      }))
    );
    document.querySelectorAll('#productResults .data-row').forEach((row) => {
      row.onclick = () => {
        const qty = Number(document.getElementById('lineQty').value);
        if (!(Number(document.getElementById('linePrice').value) > 0) && Number(row.dataset.price) > 0) {
          document.getElementById('linePrice').value = row.dataset.price;
        }
        const price = Number(document.getElementById('linePrice').value);
        if (!(qty > 0) || !(price >= 0)) {
          document.getElementById('purchaseError').textContent = 'اكتب الكمية والسعر قبل اختيار المنتج';
          return;
        }
        purchaseDraft.lines.push({
          productId: Number(row.dataset.id),
          name: row.dataset.name,
          storeId: Number(document.getElementById('purchaseStore').value),
          qty,
          price
        });
        document.getElementById('purchaseError').textContent = '';
        drawLines();
      };
    });
  };
  bindInlineProduct('buyNew', 'buy', (line) => {
    readLineInputs(purchaseDraft.lines);
    purchaseDraft.lines.push({ ...line, storeId: Number(document.getElementById('purchaseStore').value) });
    drawLines();
  }, 'purchaseError');
  const cancelEdit = document.getElementById('cancelEdit');
  if (cancelEdit) cancelEdit.onclick = async () => {
    const id = purchaseDraft.editId;
    resetPurchaseDraft();
    await openSection('purchases');
    await openInvoice('purchases', id);
  };
  document.getElementById('savePurchase').onclick = async () => {
    const button = document.getElementById('savePurchase');
    document.getElementById('purchaseError').textContent = '';
    readLineInputs(purchaseDraft.lines);
    button.disabled = true;
    const editingNow = Boolean(purchaseDraft.editId);
    try {
      const payload = {
        supplierId: purchaseDraft.supplierId,
        storeId: Number(document.getElementById('purchaseStore').value),
        paid: document.getElementById('paidNow').checked,
        lines: purchaseDraft.lines.map((line) => ({
          lineId: line.lineId,
          productId: line.productId,
          storeId: editingNow ? line.storeId : Number(document.getElementById('purchaseStore').value),
          qty: line.qty,
          price: line.price
        }))
      };
      const result = await api(editingNow ? '/api/purchases/' + purchaseDraft.editId : '/api/purchases', {
        method: editingNow ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      resetPurchaseDraft();
      state.section = 'purchases';
      state.page = 1;
      state.q = '';
      await openSection('purchases');
      await openInvoice('purchases', result.id);
    } catch (error) {
      document.getElementById('purchaseError').textContent = error.message;
      button.disabled = false;
    }
  };
}

async function openInvoice(kind, id) {
  const data = await api(`/api/${kind}/${id}`);
  const invoice = data.invoice;
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet">
    <header>
      <div><h2>فاتورة ${invoice.no}</h2><p>${esc(invoice.name)} · ${dateText(invoice.date)} · المستخدم: ${whoText(invoice.byName)}</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    <div class="sheet-actions">
      ${data.lines.some((line) => Number(line.qty) - Number(line.returned) > 0) ? '<button id="returnBtn" class="history-btn" type="button">مرتجع من الفاتورة</button>' : ''}
      <button id="editInvoice" class="ghost" type="button">تعديل الفاتورة</button>
    </div>
    <div class="money">
      <div><span>الإجمالي</span><strong>${money(invoice.total)}</strong></div>
      <div><span>المدفوع</span><strong>${money(invoice.paid)}</strong></div>
      <div><span>المرتجع</span><strong>${money(invoice.returnedAmount)}</strong></div>
      <div><span>المتبقي</span><strong>${money(invoice.due)}</strong></div>
    </div>
    ${grid(
      [
        { label: 'الكود', width: '0.7fr' },
        { label: 'الصنف', width: '1.4fr' },
        { label: 'المخزن', width: '0.9fr' },
        { label: 'الكمية', width: '0.5fr' },
        { label: 'المرتجع', width: '0.5fr' },
        { label: 'السعر', width: '0.6fr' },
        { label: 'الإجمالي', width: '0.7fr' }
      ],
      data.lines.map((line) => ({
        cells: [esc(line.code), esc(line.name), esc(line.storeName), num(line.qty), num(line.returned), money(line.price), money(line.lineTotal)]
      }))
    )}
    ${invoice.notes ? `<p class="note">${esc(invoice.notes)}</p>` : ''}
    <div id="returnError" class="error"></div>
  </article>`;
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
  const returnBtn = document.getElementById('returnBtn');
  if (returnBtn) returnBtn.onclick = () => openReturn(kind, id, data);
  document.getElementById('editInvoice').onclick = () => beginEdit(kind, id);
}

async function beginEdit(kind, id) {
  const data = await api(`/api/${kind}/${id}`);
  const invoice = data.invoice;
  const fully = Number(invoice.paid) > 0 && Math.abs(Number(invoice.paid) - Number(invoice.total)) < 0.05;
  const lines = data.lines.map((line) => ({
    lineId: Number(line.lineId),
    productId: Number(line.productId),
    storeId: Number(line.storeId),
    name: `${line.code} - ${line.name}`,
    qty: Number(line.qty),
    price: Number(line.price)
  }));
  const target = kind === 'sales' ? draft : purchaseDraft;
  if (kind === 'sales') {
    target.clientId = Number(invoice.clientId) || 0;
    target.clientName = invoice.name || 'عميل نقدي';
  } else {
    target.supplierId = Number(invoice.supplierId) || 0;
    target.supplierName = invoice.name || 'مشتريات نقدية';
  }
  target.lines = lines;
  target.editId = Number(id);
  target.editNo = invoice.no;
  target.paid = fully;
  target.partial = !fully && Number(invoice.paid) > 0 ? Number(invoice.paid) : 0;
  target.storeId = lines[0] ? lines[0].storeId : null;
  target.hold = true;
  await openSection(kind === 'sales' ? 'newSale' : 'newPurchase');
}

function openReturn(kind, id, data) {
  const lines = data.lines.filter((line) => Number(line.qty) - Number(line.returned) > 0);
  drawer.innerHTML = `<article class="sheet">
    <header>
      <div><h2>مرتجع فاتورة ${data.invoice.no}</h2><p>${esc(data.invoice.name)} · السعر نفس سعر الفاتورة</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    <div class="data" style="--cols:1.6fr .6fr .7fr .8fr">
      <div class="data-head"><span>الصنف</span><span>المتبقي</span><span>كمية المرتجع</span><span>الإجمالي</span></div>
      ${lines.map((line) => {
        const left = Number(line.qty) - Number(line.returned);
        return `<div class="data-row"><span data-label="الصنف">${esc(line.code)} ${esc(line.name)}</span><span data-label="المتبقي">${num(left)}</span><span data-label="كمية المرتجع"><input class="return-qty" data-id="${line.lineId}" data-price="${Number(line.price)}" type="number" min="0" max="${left}" step="0.01" value="0"></span><span data-label="الإجمالي" class="return-total">0</span></div>`;
      }).join('')}
    </div>
    <div class="meta"><span id="returnTotal">الإجمالي: 0</span></div>
    <button id="saveReturn" type="button">حفظ المرتجع</button>
    <p class="note">المرتجع يرجع الكمية للمخزن ويعكس قيد الفاتورة بنفس طريقة البرنامج الأصلي.</p>
    <div id="returnError" class="error"></div>
  </article>`;
  const draw = () => {
    let total = 0;
    document.querySelectorAll('.return-qty').forEach((input) => {
      const qty = Number(input.value);
      const lineTotal = (qty > 0 ? qty : 0) * Number(input.dataset.price);
      total += lineTotal;
      input.closest('.data-row').querySelector('.return-total').textContent = money(lineTotal);
    });
    document.getElementById('returnTotal').textContent = 'الإجمالي: ' + money(total);
  };
  document.querySelectorAll('.return-qty').forEach((input) => { input.oninput = draw; });
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
  document.getElementById('saveReturn').onclick = async () => {
    const button = document.getElementById('saveReturn');
    const error = document.getElementById('returnError');
    error.textContent = '';
    const payload = [];
    document.querySelectorAll('.return-qty').forEach((input) => {
      const qty = Number(input.value);
      if (qty > 0) payload.push({ lineId: Number(input.dataset.id), qty });
    });
    if (!payload.length) {
      error.textContent = 'اكتب كمية مرتجع لصنف واحد على الأقل';
      return;
    }
    button.disabled = true;
    try {
      await api(`/api/${kind}/${id}/return`, { method: 'POST', body: JSON.stringify({ lines: payload }) });
      await openInvoice(kind, id);
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  };
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  document.getElementById('loginError').textContent = '';
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        user: document.getElementById('user').value,
        password: document.getElementById('password').value
      })
    });
    showApp(data.user);
  } catch (error) {
    document.getElementById('loginError').textContent = error.message;
  }
});

document.getElementById('logoutBtn').innerHTML = `${icon('logout')}<span>تسجيل الخروج</span>`;
document.getElementById('logoutBtn').onclick = async () => {
  await api('/api/logout', { method: 'POST', body: '{}' });
  showLogin();
};

document.getElementById('menuBtn').onclick = () => {
  if (document.querySelector('.side').classList.contains('open')) closeMenu();
  else openMenu();
};
document.getElementById('moreBtn').onclick = openMenu;
document.getElementById('scrim').onclick = closeMenu;

api('/api/me').then((data) => { if (data.user) showApp(data.user); }).catch(() => {});
