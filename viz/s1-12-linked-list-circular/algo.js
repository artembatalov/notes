/* 12 — Циклический список */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="kw">function</span> <span class="fn">insert</span>(val):' },
  { id: 2,  html: '  node = <span class="kw">new</span> Node(val)' },
  { id: 3,  html: '  <span class="kw">if</span> head == <span class="num">null</span>: node.next = node; head = node; <span class="kw">return</span>' },
  { id: 4,  html: '  node.next = head.next' },
  { id: 5,  html: '  head.next = node' },
  { id: 6,  html: '<span class="kw">function</span> <span class="fn">traverse</span>():' },
  { id: 7,  html: '  cur = head' },
  { id: 8,  html: '  <span class="kw">do</span>: visit(cur); cur = cur.next' },
  { id: 9,  html: '  <span class="kw">while</span> cur ≠ head' },
  { id: 10, html: '<span class="kw">function</span> <span class="fn">delete</span>(val):' },
  { id: 11, html: '  cur = head' },
  { id: 12, html: '  <span class="kw">while</span> cur.next.val ≠ val: cur = cur.next' },
  { id: 13, html: '  cur.next = cur.next.next  <span class="cm">// bypass</span>' },
]);

function buildSteps() {
  const steps = [];
  let list = [];

  function addStep(list, highlights, desc, op, pseudo) {
    steps.push({ list: [...list], highlights: { ...highlights }, desc, op: op || '—', pseudo: pseudo || [] });
  }

  addStep([], {}, 'Список пуст. Нажмите <b>Запустить</b>.', '—', []);

  // insert(5)
  addStep([], {}, '<b>insert(5)</b> — создаём первый узел, самоссылка', 'insert(5)', [1, 2, 3]);
  list = [5];
  addStep(list, { 0: 'amber' }, '<b>insert(5)</b> — 5 ссылается на себя (цикл)', 'insert(5)', [3]);

  // insert(3)
  addStep(list, {}, '<b>insert(3)</b> — вставляем после head', 'insert(3)', [1, 2, 4, 5]);
  list = [5, 3];
  addStep(list, { 1: 'amber' }, '<b>insert(3)</b> — 3 вставлен, цикл замкнут', 'insert(3)', [4, 5]);

  // insert(8)
  addStep(list, {}, '<b>insert(8)</b> — вставляем после head', 'insert(8)', [1, 2, 4, 5]);
  list = [5, 8, 3];
  addStep(list, { 1: 'amber' }, '<b>insert(8)</b> — 8 вставлен', 'insert(8)', [4, 5]);

  // insert(1)
  addStep(list, {}, '<b>insert(1)</b> — вставляем после head', 'insert(1)', [1, 2, 4, 5]);
  list = [5, 1, 8, 3];
  addStep(list, { 1: 'amber' }, '<b>insert(1)</b> — 1 вставлен', 'insert(1)', [4, 5]);

  // traverse: 5→1→8→3→5
  addStep(list, {}, '<b>traverse()</b> — начинаем с head=5', 'traverse()', [6, 7]);
  addStep(list, { 0: 'amber' }, '<b>traverse()</b> — посещаем 5', 'traverse()', [8]);
  addStep(list, { 1: 'amber' }, '<b>traverse()</b> — посещаем 1', 'traverse()', [8]);
  addStep(list, { 2: 'amber' }, '<b>traverse()</b> — посещаем 8', 'traverse()', [8]);
  addStep(list, { 3: 'amber' }, '<b>traverse()</b> — посещаем 3', 'traverse()', [8]);
  addStep(list, { 0: 'green' }, '<b>traverse()</b> — вернулись к head=5, обход завершён', 'traverse()', [9]);

  // delete(8) — index 2 in list [5,1,8,3]
  addStep(list, {}, '<b>delete(8)</b> — ищем предшественника 8', 'delete(8)', [10, 11, 12]);
  addStep(list, { 2: 'red' }, '<b>delete(8)</b> — нашли 8, перекидываем ссылку', 'delete(8)', [13]);
  list = [5, 1, 3];
  addStep(list, {}, '<b>delete(8)</b> — 8 удалён, цикл перестроен', 'delete(8)', [13]);

  return steps;
}

const CX = 350, CY = 165, R_CIRCLE = 115, NODE_R = 26;
const COLOR_MAP = { amber: '#c8973e', green: '#5a9a72', red: '#d46a6a', blue: '#6a9fd4' };

function nodePos(i, n) {
  const angle = (2 * Math.PI * i / n) - Math.PI / 2;
  return { x: CX + R_CIRCLE * Math.cos(angle), y: CY + R_CIRCLE * Math.sin(angle) };
}

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  const n = step.list.length;
  document.getElementById('s-size').textContent = n;
  document.getElementById('s-head').textContent = n ? step.list[0] : '—';
  document.getElementById('s-op').textContent = step.op || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arrC12')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#888');

  if (n === 0) {
    svg.append('text')
      .attr('x', CX).attr('y', CY)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', '#585858').attr('font-size', 14)
      .text('[ пусто ]');
    return;
  }

  // Single node self-loop
  if (n === 1) {
    const pos = { x: CX, y: CY };
    // self-loop arc
    svg.append('path')
      .attr('d', `M${pos.x + NODE_R},${pos.y} C${pos.x + 80},${pos.y - 60} ${pos.x - 80},${pos.y - 60} ${pos.x - NODE_R},${pos.y}`)
      .attr('fill', 'none').attr('stroke', '#555').attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrC12)');

    const hl = step.highlights[0];
    svg.append('circle')
      .attr('cx', pos.x).attr('cy', pos.y).attr('r', NODE_R)
      .attr('fill', hl ? COLOR_MAP[hl] : '#2a2a2a')
      .attr('stroke', hl ? '#a07030' : '#444').attr('stroke-width', 1.5);

    svg.append('text')
      .attr('x', pos.x).attr('y', pos.y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', hl === 'amber' ? '#111' : '#efefef')
      .attr('font-size', 15).attr('font-weight', 700)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(step.list[0]);

    svg.append('text')
      .attr('x', pos.x).attr('y', pos.y - NODE_R - 16)
      .attr('text-anchor', 'middle').attr('fill', '#c8973e')
      .attr('font-size', 11).attr('font-weight', 600)
      .text('HEAD');
    return;
  }

  // Draw arcs between nodes
  step.list.forEach((val, i) => {
    const from = nodePos(i, n);
    const to = nodePos((i + 1) % n, n);

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;

    // Perpendicular offset for slight curve
    const px = -uy * 10, py = ux * 10;

    const x1 = from.x + ux * NODE_R;
    const y1 = from.y + uy * NODE_R;
    const x2 = to.x - ux * NODE_R;
    const y2 = to.y - uy * NODE_R;
    const mx = (x1 + x2) / 2 + px;
    const my = (y1 + y2) / 2 + py;

    const isLast = (i === n - 1);
    const strokeColor = isLast ? '#c8973e' : '#555';
    const strokeDash = isLast ? '6 3' : 'none';

    svg.append('path')
      .attr('d', `M${x1},${y1} Q${mx},${my} ${x2},${y2}`)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', isLast ? 2 : 1.5)
      .attr('stroke-dasharray', strokeDash)
      .attr('marker-end', 'url(#arrC12)');
  });

  // Draw nodes on top
  step.list.forEach((val, i) => {
    const pos = nodePos(i, n);
    const hl = step.highlights[i];
    const fill = hl ? COLOR_MAP[hl] : '#2a2a2a';
    const stroke = hl ? (hl === 'amber' ? '#a07030' : hl === 'green' ? '#3d7352' : hl === 'red' ? '#a03030' : '#4a80aa') : '#444';
    const textFill = hl === 'amber' ? '#111' : '#efefef';

    svg.append('circle')
      .attr('cx', pos.x).attr('cy', pos.y).attr('r', NODE_R)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.5);

    svg.append('text')
      .attr('x', pos.x).attr('y', pos.y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', textFill)
      .attr('font-size', 15).attr('font-weight', 700)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(val);
  });

  // HEAD label
  const headPos = nodePos(0, n);
  const headLabelOffset = { x: headPos.x < CX ? -40 : 40, y: headPos.y < CY ? -20 : 20 };
  svg.append('text')
    .attr('x', headPos.x + headLabelOffset.x)
    .attr('y', headPos.y + headLabelOffset.y)
    .attr('text-anchor', 'middle').attr('fill', '#c8973e')
    .attr('font-size', 11).attr('font-weight', 600)
    .text('HEAD');
}

const steps = buildSteps();
VizAnim.init(steps, applyStep);
VizAnim.bindUI(() => {
  VizAnim.init(buildSteps(), applyStep);
  VizAnim.play();
});
applyStep(steps[0]);
