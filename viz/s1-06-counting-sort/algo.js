document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  const INPUT  = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
  const K = 10; // count array size (indices 0..9)
  const N = INPUT.length;

  // Layout constants
  const BOX_W = 44, BOX_H = 34, BOX_GAP = 4;
  const INPUT_Y = 30, OUTPUT_Y = 300;
  const COUNT_BASE_Y = 255, COUNT_MAX_H = 120, BAR_W = 40;
  const START_X = 35;

  function xFor(i) { return START_X + i * (BOX_W + BOX_GAP); }
  function countBarX(i) { return START_X + i * (BOX_W + BOX_GAP); }

  // ── Render helpers ──────────────────────────────────────────

  function renderInputRow(inputHL) {
    const data = INPUT.map((v, i) => ({ v, i }));
    const grp = svg.selectAll('g.inp-box').data(data, d => d.i);
    const enter = grp.enter().append('g').attr('class', 'inp-box');
    enter.append('rect');
    enter.append('text').attr('class', 'inp-val');

    const all = grp.merge(enter);
    all.each(function(d) {
      const x = xFor(d.i);
      const col = inputHL[d.i] === 'active' ? '#c8973e'
                : inputHL[d.i] === 'done'   ? '#3a6a52'
                : '#2a2a2a';
      const stroke = inputHL[d.i] ? '#c8973e' : '#444';
      d3.select(this).select('rect')
        .attr('x', x).attr('y', INPUT_Y)
        .attr('width', BOX_W).attr('height', BOX_H)
        .attr('fill', col).attr('stroke', stroke).attr('rx', 3);
      d3.select(this).select('.inp-val')
        .attr('x', x + BOX_W / 2).attr('y', INPUT_Y + BOX_H / 2 + 4)
        .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', col === '#2a2a2a' ? '#888' : '#111').text(d.v);
    });
    grp.exit().remove();

    // Index labels
    const idxData = INPUT.map((_, i) => i);
    const idxGrp = svg.selectAll('text.inp-idx').data(idxData, d => d);
    idxGrp.enter().append('text').attr('class', 'inp-idx')
      .merge(idxGrp)
      .attr('x', d => xFor(d) + BOX_W / 2).attr('y', INPUT_Y + BOX_H + 12)
      .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#585858')
      .text(d => d);

    // Label
    svg.selectAll('text.inp-label').data([0]).join('text').attr('class', 'inp-label')
      .attr('x', 5).attr('y', INPUT_Y + BOX_H / 2 + 4)
      .attr('font-size', 10).attr('fill', '#585858').attr('font-weight', 600)
      .text('Input:');
  }

  function renderCountBars(countArr, countHL) {
    const maxVal = Math.max(...countArr, 1);
    const data = countArr.map((v, i) => ({ v, i }));

    // Bars
    const grp = svg.selectAll('g.cnt-bar').data(data, d => d.i);
    const enter = grp.enter().append('g').attr('class', 'cnt-bar');
    enter.append('rect');
    enter.append('text').attr('class', 'cnt-val');
    enter.append('text').attr('class', 'cnt-idx');

    const all = grp.merge(enter);
    all.each(function(d) {
      const x = countBarX(d.i);
      const h = Math.max(d.v / maxVal * COUNT_MAX_H, d.v > 0 ? 6 : 0);
      const col = countHL[d.i] === 'active' ? '#c8973e'
                : countHL[d.i] === 'prefix' ? '#6a9fd4'
                : d.v > 0 ? '#5a9a72' : '#2a2a2a';

      d3.select(this).select('rect')
        .attr('x', x).attr('y', COUNT_BASE_Y - h)
        .attr('width', BAR_W).attr('height', Math.max(h, 2))
        .attr('fill', col).attr('stroke', '#444').attr('rx', 3);
      d3.select(this).select('.cnt-val')
        .attr('x', x + BAR_W / 2).attr('y', COUNT_BASE_Y - h - 5)
        .attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 700)
        .attr('fill', col === '#2a2a2a' ? '#444' : (col === '#c8973e' ? '#111' : '#efefef'))
        .text(d.v);
      d3.select(this).select('.cnt-idx')
        .attr('x', x + BAR_W / 2).attr('y', COUNT_BASE_Y + 12)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#585858')
        .text(d.i);
    });
    grp.exit().remove();

    svg.selectAll('text.cnt-label').data([0]).join('text').attr('class', 'cnt-label')
      .attr('x', 5).attr('y', COUNT_BASE_Y - COUNT_MAX_H / 2)
      .attr('font-size', 10).attr('fill', '#585858').attr('font-weight', 600)
      .text('Count:');
  }

  function renderOutputRow(outputArr, outputHL) {
    const data = outputArr.map((v, i) => ({ v, i }));
    const grp = svg.selectAll('g.out-box').data(data, d => d.i);
    const enter = grp.enter().append('g').attr('class', 'out-box');
    enter.append('rect');
    enter.append('text').attr('class', 'out-val');

    const all = grp.merge(enter);
    all.each(function(d) {
      const x = xFor(d.i);
      const isEmpty = d.v === null;
      const col = isEmpty ? '#1a1a1a'
                : outputHL[d.i] === 'placed' ? '#5a9a72'
                : '#3a6a52';
      const stroke = outputHL[d.i] ? '#5a9a72' : '#333';

      d3.select(this).select('rect')
        .attr('x', x).attr('y', OUTPUT_Y)
        .attr('width', BOX_W).attr('height', BOX_H)
        .attr('fill', col).attr('stroke', stroke).attr('rx', 3);
      d3.select(this).select('.out-val')
        .attr('x', x + BOX_W / 2).attr('y', OUTPUT_Y + BOX_H / 2 + 4)
        .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 700)
        .attr('fill', isEmpty ? '#333' : '#111')
        .text(isEmpty ? '' : d.v);
    });
    grp.exit().remove();

    svg.selectAll('text.out-label').data([0]).join('text').attr('class', 'out-label')
      .attr('x', 5).attr('y', OUTPUT_Y + BOX_H / 2 + 4)
      .attr('font-size', 10).attr('fill', '#585858').attr('font-weight', 600)
      .text('Output:');
  }

  // ── Pseudocode ──────────────────────────────────────────────

  VizCode.init([
    { id: 0,  html: '<span class="cm">// Фаза 1: Подсчёт</span>' },
    { id: 1,  html: '<span class="kw">for</span> i = <span class="num">0</span> to n-1:' },
    { id: 2,  html: '  count[input[i]]++' },
    { id: 3,  html: '<span class="cm">// Фаза 2: Префиксные суммы</span>' },
    { id: 4,  html: '<span class="kw">for</span> i = <span class="num">1</span> to k-1:' },
    { id: 5,  html: '  count[i] += count[i-1]' },
    { id: 6,  html: '<span class="cm">// Фаза 3: Расстановка</span>' },
    { id: 7,  html: '<span class="kw">for</span> i = n-1 downto <span class="num">0</span>:' },
    { id: 8,  html: '  val = input[i]' },
    { id: 9,  html: '  pos = count[val] - <span class="num">1</span>' },
    { id: 10, html: '  output[pos] = val' },
    { id: 11, html: '  count[val]--' },
  ]);

  // ── Step generation ─────────────────────────────────────────

  function buildSteps() {
    const steps = [];
    const countArr = new Array(K).fill(0);
    const outputArr = new Array(N).fill(null);

    function push(opts) {
      steps.push({
        inputHL: opts.inputHL || {},
        countArr: [...countArr],
        countHL: opts.countHL || {},
        outputArr: [...outputArr],
        outputHL: opts.outputHL || {},
        line: opts.line || [],
        desc: opts.desc || '',
        phase: opts.phase || '—',
        elem: opts.elem || '—',
      });
    }

    // Initial
    push({ desc: 'Готово к запуску. Массив input, count[0..9]=0, output пуст.', phase: 'Инициализация', elem: '—' });

    // Phase 1: Count
    for (let i = 0; i < N; i++) {
      const val = INPUT[i];
      push({
        inputHL: { [i]: 'active' },
        countHL: { [val]: 'active' },
        line: [1, 2],
        desc: `input[${i}]=<b>${val}</b> → count[${val}]++`,
        phase: '1: Подсчёт', elem: `input[${i}]=${val}`,
      });
      countArr[val]++;
      push({
        inputHL: { [i]: 'done' },
        countHL: { [val]: 'active' },
        line: [2],
        desc: `count[${val}] теперь равен <b>${countArr[val]}</b>`,
        phase: '1: Подсчёт', elem: `count[${val}]=${countArr[val]}`,
      });
    }

    // Phase 2: Prefix sums
    for (let i = 1; i < K; i++) {
      push({
        countHL: { [i - 1]: 'prefix', [i]: 'active' },
        line: [4, 5],
        desc: `Префикс: count[${i}] += count[${i - 1}] = ${countArr[i]} + ${countArr[i - 1]}`,
        phase: '2: Префикс. суммы', elem: `i=${i}`,
      });
      countArr[i] += countArr[i - 1];
      push({
        countHL: { [i]: 'active' },
        line: [5],
        desc: `count[${i}] = <b>${countArr[i]}</b>`,
        phase: '2: Префикс. суммы', elem: `count[${i}]=${countArr[i]}`,
      });
    }

    // Phase 3: Place
    for (let i = N - 1; i >= 0; i--) {
      const val = INPUT[i];
      const pos = countArr[val] - 1;
      push({
        inputHL: { [i]: 'active' },
        countHL: { [val]: 'active' },
        line: [7, 8, 9],
        desc: `input[${i}]=<b>${val}</b>, pos=count[${val}]-1=<b>${pos}</b>`,
        phase: '3: Расстановка', elem: `val=${val}, pos=${pos}`,
      });
      outputArr[pos] = val;
      countArr[val]--;
      push({
        inputHL: { [i]: 'done' },
        countHL: { [val]: 'active' },
        outputHL: { [pos]: 'placed' },
        line: [10, 11],
        desc: `output[${pos}] = <b>${val}</b>, count[${val}]-- = ${countArr[val]}`,
        phase: '3: Расстановка', elem: `output[${pos}]=${val}`,
      });
    }

    // Final
    push({
      outputHL: Object.fromEntries(outputArr.map((_, i) => [i, 'placed'])),
      line: [],
      desc: '<span class="ok">Массив отсортирован!</span>',
      phase: 'Готово', elem: '—',
    });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderInputRow(step.inputHL || {});
    renderCountBars(step.countArr || new Array(K).fill(0), step.countHL || {});
    renderOutputRow(step.outputArr || new Array(N).fill(null), step.outputHL || {});
    document.getElementById('s-phase').textContent = step.phase || '—';
    document.getElementById('s-elem').textContent = step.elem || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
