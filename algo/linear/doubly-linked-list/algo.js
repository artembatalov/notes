/* 11 — Двусвязный список */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="kw">function</span> <span class="fn">push_front</span>(val):' },
  { id: 2,  html: '  node = <span class="kw">new</span> Node(val)' },
  { id: 3,  html: '  node.next = head; node.prev = <span class="num">null</span>' },
  { id: 4,  html: '  <span class="kw">if</span> head: head.prev = node' },
  { id: 5,  html: '  head = node' },
  { id: 6,  html: '<span class="kw">function</span> <span class="fn">push_back</span>(val):' },
  { id: 7,  html: '  node = <span class="kw">new</span> Node(val)' },
  { id: 8,  html: '  node.prev = tail; node.next = <span class="num">null</span>' },
  { id: 9,  html: '  <span class="kw">if</span> tail: tail.next = node; tail = node' },
  { id: 10, html: '<span class="kw">function</span> <span class="fn">insert_after</span>(node, val):' },
  { id: 11, html: '  n = <span class="kw">new</span> Node(val)' },
  { id: 12, html: '  n.next = node.next; n.prev = node' },
  { id: 13, html: '  <span class="kw">if</span> node.next: node.next.prev = n' },
  { id: 14, html: '  node.next = n' },
  { id: 15, html: '<span class="kw">function</span> <span class="fn">delete</span>(node):' },
  { id: 16, html: '  <span class="kw">if</span> node.prev: node.prev.next = node.next' },
  { id: 17, html: '  <span class="kw">if</span> node.next: node.next.prev = node.prev' },
]);

function buildSteps() {
  const steps = [];
  let list = [];

  function addStep(list, highlights, desc, op, pseudo) {
    steps.push({ list: [...list], highlights: highlights || {}, desc, op: op || '—', pseudo: pseudo || [] });
  }

  addStep([], {}, 'Список пуст. Нажмите <b>Запустить</b>.', '—', []);

  // push_back(5)
  addStep([], {}, '<b>push_back(5)</b> — создаём узел', 'push_back(5)', [6, 7]);
  list = [5];
  addStep(list, { 0: 'amber' }, '<b>push_back(5)</b> — 5 добавлен', 'push_back(5)', [8, 9]);

  // push_back(3)
  addStep(list, {}, '<b>push_back(3)</b> — добавляем в хвост', 'push_back(3)', [6, 7]);
  list = [5, 3];
  addStep(list, { 1: 'amber' }, '<b>push_back(3)</b> — 3 добавлен в хвост', 'push_back(3)', [8, 9]);

  // push_front(8)
  addStep(list, {}, '<b>push_front(8)</b> — создаём узел', 'push_front(8)', [1, 2]);
  list = [8, 5, 3];
  addStep(list, { 0: 'amber' }, '<b>push_front(8)</b> — 8 стал новой головой', 'push_front(8)', [3, 4, 5]);

  // insert_after(5, 7) — 5 is at index 1
  addStep(list, { 1: 'amber' }, '<b>insert_after(5, 7)</b> — нашли узел 5, создаём 7', 'insert_after(5,7)', [10, 11, 12]);
  list = [8, 5, 7, 3];
  addStep(list, { 2: 'amber' }, '<b>insert_after(5, 7)</b> — 7 вставлен после 5', 'insert_after(5,7)', [13, 14]);

  // delete(5) — 5 is at index 1
  addStep(list, { 1: 'red' }, '<b>delete(5)</b> — перекидываем ссылки', 'delete(5)', [15, 16, 17]);
  list = [8, 7, 3];
  addStep(list, {}, '<b>delete(5)</b> — узел 5 удалён', 'delete(5)', [16, 17]);

  // pop_front
  addStep(list, { 0: 'red' }, '<b>pop_front()</b> — удаляем голову 8', 'pop_front()', [15, 16]);
  list = [7, 3];
  addStep(list, {}, '<b>pop_front()</b> — 8 удалён, новая голова: 7', 'pop_front()', [17]);

  return steps;
}

const NODE_W = 70, NODE_H = 44, GAP = 20;
const STEP_X = NODE_W + GAP;
const START_X = 40, Y = 150;
const COLOR_MAP = { amber: '#c8973e', green: '#5a9a72', red: '#d46a6a', blue: '#6a9fd4' };

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  const n = step.list.length;
  document.getElementById('s-len').textContent = n;
  if (n === 0) {
    document.getElementById('s-ht').textContent = '—';
  } else {
    document.getElementById('s-ht').textContent = step.list[0] + ' → ' + step.list[n - 1];
  }
  document.getElementById('s-op').textContent = step.op || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const defs = svg.append('defs');

  // Forward arrow marker
  defs.append('marker')
    .attr('id', 'arrF11')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#6a9fd4');

  // Backward arrow marker
  defs.append('marker')
    .attr('id', 'arrB11')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 1).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M8,-4L0,0L8,4').attr('fill', '#d46a6a');

  step.list.forEach((val, i) => {
    const x = START_X + i * STEP_X;
    const hl = step.highlights[i];
    const fill = hl ? COLOR_MAP[hl] : '#2a2a2a';
    const stroke = hl ? (hl === 'amber' ? '#a07030' : hl === 'red' ? '#a03030' : '#4a80aa') : '#444';
    const textFill = (hl === 'amber') ? '#111' : '#efefef';

    svg.append('rect')
      .attr('x', x).attr('y', Y - NODE_H / 2)
      .attr('width', NODE_W).attr('height', NODE_H)
      .attr('rx', 4)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.5);

    svg.append('text')
      .attr('x', x + NODE_W / 2).attr('y', Y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', textFill)
      .attr('font-size', 15).attr('font-weight', 700)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(val);

    // Forward arrow (top, → )
    if (i < n - 1) {
      const x1 = x + NODE_W;
      const x2 = x + STEP_X;
      svg.append('line')
        .attr('x1', x1).attr('y1', Y - 8)
        .attr('x2', x2).attr('y2', Y - 8)
        .attr('stroke', '#6a9fd4').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrF11)');

      // Backward arrow (bottom, ←)
      svg.append('line')
        .attr('x1', x2).attr('y1', Y + 8)
        .attr('x2', x1).attr('y2', Y + 8)
        .attr('stroke', '#d46a6a').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrB11)');
    }

    // HEAD label above first
    if (i === 0) {
      svg.append('text')
        .attr('x', x + NODE_W / 2).attr('y', Y - NODE_H / 2 - 16)
        .attr('text-anchor', 'middle').attr('fill', '#c8973e')
        .attr('font-size', 11).attr('font-weight', 600)
        .text('HEAD');
    }

    // TAIL label below last
    if (i === n - 1) {
      svg.append('text')
        .attr('x', x + NODE_W / 2).attr('y', Y + NODE_H / 2 + 14)
        .attr('text-anchor', 'middle').attr('fill', '#5a9a72')
        .attr('font-size', 11).attr('font-weight', 600)
        .text('TAIL');
    }
  });

  if (n === 0) {
    svg.append('text')
      .attr('x', 350).attr('y', Y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', '#585858').attr('font-size', 14)
      .text('[ пусто ]');
  }
}

const steps = buildSteps();
VizAnim.init(steps, applyStep);
VizAnim.bindUI(() => {
  VizAnim.init(buildSteps(), applyStep);
  VizAnim.play();
});
applyStep(steps[0]);
