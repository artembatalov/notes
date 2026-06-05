document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  // Stack column layout
  const STACK_CX = 150;
  const STACK_X = STACK_CX - 80;
  const STACK_W = 160;
  const ELEM_H = 40;
  const ELEM_GAP = 4;
  const BASE_Y = 350;

  function elemY(k) { // k = 0 is bottom
    return BASE_Y - (k + 1) * (ELEM_H + ELEM_GAP);
  }

  function renderStack(stack, newPush, popIdx, peekIdx) {
    const data = stack.map((v, k) => ({ v, k }));

    const grp = svg.selectAll('g.stack-elem').data(data, d => d.k);
    const enter = grp.enter().append('g').attr('class', 'stack-elem');
    enter.append('rect');
    enter.append('text').attr('class', 'sv');

    const all = grp.merge(enter);
    all.each(function(d) {
      const y = elemY(d.k);
      let col, stroke;
      if (d.k === popIdx) {
        col = '#d46a6a'; stroke = '#d46a6a';
      } else if (d.k === newPush) {
        col = '#c8973e'; stroke = '#c8973e';
      } else if (d.k === peekIdx) {
        col = '#6a9fd4'; stroke = '#6a9fd4';
      } else {
        col = '#2a2a2a'; stroke = '#444';
      }
      d3.select(this).select('rect')
        .attr('x', STACK_X).attr('y', y)
        .attr('width', STACK_W).attr('height', ELEM_H)
        .attr('fill', col).attr('stroke', stroke).attr('stroke-width', 2).attr('rx', 4);
      d3.select(this).select('.sv')
        .attr('x', STACK_CX).attr('y', y + ELEM_H / 2 + 5)
        .attr('text-anchor', 'middle').attr('font-size', 18).attr('font-weight', 700)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', col === '#2a2a2a' ? '#888' : '#111')
        .text(d.v);
    });
    grp.exit().remove();

    // Base line
    svg.selectAll('line.base-line').data([0]).join('line')
      .attr('class', 'base-line')
      .attr('x1', STACK_X - 10).attr('y1', BASE_Y)
      .attr('x2', STACK_X + STACK_W + 10).attr('y2', BASE_Y)
      .attr('stroke', '#585858').attr('stroke-width', 2);

    // TOP arrow
    if (stack.length > 0) {
      const topK = stack.length - 1;
      const topY = elemY(topK) + ELEM_H / 2;
      svg.selectAll('text.top-label').data([0]).join('text')
        .attr('class', 'top-label')
        .attr('x', STACK_X - 12).attr('y', topY + 4)
        .attr('text-anchor', 'end').attr('font-size', 11).attr('font-weight', 700)
        .attr('fill', '#c8973e').text('TOP →');
    } else {
      svg.selectAll('text.top-label').remove();
    }

    // Operation visual text (right side)
    // Already shown via desc + s-op
  }

  // Operation sequence visualization panel
  function renderOpPanel(ops, currentIdx) {
    const panelX = 310;
    const panelStartY = 30;
    const opH = 34;

    svg.selectAll('text.op-header').data([0]).join('text')
      .attr('class', 'op-header')
      .attr('x', panelX).attr('y', panelStartY - 10)
      .attr('font-size', 11).attr('font-weight', 700)
      .attr('fill', '#585858').text('Операции:');

    const grp = svg.selectAll('g.op-item').data(ops, (d, i) => i);
    const enter = grp.enter().append('g').attr('class', 'op-item');
    enter.append('rect');
    enter.append('text').attr('class', 'op-text');

    const all = grp.merge(enter);
    all.each(function(d, i) {
      const y = panelStartY + i * opH;
      const isCurrent = i === currentIdx;
      const isPast = i < currentIdx;

      const col = isCurrent ? '#c8973e' : isPast ? '#3a6a52' : '#1a1a1a';
      const textCol = isCurrent ? '#111' : isPast ? '#7abf8a' : '#444';
      const stroke = isCurrent ? '#c8973e' : isPast ? '#3a6a52' : '#333';

      d3.select(this).select('rect')
        .attr('x', panelX).attr('y', y)
        .attr('width', 210).attr('height', opH - 4)
        .attr('fill', col).attr('stroke', stroke).attr('rx', 3);
      d3.select(this).select('.op-text')
        .attr('x', panelX + 10).attr('y', y + (opH - 4) / 2 + 4)
        .attr('font-size', 12).attr('font-weight', isCurrent ? 700 : 400)
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', textCol)
        .text(d);
    });
    grp.exit().remove();
  }

  VizCode.init([
    { id: 0, html: '<span class="kw">function</span> <span class="fn">push</span>(x):' },
    { id: 1, html: '  stack[++top] = x' },
    { id: 2, html: '<span class="kw">function</span> <span class="fn">pop</span>():' },
    { id: 3, html: '  <span class="kw">return</span> stack[top--]' },
    { id: 4, html: '<span class="kw">function</span> <span class="fn">peek</span>():' },
    { id: 5, html: '  <span class="kw">return</span> stack[top]' },
    { id: 6, html: '<span class="kw">function</span> <span class="fn">is_empty</span>():' },
    { id: 7, html: '  <span class="kw">return</span> top == -<span class="num">1</span>' },
  ]);

  const OP_LABELS = [
    'push(3)', 'push(7)', 'push(1)',
    'peek()', 'pop()', 'push(5)',
    'pop()', 'pop()',
  ];

  function buildSteps() {
    const steps = [];
    let stack = [];

    function push(opts) {
      steps.push({
        stack: [...stack],
        newPush: opts.newPush !== undefined ? opts.newPush : -1,
        popIdx: opts.popIdx !== undefined ? opts.popIdx : -1,
        peekIdx: opts.peekIdx !== undefined ? opts.peekIdx : -1,
        line: opts.line || [],
        desc: opts.desc || '',
        op: opts.op || '—',
        opIdx: opts.opIdx !== undefined ? opts.opIdx : -1,
      });
    }

    // Initial
    push({ desc: 'Стек пуст. Начинаем операции.', op: '—', opIdx: -1 });

    // push(3)
    stack.push(3);
    push({ newPush: 0, line: [0, 1], desc: 'push(3) — кладём <b>3</b> на стек', op: 'push(3)', opIdx: 0 });

    // push(7)
    stack.push(7);
    push({ newPush: 1, line: [0, 1], desc: 'push(7) — кладём <b>7</b> на стек', op: 'push(7)', opIdx: 1 });

    // push(1)
    stack.push(1);
    push({ newPush: 2, line: [0, 1], desc: 'push(1) — кладём <b>1</b> на стек', op: 'push(1)', opIdx: 2 });

    // peek()
    push({ peekIdx: stack.length - 1, line: [4, 5], desc: 'peek() = <b>1</b> — смотрим вершину, не удаляя', op: 'peek()', opIdx: 3 });

    // pop()
    push({ popIdx: stack.length - 1, line: [2, 3], desc: 'pop() = <b>1</b> — снимаем вершину', op: 'pop()', opIdx: 4 });
    stack.pop();
    push({ line: [], desc: 'Стек после pop: <b>[3, 7]</b>', op: 'pop() ✓', opIdx: 4 });

    // push(5)
    stack.push(5);
    push({ newPush: stack.length - 1, line: [0, 1], desc: 'push(5) — кладём <b>5</b> на стек', op: 'push(5)', opIdx: 5 });

    // pop()
    push({ popIdx: stack.length - 1, line: [2, 3], desc: 'pop() = <b>5</b> — снимаем вершину', op: 'pop()', opIdx: 6 });
    stack.pop();
    push({ line: [], desc: 'Стек после pop: <b>[3, 7]</b>', op: 'pop() ✓', opIdx: 6 });

    // pop()
    push({ popIdx: stack.length - 1, line: [2, 3], desc: 'pop() = <b>7</b> — снимаем вершину', op: 'pop()', opIdx: 7 });
    stack.pop();
    push({ line: [], desc: 'Стек после pop: <b>[3]</b>', op: 'pop() ✓', opIdx: 7 });

    // Final
    push({ line: [], desc: '<span class="ok">Все операции выполнены. Стек содержит [3].</span>', op: 'Готово', opIdx: -1 });

    return steps;
  }

  function applyStep(step) {
    VizCode.highlight(step.line || []);
    VizState.setDesc(step.desc || '');
    renderStack(
      step.stack,
      step.newPush,
      step.popIdx,
      step.peekIdx,
    );
    renderOpPanel(OP_LABELS, step.opIdx);
    document.getElementById('s-size').textContent = step.stack.length;
    document.getElementById('s-top').textContent = step.stack.length > 0 ? step.stack[step.stack.length - 1] : '—';
    document.getElementById('s-op').textContent = step.op || '—';
  }

  function run() {
    const steps = buildSteps();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
