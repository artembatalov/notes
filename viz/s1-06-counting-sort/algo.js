document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const svg = d3.select('#viz-svg');
  svg.attr('viewBox','0 0 700 400');

  const DEFAULT_ARR = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];

  function getArr() {
    const raw = document.getElementById('arr-input')?.value || '';
    const p = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 9);
    return p.length >= 2 ? p : [...DEFAULT_ARR];
  }

  function setInputVal(arr) {
    const el = document.getElementById('arr-input');
    if (el) el.value = arr.join(', ');
  }

  VizCode.init([
    {id:0, html:'<span class="cm">// Фаза 1: подсчёт</span>'},
    {id:1, html:'<span class="kw">for</span> i=0..n-1: count[A[i]]++'},
    {id:2, html:'<span class="cm">// Фаза 2: префиксные суммы</span>'},
    {id:3, html:'<span class="kw">for</span> i=1..k: count[i] += count[i-1]'},
    {id:4, html:'<span class="cm">// Фаза 3: расстановка (справа налево)</span>'},
    {id:5, html:'<span class="kw">for</span> i=n-1 <span class="kw">downto</span> 0:'},
    {id:6, html:'  out[--count[A[i]]] = A[i]'},
  ]);

  function render(input, count, output, inputHL, countHL, outputHL) {
    svg.selectAll('*').remove();
    const k = 10;

    // Row labels
    svg.append('text').attr('x',4).attr('y',48).attr('font-size',11)
      .attr('fill','#585858').attr('font-weight',600).text('Вход:');
    svg.append('text').attr('x',4).attr('y',180).attr('font-size',11)
      .attr('fill','#585858').attr('font-weight',600).text('Count:');
    svg.append('text').attr('x',4).attr('y',320).attr('font-size',11)
      .attr('fill','#585858').attr('font-weight',600).text('Выход:');

    // Input boxes
    const n = input.length;
    const bw = Math.min(48, Math.floor(650 / (n+1)));
    input.forEach((v,i) => {
      const x = 50 + i*(bw+4);
      const y = 25;
      const hl = inputHL[i];
      svg.append('rect').attr('x',x).attr('y',y).attr('width',bw).attr('height',36).attr('rx',6)
        .attr('fill', hl==='active' ? '#c8973e' : hl==='done' ? '#2d5e3e' : '#1e1e1e')
        .attr('stroke', hl ? '#c8973e' : '#333');
      svg.append('text').attr('x',x+bw/2).attr('y',y+23)
        .attr('text-anchor','middle').attr('font-size',14).attr('font-weight',700)
        .attr('font-family',"'JetBrains Mono',monospace")
        .attr('fill', hl==='active' ? '#111' : hl==='done' ? '#7fc999' : '#777').text(v);
    });

    // Count bars (indices 0..9)
    const maxC = Math.max(1, ...count.filter(c => c != null));
    const maxH = 120;
    const cbw = 52;
    const csx = 35;
    for (let c = 0; c < k; c++) {
      const cv = count[c] ?? 0;
      const bh = cv / maxC * maxH || 0;
      const x = csx + c*(cbw+4);
      const by = 270 - bh;
      const hl = countHL[c];
      svg.append('rect').attr('x',x).attr('y',by).attr('width',cbw).attr('height',bh+2).attr('rx',3)
        .attr('fill', hl==='active' ? '#c8973e' : hl==='sum' ? '#4a7fa8' : hl==='done' ? '#2d5e3e' : '#1e1e1e')
        .attr('stroke', hl ? '#c8973e' : '#2a2a2a');
      svg.append('text').attr('x',x+cbw/2).attr('y',by-4)
        .attr('text-anchor','middle').attr('font-size',12).attr('font-weight',700)
        .attr('font-family',"'JetBrains Mono',monospace")
        .attr('fill', cv > 0 ? '#efefef' : '#333').text(cv || '');
      svg.append('text').attr('x',x+cbw/2).attr('y',280)
        .attr('text-anchor','middle').attr('font-size',11).attr('fill','#555').text(c);
    }

    // Output boxes
    const obw = Math.min(48, Math.floor(650 / (n+1)));
    output.forEach((v,i) => {
      if (v === null) return;
      const x = 50 + i*(obw+4);
      const y = 295;
      const hl = outputHL[i];
      svg.append('rect').attr('x',x).attr('y',y).attr('width',obw).attr('height',36).attr('rx',6)
        .attr('fill', hl==='placed' ? '#2d6e4e' : hl==='done' ? '#2d5e3e' : '#1e1e1e')
        .attr('stroke', hl ? '#5a9a72' : '#333');
      svg.append('text').attr('x',x+obw/2).attr('y',y+23)
        .attr('text-anchor','middle').attr('font-size',14).attr('font-weight',700)
        .attr('font-family',"'JetBrains Mono',monospace")
        .attr('fill', hl ? '#7fffc4' : '#777').text(v);
    });
  }

  function buildSteps(inputArr) {
    const n = inputArr.length;
    const k = 10;
    const steps = [];
    const count = new Array(k).fill(0);
    const output = new Array(n).fill(null);

    steps.push({phase:'init', input:[...inputArr], count:[...count], output:[...output],
      inputHL:{}, countHL:{}, outputHL:{},
      desc:'Сортировка подсчётом. Три фазы: подсчёт → префиксные суммы → расстановка.'});

    // Phase 1
    steps.push({phase:1, input:[...inputArr], count:[...count], output:[...output],
      inputHL:{}, countHL:{}, outputHL:{},
      desc:'<b>Фаза 1</b>: подсчитываем сколько раз встречается каждое значение.'});

    for (let i = 0; i < n; i++) {
      count[inputArr[i]]++;
      steps.push({line:[1], input:[...inputArr], count:[...count], output:[...output],
        inputHL:{[i]:'active'}, countHL:{[inputArr[i]]:'active'}, outputHL:{},
        desc:`A[${i}]=${inputArr[i]}: count[${inputArr[i]}]++ = ${count[inputArr[i]]}`});
    }

    // Phase 2
    steps.push({phase:2, input:[...inputArr], count:[...count], output:[...output],
      inputHL:{}, countHL:{}, outputHL:{},
      desc:'<b>Фаза 2</b>: вычисляем префиксные суммы. count[i] = кол-во элементов ≤ i.'});

    for (let c = 1; c < k; c++) {
      count[c] += count[c-1];
      steps.push({line:[3], input:[...inputArr], count:[...count], output:[...output],
        inputHL:{}, countHL:{[c-1]:'sum', [c]:'active'}, outputHL:{},
        desc:`count[${c}] += count[${c-1}] → count[${c}] = ${count[c]}`});
    }

    // Phase 3
    steps.push({phase:3, input:[...inputArr], count:[...count], output:[...output],
      inputHL:{}, countHL:{}, outputHL:{},
      desc:'<b>Фаза 3</b>: расставляем элементы в выходной массив справа налево (стабильная сортировка).'});

    for (let i = n-1; i >= 0; i--) {
      const v = inputArr[i];
      count[v]--;
      const pos = count[v];
      output[pos] = v;
      steps.push({line:[5,6], input:[...inputArr], count:[...count], output:[...output],
        inputHL:{[i]:'active'}, countHL:{[v]:'done'}, outputHL:{[pos]:'placed'},
        desc:`A[${i}]=${v}: позиция count[${v}]=${pos}, output[${pos}]=${v}`});
    }

    steps.push({line:[], input:[...inputArr], count:[...count], output:[...output],
      inputHL:{}, countHL:{},
      outputHL:Object.fromEntries(output.map((_,i) => [i,'done'])),
      desc:'Готово! Массив отсортирован.'});

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    render(step.input, step.count, step.output, step.inputHL, step.countHL, step.outputHL);
    document.getElementById('s-phase').textContent = step.phase || '—';
    const activeEntries = Object.entries(step.inputHL || {});
    document.getElementById('s-elem').textContent =
      activeEntries.length ? activeEntries.map(([i]) => step.input[i]).join(', ') : '—';
  }

  function run() {
    const arr = getArr();
    setInputVal(arr);
    const steps = buildSteps(arr);
    VizAnim.init([
      {line:[], input:[...arr], count:new Array(10).fill(0), output:new Array(arr.length).fill(null),
        inputHL:{}, countHL:{}, outputHL:{},
        desc:'Измените массив и нажмите <b>Запустить</b>.'},
      ...steps
    ], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  setInputVal(DEFAULT_ARR);
  run();
});
