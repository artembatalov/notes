document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  const C_DEFAULT = '#1a1a1a';
  const C_AMBER   = '#c8973e';
  const C_GREEN   = '#5a9a72';
  const C_BLUE    = '#6a9fd4';
  const C_RED     = '#d46a6a';
  const C_BORDER  = '#303030';

  VizCode.init([
    { id: 0,  html: '<span class="cm">// Мастер-теорема: T(n) = aT(n/b) + O(n^d)</span>' },
    { id: 1,  html: '<span class="cm">// a ≥ 1, b > 1, d ≥ 0</span>' },
    { id: 2,  html: '' },
    { id: 3,  html: '<span class="kw">if</span> d < log_b(a):   <span class="cm">// Случай 1</span>' },
    { id: 4,  html: '  T(n) = Θ(n^log_b(a))  <span class="cm">// листья доминируют</span>' },
    { id: 5,  html: '' },
    { id: 6,  html: '<span class="kw">if</span> d == log_b(a):  <span class="cm">// Случай 2</span>' },
    { id: 7,  html: '  T(n) = Θ(n^d · log n)  <span class="cm">// все уровни равны</span>' },
    { id: 8,  html: '' },
    { id: 9,  html: '<span class="kw">if</span> d > log_b(a):   <span class="cm">// Случай 3</span>' },
    { id: 10, html: '  T(n) = Θ(n^d)          <span class="cm">// корень доминирует</span>' },
    { id: 11, html: '' },
    { id: 12, html: '<span class="cm">// Примеры знаменитых алгоритмов:</span>' },
    { id: 13, html: '<span class="cm">// MergeSort:  a=2,b=2,d=1 → log₂2=1=d → Θ(n log n)</span>' },
    { id: 14, html: '<span class="cm">// BinSearch:  a=1,b=2,d=0 → log₂1=0=d → Θ(log n)</span>' },
    { id: 15, html: '<span class="cm">// Strassen:   a=7,b=2,d=2 → log₂7≈2.8>d → Θ(n^2.81)</span>' },
  ]);

  const CASES = [
    {
      x: 20, w: 200, color: C_RED,
      title: 'Случай 1',
      cond: 'd < log_b(a)',
      result: 'T(n) = Θ(n^log_b(a))',
      note: 'листья доминируют',
      example: 'T(n)=8T(n/2)+O(n²)',
      params: 'a=8, b=2, d=2',
      log: 'log₂8 = 3 > d=2',
      answer: 'T(n) = Θ(n³)',
    },
    {
      x: 245, w: 200, color: C_AMBER,
      title: 'Случай 2',
      cond: 'd == log_b(a)',
      result: 'T(n) = Θ(n^d · log n)',
      note: 'все уровни равны',
      example: 'T(n)=2T(n/2)+O(n)',
      params: 'a=2, b=2, d=1',
      log: 'log₂2 = 1 = d=1',
      answer: 'T(n) = Θ(n log n)  ← MergeSort',
    },
    {
      x: 470, w: 210, color: C_GREEN,
      title: 'Случай 3',
      cond: 'd > log_b(a)',
      result: 'T(n) = Θ(n^d)',
      note: 'корень доминирует',
      example: 'T(n)=2T(n/2)+O(n²)',
      params: 'a=2, b=2, d=2',
      log: 'log₂2 = 1 < d=2',
      answer: 'T(n) = Θ(n²)',
    },
  ];

  const ALGOS_TABLE = [
    { name: 'MergeSort',    formula: '2T(n/2)+n', a: 2, b: 2, d: 1, caseN: 2, result: 'Θ(n log n)' },
    { name: 'Binary Search', formula: '1T(n/2)+1', a: 1, b: 2, d: 0, caseN: 2, result: 'Θ(log n)' },
    { name: 'Strassen',     formula: '7T(n/2)+n²', a: 7, b: 2, d: 2, caseN: 1, result: 'Θ(n^2.81)' },
    { name: 'QuickSort avg', formula: '2T(n/2)+n', a: 2, b: 2, d: 1, caseN: 2, result: 'Θ(n log n)' },
  ];

  function drawFormulaPanel(highlightCase, showTable) {
    svg.selectAll('*').remove();

    // Master theorem title
    svg.append('text')
      .attr('x', 350).attr('y', 28)
      .attr('text-anchor', 'middle').attr('fill', '#efefef').attr('font-size', 15).attr('font-weight', 700)
      .text('T(n) = aT(n/b) + O(nᵈ)');

    svg.append('text')
      .attr('x', 350).attr('y', 46)
      .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 11)
      .text('a ≥ 1 подзадач, каждая размером n/b, работа O(nᵈ) на уровень');

    const panelH = showTable ? 130 : 200;
    const panelY = 60;

    CASES.forEach((c, idx) => {
      const active = highlightCase === idx + 1 || highlightCase === 0;
      const alpha = active ? 1 : 0.3;

      // Panel background
      svg.append('rect')
        .attr('x', c.x).attr('y', panelY).attr('width', c.w).attr('height', panelH)
        .attr('rx', 6).attr('fill', highlightCase === idx + 1 ? `${c.color}22` : '#111')
        .attr('stroke', highlightCase === idx + 1 ? c.color : C_BORDER)
        .attr('stroke-width', highlightCase === idx + 1 ? 2 : 1)
        .attr('opacity', alpha);

      const cx = c.x + c.w / 2;

      svg.append('text')
        .attr('x', cx).attr('y', panelY + 20)
        .attr('text-anchor', 'middle').attr('fill', c.color).attr('font-size', 13).attr('font-weight', 700)
        .attr('opacity', alpha).text(c.title);

      svg.append('text')
        .attr('x', cx).attr('y', panelY + 38)
        .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 10)
        .attr('opacity', alpha).text(c.cond);

      svg.append('text')
        .attr('x', cx).attr('y', panelY + 58)
        .attr('text-anchor', 'middle').attr('fill', '#efefef').attr('font-size', 11).attr('font-weight', 600)
        .attr('opacity', alpha).text(c.result);

      svg.append('text')
        .attr('x', cx).attr('y', panelY + 74)
        .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 10)
        .attr('opacity', alpha).text('(' + c.note + ')');

      if (highlightCase === idx + 1) {
        // Example box
        svg.append('rect')
          .attr('x', c.x + 8).attr('y', panelY + 82).attr('width', c.w - 16).attr('height', panelH - 90)
          .attr('rx', 4).attr('fill', '#0a0a0a').attr('stroke', '#242424');

        svg.append('text')
          .attr('x', cx).attr('y', panelY + 97)
          .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 10)
          .text('Пример: ' + c.example);
        svg.append('text')
          .attr('x', cx).attr('y', panelY + 112)
          .attr('text-anchor', 'middle').attr('fill', '#aaa').attr('font-size', 10)
          .text(c.params);
        svg.append('text')
          .attr('x', cx).attr('y', panelY + 127)
          .attr('text-anchor', 'middle').attr('fill', '#aaa').attr('font-size', 10)
          .text(c.log);
        svg.append('text')
          .attr('x', cx).attr('y', panelY + 143)
          .attr('text-anchor', 'middle').attr('fill', c.color).attr('font-size', 11).attr('font-weight', 700)
          .text(c.answer);
      }
    });

    // Algorithms table
    if (showTable) {
      const tableY = panelY + panelH + 20;
      svg.append('text')
        .attr('x', 350).attr('y', tableY)
        .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 11).attr('font-weight', 600)
        .text('Известные алгоритмы:');

      const cols = [20, 160, 320, 420, 520, 620];
      const headers = ['Алгоритм', 'Реккурентность', 'a/b/d', 'Случай', 'Ответ'];
      headers.forEach((h, i) => {
        svg.append('text')
          .attr('x', cols[i]).attr('y', tableY + 18)
          .attr('fill', '#444').attr('font-size', 10).attr('font-weight', 600)
          .text(h);
      });
      svg.append('line')
        .attr('x1', 10).attr('y1', tableY + 22).attr('x2', 690).attr('y2', tableY + 22)
        .attr('stroke', '#242424');

      ALGOS_TABLE.forEach((row, ri) => {
        const y = tableY + 36 + ri * 22;
        const caseColors = [null, C_RED, C_AMBER, C_GREEN];
        svg.append('text').attr('x', cols[0]).attr('y', y).attr('fill', '#888').attr('font-size', 10).text(row.name);
        svg.append('text').attr('x', cols[1]).attr('y', y).attr('fill', '#585858').attr('font-size', 10).attr('font-family', 'monospace').text(row.formula);
        svg.append('text').attr('x', cols[2]).attr('y', y).attr('fill', '#585858').attr('font-size', 10).text(`${row.a}/${row.b}/${row.d}`);
        svg.append('text').attr('x', cols[3]).attr('y', y).attr('fill', caseColors[row.caseN] || '#888').attr('font-size', 10).attr('font-weight', 600).text('Case ' + row.caseN);
        svg.append('text').attr('x', cols[4]).attr('y', y).attr('fill', '#c8973e').attr('font-size', 10).attr('font-family', 'monospace').text(row.result);
      });
    }
  }

  const steps = [
    {
      highlightCase: 0, showTable: false,
      params: '—', log: '—', caseLabel: '—',
      desc: 'Мастер-теорема: T(n) = aT(n/b) + O(nᵈ). Три случая в зависимости от соотношения log_b(a) и d.',
      line: [0, 1],
    },
    {
      highlightCase: 1, showTable: false,
      params: 'a=8, b=2, d=2', log: 'log₂8=3', caseLabel: 'Случай 1',
      desc: 'Случай 1: d < log_b(a). Листья рекурсии доминируют → T(n)=Θ(n^log_b(a)). Пример: 8T(n/2)+n² → Θ(n³)',
      line: [3, 4],
    },
    {
      highlightCase: 2, showTable: false,
      params: 'a=2, b=2, d=1', log: 'log₂2=1', caseLabel: 'Случай 2',
      desc: 'Случай 2: d == log_b(a). Все уровни вносят одинаковый вклад → T(n)=Θ(nᵈ log n). MergeSort: Θ(n log n)',
      line: [6, 7],
    },
    {
      highlightCase: 3, showTable: false,
      params: 'a=2, b=2, d=2', log: 'log₂2=1', caseLabel: 'Случай 3',
      desc: 'Случай 3: d > log_b(a). Корень рекурсии доминирует → T(n)=Θ(nᵈ). Пример: 2T(n/2)+n² → Θ(n²)',
      line: [9, 10],
    },
    {
      highlightCase: 0, showTable: true,
      params: '—', log: '—', caseLabel: 'Таблица',
      desc: 'Сводная таблица известных алгоритмов и их анализа по Мастер-теореме.',
      line: [12, 13, 14, 15],
    },
  ];

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    drawFormulaPanel(step.highlightCase, step.showTable);
    document.getElementById('s-params').textContent = step.params || '—';
    document.getElementById('s-log').textContent = step.log || '—';
    document.getElementById('s-case').textContent = step.caseLabel || '—';
  }

  function run() {
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
