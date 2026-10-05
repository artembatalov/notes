/* Модель std::deque как в libstdc++: карта указателей на блоки по B элементов.
   dequeSimulate(ops, B) → массив шагов-снимков для визуализации. Без DOM. */
function dequeSimulate(ops, B = 4) {
  const steps = [];
  let nextId = 1, addrTop = 0x2a00;
  const alloc = bytes => { const a = addrTop + 16 * (1 + (nextId * 7) % 5); addrTop = a + Math.ceil(bytes / 16) * 16; return a; };

  let mapSize = 8, map = new Array(8).fill(null), mapAddr = alloc(8 * 8);
  const blocks = {};
  const newBlock = () => { const id = nextId++; blocks[id] = { addr: alloc(B * 4), cells: new Array(B).fill(null) }; return id; };
  let start, finish;
  let stats = { nodeAllocs: 0, nodeFrees: 0, mapAllocs: 1, moved: 0 };
  let opIdx = -1;

  const size = () => (finish.node - start.node) * B + finish.cur - start.cur;
  const elems = () => {
    const out = [];
    let n = start.node, c = start.cur;
    while (n < finish.node || (n === finish.node && c < finish.cur)) {
      out.push({ v: blocks[map[n]].cells[c], slot: n, cur: c });
      if (++c === B) { c = 0; n++; }
    }
    return out;
  };

  const S = (o = {}) => steps.push({
    op: opIdx, code: o.code, line: o.line || [], desc: o.desc || '',
    map: [...map], mapSize, mapAddr,
    blocks: Object.fromEntries(Object.entries(blocks).map(([k, b]) => [k, { addr: b.addr, cells: [...b.cells] }])),
    start: { ...start }, finish: { ...finish },
    hl: { cells: o.cells || {}, slots: o.slots || {} },
    at: o.at ?? null, oldMap: o.oldMap || null,
    stats: { ...stats, size: size() }, B,
  });
  const ck = (slot, cur) => `${map[slot]}:${cur}`;

  /* ── constructor: _M_initialize_map(0) ── */
  {
    const nstart = Math.floor((mapSize - 1) / 2);
    map[nstart] = newBlock(); stats.nodeAllocs++;
    start = { node: nstart, cur: 0 }; finish = { node: nstart, cur: 0 };
    S({ code: 'init', line: [1, 2, 3, 4, 5, 6, 7], slots: { [nstart]: 'new' },
        desc: `<code>std::deque&lt;int&gt; d;</code> — даже пустой дек сразу выделяет карту на <b>8</b> указателей и <b>один блок</b> посередине (слот ${nstart}).` });
  }

  function reallocateMap(add, front) {
    const oldNodes = finish.node - start.node + 1;
    const newNodes = oldNodes + add;
    const ids = map.slice(start.node, finish.node + 1);
    const oldMap = [...map], oldSize = mapSize;
    const recenter = mapSize > 2 * newNodes;
    let nstart;
    if (recenter) {
      nstart = Math.floor((mapSize - newNodes) / 2) + (front ? add : 0);
      map.fill(null);
    } else {
      const sz = mapSize + Math.max(mapSize, add) + 2;
      nstart = Math.floor((sz - newNodes) / 2) + (front ? add : 0);
      map = new Array(sz).fill(null);
      mapSize = sz; mapAddr = alloc(sz * 8); stats.mapAllocs++;
    }
    ids.forEach((id, k) => { map[nstart + k] = id; });
    const shift = nstart - start.node;
    start.node += shift; finish.node += shift;
    const slots = Object.fromEntries(ids.map((_, k) => [nstart + k, 'moved']));
    if (recenter)
      S({ code: 'remap', line: [5, 6, 7, 8, 9, 10], oldMap, slots,
          desc: `Карта большая (${oldSize} &gt; 2·${newNodes}), просто занята у края → <b>рецентрирование</b>: указатели на ${oldNodes} блок(а) сдвигаются в середину. Элементы не двигаются.` });
    else
      S({ code: 'remap', line: [11, 12, 13, 14, 15, 16, 17, 18], oldMap, slots,
          desc: `Карта мала → новая карта на <code>${oldSize} + max(${oldSize}, ${add}) + 2 = ${mapSize}</code> слотов. Копируются только ${oldNodes} <b>указателя</b> — блоки с элементами остаются на месте.` });
    S({ code: 'remap', line: [20, 21], desc: `<code>start.node</code> и <code>finish.node</code> теперь указывают на слоты ${start.node}…${finish.node}.` });
  }

  ops.forEach((o, k) => {
    opIdx = k;
    const x = o.args[0];
    switch (o.name) {
      case 'push_back': {
        if (finish.cur !== B - 1) {
          S({ code: 'push_back', line: [1], cells: { [ck(finish.node, finish.cur)]: 'active' },
              desc: `<code>${o.label}</code>: в последнем блоке есть место (finish.cur ≠ last − 1).` });
          blocks[map[finish.node]].cells[finish.cur] = x;
          const c = ck(finish.node, finish.cur);
          finish.cur++;
          S({ code: 'push_back', line: [2, 3], cells: { [c]: 'new' }, desc: `Конструируем <b>${x}</b> и сдвигаем <code>finish.cur</code>. O(1), ничего не перемещается.` });
        } else {
          S({ code: 'push_back', line: [1, 4], cells: { [ck(finish.node, finish.cur)]: 'active' },
              desc: `<code>${o.label}</code>: это последняя ячейка блока. libstdc++ держит <code>finish.cur</code> строго внутри блока, поэтому <b>следующий блок</b> выделяется уже сейчас.` });
          const need = 1 + 1 > mapSize - finish.node;
          S({ code: 'push_back', line: [5], slots: { [finish.node + 1]: need ? 'dead' : 'read' },
              desc: need ? `<code>reserve_map_at_back</code>: справа от слота ${finish.node} в карте места нет.` : `<code>reserve_map_at_back</code>: справа в карте есть свободный слот ${finish.node + 1}.` });
          if (need) reallocateMap(1, false);
          map[finish.node + 1] = newBlock(); stats.nodeAllocs++;
          S({ code: 'push_back', line: [6], slots: { [finish.node + 1]: 'new' }, desc: `Новый блок на ${B} элемента записан в слот ${finish.node + 1}.` });
          blocks[map[finish.node]].cells[finish.cur] = x;
          const c = ck(finish.node, finish.cur);
          finish = { node: finish.node + 1, cur: 0 };
          S({ code: 'push_back', line: [7, 8, 9], cells: { [c]: 'new' }, desc: `<b>${x}</b> записан в последнюю ячейку старого блока, <code>finish</code> переехал в начало нового.` });
        }
        break;
      }
      case 'push_front': {
        if (start.cur !== 0) {
          S({ code: 'push_front', line: [1], cells: { [ck(start.node, start.cur - 1)]: 'active' },
              desc: `<code>${o.label}</code>: в первом блоке левее <code>start.cur</code> есть место.` });
          start.cur--;
          blocks[map[start.node]].cells[start.cur] = x;
          S({ code: 'push_front', line: [2, 3], cells: { [ck(start.node, start.cur)]: 'new' }, desc: `Конструируем <b>${x}</b> в ячейке слева и сдвигаем <code>start.cur</code>. O(1).` });
        } else {
          S({ code: 'push_front', line: [1, 4], cells: { [ck(start.node, start.cur)]: 'active' },
              desc: `<code>${o.label}</code>: <code>start.cur</code> стоит в начале блока — нужен новый блок слева.` });
          const need = 1 > start.node;
          S({ code: 'push_front', line: [5], slots: need ? {} : { [start.node - 1]: 'read' },
              desc: need ? `<code>reserve_map_at_front</code>: левее слота ${start.node} в карте места нет.` : `<code>reserve_map_at_front</code>: слева в карте свободен слот ${start.node - 1}.` });
          if (need) reallocateMap(1, true);
          map[start.node - 1] = newBlock(); stats.nodeAllocs++;
          S({ code: 'push_front', line: [6], slots: { [start.node - 1]: 'new' }, desc: `Новый блок записан в слот ${start.node - 1}.` });
          start = { node: start.node - 1, cur: B - 1 };
          blocks[map[start.node]].cells[start.cur] = x;
          S({ code: 'push_front', line: [7, 8, 9], cells: { [ck(start.node, start.cur)]: 'new' },
              desc: `<code>start</code> → <b>последняя</b> ячейка нового блока: дек растёт влево, и блок заполняется справа налево.` });
        }
        break;
      }
      case 'pop_back': {
        if (!size()) { S({ code: 'pop_back', desc: '<code>pop_back()</code> на пустом деке — <span class="warn">UB</span>. Пропускаем.' }); break; }
        if (finish.cur !== 0) {
          finish.cur--;
          const c = ck(finish.node, finish.cur);
          S({ code: 'pop_back', line: [1, 2], cells: { [c]: 'dead' }, desc: `<code>pop_back()</code>: <code>--finish.cur</code> → последний элемент <b>${blocks[map[finish.node]].cells[finish.cur]}</b>.` });
          blocks[map[finish.node]].cells[finish.cur] = null;
          S({ code: 'pop_back', line: [3], desc: 'Элемент уничтожен. O(1).' });
        } else {
          S({ code: 'pop_back', line: [1, 4], slots: { [finish.node]: 'dead' }, desc: `<code>pop_back()</code>: <code>finish</code> в начале пустого блока — этот блок больше не нужен.` });
          delete blocks[map[finish.node]]; map[finish.node] = null; stats.nodeFrees++;
          finish = { node: finish.node - 1, cur: B - 1 };
          const c = ck(finish.node, finish.cur);
          S({ code: 'pop_back', line: [5, 6, 7], cells: { [c]: 'dead' }, desc: `Блок освобождён, <code>finish</code> → последняя ячейка предыдущего блока (<b>${blocks[map[finish.node]].cells[finish.cur]}</b>).` });
          blocks[map[finish.node]].cells[finish.cur] = null;
          S({ code: 'pop_back', line: [8], desc: 'Элемент уничтожен.' });
        }
        break;
      }
      case 'pop_front': {
        if (!size()) { S({ code: 'pop_front', desc: '<code>pop_front()</code> на пустом деке — <span class="warn">UB</span>. Пропускаем.' }); break; }
        const c = ck(start.node, start.cur);
        const v = blocks[map[start.node]].cells[start.cur];
        if (start.cur !== B - 1) {
          S({ code: 'pop_front', line: [1, 2], cells: { [c]: 'dead' }, desc: `<code>pop_front()</code>: уничтожаем первый элемент <b>${v}</b>.` });
          blocks[map[start.node]].cells[start.cur] = null;
          start.cur++;
          S({ code: 'pop_front', line: [3], desc: '<code>++start.cur</code>. O(1).' });
        } else {
          S({ code: 'pop_front', line: [1, 4, 5], cells: { [c]: 'dead' }, desc: `<code>pop_front()</code>: <b>${v}</b> — последний элемент первого блока.` });
          blocks[map[start.node]].cells[start.cur] = null;
          const freed = start.node;
          delete blocks[map[start.node]]; map[start.node] = null; stats.nodeFrees++;
          start = { node: start.node + 1, cur: 0 };
          S({ code: 'pop_front', line: [6, 7, 8], slots: { [freed]: 'dead' }, desc: `Блок в слоте ${freed} опустел и освобождён, <code>start</code> → начало следующего блока.` });
        }
        break;
      }
      case 'at': {
        const n = size();
        if (x < 0 || x >= n) { S({ code: 'at', desc: `<code>d[${x}]</code>: индекс вне [0, ${n}) — <span class="warn">UB</span> (а <code>at()</code> бросил бы out_of_range).` }); break; }
        const off = x + start.cur, slot = start.node + Math.floor(off / B), cur = off % B;
        S({ code: 'at', line: [2], at: x, desc: `<code>d[${x}]</code>: off = ${x} + start.cur(${start.cur}) = <b>${off}</b>.` });
        S({ code: 'at', line: [3, 4], at: x, slots: { [slot]: 'read' }, cells: { [ck(slot, cur)]: 'read' },
            desc: `Слот = start.node + ${off}/${B} = <b>${slot}</b>, ячейка ${off} % ${B} = <b>${cur}</b> → <b>${blocks[map[slot]].cells[cur]}</b>. Два разыменования, но O(1).` });
        break;
      }
      case 'clear': {
        const cells = {};
        for (const e of elems()) cells[ck(e.slot, e.cur)] = 'dead';
        S({ code: 'clear', line: [1], cells, desc: `<code>clear()</code>: уничтожаем все ${size()} элемент(ов).` });
        for (const e of elems()) blocks[map[e.slot]].cells[e.cur] = null;
        const slots = {};
        for (let p = start.node + 1; p <= finish.node; p++) { slots[p] = 'dead'; delete blocks[map[p]]; map[p] = null; stats.nodeFrees++; }
        finish = { ...start };
        S({ code: 'clear', line: [2, 3, 4, 5], slots, desc: 'Все блоки, кроме первого, освобождены. Карта остаётся прежнего размера.' });
        break;
      }
    }
  });
  opIdx = -1;
  S({ code: 'push_back', desc: `<span class="ok">Готово.</span> Блоков выделено ${stats.nodeAllocs}, освобождено ${stats.nodeFrees}; карт выделено ${stats.mapAllocs}. Ни один элемент ни разу не переместился.` });
  return steps;
}

/* Logical contents of a snapshot (used by renderer and tests). */
function dequeElems(s) {
  const out = [];
  let n = s.start.node, c = s.start.cur;
  while (n < s.finish.node || (n === s.finish.node && c < s.finish.cur)) {
    out.push({ v: s.blocks[s.map[n]].cells[c], slot: n, cur: c });
    if (++c === s.B) { c = 0; n++; }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { dequeSimulate, dequeElems };
