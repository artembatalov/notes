/* ═══════════════════════════════════════════════════════════
   Помощники для визуализаций контейнеров C++ — assets/viz/cpp.js
   Provides: CppViz.scriptBar, opsStrip, code, heap, defs, arrow,
             box, cell, label
   ═══════════════════════════════════════════════════════════ */
const CppViz = (() => {
  const COL = {
    text: '#efefef', muted: '#585858', muted2: '#888', border: '#333', border2: '#444',
    cell: '#1a1a1a', raw: '#0f0f0f', frame: '#141414',
    amber: '#c8973e', amberHi: '#e0aa52', blue: '#6a9fd4', green: '#5a9a72', greenHi: '#7abf8a',
    red: '#d46a6a', purple: '#a06ad4', redNode: '#9c3d3d',
  };
  /* fill / stroke / text for a highlighted cell */
  const TONE = {
    none:   { f: COL.cell,                  s: COL.border,                 t: '#9a9a9a' },
    raw:    { f: COL.raw,                   s: '#262626',                  t: '#3a3a3a' },
    new:    { f: 'rgba(200,151,62,.9)',     s: COL.amber,                  t: '#111' },
    active: { f: 'rgba(200,151,62,.16)',    s: COL.amber,                  t: COL.amberHi },
    read:   { f: 'rgba(106,159,212,.16)',   s: COL.blue,                   t: '#9cc3ea' },
    ok:     { f: 'rgba(90,154,114,.18)',    s: COL.green,                  t: COL.greenHi },
    moved:  { f: 'rgba(160,106,212,.18)',   s: COL.purple,                 t: '#c9a6ee' },
    dead:   { f: 'rgba(212,106,106,.12)',   s: COL.red,                    t: COL.red },
    ghost:  { f: '#121212',                 s: '#2a2a2a',                  t: '#444' },
  };

  /* ── Script bar: presets + editable command line ───────── */
  function scriptBar({ presets, onRun, hint = '' }) {
    const el = document.getElementById('script-bar');
    el.innerHTML = `
      <select id="preset" class="script-select" aria-label="Сценарий">
        ${presets.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}
      </select>
      <input id="script" class="script-input" spellcheck="false" autocomplete="off">
      <div class="script-err" id="script-err"></div>
      ${hint ? `<div class="script-hint">${hint}</div>` : ''}`;
    const sel = el.querySelector('#preset'), inp = el.querySelector('#script');
    inp.value = presets[0].script;
    sel.addEventListener('change', () => { inp.value = presets[+sel.value].script; onRun(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); onRun(); } });
    inp.addEventListener('keydown', e => e.stopPropagation()); // не отдавать стрелки/пробел плееру
    return {
      get text() { return inp.value; },
      error(msg) { el.querySelector('#script-err').textContent = msg || ''; inp.classList.toggle('bad', !!msg); },
    };
  }

  /* Split "a 1 2; b; c 3" into [{name, args, src}] with `x..y` ranges and `xN` repeats. */
  function parse(text, spec) {
    const ops = [];
    for (const raw of text.split(/[;\n]+/)) {
      const src = raw.trim();
      if (!src) continue;
      const m = src.match(/^([a-z_]+)\s*(.*)$/i);
      if (!m) throw new Error(`не понял «${src}»`);
      const name = m[1].toLowerCase();
      if (!(name in spec)) throw new Error(`неизвестная операция «${m[1]}». Доступны: ${Object.keys(spec).join(', ')}`);
      let rest = m[2].trim(), repeat = 1;
      const rep = rest.match(/(?:^|\s)[x×](\d+)$/i);
      if (rep) { repeat = +rep[1]; rest = rest.slice(0, rep.index).trim(); }
      let args = [];
      for (const tok of rest ? rest.split(/[\s,]+/) : []) {
        const r = tok.match(/^(-?\d+)\.\.(-?\d+)$/);
        if (r) {
          const a = +r[1], b = +r[2], st = a <= b ? 1 : -1;
          if (Math.abs(b - a) > 60) throw new Error(`слишком длинный диапазон ${tok}`);
          for (let v = a; v !== b + st; v += st) args.push(v);
        } else if (/^-?\d+(\.\d+)?$/.test(tok)) args.push(+tok);
        else args.push(tok);
      }
      const want = spec[name]; // number of args per call; 'n' = one call per arg
      const calls = want === 'n' ? args.map(a => [a]) : [args];
      if (want === 'n' && !args.length) throw new Error(`«${name}» ждёт хотя бы одно число`);
      if (typeof want === 'number' && args.length !== want)
        throw new Error(`«${name}» ждёт ${want} аргумент(а), получено ${args.length}`);
      for (let k = 0; k < repeat; k++)
        for (const a of calls) ops.push({ name, args: a, label: a.length ? `${name}(${a.join(', ')})` : `${name}()` });
    }
    if (ops.length > 120) throw new Error('слишком много операций (>120)');
    return ops;
  }

  /* ── Ops strip: chips, current op highlighted, click → jump ─ */
  let _stripOps = null, _firstStep = [];
  function opsStrip(ops, steps) {
    const el = document.getElementById('ops-strip');
    _stripOps = ops;
    _firstStep = ops.map((_, i) => steps.findIndex(s => s.op === i));
    el.innerHTML = ops.map((o, i) => `<button class="op-chip" data-i="${i}">${o.label}</button>`).join('');
    el.querySelectorAll('.op-chip').forEach(b => b.addEventListener('click', () => {
      const s = _firstStep[+b.dataset.i];
      if (s >= 0) VizAnim.goto(s);
    }));
  }
  function opsStripSync(cur) {
    document.querySelectorAll('#ops-strip .op-chip').forEach((b, i) => {
      b.classList.toggle('cur', i === cur);
      b.classList.toggle('done', cur !== undefined && cur !== null && cur >= 0 && i < cur);
    });
    const c = document.querySelector('#ops-strip .op-chip.cur');
    if (c) {
      const strip = c.parentElement;
      const l = c.offsetLeft - strip.offsetLeft, r = l + c.offsetWidth;
      if (l < strip.scrollLeft || r > strip.scrollLeft + strip.clientWidth)
        strip.scrollTo({ left: Math.max(0, l - 40), behavior: 'smooth' });
    }
  }

  /* ── Code panel with per-operation listings ─────────────── */
  let _codeKey = null;
  function code(listings, key, lines) {
    if (key !== _codeKey) {
      _codeKey = key;
      VizCode.init((listings[key] || []).map((html, id) => ({ id, html })));
    }
    VizCode.highlight(lines || []);
  }
  function resetCode() { _codeKey = null; }

  /* ── Fake heap: deterministic addresses ─────────────────── */
  function heap(seed = 7, base = 0x1c40) {
    let s = seed, top = base;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    return {
      alloc(bytes, scatter = false) {
        const gap = scatter ? 16 * (1 + Math.floor(rnd() * 9)) : 16;
        const a = top + gap;
        top = a + Math.ceil(bytes / 16) * 16;
        return a;
      },
    };
  }
  const hex = a => '0x' + a.toString(16);

  /* ── SVG helpers ─────────────────────────────────────────── */
  const MARK = { muted: '#5a5a5a', amber: COL.amber, blue: COL.blue, red: COL.red, green: COL.green, purple: COL.purple };
  function defs(svg) {
    const d = svg.append('defs');
    for (const [k, c] of Object.entries(MARK))
      d.append('marker').attr('id', 'cv-' + k).attr('viewBox', '0 -5 10 10')
        .attr('refX', 9).attr('refY', 0).attr('markerWidth', 6.5).attr('markerHeight', 6.5)
        .attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,-4.5L10,0L0,4.5Z').attr('fill', c);
  }
  /* Arrow from (x1,y1) to (x2,y2). bend: perpendicular offset of the control point. */
  function arrow(g, x1, y1, x2, y2, { color = 'muted', bend = 0, width = 1.5, dash = null, opacity = 1, both = false } = {}) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const cx = mx - dy / len * bend, cy = my + dx / len * bend;
    return g.append('path')
      .attr('d', bend ? `M${x1},${y1} Q${cx},${cy} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`)
      .attr('fill', 'none').attr('stroke', MARK[color] || color).attr('stroke-width', width)
      .attr('stroke-dasharray', dash).attr('opacity', opacity)
      .attr('marker-end', `url(#cv-${color})`).attr('marker-start', both ? `url(#cv-${color})` : null);
  }
  /* Elbow path through points; arrowhead at the end. */
  function path(g, pts, { color = 'muted', width = 1.5, dash = null, opacity = 1, r = 8 } = {}) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (i < pts.length - 1 && r) {
        const [px, py] = pts[i - 1], [nx, ny] = pts[i + 1];
        const a = Math.min(r, Math.hypot(x - px, y - py) / 2), b = Math.min(r, Math.hypot(nx - x, ny - y) / 2);
        const ux = Math.sign(x - px), uy = Math.sign(y - py), vx = Math.sign(nx - x), vy = Math.sign(ny - y);
        d += ` L${x - ux * a},${y - uy * a} Q${x},${y} ${x + vx * b},${y + vy * b}`;
      } else d += ` L${x},${y}`;
    }
    return g.append('path').attr('d', d).attr('fill', 'none').attr('stroke', MARK[color] || color)
      .attr('stroke-width', width).attr('stroke-dasharray', dash).attr('opacity', opacity)
      .attr('marker-end', `url(#cv-${color})`);
  }
  /* Memory cell with centered text and tone. */
  function cell(g, x, y, w, h, text, tone = 'none', { size = 14, rx = 4, dash = null, weight = 700, font = 'mono' } = {}) {
    const t = TONE[tone] || TONE.none;
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', rx)
      .attr('fill', t.f).attr('stroke', t.s).attr('stroke-width', tone === 'none' || tone === 'raw' ? 1 : 1.6)
      .attr('stroke-dasharray', dash ?? (tone === 'raw' ? '3 2' : null));
    if (text !== undefined && text !== null && text !== '')
      g.append('text').attr('x', x + w / 2).attr('y', y + h / 2).attr('dy', '.35em')
        .attr('text-anchor', 'middle').attr('font-size', size).attr('font-weight', weight)
        .attr('font-family', font === 'mono' ? "'JetBrains Mono', monospace" : "'Inter', sans-serif")
        .attr('fill', t.t).text(text);
  }
  /* Frame with a caption above (stack object / heap block). */
  function frame(g, x, y, w, h, caption, { color = '#2c2c2c', capColor = COL.muted2, dash = null, fill = COL.frame } = {}) {
    g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h).attr('rx', 6)
      .attr('fill', fill).attr('stroke', color).attr('stroke-dasharray', dash);
    if (caption) label(g, x + 2, y - 7, caption, { color: capColor, size: 10.5 });
  }
  function label(g, x, y, text, { color = COL.muted2, size = 11, anchor = 'start', weight = 500, mono = false, html = false } = {}) {
    const t = g.append('text').attr('x', x).attr('y', y).attr('font-size', size).attr('text-anchor', anchor)
      .attr('font-weight', weight).attr('fill', color)
      .attr('font-family', mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif");
    if (html) t.html(text); else t.text(text);
    return t;
  }

  /* State rows helper: {id: html} */
  function state(map) {
    for (const [id, v] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = v;
    }
  }

  return { COL, TONE, scriptBar, parse, opsStrip, opsStripSync, code, resetCode, heap, hex,
           defs, arrow, path, cell, frame, label, state };
})();
