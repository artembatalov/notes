document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  const C_DEFAULT = '#2a2a2a';
  const C_AMBER   = '#c8973e';
  const C_GREEN   = '#5a9a72';
  const C_BLUE    = '#6a9fd4';
  const C_RED     = '#d46a6a';

  let currentMode = 'jump';

  const PSEUDOCODES = {
    jump: [
      { id: 0,  html: '<span class="cm">// Кузнечик: прыжки на 1 или 2 клетки</span>' },
      { id: 1,  html: '<span class="cm">// cost[i] — стоимость приземления на i</span>' },
      { id: 2,  html: '<span class="kw">function</span> <span class="fn">minCost</span>(cost, n):' },
      { id: 3,  html: '  dp[0] = cost[0]' },
      { id: 4,  html: '  dp[1] = cost[1]' },
      { id: 5,  html: '  <span class="kw">for</span> i = 2 to n-1:' },
      { id: 6,  html: '    dp[i] = min(dp[i-1], dp[i-2]) + cost[i]' },
      { id: 7,  html: '  <span class="kw">return</span> min(dp[n-1], dp[n-2])' },
    ],
    knap: [
      { id: 0,  html: '<span class="cm">// 0/1 Рюкзак: n предметов, вместимость W</span>' },
      { id: 1,  html: '<span class="kw">function</span> <span class="fn">knapsack</span>(items, n, W):' },
      { id: 2,  html: '  dp[0][0..W] = 0  <span class="cm">// база</span>' },
      { id: 3,  html: '  <span class="kw">for</span> i = 1 to n:' },
      { id: 4,  html: '    <span class="kw">for</span> w = 0 to W:' },
      { id: 5,  html: '      dp[i][w] = dp[i-1][w]  <span class="cm">// не берём</span>' },
      { id: 6,  html: '      <span class="kw">if</span> w >= items[i].w:' },
      { id: 7,  html: '        dp[i][w] = max(dp[i][w], dp[i-1][w-wi] + vi)' },
      { id: 8,  html: '  <span class="kw">return</span> dp[n][W]' },
    ],
    lis: [
      { id: 0,  html: '<span class="cm">// НВП: Наибольшая Возрастающая Подпоследовательность</span>' },
      { id: 1,  html: '<span class="kw">function</span> <span class="fn">lis</span>(arr, n):' },
      { id: 2,  html: '  dp[i] = 1 <span class="kw">for</span> all i  <span class="cm">// минимум сам себя</span>' },
      { id: 3,  html: '  <span class="kw">for</span> i = 1 to n-1:' },
      { id: 4,  html: '    <span class="kw">for</span> j = 0 to i-1:' },
      { id: 5,  html: '      <span class="kw">if</span> arr[j] < arr[i]:' },
      { id: 6,  html: '        dp[i] = max(dp[i], dp[j]+1)' },
      { id: 7,  html: '  <span class="kw">return</span> max(dp)' },
    ],
  };

  function setMode(mode) {
    currentMode = mode;
    ['jump', 'knap', 'lis'].forEach(m => {
      document.getElementById('tab-' + m).classList.toggle('active', m === mode);
    });
    VizCode.init(PSEUDOCODES[mode]);
    run();
  }
  window.setMode = setMode;

  // ── MODE: JUMP (Grasshopper) ──────────────────────────────
  const COSTS = [0, 3, 2, 5, 1, 4, 2, 3];
  const JUMP_N = COSTS.length;

  function buildStepsJump() {
    const steps = [];
    const dp = new Array(JUMP_N).fill(Infinity);
    const dpComputed = new Array(JUMP_N).fill(false);
    dp[0] = COSTS[0];
    dp[1] = COSTS[1];
    dpComputed[0] = true;
    dpComputed[1] = true;

    function push(curIdx, hlCells, desc, line) {
      steps.push({
        mode: 'jump',
        dp: [...dp],
        dpComputed: [...dpComputed],
        curIdx,
        hlCells: { ...hlCells },
        desc, line: Array.isArray(line) ? line : [line],
        stepI: curIdx,
        dpVal: dp[curIdx],
      });
    }

    push(0, { 0: C_GREEN, 1: C_GREEN }, 'База: dp[0]=0, dp[1]=3', [3, 4]);

    for (let i = 2; i < JUMP_N; i++) {
      const colors = {};
      colors[i] = C_AMBER;
      colors[i - 1] = C_BLUE;
      colors[i - 2] = C_BLUE;
      push(i, colors,
        `i=${i}: dp[${i}] = min(dp[${i-1}]=${dp[i-1]}, dp[${i-2}]=${dp[i-2]}) + cost[${i}]=${COSTS[i]}`,
        [5, 6]);
      dp[i] = Math.min(dp[i - 1], dp[i - 2]) + COSTS[i];
      dpComputed[i] = true;
      const after = { ...colors };
      after[i] = C_GREEN;
      push(i, after, `dp[${i}] = ${dp[i]}`, [6]);
    }

    const finalColors = {};
    for (let i = 0; i < JUMP_N; i++) finalColors[i] = C_GREEN;
    push(JUMP_N - 1, finalColors,
      `<span class="ok">Минимальная стоимость = ${Math.min(dp[JUMP_N - 1], dp[JUMP_N - 2])}</span>`, [7]);

    return steps;
  }

  function renderJump(step) {
    svg.selectAll('*').remove();
    const BOX_W = 64, BOX_H = 44, GAP = 8, startX = 30, Y = 120;

    for (let i = 0; i < JUMP_N; i++) {
      const x = startX + i * (BOX_W + GAP);
      const color = step.hlCells[i] || C_DEFAULT;
      svg.append('rect')
        .attr('x', x).attr('y', Y).attr('width', BOX_W).attr('height', BOX_H)
        .attr('rx', 5).attr('fill', color).attr('stroke', '#444');
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', Y + BOX_H / 2 - 6)
        .attr('text-anchor', 'middle').attr('fill', '#efefef').attr('font-size', 11)
        .text('cost=' + COSTS[i]);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', Y + BOX_H / 2 + 8)
        .attr('text-anchor', 'middle').attr('fill', '#ccc').attr('font-size', 12).attr('font-weight', 700)
        .text('i=' + i);

      // dp value below
      if (step.dpComputed[i]) {
        svg.append('text')
          .attr('x', x + BOX_W / 2).attr('y', Y + BOX_H + 20)
          .attr('text-anchor', 'middle').attr('fill', '#c8973e').attr('font-size', 12).attr('font-weight', 700)
          .text('dp=' + step.dp[i]);
      }
    }

    // Draw arcs for current cell
    if (step.curIdx >= 2) {
      const i = step.curIdx;
      const x_i = startX + i * (BOX_W + GAP) + BOX_W / 2;
      const x_i1 = startX + (i - 1) * (BOX_W + GAP) + BOX_W / 2;
      const x_i2 = startX + (i - 2) * (BOX_W + GAP) + BOX_W / 2;
      // Arc from i-1
      const arcY = Y - 20;
      svg.append('path')
        .attr('d', `M ${x_i1} ${Y} Q ${(x_i1 + x_i) / 2} ${arcY} ${x_i} ${Y}`)
        .attr('fill', 'none').attr('stroke', C_BLUE).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
      svg.append('path')
        .attr('d', `M ${x_i2} ${Y} Q ${(x_i2 + x_i) / 2} ${arcY - 15} ${x_i} ${Y}`)
        .attr('fill', 'none').attr('stroke', C_BLUE).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    }

    // Title
    svg.append('text')
      .attr('x', 350).attr('y', 50)
      .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 13)
      .text('Кузнечик: прыжки на 1 или 2 клетки');
  }

  // ── MODE: KNAPSACK ───────────────────────────────────────
  const ITEMS = [
    { w: 2, v: 3 },
    { w: 3, v: 4 },
    { w: 1, v: 2 },
    { w: 4, v: 5 },
  ];
  const KN = ITEMS.length, KW = 5;

  function buildStepsKnap() {
    const steps = [];
    const dp = Array.from({ length: KN + 1 }, () => new Array(KW + 1).fill(0));

    function push(ci, cw, hlCells, desc, line) {
      steps.push({
        mode: 'knap',
        dp: dp.map(r => [...r]),
        curI: ci, curW: cw,
        hlCells, desc, line: Array.isArray(line) ? line : [line],
        stepI: ci, dpVal: dp[ci] ? dp[ci][cw] : '—',
      });
    }

    push(0, 0, [], 'База: dp[0][w]=0 для всех w', [2]);

    for (let i = 1; i <= KN; i++) {
      for (let w = 0; w <= KW; w++) {
        dp[i][w] = dp[i - 1][w];
        const hl = [[i, w], [i - 1, w]];
        if (w >= ITEMS[i - 1].w) {
          dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - ITEMS[i - 1].w] + ITEMS[i - 1].v);
          hl.push([i - 1, w - ITEMS[i - 1].w]);
        }
        push(i, w, hl,
          `i=${i}(w=${ITEMS[i-1].w},v=${ITEMS[i-1].v}), cap=${w}: dp[${i}][${w}]=${dp[i][w]}`,
          [4, 5, 6, 7]);
      }
    }

    push(KN, KW, [[KN, KW]],
      `<span class="ok">Ответ: dp[${KN}][${KW}]=${dp[KN][KW]}</span>`, [8]);

    return steps;
  }

  function renderKnap(step) {
    svg.selectAll('*').remove();
    const CELL_W = 50, CELL_H = 34;
    const startX = 80, startY = 80;
    const hlSet = new Set((step.hlCells || []).map(([r, c]) => r + ',' + c));

    // Col headers (capacities)
    for (let w = 0; w <= KW; w++) {
      svg.append('text')
        .attr('x', startX + w * CELL_W + CELL_W / 2).attr('y', startY - 12)
        .attr('text-anchor', 'middle').attr('fill', '#585858').attr('font-size', 11)
        .text('W=' + w);
    }

    // Row headers (items)
    for (let i = 0; i <= KN; i++) {
      svg.append('text')
        .attr('x', startX - 10).attr('y', startY + i * CELL_H + CELL_H / 2 + 2)
        .attr('text-anchor', 'end').attr('fill', '#585858').attr('font-size', 10)
        .text(i === 0 ? 'i=0' : `i=${i}(${ITEMS[i-1].w},${ITEMS[i-1].v})`);
    }

    for (let i = 0; i <= KN; i++) {
      for (let w = 0; w <= KW; w++) {
        const x = startX + w * CELL_W;
        const y = startY + i * CELL_H;
        const key = i + ',' + w;
        const isHl = hlSet.has(key);
        const isCur = step.curI === i && step.curW === w;
        const color = isCur ? C_AMBER : isHl ? C_BLUE : C_DEFAULT;
        svg.append('rect')
          .attr('x', x).attr('y', y).attr('width', CELL_W - 1).attr('height', CELL_H - 1)
          .attr('rx', 2).attr('fill', color).attr('stroke', '#333');
        if (step.dp[i]) {
          svg.append('text')
            .attr('x', x + CELL_W / 2).attr('y', y + CELL_H / 2)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('fill', '#efefef').attr('font-size', 12).attr('font-weight', 600)
            .text(step.dp[i][w]);
        }
      }
    }

    svg.append('text')
      .attr('x', 350).attr('y', 38)
      .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 13)
      .text('Рюкзак 0/1: 4 предмета, вместимость W=5');
  }

  // ── MODE: LIS ─────────────────────────────────────────────
  const LIS_ARR = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
  const LIS_N = LIS_ARR.length;

  function buildStepsLIS() {
    const steps = [];
    const dp = new Array(LIS_N).fill(1);
    const dpComputed = new Array(LIS_N).fill(false);
    dpComputed[0] = true;

    function push(curIdx, hlCells, arrows, desc, line) {
      steps.push({
        mode: 'lis',
        dp: [...dp],
        dpComputed: [...dpComputed],
        curIdx, hlCells: { ...hlCells }, arrows,
        desc, line: Array.isArray(line) ? line : [line],
        stepI: curIdx, dpVal: dp[curIdx],
      });
    }

    push(0, { 0: C_GREEN }, [], 'База: dp[0]=1 (каждый элемент — НВП длины 1)', [2]);

    for (let i = 1; i < LIS_N; i++) {
      const colors = {}; colors[i] = C_AMBER;
      const arrows = [];
      push(i, colors, [], `i=${i}, arr[${i}]=${LIS_ARR[i]}: ищем j < i где arr[j] < arr[i]`, [3, 4]);

      for (let j = 0; j < i; j++) {
        const jColors = { ...colors }; jColors[j] = C_BLUE;
        push(i, jColors, arrows.concat([[j, i]]),
          `j=${j}: arr[${j}]=${LIS_ARR[j]} < arr[${i}]=${LIS_ARR[i]}? ${LIS_ARR[j] < LIS_ARR[i] ? 'Да' : 'Нет'}`,
          [4, 5]);
        if (LIS_ARR[j] < LIS_ARR[i]) {
          dp[i] = Math.max(dp[i], dp[j] + 1);
          arrows.push([j, i]);
        }
      }

      dpComputed[i] = true;
      const afterColors = {};
      for (let k = 0; k <= i; k++) afterColors[k] = C_GREEN;
      push(i, afterColors, arrows, `dp[${i}] = ${dp[i]}`, [6]);
    }

    const maxLIS = Math.max(...dp);
    const finalColors = {};
    for (let k = 0; k < LIS_N; k++) finalColors[k] = C_GREEN;
    push(LIS_N - 1, finalColors, [],
      `<span class="ok">НВП длина = ${maxLIS}</span>`, [7]);

    return steps;
  }

  function renderLIS(step) {
    svg.selectAll('*').remove();
    const BOX_W = 44, BOX_H = 40, GAP = 5;
    const startX = (700 - LIS_N * (BOX_W + GAP) + GAP) / 2;
    const Y = 120;

    for (let i = 0; i < LIS_N; i++) {
      const x = startX + i * (BOX_W + GAP);
      const color = step.hlCells[i] || C_DEFAULT;
      svg.append('rect')
        .attr('x', x).attr('y', Y).attr('width', BOX_W).attr('height', BOX_H)
        .attr('rx', 4).attr('fill', color).attr('stroke', '#444');
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', Y + BOX_H / 2 - 4)
        .attr('text-anchor', 'middle').attr('fill', '#efefef').attr('font-size', 13).attr('font-weight', 700)
        .text(LIS_ARR[i]);
      svg.append('text')
        .attr('x', x + BOX_W / 2).attr('y', Y + BOX_H / 2 + 10)
        .attr('text-anchor', 'middle').attr('fill', '#aaa').attr('font-size', 9)
        .text('i=' + i);
      if (step.dpComputed[i]) {
        svg.append('text')
          .attr('x', x + BOX_W / 2).attr('y', Y + BOX_H + 18)
          .attr('text-anchor', 'middle').attr('fill', '#c8973e').attr('font-size', 12).attr('font-weight', 700)
          .text('dp=' + step.dp[i]);
      }
    }

    // Draw arrows
    (step.arrows || []).forEach(([from, to]) => {
      const x1 = startX + from * (BOX_W + GAP) + BOX_W / 2;
      const x2 = startX + to * (BOX_W + GAP) + BOX_W / 2;
      const arcY = Y - 30;
      svg.append('path')
        .attr('d', `M ${x1} ${Y} Q ${(x1 + x2) / 2} ${arcY} ${x2} ${Y}`)
        .attr('fill', 'none').attr('stroke', C_BLUE).attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '3 2')
        .attr('marker-end', 'none');
    });

    svg.append('text')
      .attr('x', 350).attr('y', 50)
      .attr('text-anchor', 'middle').attr('fill', '#888').attr('font-size', 13)
      .text('НВП: Наибольшая Возрастающая Подпоследовательность');
  }

  // ── Dispatch ──────────────────────────────────────────────
  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    document.getElementById('s-task').textContent =
      step.mode === 'jump' ? 'Кузнечик' : step.mode === 'knap' ? 'Рюкзак 0/1' : 'НВП (LIS)';
    document.getElementById('s-i').textContent = step.stepI !== undefined ? step.stepI : '—';
    document.getElementById('s-dp').textContent = step.dpVal !== undefined ? step.dpVal : '—';

    if (step.mode === 'jump') renderJump(step);
    else if (step.mode === 'knap') renderKnap(step);
    else renderLIS(step);
  }

  function run() {
    VizCode.init(PSEUDOCODES[currentMode]);
    let steps;
    if (currentMode === 'jump') steps = buildStepsJump();
    else if (currentMode === 'knap') steps = buildStepsKnap();
    else steps = buildStepsLIS();

    const init = {
      mode: currentMode, dp: [], dpComputed: [], hlCells: {}, arrows: [],
      desc: 'Готово к запуску.', line: [], stepI: '—', dpVal: '—', curI: -1, curW: -1, curIdx: -1,
    };
    VizAnim.init([init, ...steps], applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
