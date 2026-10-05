document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, cell, frame, label, hex } = CppViz;
  const B = 4;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 460');
  CppViz.defs(svg);
  const root = svg.append('g');

  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`, nm = s => `<span class="num">${s}</span>`;
  const LISTINGS = {
    init: [
      `deque() { ${cm('// _M_initialize_map(0)')}`,
      `  num_nodes = ${nm(0)} / BLOCK + ${nm(1)};      ${cm('// 1')}`,
      `  map_size = ${fn('max')}(${nm(8)}, num_nodes + ${nm(2)}); ${cm('// 8')}`,
      `  map = ${fn('allocate_map')}(map_size);`,
      `  nstart = map + (map_size - num_nodes)/${nm(2)};`,
      `  *nstart = ${fn('allocate_node')}();`,
      `  start.${fn('set_node')}(nstart);`,
      `  start.cur = start.first; finish = start;`,
      `}`,
    ],
    push_back: [
      `${kw('void')} ${fn('push_back')}(${kw('const')} T& x) {`,
      `  ${kw('if')} (finish.cur != finish.last - ${nm(1)}) {`,
      `    ${fn('construct')}(finish.cur, x);`,
      `    ++finish.cur;`,
      `  } ${kw('else')} {          ${cm('// _M_push_back_aux')}`,
      `    ${fn('reserve_map_at_back')}(${nm(1)});`,
      `    *(finish.node + ${nm(1)}) = ${fn('allocate_node')}();`,
      `    ${fn('construct')}(finish.cur, x);`,
      `    finish.${fn('set_node')}(finish.node + ${nm(1)});`,
      `    finish.cur = finish.first;`,
      `  }`,
      `}`,
    ],
    push_front: [
      `${kw('void')} ${fn('push_front')}(${kw('const')} T& x) {`,
      `  ${kw('if')} (start.cur != start.first) {`,
      `    ${fn('construct')}(start.cur - ${nm(1)}, x);`,
      `    --start.cur;`,
      `  } ${kw('else')} {         ${cm('// _M_push_front_aux')}`,
      `    ${fn('reserve_map_at_front')}(${nm(1)});`,
      `    *(start.node - ${nm(1)}) = ${fn('allocate_node')}();`,
      `    start.${fn('set_node')}(start.node - ${nm(1)});`,
      `    start.cur = start.last - ${nm(1)};`,
      `    ${fn('construct')}(start.cur, x);`,
      `  }`,
      `}`,
    ],
    pop_back: [
      `${kw('void')} ${fn('pop_back')}() {`,
      `  ${kw('if')} (finish.cur != finish.first) {`,
      `    --finish.cur;`,
      `    ${fn('destroy')}(finish.cur);`,
      `  } ${kw('else')} {          ${cm('// _M_pop_back_aux')}`,
      `    ${fn('deallocate_node')}(finish.first);`,
      `    finish.${fn('set_node')}(finish.node - ${nm(1)});`,
      `    finish.cur = finish.last - ${nm(1)};`,
      `    ${fn('destroy')}(finish.cur);`,
      `  }`,
      `}`,
    ],
    pop_front: [
      `${kw('void')} ${fn('pop_front')}() {`,
      `  ${kw('if')} (start.cur != start.last - ${nm(1)}) {`,
      `    ${fn('destroy')}(start.cur);`,
      `    ++start.cur;`,
      `  } ${kw('else')} {         ${cm('// _M_pop_front_aux')}`,
      `    ${fn('destroy')}(start.cur);`,
      `    ${fn('deallocate_node')}(start.first);`,
      `    start.${fn('set_node')}(start.node + ${nm(1)});`,
      `    start.cur = start.first;`,
      `  }`,
      `}`,
    ],
    remap: [
      `${cm('// reserve_map_at_back(n): если')}`,
      `${cm('//   n + 1 > map_size - (finish.node - map)')}`,
      `${cm('// reserve_map_at_front(n): если')}`,
      `${cm('//   n > start.node - map')}`,
      `${kw('void')} ${fn('reallocate_map')}(size_t add, ${kw('bool')} front) {`,
      `  old_nodes = finish.node - start.node + ${nm(1)};`,
      `  new_nodes = old_nodes + add;`,
      `  ${kw('if')} (map_size > ${nm(2)} * new_nodes) {`,
      `    nstart = map + (map_size - new_nodes)/${nm(2)}`,
      `             + (front ? add : ${nm(0)});`,
      `    ${fn('memmove')}(nstart, start.node, old_nodes);`,
      `  } ${kw('else')} {`,
      `    sz = map_size + ${fn('max')}(map_size, add) + ${nm(2)};`,
      `    new_map = ${fn('allocate_map')}(sz);`,
      `    nstart = new_map + (sz - new_nodes)/${nm(2)}`,
      `             + (front ? add : ${nm(0)});`,
      `    ${fn('copy')}(start.node, finish.node+${nm(1)}, nstart);`,
      `    ${fn('deallocate_map')}(map, map_size);`,
      `    map = new_map; map_size = sz;`,
      `  }`,
      `  start.${fn('set_node')}(nstart);`,
      `  finish.${fn('set_node')}(nstart + old_nodes - ${nm(1)});`,
      `}`,
    ],
    at: [
      `reference ${kw('operator')}[](size_t n) {`,
      `  ${cm('// то же, что *(start + n):')}`,
      `  off  = n + (start.cur - start.first);`,
      `  node = start.node + off / BLOCK;`,
      `  ${kw('return')} (*node)[off % BLOCK];`,
      `}`,
    ],
    clear: [
      `${kw('void')} ${fn('clear')}() {`,
      `  ${fn('destroy')}(${fn('begin')}(), ${fn('end')}());`,
      `  ${cm('// все блоки после первого — вернуть')}`,
      `  ${kw('for')} (p ${kw('in')} (start.node, finish.node])`,
      `    ${fn('deallocate_node')}(*p);`,
      `  finish = start;`,
      `}`,
    ],
  };

  /* ── Rendering ────────────────────────────────────────── */
  function applyStep(s) {
    root.selectAll('*').remove();
    const g = root;
    const n = s.mapSize;
    const sw = Math.max(26, Math.min(56, Math.floor((672 - 4 * (n - 1)) / n)));
    const sx = i => 24 + i * (sw + 4);
    const MAP_Y = 160, BLK_Y = 222, CH = 30, CG = 3;

    /* deque object */
    frame(g, 24, 32, 380, 84, 'd — объект std::deque<int> на стеке (80 байт)');
    const rows = [
      ['_M_map', hex(s.mapAddr), '_M_map_size', String(n)],
      ['_M_start.node', `слот ${s.start.node}`, '_M_start.cur', `[${s.start.cur}]`],
      ['_M_finish.node', `слот ${s.finish.node}`, '_M_finish.cur', `[${s.finish.cur}]`],
    ];
    rows.forEach((r, i) => {
      const y = 32 + 22 + i * 24;
      label(g, 36, y, r[0], { color: COL.muted2, size: 10.5, mono: true });
      label(g, 205, y, r[1], { color: i === 1 ? COL.amberHi : i === 2 ? COL.blue : COL.amberHi, size: 11, mono: true, anchor: 'end', weight: 700 });
      label(g, 222, y, r[2], { color: COL.muted2, size: 10.5, mono: true });
      label(g, 392, y, r[3], { color: i === 1 ? COL.amberHi : i === 2 ? COL.blue : COL.amberHi, size: 11, mono: true, anchor: 'end', weight: 700 });
    });
    label(g, 430, 54, `size() = ${s.stats.size}`, { color: COL.text, size: 13, mono: true, weight: 700 });
    label(g, 430, 78, `блок = ${B} × int`, { color: COL.muted2, size: 11, mono: true });
    label(g, 430, 98, `блоков: ${Object.keys(s.blocks).length}`, { color: COL.muted2, size: 11, mono: true });

    /* map */
    const mapW = n * (sw + 4) - 4;
    frame(g, 18, MAP_Y - 6, mapW + 12, 42, `карта _M_map @${hex(s.mapAddr)}: ${n} указателей на блоки`);
    for (let i = 0; i < n; i++) {
      const id = s.map[i];
      const tone = s.hl.slots[i] || (id ? 'none' : 'raw');
      cell(g, sx(i), MAP_Y, sw, 30, id ? '●' : '', tone, { size: 10 });
      label(g, sx(i) + 3, MAP_Y + 9, i, { color: '#4a4a4a', size: 7.5, mono: true });
      if (!id && s.oldMap && s.oldMap.length === n && s.oldMap[i] && !s.hl.slots[i])
        cell(g, sx(i) + 4, MAP_Y + 4, sw - 8, 22, '', 'ghost', { dash: '2 2' });
    }

    /* blocks hanging under their slots */
    const startKey = `${s.map[s.start.node]}:${s.start.cur}`;
    const finKey = `${s.map[s.finish.node]}:${s.finish.cur}`;
    const live = new Set(dequeElems(s).map(e => `${s.map[e.slot]}:${e.cur}`));
    for (let i = 0; i < n; i++) {
      const id = s.map[i];
      if (!id || !s.blocks[id]) continue;
      const b = s.blocks[id];
      g.append('line').attr('x1', sx(i) + sw / 2).attr('x2', sx(i) + sw / 2).attr('y1', MAP_Y + 18).attr('y2', BLK_Y - 4)
        .attr('stroke', s.hl.slots[i] === 'moved' ? COL.purple : '#4a4a4a').attr('stroke-width', 1.3)
        .attr('marker-end', `url(#cv-${s.hl.slots[i] === 'moved' ? 'purple' : 'muted'})`);
      for (let c = 0; c < B; c++) {
        const key = `${id}:${c}`;
        const v = b.cells[c];
        const tone = s.hl.cells[key] || (live.has(key) ? 'none' : 'raw');
        const y = BLK_Y + c * (CH + CG);
        cell(g, sx(i), y, sw, CH, v ?? '', tone, { size: sw < 32 ? 11 : 13 });
        if (key === startKey) g.append('rect').attr('x', sx(i) - 1).attr('y', y - 1).attr('width', 4).attr('height', CH + 2).attr('rx', 2).attr('fill', COL.amber);
        if (key === finKey) g.append('rect').attr('x', sx(i) + sw - 3).attr('y', y - 1).attr('width', 4).attr('height', CH + 2).attr('rx', 2).attr('fill', COL.blue);
      }
      label(g, sx(i) + sw / 2, BLK_Y + B * (CH + CG) + 12, hex(b.addr).slice(-3), { color: '#3e3e3e', size: 8.5, mono: true, anchor: 'middle' });
    }
    const yInfo = BLK_Y + B * (CH + CG) + 34;
    label(g, 24, yInfo, `start → слот ${s.start.node}, ячейка [${s.start.cur}]`, { color: COL.amber, size: 11, mono: true, weight: 700 });
    label(g, 300, yInfo, `finish → слот ${s.finish.node}, ячейка [${s.finish.cur}]  (за последним)`, { color: COL.blue, size: 11, mono: true, weight: 700 });

    /* logical view */
    const els = dequeElems(s);
    const LY = yInfo + 28;
    label(g, 24, LY, 'Как видит пользователь:', { color: COL.muted2, size: 10.5 });
    if (!els.length) label(g, 170, LY, '(пусто)', { color: COL.muted, size: 11, mono: true });
    const lw = Math.max(18, Math.min(34, Math.floor((540 - 3 * els.length) / Math.max(1, els.length))));
    els.forEach((e, i) => {
      const x = 170 + i * (lw + 3);
      cell(g, x, LY - 16, lw, 24, e.v, s.at === i ? 'read' : 'none', { size: lw < 24 ? 9.5 : 11 });
      label(g, x + lw / 2, LY + 20, i, { color: '#3e3e3e', size: 8.5, mono: true, anchor: 'middle' });
    });

    CppViz.code(LISTINGS, s.code, s.line);
    CppViz.opsStripSync(s.op);
    VizState.setDesc(s.desc);
    CppViz.state({
      's-size': s.stats.size,
      's-map': `${n} слотов <span class="dim">(выделялась ${s.stats.mapAllocs} раз)</span>`,
      's-blocks': `${Object.keys(s.blocks).length} <span class="dim">(+${s.stats.nodeAllocs} / −${s.stats.nodeFrees})</span>`,
      's-start': `слот ${s.start.node}, [${s.start.cur}]`,
      's-finish': `слот ${s.finish.node}, [${s.finish.cur}]`,
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */
  const SPEC = { push_back: 'n', push_front: 'n', pop_back: 0, pop_front: 0, at: 1, clear: 0 };
  const PRESETS = [
    { name: 'Основы', script: 'push_back 1 2 3 4 5; push_front 0 -1; at 3; pop_back; pop_front; pop_front' },
    { name: 'Рост карты (push_front)', script: 'push_front 1..13' },
    { name: 'Очередь: рецентрирование', script: 'push_back 1..6; pop_front x4; push_back 7..12; pop_front x8; push_back 13..20' },
    { name: 'clear', script: 'push_back 1..9; push_front 0; clear; push_back 7' },
  ];
  const bar = CppViz.scriptBar({
    presets: PRESETS, onRun: () => run(),
    hint: 'Операции: <code>push_back x…</code> <code>push_front x…</code> <code>pop_back</code> <code>pop_front</code> <code>at i</code> <code>clear</code> · диапазон <code>1..8</code> · повтор <code>pop_front x3</code>',
  });

  function run() {
    CppViz.resetCode();
    let ops;
    try { ops = CppViz.parse(bar.text, SPEC); bar.error(''); }
    catch (e) { bar.error(e.message); return; }
    const steps = dequeSimulate(ops, B);
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
