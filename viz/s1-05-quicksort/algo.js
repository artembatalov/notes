document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  const DEFAULT_ARR = [5, 3, 8, 1, 9, 2, 7, 4];
  const barW = 52, gap = 10, startX = 55, baseY = 300, maxH = 220;

  const colorMap = {
    pivot:   '#d46a6a',
    less:    '#6a9fd4',
    greater: '#7a6ab0',
    active:  '#c8973e',
    placed:  '#5a9a72',
    sorted:  '#3a6a52',
  };

  function renderBars(arrState, highlights) {
    const maxVal = Math.max(...arrState);
    const grp = svg.selectAll('g.bar').data(arrState, (d, i) => i);
    const enter = grp.enter().append('g').attr('class', 'bar');
    enter.append('rect');
    enter.append('text').attr('class', 'val-label');
    enter.append('text').attr('class', 'idx-label');

    const all = grp.merge(enter);
    all.each(function(d, i) {
      const x = startX + i * (barW + gap);
      const h = d / maxVal * maxH;
      const col = colorMap[highlights[i]] || '#2a2a2a';
      d3.select(this).select('rect')
        .attr('x', x).attr('y', baseY - h)
        .attr('width', barW).attr('height', h)
        .attr('fill', col).attr('stroke', '#444').attr('rx', 3);
      d3.select(this).select('.val-label')
        .attr('x', x + barW / 2).attr('y', baseY - h - 6)
        .attr('text-anchor', 'middle').attr('font-size', 12)
        .attr('fill', col === '#2a2a2a' ? '#888' : '#111').text(d);
      d3.select(this).select('.idx-label')
        .attr('x', x + barW / 2).attr('y', baseY + 16)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#585858').text(i);
    });
    grp.exit().remove();
  }

  VizCode.init([
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">quickSort</span>(A, lo, hi):' },
    { id: 1,  html: '  <span class="kw">if</span> lo >= hi: <span class="kw">return</span>' },
    { id: 2,  html: '  p = <span class="fn">partition</span>(A, lo, hi)' },
    { id: 3,  html: '  <span class="fn">quickSort</span>(A, lo, p-1)' },
    { id: 4,  html: '  <span class="fn">quickSort</span>(A, p+1, hi)' },
    { id: 5,  html: '' },
    { id: 6,  html: '<span class="kw">function</span> <span class="fn">partition</span>(A, lo, hi): <span class="cm">// Lomuto</span>' },
    { id: 7,  html: '  pivot = A[hi]' },
    { id: 8,  html: '  i = lo - <span class="num">1</span>' },
    { id: 9,  html: '  <span class="kw">for</span> j = lo to hi-1:' },
    { id: 10, html: '    <span class="kw">if</span> A[j] <= pivot:' },
    { id: 11, html: '      i++; swap(A[i], A[j])' },
    { id: 12, html: '  swap(A[i+1], A[hi])' },
    { id: 13, html: '  <span class="kw">return</span> i+<span class="num">1</span>' },
  ]);

  function buildSteps() {
    const arr = [...DEFAULT_ARR];
    const n = arr.length;
    const steps = [];
    const sortedSet = new Set();

    function mkHL(extra) {
      const h = {};
      sortedSet.forEach(i => { h[i] = 'sorted'; });
      Object.assign(h, extra);
      return h;
    }

    const callStack = [[0, n - 1]];

    while (callStack.length > 0) {
      const [lo, hi] = callStack.pop();

      if (lo >= hi) {
        if (lo === hi) sortedSet.add(lo);
        continue;
      }

      const pivot = arr[hi];

      // Show pivot selection
      const hlPivot = {};
      for (let k = lo; k < hi; k++) hlPivot[k] = 'greater';
      hlPivot[hi] = 'pivot';
      steps.push({
        arr: [...arr], highlights: mkHL(hlPivot),
        line: [6, 7, 8],
        desc: `Диапазон [${lo}..${hi}], опорный=<b>${pivot}</b> (arr[${hi}])`,
        range: `[${lo}..${hi}]`, pivot: pivot, ij: `i=${lo - 1} / j=${lo}`,
      });

      let i = lo - 1;
      for (let j = lo; j < hi; j++) {
        const hlJ = {};
        for (let k = lo; k <= i; k++) hlJ[k] = 'less';
        hlJ[hi] = 'pivot';
        hlJ[j] = 'active';
        steps.push({
          arr: [...arr], highlights: mkHL(hlJ),
          line: [9, 10],
          desc: `j=${j}: arr[${j}]=<b>${arr[j]}</b> vs pivot=<b>${pivot}</b>`,
          range: `[${lo}..${hi}]`, pivot, ij: `i=${i} / j=${j}`,
        });

        if (arr[j] <= pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          const hlSwap = {};
          for (let k = lo; k <= i; k++) hlSwap[k] = 'less';
          hlSwap[hi] = 'pivot';
          steps.push({
            arr: [...arr], highlights: mkHL(hlSwap),
            line: [11],
            desc: `arr[${j}]≤pivot → swap i=${i} и j=${j}, arr=[${arr.slice(lo, hi + 1).join(',')}]`,
            range: `[${lo}..${hi}]`, pivot, ij: `i=${i} / j=${j}`,
          });
        }
      }

      // Place pivot
      [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
      const pivotPos = i + 1;
      sortedSet.add(pivotPos);

      const hlPlaced = {};
      for (let k = lo; k < pivotPos; k++) hlPlaced[k] = 'less';
      for (let k = pivotPos + 1; k <= hi; k++) hlPlaced[k] = 'greater';
      hlPlaced[pivotPos] = 'placed';
      steps.push({
        arr: [...arr], highlights: mkHL(hlPlaced),
        line: [12, 13],
        desc: `Опорный <b>${pivot}</b> встал на позицию <b>${pivotPos}</b>`,
        range: `[${lo}..${hi}]`, pivot, ij: `pivotPos=${pivotPos}`,
      });

      // Push sub-ranges (right first so left is processed first)
      callStack.push([pivotPos + 1, hi]);
      callStack.push([lo, pivotPos - 1]);
    }

    const allSorted = {};
    arr.forEach((_, k) => { allSorted[k] = 'sorted'; });
    steps.push({
      arr: [...arr], highlights: allSorted,
      line: [],
      desc: '<span class="ok">Массив отсортирован!</span>',
      range: '—', pivot: '—', ij: '—',
    });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderBars(step.arr, step.highlights || {});
    document.getElementById('s-range').textContent = step.range || '—';
    document.getElementById('s-pivot').textContent = step.pivot !== undefined ? step.pivot : '—';
    document.getElementById('s-ij').textContent = step.ij || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(
      [{ line: [], desc: 'Готово к запуску.', arr: [...DEFAULT_ARR], highlights: {}, range: '—', pivot: '—', ij: '—' }, ...steps],
      applyStep
    );
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
