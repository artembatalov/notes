document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, cell, frame, label, arrow } = CppViz;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 440');
  CppViz.defs(svg);
  const root = svg.append('g');

  /* ── Mode + parameter toggles ─────────────────────────── */
  let mode = 'stack', cont = 'deque', cmp = 'less';
  const ctl = document.getElementById('controls');
  const tg = document.createElement('div');
  tg.className = 'toggle-group';
  tg.innerHTML = ['stack', 'queue', 'priority_queue'].map(m => `<button class="toggle-btn${m === mode ? ' active' : ''}" data-mode="${m}">${m}</button>`).join('');
  ctl.appendChild(tg);
  const pg = document.createElement('div');
  pg.className = 'toggle-group';
  pg.style.marginLeft = '6px';
  ctl.appendChild(pg);

  function renderParams() {
    const opts = mode === 'priority_queue'
      ? [['less', 'less (max-heap)'], ['greater', 'greater (min-heap)']]
      : [['deque', 'C = deque'], ['vector', 'C = vector'], ['list', 'C = list']];
    const cur = mode === 'priority_queue' ? cmp : cont;
    pg.innerHTML = opts.map(([v, t]) => `<button class="toggle-btn${v === cur ? ' active' : ''}" data-v="${v}">${t}</button>`).join('');
    pg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      if (mode === 'priority_queue') cmp = b.dataset.v; else cont = b.dataset.v;
      renderParams(); run();
    }));
  }

  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`, nm = s => `<span class="num">${s}</span>`;
  const LISTINGS = {
    stack: [
      `${kw('template')}&lt;${kw('class')} T, ${kw('class')} C = deque&lt;T&gt;&gt;`,
      `${kw('class')} stack {`,
      `${kw('protected')}:`,
      `  C c;               ${cm('// всё хранит контейнер')}`,
      `${kw('public')}:`,
      `  ${kw('void')} ${fn('push')}(${kw('const')} T&amp; x) { c.${fn('push_back')}(x); }`,
      `  ${kw('void')} ${fn('pop')}()   { c.${fn('pop_back')}(); }`,
      `  T&amp;   ${fn('top')}()   { ${kw('return')} c.${fn('back')}(); }`,
      `  ${kw('bool')} ${fn('empty')}() { ${kw('return')} c.${fn('empty')}(); }`,
      `};`,
      `${cm('// pop() ничего не возвращает: сначала')}`,
      `${cm('// top(), потом pop() — ради exception safety')}`,
    ],
    queue: [
      `${kw('template')}&lt;${kw('class')} T, ${kw('class')} C = deque&lt;T&gt;&gt;`,
      `${kw('class')} queue {`,
      `  C c;`,
      `${kw('public')}:`,
      `  ${kw('void')} ${fn('push')}(${kw('const')} T&amp; x) { c.${fn('push_back')}(x); }`,
      `  ${kw('void')} ${fn('pop')}()   { c.${fn('pop_front')}(); }`,
      `  T&amp;   ${fn('front')}() { ${kw('return')} c.${fn('front')}(); }`,
      `  T&amp;   ${fn('back')}()  { ${kw('return')} c.${fn('back')}(); }`,
      `};`,
      `${cm('// C = vector: нет pop_front → pop() не')}`,
      `${cm('// скомпилируется (но только если вызван!)')}`,
    ],
    pq: [
      `${kw('template')}&lt;${kw('class')} T, ${kw('class')} C = vector&lt;T&gt;,`,
      `         ${kw('class')} Cmp = less&lt;T&gt;&gt;`,
      `${kw('class')} priority_queue {`,
      `  C c; Cmp comp;`,
      `  ${kw('void')} ${fn('push')}(${kw('const')} T&amp; x) {`,
      `    c.${fn('push_back')}(x);`,
      `    ${fn('push_heap')}(c.${fn('begin')}(), c.${fn('end')}(), comp);`,
      `  }`,
      `  ${kw('void')} ${fn('pop')}() {`,
      `    ${fn('pop_heap')}(c.${fn('begin')}(), c.${fn('end')}(), comp);`,
      `    c.${fn('pop_back')}();`,
      `  }`,
      `  ${kw('const')} T&amp; ${fn('top')}() { ${kw('return')} c.${fn('front')}(); }`,
      `};`,
      `${cm('// less → сверху НАИБОЛЬШИЙ (max-heap)')}`,
    ],
    heap: [
      `${cm('// __push_heap: «дырка» всплывает')}`,
      `value = c[hole];`,
      `${kw('while')} (hole &gt; top &amp;&amp;`,
      `       ${fn('comp')}(c[${fn('parent')}(hole)], value)) {`,
      `  c[hole] = ${fn('move')}(c[${fn('parent')}(hole)]);`,
      `  hole = ${fn('parent')}(hole);`,
      `}`,
      `c[hole] = ${fn('move')}(value);`,
      `${cm('// __pop_heap:')}`,
      `value = ${fn('move')}(c[n-${nm(1)}]); c[n-${nm(1)}] = ${fn('move')}(c[${nm(0)}]);`,
      `${cm('// __adjust_heap: дырку от корня — до')}`,
      `${cm('// листа, всегда к «большему» сыну…')}`,
      `${kw('while')} (у hole два сына) {`,
      `  child = ${fn('comp')}(c[r], c[l]) ? l : r;`,
      `  c[hole] = ${fn('move')}(c[child]); hole = child;`,
      `}`,
      `${cm('// …и уже оттуда __push_heap(hole, value)')}`,
    ],
  };

  /* ── Simulation ───────────────────────────────────────── */
  function simulate(ops) {
    const steps = [];
    let c = [], opIdx = -1;
    const S = (o = {}) => steps.push({
      op: opIdx, mode, code: o.code, line: o.line || [], desc: o.desc || '',
      c: (o.c || c).map(v => v), tones: o.tones || {}, hole: o.hole ?? null, value: o.value ?? null,
      moves: o.moves || [], out: o.out ?? null, err: o.err || null,
    });
    const less = cmp === 'less';
    const comp = (a, b) => (less ? a < b : a > b);
    const cs = `std::${mode}&lt;int${mode === 'priority_queue' ? (less ? '' : ', vector&lt;int&gt;, greater&lt;int&gt;') : cont === 'deque' ? '' : `, ${cont}&lt;int&gt;`}&gt;`;

    S({ code: mode === 'priority_queue' ? 'pq' : mode, desc: `<code>${cs} q;</code> — адаптер: сам ничего не хранит, только ограничивает интерфейс контейнера <code>c</code>.` });

    function pushHeap(hole) {
      const value = c[hole];
      c[hole] = null;
      S({ code: 'heap', line: [0, 1], hole, value, desc: `<code>push_heap</code>: вынимаем ${value} — на его месте «дырка» [${hole}].` });
      while (hole > 0) {
        const p = Math.floor((hole - 1) / 2);
        if (!comp(c[p], value)) {
          S({ code: 'heap', line: [2, 3], hole, value, tones: { [p]: 'read' }, desc: `comp(${c[p]}, ${value}) = false → ${less ? `${c[p]} ≥ ${value}` : `${c[p]} ≤ ${value}`}, дырка остаётся на [${hole}].` });
          break;
        }
        S({ code: 'heap', line: [2, 3, 4], hole, value, tones: { [p]: 'read' }, moves: [[p, hole]], desc: `comp(${c[p]}, ${value}) = true → опускаем родителя ${c[p]} в дырку.` });
        c[hole] = c[p]; c[p] = null; hole = p;
        S({ code: 'heap', line: [5], hole, value, desc: `Дырка поднялась на [${hole}].` });
      }
      c[hole] = value;
      S({ code: 'heap', line: [7], tones: { [hole]: 'new' }, desc: `Кладём ${value} в дырку [${hole}]. Куча восстановлена: O(log n) перемещений, а не обменов.` });
    }

    ops.forEach((o, i) => {
      opIdx = i;
      const x = o.args[0];
      if (mode === 'stack') {
        if (o.name === 'push') { c.push(x); S({ code: 'stack', line: [5], tones: { [c.length - 1]: 'new' }, desc: `<code>push(${x})</code> → <code>c.push_back(${x})</code>.` }); }
        else if (o.name === 'pop') {
          if (!c.length) { S({ code: 'stack', line: [6], desc: 'Пустой стек — <span class="warn">UB</span>.' }); return; }
          S({ code: 'stack', line: [6], tones: { [c.length - 1]: 'dead' }, desc: '<code>pop()</code> → <code>c.pop_back()</code>.' });
          c.pop();
          S({ code: 'stack', line: [6, 10, 11], desc: `Удалено. Заметьте: <code>pop()</code> возвращает <code>void</code>.` });
        } else if (o.name === 'top') {
          if (!c.length) { S({ code: 'stack', line: [7], desc: 'Пустой стек — <span class="warn">UB</span>.' }); return; }
          S({ code: 'stack', line: [7], tones: { [c.length - 1]: 'read' }, out: c[c.length - 1], desc: `<code>top()</code> → <code>c.back()</code> = <b>${c[c.length - 1]}</b>.` });
        }
      } else if (mode === 'queue') {
        if (o.name === 'push') { c.push(x); S({ code: 'queue', line: [4], tones: { [c.length - 1]: 'new' }, desc: `<code>push(${x})</code> → <code>c.push_back(${x})</code>.` }); }
        else if (o.name === 'pop') {
          if (cont === 'vector') {
            S({ code: 'queue', line: [5, 9, 10], err: "error: 'class std::vector<int>' has no member named 'pop_front'",
                desc: '<span class="warn">Ошибка компиляции.</span> Шаблонные методы инстанцируются только при вызове: пока <code>pop()</code> не вызван, <code>queue&lt;int, vector&lt;int&gt;&gt;</code> компилируется. А <code>vector::pop_front</code> не существует, потому что он был бы O(n).' });
            return;
          }
          if (!c.length) { S({ code: 'queue', line: [5], desc: 'Пустая очередь — <span class="warn">UB</span>.' }); return; }
          S({ code: 'queue', line: [5], tones: { 0: 'dead' }, desc: '<code>pop()</code> → <code>c.pop_front()</code>.' });
          c.shift();
          S({ code: 'queue', line: [5], desc: `Удалено из начала. Для deque и list это O(1).` });
        } else if (o.name === 'front' || o.name === 'top') {
          if (!c.length) { S({ code: 'queue', line: [6], desc: 'Пустая очередь — <span class="warn">UB</span>.' }); return; }
          S({ code: 'queue', line: [6], tones: { 0: 'read' }, out: c[0], desc: `<code>front()</code> → <code>c.front()</code> = <b>${c[0]}</b>.` });
        } else if (o.name === 'back') {
          if (!c.length) { S({ code: 'queue', line: [7], desc: 'Пустая очередь — <span class="warn">UB</span>.' }); return; }
          S({ code: 'queue', line: [7], tones: { [c.length - 1]: 'read' }, out: c[c.length - 1], desc: `<code>back()</code> → <code>c.back()</code> = <b>${c[c.length - 1]}</b>.` });
        }
      } else {
        if (o.name === 'push') {
          c.push(x);
          S({ code: 'pq', line: [4, 5], tones: { [c.length - 1]: 'new' }, desc: `<code>push(${x})</code>: сначала <code>c.push_back(${x})</code> — в конец массива.` });
          S({ code: 'pq', line: [6], tones: { [c.length - 1]: 'active' }, desc: '<code>push_heap</code> восстанавливает свойство кучи для нового последнего элемента.' });
          pushHeap(c.length - 1);
        } else if (o.name === 'pop') {
          if (!c.length) { S({ code: 'pq', line: [8], desc: 'Пустая очередь — <span class="warn">UB</span>.' }); return; }
          const n = c.length;
          S({ code: 'pq', line: [8, 9], tones: { 0: 'read' }, desc: `<code>pop()</code>: корень <b>${c[0]}</b> — ${less ? 'максимум' : 'минимум'}. <code>pop_heap</code> переставит его в конец.` });
          if (n > 1) {
            let value = c[n - 1];
            c[n - 1] = c[0]; c[0] = null;
            S({ code: 'heap', line: [8, 9], hole: 0, value, tones: { [n - 1]: 'dead' }, moves: [[0, n - 1]],
                desc: `value = c[${n - 1}] = ${value}; c[${n - 1}] = ${c[n - 1]} (бывший корень). Дырка — в корне [0].` });
            const len = n - 1;
            let hole = 0, second = 0;
            const dead = { [n - 1]: 'dead' };
            while (second < Math.trunc((len - 1) / 2)) {
              second = 2 * (second + 1);
              if (comp(c[second], c[second - 1])) second--;
              S({ code: 'heap', line: [10, 11, 12, 13], hole, value, tones: { ...dead, [2 * hole + 1]: 'read', [2 * hole + 2]: 'read' },
                  desc: `Сыновья дырки: ${c[2 * hole + 1]} и ${c[2 * hole + 2]} — берём ${less ? 'больший' : 'меньший'} <b>${c[second]}</b>. С value пока <b>не сравниваем</b>.` });
              c[hole] = c[second]; c[second] = null;
              S({ code: 'heap', line: [14], hole: second, value, tones: dead, moves: [[second, hole]], desc: `${c[hole]} поднимается, дырка спускается на [${second}].` });
              hole = second;
            }
            if ((len & 1) === 0 && second === Math.trunc((len - 2) / 2)) {
              second = 2 * (second + 1);
              c[hole] = c[second - 1]; c[second - 1] = null;
              S({ code: 'heap', line: [12, 14], hole: second - 1, value, tones: dead, moves: [[second - 1, hole]], desc: `Единственный (левый) сын ${c[hole]} поднимается.` });
              hole = second - 1;
            }
            S({ code: 'heap', line: [16], hole, value, tones: dead, desc: `Дырка дошла до листа [${hole}]. Теперь <code>__push_heap</code> поднимает value = ${value} оттуда — обычно почти сразу останавливается. Так сравнений меньше, чем при классическом просеивании вниз.` });
            while (hole > 0) {
              const p = Math.floor((hole - 1) / 2);
              if (!comp(c[p], value)) { S({ code: 'heap', line: [2, 3], hole, value, tones: { ...dead, [p]: 'read' }, desc: `comp(${c[p]}, ${value}) = false → стоп.` }); break; }
              S({ code: 'heap', line: [2, 3, 4], hole, value, tones: { ...dead, [p]: 'read' }, moves: [[p, hole]], desc: `comp(${c[p]}, ${value}) = true → ${c[p]} вниз.` });
              c[hole] = c[p]; c[p] = null; hole = p;
            }
            c[hole] = value;
            S({ code: 'heap', line: [7], tones: { ...dead, [hole]: 'new' }, desc: `value = ${value} встаёт на [${hole}].` });
          }
          const top = c.pop();
          S({ code: 'pq', line: [10], desc: `<code>c.pop_back()</code> удаляет бывший корень ${top}. Новый top = ${c.length ? c[0] : '—'}.` });
        } else if (o.name === 'top') {
          if (!c.length) { S({ code: 'pq', line: [12], desc: 'Пустая очередь — <span class="warn">UB</span>.' }); return; }
          S({ code: 'pq', line: [12], tones: { 0: 'read' }, out: c[0], desc: `<code>top()</code> → <code>c.front()</code> = <b>${c[0]}</b>, O(1).` });
        }
      }
    });
    opIdx = -1;
    S({ code: mode === 'priority_queue' ? 'pq' : mode, desc: `<span class="ok">Готово.</span> Элементов: ${c.length}.` });
    return steps;
  }

  /* ── Rendering ────────────────────────────────────────── */
  function applyStep(s) {
    root.selectAll('*').remove();
    const g = root;
    const n = s.c.length;
    const title = s.mode === 'priority_queue'
      ? `std::priority_queue<int${cmp === 'less' ? '' : ', vector<int>, greater<int>'}>`
      : `std::${s.mode}<int${cont === 'deque' ? '' : `, ${cont}<int>`}>`;

    if (s.mode !== 'priority_queue') {
      const cw = Math.max(30, Math.min(56, Math.floor(560 / Math.max(1, n + 1))));
      const X0 = 70, Y = 190;
      frame(g, 24, 120, 672, 150, `${title} q  —  внутри только std::${cont}<int> c`);
      label(g, 40, 148, 'c:', { color: COL.muted2, size: 12, mono: true });
      for (let i = 0; i < n; i++) cell(g, X0 + i * (cw + 6), Y, cw, 44, s.c[i], s.tones[i] || 'none', { size: 15 });
      if (!n) label(g, X0, Y + 27, '(пусто)', { color: COL.muted, size: 12, mono: true });
      const endX = X0 + n * (cw + 6);
      if (s.mode === 'stack') {
        arrow(g, endX + 50, Y + 22, endX + 6, Y + 22, { color: 'amber', both: true });
        label(g, endX + 56, Y + 26, 'push / pop / top — только с конца', { color: COL.amber, size: 10.5 });
      } else {
        arrow(g, endX + 50, Y + 22, endX + 6, Y + 22, { color: 'amber' });
        label(g, endX + 56, Y + 26, 'push → в конец', { color: COL.amber, size: 10.5 });
        if (n) {
          arrow(g, X0 - 4, Y + 22, X0 - 44, Y + 22, { color: 'blue' });
          label(g, X0 - 24, Y + 64, 'pop / front', { color: COL.blue, size: 10.5, anchor: 'middle' });
        }
      }
      if (s.out !== null) label(g, 40, 320, `→ ${s.out}`, { color: COL.greenHi, size: 16, mono: true, weight: 700 });
      if (s.err) {
        g.append('rect').attr('x', 24).attr('y', 300).attr('width', 672).attr('height', 40).attr('rx', 6)
          .attr('fill', 'rgba(212,106,106,.1)').attr('stroke', COL.red);
        label(g, 40, 325, s.err, { color: COL.red, size: 11, mono: true });
      }
      const ops = s.mode === 'stack'
        ? [['push(x)', 'c.push_back(x)'], ['pop()', 'c.pop_back()'], ['top()', 'c.back()']]
        : [['push(x)', 'c.push_back(x)'], ['pop()', 'c.pop_front()'], ['front()', 'c.front()'], ['back()', 'c.back()']];
      ops.forEach(([a, b], i) => {
        label(g, 40, 372 + i * 17, a, { color: COL.text, size: 11, mono: true });
        label(g, 120, 372 + i * 17, `→ ${b}`, { color: COL.muted2, size: 11, mono: true });
      });
      label(g, 24, 40, s.mode === 'stack' ? 'Подходит любой C с back, push_back, pop_back: deque, vector, list.' : 'Нужен C с front, back, push_back, pop_front: deque или list.',
        { color: COL.muted2, size: 11 });
    } else {
      /* tree */
      const levels = Math.max(1, Math.ceil(Math.log2(n + 2)));
      const tpos = i => {
        const d = Math.floor(Math.log2(i + 1)), k = i - (2 ** d - 1), cnt = 2 ** d;
        return { x: 24 + (k + 0.5) * (672 / cnt), y: 52 + d * Math.min(62, 230 / levels) };
      };
      for (let i = 1; i < n; i++) {
        const a = tpos(i), b = tpos(Math.floor((i - 1) / 2));
        g.append('line').attr('x1', a.x).attr('y1', a.y).attr('x2', b.x).attr('y2', b.y).attr('stroke', '#333').attr('stroke-width', 1.5);
      }
      for (let i = 0; i < n; i++) {
        const p = tpos(i);
        const isHole = s.hole === i;
        const tone = isHole ? 'raw' : s.tones[i] || 'none';
        const t = CppViz.TONE[tone];
        g.append('circle').attr('cx', p.x).attr('cy', p.y).attr('r', 17).attr('fill', isHole ? '#0c0c0c' : t.f)
          .attr('stroke', isHole ? COL.amber : t.s).attr('stroke-width', isHole ? 1.8 : 1.4).attr('stroke-dasharray', isHole ? '4 3' : null);
        if (!isHole && s.c[i] !== null) label(g, p.x, p.y + 5, s.c[i], { color: tone === 'new' ? '#111' : t.t === '#9a9a9a' ? COL.text : t.t, size: 13, anchor: 'middle', mono: true, weight: 700 });
        label(g, p.x + 21, p.y - 12, i, { color: '#444', size: 8.5, mono: true });
      }
      s.moves.forEach(([from, to]) => {
        const a = tpos(from), b = tpos(to);
        if (from !== to) arrow(g, a.x, a.y + (a.y < b.y ? 19 : -19), b.x, b.y + (a.y < b.y ? -19 : 19), { color: 'purple', bend: 18, width: 1.6 });
      });
      if (s.value !== null && s.value !== undefined) {
        g.append('rect').attr('x', 600).attr('y', 12).attr('width', 96).attr('height', 26).attr('rx', 13)
          .attr('fill', 'rgba(200,151,62,.16)').attr('stroke', COL.amber);
        label(g, 648, 30, `value = ${s.value}`, { color: COL.amberHi, size: 11.5, anchor: 'middle', mono: true, weight: 700 });
      }
      /* array view */
      const AY = 352;
      label(g, 24, AY - 14, `c — std::vector<int> (куча лежит в массиве: сыновья i — это 2i+1 и 2i+2)`, { color: COL.muted2, size: 10.5 });
      const cw = Math.max(26, Math.min(44, Math.floor(672 / Math.max(1, n)) - 4));
      for (let i = 0; i < n; i++) {
        const isHole = s.hole === i;
        cell(g, 24 + i * (cw + 4), AY, cw, 34, isHole ? '' : s.c[i], isHole ? 'raw' : s.tones[i] || 'none', { size: 13, dash: isHole ? '4 3' : null });
        label(g, 24 + i * (cw + 4) + cw / 2, AY + 48, i, { color: '#444', size: 9, anchor: 'middle', mono: true });
      }
      if (!n) label(g, 24, AY + 22, '(пусто)', { color: COL.muted, size: 12, mono: true });
      if (s.out !== null) label(g, 696, 330, `top() = ${s.out}`, { color: COL.greenHi, size: 13, anchor: 'end', mono: true, weight: 700 });
    }

    CppViz.code(LISTINGS, s.code, s.line);
    CppViz.opsStripSync(s.op);
    VizState.setDesc(s.desc);
    CppViz.state({
      's-type': title.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      's-size': n,
      's-c': n ? s.c.map(v => (v === null ? '□' : v)).join(', ') : '<span class="dim">пусто</span>',
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */
  const MODES = {
    stack: { spec: { push: 'n', pop: 0, top: 0 }, presets: [{ name: 'stack', script: 'push 1 2 3; top; pop; push 4; top; pop; pop' }],
             hint: 'Операции: <code>push x…</code> <code>pop</code> <code>top</code>' },
    queue: { spec: { push: 'n', pop: 0, front: 0, back: 0 }, presets: [{ name: 'queue', script: 'push 1 2 3; front; back; pop; push 4; front; pop' }],
             hint: 'Операции: <code>push x…</code> <code>pop</code> <code>front</code> <code>back</code>. Попробуйте C = vector.' },
    priority_queue: { spec: { push: 'n', pop: 0, top: 0 }, presets: [
      { name: 'push и pop', script: 'push 5 3 8 1 9 4 7; top; pop; pop; top' },
      { name: 'Возрастающие вставки', script: 'push 1..8; pop' },
    ], hint: 'Операции: <code>push x…</code> <code>pop</code> <code>top</code>. Переключите less/greater.' },
  };

  let bar;
  function mountBar() { bar = CppViz.scriptBar({ presets: MODES[mode].presets, onRun: () => run(), hint: MODES[mode].hint }); }
  tg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    tg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    mode = b.dataset.mode;
    renderParams(); mountBar(); run();
  }));

  function run() {
    CppViz.resetCode();
    let ops;
    try { ops = CppViz.parse(bar.text, MODES[mode].spec); bar.error(''); }
    catch (e) { bar.error(e.message); return; }
    if (mode === 'priority_queue' && ops.filter(o => o.name === 'push').length > 15) { bar.error('для наглядности не больше 15 элементов'); return; }
    const steps = simulate(ops);
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  renderParams();
  mountBar();
  VizAnim.bindUI(run);
  run();
});
