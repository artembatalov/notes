document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, cell, label, arrow } = CppViz;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 450');
  CppViz.defs(svg);
  const root = svg.append('g');

  const PAL = ['#c8973e', '#6a9fd4', '#5a9a72', '#a06ad4', '#d46a6a', '#5ab0b8', '#c87a9a', '#9ab85a', '#d48a5a', '#7a8ad4'];
  const hue = b => PAL[b % PAL.length];

  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`, nm = s => `<span class="num">${s}</span>`;
  const LISTINGS = {
    insert: [
      `pair&lt;iterator,${kw('bool')}&gt; ${fn('insert')}(k, v) {`,
      `  code = ${fn('hash')}(k);        ${cm('// int → k')}`,
      `  bkt = code % bucket_count;`,
      `  ${kw('if')} (${kw('auto')} p = ${fn('find_in')}(bkt, k))`,
      `    ${kw('return')} {p, ${kw('false')}};`,
      `  node = ${kw('new')} node(k, v);`,
      `  ${kw('if')} (${fn('need_rehash')}(bucket_count, size, ${nm(1)})) {`,
      `    ${fn('rehash_aux')}(${fn('next_prime')}(…));`,
      `    bkt = code % bucket_count;`,
      `  }`,
      `  ${fn('insert_bucket_begin')}(bkt, node); ++size;`,
      `}`,
      `${fn('insert_bucket_begin')}(bkt, n):`,
      `  ${kw('if')} (buckets[bkt]) {     ${cm('// корзина не пуста')}`,
      `    n-&gt;next = buckets[bkt]-&gt;next;`,
      `    buckets[bkt]-&gt;next = n;`,
      `  } ${kw('else')} {                ${cm('// в голову списка')}`,
      `    n-&gt;next = before_begin.next;`,
      `    before_begin.next = n;`,
      `    ${kw('if')} (n-&gt;next) buckets[${fn('bkt')}(n-&gt;next)] = n;`,
      `    buckets[bkt] = &amp;before_begin;`,
      `  }`,
    ],
    policy: [
      `${cm('// _Prime_rehash_policy::_M_need_rehash')}`,
      `${kw('if')} (size + ${nm(1)} &gt; next_resize) {`,
      `  min = ${fn('max')}(size + ${nm(1)}, next_resize ? ${nm(0)} : ${nm(11)})`,
      `        / max_load_factor;`,
      `  ${kw('if')} (min &gt;= bucket_count)`,
      `    ${kw('return')} ${fn('next_prime')}(${fn('max')}(min + ${nm(1)},`,
      `                          bucket_count * ${nm(2)}));`,
      `  next_resize = bucket_count * max_load_factor;`,
      `}`,
      `${kw('return')} ${kw('false')};`,
      `${cm('// простые: 13 → 29 → 59 → 127 → 257 → 541')}`,
    ],
    rehash: [
      `${kw('void')} ${fn('rehash_aux')}(size_t n) {`,
      `  nb = ${fn('allocate_buckets')}(n);`,
      `  p = before_begin.next;`,
      `  before_begin.next = ${kw('nullptr')}; bb_bkt = ${nm(0)};`,
      `  ${kw('while')} (p) {`,
      `    next = p-&gt;next; bkt = ${fn('hash')}(p) % n;`,
      `    ${kw('if')} (!nb[bkt]) {`,
      `      p-&gt;next = before_begin.next;`,
      `      before_begin.next = p;`,
      `      nb[bkt] = &amp;before_begin;`,
      `      ${kw('if')} (p-&gt;next) nb[bb_bkt] = p;`,
      `      bb_bkt = bkt;`,
      `    } ${kw('else')} {`,
      `      p-&gt;next = nb[bkt]-&gt;next;`,
      `      nb[bkt]-&gt;next = p;`,
      `    }`,
      `    p = next;`,
      `  }`,
      `  ${fn('deallocate')}(buckets);`,
      `  buckets = nb; bucket_count = n;`,
      `}`,
    ],
    find: [
      `iterator ${fn('find')}(k) {`,
      `  bkt = ${fn('hash')}(k) % bucket_count;`,
      `  prev = buckets[bkt];`,
      `  ${kw('if')} (!prev) ${kw('return')} ${fn('end')}();`,
      `  ${kw('for')} (p = prev-&gt;next; ; p = p-&gt;next) {`,
      `    ${kw('if')} (p-&gt;key == k) ${kw('return')} p;`,
      `    ${kw('if')} (!p-&gt;next || ${fn('bkt')}(p-&gt;next) != bkt)`,
      `      ${kw('return')} ${fn('end')}();`,
      `  }`,
      `}`,
    ],
    erase: [
      `size_t ${fn('erase')}(k) {`,
      `  prev = узел перед k (поиск в корзине)`,
      `  prev-&gt;next = n-&gt;next;`,
      `  ${cm('// поправить buckets[], если n был')}`,
      `  ${cm('// первым/последним в своей группе')}`,
      `  ${kw('delete')} n; --size;  ${cm('// корзины не сжимаются')}`,
      `}`,
    ],
    reserve: [
      `${kw('void')} ${fn('rehash')}(size_t n) {   ${cm('// mlf = max_load_factor')}`,
      `  n = ${fn('max')}(n, ${fn('ceil')}((size + ${nm(1)}) / mlf));`,
      `  n = ${fn('next_prime')}(n);`,
      `  ${kw('if')} (n != bucket_count) ${fn('rehash_aux')}(n);`,
      `}`,
      `${kw('void')} ${fn('reserve')}(size_t n) {`,
      `  ${fn('rehash')}(${fn('ceil')}(n / mlf));`,
      `}`,
      `${kw('void')} ${fn('max_load_factor')}(${kw('float')} z) {`,
      `  policy = z;     ${cm('// next_resize = 0')}`,
      `}`,
    ],
  };

  function applyStep(s) {
    root.selectAll('*').remove();
    const g = root;
    const n = s.bc;
    const GAP = n > 40 ? 1 : 2;
    const cw = Math.max(3, Math.min(46, Math.floor((680 - GAP * (n - 1)) / n)));
    const bx = b => 20 + b * (cw + GAP);
    const BY = 50, BH = 26, NH = 22, NG = 5;

    /* header */
    label(g, 20, 24, `bucket_count = ${n}   size = ${s.size}   load_factor = ${(s.size / n).toFixed(2)} / max ${s.mlf}   next_resize = ${s.nextResize}`,
      { color: COL.muted2, size: 10.5, mono: true });
    if (s.floating) {
      g.append('rect').attr('x', 618).attr('y', 11).attr('width', 82).attr('height', 20).attr('rx', 10)
        .attr('fill', 'rgba(200,151,62,.16)').attr('stroke', COL.amber);
      label(g, 659, 25, `ключ ${s.floating.key}`, { color: COL.amberHi, size: 10.5, mono: true, anchor: 'middle', weight: 700 });
    }

    /* groups by bucket (order inside a group = list order) */
    const groups = {};
    s.list.forEach(nd => { (groups[nd.key % n] ||= []).push(nd); });

    /* bucket array */
    for (let b = 0; b < n; b++) {
      const has = !!groups[b];
      const tone = s.bhl[b] || (has ? 'none' : 'raw');
      cell(g, bx(b), BY, cw, BH, '', tone, { rx: 3 });
      if (has) g.append('rect').attr('x', bx(b) + 2).attr('y', BY + BH - 4).attr('width', cw - 4).attr('height', 2).attr('fill', hue(b));
      if (cw >= 14) label(g, bx(b) + cw / 2, BY + BH / 2 + 4, b, { color: has ? COL.text : '#3a3a3a', size: cw >= 24 ? 10 : 8, mono: true, anchor: 'middle', weight: 600 });
    }
    label(g, 20, BY - 7, '_M_buckets', { color: COL.muted, size: 9.5, mono: true });

    /* chains under buckets */
    const MAXC = 8;
    Object.entries(groups).forEach(([b, nodes]) => {
      b = +b;
      const x = bx(b);
      nodes.slice(0, MAXC).forEach((nd, j) => {
        const y = BY + BH + 12 + j * (NH + NG);
        if (j === 0) arrow(g, x + cw / 2, BY + BH + 1, x + cw / 2, y - 1, { color: 'muted', width: 1.1 });
        else arrow(g, x + cw / 2, y - NG - 1, x + cw / 2, y - 1, { color: 'muted', width: 1.1 });
        const tone = s.hl[nd.id] || 'none';
        cell(g, x, y, cw, NH, cw >= 16 ? nd.key : '', tone, { size: cw >= 26 ? 11 : 8.5, rx: 3 });
        if (tone === 'none') g.append('rect').attr('x', x).attr('y', y).attr('width', 2.5).attr('height', NH).attr('fill', hue(b));
      });
      if (nodes.length > MAXC) label(g, x + cw / 2, BY + BH + 12 + MAXC * (NH + NG) + 10, `+${nodes.length - MAXC}`, { color: COL.muted2, size: 9, anchor: 'middle', mono: true });
    });

    /* pending nodes during rehash */
    if (s.pending && s.pending.length) {
      label(g, 20, 318, 'ещё в старом списке:', { color: COL.muted2, size: 10 });
      s.pending.forEach((nd, i) => cell(g, 140 + i * 30, 305, 26, 18, nd.key, 'ghost', { size: 9.5, rx: 3 }));
    }

    /* the single forward list as libstdc++ stores it */
    const LY = 382, items = s.list;
    label(g, 20, LY - 26, 'В памяти libstdc++ это один односвязный список; корзина хранит указатель на узел ПЕРЕД своей группой:',
      { color: COL.muted2, size: 9.5 });
    const k = items.length + 2;
    const w = Math.max(18, Math.min(40, Math.floor((680 - 10 * (k - 1)) / k)));
    const gx = i => 20 + i * (w + 10);
    cell(g, gx(0), LY, w + 4, 24, 'bb', 'none', { size: 8.5, rx: 3, weight: 600 });
    const beforeOf = {}; // index of node → bucket whose "before" pointer points at it
    let prevB = null;
    items.forEach((nd, i) => { const b = nd.key % n; if (b !== prevB) { beforeOf[i] = b; prevB = b; } });
    items.forEach((nd, i) => {
      const x = gx(i + 1) + 4, b = nd.key % n;
      const tone = s.hl[nd.id] || 'none';
      cell(g, x, LY, w, 24, nd.key, tone, { size: w >= 28 ? 11 : 9, rx: 3 });
      g.append('rect').attr('x', x).attr('y', LY + 26).attr('width', w).attr('height', 2.5).attr('fill', hue(b));
      if (w >= 22) label(g, x + w / 2, LY + 40, `b${b}`, { color: '#555', size: 8.5, anchor: 'middle', mono: true });
      arrow(g, (i === 0 ? gx(0) + w + 4 : gx(i) + 4 + w) + 1, LY + 12, x - 1, LY + 12, { color: 'blue', width: 1.1 });
    });
    Object.entries(beforeOf).forEach(([i, b]) => {
      i = +i;
      const x = i === 0 ? gx(0) + (w + 4) / 2 : gx(i) + 4 + w / 2;
      label(g, x, LY - 6, `[${b}]`, { color: hue(b), size: 8.5, anchor: 'middle', mono: true, weight: 700 });
    });
    const endX = items.length ? gx(items.length) + 4 + w : gx(0) + w + 4;
    label(g, endX + 6, LY + 16, '∅', { color: COL.muted, size: 12, mono: true });

    CppViz.code(LISTINGS, s.code, s.line);
    CppViz.opsStripSync(s.op);
    VizState.setDesc(s.desc);
    const maxChain = Math.max(0, ...Object.values(groups).map(x => x.length));
    CppViz.state({
      's-bc': n,
      's-size': s.size,
      's-lf': `${(s.size / n).toFixed(2)} <span class="dim">/ max ${s.mlf}</span>`,
      's-chain': maxChain,
      's-rehash': s.stats.rehashes,
    });
  }

  const SPEC = { insert: 'n', find: 'n', erase: 'n', rehash: 1, reserve: 1, max_load_factor: 1 };
  const PRESETS = [
    { name: 'Коллизии и rehash 13 → 29', script: 'insert 7 20 33 3 16 46 59 12 25 1 14 27 40; find 46; find 8; insert 53; find 33; erase 20' },
    { name: 'Первая вставка', script: 'insert 5 18 31; find 31; find 44; erase 18' },
    { name: 'reserve заранее', script: 'reserve 20; insert 1..15' },
    { name: 'max_load_factor 0.5', script: 'max_load_factor 0.5; insert 1..12' },
  ];
  const bar = CppViz.scriptBar({
    presets: PRESETS, onRun: () => run(),
    hint: 'Операции: <code>insert k…</code> <code>find k</code> <code>erase k</code> <code>rehash n</code> <code>reserve n</code> <code>max_load_factor f</code> · ключи — целые ≥ 0, hash(int) = само число',
  });

  function run() {
    CppViz.resetCode();
    let ops;
    try {
      ops = CppViz.parse(bar.text, SPEC);
      for (const o of ops) {
        const a = o.args[0];
        if (o.name === 'max_load_factor' ? !(a > 0 && a <= 4) : !(Number.isInteger(a) && a >= 0 && a < 1e6))
          throw new Error(`«${o.label}»: ${o.name === 'max_load_factor' ? 'нужно число в (0, 4]' : 'нужно целое ≥ 0'}`);
      }
      bar.error('');
    } catch (e) { bar.error(e.message); return; }
    const steps = umSimulate(ops);
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
