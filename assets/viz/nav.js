/* ═══════════════════════════════════════════════════════════
   Навигация «‹ пред. · след. ›» в шапке визуализации.
   Страница лежит в <section>/<topic>/<slug>/ — ищем её в
   window.NOTES и подставляем соседей по разделу.
   ═══════════════════════════════════════════════════════════ */
(() => {
  const header = document.querySelector('header');
  if (!header || !window.NOTES) return;

  const parts = location.pathname.replace(/index\.html$/, '').split('/').filter(Boolean);
  const [sectionId, topicId, slug] = parts.slice(-3).map(decodeURIComponent);
  const section = window.NOTES.sections.find(s => s.id === sectionId);
  if (!section) return;

  const flat = section.topics.flatMap(t => t.items.map(it => ({ ...it, topic: t })));
  const i = flat.findIndex(it => it.topic.id === topicId && it.slug === slug);
  if (i < 0) return;

  const link = (it, dir) => {
    const a = document.createElement('a');
    a.className = 'page-nav-link';
    a.href = `../../${it.topic.id}/${it.slug}/index.html`;
    a.title = `${it.topic.title}: ${it.title}`;
    a.textContent = dir < 0 ? `‹ ${it.title}` : `${it.title} ›`;
    return a;
  };

  const nav = document.createElement('nav');
  nav.className = 'page-nav';
  if (i > 0) nav.appendChild(link(flat[i - 1], -1));
  if (i < flat.length - 1) nav.appendChild(link(flat[i + 1], 1));
  header.appendChild(nav);
})();
