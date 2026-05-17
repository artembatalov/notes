document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  let currentMode = 'deque';

  const BOX = { w:60, h:44, gap:8, y:150 };

  function centerX(n, i) {
    const totalW = n*(BOX.w+BOX.gap) - BOX.gap;
    return (700-totalW)/2 + i*(BOX.w+BOX.gap);
  }

  function renderBoxRow(items, highlights, label, yOffset) {
    const n = items.length;
    const y = BOX.y + yOffset;
    svg.selectAll(`g.row-${label}`).remove();
    svg.selectAll(`text.lbl-${label}`).remove();

    svg.append('text').attr('class',`lbl-${label}`)
      .attr('x', 18).attr('y', y + BOX.h/2 + 5)
      .attr('font-size', 11).attr('fill', '#585858')
      .attr('font-weight', 600).text(label + ':');

    if (n === 0) {
      svg.append('text').attr('class',`lbl-${label}`)
        .attr('x', 80).attr('y', y + BOX.h/2 + 5)
        .attr('font-size', 13).attr('fill', '#333').text('(пусто)');
      return;
    }

    const grp = svg.selectAll(`g.row-${label}`).data(items.map((v,i)=>({v,i})));
    const enter = grp.enter().append('g').attr('class',`row-${label}`);
    enter.append('rect'); enter.append('text');

    const total = n*(BOX.w+BOX.gap)-BOX.gap;
    const sx = 70;
    grp.merge(enter).each(function(d) {
      const x = sx + d.i*(BOX.w+BOX.gap);
      const hl = highlights[d.i];
      const fill = hl==='new'?'#c8973e': hl==='del'?'#8b3a3a': hl==='min'?'#2d5e3e':'#1e1e1e';
      const stroke = hl==='new'?'#c8973e': hl==='del'?'#d46a6a': hl==='min'?'#5a9a72':'#333';
      const textFill = hl==='new'?'#111': hl==='del'?'#f5a0a0': hl==='min'?'#7fc999':'#888';
      d3.select(this).select('rect')
        .attr('x',x).attr('y',y).attr('width',BOX.w).attr('height',BOX.h)
        .attr('rx',7).attr('fill',fill).attr('stroke',stroke);
      d3.select(this).select('text')
        .attr('x',x+BOX.w/2).attr('y',y+BOX.h/2+6)
        .attr('text-anchor','middle').attr('font-size',17).attr('font-weight',700)
        .attr('font-family',"'JetBrains Mono',monospace").attr('fill',textFill).text(d.v);
    });
  }

  // ── DEQUE mode ──────────────────────────────────────────
  const DEQUE_OPS = [
    {op:'push_back',  val:5},
    {op:'push_front', val:3},
    {op:'push_back',  val:7},
    {op:'push_back',  val:1},
    {op:'pop_front'},
    {op:'push_front', val:9},
    {op:'pop_back'},
    {op:'push_back',  val:4},
    {op:'pop_front'},
    {op:'pop_back'},
  ];

  function buildDequeSteps() {
    const steps = [];
    let deq = [];
    steps.push({dq:[...deq], hl:{}, op:'—', desc:'Дек пуст. Поддерживает push/pop с обоих концов.'});
    DEQUE_OPS.forEach(({op,val}) => {
      const hl = {};
      if (op==='push_back')  { deq.push(val);        hl[deq.length-1]='new'; }
      if (op==='push_front') { deq.unshift(val);      hl[0]='new'; }
      if (op==='pop_back')   { hl[deq.length-1]='del'; steps.push({dq:[...deq],hl,op,desc:`pop_back() = ${deq[deq.length-1]}`}); deq.pop(); steps.push({dq:[...deq],hl:{},op,desc:`Удалён хвост. Размер: ${deq.length}`}); return; }
      if (op==='pop_front')  { hl[0]='del'; steps.push({dq:[...deq],hl,op,desc:`pop_front() = ${deq[0]}`}); deq.shift(); steps.push({dq:[...deq],hl:{},op,desc:`Удалена голова. Размер: ${deq.length}`}); return; }
      const label = op==='push_back' ? `push_back(${val}): добавлен в хвост` : `push_front(${val}): добавлен в голову`;
      steps.push({dq:[...deq], hl, op, desc:label});
    });
    steps.push({dq:[...deq],hl:{},op:'done',desc:'Демонстрация завершена.'});
    return steps;
  }

  function applyDequeStep(step) {
    svg.selectAll('*').remove();
    svg.append('text').attr('x',350).attr('y',60).attr('text-anchor','middle')
      .attr('font-size',13).attr('fill','#585858').text('FRONT ←───────────────────────→ BACK');
    renderBoxRow(step.dq, step.hl, 'Дек', 0);
    document.getElementById('s-op').textContent = step.op;
    document.getElementById('s-size').textContent = step.dq.length;
    document.getElementById('s-min').textContent = step.dq.length ? Math.min(...step.dq) : '—';
    VizCode.highlight([]);
    VizState.setDesc(step.desc||'');
  }

  // ── MIN QUEUE mode ──────────────────────────────────────
  const MINQ_SEQ = [5, 3, 1, 4, 2, 6, 0, 7, 3];

  function buildMinQSteps() {
    const steps = [];
    const queue = [], dmin = [];
    steps.push({q:[],dm:[],hl:{},dhl:{},op:'—',desc:'Очередь с минимумом: используем монотонную деку для min за O(1).'});
    MINQ_SEQ.forEach((x, idx) => {
      // enqueue x
      const dmHl = {};
      const removed = [];
      while (dmin.length && dmin[dmin.length-1] > x) removed.push(dmin.pop());
      dmin.push(x); queue.push(x);
      dmHl[dmin.length-1] = 'new';
      steps.push({q:[...queue],dm:[...dmin],hl:{[queue.length-1]:'new'},dhl:dmHl,op:`enqueue(${x})`,
        desc:`enqueue(${x}): ${removed.length?`удаляем из деки ${removed} (>${x}), `:''}добавляем ${x}. MIN=${dmin[0]}`});
      // every 3 enqueues, dequeue
      if ((idx+1)%3===0) {
        const front = queue[0];
        const dhl2 = {};
        let dmPop = false;
        if (dmin[0]===front) { dhl2[0]='del'; dmPop=true; }
        steps.push({q:[...queue],dm:[...dmin],hl:{0:'del'},dhl:dhl2,op:`dequeue()`,
          desc:`dequeue() = ${front}. ${dmPop?'Голова деки тоже удалена (совпадает с front).':'Дека без изменений.'}`});
        queue.shift();
        if (dmPop) dmin.shift();
        steps.push({q:[...queue],dm:[...dmin],hl:{},dhl:{},op:`dequeue() done`,
          desc:`Очередь после dequeue. MIN=${dmin[0]??'—'}`});
      }
    });
    return steps;
  }

  function applyMinQStep(step) {
    svg.selectAll('*').remove();
    svg.append('text').attr('x',350).attr('y',55).attr('text-anchor','middle')
      .attr('font-size',12).attr('fill','#585858').text('Основная очередь:');
    renderBoxRow(step.q, step.hl, 'Очередь', -30);
    svg.append('text').attr('x',350).attr('y',200).attr('text-anchor','middle')
      .attr('font-size',12).attr('fill','#585858').text('Монотонная дека (кандидаты на min):');
    renderBoxRow(step.dm, step.dhl, 'Дека', 60);
    if (step.dm.length) {
      const sx = 70;
      svg.append('rect').attr('x',sx-3).attr('y',BOX.y+60-3).attr('width',BOX.w+6).attr('height',BOX.h+6)
        .attr('fill','none').attr('stroke','#5a9a72').attr('stroke-width',2).attr('rx',10).attr('stroke-dasharray','4,3');
      svg.append('text').attr('x',sx+BOX.w/2).attr('y',BOX.y+60+BOX.h+18)
        .attr('text-anchor','middle').attr('font-size',10).attr('fill','#5a9a72').text('MIN');
    }
    document.getElementById('s-op').textContent = step.op;
    document.getElementById('s-size').textContent = step.q.length;
    document.getElementById('s-min').textContent = step.dm.length ? step.dm[0] : '—';
    VizState.setDesc(step.desc||'');
    VizCode.highlight([]);
  }

  const CODES = {
    deque: [
      { id:0, html:'<span class="cm">// Дек на массиве (двусторонняя очередь)</span>' },
      { id:1, html:'push_front(x): deq.prepend(x)  <span class="cm">// O(1)</span>' },
      { id:2, html:'push_back(x):  deq.append(x)   <span class="cm">// O(1)</span>' },
      { id:3, html:'pop_front():   return deq.shift() <span class="cm">// O(1)</span>' },
      { id:4, html:'pop_back():    return deq.pop()  <span class="cm">// O(1)</span>' },
      { id:5, html:'front():       return deq[0]' },
      { id:6, html:'back():        return deq[n-1]' },
    ],
    minq: [
      { id:0, html:'<span class="cm">// Очередь с минимумом (монотонная дека)</span>' },
      { id:1, html:'enqueue(x):' },
      { id:2, html:'  <span class="kw">while</span> dmin not empty <span class="kw">and</span> dmin.back() > x:' },
      { id:3, html:'    dmin.pop_back()' },
      { id:4, html:'  dmin.push_back(x); q.push_back(x)' },
      { id:5, html:'dequeue():' },
      { id:6, html:'  v=q.pop_front()' },
      { id:7, html:'  <span class="kw">if</span> dmin.front()==v: dmin.pop_front()' },
      { id:8, html:'  return v' },
      { id:9, html:'get_min(): return dmin.front()  <span class="cm">// O(1)</span>' },
    ],
  };

  function setMode(m) {
    currentMode = m;
    document.querySelectorAll('[id^=tab-]').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+m)?.classList.add('active');
    VizCode.init(CODES[m]);
    run();
  }

  function run() {
    const steps = currentMode==='deque' ? buildDequeSteps() : buildMinQSteps();
    const applyFn = currentMode==='deque' ? applyDequeStep : applyMinQStep;
    VizAnim.init(steps, applyFn);
    VizAnim.reset();
  }

  VizCode.init(CODES.deque);
  VizAnim.bindUI(run);
  run();
  window.setMode = setMode;
});
