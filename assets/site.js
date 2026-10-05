/* ═══════════════════════════════════════════════════════════
   Рендер хаба и страниц разделов из window.NOTES — assets/site.js
   ═══════════════════════════════════════════════════════════ */
(() => {
  const PALETTE = ['#c8973e', '#6a9fd4', '#5a9a72', '#a06ad4', '#d46a6a', '#7abf9a',
                   '#c8a37a', '#7a9ec8', '#c87a9a', '#aa7ac8', '#9ab85a', '#5ab0b8', '#d48a5a'];
  const color = i => PALETTE[i % PALETTE.length];
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const count = s => s.topics.reduce((n, t) => n + t.items.length, 0);
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const $ = id => document.getElementById(id);

  /* ── Хаб: список разделов ─────────────────────────────── */
  function renderHub() {
    const { sections } = window.NOTES;
    const total = sections.reduce((n, s) => n + count(s), 0);
    $('stats').innerHTML =
      `<span><b>${sections.length}</b> ${plural(sections.length, 'раздел', 'раздела', 'разделов')}</span>` +
      `<span><b>${total}</b> ${plural(total, 'визуализация', 'визуализации', 'визуализаций')}</span>`;

    $('sections').innerHTML = sections.map(s => {
      const n = count(s);
      const chips = s.topics.map((t, i) =>
        `<a class="topic-chip" style="--c:${color(i)}" href="${s.id}/index.html#${t.id}">` +
        `<i></i>${esc(t.title)} <span>${t.items.length}</span></a>`).join('');
      return `
        <div class="section-card">
          <a href="${s.id}/index.html" style="text-decoration:none"><h2>${esc(s.title)}</h2></a>
          <a class="go" href="${s.id}/index.html">Открыть →</a>
          <p>${esc(s.desc)}</p>
          <div class="meta">${s.topics.length} ${plural(s.topics.length, 'тема', 'темы', 'тем')} · ${n} ${plural(n, 'визуализация', 'визуализации', 'визуализаций')}</div>
          <div class="topic-chips">${chips}</div>
        </div>`;
    }).join('');
  }

  /* ── Раздел: темы, поиск, оглавление ──────────────────── */
  function renderSection(sectionId) {
    const s = window.NOTES.sections.find(x => x.id === sectionId);
    document.title = `${s.short} · Заметки`;
    $('title').textContent = s.title;
    $('desc').textContent = s.desc;
    const n = count(s);
    $('stats').innerHTML =
      `<span><b>${s.topics.length}</b> ${plural(s.topics.length, 'тема', 'темы', 'тем')}</span>` +
      `<span><b>${n}</b> ${plural(n, 'визуализация', 'визуализации', 'визуализаций')}</span>`;

    $('toc').innerHTML = s.topics.map((t, i) =>
      `<a class="topic-chip" data-topic="${t.id}" style="--c:${color(i)}" href="#${t.id}">` +
      `<i></i>${esc(t.title)} <span>${t.items.length}</span></a>`).join('');

    $('topics').innerHTML = s.topics.map((t, i) => `
      <section class="topic" id="${t.id}" style="--c:${color(i)}">
        <div class="topic-head">
          <h2><i></i>${esc(t.title)}</h2>
          <span class="count">${t.items.length}</span>
        </div>
        ${t.desc ? `<p class="topic-desc">${esc(t.desc)}</p>` : ''}
        <div class="grid">${t.items.map(it => {
          const code = /^std::|^[a-z_]+(, [a-z_]+)+$/.test(it.title);
          const hay = `${it.title} ${it.slug.replace(/-/g, ' ')} ${t.title}`.toLowerCase();
          return `
          <a class="card" href="${t.id}/${it.slug}/index.html" data-hay="${esc(hay)}">
            <div class="card-title${code ? ' code' : ''}">${esc(it.title)}</div>
            <div class="card-foot"><span class="cplx">${esc(it.t ?? '')}</span><span class="arrow">→</span></div>
          </a>`;
        }).join('')}</div>
      </section>`).join('');

    const search = $('search');
    const apply = () => {
      const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      document.querySelectorAll('.topic').forEach(sec => {
        let vis = 0;
        sec.querySelectorAll('.card').forEach(c => {
          const ok = terms.every(w => c.dataset.hay.includes(w));
          c.hidden = !ok;
          if (ok) vis++;
        });
        sec.hidden = vis === 0;
        document.querySelector(`.toc [data-topic="${sec.id}"]`)?.classList.toggle('dim', vis === 0);
        shown += vis;
      });
      $('empty').hidden = shown > 0;
    };
    search.addEventListener('input', apply);
    window.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
      if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; apply(); search.blur(); }
    });
  }

  window.NotesSite = { renderHub, renderSection };
})();
