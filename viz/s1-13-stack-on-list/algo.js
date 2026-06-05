/* 13 — Стек на связном списке */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="kw">function</span> <span class="fn">push</span>(x):' },
  { id: 2,  html: '  node = <span class="kw">new</span> Node(x)' },
  { id: 3,  html: '  node.next = top' },
  { id: 4,  html: '  top = node' },
  { id: 5,  html: '<span class="kw">function</span> <span class="fn">pop</span>():' },
  { id: 6,  html: '  val = top.val' },
  { id: 7,  html: '  top = top.next' },
  { id: 8,  html: '  <span class="kw">return</span> val' },
  { id: 9,  html: '<span class="kw">function</span> <span class="fn">peek</span>():' },
  { id: 10, html: '  <span class="kw">return</span> top.val' },
]);

function buildSteps() {
  const steps = [];
  // stack stored as array, top at index 0 (head of list)
  let stack = [];

  function addStep(stack, highlights, desc, op, pseudo) {
    steps.push({ stack: [...stack], highlights: { ...highlights }, desc, op: op || '—', pseudo: pseudo || [] });
  }

  addStep([], {}, 'Стек пуст. Нажмите <b>Запустить</b>.', '—', []);

  function push(val) {
    addStep(stack, {}, `<b>push(${val})</b> — создаём узел`, `push(${val})`, [1, 2, 3]);
    stack = [val, ...stack];
    addStep(stack, { 0: 'amber' }, `<b>push(${val})</b> — ${val} стал новым TOP`, `push(${val})`, [4]);
  }

  function pop() {
    const val = stack[0];
    addStep(stack, { 0: 'red' }, `<b>pop()</b> = <b>${val}</b> — снимаем TOP`, `pop() = ${val}`, [5, 6]);
    stack = stack.slice(1);
    addStep(stack, {}, `<b>pop()</b> = <b>${val}</b> — ${val} удалён, top сдвинулся`, `pop() = ${val}`, [7, 8]);
  }

  push(3);
  push(7);
  push(1);
  pop();
  push(5);
  pop();

  return steps;
}

const NODE_W = 50, NODE_H = 40, ARROW_W = 30, STEP_X = NODE_W + ARROW_W;
const START_X = 50, Y = 160;
const COLOR_MAP = { amber: '#c8973e', green: '#5a9a72', red: '#d46a6a', blue: '#6a9fd4' };

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  const n = step.stack.length;
  document.getElementById('s-size').textContent = n;
  document.getElementById('s-top').textContent = n ? step.stack[0] : '—';
  document.getElementById('s-op').textContent = step.op || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arr13')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#888');

  step.stack.forEach((val, i) => {
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
        .attr('marker-end', 'url(#arr13)');
    }

    // TOP/HEAD label
    if (i === 0) {
      svg.append('text')
        .attr('x', x + NODE_W / 2).attr('y', Y - NODE_H / 2 - 16)
        .attr('text-anchor', 'middle').attr('fill', '#c8973e')
        .attr('font-size', 11).attr('font-weight', 600)
        .text('TOP');
      svg.append('line')
        .attr('x1', x + NODE_W / 2).attr('y1', Y - NODE_H / 2 - 12)
        .attr('x2', x + NODE_W / 2).attr('y2', Y - NODE_H / 2 - 2)
        .attr('stroke', '#c8973e').attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arr13)');
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
