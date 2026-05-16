document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 400');

  const INITIAL_ARR = [170, 45, 75, 90, 802, 24, 2, 66];
  const N = INITIAL_ARR.length;
  const DIGIT_NAMES = ['единицы', 'десятки', 'сотни'];

  // Layout
  const MAIN_Y = 20;
  const BOX_W = 60, BOX_H = 36, BOX_GAP = 6;
  const MAIN_START_X = 25;
  const BUCKET_START_Y = 80;
  const BUCKET_ROW_H = 32;
  const BUCKET_LABEL_X = 10;
  const BUCKET_BOX_START = 35;
  const BUCKET_BOX_W = 52, BUCKET_BOX_H = 26, BUCKET_BOX_GAP = 4;

  function getDigit(num, pos) {
    return Math.floor(num / Math.pow(10, pos)) % 10;
  }

  function pad3(n) { return String(n).padStart(3, ' '); }

  // ── Rendering ───────────────────────────────────────────────

  function renderMain(mainArr, hlMain, digitPos) {
    const data = mainArr.map((v, i) => ({ v, i }));
    const grp = svg.selectAll('g.main-box').data(data, d => d.i);
    const enter = grp.enter().append('g').attr('class', 'main-box');
    enter.append('rect');
    enter.append('text').attr('class', 'main-digits');

    const all = grp.merge(enter);
    all.each(function(d) {
      const x = MAIN_START_X + d.i * (BOX_W + BOX_GAP);
      const col = hlMain[d.i] === 'active' ? '#c8973e'
                : hlMain[d.i] === 'done'   ? '#3a6a52'
                : '#2a2a2a';
      const stroke = hlMain[d.i] ? '#c8973e' : '#444';

      d3.select(this).select('rect')
        .attr('x', x).attr('y', MAIN_Y)
        .attr('width', BOX_W).attr('height', BOX_H)
        .attr('fill', col).attr('stroke', stroke).attr('rx', 3);

      // Draw digits with highlighted position
      const numStr = String(d.v).padStart(3, '0');
      const textEl = d3.select(this).select('.main-digits');
      textEl.selectAll('*').remove();
      textEl.attr('x', x + 4).attr('y', MAIN_Y + BOX_H / 2 + 4)
        .attr('font-size', 12).attr('font-weight', 700)
        .attr('font-family', 'JetBrains Mono, monospace');

      // digitPos: 0=units(rightmost char index 2), 1=tens(1), 2=hundreds(0)
      const hlCharIdx = 2 - digitPos; // char index in padded 3-char string

      for (let ci = 0; ci < 3; ci++) {
        const ch = numStr[ci];
        const isHL = (digitPos !== undefined) && (ci === hlCharIdx);
        textEl.append('tspan')
          .attr('fill', isHL ? '#c8973e' : (col === '#2a2a2a' ? '#888' : '#111'))
          .attr('font-weight', isHL ? 700 : 400)
          .text(ch);
      }
    });
    grp.exit().remove();
  }

  function renderBuckets(buckets, hlBucket) {
    // 10 bucket rows (0..9)
    for (let b = 0; b < 10; b++) {
      const y = BUCKET_START_Y + b * BUCKET_ROW_H;
      const rowId = `bucket-row-${b}`;

      // Lane label
      svg.selectAll(`text.${rowId}-lbl`).data([b]).join('text')
        .attr('class', `${rowId}-lbl`)
        .attr('x', BUCKET_LABEL_X).attr('y', y + BUCKET_BOX_H / 2 + 4)
        .attr('font-size', 10).attr('fill', '#585858')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`${b}:`);

      // Bucket items
      const items = buckets[b] || [];
      const itemData = items.map((v, i) => ({ v, i, b }));
      const sel = svg.selectAll(`g.bucket-item-${b}`).data(itemData, d => d.i);
      const enter = sel.enter().append('g').attr('class', `bucket-item-${b}`);
      enter.append('rect');
      enter.append('text').attr('class', 'bi-val');

      const all = sel.merge(enter);
      all.each(function(d) {
        const x = BUCKET_BOX_START + d.i * (BUCKET_BOX_W + BUCKET_BOX_GAP);
        const isHL = hlBucket && hlBucket.b === b && hlBucket.i === d.i;
        const col = isHL ? '#c8973e' : '#3a6a52';

        d3.select(this).select('rect')
          .attr('x', x).attr('y', y)
          .attr('width', BUCKET_BOX_W).attr('height', BUCKET_BOX_H)
          .attr('fill', col).attr('stroke', isHL ? '#c8973e' : '#444').attr('rx', 2);
        d3.select(this).select('.bi-val')
          .attr('x', x + BUCKET_BOX_W / 2).attr('y', y + BUCKET_BOX_H / 2 + 4)
          .attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 700)
          .attr('fill', '#111').attr('font-family', 'JetBrains Mono, monospace')
          .text(d.v);
      });
      sel.exit().remove();
    }
  }

  // ── Pseudocode ──────────────────────────────────────────────

  VizCode.init([
    { id: 0,  html: '<span class="kw">function</span> <span class="fn">radixSort</span>(A, n, d):' },
    { id: 1,  html: '  <span class="kw">for</span> pos = <span class="num">0</span> to d-1: <span class="cm">// разряд</span>' },
    { id: 2,  html: '    <span class="fn">countingSort</span>(A, n, pos)' },
    { id: 3,  html: '' },
    { id: 4,  html: '<span class="kw">function</span> <span class="fn">countingSort</span>(A, n, pos):' },
    { id: 5,  html: '  buckets = [[] for _ in <span class="num">0</span>..<span class="num">9</span>]' },
    { id: 6,  html: '  <span class="kw">for</span> i = <span class="num">0</span> to n-1: <span class="cm">// распределяем</span>' },
    { id: 7,  html: '    d = digit(A[i], pos)' },
    { id: 8,  html: '    buckets[d].push(A[i])' },
    { id: 9,  html: '  <span class="kw">for</span> b = <span class="num">0</span> to <span class="num">9</span>: <span class="cm">// собираем</span>' },
    { id: 10, html: '    <span class="kw">for</span> x in buckets[b]: A[out++] = x' },
  ]);

  // ── Steps ───────────────────────────────────────────────────

  function buildSteps() {
    const steps = [];
    let arr = [...INITIAL_ARR];

    function push(opts) {
      steps.push({
        mainArr: [...(opts.mainArr || arr)],
        hlMain: opts.hlMain || {},
        buckets: opts.buckets || Array.from({ length: 10 }, () => []),
        hlBucket: opts.hlBucket || null,
        digitPos: opts.digitPos !== undefined ? opts.digitPos : null,
        line: opts.line || [],
        desc: opts.desc || '',
        digit: opts.digit || '—',
        substep: opts.substep || '—',
      });
    }

    // Initial state
    push({ mainArr: arr, desc: 'Исходный массив. Начинаем с разряда единиц.', digit: '—', substep: 'Старт' });

    for (let pos = 0; pos < 3; pos++) {
      const digitName = DIGIT_NAMES[pos];

      // Show which digit position we're processing
      push({
        mainArr: arr,
        hlMain: {},
        buckets: Array.from({ length: 10 }, () => []),
        digitPos: pos,
        line: [1, 2],
        desc: `Разряд: <b>${digitName}</b> (позиция ${pos}). Распределяем по вёдрам.`,
        digit: digitName, substep: 'Инициализация вёдер',
      });

      const buckets = Array.from({ length: 10 }, () => []);

      // Distribute into buckets
      for (let i = 0; i < N; i++) {
        const num = arr[i];
        const d = getDigit(num, pos);

        push({
          mainArr: arr,
          hlMain: { [i]: 'active' },
          buckets: buckets.map(b => [...b]),
          hlBucket: null,
          digitPos: pos,
          line: [6, 7, 8],
          desc: `arr[${i}]=<b>${num}</b>: разряд «${digitName}» = <b>${d}</b> → ведро ${d}`,
          digit: digitName, substep: `Помещаем ${num} в ведро ${d}`,
        });

        buckets[d].push(num);

        push({
          mainArr: arr,
          hlMain: { [i]: 'done' },
          buckets: buckets.map(b => [...b]),
          hlBucket: { b: d, i: buckets[d].length - 1 },
          digitPos: pos,
          line: [8],
          desc: `buckets[${d}] = [${buckets[d].join(', ')}]`,
          digit: digitName, substep: `Ведро ${d} обновлено`,
        });
      }

      // Collect back
      const newArr = [];
      for (let b = 0; b < 10; b++) {
        for (const v of buckets[b]) newArr.push(v);
      }

      push({
        mainArr: newArr,
        hlMain: Object.fromEntries(newArr.map((_, i) => [i, 'done'])),
        buckets: buckets.map(b => [...b]),
        hlBucket: null,
        digitPos: pos,
        line: [9, 10],
        desc: `Собираем из вёдер 0..9 → [${newArr.join(', ')}]`,
        digit: digitName, substep: 'Сборка из вёдер',
      });

      arr = newArr;
    }

    // Final
    push({
      mainArr: arr,
      hlMain: Object.fromEntries(arr.map((_, i) => [i, 'done'])),
      buckets: Array.from({ length: 10 }, () => []),
      digitPos: null,
      line: [],
      desc: '<span class="ok">Массив отсортирован!</span>',
      digit: '—', substep: 'Готово',
    });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderMain(step.mainArr, step.hlMain || {}, step.digitPos);
    renderBuckets(step.buckets || Array.from({ length: 10 }, () => []), step.hlBucket);
    document.getElementById('s-digit').textContent = step.digit || '—';
    document.getElementById('s-substep').textContent = step.substep || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
