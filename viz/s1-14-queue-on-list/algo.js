/* 14 — Очередь на связном списке */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="kw">function</span> <span class="fn">enqueue</span>(x):' },
  { id: 2,  html: '  node = <span class="kw">new</span> Node(x)' },
  { id: 3,  html: '  <span class="kw">if</span> empty: front = back = node' },
  { id: 4,  html: '  <span class="kw">else</span>: back.next = node; back = node' },
  { id: 5,  html: '<span class="kw">function</span> <span class="fn">dequeue</span>():' },
  { id: 6,  html: '  val = front.val' },
  { id: 7,  html: '  front = front.next' },
  { id: 8,  html: '  <span class="kw">if</span> front == <span class="num">null</span>: back = <span class="num">null</span>' },
  { id: 9,  html: '  <span class="kw">return</span> val' },
]);

function buildSteps() {
  const steps = [];
  // queue stored as array, front=index 0, back=last
  let q = [];

  function addStep(q, highlights, desc, op, pseudo) {
    steps.push({ q: [...q], highlights: { ...highlights }, desc, op: op || '—', pseudo: pseudo || [] });
  }

  addStep([], {}, 'Очередь пуста. Нажмите <b>Запустить</b>.', '—', []);

  function enqueue(val) {
    addStep(q, {}, `<b>enqueue(${val})</b> — создаём узел`, `enqueue(${val})`, [1, 2]);
    if (q.length === 0) {
      q = [val];
      addStep(q, { 0: 'amber' }, `<b>enqueue(${val})</b> — очередь пуста, front=back=${val}`, `enqueue(${val})`, [3]);
    } else {
      q = [...q, val];
      addStep(q, { [q.length - 1]: 'amber' }, `<b>enqueue(${val})</b> — ${val} добавлен к back`, `enqueue(${val})`, [4]);
    }
  }

  function dequeue() {
    const val = q[0];
    addStep(q, { 0: 'red' }, `<b>dequeue()</b> = <b>${val}</b> — снимаем front`, `dequeue() = ${val}`, [5, 6]);
    q = q.slice(1);
    addStep(q, {}, `<b>dequeue()</b> = <b>${val}</b> — front сдвинулся`, `dequeue() = ${val}`, [7, 8, 9]);
  }

  enqueue(3);
  enqueue(7);
  enqueue(1);
  dequeue();
  enqueue(5);
  dequeue();

  return steps;
}

const NODE_W = 50, NODE_H = 40, ARROW_W = 30, STEP_X = NODE_W + ARROW_W;
const START_X = 50, Y = 140;
const COLOR_MAP = { amber: '#c8973e', green: '#5a9a72', red: '#d46a6a', blue: '#6a9fd4' };

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  const n = step.q.length;
  document.getElementById('s-size').textContent = n;
  if (n === 0) {
    document.getElementById('s-fb').textContent = '—';
  } else {
    document.getElementById('s-fb').textContent = step.q[0] + ' / ' + step.q[n - 1];
  }
  document.getElementById('s-op').textContent = step.op || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arr14')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#888');

  step.q.forEach((val, i) => {
    const x = START_X + i * STEP_X;
    const hl = step.highlights[i];
    const fill = hl ? COLOR_MAP[hl] : '#2a2a2a';
    const stroke = hl ? (hl === 'amber' ? '#a07030' : hl === 'red' ? '#a03030' : '#444') : '#444';
    const textFill = hl === 'amber' ? '#111' : '#efefef';

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

    // pointer box
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

    if (i < n - 1) {
      svg.append('line')
        .attr('x1', x + NODE_W + ARROW_W - 4).attr('y1', Y)
        .attr('x2', START_X + (i + 1) * STEP_X).attr('y2', Y)
        .attr('stroke', '#555').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arr14)');
    }

    // FRONT label
    if (i === 0) {
      svg.append('text')
        .attr('x', x + NODE_W / 2).attr('y', Y + NODE_H / 2 + 18)
        .attr('text-anchor', 'middle').attr('fill', '#6a9fd4')
        .attr('font-size', 11).attr('font-weight', 600)
        .text('FRONT');
    }

    // BACK label
    if (i === n - 1) {
      svg.append('text')
        .attr('x', x + NODE_W / 2).attr('y', Y - NODE_H / 2 - 10)
        .attr('text-anchor', 'middle').attr('fill', '#5a9a72')
        .attr('font-size', 11).attr('font-weight', 600)
        .text('BACK');
    }
  });

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
