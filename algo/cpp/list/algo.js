document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, TONE, cell, frame, label, arrow, path, hex } = CppViz;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 400');
  CppViz.defs(svg);
  const root = svg.append('g');

  /* ── Mode toggle ──────────────────────────────────────── */
  let mode = 'list';
  const tg = document.createElement('div');
  tg.className = 'toggle-group';
  tg.innerHTML = `<button class="toggle-btn active" data-mode="list">std::list</button>
                  <button class="toggle-btn" data-mode="fwd">std::forward_list</button>`;
  document.getElementById('controls').appendChild(tg);

  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`, nm = s => `<span class="num">${s}</span>`;
  const LISTINGS = {
    hook: [
      `${cm('// insert(pos, x), push_back, push_front:')}`,
      `node* n = ${fn('create_node')}(x);  ${cm('// new + ctor')}`,
      `n->${fn('_M_hook')}(pos);           ${cm('// перед pos')}`,
      `++size;`,
      ``,
      `${kw('void')} node::${fn('_M_hook')}(node* pos) {`,
      `  ${kw('this')}->next = pos;`,
      `  ${kw('this')}->prev = pos->prev;`,
      `  pos->prev->next = ${kw('this')};`,
      `  pos->prev = ${kw('this')};`,
      `}`,
    ],
    unhook: [
      `${cm('// erase(pos), pop_back, pop_front:')}`,
      `node* n = pos.node;`,
      `n->${fn('_M_unhook')}();`,
      `--size;`,
      `${fn('destroy_node')}(n);         ${cm('// ~T + delete')}`,
      ``,
      `${kw('void')} node::${fn('_M_unhook')}() {`,
      `  prev->next = next;`,
      `  next->prev = prev;`,
      `}`,
    ],
    walk: [
      `${cm('// у list нет произвольного доступа:')}`,
      `${kw('auto')} it = l.${fn('begin')}();`,
      `${fn('std::advance')}(it, i);  ${cm('// i раз ++it')}`,
      ``,
      `${cm('// ++it  ⇔  node = node->next')}`,
      `${cm('// поиск позиции — O(i),')}`,
      `${cm('// сама вставка/удаление — O(1)')}`,
    ],
    splice: [
      `${cm('// l.splice(pos, l, it): перенос узла')}`,
      `${cm('// без копирования и аллокаций')}`,
      `node* n = it.node;`,
      `n->${fn('_M_unhook')}();     ${cm('// вынуть')}`,
      `n->${fn('_M_hook')}(pos.node); ${cm('// вставить')}`,
      ``,
      `${cm('// итераторы и ссылки на n остаются')}`,
      `${cm('// валидными — узел тот же самый')}`,
    ],
    it: [
      `${kw('auto')} it = ${fn('std::next')}(l.${fn('begin')}(), i);`,
      `${cm('// итератор list — указатель на узел.')}`,
      `${cm('// Вставки и удаления ДРУГИХ узлов его')}`,
      `${cm('// не трогают: висячим он станет только')}`,
      `${cm('// при удалении своего узла.')}`,
    ],
    f_insert: [
      `${cm('// insert_after(pos, x), push_front:')}`,
      `node* n = ${fn('create_node')}(x);`,
      `n->next = pos->next;`,
      `pos->next = n;`,
      ``,
      `${cm('// push_front(x) ⇔')}`,
      `${cm('//   insert_after(before_begin(), x)')}`,
      `${cm('// size() нет: хранить его — лишние')}`,
      `${cm('// 8 байт, а forward_list про минимум')}`,
    ],
    f_erase: [
      `${cm('// erase_after(pos), pop_front:')}`,
      `node* n = pos->next;`,
      `pos->next = n->next;`,
      `${fn('destroy_node')}(n);`,
      ``,
      `${cm('// erase(pos) не бывает: чтобы удалить')}`,
      `${cm('// узел, нужен его предшественник,')}`,
      `${cm('// а назад по списку не пройти.')}`,
    ],
    f_walk: [
      `${kw('auto')} it = fl.${fn('before_begin')}();`,
      `${fn('std::advance')}(it, i + ${nm(1)});`,
      `${cm('// before_begin() — фиктивный узел')}`,
      `${cm('// _M_head перед первым элементом')}`,
    ],
  };

  /* ── Simulation ───────────────────────────────────────── */
  const H = 'H', NIL = null;

  function simulate(ops, kind) {
    const fwd = kind === 'fwd';
    const heap = CppViz.heap(fwd ? 5 : 3, 0x4b00);
    const nodes = {};
    const head = { next: fwd ? NIL : H, prev: H, size: 0 };
    let nextId = 1, it = null, opIdx = -1;
    const steps = [];

    const order = () => { const o = []; let p = head.next; while (p !== H && p !== NIL) { o.push(p); p = nodes[p].next; } return o; };
    const S = (o = {}) => steps.push({
      op: opIdx, kind, code: o.code, line: o.line || [], desc: o.desc || '',
      order: o.order || order(), raised: o.raised ?? null,
      nodes: Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, { ...n }])),
      head: { ...head }, tones: o.tones || {}, ptrHl: o.ptrHl || [], walk: o.walk ?? null,
      it: it ? { ...it } : null,
    });
    const nodeAt = i => order()[i];
    const pred = id => { if (head.next === id) return H; return order().find(k => nodes[k].next === id); };
    const val = id => id === H ? (fwd ? 'before_begin' : 'header') : nodes[id].val;
    const name = id => id === H ? (fwd ? '_M_head' : 'header') : `[${nodes[id].val}]`;

    function walkTo(i, code = fwd ? 'f_walk' : 'walk') {
      const o = order();
      if (fwd && i < 0) { S({ code, line: [0], walk: H, desc: '<code>before_begin()</code> — фиктивный узел перед первым.' }); return; }
      for (let k = 0; k <= i && k < o.length; k++)
        S({ code, line: k === 0 ? [fwd ? 0 : 1] : [fwd ? 1 : 2, 4], walk: o[k],
            desc: k === 0 ? `Начинаем с ${fwd ? 'первого узла' : '<code>begin()</code>'}: <b>${nodes[o[k]].val}</b>.` : `<code>++it</code> → <b>${nodes[o[k]].val}</b> (шаг ${k} из ${i}).` });
      if (!fwd && i === o.length) S({ code, line: [2, 4], walk: H, desc: '<code>end()</code> — это сам header.' });
    }

    /* list: insert new node before `pos` (node id or H) */
    function hook(x, pos, why) {
      const id = String(nextId++);
      nodes[id] = { val: x, prev: NIL, next: NIL, addr: heap.alloc(24, true) };
      const prevOf = pos === H ? head.prev : nodes[pos].prev;
      const finalOrder = [...order()];
      const at = pos === H ? finalOrder.length : finalOrder.indexOf(pos);
      finalOrder.splice(at, 0, id);
      const R = { order: finalOrder, raised: id, code: 'hook' };
      S({ ...R, line: [1], tones: { [id]: 'new' }, desc: `${why}: выделяем узел <b>${x}</b> в куче (${hex(nodes[id].addr)}). Пока он ни с кем не связан.` });
      nodes[id].next = pos;
      S({ ...R, line: [6], tones: { [id]: 'new' }, ptrHl: [[id, 'next']], desc: `<code>n->next = pos</code> → ${name(pos)}.` });
      nodes[id].prev = prevOf;
      S({ ...R, line: [7], tones: { [id]: 'new' }, ptrHl: [[id, 'prev']], desc: `<code>n->prev = pos->prev</code> → ${name(prevOf)}.` });
      if (prevOf === H) head.next = id; else nodes[prevOf].next = id;
      S({ ...R, line: [8], tones: { [id]: 'new' }, ptrHl: [[prevOf, 'next']], desc: `<code>pos->prev->next = n</code>: ${name(prevOf)} теперь ссылается вперёд на новый узел.` });
      if (pos === H) head.prev = id; else nodes[pos].prev = id;
      head.size++;
      S({ ...R, line: [9, 3], tones: { [id]: 'new' }, ptrHl: [[pos, 'prev']], desc: `<code>pos->prev = n</code>. Узел вшит: 4 присваивания указателей, <b>O(1)</b>, никто не переехал.` });
      S({ code: 'hook', line: [], tones: { [id]: 'ok' }, desc: `size = ${head.size}.` });
      return id;
    }

    function unhook(id, why) {
      const p = nodes[id].prev, n = nodes[id].next;
      const fo = order();
      S({ code: 'unhook', order: fo, line: [1], tones: { [id]: 'dead' }, desc: `${why}: удаляем узел <b>${nodes[id].val}</b>.` });
      if (p === H) head.next = n; else nodes[p].next = n;
      S({ code: 'unhook', order: fo, line: [2, 7], tones: { [id]: 'dead' }, ptrHl: [[p, 'next']], desc: `<code>prev->next = next</code>: ${name(p)} перепрыгивает через удаляемый узел.` });
      if (n === H) head.prev = p; else nodes[n].prev = p;
      head.size--;
      S({ code: 'unhook', order: fo, line: [8, 3], tones: { [id]: 'dead' }, ptrHl: [[n, 'prev']], desc: `<code>next->prev = prev</code>. Узел выпал из списка.` });
      if (it && !it.dead && it.id === id) { it.dead = true; }
      delete nodes[id];
      S({ code: 'unhook', line: [4], desc: `Узел уничтожен и освобождён.${it && it.dead && it.id === id ? ' <span class="warn">Итератор it указывал на него — теперь висячий.</span>' : it && !it.dead ? ' Итератор it по-прежнему валиден.' : ''}` });
    }

    function fInsertAfter(pos, x, why) {
      const id = String(nextId++);
      nodes[id] = { val: x, next: undefined, addr: heap.alloc(16, true) };
      const fo = [...order()];
      const at = pos === H ? 0 : fo.indexOf(pos) + 1;
      fo.splice(at, 0, id);
      const R = { order: fo, raised: id, code: 'f_insert' };
      S({ ...R, line: [1], tones: { [id]: 'new' }, desc: `${why}: выделяем узел <b>${x}</b> (${hex(nodes[id].addr)}).` });
      nodes[id].next = pos === H ? head.next : nodes[pos].next;
      S({ ...R, line: [2], tones: { [id]: 'new' }, ptrHl: [[id, 'next']], desc: `<code>n->next = pos->next</code> → ${nodes[id].next === NIL ? 'nullptr' : name(nodes[id].next)}.` });
      if (pos === H) head.next = id; else nodes[pos].next = id;
      head.size++;
      S({ ...R, line: [3], tones: { [id]: 'new' }, ptrHl: [[pos, 'next']], desc: `<code>pos->next = n</code>. Готово: 2 присваивания, <b>O(1)</b>.` });
      S({ code: 'f_insert', tones: { [id]: 'ok' }, desc: `Вставлено после ${name(pos)}.` });
    }

    function fEraseAfter(pos, why) {
      const id = pos === H ? head.next : nodes[pos].next;
      if (id === NIL) { S({ code: 'f_erase', desc: `${why}: после ${name(pos)} ничего нет — <span class="warn">UB</span>. Пропускаем.` }); return; }
      const fo = order();
      S({ code: 'f_erase', order: fo, line: [1], tones: { [id]: 'dead' }, desc: `${why}: удаляем узел <b>${nodes[id].val}</b> — следующий после ${name(pos)}.` });
      if (pos === H) head.next = nodes[id].next; else nodes[pos].next = nodes[id].next;
      head.size--;
      S({ code: 'f_erase', order: fo, line: [2], tones: { [id]: 'dead' }, ptrHl: [[pos, 'next']], desc: `<code>pos->next = n->next</code>: обходим удаляемый узел.` });
      if (it && !it.dead && it.id === id) it.dead = true;
      delete nodes[id];
      S({ code: 'f_erase', line: [3], desc: `Узел освобождён.${it && it.dead && it.id === id ? ' <span class="warn">it висячий.</span>' : ''}` });
    }

    S({ code: fwd ? 'f_insert' : 'hook', desc: fwd
      ? '<code>std::forward_list&lt;int&gt; fl;</code> — внутри только <code>_M_head</code> с одним указателем next (8 байт). Ни хвоста, ни размера.'
      : '<code>std::list&lt;int&gt; l;</code> — пустой список: фиктивный узел <b>header</b> ссылается сам на себя. <code>end()</code> — это header.' });

    for (const [k, o] of ops.entries()) {
      opIdx = k;
      const [a, b] = o.args;
      const n = head.size;
      if (!fwd) switch (o.name) {
        case 'push_back': hook(a, H, `<code>push_back(${a})</code> = <code>insert(end(), ${a})</code>`); break;
        case 'push_front': hook(a, head.next, `<code>push_front(${a})</code> = <code>insert(begin(), ${a})</code>`); break;
        case 'pop_back': if (!n) S({ code: 'unhook', desc: 'Пустой список — <span class="warn">UB</span>.' }); else unhook(head.prev, '<code>pop_back()</code>'); break;
        case 'pop_front': if (!n) S({ code: 'unhook', desc: 'Пустой список — <span class="warn">UB</span>.' }); else unhook(head.next, '<code>pop_front()</code>'); break;
        case 'insert': {
          if (a < 0 || a > n) { S({ code: 'walk', desc: `Позиция ${a} вне [0, ${n}] — пропускаем.` }); break; }
          walkTo(a);
          hook(b, a === n ? H : nodeAt(a), `<code>insert(it, ${b})</code>`);
          break;
        }
        case 'erase': {
          if (a < 0 || a >= n) { S({ code: 'walk', desc: `Позиция ${a} вне [0, ${n}) — пропускаем.` }); break; }
          walkTo(a);
          unhook(nodeAt(a), '<code>erase(it)</code>');
          break;
        }
        case 'splice': {
          if (a < 0 || a >= n || b < 0 || b > n) { S({ code: 'splice', desc: 'Позиции вне диапазона — пропускаем.' }); break; }
          const id = nodeAt(a), pos = b === n ? H : nodeAt(b);
          if (pos === id || nodes[id].next === pos) { S({ code: 'splice', desc: 'Узел уже стоит на этом месте — ничего не делаем.' }); break; }
          S({ code: 'splice', line: [0, 2], tones: { [id]: 'active', ...(pos !== H ? { [pos]: 'read' } : {}) },
              desc: `<code>splice</code>: переносим узел <b>${nodes[id].val}</b> перед ${pos === H ? 'end()' : `<b>${nodes[pos].val}</b>`}.` });
          const p = nodes[id].prev, nx = nodes[id].next;
          if (p === H) head.next = nx; else nodes[p].next = nx;
          if (nx === H) head.prev = p; else nodes[nx].prev = p;
          const fo = order();
          const at = pos === H ? fo.length : fo.indexOf(pos);
          fo.splice(at, 0, id);
          S({ code: 'splice', line: [3], order: fo, raised: id, tones: { [id]: 'active' }, ptrHl: [[p, 'next'], [nx, 'prev']],
              desc: '<code>_M_unhook</code>: соседи замкнулись друг на друга, узел висит отдельно — но не удалён.' });
          const pv = pos === H ? head.prev : nodes[pos].prev;
          nodes[id].next = pos; nodes[id].prev = pv;
          if (pv === H) head.next = id; else nodes[pv].next = id;
          if (pos === H) head.prev = id; else nodes[pos].prev = id;
          S({ code: 'splice', line: [4, 6, 7], tones: { [id]: 'ok' }, ptrHl: [[id, 'next'], [id, 'prev'], [pv, 'next'], [pos, 'prev']],
              desc: '<code>_M_hook</code>: узел вшит на новое место. Ни одной аллокации и копии — поэтому <code>splice</code> O(1).' });
          break;
        }
        case 'it': {
          if (a < 0 || a > n) { S({ code: 'it', desc: 'Позиция вне диапазона.' }); break; }
          const id = a === n ? H : nodeAt(a);
          it = { id, dead: false, val: val(id) };
          S({ code: 'it', line: [0], walk: id, desc: `<code>it</code> → ${id === H ? 'end()' : `узел <b>${nodes[id].val}</b> @${hex(nodes[id].addr)}`}. Посмотрим, переживёт ли он следующие операции.` });
          break;
        }
      } else switch (o.name) {
        case 'push_front': fInsertAfter(H, a, `<code>push_front(${a})</code>`); break;
        case 'pop_front': fEraseAfter(H, '<code>pop_front()</code>'); break;
        case 'insert_after': {
          if (a < -1 || a >= n) { S({ code: 'f_walk', desc: `Позиция ${a} вне [-1, ${n}) — пропускаем (−1 = before_begin).` }); break; }
          walkTo(a);
          fInsertAfter(a < 0 ? H : nodeAt(a), b, `<code>insert_after(it, ${b})</code>`);
          break;
        }
        case 'erase_after': {
          if (a < -1 || a >= n) { S({ code: 'f_walk', desc: `Позиция ${a} вне [-1, ${n}) — пропускаем.` }); break; }
          walkTo(a);
          fEraseAfter(a < 0 ? H : nodeAt(a), '<code>erase_after(it)</code>');
          break;
        }
        case 'it': {
          if (a < 0 || a >= n) { S({ code: 'f_walk', desc: 'Позиция вне диапазона.' }); break; }
          const id = nodeAt(a);
          it = { id, dead: false, val: val(id) };
          S({ code: 'f_walk', line: [0, 1], walk: id, desc: `<code>it</code> → узел <b>${nodes[id].val}</b>.` });
          break;
        }
      }
    }
    opIdx = -1;
    S({ code: fwd ? 'f_insert' : 'hook', desc: `<span class="ok">Готово.</span> Элементов: ${head.size}. Узлы разбросаны по куче — у списка нет локальности кэша, зато нет и перемещений.` });
    return steps;
  }

  /* ── Rendering ────────────────────────────────────────── */
  function applyStep(s) {
    root.selectAll('*').remove();
    const g = root;
    const fwd = s.kind === 'fwd';
    const boxes = fwd ? ['H', ...s.order, 'NIL'] : ['H', ...s.order, 'H2'];
    const k = boxes.length;
    const GAPX = 40;
    const W = Math.max(44, Math.min(84, Math.floor((680 - GAPX * (k - 1)) / k)));
    const BH = 46, PW = 14;
    const ROW = 200, RAISED = 86;
    const pos = {};
    boxes.forEach((id, i) => { pos[id] = { x: 20 + i * (W + GAPX), y: id === s.raised ? RAISED : ROW }; });
    const hlSet = new Set(s.ptrHl.map(([id, f]) => `${id}.${f}`));

    /* object on the stack */
    frame(g, 20, 30, fwd ? 260 : 300, 34, fwd ? 'fl — std::forward_list<int> на стеке (8 байт)' : 'l — std::list<int> на стеке (24 байта)');
    label(g, 32, 52, fwd ? `_M_head.next → ${s.head.next === null ? 'nullptr' : 'первый узел'}` : `header { next, prev }, size = ${s.head.size}`,
      { color: COL.muted2, size: 11, mono: true });

    /* node boxes: [prev | value | next] */
    const drawBox = (id) => {
      const p = pos[id];
      if (id === 'NIL') {
        label(g, p.x + 4, p.y + BH / 2 + 4, 'nullptr', { color: COL.muted, size: 11, mono: true });
        return;
      }
      const isHead = id === 'H' || id === 'H2';
      const n = isHead ? null : s.nodes[id];
      const tone = isHead ? 'none' : (s.tones[id] || 'none');
      const t = TONE[tone];
      const stroke = isHead ? '#555' : t.s;
      g.append('rect').attr('x', p.x).attr('y', p.y).attr('width', W).attr('height', BH).attr('rx', 6)
        .attr('fill', isHead ? '#121212' : t.f).attr('stroke', stroke)
        .attr('stroke-width', tone === 'none' ? 1.2 : 1.8).attr('stroke-dasharray', id === 'H2' ? '4 3' : null);
      const div = x => g.append('line').attr('x1', x).attr('x2', x).attr('y1', p.y).attr('y2', p.y + BH).attr('stroke', stroke).attr('opacity', .55);
      const dot = (x, y, c) => g.append('circle').attr('cx', x).attr('cy', y).attr('r', 2.6).attr('fill', c);
      if (!fwd) { div(p.x + PW); dot(p.x + PW / 2, p.y + BH / 2 + 7, '#7a7a7a'); }
      div(p.x + W - PW); dot(p.x + W - PW / 2, p.y + BH / 2 - 7, COL.blue);
      const mid = fwd ? p.x + (W - PW) / 2 : p.x + W / 2;
      const top = isHead ? (fwd ? 'head' : 'header') : n.val;
      label(g, mid, p.y + BH / 2 + 5, top, {
        color: isHead ? COL.muted2 : (tone === 'new' ? '#111' : t.t === '#9a9a9a' ? COL.text : t.t),
        size: isHead ? 10 : (W < 60 ? 13 : 16), anchor: 'middle', weight: 700, mono: !isHead,
      });
      if (n) label(g, p.x + W / 2, p.y + BH + 14, hex(n.addr), { color: '#444', size: 8.5, anchor: 'middle', mono: true });
      if (id === 'H') label(g, p.x + W / 2, p.y + BH + 14, fwd ? 'before_begin()' : 'end()', { color: COL.muted, size: 9, anchor: 'middle', mono: true });
      if (id === 'H2') label(g, p.x + W / 2, p.y + BH + 14, 'тот же header', { color: COL.muted, size: 9, anchor: 'middle' });
      if (id === 'H') {
        if (!fwd) label(g, p.x + PW / 2, p.y - 6, 'prev', { color: COL.muted, size: 8, anchor: 'middle', mono: true });
        label(g, p.x + W - PW / 2, p.y - 6, 'next', { color: COL.blue, size: 8, anchor: 'middle', mono: true });
      }
    };
    boxes.forEach(drawBox);

    /* pointers: next leaves from the right compartment, prev from the left one */
    const ref = (target, field) => target === 'H' ? (field === 'next' ? (fwd ? null : 'H2') : 'H') : target === null ? 'NIL' : target;
    const drawPtr = (from, field, target, srcBox) => {
      const tb = ref(target, field);
      if (!tb || !pos[tb] || !pos[srcBox]) return;
      const a = pos[srcBox], b = pos[tb];
      const hl = hlSet.has(`${from}.${field}`);
      const color = hl ? 'amber' : field === 'next' ? 'blue' : 'muted';
      const width = hl ? 2.2 : 1.5;
      if (field === 'next') {
        const x1 = a.x + W - PW / 2, y1 = a.y + BH / 2 - 7, y2 = b.y + BH / 2 - 7;
        if (b.x > a.x) arrow(g, x1 + 3, y1, b.x - 1, y2, { color, width });
        else path(g, [[x1, a.y + BH], [x1, ROW + BH + 34], [b.x - 12, ROW + BH + 34], [b.x - 12, y2], [b.x - 1, y2]], { color, width });
      } else {
        const x1 = a.x + PW / 2, y1 = a.y + BH / 2 + 7, y2 = b.y + BH / 2 + 7;
        if (b.x < a.x) arrow(g, x1 - 3, y1, b.x + W + 1, y2, { color, width });
        else path(g, [[x1, a.y], [x1, ROW - 30], [b.x + W + 12, ROW - 30], [b.x + W + 12, y2], [b.x + W + 1, y2]], { color, width });
      }
    };
    if (fwd) drawPtr('H', 'next', s.head.next, 'H');
    else { drawPtr('H', 'next', s.head.next, 'H'); drawPtr('H', 'prev', s.head.prev, 'H2'); }
    for (const id of s.order) {
      const n = s.nodes[id];
      if (!n) continue;
      if (n.next !== undefined && (n.next !== null || fwd)) drawPtr(id, 'next', n.next, id);
      if (!fwd && n.prev !== null) drawPtr(id, 'prev', n.prev, id);
    }

    /* walking cursor / iterator */
    const mark = (id, text, color, dy) => {
      const b = id === 'H' ? pos.H : pos[id];
      if (!b) return;
      const x = b.x + W / 2, y = (b.y === RAISED ? ROW : b.y) + BH + 34 + dy;
      g.append('path').attr('d', `M${x - 5},${y} L${x},${y - 8} L${x + 5},${y}`).attr('fill', color);
      label(g, x, y + 13, text, { color, size: 10.5, anchor: 'middle', mono: true, weight: 700 });
    };
    if (s.walk) mark(s.walk, 'pos', COL.amber, 0);
    if (s.it) {
      if (s.it.dead) label(g, 20, 380, `it → узел ${s.it.val}: освобождён, итератор висячий`, { color: COL.red, size: 11, mono: true, weight: 700 });
      else mark(s.it.id, 'it', COL.greenHi, s.walk === s.it.id ? 26 : 0);
    }

    CppViz.code(LISTINGS, s.code, s.line);
    CppViz.opsStripSync(s.op);
    VizState.setDesc(s.desc);
    const vals = s.order.filter(id => id !== s.raised || s.tones[id] !== 'new').map(id => s.nodes[id]?.val).filter(v => v !== undefined);
    CppViz.state({
      's-kind': fwd ? 'std::forward_list&lt;int&gt;' : 'std::list&lt;int&gt;',
      's-size': fwd ? `<span class="dim">нет size() — только std::distance, O(n)</span>` : s.head.size,
      's-seq': vals.length ? vals.join(' → ') : '<span class="dim">пусто</span>',
      's-node': fwd ? '16 байт: next + int (+выравнивание)' : '24 байта: prev + next + int',
      's-note': fwd
        ? '<code>std::forward_list</code> — односвязный список без хвоста и без <code>size()</code>. Объект занимает ровно один указатель. Поэтому все операции «после»: <code>insert_after</code>, <code>erase_after</code>, а перед первым узлом стоит фиктивный <code>before_begin()</code>.'
        : '<code>std::list</code> в libstdc++ — <b>кольцевой</b> двусвязный список с фиктивным узлом <b>header</b> внутри самого объекта: <code>end()</code> указывает на header, а <code>header.next</code> и <code>header.prev</code> — на первый и последний узлы. Справа header нарисован второй раз пунктиром, чтобы стрелки не шли через всю схему.',
      's-it': !s.it ? '<span class="dim">—</span>' : s.it.dead ? '<span class="warn">висячий</span>' : `<span class="ok">валиден</span> → ${s.it.val}`,
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */
  const MODES = {
    list: {
      spec: { push_back: 'n', push_front: 'n', pop_back: 0, pop_front: 0, insert: 2, erase: 1, splice: 2, it: 1 },
      presets: [
        { name: 'Вставка и удаление', script: 'push_back 10; push_back 20; push_front 5; it 1; insert 2 15; erase 0; pop_back' },
        { name: 'splice: перенос узла', script: 'push_back 1 2 3 4; it 3; splice 3 0; splice 1 4' },
        { name: 'Итератор переживает всё', script: 'push_back 7 8 9; it 1; push_front 1; push_back 2; erase 0; erase 2' },
      ],
      hint: 'Операции: <code>push_back x…</code> <code>push_front x…</code> <code>pop_back</code> <code>pop_front</code> <code>insert i x</code> <code>erase i</code> <code>splice i j</code> (узел i — перед позицией j) <code>it i</code>',
    },
    fwd: {
      spec: { push_front: 'n', pop_front: 0, insert_after: 2, erase_after: 1, it: 1 },
      presets: [
        { name: 'Основы forward_list', script: 'push_front 30 20 10; insert_after 0 15; insert_after -1 5; erase_after 1; pop_front' },
        { name: 'Удаление через предшественника', script: 'push_front 4 3 2 1; it 2; erase_after 0; erase_after 1' },
      ],
      hint: 'Операции: <code>push_front x…</code> <code>pop_front</code> <code>insert_after i x</code> <code>erase_after i</code> (i = −1 — before_begin) <code>it i</code>',
    },
  };

  let bar;
  function mountBar() {
    const m = MODES[mode];
    bar = CppViz.scriptBar({ presets: m.presets, onRun: () => run(), hint: m.hint });
  }
  tg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    tg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    mode = b.dataset.mode;
    mountBar();
    run();
  }));

  function run() {
    CppViz.resetCode();
    let ops;
    try { ops = CppViz.parse(bar.text, MODES[mode].spec); bar.error(''); }
    catch (e) { bar.error(e.message); return; }
    const steps = simulate(ops, mode);
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  mountBar();
  VizAnim.bindUI(run);
  run();
});
