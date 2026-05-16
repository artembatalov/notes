/* 16 — Построение пирамиды за O(n) — Алгоритм Флойда */

buildStdControls();

VizCode.init([
  { id: 1,  html: '<span class="cm">// Алгоритм Флойда — O(n), не O(n log n)</span>' },
  { id: 2,  html: '<span class="cm">// Нижние уровни имеют больше узлов, но меньше работы</span>' },
  { id: 3,  html: '<span class="kw">function</span> <span class="fn">build_heap</span>(arr, n):' },
  { id: 4,  html: '  <span class="kw">for</span> i = floor(n/<span class="num">2</span>)-<span class="num">1</span> <span class="kw">downto</span> <span class="num">0</span>:' },
  { id: 5,  html: '    <span class="fn">sift_down</span>(arr, i, n)' },
  { id: 6,  html: '<span class="kw">function</span> <span class="fn">sift_down</span>(arr, i, n):' },
  { id: 7,  html: '  <span class="kw">while</span> <span class="num">2</span>*i+<span class="num">1</span> < n:' },
  { id: 8,  html: '    l = <span class="num">2</span>*i+<span class="num">1</span>; r = <span class="num">2</span>*i+<span class="num">2</span>; largest = i' },
  { id: 9,  html: '    <span class="kw">if</span> arr[l] > arr[largest]: largest = l' },
  { id: 10, html: '    <span class="kw">if</span> r < n <span class="kw">and</span> arr[r] > arr[largest]: largest = r' },
  { id: 11, html: '    <span class="kw">if</span> largest == i: <span class="kw">break</span>  <span class="cm">// уже куча</span>' },
  { id: 12, html: '    swap(arr[i], arr[largest]); i = largest' },
]);

const INITIAL = [4, 10, 3, 5, 1, 8, 7, 2, 9, 6];
const N = INITIAL.length;

function buildSteps() {
  const steps = [];
  const arr = [...INITIAL];
  let cmpCount = 0;

  function addStep(arr, highlights, desc, iVal, pseudo) {
    steps.push({
      arr: [...arr],
      highlights: { ...highlights },
      desc,
      iVal: iVal === undefined ? '—' : iVal,
      cmp: cmpCount,
      pseudo: pseudo || []
    });
  }

  addStep(arr, {}, `Исходный массив: [${arr.join(', ')}]. Нажмите <b>Запустить</b>.`, '—', []);

  addStep(arr, {}, `<b>build_heap</b>: начинаем с i = floor(${N}/2)-1 = ${Math.floor(N / 2) - 1} вниз до 0`, '—', [3, 4]);

  for (let start = Math.floor(N / 2) - 1; start >= 0; start--) {
    addStep(arr, { [start]: 'amber' },
      `i = <b>${start}</b>: sift_down для узла ${start} (значение ${arr[start]})`,
      start, [4, 5, 6]);

    let i = start;
    while (2 * i + 1 < N) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let largest = i;
      const hlComp = { [i]: 'amber' };
      if (l < N) hlComp[l] = 'blue';
      if (r < N) hlComp[r] = 'blue';

      cmpCount++;
      addStep(arr, hlComp,
        `sift_down(${start}): узел ${i}=${arr[i]}, l=${arr[l] !== undefined ? arr[l] : '—'}, r=${r < N ? arr[r] : '—'}`,
        start, [7, 8, 9, 10]);

      if (arr[l] > arr[largest]) largest = l;
      if (r < N && arr[r] > arr[largest]) largest = r;

      if (largest === i) {
        addStep(arr, { [i]: 'green' },
          `sift_down(${start}): узел ${i} — наибольший, стоп`,
          start, [11]);
        break;
      }

      addStep(arr, { [i]: 'amber', [largest]: 'amber' },
        `sift_down(${start}): swap arr[${i}]=${arr[i]} ↔ arr[${largest}]=${arr[largest]}`,
        start, [12]);
      [arr[i], arr[largest]] = [arr[largest], arr[i]];
      addStep(arr, { [i]: 'green', [largest]: 'green' },
        `sift_down(${start}): после swap — arr[${i}]=${arr[i]}, arr[${largest}]=${arr[largest]}`,
        start, [12]);
      i = largest;
    }
  }

  addStep(arr, {}, `<b class="ok">Пирамида построена за O(n) — ${cmpCount} сравнений!</b> Массив: [${arr.join(', ')}]`, '—', []);

  return steps;
}

// Tree layout (same as viz 15)
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

function applyStep(step) {
  VizCode.highlight(step.pseudo || []);
  VizState.setDesc(step.desc || '');

  document.getElementById('s-i').textContent = step.iVal;
  document.getElementById('s-cmp').textContent = step.cmp;
  document.getElementById('s-arr').textContent = step.arr.join(', ');

  const svg = d3.select('#viz-svg');
  svg.selectAll('*').remove();

  const arr = step.arr;
  const n = arr.length;
  const highlights = step.highlights || {};

  // Array row
  for (let i = 0; i < n; i++) {
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
      .text(arr[i]);

    svg.append('text')
      .attr('x', x + ARRAY_W / 2).attr('y', ARRAY_Y + ARRAY_H + 10)
      .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
      .text(i);
  }

  // Tree edges
  for (let i = 1; i < n; i++) {
    const p = Math.floor((i - 1) / 2);
    const { x: cx, y: cy } = nodeXY(i);
    const { x: px, y: py } = nodeXY(p);
    svg.append('line')
      .attr('x1', px).attr('y1', py)
      .attr('x2', cx).attr('y2', cy)
      .attr('stroke', '#333').attr('stroke-width', 1.5);
  }

  // Tree nodes
  for (let i = 0; i < n; i++) {
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
      .text(arr[i]);

    svg.append('text')
      .attr('x', x).attr('y', y + NODE_R + 10)
      .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
      .text(i);
  }
}

const steps = buildSteps();
VizAnim.init(steps, applyStep);
VizAnim.bindUI(() => {
  VizAnim.init(buildSteps(), applyStep);
  VizAnim.play();
});
applyStep(steps[0]);
