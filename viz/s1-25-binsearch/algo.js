document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  let currentMode = 'lb';

  // ── lower_bound ─────────────────────────────────────────
  const LB_ARR = [1, 3, 3, 5, 7, 7, 8, 10, 12, 15];
  const LB_TARGET = 7;

  function buildLBSteps() {
    const arr = LB_ARR, target = LB_TARGET;
    const n = arr.length;
    const steps = [];
    let lo = 0, hi = n, iter = 0;
    steps.push({ lo, hi, mid:-1, arr, target, iter, ans:-1,
      desc:`lower_bound: первая позиция со значением ≥ <b>${target}</b>. lo=0, hi=${n}` });
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      iter++;
      steps.push({ lo, hi, mid, arr, target, iter, ans:-1,
        desc:`mid=${mid}, arr[mid]=${arr[mid]}. Сравниваем с target=${target}.` });
      if (arr[mid] < target) {
        steps.push({ lo:mid+1, hi, mid, arr, target, iter, ans:-1,
          desc:`arr[mid]=${arr[mid]} < ${target} → lo = mid+1 = ${mid+1}` });
        lo = mid + 1;
      } else {
        steps.push({ lo, hi:mid, mid, arr, target, iter, ans:-1,
          desc:`arr[mid]=${arr[mid]} ≥ ${target} → hi = mid = ${mid}` });
        hi = mid;
      }
    }
    steps.push({ lo, hi, mid:-1, arr, target, iter, ans:lo,
      desc:`Ответ: позиция <b>${lo}</b>. arr[${lo}]=${arr[lo]??'—'}. Итераций: ${iter}.` });
    return steps;
  }

  function renderLB(step) {
    svg.selectAll('*').remove();
    const arr = step.arr, n = arr.length;
    const BOX_W = 52, BOX_H = 46, GAP = 8;
    const totalW = n*(BOX_W+GAP)-GAP;
    const sx = (700-totalW)/2, y = 130;

    // Target label
    svg.append('text').attr('x',350).attr('y',60).attr('text-anchor','middle')
      .attr('font-size',14).attr('fill','#c8973e').attr('font-weight',600)
      .text(`target = ${step.target}`);

    // Range bracket
    if (step.lo <= step.hi) {
      const x1 = sx + step.lo*(BOX_W+GAP);
      const x2 = sx + Math.max(step.lo, step.hi-1)*(BOX_W+GAP) + BOX_W;
      svg.append('rect').attr('x',x1-2).attr('y',y-4).attr('width',x2-x1+4).attr('height',BOX_H+8)
        .attr('fill','rgba(106,159,212,0.08)').attr('stroke','#4a7fa8').attr('rx',6).attr('stroke-width',1);
    }

    arr.forEach((v, i) => {
      const x = sx + i*(BOX_W+GAP);
      let fill = '#1e1e1e', stroke = '#333', textFill = '#555';
      if (i === step.ans) { fill='#2d5e3e'; stroke='#5a9a72'; textFill='#7fc999'; }
      else if (i === step.mid) { fill='#6a4000'; stroke='#c8973e'; textFill='#c8973e'; }
      else if (i >= step.lo && i < step.hi) { stroke='#4a7fa8'; }

      svg.append('rect').attr('x',x).attr('y',y).attr('width',BOX_W).attr('height',BOX_H).attr('rx',7)
        .attr('fill',fill).attr('stroke',stroke).attr('stroke-width', i===step.mid||i===step.ans?2:1);
      svg.append('text').attr('x',x+BOX_W/2).attr('y',y+BOX_H/2+6)
        .attr('text-anchor','middle').attr('font-size',16).attr('font-weight',700)
        .attr('font-family',"'JetBrains Mono',monospace").attr('fill',textFill).text(v);
      svg.append('text').attr('x',x+BOX_W/2).attr('y',y+BOX_H+15)
        .attr('text-anchor','middle').attr('font-size',10).attr('fill','#444').text(i);
    });

    // Pointer labels
    const labels = [];
    if (step.lo>=0 && step.lo<=n) labels.push({i:step.lo, label:'lo', color:'#6a9fd4'});
    if (step.hi>=0 && step.hi<=n) labels.push({i:step.hi, label:'hi', color:'#d46a6a'});
    if (step.mid>=0 && step.mid<n) labels.push({i:step.mid, label:'mid', color:'#c8973e'});
    labels.forEach(({i,label,color}) => {
      const x = sx + Math.min(i,n-1)*(BOX_W+GAP) + BOX_W/2;
      svg.append('text').attr('x',x).attr('y',y-10)
        .attr('text-anchor','middle').attr('font-size',11).attr('font-weight',700).attr('fill',color).text(label);
    });

    document.getElementById('s-lohi').textContent = `${step.lo} / ${step.hi}`;
    document.getElementById('s-mid').textContent = step.mid>=0 ? step.mid : '—';
    document.getElementById('s-iter').textContent = step.iter;
    document.getElementById('s-ans').textContent = step.ans>=0 ? `позиция ${step.ans}` : '—';
  }

  // ── By answer ────────────────────────────────────────────
  function buildAnsByAnswerSteps() {
    // Find min pieces size to cut a log of L=100 into at least 8 pieces
    const L = 100, K = 8;
    const check = mid => Math.floor(L / mid) >= K;
    const steps = [];
    let lo = 1, hi = L, iter = 0;
    steps.push({ lo, hi, mid:-1, iter, ans:-1, check:null,
      desc:`Задача: минимальная длина K, при которой бревно ${L} делится на ≥ ${K} частей. lo=1, hi=${L}.` });
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      iter++;
      const ok = check(mid);
      steps.push({ lo, hi, mid, iter, ans:-1, check:ok,
        desc:`mid=${mid}. Проверка: ⌊${L}/${mid}⌋=${Math.floor(L/mid)} ${ok?'≥':'<'} ${K} → ${ok?'✓ уменьшаем hi':'✗ увеличиваем lo'}` });
      if (ok) { hi = mid; } else { lo = mid + 1; }
      steps.push({ lo, hi, mid, iter, ans:-1, check:ok,
        desc: ok ? `hi = ${hi}` : `lo = ${lo}` });
    }
    steps.push({ lo, hi, mid:-1, iter, ans:lo, check:true,
      desc:`Ответ: <b>${lo}</b>. При длине ${lo}: ⌊${L}/${lo}⌋=${Math.floor(L/lo)} части.` });
    return steps;
  }

  function renderByAnswer(step) {
    svg.selectAll('*').remove();
    const W = 580, sx = 60, y = 150;

    // Number line background
    svg.append('rect').attr('x',sx).attr('y',y+15).attr('width',W).attr('height',6)
      .attr('fill','#222').attr('rx',3);

    const toX = v => sx + (v-1)/(100-1)*W;

    // Active range
    if (step.lo <= step.hi) {
      const x1 = toX(step.lo), x2 = toX(step.hi);
      svg.append('rect').attr('x',x1).attr('y',y+8).attr('width',Math.max(x2-x1,4)).attr('height',20)
        .attr('fill','rgba(106,159,212,0.25)').attr('rx',3);
    }

    // Answer highlight
    if (step.ans >= 1) {
      const x = toX(step.ans);
      svg.append('rect').attr('x',x-10).attr('y',y+5).attr('width',20).attr('height',26)
        .attr('fill','rgba(90,154,114,0.4)').attr('rx',3);
    }

    // Tick marks
    [1,10,20,30,40,50,60,70,80,90,100].forEach(v => {
      const x = toX(v);
      svg.append('line').attr('x1',x).attr('y1',y+13).attr('x2',x).attr('y2',y+22).attr('stroke','#333');
      svg.append('text').attr('x',x).attr('y',y+35).attr('text-anchor','middle')
        .attr('font-size',9).attr('fill','#444').text(v);
    });

    // Pointers
    const ptrs = [
      {v:step.lo, label:'lo', color:'#6a9fd4'},
      {v:step.hi, label:'hi', color:'#d46a6a'},
    ];
    if (step.mid>0) ptrs.push({v:step.mid, label:'mid', color:'#c8973e'});
    if (step.ans>0) ptrs.push({v:step.ans, label:'ans', color:'#5a9a72'});
    ptrs.forEach(({v,label,color}) => {
      const x = toX(v);
      svg.append('line').attr('x1',x).attr('y1',y-5).attr('x2',x).attr('y2',y+10)
        .attr('stroke',color).attr('stroke-width',2);
      svg.append('text').attr('x',x).attr('y',y-12).attr('text-anchor','middle')
        .attr('font-size',11).attr('font-weight',700).attr('fill',color).text(`${label}=${v}`);
    });

    // Check result display
    if (step.check !== null) {
      const x = toX(step.mid), cx = 350, cy = 80;
      svg.append('rect').attr('x',cx-90).attr('y',cy-20).attr('width',180).attr('height',34)
        .attr('fill', step.check?'rgba(45,94,62,.4)':'rgba(139,58,58,.4)')
        .attr('stroke', step.check?'#5a9a72':'#d46a6a').attr('rx',6);
      svg.append('text').attr('x',cx).attr('y',cy+2).attr('text-anchor','middle')
        .attr('font-size',13).attr('font-weight',700).attr('fill',step.check?'#7fc999':'#f5a0a0')
        .text(step.check ? `check(${step.mid}) = ✓` : `check(${step.mid}) = ✗`);
    }

    document.getElementById('s-lohi').textContent = `${step.lo} / ${step.hi}`;
    document.getElementById('s-mid').textContent = step.mid>0 ? step.mid : '—';
    document.getElementById('s-iter').textContent = step.iter;
    document.getElementById('s-ans').textContent = step.ans>0 ? step.ans : '—';
  }

  // ── Real-valued binary search ────────────────────────────
  function buildRealSteps() {
    // Find sqrt(2): x² = 2
    const target = 2, eps = 0.005;
    let lo = 1.0, hi = 2.0, iter = 0;
    const steps = [];
    steps.push({ lo, hi, mid:-1, iter, ans:-1,
      desc:`Найдём √2 методом бинарного поиска. check(x): x²≤2. lo=1.0, hi=2.0, ε=${eps}` });
    while (hi - lo > eps) {
      const mid = (lo + hi) / 2;
      iter++;
      const ok = mid*mid <= target;
      steps.push({ lo, hi, mid, iter, ans:-1,
        desc:`mid=${mid.toFixed(4)}, mid²=${(mid*mid).toFixed(4)}. ${ok?'≤':'>'} ${target} → ${ok?'lo=mid':'hi=mid'}` });
      if (ok) lo = mid; else hi = mid;
      steps.push({ lo, hi, mid, iter, ans:-1,
        desc:`lo=${lo.toFixed(4)}, hi=${hi.toFixed(4)}, ширина=${(hi-lo).toFixed(4)}` });
      if (iter >= 12) break;
    }
    const ans = (lo+hi)/2;
    steps.push({ lo, hi, mid:-1, iter, ans,
      desc:`Ответ: √2 ≈ <b>${ans.toFixed(4)}</b> (точное: 1.4142…). Итераций: ${iter}.` });
    return steps;
  }

  function renderReal(step) {
    svg.selectAll('*').remove();
    const W = 500, sx = 100, y = 160;
    const toX = v => sx + (v-1.0)/(2.0-1.0)*W;

    // Background axis
    svg.append('rect').attr('x',sx).attr('y',y+15).attr('width',W).attr('height',5)
      .attr('fill','#222').attr('rx',3);
    [1.0,1.2,1.4,1.6,1.8,2.0].forEach(v => {
      const x = toX(v);
      svg.append('line').attr('x1',x).attr('y1',y+12).attr('x2',x).attr('y2',y+23).attr('stroke','#333');
      svg.append('text').attr('x',x).attr('y',y+35).attr('text-anchor','middle')
        .attr('font-size',10).attr('fill','#555').text(v.toFixed(1));
    });

    // Active interval
    const x1 = toX(step.lo), x2 = toX(step.hi);
    svg.append('rect').attr('x',x1).attr('y',y+8).attr('width',x2-x1).attr('height',20)
      .attr('fill','rgba(106,159,212,0.25)').attr('rx',3);

    // True sqrt(2) line
    const sqrtX = toX(Math.sqrt(2));
    svg.append('line').attr('x1',sqrtX).attr('y1',y-20).attr('x2',sqrtX).attr('y2',y+30)
      .attr('stroke','#5a9a72').attr('stroke-width',1.5).attr('stroke-dasharray','4,3');
    svg.append('text').attr('x',sqrtX).attr('y',y-26).attr('text-anchor','middle')
      .attr('font-size',10).attr('fill','#5a9a72').text('√2=1.4142');

    // Pointers
    [{v:step.lo,label:'lo',color:'#6a9fd4'},{v:step.hi,label:'hi',color:'#d46a6a'}].forEach(({v,label,color}) => {
      const x = toX(v);
      svg.append('line').attr('x1',x).attr('y1',y-5).attr('x2',x).attr('y2',y+13)
        .attr('stroke',color).attr('stroke-width',2);
      svg.append('text').attr('x',x).attr('y',y-11).attr('text-anchor','middle')
        .attr('font-size',10).attr('font-weight',700).attr('fill',color).text(`${label}=${v.toFixed(3)}`);
    });
    if (step.mid>0) {
      const x = toX(step.mid);
      svg.append('circle').attr('cx',x).attr('cy',y+17).attr('r',5).attr('fill','#c8973e');
      svg.append('text').attr('x',x).attr('y',y+50).attr('text-anchor','middle')
        .attr('font-size',10).attr('fill','#c8973e').text(`mid=${step.mid.toFixed(3)}`);
    }
    if (step.ans>0) {
      const x = toX(step.ans);
      svg.append('rect').attr('x',x-24).attr('y',y-15).attr('width',48).attr('height',44)
        .attr('fill','rgba(45,94,62,.3)').attr('stroke','#5a9a72').attr('rx',5);
      svg.append('text').attr('x',x).attr('y',y+55).attr('text-anchor','middle')
        .attr('font-size',11).attr('font-weight',700).attr('fill','#7fc999').text(`≈${step.ans.toFixed(4)}`);
    }

    document.getElementById('s-lohi').textContent = `${step.lo.toFixed(4)} / ${step.hi.toFixed(4)}`;
    document.getElementById('s-mid').textContent = step.mid>0 ? step.mid.toFixed(4) : '—';
    document.getElementById('s-iter').textContent = step.iter;
    document.getElementById('s-ans').textContent = step.ans>0 ? `≈${step.ans.toFixed(4)}` : '—';
  }

  const CODES = {
    lb: [
      { id:0, html:'<span class="cm">// lower_bound: первый i, где a[i] ≥ target</span>' },
      { id:1, html:'lo=0, hi=n' },
      { id:2, html:'<span class="kw">while</span> lo < hi:' },
      { id:3, html:'  mid = (lo+hi) >> 1' },
      { id:4, html:'  <span class="kw">if</span> a[mid] < target: lo = mid+1' },
      { id:5, html:'  <span class="kw">else</span>:             hi = mid' },
      { id:6, html:'return lo' },
    ],
    ans: [
      { id:0, html:'<span class="cm">// Бинпоиск по ответу: min K с check(K)=true</span>' },
      { id:1, html:'lo=min_val, hi=max_val' },
      { id:2, html:'<span class="kw">while</span> lo < hi:' },
      { id:3, html:'  mid = ceil((lo+hi)/2)' },
      { id:4, html:'  <span class="kw">if</span> check(mid): hi = mid' },
      { id:5, html:'  <span class="kw">else</span>:          lo = mid+1' },
      { id:6, html:'return lo' },
      { id:7, html:'<span class="cm">// check(x): ⌊L/x⌋ ≥ K</span>' },
    ],
    real: [
      { id:0, html:'<span class="cm">// Вещественный бинпоиск: найти √2</span>' },
      { id:1, html:'lo=1.0, hi=2.0, eps=0.005' },
      { id:2, html:'<span class="kw">while</span> hi-lo > eps:' },
      { id:3, html:'  mid = (lo+hi) / 2' },
      { id:4, html:'  <span class="kw">if</span> mid*mid <= 2: lo = mid' },
      { id:5, html:'  <span class="kw">else</span>:           hi = mid' },
      { id:6, html:'return (lo+hi)/2' },
    ],
  };

  const builders = { lb: buildLBSteps, ans: buildAnsByAnswerSteps, real: buildRealSteps };
  const renderers = { lb: renderLB, ans: renderByAnswer, real: renderReal };

  function setMode(m) {
    currentMode = m;
    document.querySelectorAll('[id^=tab-]').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+m)?.classList.add('active');
    VizCode.init(CODES[m]);
    run();
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderers[currentMode](step);
  }

  function run() {
    const steps = builders[currentMode]();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizCode.init(CODES.lb);
  VizAnim.bindUI(run);
  run();
  window.setMode = setMode;
});
