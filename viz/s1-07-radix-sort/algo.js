document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const svg = d3.select('#viz-svg');
  svg.attr('viewBox','0 0 700 420');

  const DEFAULT_ARR = [170, 45, 75, 90, 802, 24, 2, 66];

  function getArr() {
    const raw = document.getElementById('arr-input')?.value || '';
    const p = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0 && n <= 9999);
    return p.length >= 2 ? p : [...DEFAULT_ARR];
  }

  function setInputVal(arr) {
    const el = document.getElementById('arr-input');
    if (el) el.value = arr.join(', ');
  }

  VizCode.init([
    {id:0, html:'<span class="kw">function</span> <span class="fn">radixSort</span>(A, n, d):'},
    {id:1, html:'  <span class="kw">for</span> digit = 0 to d-1:'},
    {id:2, html:'    <span class="cm">// Стабильная сортировка по digit-му разряду</span>'},
    {id:3, html:'    countingSort(A, n, base=10, key=digit)'},
    {id:4, html:'<span class="cm">// d=3 разряда, k=10, стабильность = ключ</span>'},
  ]);

  function getDigit(num, d) {
    return Math.floor(num / Math.pow(10, d)) % 10;
  }

  function render(mainArr, buckets, digitPos, highlightMain, step) {
    svg.selectAll('*').remove();
    const n = mainArr.length;
    const bw = Math.min(64, Math.floor(690 / n));
    const bh = 34;
    const gap = 4;
    const sx = (700 - n*(bw+gap) + gap) / 2;
    const y0 = 20;

    // Digit position label
    svg.append('text').attr('x',350).attr('y',14).attr('text-anchor','middle').attr('font-size',12)
      .attr('fill','#585858')
      .text(digitPos === 0 ? 'Разряд: единицы' : digitPos === 1 ? 'Разряд: десятки' : 'Разряд: сотни');

    // Main array numbers
    mainArr.forEach((v,i) => {
      const x = sx + i*(bw+gap);
      const hl = highlightMain[i];
      svg.append('rect').attr('x',x).attr('y',y0).attr('width',bw).attr('height',bh).attr('rx',6)
        .attr('fill', hl==='active' ? '#6a4000' : hl==='done' ? '#2d5e3e' : '#1e1e1e')
        .attr('stroke', hl ? '#c8973e' : '#333');

      const str = String(v).padStart(3,'0');
      const tx = x + bw/2;
      const ty = y0 + bh/2 + 6;
      const t = svg.append('text').attr('x',tx).attr('y',ty).attr('text-anchor','middle')
        .attr('font-size',13).attr('font-weight',700).attr('font-family',"'JetBrains Mono',monospace");

      const chars = str.split('');
      chars.forEach((ch,ci) => {
        // units=pos0=rightmost=index2, tens=pos1=index1, hundreds=pos2=index0
        const isTarget = (2 - ci) === digitPos;
        t.append('tspan').attr('fill', isTarget ? '#c8973e' : '#666').text(ch);
      });
    });

    // Buckets (show if step has bucket data)
    if (buckets) {
      const bucketY = 70;
      const laneH = 30;
      for (let b = 0; b < 10; b++) {
        const by = bucketY + b*laneH;
        svg.append('text').attr('x',12).attr('y',by+laneH/2+5).attr('font-size',11)
          .attr('fill','#555').attr('font-weight',700).text(b+':');
        const items = buckets[b] || [];
        items.forEach((v,idx) => {
          const bx = 30 + idx*(40+3);
          const isNewlyPlaced = step && step.placingBucket === b && step.placingIdx === idx;
          svg.append('rect').attr('x',bx).attr('y',by+2).attr('width',40).attr('height',laneH-4).attr('rx',4)
            .attr('fill', isNewlyPlaced ? '#c8973e' : '#252525').attr('stroke','#333');
          svg.append('text').attr('x',bx+20).attr('y',by+laneH-8).attr('text-anchor','middle')
            .attr('font-size',12).attr('font-weight',700)
            .attr('font-family',"'JetBrains Mono',monospace")
            .attr('fill', isNewlyPlaced ? '#111' : '#aaa').text(v);
        });
      }
    }
  }

  function buildSteps(inputArr) {
    const arr = [...inputArr];
    const n = arr.length;
    const steps = [];
    const emptyBuckets = () => Array.from({length:10}, () => []);

    steps.push({arr:[...arr], buckets:null, highlightMain:{}, digitPos:0,
      desc:'Поразрядная сортировка (LSD). Три прохода: единицы → десятки → сотни.'});

    for (let d = 0; d < 3; d++) {
      const label = d === 0 ? 'единицы' : d === 1 ? 'десятки' : 'сотни';
      steps.push({line:[1], arr:[...arr], buckets:null, highlightMain:{}, digitPos:d,
        desc:`<b>Проход ${d+1}</b>: сортируем по разряду "${label}"`});

      const buckets = emptyBuckets();
      for (let i = 0; i < n; i++) {
        const dig = getDigit(arr[i], d);
        steps.push({line:[3], arr:[...arr], buckets:buckets.map(b => [...b]),
          highlightMain:{[i]:'active'}, digitPos:d,
          placingBucket:dig, placingIdx:buckets[dig].length,
          desc:`A[${i}]=${arr[i]}: разряд="${label}"=${dig} → ведро ${dig}`});
        buckets[dig].push(arr[i]);
        steps.push({line:[3], arr:[...arr], buckets:buckets.map(b => [...b]),
          highlightMain:{}, digitPos:d,
          desc:`${arr[i]} помещён в ведро ${dig}`});
      }

      let pos = 0;
      for (let b = 0; b < 10; b++) for (const v of buckets[b]) arr[pos++] = v;

      steps.push({line:[], arr:[...arr], buckets:null, highlightMain:{}, digitPos:d,
        desc:`Собираем из вёдер 0..9. Массив после прохода по "${label}": [${arr.join(', ')}]`});
    }

    steps.push({line:[], arr:[...arr], buckets:null,
      highlightMain:Object.fromEntries(arr.map((_,i) => [i,'done'])), digitPos:2,
      desc:'Массив полностью отсортирован!'});

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    render(step.arr, step.buckets, step.digitPos || 0, step.highlightMain || {}, step);
    document.getElementById('s-digit').textContent =
      step.digitPos === 0 ? 'единицы' : step.digitPos === 1 ? 'десятки' : 'сотни';
    document.getElementById('s-substep').textContent =
      step.desc ? step.desc.replace(/<[^>]+>/g,'').slice(0,40) : '—';
  }

  function run() {
    const arr = getArr();
    setInputVal(arr);
    const steps = buildSteps(arr);
    VizAnim.init([
      {arr:[...arr], buckets:null, highlightMain:{}, digitPos:0,
        desc:'Измените массив и нажмите <b>Запустить</b>.'},
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  setInputVal(DEFAULT_ARR);
  run();
});
