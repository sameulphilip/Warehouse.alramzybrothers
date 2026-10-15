const svg = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icons = {
  dashboard: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  reports: svg('<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>'),
  stock: svg('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'),
  transfer: svg('<path d="M7 7h11l-3-3M18 17H7l3 3"/><path d="M18 7v4M6 17v-4"/>'),
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
  logout: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
  more: svg('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>')
};
const icon = (name) => `<span class="ico">${icons[name] || ''}</span>`;

const sections = [
  { id: 'dashboard', label: 'لوحة التحكم', title: 'لوحة التحكم', subtitle: 'ملخص حي من قاعدة بيانات الفروع' },
  { id: 'reports', label: 'التقارير', title: 'التقارير', subtitle: 'مبيعات ومشتريات، وحركة صنف، وتاريخ عميل أو مورد' },
  { id: 'stock', label: 'المخزون', title: 'المخزون حسب المخزن', subtitle: 'الرصيد الحالي لكل منتج داخل كل مخزن' },
  { id: 'transfer', label: 'تحويل مخزن', title: 'تحويل بين المخازن', subtitle: 'الصنف يخرج من مخزن ويدخل مخزناً آخر، وتظهر الحركتان في تقرير المنتج' },
  { id: 'products', label: 'المنتجات', title: 'المنتجات', subtitle: 'تعديل بيانات المنتج وسعر البيع، أو إضافة منتج جديد' },
  { id: 'newSale', label: 'فاتورة بيع جديدة', title: 'فاتورة بيع جديدة', subtitle: 'تسجّل الفاتورة والمخزون والقيد مثل البرنامج الأصلي' },
  { id: 'sales', label: 'فواتير البيع', title: 'فواتير البيع', subtitle: 'اضغط الفاتورة لعرض الأصناف' },
  { id: 'newPurchase', label: 'فاتورة شراء جديدة', title: 'فاتورة شراء جديدة', subtitle: 'تسجّل الفاتورة والمخزون والقيد مثل البرنامج الأصلي' },
  { id: 'purchases', label: 'فواتير الشراء', title: 'فواتير الشراء', subtitle: 'اضغط الفاتورة لعرض الأصناف' },
  { id: 'clients', label: 'العملاء', title: 'العملاء', subtitle: 'اضغط العميل لعرض ملفه وفواتيره وحسابه' },
  { id: 'suppliers', label: 'الموردين', title: 'الموردين', subtitle: 'اضغط المورد لعرض ملفه وفواتيره وحسابه' },
  { id: 'stores', label: 'المخازن', title: 'المخازن', subtitle: 'فروع ومخازن الشركة' },
  { id: 'activity', label: 'سجل الحركات', title: 'سجل الحركات', subtitle: 'كل حساب واللي عمله: فواتير، أسعار، وبحث' },
  { id: 'accounts', label: 'إدارة الحسابات', title: 'إدارة الحسابات', subtitle: 'حسابات الدخول وصلاحيات المديرين', admin: true }
];

const state = { section: 'dashboard', page: 1, q: '', storeId: '', dashStore: '', dashFrom: '', dashTo: '', stores: [], user: null, report: null, readOnly: false };

function visibleSections() {
  return sections.filter((section) => !section.admin || state.user?.role === 'superadmin');
}

const roleLabel = (role) => role === 'superadmin' ? 'سوبر أدمن' : 'مدير';
const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const content = document.getElementById('content');
const nav = document.getElementById('nav');
const drawer = document.getElementById('drawer');

const money = (value) => Number(value || 0).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 2 });
const kpiMoney = (value) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toLocaleString('ar-EG-u-nu-latn', { maximumFractionDigits: 1 })} مليون`;
  return money(amount);
};
const num = (value) => Number(value || 0).toLocaleString('ar-EG-u-nu-latn');
function productCode(code, productNo) {
  const number = productNo === undefined || productNo === null || productNo === '' ? '' : String(productNo);
  const part = code == null ? '' : String(code).trim();
  if (number && part) return `${number} · ${part}`;
  return part || number;
}
const dateText = (value) => value ? new Date(value).toLocaleDateString('ar-EG-u-nu-latn') : '-';
const whenText = (value) => value ? new Date(value).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' }) : '-';
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

function applyReadOnly() {
  document.body.classList.toggle('read-only', Boolean(state.readOnly));
  let bar = document.getElementById('readOnlyBar');
  if (!state.readOnly) {
    if (bar) bar.remove();
    return;
  }
  if (state.section === 'newSale' || state.section === 'newPurchase') state.section = 'dashboard';
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'readOnlyBar';
    bar.className = 'readonly-bar';
    bar.textContent = 'وضع العرض فقط. النسخة الخارجية لا تقبل فواتير أو تعديلات.';
    document.querySelector('.workspace').insertBefore(bar, document.getElementById('content'));
  }
}

function showApp(user) {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  state.user = user;
  document.getElementById('who').textContent = user.name || user.username;
  applyReadOnly();
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
  const more = document.getElementById('moreBtn');
  if (more) {
    if (!more.dataset.label) more.dataset.label = more.textContent.trim();
    more.innerHTML = `${icon('more')}<em>${more.dataset.label}</em>`;
  }
}

function closeMenu() {
  document.querySelector('.side').classList.remove('open');
  document.getElementById('scrim').classList.add('hidden');
  document.body.classList.remove('menu-open');
}

function openMenu() {
  document.querySelector('.side').classList.add('open');
  document.getElementById('scrim').classList.remove('hidden');
  document.body.classList.add('menu-open');
}

function setHeading() {
  const item = sections.find((section) => section.id === state.section);
  document.getElementById('title').innerHTML = `${icon(item.id)}<span>${item.title}</span>`;
  document.getElementById('subtitle').textContent = item.subtitle;
}

async function openSection(id) {
  if (state.readOnly && (id === 'newSale' || id === 'newPurchase')) id = 'dashboard';
  if (!visibleSections().some((section) => section.id === id)) id = 'dashboard';
  state.section = id;
  renderNav();
  setHeading();
  drawer.classList.add('hidden');
  content.innerHTML = '<div class="skeleton"><span></span><span></span><span></span><span></span></div>';
  try {
    if (id === 'dashboard') {
      const [storesData, data] = await Promise.all([
        state.stores.length ? Promise.resolve(null) : api('/api/stores'),
        api(`/api/dashboard?from=${encodeURIComponent(state.dashFrom || '')}&to=${encodeURIComponent(state.dashTo || '')}&storeId=${encodeURIComponent(state.dashStore ?? '')}`)
      ]);
      if (storesData) state.stores = storesData.stores;
      return renderDashboard(data);
    }
    if (id === 'reports') {
      if (!state.stores.length) state.stores = (await api('/api/stores')).stores;
      return renderReports(await api(reportUrl()));
    }
    if (id === 'stores') return renderStores(await api('/api/stores'));
    if (!state.stores.length) state.stores = (await api('/api/stores')).stores;
    if (id === 'stock') return renderStock(await api(stockUrl()));
    if (id === 'transfer') return renderTransfer();
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
          clickable: true,
          attrs: `data-id="${row.id}" data-name="${esc(row.name)}" data-acc="${esc(row.accCode)}"`,
          cells: [esc(row.name), esc(row.phone), esc(row.mobile), esc(row.address), esc(row.accCode)]
        }))
      ));
    }
    if (id === 'activity') return renderActivity(await api(listUrl('/api/activity')));
    if (id === 'accounts') return await renderAccounts(await api('/api/users'));
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

function toolbar(extra = '', placeholder = 'بحث') {
  return `<div class="toolbar">
    <input id="q" value="${esc(state.q)}" placeholder="${esc(placeholder)}">
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

const numericLabels = new Set(['الإجمالي', 'المتبقي', 'المدفوع', 'سعر البيع', 'سعر الشراء', 'الرصيد', 'حد الطلب', 'الكمية', 'السعر', 'المرتجع', 'كمية المرتجع', 'الفواتير', 'داخل', 'خارج', 'رقم الصنف', 'مدين', 'دائن']);

function columnStoreKey(columns) {
  return `ramzy-cols:${columns.map((column) => column.label).join('\u001f')}`;
}

function savedColumnWidths(columns) {
  try {
    const parsed = JSON.parse(localStorage.getItem(columnStoreKey(columns)) || '');
    if (!Array.isArray(parsed) || parsed.length !== columns.length) return null;
    const widths = parsed.map((value) => Math.round(Number(value)));
    if (widths.some((value) => !Number.isFinite(value) || value < 56 || value > 1200)) return null;
    return widths;
  } catch (error) {
    return null;
  }
}

function grid(columns, rows) {
  const saved = savedColumnWidths(columns);
  const defaultCols = columns.map((column) => column.width).join(' ');
  const cols = saved ? saved.map((value) => `${value}px`).join(' ') : defaultCols;
  const head = columns.map((column, index) => {
    const numeric = numericLabels.has(column.label) ? ' num' : '';
    return `<span data-col="${esc(column.label)}" class="${numeric.trim()}"><b class="col-label">${column.label}</b><i class="col-resize" data-index="${index}" title="اسحب لتغيير العرض، واضغط مرتين للرجوع"></i></span>`;
  }).join('');
  const body = rows.length
    ? rows.map((row) => {
      const cells = columns.map((column, index) => {
        const classes = [row.classes?.[index] || '', numericLabels.has(column.label) ? 'num' : '', index === 0 ? 'lead' : ''].filter(Boolean).join(' ');
        return `<span data-label="${column.label}" class="${classes}">${row.cells[index]}</span>`;
      }).join('');
      return `<div class="data-row${row.clickable ? ' clickable' : ''}${row.card ? ' product-card' : ''}" ${row.attrs || ''}>${cells}</div>`;
    }).join('')
    : '<div class="empty">لا توجد نتائج</div>';
  return `<div class="data${saved ? ' is-resized' : ''}" data-cols-key="${esc(columnStoreKey(columns))}" data-default-cols="${esc(defaultCols)}" style="--cols:${cols}"><div class="data-head">${head}</div>${body}</div>`;
}

function bindColumnResize() {
  let drag = null;
  const finish = () => {
    if (!drag) return;
    drag.table.classList.remove('resizing');
    if (drag.live) localStorage.setItem(drag.table.dataset.colsKey, JSON.stringify(drag.live));
    drag = null;
  };
  document.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest?.('.col-resize');
    if (!handle || !window.matchMedia('(min-width: 981px)').matches) return;
    const table = handle.closest('.data');
    const head = handle.closest('.data-head');
    if (!table || !head) return;
    event.preventDefault();
    event.stopPropagation();
    const index = Number(handle.dataset.index);
    drag = {
      table,
      index,
      startX: event.clientX,
      widths: [...head.children].map((cell) => Math.round(cell.getBoundingClientRect().width))
    };
    table.classList.add('resizing');
  });
  document.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const widths = drag.widths.slice();
    widths[drag.index] = Math.max(56, Math.min(1200, Math.round(drag.widths[drag.index] + (drag.startX - event.clientX))));
    drag.live = widths;
    drag.table.style.setProperty('--cols', widths.map((value) => `${value}px`).join(' '));
    drag.table.classList.add('is-resized');
  });
  document.addEventListener('pointerup', finish);
  document.addEventListener('pointercancel', finish);
  document.addEventListener('dblclick', (event) => {
    const handle = event.target.closest?.('.col-resize');
    if (!handle) return;
    const table = handle.closest('.data');
    if (!table) return;
    localStorage.removeItem(table.dataset.colsKey);
    table.classList.remove('is-resized');
    table.style.setProperty('--cols', table.dataset.defaultCols);
  });
}
bindColumnResize();

function bindRows(reloadKind) {
  content.querySelectorAll('.data-row.clickable').forEach((row) => {
    row.onclick = () => openInvoice(reloadKind, row.dataset.id);
  });
}
function isoDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function ensureReport() {
  if (!state.report) {
    const today = new Date();
    state.report = {
      type: 'sales',
      from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: isoDate(today),
      storeId: '',
      partyId: 0,
      partyName: ''
    };
  }
  return state.report;
}

function reportUrl() {
  const report = ensureReport();
  const params = new URLSearchParams({
    type: report.type,
    from: report.from,
    to: report.to,
    storeId: report.storeId ?? '',
    partyId: String(report.partyId || 0),
    q: state.q,
    page: String(state.page),
    pageSize: '30'
  });
  return `/api/reports?${params}`;
}

const reportCatalog = [
  ['sales', 'المبيعات', true],
  ['purchases', 'المشتريات', true],
  ['products', 'حركة الأصناف', true],
  ['productMove', 'حركة منتج', true],
  ['clientHistory', 'تاريخ عميل', true],
  ['supplierHistory', 'تاريخ مورد', true],
  ['clients', 'مديونية العملاء', false],
  ['suppliers', 'مديونية الموردين', false],
  ['stock', 'أرصدة المخزون', false]
];

const partyReportMeta = {
  productMove: { label: 'المنتج', path: '/api/products', hint: 'رقم الصنف أو الكود أو الاسم', empty: 'ابحث عن الصنف ثم اختَره لعرض كل ما حدث له.' },
  clientHistory: { label: 'العميل', path: '/api/clients', hint: 'اسم العميل', empty: 'ابحث عن العميل ثم اختَره لعرض كل التعاملات معه.' },
  supplierHistory: { label: 'المورد', path: '/api/suppliers', hint: 'اسم المورد', empty: 'ابحث عن المورد ثم اختَره لعرض كل التعاملات معه.' }
};

function renderReports(data) {
  const report = ensureReport();
  report.from = data.from;
  report.to = data.to;
  if (data.party) {
    report.partyId = Number(data.party.id);
    report.partyName = data.party.name || report.partyName;
  }
  const partyMeta = partyReportMeta[data.type] || null;
  const dated = ['sales', 'purchases', 'products', 'productMove', 'clientHistory', 'supplierHistory'].includes(data.type);
  const cards = {
    sales: data.storeScoped ? [
      ['فواتير المخزن', num(data.summary.invoices)],
      ['مبيعات المخزن', money(data.summary.total)]
    ] : [
      ['عدد الفواتير', num(data.summary.invoices)],
      ['إجمالي المبيعات', money(data.summary.total)],
      ['المحصّل', money(data.summary.paid)],
      ['المتبقي', money(data.summary.due)]
    ],
    purchases: data.storeScoped ? [
      ['فواتير المخزن', num(data.summary.invoices)],
      ['مشتريات المخزن', money(data.summary.total)]
    ] : [
      ['عدد الفواتير', num(data.summary.invoices)],
      ['إجمالي المشتريات', money(data.summary.total)],
      ['المسدّد', money(data.summary.paid)],
      ['المتبقي', money(data.summary.due)]
    ],
    products: [
      ['عدد الأصناف', num(data.summary.products)],
      ['الكمية المباعة', num(data.summary.qty)],
      ['قيمة المبيعات', money(data.summary.total)]
    ],
    clients: [
      ['عملاء عليهم رصيد', num(data.summary.clients)],
      ['إجمالي المتبقي', money(data.summary.due)]
    ],
    suppliers: [
      ['موردون لهم رصيد', num(data.summary.suppliers)],
      ['إجمالي المتبقي', money(data.summary.due)]
    ],
    stock: [
      ['سطور الرصيد', num(data.summary.rows)],
      ['مجموع الكميات', num(data.summary.qty)]
    ],
    productMove: [
      ['الحركات', num(data.summary.moves)],
      ['كمية البيع', num(data.summary.sold)],
      ['كمية الشراء', num(data.summary.bought)],
      ['مرتجع بيع', num(data.summary.saleReturns)],
      ['مرتجع شراء', num(data.summary.purchaseReturns)],
      ['قيمة البيع', money(data.summary.salesTotal)],
      ['قيمة الشراء', money(data.summary.purchaseTotal)]
    ],
    clientHistory: [
      ['فواتير البيع', num(data.summary.invoices)],
      ['إجمالي البيع', money(data.summary.total)],
      ['التحصيل', money(data.summary.collected)],
      ['الصرف', money(data.summary.refunded)],
      ['المرتجعات', money(data.summary.returns)],
      ['المتبقي', money(data.summary.due)]
    ],
    supplierHistory: [
      ['فواتير الشراء', num(data.summary.invoices)],
      ['إجمالي الشراء', money(data.summary.total)],
      ['السداد', money(data.summary.paid)],
      ['المرتجعات', money(data.summary.returns)],
      ['المتبقي', money(data.summary.due)]
    ]
  }[data.type] || [];
  const columns = {
    sales: [
      { label: 'الرقم', width: '0.55fr' },
      { label: 'التاريخ', width: '0.75fr' },
      { label: 'العميل', width: '1.4fr' },
      { label: 'الإجمالي', width: '0.8fr' },
      { label: 'المدفوع', width: '0.7fr' },
      { label: 'المتبقي', width: '0.7fr' }
    ],
    purchases: [
      { label: 'الرقم', width: '0.55fr' },
      { label: 'التاريخ', width: '0.75fr' },
      { label: 'المورد', width: '1.4fr' },
      { label: 'الإجمالي', width: '0.8fr' },
      { label: 'المدفوع', width: '0.7fr' },
      { label: 'المتبقي', width: '0.7fr' }
    ],
    products: [
      { label: 'رقم الصنف', width: '0.7fr' },
      { label: 'الكود', width: '0.8fr' },
      { label: 'الصنف', width: '1.6fr' },
      { label: 'الكمية', width: '0.6fr' },
      { label: 'الإجمالي', width: '0.8fr' }
    ],
    clients: [
      { label: 'العميل', width: '1.6fr' },
      { label: 'الفواتير', width: '0.6fr' },
      { label: 'المتبقي', width: '0.8fr' }
    ],
    suppliers: [
      { label: 'المورد', width: '1.6fr' },
      { label: 'الفواتير', width: '0.6fr' },
      { label: 'المتبقي', width: '0.8fr' }
    ],
    stock: [
      { label: 'المخزن', width: '1fr' },
      { label: 'رقم الصنف', width: '0.7fr' },
      { label: 'الكود', width: '0.8fr' },
      { label: 'الصنف', width: '1.6fr' },
      { label: 'الرصيد', width: '0.6fr' }
    ],
    productMove: [
      { label: 'التاريخ', width: '0.8fr' },
      { label: 'الحركة', width: '0.7fr' },
      { label: 'الطرف', width: '1.2fr' },
      { label: 'المخزن', width: '0.8fr' },
      { label: 'داخل', width: '0.45fr' },
      { label: 'خارج', width: '0.45fr' },
      { label: 'السعر', width: '0.6fr' },
      { label: 'الإجمالي', width: '0.7fr' }
    ],
    clientHistory: [
      { label: 'التاريخ', width: '0.75fr' },
      { label: 'الحركة', width: '0.7fr' },
      { label: 'الرقم', width: '0.5fr' },
      { label: 'الإجمالي', width: '0.7fr' },
      { label: 'المدفوع', width: '0.65fr' },
      { label: 'المتبقي', width: '0.65fr' },
      { label: 'البيان', width: '1.3fr' }
    ],
    supplierHistory: [
      { label: 'التاريخ', width: '0.75fr' },
      { label: 'الحركة', width: '0.7fr' },
      { label: 'الرقم', width: '0.5fr' },
      { label: 'الإجمالي', width: '0.7fr' },
      { label: 'المدفوع', width: '0.65fr' },
      { label: 'المتبقي', width: '0.65fr' },
      { label: 'البيان', width: '1.3fr' }
    ]
  }[data.type];
  const rows = data.rows.map((row) => {
    if (data.type === 'sales' || data.type === 'purchases') {
      return {
        clickable: true,
        attrs: `data-id="${row.id}"`,
        cells: [row.no, dateText(row.date), esc(row.name), money(row.total), money(row.paid), money(row.due)],
        classes: ['', '', '', '', '', Number(row.due) > 0 ? 'due' : 'ok']
      };
    }
    if (data.type === 'productMove') {
      return {
        clickable: Boolean(row.openAs),
        attrs: `data-id="${row.docId}" data-open="${esc(row.openAs || '')}"`,
        cells: [dateText(row.date), esc(row.kind), esc(row.party) || '—', esc(row.storeName), num(row.qtyIn), num(row.qtyOut), money(row.price), money(row.total)]
      };
    }
    if (data.type === 'clientHistory' || data.type === 'supplierHistory') {
      return {
        clickable: Boolean(row.openAs),
        attrs: `data-id="${row.docId}" data-open="${esc(row.openAs || '')}"`,
        cells: [dateText(row.date), esc(row.kind), row.no, money(row.total), money(row.paid), money(row.due), esc(row.note)],
        classes: ['', '', '', '', '', Number(row.due) > 0 ? 'due' : '', '']
      };
    }
    if (data.type === 'products') return { cells: [esc(row.id), esc(row.code), esc(row.name), num(row.qty), money(row.total)] };
    if (data.type === 'clients' || data.type === 'suppliers') {
      return { cells: [esc(row.name), num(row.invoices), money(row.due)], classes: ['', '', 'due'] };
    }
    return { cells: [esc(row.storeName), esc(row.id), esc(row.code), esc(row.name), num(row.qty)], classes: ['', '', '', '', Number(row.qty) < 0 ? 'neg' : ''] };
  });
  const title = reportCatalog.find((item) => item[0] === data.type)?.[1] || 'تقرير';
  const heading = partyMeta && report.partyName ? `${title} — ${report.partyName}` : title;
  const longDate = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const periodText = !dated
    ? 'رصيد حالي حتى تاريخ الطباعة'
    : String(data.from) === '2000-01-01'
      ? `حتى ${longDate(data.to)}`
      : `من ${longDate(data.from)} إلى ${longDate(data.to)}`;
  const startRow = data.total ? ((data.page || state.page) - 1) * (data.pageSize || 30) + 1 : 0;
  const endRow = Math.min((data.page || state.page) * (data.pageSize || 30), data.total);
  const pickedStore = state.stores.find((store) => String(store.id) === String(report.storeId));
  const storeName = report.storeId !== '' && pickedStore ? pickedStore.name : '';
  const printedAt = new Date().toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
  const shownCards = data.needsParty ? [] : cards;
  const partyBits = [];
  if (partyMeta && report.partyName) {
    partyBits.push(report.partyName);
    if (data.party?.code) partyBits.push(data.party.code);
    if (data.type === 'productMove' && data.party) partyBits.push(`الرصيد ${num(data.party.stock)} ${data.party.unitName || ''}`.trim());
    if (data.party?.phone || data.party?.mobile) partyBits.push([data.party.phone, data.party.mobile].filter(Boolean).join(' · '));
  }
  const note = partyMeta && data.needsParty
    ? partyMeta.empty
    : data.type === 'productMove'
      ? `بيع وشراء ومرتجع وجرد وتحويل${storeName ? ` في مخزن ${storeName}` : ''}. الرصيد أعلى الصفحة حالي، والجدول حسب الفترة.`
      : data.type === 'clientHistory'
        ? 'فواتير البيع والمرتجعات والتحصيل والصرف. اضغط فاتورة البيع لفتحها.'
        : data.type === 'supplierHistory'
          ? 'فواتير الشراء والمرتجعات والسداد. اضغط فاتورة الشراء لفتحها.'
          : dated
            ? `الأرقام محسوبة على الفترة المحددة${storeName ? ` لمخزن ${storeName}` : ''}، وصفحة الجدول جزء من نفس الفترة.`
            : 'هذا التقرير رصيد حالي، وتاريخ الفترة لا يغيّره.';
  const printHead = columns.map((column) => `<th class="${numericLabels.has(column.label) ? 'num' : ''}">${column.label}</th>`).join('');
  const printBody = rows.length
    ? rows.map((row) => `<tr>${row.cells.map((cell, index) => `<td class="${numericLabels.has(columns[index].label) ? 'num' : ''}">${cell}</td>`).join('')}</tr>`).join('')
    : `<tr><td class="print-empty" colspan="${columns.length}">${data.needsParty ? 'اختَر السجل أولاً' : 'لا توجد نتائج'}</td></tr>`;
  const storeOptions = allStoreOptions(report.storeId);
  const storeFilter = ['sales', 'purchases', 'products', 'stock', 'productMove'].includes(data.type);
  content.innerHTML = `
    <article class="print-sheet">
      <header class="print-brand">
        <img src="/logo.png?v=20261009a" alt="">
        <div>
          <p class="print-kicker">AL RAMZY BROTHERS</p>
          <strong>الرمزي إخوان</strong>
          <span>إدارة فروع الرمزي</span>
        </div>
        <div class="print-title">
          <h1>تقرير ${esc(heading)}</h1>
          <p>${esc(periodText)}</p>
        </div>
      </header>
      <div class="print-facts">
        <div><span>الفترة</span><strong>${esc(periodText)}</strong></div>
        <div><span>السجلات</span><strong>${data.total ? `${num(startRow)}–${num(endRow)} من ${num(data.total)}` : 'لا توجد سجلات'}</strong></div>
        ${partyBits.length ? `<div><span>${esc(partyMeta.label)}</span><strong>${esc(partyBits.join(' · '))}</strong></div>` : ''}
        ${storeName ? `<div><span>المخزن</span><strong>${esc(storeName)}</strong></div>` : ''}
        ${state.q ? `<div><span>البحث</span><strong>${esc(state.q)}</strong></div>` : ''}
        <div><span>طُبع بواسطة</span><strong>${esc(state.user?.name || state.user?.username || '')}</strong></div>
        <div><span>تاريخ الطباعة</span><strong>${esc(printedAt)}</strong></div>
      </div>
      <div class="print-totals">${shownCards.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
      <table>
        <thead><tr>${printHead}</tr></thead>
        <tbody>${printBody}</tbody>
      </table>
      <footer class="print-foot"><span>الرمزي إخوان · تقرير داخلي</span><span>الصفحة المعروضة ${num(data.page || state.page)} من ${num(Math.max(1, Math.ceil(data.total / (data.pageSize || 30))))}</span></footer>
    </article>
    <div class="range report-types">${reportCatalog.map(([id, label]) =>
      `<button type="button" data-report="${id}" class="${data.type === id ? 'active' : ''}">${label}</button>`
    ).join('')}</div>
    ${partyMeta ? `<div class="party-box">
      ${partyBits.length ? `<div class="party-picked"><span>${esc(partyBits.join(' · '))}</span><button type="button" id="clearParty">تغيير</button></div>` : ''}
      <label>${esc(partyMeta.label)}<input id="partyQ" placeholder="${esc(partyMeta.hint)}" autocomplete="off"></label>
      <div id="partyHits" class="party-hits"></div>
    </div>` : ''}
    <div class="report-filters">
      ${dated ? `<label>من<input id="reportFrom" type="date" value="${esc(report.from)}"></label>
        <label>إلى<input id="reportTo" type="date" value="${esc(report.to)}"></label>` : ''}
      ${storeFilter ? `<label>المخزن<select id="reportStore">${storeOptions}</select></label>` : ''}
      <label class="report-search">بحث<input id="q" value="${esc(state.q)}" placeholder="${partyMeta ? 'رقم أو نوع الحركة' : 'اسم أو رقم'}"></label>
      <button id="go" type="button">عرض</button>
      <button id="printReport" class="ghost" type="button">طباعة</button>
    </div>
    <p class="panel-note">${esc(note)}</p>
    ${shownCards.length ? `<div class="kpis report-kpis">${shownCards.map(([label, value]) =>
      `<article class="kpi"><span>${label}</span><strong>${value}</strong></article>`
    ).join('')}</div>` : ''}
    ${data.needsParty ? '<div class="empty">اختَر من نتائج البحث</div>' : `${grid(columns, rows)}${pager(data.total)}`}`;
  const reload = () => openSection('reports');
  content.querySelectorAll('[data-report]').forEach((button) => {
    button.onclick = () => {
      const next = button.dataset.report;
      const partyIds = Object.keys(partyReportMeta);
      const entering = partyIds.includes(next) && !partyIds.includes(report.type);
      const leaving = !partyIds.includes(next) && partyIds.includes(report.type);
      if (next !== report.type) {
        report.partyId = 0;
        report.partyName = '';
      }
      if (entering) report.from = '2000-01-01';
      if (leaving) {
        const today = new Date();
        report.from = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
        report.to = isoDate(today);
      }
      report.type = next;
      state.page = 1;
      state.q = '';
      reload();
    };
  });
  document.getElementById('go').onclick = () => {
    if (dated) {
      report.from = document.getElementById('reportFrom').value || report.from;
      report.to = document.getElementById('reportTo').value || report.to;
    }
    if (storeFilter) report.storeId = document.getElementById('reportStore').value;
    state.q = document.getElementById('q').value.trim();
    state.page = 1;
    reload();
  };
  document.getElementById('q').onkeydown = (event) => { if (event.key === 'Enter') document.getElementById('go').click(); };
  document.getElementById('printReport').onclick = () => {
    const previous = document.title;
    document.title = `تقرير ${heading} - الرمزي إخوان`;
    window.print();
    document.title = previous;
  };
  if (!data.needsParty) bindPager(data.total, reload);
  if (data.type === 'sales' || data.type === 'purchases') bindRows(data.type);
  content.querySelectorAll('.data-row.clickable[data-open]').forEach((row) => {
    if (!row.dataset.open) return;
    row.onclick = () => openInvoice(row.dataset.open, row.dataset.id);
  });
  const clearParty = document.getElementById('clearParty');
  if (clearParty) {
    clearParty.onclick = () => {
      report.partyId = 0;
      report.partyName = '';
      state.page = 1;
      reload();
    };
  }
  const partyInput = document.getElementById('partyQ');
  const partyHits = document.getElementById('partyHits');
  if (partyInput && partyHits && partyMeta) {
    let partyToken = 0;
    partyInput.oninput = () => {
      const token = ++partyToken;
      clearTimeout(partyInput._timer);
      partyInput._timer = setTimeout(async () => {
        const q = partyInput.value.trim();
        if (!q) { partyHits.innerHTML = ''; return; }
        try {
          const found = await api(`${partyMeta.path}?q=${encodeURIComponent(q)}&page=1&pageSize=10`);
          if (token !== partyToken) return;
          partyHits.innerHTML = found.rows.length
            ? found.rows.map((row) => {
              const coded = row.code != null;
              const extra = coded ? productCode(row.code, row.id) : [row.phone, row.mobile].filter(Boolean).join(' · ');
              const picked = coded ? `${productCode(row.code, row.id)} · ${row.name}` : row.name;
              return `<button type="button" data-party="${row.id}" data-name="${esc(picked)}"><span>${esc(row.name)}</span>${extra ? `<small>${esc(extra)}</small>` : ''}</button>`;
            }).join('')
            : '<p class="panel-note">لا توجد نتائج</p>';
          partyHits.querySelectorAll('[data-party]').forEach((button) => {
            button.onclick = () => {
              report.partyId = Number(button.dataset.party);
              report.partyName = button.dataset.name;
              state.page = 1;
              reload();
            };
          });
        } catch (error) {
          if (token === partyToken) partyHits.innerHTML = `<p class="error">${esc(error.message)}</p>`;
        }
      }, 250);
    };
  }
}

function periodDelta(current, previous) {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (!before && !now) return { text: 'لا حركة في الفترتين', dir: '' };
  if (!before) return { text: 'لا يوجد رقم في الفترة السابقة', dir: 'up' };
  const pct = Math.round(((now - before) / before) * 100);
  if (!pct) return { text: 'مثل الفترة السابقة', dir: '' };
  if (pct > 0) return { text: `أعلى ${num(pct)}% عن الفترة السابقة`, dir: 'up' };
  return { text: `أقل ${num(Math.abs(pct))}% عن الفترة السابقة`, dir: 'down' };
}

function renderDashboard(data) {
  const month = data.month;
  const salesDelta = periodDelta(month.sales, month.prevSales);
  const buyDelta = periodDelta(month.purchases, month.prevPurchases);
  const peak = Math.max(...data.days.map((day) => Number(day.total)), 0);
  const periodCards = [
    { type: 'sales', label: 'مبيعات الفترة', value: kpiMoney(month.sales), note: `${num(month.saleCount)} فاتورة · ${salesDelta.text}`, dir: salesDelta.dir },
    { type: 'purchases', label: 'مشتريات الفترة', value: kpiMoney(month.purchases), note: `${num(month.purchaseCount)} فاتورة · ${buyDelta.text}`, dir: buyDelta.dir }
  ];
  const balanceCards = [
    { type: 'clients', label: 'المتبقي على العملاء', value: kpiMoney(month.salesDue), note: 'رصيد حالي لكل الفروع' },
    { type: 'suppliers', label: 'المتبقي للموردين', value: kpiMoney(month.purchaseDue), note: 'رصيد حالي لكل الفروع' }
  ];
  const bars = data.days.map((day, index) => {
    const total = Number(day.total);
    const height = peak ? Math.round((total / peak) * 100) : 0;
    const label = data.monthly ? day.day.slice(5) : day.day.slice(8);
    const show = data.monthly || data.days.length <= 16 || index % Math.ceil(data.days.length / 8) === 0 || index === data.days.length - 1;
    const isPeak = peak > 0 && total === peak;
    const isToday = data.monthly ? day.day === String(data.today || '').slice(0, 7) : day.day === String(data.today || '').slice(0, 10);
    const amount = total > 0 && (data.monthly || isPeak || isToday) ? kpiMoney(total) : '';
    return `<div class="bar${isToday ? ' is-today' : ''}${isPeak ? ' is-peak' : ''}" title="${day.day} · ${money(total)}"><b>${amount}</b><span style="height:${Math.max(height, total > 0 ? 8 : 2)}%"></span><em>${show ? label : ''}</em></div>`;
  }).join('');
  const storeOptions = allStoreOptions(state.dashStore);
  const top = grid(
    [
      { label: 'المنتج', width: '2.8fr' },
      { label: 'رقم الصنف', width: '1.2fr' },
      { label: 'الكود', width: '1.4fr' },
      { label: 'الكمية', width: '1.8fr' },
      { label: 'الإجمالي', width: '2.8fr' }
    ],
    data.topProducts.map((row) => ({
      clickable: true,
      attrs: `data-product="${row.id}"`,
      cells: [esc(row.name), esc(row.id), esc(row.code), num(row.qty), money(row.total)]
    }))
  );
  const low = grid(
    [
      { label: 'المنتج', width: '2.8fr' },
      { label: 'رقم الصنف', width: '1.2fr' },
      { label: 'الكود', width: '1.4fr' },
      { label: 'المخزن', width: '1.8fr' },
      { label: 'الرصيد', width: '1.4fr' },
      { label: 'حد الطلب', width: '1.4fr' }
    ],
    data.lowStock.map((row) => ({
      clickable: true,
      attrs: `data-product="${row.id}"`,
      cells: [esc(row.name), esc(row.id), esc(row.code), esc(row.storeName), num(row.qty), num(row.reorderLevel)],
      classes: ['', '', '', '', 'due', '']
    }))
  );
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
  const kpiIcon = { sales: 'sales', purchases: 'purchases', clients: 'clients', suppliers: 'suppliers' };
  const kpi = (card, balance) => `<article class="kpi clickable${balance ? ' kpi-balance' : ''}" data-open="${card.type}"><div class="kpi-top">${icon(kpiIcon[card.type] || 'sales')}<span>${card.label}</span></div><strong>${card.value}</strong><em class="${card.dir || ''}">${card.note}</em></article>`;
  content.innerHTML = `<div class="dash">
  <div class="dash-tools">
    <label class="dash-date">من<input id="dashFrom" type="date" value="${esc(data.month.start)}"></label>
    <label class="dash-date">إلى<input id="dashTo" type="date" value="${esc(data.month.end)}"></label>
    <button id="dashGo" type="button">عرض</button>
    <label class="dash-store">المخزن<select id="dashStore">${storeOptions}</select></label>
  </div>
  <div class="kpis kpis-home">${periodCards.map((card) => kpi(card, false)).join('')}${balanceCards.map((card) => kpi(card, true)).join('')}</div>
  <p class="panel-note">كرتا المتبقي لكل الفروع، وفلتر المخزن لا يغيّرهما. اضغط أي كارت لفتح تقريره.</p>
  <section class="panel dash-chart"><h3><span>${data.monthly ? 'المبيعات شهرياً' : 'المبيعات يومياً'}</span>${peak ? `<span class="chart-peak">أعلى قيمة ${money(peak)}</span>` : ''}</h3><div class="chart-scroll"><div class="bars" style="--bars:${data.days.length}">${bars}</div></div></section>
  <div class="split">
    <section class="panel"><h3><span>أعلى المبيعات</span></h3><p class="panel-note">أكثر الأصناف مبيعاً في الفترة والمخزن المختارين.</p>${top}</section>
    <section class="panel panel-watch"><h3><span>تحت حد الطلب</span></h3><p class="panel-note">يظهر الصنف عندما يصبح الرصيد 10% أو أقل. مثال: 100 قطعة تظهر عند 10.</p>${low}</section>
  </div>
  <section class="panel"><h3><span>آخر فواتير البيع</span></h3>${recent}</section>
  </div>`;
  bindRows('sales');
  content.querySelectorAll('[data-product]').forEach((row) => {
    row.onclick = () => openProductForm(row.dataset.product);
  });
  const applyDash = () => {
    state.dashFrom = document.getElementById('dashFrom').value;
    state.dashTo = document.getElementById('dashTo').value;
    state.dashStore = document.getElementById('dashStore').value;
    openSection('dashboard');
  };
  document.getElementById('dashGo').onclick = applyDash;
  document.getElementById('dashStore').onchange = applyDash;
  const chart = content.querySelector('.chart-scroll');
  if (chart && chart.scrollWidth > chart.clientWidth + 8) {
    chart.scrollLeft = document.dir === 'rtl' ? -chart.scrollWidth : chart.scrollWidth;
  }
  content.querySelectorAll('[data-open]').forEach((card) => {
    card.onclick = () => {
      const report = ensureReport();
      report.type = card.dataset.open;
      report.from = data.month.start;
      report.to = data.month.end;
      report.storeId = ['sales', 'purchases', 'products'].includes(card.dataset.open) ? String(state.dashStore ?? '') : '';
      state.page = 1;
      state.q = '';
      openSection('reports');
    };
  });
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
      { label: 'رقم الصنف', width: '0.7fr' },
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
      cells: [esc(row.name), esc(row.id), esc(row.code), money(row.salePrice), money(row.buyPrice), num(row.stock), num(row.reorderLevel)],
      classes: ['', '', '', '', '', Number(row.stock) < 0 ? 'neg' : '', '']
    }))
  );
  content.innerHTML = `${toolbar('<button id="addProduct" type="button">منتج جديد</button>', 'رقم أو كود أو اسم المنتج')}${rows}${pager(data.total)}`;
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

let productViewToken = 0;

function productHistoryMeta(kind) {
  return kind === 'purchases'
    ? { title: 'تاريخ الشراء', party: 'المورد', empty: 'لا توجد مشتريات لهذا المنتج', unit: 'عملية شراء', pane: 'buyPane' }
    : { title: 'تاريخ البيع', party: 'العميل', empty: 'لا توجد مبيعات لهذا المنتج', unit: 'عملية بيع', pane: 'salePane' };
}

async function fillProductHistory(kind, id, product, page, token) {
  const view = productHistoryMeta(kind);
  try {
    const data = await api(`/api/products/${id}/${kind}?page=${page}&pageSize=12`);
    if (token !== productViewToken) return;
    const pane = document.getElementById(view.pane);
    if (!pane) return;
    const pages = Math.max(1, Math.ceil(Number(data.total) / 12));
    const rows = grid(
      [
        { label: 'التاريخ', width: '0.9fr' },
        { label: view.party, width: '1.3fr' },
        { label: 'الكمية', width: '0.6fr' },
        { label: 'السعر', width: '0.7fr' },
        { label: 'الفاتورة', width: '0.6fr' }
      ],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}"`,
        cells: [dateText(row.date), esc(row.name), num(row.qty), money(row.price), row.no]
      }))
    );
    pane.innerHTML = `<h3>${view.title}<span>${num(data.total)} ${view.unit}</span></h3>
      ${data.rows.length ? rows : `<div class="empty">${view.empty}</div>`}
      <div class="pager">
        <button type="button" data-step="-1" ${page <= 1 ? 'disabled' : ''}>السابق</button>
        <button type="button" data-step="1" ${page >= pages ? 'disabled' : ''}>التالي</button>
      </div>`;
    pane.querySelectorAll('[data-step]').forEach((button) => {
      button.onclick = () => {
        const next = page + Number(button.dataset.step);
        if (next >= 1 && next <= pages) fillProductHistory(kind, id, product, next, token);
      };
    });
    pane.querySelectorAll('.data-row.clickable').forEach((row) => {
      row.onclick = async () => {
        await openInvoice(kind, row.dataset.id);
        const back = () => openProductForm(id);
        const close = document.getElementById('closeDrawer');
        if (close) close.onclick = back;
        drawer.onclick = (event) => { if (event.target === drawer) back(); };
      };
    });
  } catch (error) {
    if (token !== productViewToken) return;
    const pane = document.getElementById(view.pane);
    if (pane) pane.innerHTML = `<h3>${view.title}</h3><div class="error">${esc(error.message)}</div>`;
  }
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
  const token = ++productViewToken;
  drawer.classList.remove('hidden');
  const sheet = `<article class="sheet">
    <header>
      <div><h2>${id ? 'تعديل المنتج' : 'منتج جديد'}</h2><p>${id ? esc(productCode(product.code, product.id)) + ' · ' + esc(product.name) : 'يُحفظ في دليل المنتجات وقائمة سعر البيع'}</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    <form id="productForm" class="form-grid">
      ${id ? `<div class="wide history-row"><button id="saleHistory" class="history-btn" type="button">تاريخ البيع</button><button id="buyHistory" class="history-btn" type="button">تاريخ الشراء</button><button id="allMoves" class="history-btn" type="button">جميع الحركات</button></div>` : ''}
      ${id ? `<div class="wide note"><strong>استعلامات السعر</strong>${inquiries.map((row) => `<div>${esc(row.name)} · ${whenText(row.at)}</div>`).join('') || '<div>لا يوجد</div>'}</div>` : ''}
      ${id ? field('رقم الصنف', `<input value="${esc(product.id)}" readonly>`) : ''}
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
        <button class="primary" type="submit">${id ? 'حفظ التعديل' : 'إضافة المنتج'}</button>
        <button id="closeDrawer2" class="ghost" type="button">إلغاء</button>
      </div>
    </form>
    <p class="note">سعر البيع وسعر الشراء هما السعران الأساسيان في البرنامج. الرصيد يتغير من الفواتير فقط.</p>
    <div id="productError" class="error"></div>
  </article>`;
  drawer.innerHTML = id
    ? `<div class="product-desk">${sheet}<aside class="product-side"><section class="product-pane" id="salePane"><h3>تاريخ البيع</h3><div class="skeleton"><span></span></div></section><section class="product-pane" id="buyPane"><h3>تاريخ الشراء</h3><div class="skeleton"><span></span></div></section></aside></div>`
    : sheet;
  const close = () => drawer.classList.add('hidden');
  document.getElementById('closeDrawer').onclick = close;
  document.getElementById('closeDrawer2').onclick = close;
  if (id) {
    document.getElementById('saleHistory').onclick = () => openProductHistory('sales', id, product);
    document.getElementById('buyHistory').onclick = () => openProductHistory('purchases', id, product);
    document.getElementById('allMoves').onclick = () => openProductMoves(id, product);
    fillProductHistory('sales', id, product, 1, token);
    fillProductHistory('purchases', id, product, 1, token);
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
  drawer.innerHTML = `<article class="sheet"><header><div><h2>${view.title}</h2><p>${esc(productCode(product.code, id))} · ${esc(product.name)}</p></div><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="skeleton"><span></span><span></span><span></span></div></article>`;
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
        <div><h2>${view.title}</h2><p>${esc(productCode(product.code, id))} · ${esc(product.name)}</p></div>
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

async function openProductMoves(id, product, page = 1) {
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet"><header><div><h2>جميع الحركات</h2><p>${esc(productCode(product.code, id))} · ${esc(product.name)}</p></div><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="skeleton"><span></span><span></span><span></span></div></article>`;
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  try {
    const data = await api(`/api/products/${id}/moves?page=${page}&pageSize=20`);
    const pages = Math.max(1, Math.ceil(data.total / 20));
    const rows = grid(
      [
        { label: 'التاريخ', width: '0.8fr' },
        { label: 'الحركة', width: '0.8fr' },
        { label: 'الطرف', width: '1.1fr' },
        { label: 'المخزن', width: '0.9fr' },
        { label: 'داخل', width: '0.5fr' },
        { label: 'خارج', width: '0.5fr' },
        { label: 'المستند', width: '0.5fr' }
      ],
      data.rows.map((row) => ({
        clickable: Boolean(row.openAs && row.docId),
        attrs: `data-id="${row.docId || ''}" data-open="${esc(row.openAs || '')}"`,
        cells: [dateText(row.date), esc(row.kind), esc(row.party || '—'), esc(row.storeName || '—'), num(row.qtyIn), num(row.qtyOut), row.no || '—']
      }))
    );
    drawer.innerHTML = `<article class="sheet">
      <header>
        <div><h2>جميع الحركات</h2><p>${esc(productCode(product.code, id))} · ${esc(product.name)}</p></div>
        <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
      </header>
      <p class="meta"><span>${num(data.total)} حركة</span></p>
      ${data.rows.length ? rows : '<div class="empty">لا توجد حركات لهذا المنتج</div>'}
      <div class="pager">
        <button type="button" id="histPrev" ${page <= 1 ? 'disabled' : ''}>السابق</button>
        <button type="button" id="histNext" ${page >= pages ? 'disabled' : ''}>التالي</button>
      </div>
      <button id="backProduct" class="ghost" type="button">رجوع للمنتج</button>
    </article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
    document.getElementById('backProduct').onclick = () => openProductForm(id);
    document.getElementById('histPrev').onclick = () => { if (page > 1) openProductMoves(id, product, page - 1); };
    document.getElementById('histNext').onclick = () => { if (page < pages) openProductMoves(id, product, page + 1); };
    drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
    drawer.querySelectorAll('.data-row.clickable').forEach((row) => {
      row.onclick = async () => {
        await openInvoice(row.dataset.open, row.dataset.id);
        const close = document.getElementById('closeDrawer');
        if (close) close.onclick = () => openProductMoves(id, product, page);
      };
    });
  } catch (error) {
    drawer.innerHTML = `<article class="sheet"><header><h2>جميع الحركات</h2><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="error">${esc(error.message)}</div></article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  }
}

async function renderAccounts(data) {
  let db = { target: 'primary', primaryUp: false, standbyUp: false, lastCopyAt: null, lastCopyError: '' };
  try { db = await api('/api/database'); } catch (error) { db.error = error.message; }
  const where = db.target === 'standby' ? 'النسخة الخارجية' : 'القاعدة الأساسية';
  const primaryState = db.primaryUp ? 'متصلة' : 'واقفة';
  const standbyState = db.standbyUp ? 'جاهزة' : 'غير جاهزة';
  const copyLine = db.lastCopyAt ? `آخر نسخة: ${whenText(db.lastCopyAt)}` : 'لسه مفيش نسخة خارجية';
  const copyAge = db.lastCopyAt ? Date.now() - new Date(db.lastCopyAt).getTime() : Infinity;
  const copyOld = !Number.isFinite(copyAge) || copyAge > 30 * 60 * 60 * 1000;
  const copyWarn = copyOld
    ? `<p class="copy-warn">تنبيه: آخر نسخة خارجية قديمة${db.lastCopyAt ? `، وآخر نسخة ناجحة كانت ${whenText(db.lastCopyAt)}` : ''}.</p>`
    : '';
  const switchButton = db.target === 'standby'
    ? '<button id="dbSwitch" type="button" data-target="primary">الرجوع للقاعدة الأساسية</button>'
    : '<button id="dbSwitch" type="button" data-target="standby">التحويل للنسخة الخارجية</button>';
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
  content.innerHTML = `<div class="panel panel-pad">
      <h3>قاعدة البيانات</h3>
      <p class="meta"><span>الموقع شغال على ${where}</span><span>${copyLine}</span></p>
      <p class="meta"><span>الأساسية: ${primaryState}</span><span>النسخة الخارجية: ${standbyState}</span></p>
      ${copyWarn}
      ${switchButton}
      <p class="note">${db.target === 'standby'
        ? 'النسخة الخارجية للعرض فقط. لا يمكن تسجيل فاتورة أو تعديل منتج أو حساب. الرجوع للقاعدة الأساسية يتم من هنا لما تتصل.'
        : 'التحويل متاح في أي وقت. النسخة الخارجية آخر نسخة محفوظة، وبعد التحويل النظام يبقى للعرض فقط. برنامج الفروع القديم عنوانه منفصل ومش بيتغير من هنا.'}</p>
    </div>
    <div class="toolbar"><button id="addAccount" type="button">حساب جديد</button></div>${rows}<p class="note">قسم الحسابات ظاهر لصاحب النظام فقط. المدير يقدر يستخدم المخزون والفواتير من غير ما يدير الحسابات.</p>`;
  const dbSwitch = document.getElementById('dbSwitch');
  if (dbSwitch) dbSwitch.onclick = async () => {
    const target = dbSwitch.dataset.target;
    const message = target === 'standby'
      ? 'الموقع هيحوّل على النسخة الخارجية للعرض فقط. لا يمكن تسجيل فواتير أو تعديل بيانات، والنسخة آخر نسخة محفوظة.'
      : 'الموقع هيرجع على القاعدة الأساسية، والعمليات هترجع تتشغّل.';
    if (!window.confirm(message)) return;
    dbSwitch.disabled = true;
    try {
      const result = await api('/api/database/switch', { method: 'POST', body: JSON.stringify({ target }) });
      state.readOnly = Boolean(result.readOnly);
      applyReadOnly();
      await openSection('accounts');
    } catch (error) {
      dbSwitch.disabled = false;
      window.alert(error.message);
    }
  };
  document.getElementById('addAccount').onclick = () => { if (!state.readOnly) openAccountForm(null); };
  content.querySelectorAll('.data-row.clickable').forEach((row) => {
    const user = data.users.find((item) => item.id === row.dataset.id);
    row.onclick = () => { if (!state.readOnly) openAccountForm(user); };
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
        <button class="primary" type="submit">${creating ? 'إضافة الحساب' : 'حفظ'}</button>
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
  if (kind === 'suppliers' || kind === 'clients') {
    content.querySelectorAll('.data-row.clickable').forEach((row) => {
      row.onclick = () => openPartyProfile(kind, row.dataset.id);
    });
  }
}

function profilePrintHtml(kind, data) {
  const supplier = kind === 'suppliers';
  const title = supplier ? 'ملف مورد' : 'ملف عميل';
  const party = data.party || {};
  const printedAt = new Date().toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
  const facts = [
    ['الاسم', party.name || '—'],
    ['التليفون', party.phone || '—'],
    ['الموبايل', party.mobile || '—'],
    ['الحساب', party.accCode || '—']
  ];
  if (party.address) facts.push(['العنوان', party.address]);
  const totals = [
    ['عدد الفواتير', num(data.summary?.count || 0)],
    ['الإجمالي', money(data.summary?.total)],
    ['المدفوع', money(data.summary?.paid)],
    ['المتبقي', money(data.summary?.due)]
  ];
  const invoiceRows = data.invoices?.rows || [];
  const invoiceBody = invoiceRows.length
    ? invoiceRows.map((row) => `<tr><td>${esc(row.no)}</td><td>${dateText(row.date)}</td><td>${whoText(row.byName)}</td><td class="num">${money(row.amount)}</td><td class="num">${money(row.paid)}</td><td class="num">${money(row.due)}</td></tr>`).join('')
    : '<tr><td class="print-empty" colspan="6">لا توجد فواتير</td></tr>';
  const statement = data.statement || { reason: 'no-account' };
  let statementBlock = '<p class="print-note">لا يوجد كود حساب</p>';
  if (statement.reason === 'empty') {
    statementBlock = '<p class="print-note">لا توجد حركات على الحساب. الرصيد 0</p>';
  } else if (statement.reason !== 'no-account') {
    const rows = statement.rows || [];
    const body = rows.length
      ? rows.map((row) => `<tr><td>${dateText(row.date)}</td><td>${esc(row.text || '—')}</td><td class="num">${money(row.debit)}</td><td class="num">${money(row.credit)}</td><td class="num">${money(row.balance)}</td></tr>`).join('')
      : '<tr><td class="print-empty" colspan="5">لا توجد حركات</td></tr>';
    statementBlock = `<p class="print-note">رصيد الحساب ${money(statement.balance)}</p>
      <table><thead><tr><th>التاريخ</th><th>البيان</th><th class="num">مدين</th><th class="num">دائن</th><th class="num">الرصيد</th></tr></thead><tbody>${body}</tbody></table>
      ${statement.truncated ? '<p class="print-note">المطبوع أحدث 2000 حركة</p>' : ''}`;
  }
  return `<article class="print-sheet">
    <header class="print-brand">
      <img src="/logo.png?v=20261009a" alt="">
      <div>
        <p class="print-kicker">AL RAMZY BROTHERS</p>
        <strong>الرمزي إخوان</strong>
        <span>إدارة فروع الرمزي</span>
      </div>
      <div class="print-title"><h1>${title}</h1><p>${esc(party.name || '')}</p></div>
    </header>
    <div class="print-facts">${facts.map(([label, value]) => `<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
    <div class="print-totals">${totals.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
    <h2>الفواتير</h2>
    <table><thead><tr><th>الرقم</th><th>التاريخ</th><th>المستخدم</th><th class="num">الإجمالي</th><th class="num">المدفوع</th><th class="num">المتبقي</th></tr></thead><tbody>${invoiceBody}</tbody></table>
    ${data.invoices?.truncated ? '<p class="print-note">المطبوع أحدث 2000 فاتورة</p>' : ''}
    <h2>كشف الحساب</h2>
    ${statementBlock}
    <footer class="print-foot"><span>الرمزي إخوان · ${title}</span><span>طُبعت ${esc(printedAt)}</span></footer>
  </article>`;
}

function profilePager(prefix, page, pages) {
  return `<div class="pager">
    <button type="button" id="${prefix}Prev" ${page <= 1 ? 'disabled' : ''}>السابق</button>
    <button type="button" id="${prefix}Next" ${page >= pages ? 'disabled' : ''}>التالي</button>
  </div>`;
}

async function openPartyProfile(kind, id, invoicePage = 1, statementPage = 1) {
  const supplier = kind === 'suppliers';
  const title = supplier ? 'ملف المورد' : 'ملف العميل';
  const invoiceKind = supplier ? 'purchases' : 'sales';
  const emptyInvoices = supplier ? 'لا توجد فواتير شراء لهذا المورد' : 'لا توجد فواتير بيع لهذا العميل';
  drawer.classList.remove('hidden');
  drawer.innerHTML = `<article class="sheet popup"><header><div><h2>${title}</h2></div><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="skeleton"><span></span><span></span><span></span></div></article>`;
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  try {
    const path = supplier ? 'suppliers' : 'clients';
    const data = await api(`/api/${path}/${id}/profile?invoicePage=${invoicePage}&statementPage=${statementPage}`);
    const party = data.party || {};
    const facts = [
      party.phone ? `<span>تليفون ${esc(party.phone)}</span>` : '',
      party.mobile ? `<span>موبايل ${esc(party.mobile)}</span>` : '',
      party.address ? `<span>${esc(party.address)}</span>` : '',
      party.accCode ? `<span>حساب ${esc(party.accCode)}</span>` : ''
    ].filter(Boolean).join('');
    const invoicePages = Math.max(1, Math.ceil((data.invoices?.total || 0) / 20));
    const statementPages = Math.max(1, Math.ceil((data.statement?.total || 0) / 20));
    const invoiceRows = grid(
      [
        { label: 'الرقم', width: '0.6fr' },
        { label: 'التاريخ', width: '0.8fr' },
        { label: 'المستخدم', width: '0.9fr' },
        { label: 'الإجمالي', width: '0.8fr' },
        { label: 'المدفوع', width: '0.7fr' },
        { label: 'المتبقي', width: '0.7fr' }
      ],
      (data.invoices?.rows || []).map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}"`,
        cells: [row.no, dateText(row.date), whoText(row.byName), money(row.amount), money(row.paid), money(row.due)],
        classes: ['', '', '', '', '', Number(row.due) > 0 ? 'due' : 'ok']
      }))
    );
    const statement = data.statement || { reason: 'no-account', rows: [], balance: null };
    let statementBody = '<div class="empty">لا يوجد كود حساب</div>';
    if (statement.reason === 'empty') {
      statementBody = `<p class="meta"><span>الرصيد ${money(0)}</span></p><div class="empty">لا توجد حركات على الحساب</div>`;
    } else if (statement.reason !== 'no-account') {
      const rows = grid(
        [
          { label: 'التاريخ', width: '0.8fr' },
          { label: 'البيان', width: '1.6fr' },
          { label: 'مدين', width: '0.7fr' },
          { label: 'دائن', width: '0.7fr' },
          { label: 'الرصيد', width: '0.8fr' }
        ],
        (statement.rows || []).map((row) => ({
          cells: [dateText(row.date), esc(row.text || '—'), money(row.debit), money(row.credit), money(row.balance)]
        }))
      );
      statementBody = `<p class="meta"><span>رصيد الحساب ${money(statement.balance)}</span><span>${num(statement.total)} حركة</span></p>${statement.rows?.length ? rows : '<div class="empty">لا توجد حركات في هذه الصفحة</div>'}`;
    }
    drawer.innerHTML = `<article class="sheet popup">
      <header>
        <div><h2>${title}</h2><p>${esc(party.name || '')}</p></div>
        <div class="profile-actions">
          <button id="printProfile" class="ghost" type="button">طباعة</button>
          <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
        </div>
      </header>
      ${facts ? `<p class="meta profile-facts">${facts}</p>` : ''}
      <div class="money">
        <div><span>عدد الفواتير</span><strong>${num(data.summary?.count || 0)}</strong></div>
        <div><span>الإجمالي</span><strong>${money(data.summary?.total)}</strong></div>
        <div><span>المدفوع</span><strong>${money(data.summary?.paid)}</strong></div>
        <div><span>المتبقي</span><strong>${money(data.summary?.due)}</strong></div>
      </div>
      <section class="profile-block">
        <h3>الفواتير</h3>
        ${data.invoices?.rows?.length ? invoiceRows : `<div class="empty">${emptyInvoices}</div>`}
        ${profilePager('inv', invoicePage, invoicePages)}
      </section>
      <section class="profile-block">
        <h3>كشف الحساب</h3>
        ${statementBody}
        ${statement.reason === 'no-account' ? '' : profilePager('stm', statementPage, statementPages)}
      </section>
    </article>`;
    document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
    document.getElementById('printProfile').onclick = async () => {
      const button = document.getElementById('printProfile');
      button.disabled = true;
      try {
        const full = await api(`/api/${path}/${id}/profile?print=1`);
        printDocument(profilePrintHtml(kind, full), `${title} ${full.party?.name || ''}`);
      } catch (error) {
        button.disabled = false;
        return;
      }
      button.disabled = false;
    };
    document.getElementById('invPrev').onclick = () => { if (invoicePage > 1) openPartyProfile(kind, id, invoicePage - 1, statementPage); };
    document.getElementById('invNext').onclick = () => { if (invoicePage < invoicePages) openPartyProfile(kind, id, invoicePage + 1, statementPage); };
    const statementPrev = document.getElementById('stmPrev');
    const statementNext = document.getElementById('stmNext');
    if (statementPrev) statementPrev.onclick = () => { if (statementPage > 1) openPartyProfile(kind, id, invoicePage, statementPage - 1); };
    if (statementNext) statementNext.onclick = () => { if (statementPage < statementPages) openPartyProfile(kind, id, invoicePage, statementPage + 1); };
    drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
    drawer.querySelectorAll('.profile-block .data-row.clickable').forEach((row) => {
      row.onclick = async () => {
        await openInvoice(invoiceKind, row.dataset.id);
        const close = document.getElementById('closeDrawer');
        if (close) close.onclick = () => openPartyProfile(kind, id, invoicePage, statementPage);
      };
    });
  } catch (error) {
    drawer.innerHTML = `<article class="sheet popup"><header><div><h2>${title}</h2></div><button id="closeDrawer" class="ghost" type="button">إغلاق</button></header><div class="error">${esc(error.message)}</div></article>`;
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
  const options = allStoreOptions(state.storeId);
  const pages = Math.max(1, Math.ceil(data.total / 40));
  const rows = grid(
    [
      { label: 'رقم الصنف', width: '0.7fr' },
      { label: 'الكود', width: '0.8fr' },
      { label: 'المنتج', width: '2fr' },
      { label: 'المخزن', width: '1.2fr' },
      { label: 'الكمية', width: '0.7fr' }
    ],
    data.rows.map((row) => ({
      cells: [esc(row.id), esc(row.code), esc(row.name), esc(row.storeName), num(row.qty)],
      classes: ['', '', '', '', Number(row.qty) < 0 ? 'neg' : '']
    }))
  );
  content.innerHTML = `<div class="toolbar">
      <input id="q" value="${esc(state.q)}" placeholder="رقم أو كود أو اسم المنتج">
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

function renderTransfer() {
  const lines = [];
  const destination = state.stores[1] ? state.stores[1].id : null;
  content.innerHTML = `
    <div class="panel panel-pad sale-form">
      <div class="toolbar">
        <label class="dash-store">من المخزن<select id="fromStore">${storeOptions(state.stores[0] ? state.stores[0].id : null)}</select></label>
        <label class="dash-store">إلى المخزن<select id="toStore">${storeOptions(destination)}</select></label>
      </div>
      <div class="toolbar">
        <input id="productQ" placeholder="رقم أو كود أو اسم المنتج">
        <input id="lineQty" type="number" min="0.01" step="0.01" value="1" placeholder="الكمية">
        <button id="findProduct" type="button">بحث منتج</button>
      </div>
      <div id="productResults"></div>
      <div class="data" style="--cols:1.6fr .8fr .7fr .5fr">
        <div class="data-head"><span>الصنف</span><span>الكود</span><span>الكمية</span><span></span></div>
        <div id="transferLines"></div>
      </div>
      <p class="note">الكمية تخرج من المخزن الأول وتدخل المخزن الثاني. حركة الصنف تعرض تحويل خروج وتحويل دخول.</p>
      <button id="saveTransfer" class="primary" type="button">حفظ التحويل</button>
      <div id="transferError" class="error"></div>
    </div>`;
  const draw = () => {
    document.getElementById('transferLines').innerHTML = lines.map((line, index) =>
      `<div class="data-row"><span data-label="الصنف">${esc(line.name)}</span><span data-label="الكود">${esc(line.code)}</span><span data-label="الكمية">${num(line.qty)}</span><span data-label="حذف"><button type="button" data-i="${index}" class="ghost remove-line">حذف</button></span></div>`
    ).join('') || '<div class="empty">لم تُضف أصناف</div>';
    document.querySelectorAll('.remove-line').forEach((button) => {
      button.onclick = () => { lines.splice(Number(button.dataset.i), 1); draw(); };
    });
  };
  draw();
  document.getElementById('findProduct').onclick = async () => {
    const q = document.getElementById('productQ').value.trim();
    const data = await api('/api/products?q=' + encodeURIComponent(q) + '&page=1&pageSize=8');
    document.getElementById('productResults').innerHTML = grid(
      [{ label: 'رقم الصنف', width: '0.7fr' }, { label: 'الكود', width: '0.8fr' }, { label: 'المنتج', width: '1.6fr' }, { label: 'الرصيد الكلي', width: '0.7fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-code="${esc(row.code)}" data-name="${esc(row.name)}"`,
        cells: [esc(row.id), esc(row.code), esc(row.name), num(row.stock)]
      }))
    );
    document.querySelectorAll('#productResults .data-row').forEach((row) => {
      row.onclick = () => {
        const qty = Number(document.getElementById('lineQty').value);
        if (!(qty > 0)) {
          document.getElementById('transferError').textContent = 'اكتب الكمية قبل اختيار المنتج';
          return;
        }
        lines.push({ productId: Number(row.dataset.id), code: row.dataset.code, name: row.dataset.name, qty });
        document.getElementById('transferError').textContent = '';
        draw();
      };
    });
  };
  document.getElementById('saveTransfer').onclick = async () => {
    const button = document.getElementById('saveTransfer');
    const error = document.getElementById('transferError');
    error.textContent = '';
    button.disabled = true;
    try {
      const result = await api('/api/transfers', {
        method: 'POST',
        body: JSON.stringify({
          fromStoreId: Number(document.getElementById('fromStore').value),
          toStoreId: Number(document.getElementById('toStore').value),
          lines
        })
      });
      content.innerHTML = `<div class="panel panel-pad"><p class="note">تم تحويل المخزون برقم ${esc(result.no)}. افتح تقرير حركة الصنف لترى خروج الكمية من المخزن الأول ودخولها في الثاني.</p><button id="anotherTransfer" class="primary" type="button">تحويل آخر</button></div>`;
      document.getElementById('anotherTransfer').onclick = () => openSection('transfer');
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  };
}

const draft = { clientId: 0, clientName: 'عميل نقدي', lines: [], editId: null, editNo: null, paid: true, partial: 0, discount: 0, storeId: null, hold: false };
const purchaseDraft = { supplierId: 0, supplierName: 'مشتريات نقدية', lines: [], editId: null, editNo: null, paid: true, partial: 0, discount: 0, storeId: null, hold: false };

function resetSaleDraft() {
  draft.clientId = 0;
  draft.clientName = 'عميل نقدي';
  draft.lines = [];
  draft.editId = null;
  draft.editNo = null;
  draft.paid = true;
  draft.partial = 0;
  draft.discount = 0;
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
  purchaseDraft.discount = 0;
  purchaseDraft.storeId = null;
  purchaseDraft.hold = false;
}

function allStoreOptions(selected) {
  const current = selected == null ? '' : String(selected);
  const mark = (value) => value === current ? ' selected' : '';
  return `<option value=""${mark('')}>كل المخازن</option>${state.stores.map((store) =>
    `<option value="${store.id}"${mark(String(store.id))}>${esc(store.name)}</option>`
  ).join('')}`;
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
      <button id="${prefix}Save" class="primary" type="button">حفظ المنتج وإضافته للفاتورة</button>
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
        code: result.code || code,
        name,
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

function paidFields(paid, partial, label) {
  return `<label class="checkline"><input id="paidNow" type="checkbox" ${paid ? 'checked' : ''}> ${label}</label>
        <label class="paid-amount${paid ? '' : ' hidden'}" id="paidAmountWrap">المدفوع<input id="paidAmount" type="number" min="0" step="0.01" value="${partial || ''}" placeholder="كامل الإجمالي"></label>`;
}

function bindPaidAmount() {
  const box = document.getElementById('paidNow');
  const wrap = document.getElementById('paidAmountWrap');
  box.onchange = () => wrap.classList.toggle('hidden', !box.checked);
}

function showDraftTotal(target, inputId, gross) {
  const raw = Number(document.getElementById(inputId).value || 0);
  const discount = Number.isFinite(raw) && raw > 0 ? Math.min(raw, gross) : 0;
  target.discount = discount;
  document.getElementById('draftTotal').textContent = `الأصناف ${money(gross)} · الخصم ${money(discount)} · الصافي ${money(Math.max(gross - discount, 0))}`;
}

function bindNewParty(kind) {
  const sale = kind === 'sales';
  const box = document.getElementById(sale ? 'newClientBox' : 'newSupplierBox');
  const error = document.getElementById(sale ? 'saleError' : 'purchaseError');
  document.getElementById(sale ? 'newClient' : 'newSupplier').onclick = () => box.classList.toggle('hidden');
  document.getElementById(sale ? 'saveClient' : 'saveSupplier').onclick = async () => {
    error.textContent = '';
    try {
      const created = await api(sale ? '/api/clients' : '/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById(sale ? 'newClientName' : 'newSupplierName').value,
          phone: document.getElementById(sale ? 'newClientPhone' : 'newSupplierPhone').value
        })
      });
      const target = sale ? draft : purchaseDraft;
      if (sale) {
        target.clientId = created.id;
        target.clientName = created.name;
        document.getElementById('clientPick').textContent = `العميل: ${created.name}`;
      } else {
        target.supplierId = created.id;
        target.supplierName = created.name;
        document.getElementById('supplierPick').textContent = `المورد: ${created.name}`;
      }
      document.getElementById('paidNow').checked = false;
      document.getElementById('paidAmountWrap').classList.add('hidden');
      box.classList.add('hidden');
    } catch (err) {
      error.textContent = err.message;
    }
  };
}

function paidPayload() {
  const paid = document.getElementById('paidNow').checked;
  const raw = document.getElementById('paidAmount').value.trim();
  const payload = { paid };
  if (paid && raw !== '') payload.paidAmount = Number(raw);
  return payload;
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
        ${paidFields(draft.paid, draft.partial, 'تحصيل نقدي')}
        <button id="findClient" type="button">بحث عميل</button>
        <button id="newClient" type="button" class="ghost">عميل جديد</button>
      </div>
      <div id="clientPick" class="meta">العميل: ${esc(draft.clientName || 'عميل نقدي')}</div>
      <div id="newClientBox" class="mini-product hidden">
        <input id="newClientName" maxlength="50" placeholder="اسم العميل">
        <input id="newClientPhone" maxlength="20" placeholder="الموبايل، ويمكن تركه فارغاً">
        <button id="saveClient" class="primary" type="button">حفظ العميل واستخدامه</button>
      </div>
      <div id="clientResults"></div>
      <div class="toolbar">
        <input id="productQ" placeholder="رقم أو كود أو اسم المنتج">
        <input id="lineQty" type="number" min="0.01" step="0.01" value="1" placeholder="الكمية">
        <input id="linePrice" type="number" min="0" step="0.01" placeholder="السعر">
        <button id="findProduct" type="button">بحث منتج</button>
      </div>
      <div id="productResults"></div>
      ${inlineProductHtml('saleNew')}
      <div class="data line-grid${editing ? ' line-grid-edit' : ''}">
        <div class="data-head"><span>الصنف</span><span>رقم الصنف</span><span>الكود</span>${editing ? '<span>المخزن</span>' : ''}<span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>
        <div id="draftLines"></div>
      </div>
      <div class="toolbar"><label class="paid-amount">الخصم<input id="saleDiscount" type="number" min="0" step="0.01" value="${draft.discount || ''}" placeholder="0"></label></div>
      <div class="meta"><span id="draftTotal">الإجمالي: 0</span></div>
      <p class="note">${draft.partial ? `المحصّل حالياً ${money(draft.partial)}. غيّر خانة المدفوع لو عايز مبلغاً مختلفاً، ولو فضيتها التحصيل يبقى على كامل الفاتورة. لو شلت العلامة، المبلغ المحصّل يفضل كما هو.` : 'اكتب في خانة المدفوع مبلغاً أقل من الإجمالي لو التحصيل جزئي، والباقي يفضل على العميل. اتركها فاضية لتحصيل الفاتورة كاملة.'}</p>
      <button id="saveSale" class="primary" type="button">${editing ? 'حفظ التعديل' : 'حفظ الفاتورة'}</button>
      ${editing ? '<button id="cancelEdit" class="ghost wide-ghost" type="button">رجوع للفاتورة</button>' : ''}
      <p class="note">${editing ? 'حفظ التعديل يغيّر أصناف الفاتورة والمخزون والقيد على قاعدة البيانات الفعلية.' : 'الحفظ ينزل على قاعدة البيانات الفعلية: فاتورة، أصناف، مخزون، قيد، وتحصيل نقدي لو تم اختياره.'}</p>
      <div id="saleError" class="error"></div>
    </div>`;
  const drawLines = () => {
    const total = draft.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    document.getElementById('draftLines').innerHTML = draft.lines.map((line, index) =>
      `<div class="data-row"><span data-label="الصنف">${esc(line.name)}</span><span data-label="رقم الصنف">${esc(line.productId || '')}</span><span data-label="الكود">${esc(line.code || '')}</span>${editing ? `<span data-label="المخزن"><select data-i="${index}" class="line-store">${storeOptions(line.storeId)}</select></span>` : ''}<span data-label="الكمية"><input class="line-qty" data-i="${index}" type="number" min="0.01" step="0.01" value="${line.qty}"></span><span data-label="السعر"><input class="line-price" data-i="${index}" type="number" min="0" step="0.01" value="${line.price}"></span><span data-label="الإجمالي" class="line-sum">${money(line.qty * line.price)}</span><span data-label="حذف"><button type="button" data-i="${index}" class="ghost remove-line">حذف</button></span></div>`
    ).join('') || '<div class="empty">لم تُضف أصناف</div>';
    showDraftTotal(draft, 'saleDiscount', total);
    document.querySelectorAll('.line-qty, .line-price').forEach((input) => {
      input.oninput = () => {
        readLineInputs(draft.lines);
        const row = input.closest('.data-row');
        const line = draft.lines[Number(input.dataset.i)];
        row.querySelector('.line-sum').textContent = money(line.qty * line.price);
        const next = draft.lines.reduce((sum, item) => sum + item.qty * item.price, 0);
        showDraftTotal(draft, 'saleDiscount', next);
      };
    });
    document.querySelectorAll('.remove-line').forEach((button) => {
      button.onclick = () => { readLineInputs(draft.lines); draft.lines.splice(Number(button.dataset.i), 1); drawLines(); };
    });
  };
  drawLines();
  bindPaidAmount();
  bindNewParty('sales');
  document.getElementById('saleDiscount').oninput = () => {
    const total = draft.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    showDraftTotal(draft, 'saleDiscount', total);
  };
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
      [{ label: 'رقم الصنف', width: '0.7fr' }, { label: 'الكود', width: '0.8fr' }, { label: 'المنتج', width: '1.6fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-code="${esc(row.code)}" data-name="${esc(row.name)}" data-price="${Number(row.salePrice || 0)}"`,
        cells: [esc(row.id), esc(row.code), esc(row.name)]
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
          code: row.dataset.code,
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
        discount: Number(document.getElementById('saleDiscount').value || 0),
        ...paidPayload(),
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
        ${paidFields(purchaseDraft.paid, purchaseDraft.partial, 'سداد نقدي')}
        <button id="findSupplier" type="button">بحث مورد</button>
        <button id="newSupplier" type="button" class="ghost">مورد جديد</button>
      </div>
      <div id="supplierPick" class="meta">المورد: ${esc(purchaseDraft.supplierName || 'مشتريات نقدية')}</div>
      <div id="newSupplierBox" class="mini-product hidden">
        <input id="newSupplierName" maxlength="50" placeholder="اسم المورد">
        <input id="newSupplierPhone" maxlength="20" placeholder="الموبايل، ويمكن تركه فارغاً">
        <button id="saveSupplier" class="primary" type="button">حفظ المورد واستخدامه</button>
      </div>
      <div id="supplierResults"></div>
      <div class="toolbar">
        <input id="productQ" placeholder="رقم أو كود أو اسم المنتج">
        <input id="lineQty" type="number" min="0.01" step="0.01" value="1" placeholder="الكمية">
        <input id="linePrice" type="number" min="0" step="0.01" placeholder="سعر الشراء">
        <button id="findProduct" type="button">بحث منتج</button>
      </div>
      <div id="productResults"></div>
      ${inlineProductHtml('buyNew')}
      <div class="data line-grid${editing ? ' line-grid-edit' : ''}">
        <div class="data-head"><span>الصنف</span><span>رقم الصنف</span><span>الكود</span>${editing ? '<span>المخزن</span>' : ''}<span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>
        <div id="draftLines"></div>
      </div>
      <div class="toolbar"><label class="paid-amount">الخصم<input id="purchaseDiscount" type="number" min="0" step="0.01" value="${purchaseDraft.discount || ''}" placeholder="0"></label></div>
      <div class="meta"><span id="draftTotal">الإجمالي: 0</span></div>
      <p class="note">${purchaseDraft.partial ? `المدفوع حالياً ${money(purchaseDraft.partial)}. غيّر خانة المدفوع لو عايز مبلغاً مختلفاً، ولو فضيتها السداد يبقى على كامل الفاتورة. لو شلت العلامة، المبلغ المدفوع يفضل كما هو.` : 'اكتب في خانة المدفوع مبلغاً أقل من الإجمالي لو السداد جزئي، والباقي يفضل على المورد. اتركها فاضية لسداد الفاتورة كاملة.'}</p>
      <button id="savePurchase" class="primary" type="button">${editing ? 'حفظ التعديل' : 'حفظ فاتورة الشراء'}</button>
      ${editing ? '<button id="cancelEdit" class="ghost wide-ghost" type="button">رجوع للفاتورة</button>' : ''}
      <p class="note">${editing ? 'حفظ التعديل يغيّر أصناف الفاتورة والمخزون والقيد على قاعدة البيانات الفعلية.' : 'الحفظ ينزل على قاعدة البيانات الفعلية: فاتورة شراء، أصناف، زيادة المخزون، قيد، وسداد نقدي لو تم اختياره.'}</p>
      <div id="purchaseError" class="error"></div>
    </div>`;
  const drawLines = () => {
    const total = purchaseDraft.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    document.getElementById('draftLines').innerHTML = purchaseDraft.lines.map((line, index) =>
      `<div class="data-row"><span data-label="الصنف">${esc(line.name)}</span><span data-label="رقم الصنف">${esc(line.productId || '')}</span><span data-label="الكود">${esc(line.code || '')}</span>${editing ? `<span data-label="المخزن"><select data-i="${index}" class="line-store">${storeOptions(line.storeId)}</select></span>` : ''}<span data-label="الكمية"><input class="line-qty" data-i="${index}" type="number" min="0.01" step="0.01" value="${line.qty}"></span><span data-label="السعر"><input class="line-price" data-i="${index}" type="number" min="0" step="0.01" value="${line.price}"></span><span data-label="الإجمالي" class="line-sum">${money(line.qty * line.price)}</span><span data-label="حذف"><button type="button" data-i="${index}" class="ghost remove-line">حذف</button></span></div>`
    ).join('') || '<div class="empty">لم تُضف أصناف</div>';
    showDraftTotal(purchaseDraft, 'purchaseDiscount', total);
    document.querySelectorAll('.line-qty, .line-price').forEach((input) => {
      input.oninput = () => {
        readLineInputs(purchaseDraft.lines);
        const row = input.closest('.data-row');
        const line = purchaseDraft.lines[Number(input.dataset.i)];
        row.querySelector('.line-sum').textContent = money(line.qty * line.price);
        const next = purchaseDraft.lines.reduce((sum, item) => sum + item.qty * item.price, 0);
        showDraftTotal(purchaseDraft, 'purchaseDiscount', next);
      };
    });
    document.querySelectorAll('.remove-line').forEach((button) => {
      button.onclick = () => { readLineInputs(purchaseDraft.lines); purchaseDraft.lines.splice(Number(button.dataset.i), 1); drawLines(); };
    });
  };
  drawLines();
  bindPaidAmount();
  bindNewParty('purchases');
  document.getElementById('purchaseDiscount').oninput = () => {
    const total = purchaseDraft.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    showDraftTotal(purchaseDraft, 'purchaseDiscount', total);
  };
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
      [{ label: 'رقم الصنف', width: '0.7fr' }, { label: 'الكود', width: '0.8fr' }, { label: 'المنتج', width: '1.6fr' }],
      data.rows.map((row) => ({
        clickable: true,
        attrs: `data-id="${row.id}" data-code="${esc(row.code)}" data-name="${esc(row.name)}" data-price="${Number(row.buyPrice || 0)}"`,
        cells: [esc(row.id), esc(row.code), esc(row.name)]
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
          code: row.dataset.code,
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
        discount: Number(document.getElementById('purchaseDiscount').value || 0),
        ...paidPayload(),
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

function longDate(value) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? dateText(value) : date.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
}

function printDocument(html, title) {
  const root = document.getElementById('printRoot');
  root.innerHTML = html;
  document.body.classList.add('printing-invoice');
  const previous = document.title;
  document.title = title;
  const done = () => {
    document.body.classList.remove('printing-invoice');
    document.title = previous;
    root.innerHTML = '';
  };
  const images = [...root.querySelectorAll('img')];
  Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  })).then(() => {
    window.addEventListener('afterprint', done, { once: true });
    window.print();
  });
}

const invoiceColumns = [
  { id: 'productNo', label: 'رقم الصنف', width: '0.7fr', numeric: true, value: (line) => esc(line.productId || '') },
  { id: 'code', label: 'الكود', width: '0.8fr', value: (line) => esc(line.code) },
  { id: 'name', label: 'الصنف', width: '1.4fr', value: (line) => esc(line.name) },
  { id: 'store', label: 'المخزن', width: '0.9fr', value: (line) => esc(line.storeName) },
  { id: 'qty', label: 'الكمية', width: '0.5fr', numeric: true, value: (line) => num(line.qty) },
  { id: 'returned', label: 'المرتجع', width: '0.5fr', numeric: true, value: (line) => num(line.returned) },
  { id: 'price', label: 'السعر', width: '0.6fr', numeric: true, value: (line) => money(line.price) },
  { id: 'total', label: 'الإجمالي', width: '0.7fr', numeric: true, value: (line) => money(line.lineTotal) }
];

function invoiceColumnVisibility() {
  const visible = {};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('ramzy-invoice-columns') || '{}'); } catch (error) { saved = {}; }
  invoiceColumns.forEach((column) => { visible[column.id] = saved[column.id] !== false; });
  if (!invoiceColumns.some((column) => visible[column.id])) visible.name = true;
  return visible;
}

function visibleInvoiceColumns() {
  const visible = invoiceColumnVisibility();
  return invoiceColumns.filter((column) => visible[column.id]);
}

function invoiceLinesGrid(lines) {
  const columns = visibleInvoiceColumns();
  return grid(
    columns.map((column) => ({ label: column.label, width: column.width })),
    lines.map((line) => ({ cells: columns.map((column) => column.value(line)) }))
  );
}

function invoiceColumnPicks() {
  const visible = invoiceColumnVisibility();
  return `<div class="column-picks" id="invoiceColumns"><span>أعمدة الفاتورة</span>${invoiceColumns.map((column) =>
    `<label><input type="checkbox" data-column="${column.id}" ${visible[column.id] ? 'checked' : ''}> ${column.label}</label>`
  ).join('')}</div>`;
}

function bindInvoiceColumns(lines) {
  document.querySelectorAll('#invoiceColumns input').forEach((input) => {
    input.onchange = () => {
      const checked = [...document.querySelectorAll('#invoiceColumns input:checked')];
      if (!checked.length) {
        input.checked = true;
        return;
      }
      const visible = {};
      invoiceColumns.forEach((column) => {
        visible[column.id] = document.querySelector(`#invoiceColumns input[data-column="${column.id}"]`).checked;
      });
      try { localStorage.setItem('ramzy-invoice-columns', JSON.stringify(visible)); } catch (error) {}
      document.getElementById('invoiceLines').innerHTML = invoiceLinesGrid(lines);
    };
  });
}

function invoicePrintHtml(kind, data) {
  const invoice = data.invoice;
  const sale = kind === 'sales';
  const title = sale ? 'فاتورة بيع' : 'فاتورة شراء';
  const party = sale ? 'العميل' : 'المورد';
  const printedAt = new Date().toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
  const columns = visibleInvoiceColumns();
  const head = columns.map((column) => `<th class="${column.numeric ? 'num' : ''}">${column.label}</th>`).join('');
  const body = data.lines.length
    ? data.lines.map((line) => `<tr>${columns.map((column) => `<td class="${column.numeric ? 'num' : ''}">${column.value(line)}</td>`).join('')}</tr>`).join('')
    : `<tr><td class="print-empty" colspan="${Math.max(columns.length, 1)}">لا توجد أصناف</td></tr>`;
  const facts = [
    [party, invoice.name || '—'],
    ['التاريخ', longDate(invoice.date)],
    ['المستخدم', invoice.byName || '—'],
    ['عدد الأصناف', num(data.lines.length)]
  ];
  const totals = [
    ...(Number(invoice.discount) > 0 ? [['قبل الخصم', money(invoice.products)], ['الخصم', money(invoice.discount)]] : []),
    ['الإجمالي', money(invoice.total)],
    ['المدفوع', money(invoice.paid)],
    ['المرتجع', money(invoice.returnedAmount)],
    ['المتبقي', money(invoice.due)]
  ];
  return `<article class="print-sheet">
    <header class="print-brand">
      <img src="/logo.png?v=20261009a" alt="">
      <div>
        <p class="print-kicker">AL RAMZY BROTHERS</p>
        <strong>الرمزي إخوان</strong>
        <span>إدارة فروع الرمزي</span>
      </div>
      <div class="print-title">
        <h1>${title}</h1>
        <p>رقم ${esc(invoice.no)}</p>
      </div>
    </header>
    <div class="print-facts">${facts.map(([label, value]) => `<div><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
    <div class="print-totals">${totals.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    ${invoice.notes ? `<p class="print-note">ملاحظات: ${esc(invoice.notes)}</p>` : ''}
    <footer class="print-foot"><span>الرمزي إخوان · ${title} رقم ${esc(invoice.no)}</span><span>طُبعت ${esc(printedAt)}</span></footer>
  </article>`;
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
      ${data.lines.some((line) => Number(line.qty) - Number(line.returned) > 0) ? '<button id="returnBtn" class="history-btn primary" type="button">مرتجع من الفاتورة</button>' : ''}
      <button id="printInvoice" class="ghost" type="button">طباعة الفاتورة</button>
      <button id="editInvoice" type="button">تعديل الفاتورة</button>
    </div>
    <div class="money">
      ${Number(invoice.discount) > 0 ? `<div><span>قبل الخصم</span><strong>${money(invoice.products)}</strong></div><div><span>الخصم</span><strong>${money(invoice.discount)}</strong></div>` : ''}
      <div><span>الإجمالي</span><strong>${money(invoice.total)}</strong></div>
      <div><span>المدفوع</span><strong>${money(invoice.paid)}</strong></div>
      <div><span>المرتجع</span><strong>${money(invoice.returnedAmount)}</strong></div>
      <div><span>المتبقي</span><strong>${money(invoice.due)}</strong></div>
    </div>
    ${invoiceColumnPicks()}
    <div id="invoiceLines">${invoiceLinesGrid(data.lines)}</div>
    ${invoice.notes ? `<p class="note">${esc(invoice.notes)}</p>` : ''}
    <div id="returnError" class="error"></div>
  </article>`;
  document.getElementById('closeDrawer').onclick = () => drawer.classList.add('hidden');
  drawer.onclick = (event) => { if (event.target === drawer) drawer.classList.add('hidden'); };
  bindInvoiceColumns(data.lines);
  const returnBtn = document.getElementById('returnBtn');
  if (returnBtn) returnBtn.onclick = () => openReturn(kind, id, data);
  document.getElementById('printInvoice').onclick = () => {
    const title = kind === 'sales' ? 'فاتورة بيع' : 'فاتورة شراء';
    printDocument(invoicePrintHtml(kind, data), `${title} ${invoice.no} - الرمزي إخوان`);
  };
  document.getElementById('editInvoice').onclick = () => beginEdit(kind, id);
}

async function beginEdit(kind, id) {
  const data = await api(`/api/${kind}/${id}`);
  const invoice = data.invoice;
  const fully = Number(invoice.paid) > 0 && Math.abs(Number(invoice.paid) - Number(invoice.total)) < 0.05;
  const lines = data.lines.map((line) => ({
    lineId: Number(line.lineId),
    productId: Number(line.productId),
    code: line.code || '',
    storeId: Number(line.storeId),
    name: line.name,
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
  target.discount = Number(invoice.discount) || 0;
  target.partial = !fully && Number(invoice.paid) > 0 ? Number(invoice.paid) : 0;
  target.paid = fully || target.partial > 0;
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
    <div class="data" style="--cols:1.4fr .7fr .8fr .5fr .7fr .8fr">
      <div class="data-head"><span>الصنف</span><span>رقم الصنف</span><span>الكود</span><span>المتبقي</span><span>كمية المرتجع</span><span>الإجمالي</span></div>
      ${lines.map((line) => {
        const left = Number(line.qty) - Number(line.returned);
        return `<div class="data-row"><span data-label="الصنف">${esc(line.name)}</span><span data-label="رقم الصنف">${esc(line.productId || '')}</span><span data-label="الكود">${esc(line.code || '')}</span><span data-label="المتبقي">${num(left)}</span><span data-label="كمية المرتجع"><input class="return-qty" data-id="${line.lineId}" data-price="${Number(line.price)}" type="number" min="0" max="${left}" step="0.01" value="0"></span><span data-label="الإجمالي" class="return-total">0</span></div>`;
      }).join('')}
    </div>
    <div class="meta"><span id="returnTotal">الإجمالي: 0</span></div>
    <button id="saveReturn" class="primary" type="button">حفظ المرتجع</button>
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
    state.readOnly = Boolean(data.readOnly);
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

api('/api/me').then((data) => {
  if (!data.user) return;
  state.readOnly = Boolean(data.readOnly);
  showApp(data.user);
}).catch(() => {});
