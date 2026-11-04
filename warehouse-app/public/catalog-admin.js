function canCatalog() {
  const user = state.user;
  return Boolean(user) && (user.role === 'superadmin' || (user.perms || []).includes('catalog'));
}

function catalogMedia(id) {
  return `/api/catalog/media/${esc(id)}-sm.webp`;
}

async function catalogUploadImage(url, file) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type }, body: file, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'تعذر رفع الصورة');
  return data;
}

function catalogSay(el, text, ok) {
  el.textContent = text;
  el.className = ok ? 'meta' : 'error';
}

function catalogOptions(list, selected) {
  return `<option value="">—</option>${list.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === selected ? 'selected' : ''}>${esc(entry.nameAr)}</option>`).join('')}`;
}

function catalogCheck(id, checked, label) {
  return `<span class="checkline"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}> ${label}</span>`;
}

async function openCatalogItem(productId, options = {}) {
  const key = `catalog:${productId}`;
  const opened = showTab(key, 'كتالوج صنف', {
    force: Boolean(options.force),
    reload: () => openCatalogItem(productId, { force: true })
  });
  if (opened.mode !== 'fresh') return;
  const epoch = ++opened.tab.epoch;
  content.innerHTML = '<div class="skeleton"><span></span><span></span><span></span></div>';
  let data;
  try {
    data = await api(`/api/catalog/items/${productId}`);
  } catch (error) {
    if (!tabIsCurrent(key, epoch)) return abandonTab(key, epoch);
    content.innerHTML = `<div class="error">${esc(error.message)}</div>`;
    return;
  }
  if (!tabIsCurrent(key, epoch)) return abandonTab(key, epoch);
  opened.tab.title = `كتالوج · ${data.product.name || productId}`;
  setDocumentHeading(opened.tab);
  renderTabStrip();
  drawCatalogItem(key, productId, data);
}

const catalogReadOnlyNote = '<p class="note">النسخة الخارجية للعرض فقط، التعديل والنشر مقفولين.</p>';

function drawCatalogItem(key, productId, data) {
  const item = data.item;
  const p = data.product;
  const readOnly = state.readOnly;
  let images = item.images.slice();
  content.innerHTML = `<article class="sheet">
    <header>
      <div><h2>كتالوج الصنف</h2><p>${esc(productCode(p.code, p.id))} · ${esc(p.name || 'صنف غير موجود')}</p></div>
      <button id="closeDrawer" class="ghost" type="button">إغلاق</button>
    </header>
    ${readOnly ? catalogReadOnlyNote : ''}
    ${p.exists ? '' : '<p class="error">الصنف مش موجود في البرنامج، ومش هيتنشر.</p>'}
    <form id="catalogForm" class="form-grid">
      ${field('النشر', catalogCheck('cPublished', item.published, 'منشور في الكتالوج'))}
      ${field('الصفحة الرئيسية', catalogCheck('cFeatured', item.featured, 'صنف مميز'))}
      ${field('الاسم بالعربي', `<input id="cNameAr" maxlength="120" value="${esc(item.nameAr)}" placeholder="${esc(p.name)}">`)}
      ${field('الاسم بالإنجليزي', `<input id="cNameEn" maxlength="120" dir="ltr" value="${esc(item.nameEn)}">`)}
      ${field('الماركة', `<select id="cBrand">${catalogOptions(data.brands, item.brandId)}</select>`)}
      ${field('القسم', `<select id="cSection">${catalogOptions(data.sections, item.sectionId)}</select>`)}
      ${field('الوصف بالعربي', `<textarea id="cDescAr" rows="5" maxlength="4000">${esc(item.descriptionAr)}</textarea>`, true)}
      ${field('الوصف بالإنجليزي', `<textarea id="cDescEn" rows="5" maxlength="4000" dir="ltr">${esc(item.descriptionEn)}</textarea>`, true)}
      ${field('رقم القطعة', `<input id="cPart" maxlength="80" value="${esc(item.partNumber)}" placeholder="${esc(p.code)}">`)}
      ${field('إظهار رقم القطعة', catalogCheck('cShowPart', item.showPartNumber, 'يظهر للعميل'))}
      ${field('المنشأ والماركة بالعربي', `<input id="cOriginAr" maxlength="120" value="${esc(item.originAr)}">`)}
      ${field('المنشأ والماركة بالإنجليزي', `<input id="cOriginEn" maxlength="120" dir="ltr" value="${esc(item.originEn)}">`)}
      ${field('إظهار المنشأ', catalogCheck('cShowOrigin', item.showOrigin, 'يظهر للعميل'))}
      ${field('بيركب على (عربي)', `<input id="cFitsAr" maxlength="300" value="${esc(item.fitsAr)}">`, true)}
      ${field('بيركب على (إنجليزي)', `<input id="cFitsEn" maxlength="300" dir="ltr" value="${esc(item.fitsEn)}">`, true)}
      ${field('إظهار بيركب على', catalogCheck('cShowFits', item.showFits, 'يظهر للعميل'))}
      ${field('التوفر', catalogCheck('cShowAvail', item.showAvailability, 'إظهار علامة متوفر / غير متوفر'))}
      ${field('المواصفات الفنية', `<textarea id="cSpecs" rows="7" maxlength="2000" dir="ltr" placeholder="OEM: 003 420 7718&#10;OEM: 002 420 5218&#10;FTE: R 4192B1&#10;DIA: 41.27 mm&#10;WITHOUT PRESSURE PIN">${esc(item.specs || '')}</textarea><small>سطر لكل معلومة بالشكل «التسمية: القيمة». الأرقام اللي ليها نفس التسمية بتتجمّع تحت بعض. السطر من غير «:» بيظهر كملاحظة.</small>`, true)}
      <div class="wide"><strong>الصور</strong> <small>لحد 5 صور (JPG أو PNG أو WebP، لحد 8 ميجا). الأولى هي الرئيسية.</small>
        <div id="cImages" class="cat-images"></div>
        ${readOnly ? '' : '<label class="cat-upload">إضافة صور<input id="cUpload" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label>'}
      </div>
      ${readOnly ? '' : `<div class="wide actions">
        <button class="primary" type="submit">حفظ</button>
        ${data.saved ? '<button id="cRemove" class="ghost" type="button">إزالة من الكتالوج</button>' : ''}
      </div>`}
    </form>
    <p class="note">الحفظ مش بيغيّر الموقع على طول. التغييرات بتظهر بعد «نشر الكتالوج» من صفحة الكتالوج.</p>
    <p id="catalogMsg" class="meta"></p>
  </article>`;
  docPageActions();
  const root = content.querySelector('article.sheet');
  const form = root.querySelector('#catalogForm');
  const msg = root.querySelector('#catalogMsg');
  const imagesEl = root.querySelector('#cImages');
  const imageCaption = (id, index) => {
    if (readOnly) return index === 0 ? '<span>الرئيسية</span>' : '';
    const main = index === 0 ? '<span>الرئيسية</span>' : `<button type="button" class="ghost" data-main="${esc(id)}">اجعلها الرئيسية</button>`;
    const earlier = index > 0 ? `<button type="button" class="ghost cat-move" data-earlier="${index}" aria-label="قدّم">←</button>` : '';
    const later = index < images.length - 1 ? `<button type="button" class="ghost cat-move" data-later="${index}" aria-label="أخّر">→</button>` : '';
    return `${main}${earlier}${later}<button type="button" class="ghost" data-del="${esc(id)}">حذف</button>`;
  };
  const drawImages = () => {
    imagesEl.innerHTML = images.map((id, index) => `<figure class="cat-thumb${index === 0 ? ' main' : ''}"><img src="${catalogMedia(id)}" alt=""><figcaption>${imageCaption(id, index)}</figcaption></figure>`).join('') || '<p class="note">لا توجد صور</p>';
  };
  drawImages();
  if (readOnly) form.querySelectorAll('input, select, textarea').forEach((el) => { el.disabled = true; });
  root.querySelector('#closeDrawer').onclick = () => closeTab(key);
  if (!readOnly) {
    imagesEl.onclick = async (event) => {
      const main = event.target.closest('[data-main]');
      const earlier = event.target.closest('[data-earlier]');
      const later = event.target.closest('[data-later]');
      const del = event.target.closest('[data-del]');
      if (earlier) {
        const i = Number(earlier.dataset.earlier);
        [images[i - 1], images[i]] = [images[i], images[i - 1]];
        drawImages();
        catalogSay(msg, 'اضغط حفظ عشان ترتيب الصور يتسجّل', true);
        return;
      }
      if (later) {
        const i = Number(later.dataset.later);
        [images[i], images[i + 1]] = [images[i + 1], images[i]];
        drawImages();
        catalogSay(msg, 'اضغط حفظ عشان ترتيب الصور يتسجّل', true);
        return;
      }
      if (main) {
        images = [main.dataset.main].concat(images.filter((id) => id !== main.dataset.main));
        drawImages();
        catalogSay(msg, 'اضغط حفظ عشان ترتيب الصور يتسجّل', true);
        return;
      }
      if (!del || !window.confirm('حذف الصورة؟')) return;
      try {
        const result = await api(`/api/catalog/items/${productId}/images/${del.dataset.del}`, { method: 'DELETE' });
        if (!root.isConnected) return;
        images = images.filter((id) => result.item.images.includes(id));
        drawImages();
      } catch (error) {
        if (!root.isConnected) return;
        catalogSay(msg, error.message, false);
      }
    };
    const upload = root.querySelector('#cUpload');
    if (upload) upload.onchange = async (event) => {
      const files = Array.from(event.target.files);
      event.target.value = '';
      for (const file of files) {
        catalogSay(msg, `جاري رفع ${file.name}...`, true);
        try {
          const result = await catalogUploadImage(`/api/catalog/items/${productId}/images`, file);
          if (!root.isConnected) return;
          images = images.concat(result.item.images.filter((id) => !images.includes(id)));
          drawImages();
          catalogSay(msg, 'اترفعت', true);
        } catch (error) {
          if (!root.isConnected) return;
          catalogSay(msg, `${file.name}: ${error.message}`, false);
          break;
        }
      }
    };
    const remove = root.querySelector('#cRemove');
    if (remove) remove.onclick = async () => {
      if (!window.confirm('إزالة الصنف من الكتالوج وحذف صوره؟')) return;
      try {
        await api(`/api/catalog/items/${productId}`, { method: 'DELETE' });
        if (!root.isConnected) return;
        closeTab(key, { silent: true });
      } catch (error) {
        if (!root.isConnected) return;
        catalogSay(msg, error.message, false);
      }
    };
    form.onsubmit = async (event) => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const value = (id) => form.querySelector(`#${id}`).value;
      const checked = (id) => form.querySelector(`#${id}`).checked;
      button.disabled = true;
      try {
        await api(`/api/catalog/items/${productId}`, {
          method: 'PUT',
          body: JSON.stringify({
            published: checked('cPublished'), featured: checked('cFeatured'),
            nameAr: value('cNameAr'), nameEn: value('cNameEn'), brandId: value('cBrand'), sectionId: value('cSection'),
            descriptionAr: value('cDescAr'), descriptionEn: value('cDescEn'),
            partNumber: value('cPart'), showPartNumber: checked('cShowPart'),
            originAr: value('cOriginAr'), originEn: value('cOriginEn'), showOrigin: checked('cShowOrigin'),
            fitsAr: value('cFitsAr'), fitsEn: value('cFitsEn'), showFits: checked('cShowFits'),
            showAvailability: checked('cShowAvail'), specs: value('cSpecs'), images
          })
        });
        if (!root.isConnected) return;
        catalogSay(msg, 'اتحفظ. اضغط «نشر الكتالوج» من صفحة الكتالوج عشان يظهر على الموقع.', true);
      } catch (error) {
        if (!root.isConnected) return;
        catalogSay(msg, error.message, false);
      }
      if (root.isConnected) button.disabled = false;
    };
  }
}

function renderCatalog(data) {
  const readOnly = state.readOnly;
  const lists = { brands: data.brands.map((x) => ({ ...x })), sections: data.sections.map((x) => ({ ...x })) };
  const company = data.company;
  const siteLink = /^https?:\/\//i.test(data.siteUrl || '')
    ? `<a href="${esc(data.siteUrl)}" target="_blank" rel="noopener">فتح الكتالوج</a>`
    : '';
  content.innerHTML = `<div class="cat-page">
    ${readOnly ? catalogReadOnlyNote : ''}
    <section class="panel panel-pad cat-head">
      <div><strong>${data.publishedAt ? `آخر نشر: ${whenText(data.publishedAt)}` : 'لسه ماتنشرش'}</strong>
        ${data.lastError ? `<p class="error">${esc(data.lastError)}</p>` : ''}
        ${data.namesError ? `<p class="note">${esc(data.namesError)}</p>` : ''}</div>
      <div class="cat-head-actions">${siteLink}${readOnly ? '' : '<button id="catPublish" class="primary" type="button">نشر الكتالوج</button>'}</div>
    </section>
    <div class="toolbar"><input id="catQ" placeholder="بحث بالاسم أو رقم الصنف"><select id="catFilter"><option value="">الكل</option><option value="1">منشور</option><option value="0">غير منشور</option></select></div>
    <div id="catItems"></div>
    <p class="note">لإضافة صنف للكتالوج افتح الصنف من صفحة الأصناف واضغط «كتالوج»، أو اضغط إضافة واكتب رقم الصنف.</p>
    <div class="cat-columns">
      <section class="panel panel-pad"><h3>الماركات</h3><div id="catBrands"></div>
        ${readOnly ? '' : '<div class="actions"><button type="button" class="ghost" data-add-row="brands">إضافة ماركة</button><button type="button" class="primary" data-save-list="brands">حفظ الماركات</button></div>'}<p id="catBrandsMsg" class="meta"></p></section>
      <section class="panel panel-pad"><h3>الأقسام</h3><div id="catSections"></div>
        ${readOnly ? '' : '<div class="actions"><button type="button" class="ghost" data-add-row="sections">إضافة قسم</button><button type="button" class="primary" data-save-list="sections">حفظ الأقسام</button></div>'}<p id="catSectionsMsg" class="meta"></p></section>
    </div>
    <section class="panel panel-pad"><h3>بيانات الشركة</h3>
      <form id="catCompany" class="form-grid">
        ${field('الشعار', `<span class="cat-logo">${company.logoId ? `<img src="${catalogMedia(company.logoId)}" alt="">` : ''}${readOnly ? '' : '<label class="cat-upload">رفع شعار<input id="catLogo" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>'}</span>`, true)}
        ${field('نبذة بالعربي', `<textarea id="coAboutAr" rows="3" maxlength="1500">${esc(company.aboutAr)}</textarea>`, true)}
        ${field('نبذة بالإنجليزي', `<textarea id="coAboutEn" rows="3" maxlength="1500" dir="ltr">${esc(company.aboutEn)}</textarea>`, true)}
        ${field('رقم الواتساب', `<input id="coWhatsapp" dir="ltr" value="${esc(company.whatsapp)}" placeholder="01xxxxxxxxx">`)}
        ${field('التليفون', `<input id="coPhone" dir="ltr" value="${esc(company.phone)}">`)}
        ${field('العنوان بالعربي', `<input id="coAddressAr" value="${esc(company.addressAr)}">`, true)}
        ${field('العنوان بالإنجليزي', `<input id="coAddressEn" dir="ltr" value="${esc(company.addressEn)}">`, true)}
        ${readOnly ? '' : '<div class="wide actions"><button class="primary" type="submit">حفظ بيانات الشركة</button></div>'}
      </form><p id="catCompanyMsg" class="meta"></p>
    </section></div>`;

  const root = content.querySelector('.cat-page');
  const catQ = root.querySelector('#catQ');
  const catFilter = root.querySelector('#catFilter');
  const catItems = root.querySelector('#catItems');
  const catBrands = root.querySelector('#catBrands');
  const catSections = root.querySelector('#catSections');
  const brandsMsg = root.querySelector('#catBrandsMsg');
  const sectionsMsg = root.querySelector('#catSectionsMsg');
  const columns = root.querySelector('.cat-columns');
  const companyForm = root.querySelector('#catCompany');
  const companyMsg = root.querySelector('#catCompanyMsg');
  const catLogo = root.querySelector('#catLogo');
  const catPublish = root.querySelector('#catPublish');
  if (readOnly) {
    companyForm.querySelectorAll('input, textarea').forEach((el) => { el.disabled = true; });
  }

  const drawItems = () => {
    const q = catQ.value.trim().toLowerCase();
    const f = catFilter.value;
    const rows = data.items.filter((it) => (!f || String(Number(it.published)) === f)
      && (!q || `${it.name} ${it.productId} ${it.code}`.toLowerCase().includes(q)));
    catItems.innerHTML = rows.length ? grid(
      [
        { label: 'صورة', width: '64px' },
        { label: 'الصنف', width: '2fr' },
        { label: 'رقم الصنف', width: '0.7fr' },
        { label: 'الحالة', width: '0.8fr' },
        { label: 'آخر تعديل', width: '1fr' }
      ],
      rows.map((it) => ({
        clickable: true,
        attrs: `data-id="${it.productId}"`,
        cells: [
          it.image ? `<img class="cat-mini" src="${catalogMedia(it.image)}" alt="">` : '',
          esc(it.name) + (it.exists ? '' : ' <small class="due">مش موجود في البرنامج</small>'),
          esc(it.productId),
          it.published ? 'منشور' : 'غير منشور',
          whenText(it.updatedAt)
        ],
        classes: ['', '', '', it.published ? 'ok' : 'due', '']
      }))
    ) : '<div class="empty">لا توجد أصناف في الكتالوج</div>';
    catItems.querySelectorAll('.data-row').forEach((row) => {
      row.onclick = () => openCatalogItem(Number(row.dataset.id));
    });
  };
  catQ.oninput = drawItems;
  catFilter.onchange = drawItems;
  drawItems();

  const listHost = (kind) => (kind === 'brands' ? catBrands : catSections);
  const drawList = (kind) => {
    const disabled = readOnly ? ' disabled' : '';
    listHost(kind).innerHTML = lists[kind].map((entry, index) =>
      `<div class="cat-row${readOnly ? ' cat-row-readonly' : ''}"><input data-kind="${kind}" data-index="${index}" data-key="nameAr" value="${esc(entry.nameAr)}" placeholder="الاسم بالعربي"${disabled}><input data-kind="${kind}" data-index="${index}" data-key="nameEn" dir="ltr" value="${esc(entry.nameEn || '')}" placeholder="English"${disabled}>${readOnly ? '' : `<button type="button" class="ghost" data-drop="${kind}" data-index="${index}">حذف</button>`}</div>`
    ).join('') || '<p class="note">لا يوجد</p>';
  };
  drawList('brands');
  drawList('sections');
  if (!readOnly) {
    columns.oninput = (event) => {
      const input = event.target.closest('[data-kind]');
      if (input) lists[input.dataset.kind][Number(input.dataset.index)][input.dataset.key] = input.value;
    };
    columns.onclick = async (event) => {
      const add = event.target.closest('[data-add-row]');
      const drop = event.target.closest('[data-drop]');
      const saveBtn = event.target.closest('[data-save-list]');
      if (add) {
        lists[add.dataset.addRow].push({ id: '', nameAr: '', nameEn: '' });
        drawList(add.dataset.addRow);
      } else if (drop) {
        lists[drop.dataset.drop].splice(Number(drop.dataset.index), 1);
        drawList(drop.dataset.drop);
      } else if (saveBtn) {
        const kind = saveBtn.dataset.saveList;
        const out = kind === 'brands' ? brandsMsg : sectionsMsg;
        try {
          const result = await api(`/api/catalog/taxonomy/${kind}`, { method: 'PUT', body: JSON.stringify({ list: lists[kind] }) });
          if (!root.isConnected) return;
          lists[kind] = result.list;
          data[kind] = result.list;
          drawList(kind);
          catalogSay(out, 'اتحفظ', true);
        } catch (error) {
          if (!root.isConnected) return;
          catalogSay(out, error.message, false);
        }
      }
    };

    if (catLogo) catLogo.onchange = async (event) => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      try {
        await catalogUploadImage('/api/catalog/company/logo', file);
        if (!root.isConnected) return;
        await openSection('catalog', { force: true });
      } catch (error) {
        if (!root.isConnected) return;
        catalogSay(companyMsg, error.message, false);
      }
    };
    companyForm.onsubmit = async (event) => {
      event.preventDefault();
      const value = (id) => companyForm.querySelector(`#${id}`).value;
      try {
        await api('/api/catalog/company', {
          method: 'PUT',
          body: JSON.stringify({
            aboutAr: value('coAboutAr'), aboutEn: value('coAboutEn'), whatsapp: value('coWhatsapp'),
            phone: value('coPhone'), addressAr: value('coAddressAr'), addressEn: value('coAddressEn')
          })
        });
        if (!root.isConnected) return;
        catalogSay(companyMsg, 'اتحفظ', true);
      } catch (error) {
        if (!root.isConnected) return;
        catalogSay(companyMsg, error.message, false);
      }
    };

    if (catPublish) catPublish.onclick = async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'جاري النشر...';
      try {
        await api('/api/catalog/publish', { method: 'POST' });
        if (!root.isConnected) return;
        await openSection('catalog', { force: true });
      } catch (error) {
        if (!root.isConnected) return;
        window.alert(error.message);
        button.disabled = false;
        button.textContent = 'نشر الكتالوج';
      }
    };
  }

  setPageActions({
    add: !readOnly,
    edit: false,
    delete: false,
    query: true,
    exit: true,
    onAdd: () => {
      const id = Number(window.prompt('رقم الصنف'));
      if (Number.isInteger(id) && id > 0) openCatalogItem(id);
    },
    onQuery: () => catQ.focus()
  });
}
