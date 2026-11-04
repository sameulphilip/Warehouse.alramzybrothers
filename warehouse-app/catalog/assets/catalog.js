(function (root) {
  'use strict';

  const STORAGE_KEY = 'ramzy-request-v1';
  const WORDS = {
    ar: { hello: 'السلام عليكم، عايز أسأل عن', list: 'السلام عليكم، عايز أسأل عن الأصناف دي:', part: 'رقم القطعة', qty: 'الكمية' },
    en: { hello: 'Hello, I would like to ask about', list: 'Hello, I would like to ask about these items:', part: 'Part no', qty: 'Qty' }
  };

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compact(value) {
    return normalize(value).replace(/[\s.\-_/]/g, '');
  }

  function matches(entry, filter) {
    if (filter.brand && entry.brand !== filter.brand) return false;
    if (filter.section && entry.section !== filter.section) return false;
    const q = normalize(filter.q);
    if (!q) return true;
    return normalize(entry.name).includes(q) || (Boolean(entry.part) && compact(entry.part).includes(compact(q)));
  }

  function productMessage(product, lang, url) {
    const w = WORDS[lang] || WORDS.ar;
    const part = product.part ? ` (${w.part}: ${product.part})` : '';
    return `${w.hello}: ${product.name}${part}\n${url}`;
  }

  function requestMessage(items, lang) {
    const w = WORDS[lang] || WORDS.ar;
    const lines = items.map((item, index) =>
      `${index + 1}) ${item.name}${item.part ? ` — ${w.part}: ${item.part}` : ''} — ${w.qty}: ${item.qty}`);
    return [w.list].concat(lines).join('\n');
  }

  function waLink(number, message) {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function addItem(list, item) {
    if (list.some((entry) => entry.id === item.id)) {
      return list.map((entry) => (entry.id === item.id ? { ...entry, qty: Math.min(999, entry.qty + 1) } : entry));
    }
    return list.concat([{ id: item.id, name: item.name, part: item.part || '', qty: 1 }]);
  }

  function setQty(list, id, qty) {
    const value = Math.max(1, Math.min(999, Math.floor(Number(qty) || 1)));
    return list.map((entry) => (entry.id === id ? { ...entry, qty: value } : entry));
  }

  function removeItem(list, id) {
    return list.filter((entry) => entry.id !== id);
  }

  function capString(value, maxLen) {
    return String(value || '').trim().slice(0, maxLen);
  }

  function sanitizeQty(qty) {
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(999, n));
  }

  function validId(id) {
    if (typeof id === 'string' && id.length > 0) return true;
    if (typeof id === 'number' && Number.isFinite(id)) return true;
    return false;
  }

  function sanitizeList(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const out = [];
    for (const raw of value) {
      if (out.length >= 100) break;
      if (raw === null || typeof raw !== 'object') continue;
      if (!validId(raw.id)) continue;
      const id = String(raw.id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        name: capString(raw.name, 200),
        part: capString(raw.part, 80),
        qty: sanitizeQty(raw.qty),
      });
    }
    return out;
  }

  const api = { normalize, matches, productMessage, requestMessage, waLink, addItem, setQty, removeItem, sanitizeList };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }

  const doc = root.document;
  const lang = doc.body.dataset.lang === 'en' ? 'en' : 'ar';
  const wa = doc.body.dataset.wa || '';
  const labels = JSON.parse(doc.getElementById('labels').textContent);
  const panel = doc.getElementById('request');
  const zoom = doc.getElementById('zoom');

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function load() {
    try {
      return sanitizeList(JSON.parse(root.localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch (error) {
      return [];
    }
  }

  function save() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      // Private browsing can block storage; the list still works for this page.
    }
  }

  let list = load();
  let focusBeforeRequest = null;

  function draw() {
    const total = list.reduce((sum, entry) => sum + entry.qty, 0);
    doc.querySelectorAll('[data-request-count]').forEach((el) => {
      el.textContent = String(total);
      el.hidden = total === 0;
    });
    panel.querySelector('[data-request-rows]').innerHTML = list.length
      ? list.map((entry) => `<li><span><strong>${esc(entry.name)}</strong>${entry.part ? `<small>${esc(labels.partNumber)}: ${esc(entry.part)}</small>` : ''}</span><input type="number" min="1" max="999" value="${esc(String(entry.qty))}" data-qty="${esc(entry.id)}" aria-label="${esc(labels.qty)}"><button type="button" data-remove="${esc(entry.id)}" aria-label="${esc(labels.remove)}">×</button></li>`).join('')
      : `<li class="empty">${esc(labels.empty)}</li>`;
    const send = panel.querySelector('[data-request-send]');
    send.hidden = !list.length || !wa;
    send.href = list.length && wa ? waLink(wa, requestMessage(list, lang)) : '#';
  }

  function open() {
    focusBeforeRequest = doc.activeElement;
    panel.hidden = false;
    doc.documentElement.classList.add('locked');
    const closeBtn = panel.querySelector('[data-close-request]');
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    panel.hidden = true;
    doc.documentElement.classList.remove('locked');
    if (focusBeforeRequest && typeof focusBeforeRequest.focus === 'function' && doc.contains(focusBeforeRequest)) {
      focusBeforeRequest.focus();
    }
    focusBeforeRequest = null;
  }

  doc.querySelectorAll('[data-ask]').forEach((link) => {
    if (!wa) return;
    link.href = waLink(wa, productMessage({ name: link.dataset.name, part: link.dataset.part }, lang, link.dataset.url));
  });

  doc.addEventListener('click', (event) => {
    if (event.target === panel) return close();
    if (event.target === zoom) return zoom.close();
    const target = event.target.closest('[data-add],[data-open-request],[data-close-request],[data-remove],[data-thumb],[data-zoom]');
    if (!target) return;
    if (target.matches('[data-add]')) {
      list = addItem(list, { id: target.dataset.id, name: target.dataset.name, part: target.dataset.part });
      save();
      draw();
      target.textContent = labels.added;
      open();
    } else if (target.matches('[data-open-request]')) {
      open();
    } else if (target.matches('[data-close-request]')) {
      close();
    } else if (target.matches('[data-remove]')) {
      list = removeItem(list, target.dataset.remove);
      save();
      draw();
    } else if (target.matches('[data-thumb]')) {
      const track = doc.querySelector('[data-track]');
      const slide = track.children[Number(target.dataset.thumb)];
      if (slide) slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else if (target.matches('[data-zoom]') && zoom && zoom.showModal) {
      zoom.querySelector('img').src = target.dataset.zoom;
      zoom.showModal();
    }
  });

  doc.addEventListener('change', (event) => {
    const input = event.target.closest('[data-qty]');
    if (!input) return;
    list = setQty(list, input.dataset.qty, input.value);
    save();
    draw();
  });

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close();
  });

  const track = doc.querySelector('[data-track]');
  if (track) {
    const thumbs = doc.querySelectorAll('[data-thumb]');
    track.addEventListener('scroll', () => {
      const index = Math.round(Math.abs(track.scrollLeft) / Math.max(track.clientWidth, 1));
      thumbs.forEach((thumb) => thumb.classList.toggle('on', Number(thumb.dataset.thumb) === index));
    }, { passive: true });
  }

  const filters = doc.querySelector('[data-filters]');
  if (filters) {
    const cards = Array.from(doc.querySelectorAll('[data-results] [data-card]'));
    const none = doc.querySelector('[data-no-results]');
    const params = new URLSearchParams(root.location.search);
    ['q', 'brand', 'section'].forEach((name) => {
      const field = filters.elements[name];
      if (field && params.get(name)) field.value = params.get(name);
    });
    const value = (name) => (filters.elements[name] ? filters.elements[name].value : '');
    const apply = () => {
      const filter = { q: value('q'), brand: value('brand'), section: value('section') };
      let shown = 0;
      cards.forEach((card) => {
        const ok = matches({ name: card.dataset.name, part: card.dataset.part, brand: card.dataset.brand, section: card.dataset.section }, filter);
        card.hidden = !ok;
        if (ok) shown += 1;
      });
      none.hidden = shown > 0;
    };
    filters.addEventListener('input', apply);
    filters.addEventListener('change', apply);
    filters.addEventListener('submit', (event) => event.preventDefault());
    apply();
  }

  draw();
})(this);
