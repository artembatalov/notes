document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  const C_DEFAULT = '#2a2a2a';
  const C_AMBER   = '#c8973e';
  const C_GREEN   = '#5a9a72';
  const C_BLUE    = '#6a9fd4';
  const C_RED     = '#d46a6a';
  const C_GRAY    = '#1a1a1a';

  function nodePos(i) {
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const x = 30 + (posInLevel + 0.5) * 640 / Math.pow(2, depth);
    const y = 90 + depth * 75;
    return { x, y };
  }

  const BOX_W = 50, BOX_H = 30, BOX_GAP = 4;
  const ARR_Y = 14;

  function renderState(arr, nodeColors, heapSize) {
    svg.selectAll('*').remove();
    const maxN = arr.length;
    const arrStartX = (700 - maxN * (BOX_W + BOX_GAP) + BOX_GAP) / 2;

    // Edges
    for (let i = 1; i < heapSize; i++) {
      const child = nodePos(i);
      const parent = nodePos(Math.floor((i - 1) / 2));
      svg.append('line')
        .attr('x1', parent.x).attr('y1', parent.y)
        .attr('x2', child.x).attr('y2', child.y)
        .attr('stroke', '#333').attr('stroke-width', 1.5);
    }

    // Tree nodes
    for (let i = 0; i < heapSize; i++) {
      const pos = nodePos(i);
      const color = nodeColors[i] !== undefined ? nodeColors[i] : C_DEFAULT;
      const strokeCol = color === C_AMBER ? '#a07030' : color === C_GREEN ? '#3d7352' : color === C_BLUE ? '#4a7aaa' : color === C_RED ? '#aa4040' : '#444';
      svg.append('circle')
        .attr('cx', pos.x).attr('cy', pos.y).attr('r', 22)
        .attr('fill', color).attr('stroke', strokeCol).attr('stroke-width', 1.5);
      svg.append('text')
        .attr('x', pos.x).attr('y', pos.y - 4)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', '#efefef').attr('font-size', 12).attr('font-weight', 700)
        .text(arr[i]);
      svg.append('text')
        .attr('x', pos.x).attr('y', pos.y + 10)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', '#aaa').attr('font-size', 9)
        .text('p=' + arr[i]);
    }

    // Array boxes
    for (let i = 0; i < maxN; i++) {
      const x = arrStartX + i * (BOX_W + BOX_GAP);
      const inHeap = i < heapSize;
      const color = nodeColors[i] !== undefined ? nodeColors[i] : (inHeap ? C_DEFAULT : C_GRAY);
      svg.append('rect')
        .attr('x', x).attr('y', ARR_Y).attr('width', BOX_W).attr('height', BOX_H)
        .attr('rx', 4).attr('fill', color).attr('stroke', '#444').attr('opacity', inHeap ? 1 : 0.3);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', ARR_Y + BOX_H / 2)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', inHeap ? '#efefef' : '#444').attr('font-size', 11).attr('font-weight', 600)
        .text(arr[i]);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', ARR_Y + BOX_H + 10)
        .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
        .text(i);
    }
  }

  VizCode.init([
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">insert</span>(pq, priority):' },
    { id: 1,  html: '  pq[size++] = priority' },
    { id: 2,  html: '  <span class="fn">siftUp</span>(size-1)' },
    { id: 3,  html: '' },
    { id: 4,  html: '<span class="kw">function</span> <span class="fn">extractMax</span>(pq):' },
    { id: 5,  html: '  max = pq[0]; pq[0] = pq[--size]' },
    { id: 6,  html: '  <span class="fn">siftDown</span>(0)' },
    { id: 7,  html: '  <span class="kw">return</span> max' },
    { id: 8,  html: '' },
    { id: 9,  html: '<span class="kw">function</span> <span class="fn">increaseKey</span>(i, newP):' },
    { id: 10, html: '  pq[i] = newP; <span class="fn">siftUp</span>(i)' },
    { id: 11, html: '' },
    { id: 12, html: '<span class="kw">function</span> <span class="fn">decreaseKey</span>(i, newP):' },
    { id: 13, html: '  pq[i] = newP; <span class="fn">siftDown</span>(i)' },
  ]);

  function buildSteps() {
    // Start with priorities [7,3,5,1,6,2,4] already as a heap (need to build)
    const arr = [7, 6, 5, 1, 3, 2, 4]; // valid max-heap
    const steps = [];
    let heapSize = arr.length;

    function push(nodeColors, hs, desc, line, op) {
      steps.push({
        arr: [...arr], nodeColors: { ...nodeColors },
        heapSize: hs, desc, line: Array.isArray(line) ? line : [line],
        op, size: hs,
      });
    }

    function siftUp(i, hs, op) {
      let cur = i;
      while (cur > 0) {
        const parent = Math.floor((cur - 1) / 2);
        const colors = {}; colors[cur] = C_AMBER; colors[parent] = C_BLUE;
        push(colors, hs, `siftUp: A[${cur}]=${arr[cur]} vs parent A[${parent}]=${arr[parent]}`, [2], op);
        if (arr[cur] > arr[parent]) {
          [arr[cur], arr[parent]] = [arr[parent], arr[cur]];
          const sc = {}; sc[cur] = C_GREEN; sc[parent] = C_GREEN;
          push(sc, hs, `Swap A[${cur}]↔A[${parent}]`, [2], op);
          cur = parent;
        } else { break; }
      }
    }

    function siftDown(i, hs, op) {
      let cur = i;
      while (true) {
        let largest = cur;
        const l = 2 * cur + 1, r = 2 * cur + 2;
        const colors = {};
        colors[cur] = C_AMBER;
        if (l < hs) colors[l] = C_BLUE;
        if (r < hs) colors[r] = C_BLUE;
        push(colors, hs, `siftDown(${cur}): дети l=${l < hs ? arr[l] : '—'} r=${r < hs ? arr[r] : '—'}`, [6], op);
        if (l < hs && arr[l] > arr[largest]) largest = l;
        if (r < hs && arr[r] > arr[largest]) largest = r;
        if (largest !== cur) {
          [arr[cur], arr[largest]] = [arr[largest], arr[cur]];
          const sc = {}; sc[cur] = C_GREEN; sc[largest] = C_GREEN;
          push(sc, hs, `Swap A[${cur}]↔A[${largest}]`, [6], op);
          cur = largest;
        } else { break; }
      }
    }

    // Initial heap already valid
    push({}, heapSize, 'Max-heap с приоритетами [7,6,5,1,3,2,4]. Начинаем операции.', [], 'Начало');

    // 1. insert(8)
    arr[heapSize] = 8;
    heapSize++;
    push({ [heapSize - 1]: C_AMBER }, heapSize,
      `insert(8): добавляем в конец. heapSize=${heapSize}`, [0, 1], 'insert(8)');
    siftUp(heapSize - 1, heapSize, 'insert(8)');
    push({}, heapSize, '<span class="ok">insert(8) завершён. Новый максимум = 8.</span>', [2], 'insert(8)');

    // 2. extractMax()
    const maxVal = arr[0];
    push({ 0: C_RED }, heapSize, `extractMax(): максимум = <b>${maxVal}</b>`, [4, 5], 'extractMax()');
    push({ 0: C_AMBER, [heapSize - 1]: C_GREEN }, heapSize,
      `Swap A[0]=${arr[0]} ↔ A[${heapSize - 1}]=${arr[heapSize - 1]}`, [5], 'extractMax()');
    [arr[0], arr[heapSize - 1]] = [arr[heapSize - 1], arr[0]];
    heapSize--;
    push({}, heapSize, `Уменьшаем size. Восстанавливаем...`, [5], 'extractMax()');
    siftDown(0, heapSize, 'extractMax()');
    push({}, heapSize, `<span class="ok">extractMax вернул ${maxVal}.</span>`, [7], 'extractMax()');

    // 3. increaseKey(index=4, newPriority=9)
    const oldValInc = arr[4];
    push({ 4: C_AMBER }, heapSize, `increaseKey(4, 9): A[4]=${oldValInc} → 9`, [9, 10], 'increaseKey(4,9)');
    arr[4] = 9;
    push({ 4: C_AMBER }, heapSize, `Установили A[4]=9. Выполняем siftUp...`, [10], 'increaseKey(4,9)');
    siftUp(4, heapSize, 'increaseKey(4,9)');
    push({}, heapSize, '<span class="ok">increaseKey(4,9) завершён.</span>', [10], 'increaseKey(4,9)');

    // 4. decreaseKey(root, newPriority=2)
    const oldValDec = arr[0];
    push({ 0: C_AMBER }, heapSize, `decreaseKey(0, 2): A[0]=${oldValDec} → 2`, [12, 13], 'decreaseKey(0,2)');
    arr[0] = 2;
    push({ 0: C_AMBER }, heapSize, `Установили A[0]=2. Выполняем siftDown...`, [13], 'decreaseKey(0,2)');
    siftDown(0, heapSize, 'decreaseKey(0,2)');
    push({}, heapSize, '<span class="ok">decreaseKey(0,2) завершён.</span>', [13], 'decreaseKey(0,2)');

    // 5. extractMax again
    const maxVal2 = arr[0];
    push({ 0: C_RED }, heapSize, `extractMax(): максимум = <b>${maxVal2}</b>`, [4, 5], 'extractMax()');
    [arr[0], arr[heapSize - 1]] = [arr[heapSize - 1], arr[0]];
    heapSize--;
    siftDown(0, heapSize, 'extractMax()');
    push({}, heapSize, `<span class="ok">extractMax вернул ${maxVal2}.</span>`, [7], 'extractMax()');

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderState(step.arr, step.nodeColors || {}, step.heapSize);
    document.getElementById('s-op').textContent = step.op || '—';
    document.getElementById('s-size').textContent = step.size !== undefined ? step.size : '—';
    document.getElementById('s-arr').textContent = '[' + step.arr.slice(0, step.heapSize).join(', ') + ']';
  }

  function run() {
    const initArr = [7, 6, 5, 1, 3, 2, 4, 0, 0]; // extra slots for insert
    const steps = buildSteps();
    const init = {
      arr: [7, 6, 5, 1, 3, 2, 4, 0, 0], nodeColors: {}, heapSize: 7,
      desc: 'Готово к запуску.', line: [], op: '—', size: 7,
    };
    VizAnim.init([init, ...steps], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
