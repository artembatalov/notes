document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  const INIT_ARR = [9, 7, 8, 5, 6, 4, 3, 1, 2];
  const N = INIT_ARR.length;

  const C_DEFAULT = '#2a2a2a';
  const C_AMBER   = '#c8973e';
  const C_GREEN   = '#5a9a72';
  const C_BLUE    = '#6a9fd4';
  const C_RED     = '#d46a6a';
  const C_GRAY    = '#1a1a1a';

  function nodePos(i, total) {
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const x = 30 + (posInLevel + 0.5) * 640 / Math.pow(2, depth);
    const y = 90 + depth * 75;
    return { x, y };
  }

  const BOX_W = 44, BOX_H = 30, BOX_GAP = 4;
  const ARR_Y = 18;
  const ARR_START_X = (700 - N * (BOX_W + BOX_GAP) + BOX_GAP) / 2;

  function renderState(arr, nodeColors, heapSize) {
    svg.selectAll('*').remove();

    // Edges
    for (let i = 1; i < N; i++) {
      const child = nodePos(i);
      const parent = nodePos(Math.floor((i - 1) / 2));
      svg.append('line')
        .attr('x1', parent.x).attr('y1', parent.y)
        .attr('x2', child.x).attr('y2', child.y)
        .attr('stroke', i < heapSize ? '#333' : '#1a1a1a').attr('stroke-width', 1.5);
    }

    // Tree nodes
    for (let i = 0; i < N; i++) {
      const pos = nodePos(i);
      const inHeap = i < heapSize;
      const color = nodeColors[i] !== undefined ? nodeColors[i] : (inHeap ? C_DEFAULT : C_GRAY);
      const strokeCol = color === C_AMBER ? '#a07030' : color === C_GREEN ? '#3d7352' : color === C_BLUE ? '#4a7aaa' : color === C_RED ? '#aa4040' : '#444';
      svg.append('circle')
        .attr('cx', pos.x).attr('cy', pos.y).attr('r', 20)
        .attr('fill', color).attr('stroke', strokeCol).attr('stroke-width', 1.5)
        .attr('opacity', inHeap ? 1 : 0.3);
      svg.append('text')
        .attr('x', pos.x).attr('y', pos.y)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', inHeap ? '#efefef' : '#444').attr('font-size', 13).attr('font-weight', 700)
        .text(arr[i]);
    }

    // Array boxes
    for (let i = 0; i < N; i++) {
      const x = ARR_START_X + i * (BOX_W + BOX_GAP);
      const inHeap = i < heapSize;
      const color = nodeColors[i] !== undefined ? nodeColors[i] : (inHeap ? C_DEFAULT : C_GRAY);
      svg.append('rect')
        .attr('x', x).attr('y', ARR_Y).attr('width', BOX_W).attr('height', BOX_H)
        .attr('rx', 4).attr('fill', color).attr('stroke', '#444').attr('opacity', inHeap ? 1 : 0.3);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', ARR_Y + BOX_H / 2)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', inHeap ? '#efefef' : '#444').attr('font-size', 12).attr('font-weight', 600)
        .text(arr[i]);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', ARR_Y + BOX_H + 10)
        .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
        .text(i);
    }
  }

  VizCode.init([
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">extractMax</span>(A, n):' },
    { id: 1,  html: '  max = A[0]' },
    { id: 2,  html: '  A[0] = A[n-1]; n--' },
    { id: 3,  html: '  <span class="fn">siftDown</span>(A, 0, n)' },
    { id: 4,  html: '  <span class="kw">return</span> max' },
    { id: 5,  html: '' },
    { id: 6,  html: '<span class="kw">function</span> <span class="fn">deleteAt</span>(A, i, n):' },
    { id: 7,  html: '  A[i] = A[n-1]; n--' },
    { id: 8,  html: '  <span class="fn">siftUp</span>(A, i)    <span class="cm">// если стало больше родителя</span>' },
    { id: 9,  html: '  <span class="fn">siftDown</span>(A, i, n) <span class="cm">// если меньше детей</span>' },
    { id: 10, html: '' },
    { id: 11, html: '<span class="kw">function</span> <span class="fn">siftDown</span>(A, i, n):' },
    { id: 12, html: '  largest = i; l=2i+1; r=2i+2' },
    { id: 13, html: '  <span class="kw">if</span> l<n <span class="kw">and</span> A[l]>A[largest]: largest=l' },
    { id: 14, html: '  <span class="kw">if</span> r<n <span class="kw">and</span> A[r]>A[largest]: largest=r' },
    { id: 15, html: '  <span class="kw">if</span> largest≠i: swap; <span class="fn">siftDown</span>(largest)' },
  ]);

  function buildSteps() {
    const arr = [...INIT_ARR];
    const steps = [];
    let heapSize = N;

    function push(nodeColors, hs, desc, line, delLabel) {
      steps.push({
        arr: [...arr], nodeColors: { ...nodeColors },
        heapSize: hs, desc, line: Array.isArray(line) ? line : [line],
        del: delLabel, size: hs,
      });
    }

    function siftDown(i, hs, label) {
      let cur = i;
      while (true) {
        let largest = cur;
        const l = 2 * cur + 1, r = 2 * cur + 2;
        const colors = {};
        colors[cur] = C_AMBER;
        if (l < hs) colors[l] = C_BLUE;
        if (r < hs) colors[r] = C_BLUE;
        push(colors, hs,
          `siftDown(${cur}): дети l=${l < hs ? arr[l] : '—'} r=${r < hs ? arr[r] : '—'}`,
          [11, 12, 13, 14], label);
        if (l < hs && arr[l] > arr[largest]) largest = l;
        if (r < hs && arr[r] > arr[largest]) largest = r;
        if (largest !== cur) {
          [arr[cur], arr[largest]] = [arr[largest], arr[cur]];
          const sc = {}; sc[cur] = C_GREEN; sc[largest] = C_GREEN;
          push(sc, hs, `Swap A[${cur}]↔A[${largest}]`, [15], label);
          cur = largest;
        } else {
          break;
        }
      }
    }

    function siftUp(i, hs, label) {
      let cur = i;
      while (cur > 0) {
        const parent = Math.floor((cur - 1) / 2);
        const colors = {};
        colors[cur] = C_AMBER;
        colors[parent] = C_BLUE;
        push(colors, hs,
          `siftUp(${cur})=${arr[cur]} vs parent A[${parent}]=${arr[parent]}`,
          [8], label);
        if (arr[cur] > arr[parent]) {
          [arr[cur], arr[parent]] = [arr[parent], arr[cur]];
          const sc = {}; sc[cur] = C_GREEN; sc[parent] = C_GREEN;
          push(sc, hs, `Swap A[${cur}]↔A[${parent}]`, [8], label);
          cur = parent;
        } else {
          break;
        }
      }
    }

    // Op 1: extractMax
    push({ 0: C_RED }, heapSize, `extractMax(): удаляем максимум <b>${arr[0]}</b>`, [0, 1], 'extractMax()');
    const maxVal = arr[0];
    push({ 0: C_AMBER, [heapSize - 1]: C_GREEN }, heapSize,
      `Swap A[0]=${arr[0]} ↔ A[${heapSize - 1}]=${arr[heapSize - 1]}`, [2], 'extractMax()');
    [arr[0], arr[heapSize - 1]] = [arr[heapSize - 1], arr[0]];
    heapSize--;
    push({}, heapSize, `Уменьшаем heap size до ${heapSize}. Восстанавливаем порядок...`, [2], 'extractMax()');
    siftDown(0, heapSize, 'extractMax()');
    push({}, heapSize, `<span class="ok">extractMax вернул ${maxVal}. Куча восстановлена.</span>`, [3, 4], 'extractMax()');

    // Op 2: delete(index=3)
    const delIdx = 3;
    push({ [delIdx]: C_RED }, heapSize,
      `deleteAt(3): удаляем элемент на индексе 3, значение <b>${arr[delIdx]}</b>`, [6], `deleteAt(3)`);
    const oldVal = arr[delIdx];
    arr[delIdx] = arr[heapSize - 1];
    heapSize--;
    push({}, heapSize,
      `Заменяем A[3]=${oldVal} на последний элемент ${arr[delIdx]}. Heap size=${heapSize}`, [7], `deleteAt(3)`);
    // siftUp then siftDown
    siftUp(delIdx, heapSize, 'deleteAt(3)');
    siftDown(delIdx, heapSize, 'deleteAt(3)');
    push({}, heapSize, '<span class="ok">Куча восстановлена после удаления.</span>', [], 'Готово');

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderState(step.arr, step.nodeColors || {}, step.heapSize);
    document.getElementById('s-del').textContent = step.del || '—';
    document.getElementById('s-size').textContent = step.size !== undefined ? step.size : '—';
    document.getElementById('s-arr').textContent = '[' + step.arr.slice(0, step.heapSize).join(', ') + ']';
  }

  function run() {
    const steps = buildSteps();
    const init = {
      arr: [...INIT_ARR], nodeColors: {}, heapSize: N,
      desc: 'Готово к запуску.', line: [], del: '—', size: N,
    };
    VizAnim.init([init, ...steps], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
