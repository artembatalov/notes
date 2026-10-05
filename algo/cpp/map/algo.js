document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, label } = CppViz;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 440');
  CppViz.defs(svg);
  const gEdges = svg.append('g'), gNil = svg.append('g'), gNodes = svg.append('g'), gOver = svg.append('g');

  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`;
  const LISTINGS = {
    insert: [
      `pair&lt;iterator,${kw('bool')}&gt; ${fn('insert')}(k):`,
      `  спуск: k &lt; x-&gt;key ? left : right`,
      `  z = ${kw('new')} node(k, RED); подвесить z`,
      `  ${kw('while')} (z != root &amp;&amp; ${fn('red')}(z-&gt;parent)) {`,
      `    p = z-&gt;parent; g = p-&gt;parent;`,
      `    u = (p == g-&gt;left) ? g-&gt;right : g-&gt;left;`,
      `    ${kw('if')} (${fn('red')}(u)) {               ${cm('// 1')}`,
      `      p-&gt;color = u-&gt;color = BLACK;`,
      `      g-&gt;color = RED; z = g;`,
      `    } ${kw('else')} {`,
      `      ${kw('if')} (z — внутренний внук) { ${cm('// 2')}`,
      `        z = p; ${fn('rotate')}(z, наружу);`,
      `      }`,
      `      p = z-&gt;parent;`,
      `      p-&gt;color = BLACK;             ${cm('// 3')}`,
      `      g-&gt;color = RED;`,
      `      ${fn('rotate')}(g, к дяде);`,
      `    }`,
      `  }`,
      `  root-&gt;color = BLACK;`,
    ],
    erase: [
      `size_t ${fn('erase')}(k):`,
      `  z = ${fn('find')}(k); ${kw('if')} (!z) ${kw('return')} 0;`,
      `  ${kw('if')} (у z два сына) {`,
      `    y = ${fn('min')}(z-&gt;right);   ${cm('// преемник')}`,
      `    узел y встаёт на место z`,
      `    ${cm('// узлы перевешиваются, ключи не копир.')}`,
      `  }`,
      `  вынуть узел; x — кто встал на его место`,
      `  ${kw('if')} (вынутый цвет == BLACK) ${fn('fixup')}(x);`,
      ``,
      `${fn('fixup')}(x):  ${cm('// x «дважды чёрный»')}`,
      `  ${kw('while')} (x != root &amp;&amp; ${fn('black')}(x)) {`,
      `    w = брат x;`,
      `    ${kw('if')} (${fn('red')}(w)) {                  ${cm('// 1')}`,
      `      перекрасить; ${fn('rotate')}(p, к x);`,
      `    } ${kw('else if')} (${fn('black')}(w-&gt;left) &amp;&amp;`,
      `               ${fn('black')}(w-&gt;right)) { ${cm('// 2')}`,
      `      w-&gt;color = RED; x = p;`,
      `    } ${kw('else')} {`,
      `      ${kw('if')} (дальний сын w чёрный) { ${cm('// 3')}`,
      `        перекрасить; ${fn('rotate')}(w, от x);`,
      `      }`,
      `      w-&gt;color = p-&gt;color;          ${cm('// 4')}`,
      `      p-&gt;color = дальний-&gt;color = BLACK;`,
      `      ${fn('rotate')}(p, к x); x = root;`,
      `    }`,
      `  }`,
      `  x-&gt;color = BLACK;`,
    ],
    find: [
      `iterator ${fn('find')}(k) {`,
      `  x = root; y = ${fn('end')}();  ${cm('// header')}`,
      `  ${kw('while')} (x) {`,
      `    ${kw('if')} (!(x-&gt;key &lt; k))`,
      `      y = x, x = x-&gt;left;  ${cm('// кандидат')}`,
      `    ${kw('else')} x = x-&gt;right;`,
      `  }`,
      `  ${kw('return')} (y == ${fn('end')}() || k &lt; y-&gt;key)`,
      `         ? ${fn('end')}() : y;`,
      `}`,
    ],
    lower: [
      `iterator ${fn('lower_bound')}(k) {`,
      `  x = root; y = ${fn('end')}();`,
      `  ${kw('while')} (x) {`,
      `    ${kw('if')} (!(x-&gt;key &lt; k))`,
      `      y = x, x = x-&gt;left;`,
      `    ${kw('else')} x = x-&gt;right;`,
      `  }`,
      `  ${kw('return')} y;   ${cm('// первый ключ &gt;= k')}`,
      `}`,
    ],
    iter: [
      `${kw('for')} (it = s.${fn('begin')}(); it != s.${fn('end')}(); ++it)`,
      `${cm('// begin() = header-&gt;left — O(1)')}`,
      `node* ${fn('increment')}(node* x) {`,
      `  ${kw('if')} (x-&gt;right) {`,
      `    x = x-&gt;right;`,
      `    ${kw('while')} (x-&gt;left) x = x-&gt;left;`,
      `  } ${kw('else')} {`,
      `    y = x-&gt;parent;`,
      `    ${kw('while')} (x == y-&gt;right)`,
      `      x = y, y = y-&gt;parent;`,
      `    x = y;`,
      `  }`,
      `  ${kw('return')} x;`,
      `}`,
    ],
  };

  /* ── Layout: x = in-order rank, y = depth ─────────────── */
  function layout(s) {
    const pos = {};
    const order = [];
    let maxDepth = 0;
    const walk = (id, d) => {
      if (id === null) return;
      const n = s.nodes[id];
      walk(n.left, d + 1);
      order.push(id);
      pos[id] = { d };
      maxDepth = Math.max(maxDepth, d);
      walk(n.right, d + 1);
    };
    walk(s.root, 0);
    const cnt = Math.max(1, order.length);
    const dx = Math.min(58, 660 / cnt);
    const x0 = 360 - (dx * (cnt - 1)) / 2;
    const dy = Math.min(62, 300 / Math.max(1, maxDepth + 0.6));
    order.forEach((id, i) => { pos[id].x = x0 + i * dx; pos[id].y = 70 + pos[id].d * dy; });
    return { pos, order, dx, dy };
  }

  const RING = { read: COL.blue, active: COL.amber, new: COL.amber, ok: COL.greenHi, dead: COL.red, warn: COL.red };
  const T = () => svg.transition().duration(VizAnim.playing ? 380 : 260).ease(d3.easeCubicOut);

  function applyStep(s) {
    const { pos, order, dx, dy } = layout(s);
    const r = Math.max(11, Math.min(17, dx / 2 - 6));
    const t = T();

    /* edges */
    const edges = order.filter(id => s.nodes[id].parent !== null).map(id => ({ id, p: s.nodes[id].parent }));
    gEdges.selectAll('line').data(edges, d => d.id).join(
      enter => enter.append('line').attr('stroke', '#3a3a3a').attr('stroke-width', 1.6)
        .attr('x1', d => pos[d.p].x).attr('y1', d => pos[d.p].y).attr('x2', d => pos[d.id].x).attr('y2', d => pos[d.id].y).attr('opacity', 0),
      update => update,
      exit => exit.remove(),
    ).transition(t).attr('opacity', 1)
      .attr('x1', d => pos[d.p].x).attr('y1', d => pos[d.p].y).attr('x2', d => pos[d.id].x).attr('y2', d => pos[d.id].y)
      .attr('stroke', d => (s.visited.includes(d.id) && s.visited.includes(d.p)) ? COL.blue : '#3a3a3a');

    /* nodes */
    const data = order.map(id => ({ id, ...s.nodes[id] }));
    const sel = gNodes.selectAll('g.rb').data(data, d => d.id).join(
      enter => {
        const g = enter.append('g').attr('class', 'rb').attr('transform', d => `translate(${pos[d.id].x},${pos[d.id].y - 18})`).attr('opacity', 0);
        g.append('circle').attr('class', 'ring');
        g.append('circle').attr('class', 'body');
        g.append('text').attr('class', 'k').attr('text-anchor', 'middle').attr('dy', '.35em')
          .attr('font-family', "'JetBrains Mono', monospace").attr('font-weight', 700);
        return g;
      },
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove(),
    );
    sel.transition(t).attr('opacity', 1).attr('transform', d => `translate(${pos[d.id].x},${pos[d.id].y})`);
    sel.select('.body').attr('r', r)
      .attr('fill', d => (d.color === 'R' ? '#9c3d3d' : '#161616'))
      .attr('stroke', d => (d.color === 'R' ? '#d46a6a' : '#5a5a5a')).attr('stroke-width', 1.5);
    sel.select('.ring').attr('r', r + 5).attr('fill', 'none')
      .attr('stroke', d => RING[s.hl[d.id]] || 'none').attr('stroke-width', 2.4)
      .attr('stroke-dasharray', d => (s.hl[d.id] === 'dead' ? '4 3' : null));
    sel.select('.k').attr('font-size', r > 14 ? 12.5 : 10.5).attr('fill', '#efefef').text(d => d.key);

    /* nil (double black) marker during erase fixup */
    gNil.selectAll('*').remove();
    if (s.nil && pos[s.nil.parent]) {
      const p = pos[s.nil.parent];
      const x = p.x + (s.nil.side === 'left' ? -dx / 2 : dx / 2), y = p.y + dy * 0.8;
      gNil.append('line').attr('x1', p.x).attr('y1', p.y).attr('x2', x).attr('y2', y).attr('stroke', '#3a3a3a').attr('stroke-dasharray', '3 3');
      gNil.append('rect').attr('x', x - 11).attr('y', y - 8).attr('width', 22).attr('height', 16).attr('rx', 3)
        .attr('fill', '#0c0c0c').attr('stroke', COL.amber).attr('stroke-width', 1.8);
      gNil.append('text').attr('x', x).attr('y', y).attr('dy', '.35em').attr('text-anchor', 'middle').attr('font-size', 9)
        .attr('font-family', "'JetBrains Mono', monospace").attr('fill', COL.amber).text('nil');
    }

    /* overlay: probe key, candidate, header info, in-order strip */
    gOver.selectAll('*').remove();
    if (s.probe) {
      const at = s.probe.at && pos[s.probe.at] ? pos[s.probe.at] : { x: 360, y: 70 };
      const x = at.x + r + 22, y = at.y - r - 8;
      gOver.append('rect').attr('x', x - 15).attr('y', y - 10).attr('width', 30).attr('height', 20).attr('rx', 10)
        .attr('fill', 'rgba(200,151,62,.18)').attr('stroke', COL.amber);
      gOver.append('text').attr('x', x).attr('y', y).attr('dy', '.35em').attr('text-anchor', 'middle').attr('font-size', 11)
        .attr('font-weight', 700).attr('font-family', "'JetBrains Mono', monospace").attr('fill', COL.amberHi).text(s.probe.key);
    }
    if (s.cand && pos[s.cand]) label(gOver, pos[s.cand].x, pos[s.cand].y + r + 16, 'y', { color: COL.greenHi, size: 11, anchor: 'middle', mono: true, weight: 700 });

    const keys = order.map(id => s.nodes[id].key);
    const lo = keys.length ? keys[0] : null, hi = keys.length ? keys[keys.length - 1] : null;
    label(gOver, 20, 22, `header: left → ${lo ?? 'header'} (begin), right → ${hi ?? 'header'}, parent → ${s.root ? s.nodes[s.root].key : 'nullptr'} (корень)`,
      { color: COL.muted, size: 9.5, mono: true });

    const SY = 402;
    label(gOver, 20, SY - 14, 'По порядку (in-order):', { color: COL.muted2, size: 10.5 });
    const iterSet = new Set(s.iter || []);
    const curIter = s.iter && s.iter.length ? s.iter[s.iter.length - 1] : null;
    const cw = Math.min(34, Math.floor(680 / Math.max(1, order.length)) - 3);
    order.forEach((id, i) => {
      const tone = id === curIter ? 'new' : iterSet.has(id) ? 'ok' : s.hl[id] === 'dead' ? 'dead' : 'none';
      CppViz.cell(gOver, 20 + i * (cw + 3), SY - 4, cw, 22, s.nodes[id].key, tone, { size: cw < 24 ? 9.5 : 11 });
    });
    if (!order.length) label(gOver, 20, SY + 11, '(пусто)', { color: COL.muted, size: 11, mono: true });

    CppViz.code(LISTINGS, s.code, s.line);
    CppViz.opsStripSync(s.op);
    VizState.setDesc(s.desc);
    let h = 0;
    const hgt = id => (id === null ? 0 : 1 + Math.max(hgt(s.nodes[id].left), hgt(s.nodes[id].right)));
    h = hgt(s.root);
    let bh = 0;
    for (let id = s.root; id !== null; id = s.nodes[id].left) if (s.nodes[id].color === 'B') bh++;
    CppViz.state({
      's-size': s.size,
      's-h': `${h} <span class="dim">(≤ 2·log₂(n+1) = ${s.size ? (2 * Math.log2(s.size + 1)).toFixed(1) : 0})</span>`,
      's-bh': bh,
      's-begin': lo === null ? '<span class="dim">end()</span>' : lo,
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */
  const SPEC = { insert: 'n', erase: 'n', find: 'n', lower_bound: 'n', iterate: 0 };
  const PRESETS = [
    { name: 'Вставка: все 3 случая', script: 'insert 10 20 30 15 25 5 1 12 18 13' },
    { name: 'Удаление', script: 'insert 10 20 30 15 25 5 1 12 18 13; erase 1; erase 20; erase 10; erase 30' },
    { name: 'find, lower_bound, обход', script: 'insert 40 20 60 10 30 50 70 25; find 30; find 35; lower_bound 35; iterate' },
    { name: 'Возрастающие ключи', script: 'insert 1..12' },
  ];
  const bar = CppViz.scriptBar({
    presets: PRESETS, onRun: () => run(),
    hint: 'Операции: <code>insert k…</code> <code>erase k…</code> <code>find k</code> <code>lower_bound k</code> <code>iterate</code> · диапазон <code>1..12</code>',
  });

  function run() {
    CppViz.resetCode();
    let ops;
    try { ops = CppViz.parse(bar.text, SPEC); bar.error(''); }
    catch (e) { bar.error(e.message); return; }
    const steps = rbSimulate(ops);
    gEdges.selectAll('*').remove(); gNodes.selectAll('*').remove();
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
