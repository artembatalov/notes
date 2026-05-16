document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  const DEFAULT_ARR = [7, 2, 10, 5, 3, 8, 1, 6, 4, 9];
  const K = 3; // 0-indexed: 4th smallest = index 3
  const N = DEFAULT_ARR.length;

  const barW = 44, gap = 8, startX = 45, baseY = 300, maxH = 220;

  const colorMap = {
    pivot:    '#d46a6a',
    le:       '#6a9fd4',
    gt:       '#7a6ab0',
    inrange:  '#c8973e',
    out:      '#1a1a1a',
    found:    '#5ade72',
    default:  '#2a2a2a',
  };

  function renderBars(arr, highlights) {
    const maxVal = Math.max(...arr);
    svg.selectAll('g.bar').remove();

    const grp = svg.selectAll('g.bar').data(arr).enter().append('g').attr('class', 'bar');
    grp.each(function(d, i) {
      const x = startX + i * (barW + gap);
      const h = (d / maxVal) * maxH;
      const col = colorMap[highlights[i]] || colorMap.default;
      const g = d3.select(this);
      g.append('rect')
        .attr('x', x).attr('y', baseY - h)
        .attr('width', barW).attr('height', h)
        .attr('fill', col).attr('stroke', '#444').attr('rx', 3);
      g.append('text')
        .attr('x', x + barW / 2).attr('y', baseY - h - 7)
        .attr('text-anchor', 'middle').attr('font-size', 12)
        .attr('fill', col === colorMap.out ? '#333' : '#111').text(d);
      g.append('text')
        .attr('x', x + barW / 2).attr('y', baseY + 16)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#585858').text(i);
    });
  }

  // Initial SVG label
  svg.append('text')
    .attr('x', 350).attr('y', 330)
    .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 11)
    .attr('class', 'hint-label')
    .text(`Ищем k=${K+1}-й наименьший (k-index=${K})`);

  VizCode.init([
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">quickselect</span>(A, lo, hi, k):' },
    { id: 1,  html: '  <span class="kw">if</span> lo == hi: <span class="kw">return</span> A[lo]' },
    { id: 2,  html: '  p = <span class="fn">partition</span>(A, lo, hi) <span class="cm">// Lomuto</span>' },
    { id: 3,  html: '  <span class="kw">if</span> p == k: <span class="kw">return</span> A[p]  <span class="cm">// нашли!</span>' },
    { id: 4,  html: '  <span class="kw">else if</span> p > k: <span class="kw">return</span> <span class="fn">quickselect</span>(A, lo, p-1, k)' },
    { id: 5,  html: '  <span class="kw">else</span>:           <span class="kw">return</span> <span class="fn">quickselect</span>(A, p+1, hi, k)' },
    { id: 6,  html: '' },
    { id: 7,  html: '<span class="cm">// vs QuickSort: рекурсия только в одну сторону</span>' },
    { id: 8,  html: '<span class="cm">// Средний случай: O(n), худший: O(n²)</span>' },
    { id: 9,  html: '<span class="kw">function</span> <span class="fn">partition</span>(A, lo, hi): <span class="cm">// Lomuto</span>' },
    { id: 10, html: '  pivot = A[hi]; i = lo - 1' },
    { id: 11, html: '  <span class="kw">for</span> j = lo to hi-1:' },
    { id: 12, html: '    <span class="kw">if</span> A[j] <= pivot: i++; swap(A[i], A[j])' },
    { id: 13, html: '  swap(A[i+1], A[hi]); <span class="kw">return</span> i+1' },
  ]);

  function buildSteps() {
    const arr = [...DEFAULT_ARR];
    const steps = [];
    let outSet = new Set(); // indices out of current range

    function mkHL(lo, hi, extra) {
      const h = {};
      for (let k = 0; k < N; k++) {
        if (k < lo || k > hi) h[k] = 'out';
        else h[k] = 'inrange';
      }
      Object.assign(h, extra);
      return h;
    }

    function push(lo, hi, hlMap, pivot, desc, line) {
      steps.push({
        arr: [...arr],
        highlights: hlMap,
        range: `[${lo}..${hi}]`,
        pivot: pivot !== undefined ? pivot : '—',
        desc, line: Array.isArray(line) ? line : [line],
      });
    }

    function quickselect(lo, hi) {
      push(lo, hi, mkHL(lo, hi, {}),
        arr[hi], `quickselect([${lo}..${hi}], k=${K}): pivot=arr[${hi}]=${arr[hi]}`, [0, 2]);

      if (lo === hi) {
        const hl = mkHL(lo, hi, { [lo]: 'found' });
        push(lo, hi, hl, arr[lo], `lo==hi: вернуть A[${lo}]=${arr[lo]}`, [1]);
        return lo;
      }

      const pivot = arr[hi];
      // Lomuto partition with steps
      let i = lo - 1;
      const pivotColor = { [hi]: 'pivot' };
      push(lo, hi, mkHL(lo, hi, pivotColor), pivot, `Partition: pivot=${pivot}, i=${i}`, [9, 10]);

      for (let j = lo; j < hi; j++) {
        const jHL = mkHL(lo, hi, { [hi]: 'pivot', [j]: 'inrange' });
        push(lo, hi, jHL, pivot, `j=${j}: A[${j}]=${arr[j]} <= ${pivot}? ${arr[j] <= pivot ? 'Да' : 'Нет'}`, [11, 12]);
        if (arr[j] <= pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          const swHL = mkHL(lo, hi, { [hi]: 'pivot', [i]: 'le', [j]: 'le' });
          push(lo, hi, swHL, pivot, `swap A[${i}]↔A[${j}]: arr[${i}]=${arr[i]}`, [12]);
        }
      }

      [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
      const pivotPos = i + 1;
      const ppHL = mkHL(lo, hi, { [pivotPos]: 'pivot' });
      push(lo, hi, ppHL, pivot, `pivot на позиции ${pivotPos}. k=${K} `, [13]);

      if (pivotPos === K) {
        const foundHL = mkHL(lo, hi, { [pivotPos]: 'found' });
        push(lo, hi, foundHL, pivot,
          `<span class="ok">НАШЛИ! A[${pivotPos}]=${arr[pivotPos]} — ${K + 1}-й наименьший</span>`, [3]);
        return pivotPos;
      } else if (pivotPos > K) {
        push(lo, hi, mkHL(lo, pivotPos - 1, {}), pivot,
          `pivotPos=${pivotPos} > k=${K}: рекурсия влево [${lo}..${pivotPos - 1}]`, [4]);
        return quickselect(lo, pivotPos - 1);
      } else {
        push(lo, hi, mkHL(pivotPos + 1, hi, {}), pivot,
          `pivotPos=${pivotPos} < k=${K}: рекурсия вправо [${pivotPos + 1}..${hi}]`, [5]);
        return quickselect(pivotPos + 1, hi);
      }
    }

    quickselect(0, N - 1);
    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderBars(step.arr, step.highlights || {});
    document.getElementById('s-k').textContent = `k=${K} (${K + 1}-й наименьший)`;
    document.getElementById('s-range').textContent = step.range || '—';
    document.getElementById('s-pivot').textContent = step.pivot !== undefined ? step.pivot : '—';
  }

  function run() {
    const steps = buildSteps();
    const initHL = {};
    DEFAULT_ARR.forEach((_, i) => { initHL[i] = 'inrange'; });
    const init = {
      arr: [...DEFAULT_ARR], highlights: initHL,
      desc: 'Готово к запуску.', line: [],
      range: `[0..${N - 1}]`, pivot: '—',
    };
    VizAnim.init([init, ...steps], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
