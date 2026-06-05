document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  const scenarios = [
    {
      label: 'O(1)',
      color: '#3a6a52',
      cx: 105,
      desc: 'O(1) — константная память: одна переменная-счётчик, независимо от n.',
      mem: '1 ячейка',
      example: 'iterativeSum',
    },
    {
      label: 'O(log₂n)',
      color: '#6a9fd4',
      cx: 245,
      desc: 'O(log₂n) — логарифмическая память: стек рекурсии глубиной log₂(16)=4.',
      mem: '4 фрейма стека',
      example: 'binarySearch',
    },
    {
      label: 'O(n)',
      color: '#c8973e',
      cx: 420,
      desc: 'O(n) — линейная память: массив из n=16 ячеек для копии данных.',
      mem: '16 ячеек',
      example: 'arrayCopy',
    },
    {
      label: 'O(n²)',
      color: '#d46a6a',
      cx: 595,
      desc: 'O(n²) — квадратичная память: матрица n×n=256 ячеек.',
      mem: '256 ячеек (n×n)',
      example: 'matrix',
    },
  ];

  function drawScenario(g, s, active) {
    const opacity = active === -1 ? 0.35 : (active === scenarios.indexOf(s) ? 1 : 0.3);
    const strokeCol = active === scenarios.indexOf(s) ? '#c8973e' : s.color;
    const strokeW   = active === scenarios.indexOf(s) ? 2.5 : 1;

    g.attr('opacity', opacity);

    // Title label
    g.selectAll('.sc-title').data([0]).join('text')
      .attr('class', 'sc-title')
      .attr('x', s.cx).attr('y', 30)
      .attr('text-anchor', 'middle').attr('font-size', 13).attr('font-weight', 700)
      .attr('fill', s.color).text(s.label);

    // Draw memory representation
    if (s.label === 'O(1)') {
      // One large block
      g.selectAll('.mem-block').data([0]).join('rect')
        .attr('class', 'mem-block')
        .attr('x', s.cx - 40).attr('y', 60)
        .attr('width', 80).attr('height', 40)
        .attr('fill', s.color).attr('stroke', strokeCol).attr('stroke-width', strokeW)
        .attr('rx', 4);
      g.selectAll('.mem-label').data([0]).join('text')
        .attr('class', 'mem-label')
        .attr('x', s.cx).attr('y', 125)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888')
        .text('1 переменная');
    } else if (s.label === 'O(log₂n)') {
      // 4 stacked frames
      const frames = [0, 1, 2, 3];
      g.selectAll('.mem-block').data(frames).join('rect')
        .attr('class', 'mem-block')
        .attr('x', s.cx - 35).attr('y', d => 55 + d * 28)
        .attr('width', 70).attr('height', 24)
        .attr('fill', s.color).attr('stroke', strokeCol).attr('stroke-width', strokeW)
        .attr('rx', 3);
      g.selectAll('.mem-lbl-inner').data(frames).join('text')
        .attr('class', 'mem-lbl-inner')
        .attr('x', s.cx).attr('y', d => 55 + d * 28 + 14)
        .attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#111')
        .text(d => `frame ${d}`);
      g.selectAll('.mem-label').data([0]).join('text')
        .attr('class', 'mem-label')
        .attr('x', s.cx).attr('y', 175)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888')
        .text('4 фрейма стека');
    } else if (s.label === 'O(n)') {
      // Row of 8 small squares (representing 16 cells, 2 rows)
      const cells = Array.from({ length: 8 }, (_, i) => i);
      const row2  = Array.from({ length: 8 }, (_, i) => i);
      const startX = s.cx - 4 * 28 + 14;
      g.selectAll('.mem-block-r1').data(cells).join('rect')
        .attr('class', 'mem-block-r1')
        .attr('x', d => startX + d * 28).attr('y', 55)
        .attr('width', 24).attr('height', 24)
        .attr('fill', s.color).attr('stroke', strokeCol).attr('stroke-width', strokeW)
        .attr('rx', 2);
      g.selectAll('.mem-block-r2').data(row2).join('rect')
        .attr('class', 'mem-block-r2')
        .attr('x', d => startX + d * 28).attr('y', 83)
        .attr('width', 24).attr('height', 24)
        .attr('fill', s.color).attr('stroke', strokeCol).attr('stroke-width', strokeW)
        .attr('rx', 2);
      g.selectAll('.mem-label').data([0]).join('text')
        .attr('class', 'mem-label')
        .attr('x', s.cx).attr('y', 128)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888')
        .text('16 ячеек (n)');
    } else if (s.label === 'O(n²)') {
      // 4×4 grid of small squares (representing 16 of 256)
      const startX = s.cx - 2 * 22;
      const startY = 52;
      const grid = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) grid.push({ r, c });
      g.selectAll('.mem-block').data(grid).join('rect')
        .attr('class', 'mem-block')
        .attr('x', d => startX + d.c * 21).attr('y', d => startY + d.r * 21)
        .attr('width', 18).attr('height', 18)
        .attr('fill', s.color).attr('stroke', strokeCol).attr('stroke-width', strokeW)
        .attr('rx', 2);
      g.selectAll('.mem-label').data([0]).join('text')
        .attr('class', 'mem-label')
        .attr('x', s.cx).attr('y', 145)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#888')
        .text('n²=256 ячеек');
    }
  }

  // Create groups for each scenario
  const scGroups = scenarios.map(() => svg.append('g'));

  function renderAll(active) {
    scenarios.forEach((s, i) => {
      drawScenario(scGroups[i], s, active);
    });
  }

  VizCode.init([
    { id: 0, html: '<span class="cm">// O(1) — итеративная сумма</span>' },
    { id: 1, html: '<span class="kw">function</span> <span class="fn">sum</span>(A, n):' },
    { id: 2, html: '  s = <span class="num">0</span>  <span class="cm">// одна переменная</span>' },
    { id: 3, html: '  <span class="kw">for</span> i = <span class="num">0</span> to n-1: s += A[i]' },
    { id: 4, html: '  <span class="kw">return</span> s' },
    { id: 5, html: '<span class="cm">// O(log n) — рекурсивный бинпоиск</span>' },
    { id: 6, html: '<span class="kw">function</span> <span class="fn">bsearch</span>(A, lo, hi, x):' },
    { id: 7, html: '  mid = (lo+hi)/<span class="num">2</span>  <span class="cm">// стек глубиной log n</span>' },
    { id: 8, html: '<span class="cm">// O(n) — копия массива</span>' },
    { id: 9, html: '  B = <span class="kw">new</span> Array(n)' },
    { id: 10, html: '<span class="cm">// O(n²) — матрица смежности</span>' },
    { id: 11, html: '  M = <span class="kw">new</span> Array(n × n)' },
  ]);

  function buildSteps() {
    return [
      { active: -1, line: [], desc: 'Все сценарии видны. Запустим — сравним по очереди.', scenario: '—', mem: '—' },
      { active: 0, line: [0, 1, 2, 3, 4], desc: scenarios[0].desc, scenario: 'O(1)', mem: scenarios[0].mem },
      { active: 1, line: [5, 6, 7], desc: scenarios[1].desc, scenario: 'O(log₂n)', mem: scenarios[1].mem },
      { active: 2, line: [8, 9], desc: scenarios[2].desc, scenario: 'O(n)', mem: scenarios[2].mem },
      { active: 3, line: [10, 11], desc: scenarios[3].desc, scenario: 'O(n²)', mem: scenarios[3].mem },
      {
        active: -1, line: [0, 5, 8, 10],
        desc: 'При n=16: O(1)=1 ячейка, O(log n)=4, O(n)=16, O(n²)=256. Чем меньше — тем лучше.',
        scenario: 'Все', mem: 'при n=16',
      },
    ];
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderAll(step.active);
    document.getElementById('s-scenario').textContent = step.scenario || '—';
    document.getElementById('s-mem').textContent = step.mem || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
