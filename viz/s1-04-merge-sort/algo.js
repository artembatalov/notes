document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  const DEFAULT_ARR = [5, 3, 8, 1, 9, 2, 7, 4];
  const barW = 52, gap = 10, startX = 55, baseY = 300, maxH = 220;

  const colorMap = {
    left:    '#6a9fd4',
    right:   '#5a9a72',
    active:  '#c8973e',
    placed:  '#5a9a72',
    done:    '#3a6a52',
    default: '#2a2a2a',
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
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">mergeSort</span>(A, n):' },
    { id: 1,  html: '  width = <span class="num">1</span>' },
    { id: 2,  html: '  <span class="kw">while</span> width < n:' },
    { id: 3,  html: '    <span class="kw">for</span> lo = <span class="num">0</span>; lo < n; lo += 2*width:' },
    { id: 4,  html: '      mid = min(lo+width-1, n-1)' },
    { id: 5,  html: '      hi  = min(lo+2*width-1, n-1)' },
    { id: 6,  html: '      <span class="fn">merge</span>(A, lo, mid, hi)' },
    { id: 7,  html: '    width *= <span class="num">2</span>' },
    { id: 8,  html: '' },
    { id: 9,  html: '<span class="kw">function</span> <span class="fn">merge</span>(A, lo, mid, hi):' },
    { id: 10, html: '  tmp = []' },
    { id: 11, html: '  li = lo, ri = mid+<span class="num">1</span>' },
    { id: 12, html: '  <span class="kw">while</span> li<=mid <span class="kw">and</span> ri<=hi:' },
    { id: 13, html: '    <span class="kw">if</span> A[li] <= A[ri]: tmp.push(A[li++])' },
    { id: 14, html: '    <span class="kw">else</span>: tmp.push(A[ri++])' },
    { id: 15, html: '  <span class="cm">// copy remaining</span>' },
    { id: 16, html: '  copy tmp back to A[lo..hi]' },
  ]);

  function buildSteps() {
    const arr = [...DEFAULT_ARR];
    const n = arr.length;
    const steps = [];
    let cmp = 0;
    const doneSet = new Set();

    function mkHL(extra) {
      const h = {};
      doneSet.forEach(i => { h[i] = 'done'; });
      Object.assign(h, extra);
      return h;
    }

    for (let width = 1; width < n; width *= 2) {
      for (let lo = 0; lo < n; lo += 2 * width) {
        const mid = Math.min(lo + width - 1, n - 1);
        const hi = Math.min(lo + 2 * width - 1, n - 1);
        if (mid >= hi) continue;

        // Highlight left/right halves
        const hlLR = {};
        for (let k = lo; k <= mid; k++) hlLR[k] = 'left';
        for (let k = mid + 1; k <= hi; k++) hlLR[k] = 'right';

        steps.push({
          arr: [...arr], highlights: mkHL(hlLR),
          line: [3, 4, 5, 6],
          desc: `width=${width}: сливаем [${lo}..${mid}] (синий) и [${mid + 1}..${hi}] (зелёный)`,
          width, range: `[${lo}..${hi}]`, cmp,
        });

        // Perform merge
        const tmp = [];
        let li = lo, ri = mid + 1;
        while (li <= mid && ri <= hi) {
          cmp++;
          const hlCmp = {};
          for (let k = lo; k <= mid; k++) hlCmp[k] = 'left';
          for (let k = mid + 1; k <= hi; k++) hlCmp[k] = 'right';
          hlCmp[li] = 'active';
          hlCmp[ri] = 'active';

          steps.push({
            arr: [...arr], highlights: mkHL(hlCmp),
            line: [12, 13, 14],
            desc: `Сравниваем arr[${li}]=<b>${arr[li]}</b> и arr[${ri}]=<b>${arr[ri]}</b>`,
            width, range: `[${lo}..${hi}]`, cmp,
          });

          if (arr[li] <= arr[ri]) {
            tmp.push(arr[li++]);
          } else {
            tmp.push(arr[ri++]);
          }
        }
        while (li <= mid) tmp.push(arr[li++]);
        while (ri <= hi)  tmp.push(arr[ri++]);

        // Copy back
        for (let k = 0; k < tmp.length; k++) {
          arr[lo + k] = tmp[k];
          doneSet.add(lo + k);
        }

        const hlDone = {};
        for (let k = lo; k <= hi; k++) hlDone[k] = 'done';

        steps.push({
          arr: [...arr], highlights: mkHL(hlDone),
          line: [16],
          desc: `Слияние [${lo}..${hi}] завершено. Копируем результат обратно.`,
          width, range: `[${lo}..${hi}]`, cmp,
        });
      }
    }

    const allDone = {};
    arr.forEach((_, k) => { allDone[k] = 'done'; });
    steps.push({
      arr: [...arr], highlights: allDone,
      line: [],
      desc: '<span class="ok">Массив отсортирован!</span>',
      width: '—', range: '—', cmp,
    });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderBars(step.arr, step.highlights || {});
    document.getElementById('s-width').textContent = step.width !== undefined ? step.width : '—';
    document.getElementById('s-range').textContent = step.range || '—';
    document.getElementById('s-cmp').textContent = step.cmp !== undefined ? step.cmp : 0;
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(
      [{ line: [], desc: 'Готово к запуску.', arr: [...DEFAULT_ARR], highlights: {}, width: '—', range: '—', cmp: 0 }, ...steps],
      applyStep
    );
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
