document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  const INIT_ARR = [4, 10, 3, 5, 1, 8, 7, 2, 9, 6];
  const N = INIT_ARR.length;

  // Colors
  const C_DEFAULT = '#2a2a2a';
  const C_AMBER   = '#c8973e';
  const C_GREEN   = '#5a9a72';
  const C_SORTED  = '#3a6a52';
  const C_BLUE    = '#6a9fd4';
  const C_RED     = '#d46a6a';

  // Tree geometry helpers
  function nodePos(i) {
    if (i < 0) return null;
    const depth = Math.floor(Math.log2(i + 1));
    const posInLevel = i - (Math.pow(2, depth) - 1);
    const x = 30 + (posInLevel + 0.5) * 640 / Math.pow(2, depth);
    const y = 90 + depth * 75;
    return { x, y };
  }

  // Array box geometry
  const BOX_W = 44, BOX_H = 30, BOX_GAP = 4;
  const ARR_Y = 18;
  const ARR_START_X = (700 - N * (BOX_W + BOX_GAP) + BOX_GAP) / 2;

  function renderState(arr, nodeColors, heapSize) {
    svg.selectAll('*').remove();

    // Draw tree edges first
    for (let i = 1; i < heapSize; i++) {
      const child = nodePos(i);
      const parent = nodePos(Math.floor((i - 1) / 2));
      if (!child || !parent) continue;
      svg.append('line')
        .attr('x1', parent.x).attr('y1', parent.y)
        .attr('x2', child.x).attr('y2', child.y)
        .attr('stroke', '#333').attr('stroke-width', 1.5);
    }

    // Tree nodes
    for (let i = 0; i < N; i++) {
      const pos = nodePos(i);
      if (!pos) continue;
      const color = nodeColors[i] !== undefined ? nodeColors[i] : (i < heapSize ? C_DEFAULT : C_SORTED);
      const strokeCol = color === C_AMBER ? '#a07030' : color === C_GREEN ? '#3d7352' : color === C_BLUE ? '#4a7aaa' : '#444';
      svg.append('circle')
        .attr('cx', pos.x).attr('cy', pos.y).attr('r', 20)
        .attr('fill', color).attr('stroke', strokeCol).attr('stroke-width', 1.5);
      svg.append('text')
        .attr('x', pos.x).attr('y', pos.y)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', '#efefef').attr('font-size', 13).attr('font-weight', 700)
        .text(arr[i]);
    }

    // Array boxes
    for (let i = 0; i < N; i++) {
      const x = ARR_START_X + i * (BOX_W + BOX_GAP);
      const color = nodeColors[i] !== undefined ? nodeColors[i] : (i < heapSize ? C_DEFAULT : C_SORTED);
      svg.append('rect')
        .attr('x', x).attr('y', ARR_Y).attr('width', BOX_W).attr('height', BOX_H)
        .attr('rx', 4).attr('fill', color).attr('stroke', '#444');
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', ARR_Y + BOX_H / 2)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', '#efefef').attr('font-size', 12).attr('font-weight', 600)
        .text(arr[i]);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', ARR_Y + BOX_H + 10)
        .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 9)
        .text(i);
    }
  }

  VizCode.init([
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">heapSort</span>(A, n):' },
    { id: 1,  html: '  <span class="cm">// Фаза 1: Построение max-heap (Floyd)</span>' },
    { id: 2,  html: '  <span class="kw">for</span> i = ⌊n/2⌋-1 downto 0:' },
    { id: 3,  html: '    <span class="fn">siftDown</span>(A, i, n)' },
    { id: 4,  html: '  <span class="cm">// Фаза 2: Извлечение максимумов</span>' },
    { id: 5,  html: '  <span class="kw">for</span> i = n-1 downto 1:' },
    { id: 6,  html: '    swap(A[0], A[i])' },
    { id: 7,  html: '    <span class="fn">siftDown</span>(A, 0, i)' },
    { id: 8,  html: '' },
    { id: 9,  html: '<span class="kw">function</span> <span class="fn">siftDown</span>(A, i, size):' },
    { id: 10, html: '  largest = i; l = 2i+1; r = 2i+2' },
    { id: 11, html: '  <span class="kw">if</span> l < size <span class="kw">and</span> A[l] > A[largest]: largest = l' },
    { id: 12, html: '  <span class="kw">if</span> r < size <span class="kw">and</span> A[r] > A[largest]: largest = r' },
    { id: 13, html: '  <span class="kw">if</span> largest != i:' },
    { id: 14, html: '    swap(A[i], A[largest]); <span class="fn">siftDown</span>(A, largest, size)' },
  ]);

  function buildSteps() {
    const arr = [...INIT_ARR];
    const steps = [];

    function push(nodeColors, heapSize, desc, line, phase) {
      steps.push({
        arr: [...arr],
        nodeColors: { ...nodeColors },
        heapSize,
        desc,
        line: Array.isArray(line) ? line : [line],
        phase,
        size: heapSize,
      });
    }

    function siftDown(arr, i, heapSize, phase, steps, nodeColors) {
      let cur = i;
      while (true) {
        let largest = cur;
        const l = 2 * cur + 1, r = 2 * cur + 2;
        const colors = { ...nodeColors };
        colors[cur] = C_AMBER;
        if (l < heapSize) colors[l] = C_BLUE;
        if (r < heapSize) colors[r] = C_BLUE;
        push(colors, heapSize,
          `siftDown(${cur}): сравниваем с детьми l=${l < heapSize ? arr[l] : '—'} r=${r < heapSize ? arr[r] : '—'}`,
          [10, 11, 12], phase);

        if (l < heapSize && arr[l] > arr[largest]) largest = l;
        if (r < heapSize && arr[r] > arr[largest]) largest = r;

        if (largest !== cur) {
          [arr[cur], arr[largest]] = [arr[largest], arr[cur]];
          const swapColors = { ...nodeColors };
          swapColors[cur] = C_GREEN;
          swapColors[largest] = C_GREEN;
          push(swapColors, heapSize,
            `Меняем A[${cur}]=${arr[cur]} и A[${largest}]=${arr[largest]}`,
            [13, 14], phase);
          cur = largest;
        } else {
          break;
        }
      }
    }

    // Phase 1: Build heap
    push({}, N, 'Начало: строим max-heap методом Флойда', [1, 2], 'Построение кучи');

    for (let i = Math.floor(N / 2) - 1; i >= 0; i--) {
      const colors = {};
      colors[i] = C_AMBER;
      push(colors, N, `Фаза 1: siftDown(${i}), значение=${arr[i]}`, [2, 3], 'Построение кучи');
      siftDown(arr, i, N, 'Построение кучи', steps, {});
    }

    push({}, N, '<span class="ok">Куча построена — max-heap!</span>', [4], 'Построение кучи');

    // Phase 2: Extract max
    let heapSize = N;
    for (let i = N - 1; i >= 1; i--) {
      const colors = {};
      colors[0] = C_AMBER;
      colors[i] = C_GREEN;
      push(colors, heapSize, `Фаза 2: swap(A[0]=${arr[0]}, A[${i}]=${arr[i]})`, [5, 6], 'Извлечение max');
      [arr[0], arr[i]] = [arr[i], arr[0]];
      heapSize--;

      const afterSwap = {};
      afterSwap[i] = C_SORTED;
      push(afterSwap, heapSize,
        `A[${i}]=${arr[i]} встал на место. Heap size=${heapSize}`, [6], 'Извлечение max');

      if (heapSize > 1) {
        siftDown(arr, 0, heapSize, 'Извлечение max', steps, {});
      }
    }

    const finalColors = {};
    for (let k = 0; k < N; k++) finalColors[k] = C_SORTED;
    push(finalColors, 0, '<span class="ok">Массив отсортирован!</span>', [], 'Готово');

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderState(step.arr, step.nodeColors || {}, step.heapSize);
    document.getElementById('s-phase').textContent = step.phase || '—';
    document.getElementById('s-size').textContent = step.size !== undefined ? step.size : '—';
    document.getElementById('s-arr').textContent = '[' + step.arr.join(', ') + ']';
  }

  function run() {
    const steps = buildSteps();
    const init = {
      arr: [...INIT_ARR], nodeColors: {}, heapSize: N,
      desc: 'Готово к запуску.', line: [], phase: '—', size: N,
    };
    VizAnim.init([init, ...steps], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
