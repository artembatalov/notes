/* 15 — Пирамида (куча) — Max-Heap */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="kw">function</span> <span class="fn">insert</span>(x):' },
  { id: 2,  html: '  heap[size++] = x' },
  { id: 3,  html: '  <span class="fn">sift_up</span>(size - <span class="num">1</span>)' },
  { id: 4,  html: '<span class="kw">function</span> <span class="fn">sift_up</span>(i):' },
  { id: 5,  html: '  <span class="kw">while</span> i > <span class="num">0</span>:' },
  { id: 6,  html: '    p = (i - <span class="num">1</span>) / <span class="num">2</span>  <span class="cm">// родитель</span>' },
  { id: 7,  html: '    <span class="kw">if</span> heap[p] < heap[i]: swap(p, i); i = p' },
  { id: 8,  html: '    <span class="kw">else</span>: <span class="kw">break</span>' },
  { id: 9,  html: '<span class="kw">function</span> <span class="fn">extract_max</span>():' },
  { id: 10, html: '  max = heap[<span class="num">0</span>]' },
  { id: 11, html: '  heap[<span class="num">0</span>] = heap[--size]' },
  { id: 12, html: '  <span class="fn">sift_down</span>(<span class="num">0</span>)' },
  { id: 13, html: '<span class="kw">function</span> <span class="fn">sift_down</span>(i):' },
  { id: 14, html: '  <span class="kw">while</span> <span class="num">2</span>*i+<span class="num">1</span> < size:' },
  { id: 15, html: '    l = <span class="num">2</span>*i+<span class="num">1</span>; r = <span class="num">2</span>*i+<span class="num">2</span>' },
  { id: 16, html: '    largest = i' },
  { id: 17, html: '    <span class="kw">if</span> heap[l] > heap[largest]: largest = l' },
  { id: 18, html: '    <span class="kw">if</span> r < size <span class="kw">and</span> heap[r] > heap[largest]: largest = r' },
  { id: 19, html: '    <span class="kw">if</span> largest == i: <span class="kw">break</span>' },
  { id: 20, html: '    swap(i, largest); i = largest' },
]);

function buildSteps() {
  const steps = [];
  const heap = [];

  function addStep(heap, size, highlights, desc, op, pseudo) {
    steps.push({
      heap: [...heap],
      size: size,
      highlights: { ...highlights },
      desc,
      op: op || '—',
      pseudo: pseudo || []
    });
  }

  addStep([], 0, {}, 'Куча пуста. Нажмите <b>Запустить</b>.', '—', []);

  function siftUp(arr, i, size) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      addStep([...arr], size, { [i]: 'amber', [p]: 'blue' },
        `sift_up: сравниваем heap[${i}]=${arr[i]} и heap[${p}]=${arr[p]}`, 'sift_up', [4, 5, 6, 7]);
      if (arr[p] < arr[i]) {
        [arr[i], arr[p]] = [arr[p], arr[i]];
        addStep([...arr], size, { [i]: 'green', [p]: 'green' },
          `sift_up: swap heap[${i}] ↔ heap[${p}]`, 'sift_up', [7]);
        i = p;
      } else {
        addStep([...arr], size, { [i]: 'amber' },
          `sift_up: heap[${p}] ≥ heap[${i}], стоп`, 'sift_up', [8]);
        break;
      }
    }
  }

  function siftDown(arr, i, size) {
    while (2 * i + 1 < size) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let largest = i;
      const hlComp = { [i]: 'amber' };
      if (l < size) hlComp[l] = 'blue';
      if (r < size) hlComp[r] = 'blue';
      addStep([...arr], size, hlComp,
        `sift_down: узел ${i}=${arr[i]}, дети: l=${arr[l] !== undefined ? arr[l] : '—'}, r=${r < size ? arr[r] : '—'}`,
        'sift_down', [13, 14, 15, 16]);

      if (arr[l] > arr[largest]) largest = l;
      if (r < size && arr[r] > arr[largest]) largest = r;

      if (largest === i) {
        addStep([...arr], size, { [i]: 'green' },
          `sift_down: heap[${i}]=${arr[i]} — уже наибольший, стоп`, 'sift_down', [19]);
        break;
      }
      addStep([...arr], size, { [i]: 'amber', [largest]: 'amber' },
        `sift_down: swap heap[${i}]=${arr[i]} ↔ heap[${largest}]=${arr[largest]}`, 'sift_down', [17, 18, 20]);
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      addStep([...arr], size, { [i]: 'green', [largest]: 'green' },
        `sift_down: после swap`, 'sift_down', [20]);
      i = largest;
    }
  }

  // Part A: Insert elements
  const insertVals = [4, 8, 5, 9, 3, 7, 1];
  insertVals.forEach(val => {
    addStep([...heap], heap.length, {},
      `<b>insert(${val})</b> — добавляем ${val} в конец`, `insert(${val})`, [1, 2]);
    heap.push(val);
    addStep([...heap], heap.length, { [heap.length - 1]: 'amber' },
      `<b>insert(${val})</b> — ${val} добавлен, запускаем sift_up`, `insert(${val})`, [3]);
    siftUp(heap, heap.length - 1, heap.length);
    addStep([...heap], heap.length, {},
      `<b>insert(${val})</b> — sift_up завершён`, `insert(${val})`, []);
  });

  // Part B: Extract max once
  addStep([...heap], heap.length, { 0: 'red' },
    `<b>extract_max()</b> = <b>${heap[0]}</b> — берём heap[0]`, 'extract_max()', [9, 10]);
  const max = heap[0];
  heap[0] = heap[heap.length - 1];
  heap.pop();
  addStep([...heap], heap.length, { 0: 'amber' },
    `<b>extract_max()</b>: переносим последний в корень, запускаем sift_down`, 'extract_max()', [11, 12]);
  siftDown(heap, 0, heap.length);
  addStep([...heap], heap.length, {},
    `<b>extract_max()</b> = <b>${max}</b> завершён, куча перестроена`, 'extract_max()', []);

  return steps;
}

// Tree layout helpers
const TREE_LEFT = 30, TREE_WIDTH = 640;
const ARRAY_Y = 30, ARRAY_H = 30, ARRAY_W = 36;
const TREE_TOP = 90, LEVEL_H = 78;
const NODE_R = 20;

const COLOR_MAP = { amber: '#c8973e', green: '#5a9a72', red: '#d46a6a', blue: '#6a9fd4' };

function nodeXY(i) {
  const depth = Math.floor(Math.log2(i + 1));
  const pos = i - (Math.pow(2, depth) - 1);
  const nodesAtLevel = Math.pow(2, depth);
  const x = TREE_LEFT + (pos + 0.5) * (TREE_WIDTH / nodesAtLevel);
  const y = TREE_TOP + depth * LEVEL_H;
  return { x, y };
}

function renderHeap(svg, heap, size, highlights) {
  // Array row
  for (let i = 0; i < size; i++) {
    const x = 30 + i * (ARRAY_W + 2);
    const hl = highlights[i];
    const fill = hl ? COLOR_MAP[hl] : '#1a1a1a';
    const stroke = hl ? (hl === 'amber' ? '#a07030' : hl === 'green' ? '#3d7352' : hl === 'red' ? '#a03030' : '#4a80aa') : '#333';
    const textFill = hl === 'amber' ? '#111' : '#efefef';

    svg.append('rect')
      .attr('x', x).attr('y', ARRAY_Y)
      .attr('width', ARRAY_W).attr('height', ARRAY_H)
      .attr('rx', 3)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1);

    svg.append('text')
      .attr('x', x + ARRAY_W / 2).attr('y', ARRAY_Y + ARRAY_H / 2)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', textFill).attr('font-size', 11).attr('font-weight', 700)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(heap[i]);

    svg.append('text')
      .attr('x', x + ARRAY_W / 2).attr('y', ARRAY_Y + ARRAY_H + 10)
      .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
      .text(i);
  }

  // Tree edges
  for (let i = 1; i < size; i++) {
    const p = Math.floor((i - 1) / 2);
    const { x: cx, y: cy } = nodeXY(i);
    const { x: px, y: py } = nodeXY(p);
    svg.append('line')
      .attr('x1', px).attr('y1', py)
      .attr('x2', cx).attr('y2', cy)
      .attr('stroke', '#333').attr('stroke-width', 1.5);
  }

  // Tree nodes
  for (let i = 0; i < size; i++) {
    const { x, y } = nodeXY(i);
    const hl = highlights[i];
    const fill = hl ? COLOR_MAP[hl] : '#2a2a2a';
    const stroke = hl ? (hl === 'amber' ? '#a07030' : hl === 'green' ? '#3d7352' : hl === 'red' ? '#a03030' : '#4a80aa') : '#444';
    const textFill = hl === 'amber' ? '#111' : '#efefef';

    svg.append('circle')
      .attr('cx', x).attr('cy', y).attr('r', NODE_R)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', 1.5);

    svg.append('text')
      .attr('x', x).attr('y', y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('fill', textFill).attr('font-size', 13).attr('font-weight', 700)
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(heap[i]);

    svg.append('text')
      .attr('x', x).attr('y', y + NODE_R + 10)
      .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
      .text(i);
  }
}

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  document.getElementById('s-size').textContent = step.size;
  document.getElementById('s-op').textContent = step.op || '—';
  document.getElementById('s-arr').textContent = step.heap.slice(0, step.size).join(', ') || '—';

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  renderHeap(svg, step.heap, step.size, step.highlights || {});
}

const steps = buildSteps();
VizAnim.init(steps, applyStep);
VizAnim.bindUI(() => {
  VizAnim.init(buildSteps(), applyStep);
  VizAnim.play();
});
applyStep(steps[0]);
