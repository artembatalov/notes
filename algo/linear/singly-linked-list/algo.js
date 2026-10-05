/* 10 — Односвязный список */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="kw">function</span> <span class="fn">insert_head</span>(val):' },
  { id: 2,  html: '  node = <span class="kw">new</span> Node(val)' },
  { id: 3,  html: '  node.next = head; head = node' },
  { id: 4,  html: '<span class="kw">function</span> <span class="fn">insert_tail</span>(val):' },
  { id: 5,  html: '  node = <span class="kw">new</span> Node(val)' },
  { id: 6,  html: '  cur = head; <span class="kw">while</span> cur.next ≠ <span class="num">null</span>: cur = cur.next' },
  { id: 7,  html: '  cur.next = node' },
  { id: 8,  html: '<span class="kw">function</span> <span class="fn">search</span>(val):' },
  { id: 9,  html: '  cur = head' },
  { id: 10, html: '  <span class="kw">while</span> cur ≠ <span class="num">null</span>:' },
  { id: 11, html: '    <span class="kw">if</span> cur.val == val: <span class="kw">return</span> cur' },
  { id: 12, html: '    cur = cur.next' },
  { id: 13, html: '<span class="kw">function</span> <span class="fn">delete</span>(val):' },
  { id: 14, html: '  <span class="kw">if</span> head.val == val: head = head.next; <span class="kw">return</span>' },
  { id: 15, html: '  cur = head' },
  { id: 16, html: '  <span class="kw">while</span> cur.next ≠ <span class="num">null</span>:' },
  { id: 17, html: '    <span class="kw">if</span> cur.next.val == val: cur.next = cur.next.next; <span class="kw">return</span>' },
  { id: 18, html: '<span class="kw">function</span> <span class="fn">insert_after</span>(node, val):' },
  { id: 19, html: '  newNode = <span class="kw">new</span> Node(val)' },
  { id: 20, html: '  newNode.next = node.next; node.next = newNode' },
]);

function buildSteps() {
  const steps = [];
  let list = [];

  function addStep(list, highlights, desc, op, pseudo) {
    steps.push({ list: [...list], highlights: highlights || {}, desc, op: op || '—', pseudo: pseudo || [] });
  }

  addStep([], {}, 'Список пуст. Нажмите <b>Запустить</b>.', '—', []);

  // insert_head(5)
  addStep([], {}, '<b>insert_head(5)</b> — создаём новый узел', 'insert_head(5)', [1, 2]);
  list = [5];
  addStep(list, { 0: 'amber' }, '<b>insert_head(5)</b> — узел 5 стал головой', 'insert_head(5)', [3]);

  // insert_head(3)
  addStep(list, {}, '<b>insert_head(3)</b> — создаём новый узел', 'insert_head(3)', [1, 2]);
  list = [3, 5];
  addStep(list, { 0: 'amber' }, '<b>insert_head(3)</b> — узел 3 стал новой головой', 'insert_head(3)', [3]);

  // insert_tail(8)
  addStep(list, {}, '<b>insert_tail(8)</b> — идём до конца списка', 'insert_tail(8)', [4, 5, 6]);
  list = [3, 5, 8];
  addStep(list, { 2: 'amber' }, '<b>insert_tail(8)</b> — 8 добавлен в хвост', 'insert_tail(8)', [7]);

  // insert_head(1)
  addStep(list, {}, '<b>insert_head(1)</b> — создаём узел', 'insert_head(1)', [1, 2]);
  list = [1, 3, 5, 8];
  addStep(list, { 0: 'amber' }, '<b>insert_head(1)</b> — 1 стал новой головой', 'insert_head(1)', [3]);

  // search(5): traverse 1→3→5
  addStep(list, {}, '<b>search(5)</b> — начинаем с головы', 'search(5)', [8, 9]);
  addStep(list, { 0: 'blue' }, '<b>search(5)</b> — cur=1, не 5', 'search(5)', [10, 11, 12]);
  addStep(list, { 1: 'blue' }, '<b>search(5)</b> — cur=3, не 5', 'search(5)', [10, 11, 12]);
  addStep(list, { 2: 'green' }, '<b>search(5)</b> — нашли! cur=5', 'search(5) = найден', [10, 11]);

  // delete(3)
  addStep(list, {}, '<b>delete(3)</b> — ищем узел 3', 'delete(3)', [13, 15, 16]);
  addStep(list, { 0: 'blue', 1: 'red' }, '<b>delete(3)</b> — нашли 3, перекидываем ссылку', 'delete(3)', [17]);
  list = [1, 5, 8];
  addStep(list, {}, '<b>delete(3)</b> — узел 3 удалён', 'delete(3)', [17]);

  // insert_after(5, 9) — 5 is now at index 1
  addStep(list, { 1: 'amber' }, '<b>insert_after(5, 9)</b> — нашли узел 5', 'insert_after(5,9)', [18, 19]);
  list = [1, 5, 9, 8];
  addStep(list, { 2: 'amber' }, '<b>insert_after(5, 9)</b> — 9 вставлен после 5', 'insert_after(5,9)', [20]);

  return steps;
}

const NODE_W = 50, NODE_H = 40, ARROW_W = 30, STEP_X = NODE_W + ARROW_W;
const START_X = 30, Y = 130;

const COLOR_MAP = { amber: '#c8973e', green: '#5a9a72', red: '#d46a6a', blue: '#6a9fd4' };

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  const n = step.list.length;
  document.getElementById('s-len').textContent = n;
  document.getElementById('s-head').textContent = n ? step.list[0] : '—';
  document.getElementById('s-op').textContent = step.op || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arr10')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#888');

  step.list.forEach((val, i) => {
    const x = START_X + i * STEP_X;
    const hl = step.highlights[i];
    const fill = hl ? COLOR_MAP[hl] : '#2a2a2a';
    const stroke = hl ? (hl === 'amber' ? '#a07030' : hl === 'green' ? '#3d7352' : hl === 'red' ? '#a03030' : '#4a80aa') : '#444';
    const textFill = (hl === 'amber') ? '#111' : '#efefef';

    // value box
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

    // next pointer box
    svg.append('rect')
      .attr('x', x + NODE_W).attr('y', Y - NODE_H / 2)
      .attr('width', ARROW_W - 4).attr('height', NODE_H)
      .attr('rx', 4)
      .attr('fill', '#1a1a1a').attr('stroke', '#333').attr('stroke-width', 1);

    svg.append('text')
      .attr('x', x + NODE_W + (ARROW_W - 4) / 2).attr('y', Y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', '#585858').attr('font-size', 10)
      .text('→');

    // arrow to next
    if (i < n - 1) {
      const ax1 = x + NODE_W + ARROW_W - 4;
      const ax2 = START_X + (i + 1) * STEP_X;
      svg.append('line')
        .attr('x1', ax1).attr('y1', Y)
        .attr('x2', ax2).attr('y2', Y)
        .attr('stroke', '#555').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arr10)');
    }

    // HEAD label
    if (i === 0) {
      svg.append('text')
        .attr('x', x + NODE_W / 2).attr('y', Y - NODE_H / 2 - 16)
        .attr('text-anchor', 'middle').attr('fill', '#c8973e')
        .attr('font-size', 11).attr('font-weight', 600)
        .text('HEAD');
      svg.append('line')
        .attr('x1', x + NODE_W / 2).attr('y1', Y - NODE_H / 2 - 12)
        .attr('x2', x + NODE_W / 2).attr('y2', Y - NODE_H / 2 - 2)
        .attr('stroke', '#c8973e').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arr10)');
    }
  });

  // NULL
  if (n > 0) {
    const nullX = START_X + n * STEP_X;
    svg.append('text')
      .attr('x', nullX).attr('y', Y)
      .attr('dominant-baseline', 'central')
      .attr('fill', '#585858').attr('font-size', 12)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text('NULL');
  }

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
