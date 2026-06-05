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
    compare: {fill:'#4a7fa8', text:'#fff'},
    placed:  {fill:'#2d6e4e', text:'#7fffc4'},
    left:    {fill:'#2a4060', text:'#9dc8f0'},
    right:   {fill:'#2a5030', text:'#9fd4a0'},
  };

  function renderArray(arr, highlights, label, y) {
    y = y || 140;
    const n = arr.length;
    const BOX_W = Math.min(58, Math.floor((680 - 8*(n-1)) / n));
    const BOX_H = 50, GAP = 8;
    const totalW = n*(BOX_W+GAP) - GAP;
    const startX = (700 - totalW) / 2;

    svg.selectAll('.range-lbl').remove();
    if (label) {
      svg.append('text').attr('class','range-lbl')
        .attr('x',350).attr('y',y+BOX_H+30)
        .attr('text-anchor','middle').attr('font-size',12).attr('fill','#585858')
        .text(label);
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
    {id:0, html:'<span class="kw">function</span> <span class="fn">mergeSort</span>(A):'},
    {id:1, html:'  <span class="cm">// Bottom-up: width 1, 2, 4, ...</span>'},
    {id:2, html:'  <span class="kw">for</span> width = 1; width < n; width *= 2:'},
    {id:3, html:'    <span class="kw">for</span> lo = 0; lo < n; lo += 2*width:'},
    {id:4, html:'      mid = min(lo+width, n)-1'},
    {id:5, html:'      hi  = min(lo+2*width, n)-1'},
    {id:6, html:'      <span class="fn">merge</span>(A, lo, mid, hi)'},
    {id:7, html:'<span class="fn">merge</span>(lo, mid, hi): сравниваем A[li] и A[ri]'},
  ]);

  function buildSteps(inputArr) {
    const arr = [...inputArr];
    const n = arr.length;
    const steps = [];
    let cmp = 0;

    steps.push({line:[], arr:[...arr], highlights:{}, rangeLabel:'', cmp,
      desc:'Сортировка слиянием (снизу вверх). Начинаем с подмассивов ширины 1.'});

    for (let w = 1; w < n; w *= 2) {
      for (let lo = 0; lo < n; lo += 2*w) {
        const mid = Math.min(lo+w, n) - 1;
        const hi  = Math.min(lo+2*w, n) - 1;
        if (mid >= hi) continue;

        const hl0 = {};
        for (let k = lo; k <= mid; k++) hl0[k] = 'left';
        for (let k = mid+1; k <= hi; k++) hl0[k] = 'right';

        steps.push({line:[2,3], arr:[...arr], highlights:hl0,
          rangeLabel:`Ширина ${w}: сливаем [${lo}..${mid}] + [${mid+1}..${hi}]`, cmp,
          desc:`Сливаем: левая [${lo}..${mid}] (синяя) + правая [${mid+1}..${hi}] (зелёная)`});

        const tmp = [];
        let li = lo, ri = mid + 1;
        while (li <= mid && ri <= hi) {
          cmp++;
          const hl1 = {...hl0, [li]:'compare', [ri]:'compare'};
          steps.push({line:[7], arr:[...arr], highlights:hl1,
            rangeLabel:`Сравниваем arr[${li}]=${arr[li]} и arr[${ri}]=${arr[ri]}`, cmp,
            desc:`Сравниваем <b>${arr[li]}</b> и <b>${arr[ri]}</b>`});
          if (arr[li] <= arr[ri]) { tmp.push(arr[li++]); }
          else { tmp.push(arr[ri++]); }
        }
        while (li <= mid) tmp.push(arr[li++]);
        while (ri <= hi) tmp.push(arr[ri++]);

        tmp.forEach((v,k) => { arr[lo+k] = v; });

        const hl2 = {};
        for (let k = lo; k <= hi; k++) hl2[k] = 'sorted';
        steps.push({line:[6], arr:[...arr], highlights:hl2,
          rangeLabel:`[${lo}..${hi}] слит`, cmp,
          desc:`Отрезок [${lo}..${hi}] слит и отсортирован.`});
      }
    }

    const allSorted = {};
    for (let k = 0; k < n; k++) allSorted[k] = 'sorted';
    steps.push({line:[], arr:[...arr], highlights:allSorted, rangeLabel:'Готово!', cmp,
      desc:`Массив отсортирован. Сравнений: ${cmp}.`});

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    svg.selectAll('g.elem').remove();
    renderArray(step.arr, step.highlights, step.rangeLabel);
    const wMatch = step.rangeLabel ? step.rangeLabel.match(/Ширина (\d+)/) : null;
    document.getElementById('s-width').textContent = wMatch ? wMatch[1] : '—';
    document.getElementById('s-range').textContent = step.rangeLabel || '—';
    document.getElementById('s-cmp').textContent = step.cmp;
  }

  function run() {
    const arr = getArr();
    setInputVal(arr);
    const steps = buildSteps(arr);
    VizAnim.init([
      {line:[], arr:[...arr], highlights:{}, rangeLabel:'', cmp:0,
        desc:'Измените массив и нажмите <b>Запустить</b>.'},
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  setInputVal(DEFAULT_ARR);
  run();
});
