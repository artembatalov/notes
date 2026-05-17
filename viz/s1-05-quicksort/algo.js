document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const svg = d3.select('#viz-svg');
  svg.attr('viewBox','0 0 700 380');
  const defs = svg.append('defs');
  defs.append('marker').attr('id','arr-amber').attr('markerWidth',8).attr('markerHeight',8)
    .attr('refX',6).attr('refY',3).attr('orient','auto')
    .append('path').attr('d','M0,0 L0,6 L8,3 Z').attr('fill','#c8973e');

  const DEFAULT_ARR = [5, 3, 8, 1, 9, 2, 7, 4];

  function getArr() {
    const raw = document.getElementById('arr-input')?.value || '';
    const p = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= 99);
    return p.length >= 2 ? p : [...DEFAULT_ARR];
  }

  function setInputVal(arr) {
    const el = document.getElementById('arr-input');
    if (el) el.value = arr.join(', ');
  }

  const COLORS = {
    default: {fill:'#1e1e1e', text:'#555'},
    sorted:  {fill:'#2d5e3e', text:'#7fc999'},
    pivot:   {fill:'#8b3a3a', text:'#f5a0a0'},
    less:    {fill:'#2a5080', text:'#9dc8f0'},
    greater: {fill:'#4a3a70', text:'#b09ee0'},
    compare: {fill:'#c8973e', text:'#111'},
    placed:  {fill:'#2d6e4e', text:'#7fffc4'},
  };

  function renderArray(arr, highlights, swapPair, y) {
    y = y || 140;
    const n = arr.length;
    const BOX_W = Math.min(58, Math.floor((680 - 8*(n-1)) / n));
    const BOX_H = 50, GAP = 8;
    const totalW = n*(BOX_W+GAP) - GAP;
    const startX = (700 - totalW) / 2;

    svg.selectAll('.swap-arc').remove();
    if (swapPair && swapPair.length === 2 && swapPair[0] !== swapPair[1]) {
      const [i,j] = swapPair;
      const xi = startX + i*(BOX_W+GAP) + BOX_W/2;
      const xj = startX + j*(BOX_W+GAP) + BOX_W/2;
      svg.append('path').attr('class','swap-arc')
        .attr('d',`M ${xi} ${y-2} Q ${(xi+xj)/2} ${y-40} ${xj} ${y-2}`)
        .attr('fill','none').attr('stroke','#c8973e').attr('stroke-width',1.5)
        .attr('marker-end','url(#arr-amber)');
    }

    const grp = svg.selectAll('g.elem').data(arr.map((v,i) => ({v,i})));
    const enter = grp.enter().append('g').attr('class','elem');
    enter.append('rect');
    enter.append('text').attr('class','val');
    enter.append('text').attr('class','idx');

    grp.merge(enter).each(function(d) {
      const x = startX + d.i*(BOX_W+GAP);
      const col = COLORS[highlights[d.i]] || COLORS.default;
      const isHl = highlights[d.i] && highlights[d.i] !== 'default';
      d3.select(this).select('rect')
        .attr('x',x).attr('y',y).attr('width',BOX_W).attr('height',BOX_H).attr('rx',8)
        .attr('fill',col.fill).attr('stroke',isHl ? col.fill : '#333').attr('stroke-width',isHl ? 2 : 1);
      d3.select(this).select('.val')
        .attr('x',x+BOX_W/2).attr('y',y+BOX_H/2+7)
        .attr('text-anchor','middle').attr('font-size',Math.min(18,BOX_W-10))
        .attr('font-weight',700).attr('font-family',"'JetBrains Mono',monospace")
        .attr('fill',col.text).text(d.v);
      d3.select(this).select('.idx')
        .attr('x',x+BOX_W/2).attr('y',y+BOX_H+15)
        .attr('text-anchor','middle').attr('font-size',10).attr('fill','#3a3a3a').text(d.i);
    });
    grp.exit().remove();
  }

  VizCode.init([
    {id:0, html:'<span class="kw">function</span> <span class="fn">quickSort</span>(A, lo, hi):'},
    {id:1, html:'  <span class="kw">if</span> lo >= hi: return'},
    {id:2, html:'  p = <span class="fn">partition</span>(A, lo, hi)'},
    {id:3, html:'  <span class="fn">quickSort</span>(A, lo, p-1)'},
    {id:4, html:'  <span class="fn">quickSort</span>(A, p+1, hi)'},
    {id:5, html:'<span class="fn">partition</span>: pivot=A[hi]; i=lo-1'},
    {id:6, html:'  <span class="kw">for</span> j=lo..hi-1: <span class="kw">if</span> A[j]<=pivot: swap A[++i], A[j]'},
    {id:7, html:'  swap A[i+1], A[hi]; return i+1'},
  ]);

  function buildSteps(inputArr) {
    const arr = [...inputArr];
    const n = arr.length;
    const steps = [];
    const sorted = new Set();

    function hl(lo, hi, pivotIdx, lessUpTo, j) {
      const h = {};
      for (let k = 0; k < n; k++) { if (sorted.has(k)) h[k] = 'sorted'; }
      if (pivotIdx != null) h[pivotIdx] = 'pivot';
      if (lo != null && lessUpTo != null) {
        for (let k = lo; k <= lessUpTo; k++) if (k !== pivotIdx) h[k] = 'less';
      }
      if (j != null && j >= lo && j < pivotIdx) h[j] = 'compare';
      return h;
    }

    steps.push({line:[], arr:[...arr], highlights:{}, swapPair:null, range:'—', pivot:'—',
      desc:'Начинаем быструю сортировку (схема Lomuto).'});

    const stack = [[0, n-1]];
    while (stack.length) {
      const [lo, hi] = stack.pop();

      if (lo >= hi) {
        if (lo === hi) {
          sorted.add(lo);
          steps.push({line:[1], arr:[...arr],
            highlights:{...Object.fromEntries([...sorted].map(k => [k,'sorted']))},
            swapPair:null, range:`[${lo}..${hi}]`, pivot:'—',
            desc:`[${lo}..${hi}]: один элемент — уже отсортирован.`});
        }
        continue;
      }

      const pivotVal = arr[hi];
      steps.push({line:[5], arr:[...arr],
        highlights:{...Object.fromEntries([...sorted].map(k => [k,'sorted'])), [hi]:'pivot'},
        swapPair:null, range:`[${lo}..${hi}]`, pivot:pivotVal,
        desc:`Диапазон [${lo}..${hi}], опорный = A[${hi}] = <b>${pivotVal}</b>`});

      let i = lo - 1;
      for (let j = lo; j < hi; j++) {
        const h = hl(lo, hi, hi, i, j);
        h[j] = 'compare';
        steps.push({line:[6], arr:[...arr], highlights:h, swapPair:null,
          range:`[${lo}..${hi}]`, pivot:pivotVal,
          desc:`j=${j}: A[j]=${arr[j]} ${arr[j] <= pivotVal ? '≤' : '>'} pivot=${pivotVal}`});

        if (arr[j] <= pivotVal) {
          i++;
          if (i !== j) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            const h2 = hl(lo, hi, hi, i, j);
            h2[i] = 'less'; h2[j] = 'less';
            steps.push({line:[6], arr:[...arr], highlights:h2, swapPair:[i,j],
              range:`[${lo}..${hi}]`, pivot:pivotVal,
              desc:`A[j]≤pivot: своп A[${i}] ↔ A[${j}]`});
          } else {
            const h2 = {...h, [i]:'less'};
            steps.push({line:[6], arr:[...arr], highlights:h2, swapPair:null,
              range:`[${lo}..${hi}]`, pivot:pivotVal,
              desc:`A[j]≤pivot: i++ = ${i}`});
          }
        }
      }

      [arr[i+1], arr[hi]] = [arr[hi], arr[i+1]];
      const pPos = i + 1;
      sorted.add(pPos);
      const h3 = {...Object.fromEntries([...sorted].map(k => [k,'sorted']))};
      steps.push({line:[7], arr:[...arr], highlights:h3,
        swapPair: i+1 !== hi ? [i+1, hi] : null,
        range:`[${lo}..${hi}]`, pivot:pivotVal,
        desc:`Опорный ${pivotVal} → позиция ${pPos}. Рекурсия: [${lo}..${pPos-1}] и [${pPos+1}..${hi}]`});

      if (pPos+1 <= hi) stack.push([pPos+1, hi]);
      if (lo <= pPos-1) stack.push([lo, pPos-1]);
    }

    const allSorted = {};
    for (let k = 0; k < n; k++) allSorted[k] = 'sorted';
    steps.push({line:[], arr:[...arr], highlights:allSorted, swapPair:null, range:'—', pivot:'—',
      desc:'Массив отсортирован!'});

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    svg.selectAll('g.elem').remove();
    renderArray(step.arr, step.highlights, step.swapPair);
    document.getElementById('s-range').textContent = step.range || '—';
    document.getElementById('s-pivot').textContent = step.pivot != null ? step.pivot : '—';
    document.getElementById('s-i').textContent = step.i != null ? step.i : '—';
  }

  function run() {
    const arr = getArr();
    setInputVal(arr);
    const steps = buildSteps(arr);
    VizAnim.init([
      {line:[], arr:[...arr], highlights:{}, swapPair:null, range:'—', pivot:'—',
        desc:'Измените массив и нажмите <b>Запустить</b>.'},
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  setInputVal(DEFAULT_ARR);
  run();
});
