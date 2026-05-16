/* 09 — Очередь (кольцевой буфер) */

buildStdControls();

VizCode.init([
  { id: 1, html: '<span class="kw">function</span> <span class="fn">enqueue</span>(x):' },
  { id: 2, html: '  q[back] = x' },
  { id: 3, html: '  back = (back + <span class="num">1</span>) % N' },
  { id: 4, html: '<span class="kw">function</span> <span class="fn">dequeue</span>():' },
  { id: 5, html: '  x = q[front]' },
  { id: 6, html: '  front = (front + <span class="num">1</span>) % N' },
  { id: 7, html: '  <span class="kw">return</span> x' },
  { id: 8, html: '<span class="kw">function</span> <span class="fn">is_empty</span>():' },
  { id: 9, html: '  <span class="kw">return</span> front == back' },
]);

function buildSteps() {
  const steps = [];
  const q = [];

  function push(s) { steps.push(Object.assign({}, s, { queue: [...s.queue] })); }

  function enqueue(val) {
    const base = { queue: [...q], newBack: false, removingFront: false };
    push({ ...base, desc: `<b>enqueue(${val})</b> — добавляем ${val} в хвост`, op: `enqueue(${val})`, pseudo: [1] });
    q.push(val);
    push({ queue: [...q], newBack: true, removingFront: false,
      desc: `<b>enqueue(${val})</b> — ${val} добавлен в хвост очереди`, op: `enqueue(${val})`, pseudo: [2, 3] });
  }

  function dequeue() {
    const val = q[0];
    push({ queue: [...q], newBack: false, removingFront: true,
      desc: `<b>dequeue()</b> = <b>${val}</b> — снимаем голову`, op: `dequeue() = ${val}`, pseudo: [4, 5] });
    q.shift();
    push({ queue: [...q], newBack: false, removingFront: false,
      desc: `<b>dequeue()</b> = <b>${val}</b> — ${val} удалён из головы`, op: `dequeue() = ${val}`, pseudo: [6, 7] });
  }

  // initial state
  steps.push({ queue: [], newBack: false, removingFront: false, desc: 'Очередь пуста. Нажмите <b>Запустить</b>.', op: '—', pseudo: [] });

  enqueue(3);
  enqueue(7);
  enqueue(1);
  dequeue();
  enqueue(5);
  dequeue();
  dequeue();

  return steps;
}

const steps = buildSteps();

const BOX_W = 80, BOX_H = 44, BOX_GAP = 4;
const START_X = 80, Y = 128;

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  document.getElementById('s-size').textContent = step.queue.length;
  document.getElementById('s-front').textContent = step.queue.length ? step.queue[0] : '—';
  document.getElementById('s-back').textContent = step.queue.length ? step.queue[step.queue.length - 1] : '—';
  document.getElementById('s-op').textContent = step.op || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arr')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 7).attr('refY', 0)
    .attr('markerWidth', 5).attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#888');

  const q = step.queue;
  const n = q.length;

  q.forEach((val, i) => {
    let fill = '#2a2a2a';
    let stroke = '#444';
    let textFill = '#efefef';

    if (i === 0 && step.removingFront) { fill = '#d46a6a'; stroke = '#a03030'; }
    else if (i === n - 1 && step.newBack) { fill = '#c8973e'; stroke = '#a07030'; textFill = '#111'; }

    const x = START_X + i * (BOX_W + BOX_GAP);

    svg.append('rect')
      .attr('x', x).attr('y', Y - BOX_H / 2)
      .attr('width', BOX_W).attr('height', BOX_H)
      .attr('rx', 5)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('stroke-width', 1.5);

    svg.append('text')
      .attr('x', x + BOX_W / 2).attr('y', Y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', textFill)
      .attr('font-size', 16).attr('font-weight', 700)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(val);
  });

  // FRONT label
  if (n > 0) {
    const fx = START_X + BOX_W / 2;
    svg.append('line')
      .attr('x1', fx).attr('y1', Y + BOX_H / 2 + 22)
      .attr('x2', fx).attr('y2', Y + BOX_H / 2 + 4)
      .attr('stroke', '#6a9fd4').attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arr)');
    svg.append('text')
      .attr('x', fx).attr('y', Y + BOX_H / 2 + 36)
      .attr('text-anchor', 'middle').attr('fill', '#6a9fd4')
      .attr('font-size', 11).attr('font-weight', 600)
      .text('FRONT');

    const bx = START_X + (n - 1) * (BOX_W + BOX_GAP) + BOX_W / 2;
    svg.append('line')
      .attr('x1', bx).attr('y1', Y - BOX_H / 2 - 22)
      .attr('x2', bx).attr('y2', Y - BOX_H / 2 - 4)
      .attr('stroke', '#5a9a72').attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arr)');
    svg.append('text')
      .attr('x', bx).attr('y', Y - BOX_H / 2 - 28)
      .attr('text-anchor', 'middle').attr('fill', '#5a9a72')
      .attr('font-size', 11).attr('font-weight', 600)
      .text('BACK');
  }

  // Empty label
  if (n === 0) {
    svg.append('text')
      .attr('x', 350).attr('y', Y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', '#585858').attr('font-size', 14)
      .text('[ пусто ]');
  }
}

VizAnim.init(steps, applyStep);
VizAnim.bindUI(() => {
  VizAnim.init(buildSteps(), applyStep);
  VizAnim.play();
});
applyStep(steps[0]);
