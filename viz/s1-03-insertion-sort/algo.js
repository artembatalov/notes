document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  // Arrow marker definition
  const defs = svg.append('defs');
  defs.append('marker')
    .attr('id', 'arr-amber').attr('markerWidth', 8).attr('markerHeight', 8)
    .attr('refX', 6).attr('refY', 3).attr('orient', 'auto')
    .append('path').attr('d', 'M0,0 L0,6 L8,3 Z').attr('fill', '#c8973e');

  const DEFAULT_ARR = [5, 3, 8, 1, 9, 2, 7, 4];

  function getArr() {
    const raw = document.getElementById('arr-input')?.value || '';
    const parsed = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= 99);
    return parsed.length >= 2 ? parsed : [...DEFAULT_ARR];
  }

  function setInputVal(arr) {
    const el = document.getElementById('arr-input');
    if (el) el.value = arr.join(', ');
  }

  setInputVal(DEFAULT_ARR);

  const colors = {
    default:  { fill: '#1e1e1e', text: '#666' },
    key:      { fill: '#c8973e', text: '#111' },
    compare:  { fill: '#4a7fa8', text: '#fff' },
    sorted:   { fill: '#2d5e3e', text: '#7fc999' },
    pivot:    { fill: '#8b3a3a', text: '#f5a0a0' },
    less:     { fill: '#2a5080', text: '#9dc8f0' },
    greater:  { fill: '#4a3a70', text: '#b09ee0' },
    placed:   { fill: '#2d6e4e', text: '#7fffc4' },
    active:   { fill: '#c8973e', text: '#111' },
    shift:    { fill: '#5a4a90', text: '#c0b0ff' },
    done:     { fill: '#3a6a52', text: '#efefef' },
  };

  function renderArray(svg, arr, highlights, swapPair, y) {
    y = y !== undefined ? y : 160;
    const n = arr.length;
    const BOX_W = 58, BOX_H = 50, GAP = 10;
    const totalW = n * (BOX_W + GAP) - GAP;
    const startX = (700 - totalW) / 2;

    // Clear swap arcs
    svg.selectAll('.swap-arc').remove();

    // Draw swap arc
    if (swapPair && swapPair.length === 2) {
      const [si, sj] = swapPair;
      const xi = startX + si * (BOX_W + GAP) + BOX_W / 2;
      const xj = startX + sj * (BOX_W + GAP) + BOX_W / 2;
      const mx = (xi + xj) / 2;
      const cy = y - 38;
      svg.append('path').attr('class', 'swap-arc')
        .attr('d', `M ${xi} ${y - 2} Q ${mx} ${cy} ${xj} ${y - 2}`)
        .attr('fill', 'none').attr('stroke', '#c8973e')
        .attr('stroke-width', 1.5).attr('marker-end', 'url(#arr-amber)');
    }

    // Boxes
    const grp = svg.selectAll('g.elem').data(arr.map((v, i) => ({ v, i })));
    const enter = grp.enter().append('g').attr('class', 'elem');
    enter.append('rect');
    enter.append('text').attr('class', 'val');
    enter.append('text').attr('class', 'idx');
    const all = grp.merge(enter);

    all.each(function(d) {
      const x = startX + d.i * (BOX_W + GAP);
      const col = colors[highlights[d.i]] || colors.default;
      const g = d3.select(this);
      g.select('rect')
        .attr('x', x).attr('y', y)
        .attr('width', BOX_W).attr('height', BOX_H)
        .attr('rx', 8).attr('fill', col.fill)
        .attr('stroke', '#333').attr('stroke-width', 1);
      g.select('.val')
        .attr('x', x + BOX_W / 2).attr('y', y + BOX_H / 2 + 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', 18).attr('font-weight', 700)
        .attr('font-family', "'JetBrains Mono',monospace")
        .attr('fill', col.text).text(d.v);
      g.select('.idx')
        .attr('x', x + BOX_W / 2).attr('y', y + BOX_H + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', '#444').text(d.i);
    });
    grp.exit().remove();
  }

  VizCode.init([
    { id: 0, html: '<span class="kw">function</span> <span class="fn">insertionSort</span>(A, n):' },
    { id: 1, html: '  <span class="kw">for</span> i = <span class="num">1</span> to n-1:' },
    { id: 2, html: '    key = A[i]' },
    { id: 3, html: '    j = i - <span class="num">1</span>' },
    { id: 4, html: '    <span class="kw">while</span> j >= <span class="num">0</span> <span class="kw">and</span> A[j] > key:' },
    { id: 5, html: '      A[j+<span class="num">1</span>] = A[j]' },
    { id: 6, html: '      j = j - <span class="num">1</span>' },
    { id: 7, html: '    A[j+<span class="num">1</span>] = key' },
  ]);

  function buildSteps(arr) {
    arr = [...arr];
    const steps = [];
    let cmp = 0, shift = 0;

    const mkHL = (highlights, sorted_count) => {
      const h = {};
      for (let k = 0; k < sorted_count; k++) h[k] = 'sorted';
      Object.assign(h, highlights);
      return h;
    };

    for (let i = 1; i < arr.length; i++) {
      const key = arr[i];

      steps.push({
        arr: [...arr],
        highlights: mkHL({ [i]: 'key' }, i),
        line: [1, 2, 3],
        desc: `i=${i}: берём ключ arr[${i}]=<b>${key}</b>`,
        cmp, shift, key: `arr[${i}]=${key}`,
        swapPair: null,
      });

      let j = i - 1;
      while (j >= 0 && arr[j] > key) {
        cmp++;
        steps.push({
          arr: [...arr],
          highlights: mkHL({ [i]: 'key', [j]: 'compare' }, i),
          line: [4],
          desc: `arr[${j}]=<b>${arr[j]}</b> > key=<b>${key}</b> → сдвигаем вправо`,
          cmp, shift, key: `arr[${i}]=${key}`,
          swapPair: null,
        });

        arr[j + 1] = arr[j];
        shift++;
        steps.push({
          arr: [...arr],
          highlights: mkHL({ [j + 1]: 'shift', [j]: 'compare' }, i),
          line: [5, 6],
          desc: `Сдвиг: arr[${j + 1}] = arr[${j}] = <b>${arr[j]}</b>`,
          cmp, shift, key: `arr[${i}]=${key}`,
          swapPair: null,
        });
        j--;
      }

      arr[j + 1] = key;
      const insertHL = {};
      for (let k = 0; k <= i; k++) insertHL[k] = 'sorted';
      insertHL[j + 1] = 'key';
      steps.push({
        arr: [...arr],
        highlights: insertHL,
        line: [7],
        desc: `Вставляем key=<b>${key}</b> на позицию <b>${j + 1}</b>`,
        cmp, shift, key: `pos=${j + 1}`,
        swapPair: null,
      });
    }

    const allSorted = {};
    arr.forEach((_, k) => { allSorted[k] = 'sorted'; });
    steps.push({
      arr: [...arr],
      highlights: allSorted,
      line: [],
      desc: '<span class="ok">Массив отсортирован!</span>',
      cmp, shift, key: '—',
      swapPair: null,
    });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderArray(svg, step.arr, step.highlights || {}, step.swapPair || null);
    document.getElementById('s-cmp').textContent = step.cmp !== undefined ? step.cmp : 0;
    document.getElementById('s-shift').textContent = step.shift !== undefined ? step.shift : 0;
    document.getElementById('s-key').textContent = step.key || '—';
  }

  function run() {
    const arr = getArr();
    const steps = buildSteps(arr);
    VizAnim.init([
      { line: [], desc: 'Готово. Можно изменить массив выше и нажать <b>Запустить</b>.', arr: [...arr], highlights: {}, swapPair: null, cmp: 0, shift: 0, key: '—' },
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
