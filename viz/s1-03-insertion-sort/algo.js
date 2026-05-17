document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const svg = d3.select('#viz-svg');
  svg.attr('viewBox','0 0 700 360');
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
    key:     {fill:'#c8973e', text:'#111'},
    compare: {fill:'#4a7fa8', text:'#fff'},
    sorted:  {fill:'#2d5e3e', text:'#7fc999'},
    shift:   {fill:'#5a4a90', text:'#c0b0ff'},
    insert:  {fill:'#2d6e4e', text:'#7fffc4'},
  };

  function renderArray(arr, highlights, swapPair, y) {
    y = y || 150;
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
      const mx = (xi+xj)/2;
      const arcH = Math.max(30, Math.abs(xi-xj)*0.35);
      svg.append('path').attr('class','swap-arc')
        .attr('d',`M ${xi} ${y-2} Q ${mx} ${y-arcH} ${xj} ${y-2}`)
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
    {id:0, html:'<span class="kw">function</span> <span class="fn">insertionSort</span>(A, n):'},
    {id:1, html:'  <span class="kw">for</span> i = <span class="num">1</span> <span class="kw">to</span> n-1:'},
    {id:2, html:'    key = A[i]; j = i-1'},
    {id:3, html:'    <span class="kw">while</span> j >= 0 <span class="kw">and</span> A[j] > key:'},
    {id:4, html:'      A[j+1] = A[j]; j = j - 1'},
    {id:5, html:'    A[j+1] = key'},
  ]);

  function buildSteps(inputArr) {
    const arr = [...inputArr];
    const n = arr.length;
    const steps = [];
    let cmp = 0, shift = 0;

    const sortedHL = (upTo) => {
      const h = {};
      for (let k = 0; k <= upTo; k++) h[k] = 'sorted';
      return h;
    };

    steps.push({line:[], arr:[...arr], highlights:{}, swapPair:null, cmp, shift, key:'—',
      desc:'Массив готов. Начинаем сортировку вставками.'});

    for (let i = 1; i < n; i++) {
      const key = arr[i];
      const hl0 = {...sortedHL(i-1), [i]:'key'};
      steps.push({line:[1,2], arr:[...arr], highlights:hl0, swapPair:null, cmp, shift, key,
        desc:`i=${i}: берём ключ <b>${key}</b> = A[${i}]`});

      let j = i - 1;
      while (j >= 0 && arr[j] > key) {
        cmp++;
        const hl1 = {...sortedHL(j-1), [j]:'compare', [i]:'key'};
        steps.push({line:[3], arr:[...arr], highlights:hl1, swapPair:null, cmp, shift, key,
          desc:`A[${j}]=${arr[j]} > key=${key} → сдвигаем вправо`});
        arr[j+1] = arr[j];
        shift++;
        const hl2 = {...sortedHL(j-1), [j+1]:'shift'};
        steps.push({line:[4], arr:[...arr], highlights:hl2, swapPair:null, cmp, shift, key,
          desc:`A[${j+1}] = A[${j}] = ${arr[j+1]}`});
        j--;
      }

      arr[j+1] = key;
      const hl3 = {...sortedHL(i), [j+1]:'insert'};
      steps.push({line:[5], arr:[...arr], highlights:hl3, swapPair:null, cmp, shift, key,
        desc:`Вставляем key=${key} на позицию ${j+1}`});
    }

    steps.push({line:[], arr:[...arr], highlights:sortedHL(n-1), swapPair:null, cmp, shift, key:'—',
      desc:`Готово! Сравнений: ${cmp}, сдвигов: ${shift}.`});

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    svg.selectAll('g.elem').remove();
    renderArray(step.arr, step.highlights, step.swapPair);
    document.getElementById('s-cmp').textContent = step.cmp;
    document.getElementById('s-shift').textContent = step.shift;
    document.getElementById('s-key').textContent = step.key;
  }

  function run() {
    const arr = getArr();
    setInputVal(arr);
    const steps = buildSteps(arr);
    VizAnim.init([
      {line:[], arr:[...arr], highlights:{}, swapPair:null, cmp:0, shift:0, key:'—',
        desc:'Измените массив выше и нажмите <b>Запустить</b>.'},
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  setInputVal(DEFAULT_ARR);
  run();
});
