document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 360');

  const L = 55, R = 680, T = 20, B = 325;
  const W = R - L, H = B - T;
  const N_MAX = 20, T_MAX = 200;

  const curves = [
    { label: 'O(1)',       color: '#efefef', fn: n => 1 },
    { label: 'O(log₂n)',   color: '#6a9fd4', fn: n => Math.log2(n) },
    { label: 'O(n)',       color: '#c8973e', fn: n => n },
    { label: 'O(n·log₂n)',color: '#5a9a72', fn: n => n * Math.log2(n) },
    { label: 'O(n²)',      color: '#d46a6a', fn: n => n * n },
    { label: 'O(2ⁿ)',      color: '#a06ad4', fn: n => Math.min(Math.pow(2, n), T_MAX) },
  ];

  const tVal20 = [
    '1',
    Math.log2(20).toFixed(2),
    '20',
    (20 * Math.log2(20)).toFixed(1),
    '400',
    '> 200 (cap)',
  ];

  function xScale(n)  { return L + (n - 1) / (N_MAX - 1) * W; }
  function yScale(t)  { return B - Math.min(t, T_MAX) / T_MAX * H; }

  function buildAxes(g) {
    // X axis
    g.append('line').attr('x1', L).attr('y1', B).attr('x2', R).attr('y2', B)
      .attr('stroke', '#444').attr('stroke-width', 1);
    // Y axis
    g.append('line').attr('x1', L).attr('y1', T).attr('x2', L).attr('y2', B)
      .attr('stroke', '#444').attr('stroke-width', 1);
    // X ticks
    for (let n = 5; n <= N_MAX; n += 5) {
      const x = xScale(n);
      g.append('line').attr('x1', x).attr('y1', B).attr('x2', x).attr('y2', B + 4)
        .attr('stroke', '#444');
      g.append('text').attr('x', x).attr('y', B + 14)
        .attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', '#585858').text(n);
    }
    // Y ticks
    for (let t = 50; t <= T_MAX; t += 50) {
      const y = yScale(t);
      g.append('line').attr('x1', L - 4).attr('y1', y).attr('x2', L).attr('y2', y)
        .attr('stroke', '#444');
      g.append('text').attr('x', L - 8).attr('y', y + 3)
        .attr('text-anchor', 'end').attr('font-size', 10).attr('fill', '#585858').text(t);
    }
    // Axis labels
    g.append('text').attr('x', (L + R) / 2).attr('y', B + 30)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#585858').text('n');
    g.append('text').attr('x', L - 38).attr('y', (T + B) / 2)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#585858')
      .attr('transform', `rotate(-90,${L - 38},${(T + B) / 2})`).text('T(n)');
  }

  function buildPolylinePoints(fn) {
    const pts = [];
    for (let n = 1; n <= N_MAX; n++) {
      pts.push(`${xScale(n)},${yScale(fn(n))}`);
    }
    return pts.join(' ');
  }

  svg.selectAll('*').remove();
  const axesG = svg.append('g');
  buildAxes(axesG);

  const curveGroups = curves.map((c, i) => {
    const g = svg.append('g').attr('opacity', 0);
    g.append('polyline')
      .attr('points', buildPolylinePoints(c.fn))
      .attr('fill', 'none')
      .attr('stroke', c.color)
      .attr('stroke-width', 2);
    // Label at n=20
    const x20 = xScale(20);
    const y20 = yScale(c.fn(20));
    g.append('text')
      .attr('x', x20 + 4).attr('y', y20 + 3)
      .attr('font-size', 10).attr('fill', c.color).text(c.label);
    return g;
  });

  const vlineSel = svg.append('line')
    .attr('x1', xScale(16)).attr('y1', T)
    .attr('x2', xScale(16)).attr('y2', B)
    .attr('stroke', '#efefef').attr('stroke-width', 1)
    .attr('stroke-dasharray', '4 3')
    .attr('opacity', 0);
  svg.append('text')
    .attr('id', 'vline-lbl')
    .attr('x', xScale(16) + 3).attr('y', T + 10)
    .attr('font-size', 10).attr('fill', '#efefef')
    .attr('opacity', 0)
    .text('n=16');

  VizCode.init([
    { id: 0, html: '<span class="cm">// Нотация О-большое</span>' },
    { id: 1, html: '<span class="kw">f</span>(n) = O(g(n)) если ∃c>0, n₀:' },
    { id: 2, html: '  f(n) ≤ c·g(n) ∀n≥n₀' },
    { id: 3, html: '<span class="cm">// Нотация Ω-омега</span>' },
    { id: 4, html: '<span class="kw">f</span>(n) = Ω(g(n)) если ∃c>0, n₀:' },
    { id: 5, html: '  f(n) ≥ c·g(n) ∀n≥n₀' },
    { id: 6, html: '<span class="cm">// Нотация Θ-тета</span>' },
    { id: 7, html: '<span class="kw">f</span>(n) = Θ(g(n)) если f=O(g) И f=Ω(g)' },
  ]);

  function buildSteps() {
    const steps = [];

    // Step 0: axes only
    steps.push({
      visible: [],
      showVline: false,
      line: [],
      desc: 'Оси готовы. Будем добавлять классы сложности по одному.',
      fn: '—', val: '—',
    });

    // Steps 1–6: add one curve each
    for (let i = 0; i < 6; i++) {
      steps.push({
        visible: Array.from({ length: i + 1 }, (_, k) => k),
        showVline: false,
        line: [1, 2],
        desc: `Добавляем класс <b>${curves[i].label}</b>.`,
        fn: curves[i].label,
        val: tVal20[i],
      });
    }

    // Step 7: all + vertical line
    steps.push({
      visible: [0, 1, 2, 3, 4, 5],
      showVline: true,
      line: [1, 2, 4, 5, 7],
      desc: 'Все классы показаны. Вертикальная линия n=16 позволяет сравнить значения.',
      fn: 'Все', val: '—',
    });

    // Step 8: conclusion
    steps.push({
      visible: [0, 1, 2, 3, 4, 5],
      showVline: true,
      line: [7],
      desc: 'Выбирайте алгоритм с наименьшим классом сложности. O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).',
      fn: 'Предпочтение', val: 'O(1) лучше',
    });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    curveGroups.forEach((g, i) => {
      g.attr('opacity', step.visible.includes(i) ? 1 : 0);
    });
    const vOp = step.showVline ? 1 : 0;
    vlineSel.attr('opacity', vOp);
    svg.select('#vline-lbl').attr('opacity', vOp);
    document.getElementById('s-fn').textContent = step.fn || '—';
    document.getElementById('s-val').textContent = step.val || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
