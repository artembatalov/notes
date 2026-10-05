document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, cell, frame, label, arrow, hex } = CppViz;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 430');
  CppViz.defs(svg);
  const root = svg.append('g');

  /* ── Growth policy toggle ─────────────────────────────── */
  let growth = 2;
  const tg = document.createElement('div');
  tg.className = 'toggle-group';
  tg.innerHTML = `<button class="toggle-btn active" data-g="2" title="libstdc++ (GCC) и libc++ (Clang)">×2 GCC/Clang</button>
                  <button class="toggle-btn" data-g="1.5" title="Microsoft STL">×1.5 MSVC</button>`;
  document.getElementById('controls').appendChild(tg);
  tg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    tg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    growth = +b.dataset.g;
    run();
  }));

  /* ── Code listings ────────────────────────────────────── */
  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`, nm = s => `<span class="num">${s}</span>`;
  const CODE = () => ({
    push_back: [
      `${kw('void')} ${fn('push_back')}(${kw('const')} T& x) {`,
      `  ${kw('if')} (finish != end_of_storage) {`,
      `    ${fn('construct')}(finish, x);`,
      `    ++finish;`,
      `  } ${kw('else')}`,
      `    ${fn('realloc_insert')}(${fn('end')}(), x);`,
      `}`,
    ],
    realloc: [
      `${kw('void')} ${fn('realloc_insert')}(iterator pos, T x) {`,
      growth === 2
        ? `  size_t len = ${fn('size')}() + ${fn('max')}(${fn('size')}(), ${nm(1)});`
        : `  size_t len = ${fn('max')}(cap + cap/${nm(2)}, ${fn('size')}()+${nm(1)});`,
      `  T* p = ${fn('allocate')}(len);`,
      `  ${fn('construct')}(p + (pos - start), x);`,
      `  T* f = ${fn('uninit_move')}(start, pos, p);`,
      `  f = ${fn('uninit_move')}(pos, finish, f+${nm(1)});`,
      `  ${fn('destroy')}(start, finish);`,
      `  ${fn('deallocate')}(start);`,
      `  start = p; finish = f;`,
      `  end_of_storage = p + len;`,
      `}`,
    ],
    insert: [
      `iterator ${fn('insert')}(iterator pos, ${kw('const')} T& x) {`,
      `  ${kw('if')} (finish == end_of_storage)`,
      `    ${kw('return')} ${fn('realloc_insert')}(pos, x);`,
      `  ${kw('if')} (pos == ${fn('end')}()) {`,
      `    ${fn('construct')}(finish, x); ++finish;`,
      `  } ${kw('else')} {`,
      `    ${fn('construct')}(finish, ${fn('move')}(finish[-${nm(1)}]));`,
      `    ++finish;`,
      `    ${fn('move_backward')}(pos, finish-${nm(2)}, finish-${nm(1)});`,
      `    *pos = x;`,
      `  }`,
      `  ${kw('return')} pos;`,
      `}`,
    ],
    erase: [
      `iterator ${fn('erase')}(iterator pos) {`,
      `  ${kw('if')} (pos + ${nm(1)} != ${fn('end')}())`,
      `    ${fn('move')}(pos + ${nm(1)}, finish, pos);  ${cm('// сдвиг')}`,
      `  --finish;`,
      `  ${fn('destroy')}(finish);`,
      `  ${kw('return')} pos;`,
      `}`,
    ],
    pop_back: [
      `${kw('void')} ${fn('pop_back')}() {`,
      `  --finish;`,
      `  ${fn('destroy')}(finish);  ${cm('// capacity та же')}`,
      `}`,
    ],
    reserve: [
      `${kw('void')} ${fn('reserve')}(size_t n) {`,
      `  ${kw('if')} (n <= ${fn('capacity')}()) ${kw('return')};`,
      `  T* p = ${fn('allocate')}(n);`,
      `  ${fn('uninit_move')}(start, finish, p);`,
      `  ${fn('destroy')}(start, finish);`,
      `  ${fn('deallocate')}(start);`,
      `  finish = p + ${fn('size')}(); start = p;`,
      `  end_of_storage = p + n;`,
      `}`,
    ],
    shrink: [
      `${kw('void')} ${fn('shrink_to_fit')}() {`,
      `  ${kw('if')} (${fn('capacity')}() == ${fn('size')}()) ${kw('return')};`,
      `  ${cm('// копия ровно на size() элементов')}`,
      `  vector tmp(${fn('make_move_iterator')}(${fn('begin')}()),`,
      `             ${fn('make_move_iterator')}(${fn('end')}()));`,
      `  tmp.${fn('swap')}(*${kw('this')});  ${cm('// старое умрёт с tmp')}`,
      `}`,
    ],
    clear: [
      `${kw('void')} ${fn('clear')}() {`,
      `  ${fn('destroy')}(start, finish);`,
      `  finish = start;  ${cm('// память не отдаём')}`,
      `}`,
    ],
    it: [
      `${kw('auto')} it = v.${fn('begin')}() + i;`,
      `${cm('// итератор vector — обёртка над T*.')}`,
      `${cm('// Висячим становится, если:')}`,
      `${cm('//  • произошла реаллокация;')}`,
      `${cm('//  • вставка/удаление на его месте')}`,
      `${cm('//    или левее.')}`,
    ],
  });
  let LISTINGS = CODE();

  /* ── Simulation → steps ───────────────────────────────── */
  const SPEC = { push_back: 'n', emplace_back: 'n', pop_back: 0, insert: 2, erase: 1,
                 reserve: 1, shrink_to_fit: 0, clear: 0, it: 1 };

  function simulate(ops) {
    const heap = CppViz.heap(11);
    const steps = [];
    let addr = null, cap = 0, data = [];
    let allocs = 0, moves = 0, shifts = 0, pushes = 0;
    let it = null; // {i, addr, dead}
    let opIdx = -1;

    const S = (o = {}) => steps.push({
      op: opIdx, code: o.code, line: o.line || [], desc: o.desc || '',
      cur: o.cur || { addr, cap, vals: [...data], tones: o.tones || {} },
      old: o.old || null, ptrOn: o.ptrOn || 'cur',
      moves: o.moves || [], shifts: o.shifts || [],
      it: it ? { ...it } : null,
      st: { size: o.size ?? data.length, cap: o.capShown ?? cap, addr: o.addrShown !== undefined ? o.addrShown : addr,
            allocs, moves, shifts, pushes },
    });
    const kill = why => { if (it && !it.dead) { it.dead = true; it.why = why; } };
    const allocate = n => { allocs++; return heap.alloc(n * 4); };

    /* Move all of data into a fresh buffer of `len`, optionally inserting x at pos. */
    function relocate(len, pos, x, codeKey, lines) {
      const oldAddr = addr, oldCap = cap, oldVals = [...data];
      const p = allocate(len);
      const newVals = new Array(len).fill(null);
      const snapNew = (tones, vals = newVals) => ({ addr: p, cap: len, vals: [...vals], tones, raw: true });
      const snapOld = tones => ({ addr: oldAddr, cap: oldCap, vals: oldVals, tones });
      S({ code: codeKey, line: [].concat(lines.alloc), old: snapOld({}), cur: snapNew({}), ptrOn: 'old',
          desc: `<code>allocate(${len})</code> → новый буфер по адресу <b>${hex(p)}</b>. Старый пока жив.` });
      let n = 0;
      if (x !== undefined) {
        newVals[pos] = x;
        S({ code: codeKey, line: [].concat(lines.construct), old: snapOld({}), cur: snapNew({ [pos]: 'new' }), ptrOn: 'old',
            desc: `Сначала конструируем новый элемент <b>${x}</b> прямо на его место [${pos}] в новом буфере (так проще откатиться при исключении).` });
      }
      const mv = [], tonesNew = x !== undefined ? { [pos]: 'new' } : {}, tonesOld = {};
      oldVals.forEach((v, i) => {
        const j = x !== undefined && i >= pos ? i + 1 : i;
        newVals[j] = v; mv.push([i, j]); tonesNew[j] = 'moved'; tonesOld[i] = 'moved'; n++;
      });
      moves += n;
      if (n) S({ code: codeKey, line: lines.move, old: snapOld(tonesOld), cur: snapNew(tonesNew), ptrOn: 'old', moves: mv,
                 desc: `<code>uninitialized_move</code>: ${n} элемент(ов) переезжают в новый буфер. Это <b>O(n)</b>, но случается редко.` });
      const deadOld = Object.fromEntries(oldVals.map((_, i) => [i, 'dead']));
      kill('реаллокация');
      if (oldAddr !== null)
        S({ code: codeKey, line: lines.free, old: snapOld(deadOld), cur: snapNew(tonesNew), ptrOn: 'old',
            desc: `Старые объекты уничтожены, буфер <b>${hex(oldAddr)}</b> возвращён аллокатору. Все старые итераторы, указатели и ссылки теперь <span class="warn">висячие</span>.` });
      addr = p; cap = len; data = newVals.slice(0, oldVals.length + (x !== undefined ? 1 : 0));
      return tonesNew;
    }

    S({ code: 'push_back', desc: '<code>std::vector&lt;int&gt; v;</code> — пустой вектор: три нулевых указателя, памяти в куче нет.' });

    ops.forEach((o, k) => {
      opIdx = k;
      const [a, b] = o.args;
      switch (o.name) {
        case 'push_back': case 'emplace_back': {
          pushes++;
          if (data.length < cap) {
            S({ code: 'push_back', line: [1], desc: `<code>${o.label}</code>: size ${data.length} &lt; capacity ${cap} — место есть.` });
            if (it && !it.dead && it.i === data.length) kill('end() сдвинулся');
            data.push(a);
            S({ code: 'push_back', line: [2, 3], tones: { [data.length - 1]: 'new' },
                desc: `Конструируем <b>${a}</b> в <code>*finish</code> и сдвигаем <code>finish</code>. Без реаллокации — <b>O(1)</b>.` });
          } else {
            const n = data.length;
            const len = growth === 2 ? n + Math.max(n, 1) : Math.max(cap + Math.floor(cap / 2), n + 1);
            S({ code: 'push_back', line: [1, 4, 5], tones: Object.fromEntries(data.map((_, i) => [i, 'read'])),
                desc: `<code>${o.label}</code>: size == capacity == ${n} — места нет, нужна <b>реаллокация</b>.` });
            S({ code: 'realloc', line: [1], tones: Object.fromEntries(data.map((_, i) => [i, 'read'])),
                desc: growth === 2
                  ? `Новая ёмкость: <code>${n} + max(${n}, 1) = ${len}</code> — удваиваем.`
                  : `Новая ёмкость: <code>max(${cap} + ${cap}/2, ${n + 1}) = ${len}</code> — растём в 1.5 раза.` });
            const tones = relocate(len, n, a, 'realloc', { alloc: 2, construct: 3, move: [4, 5], free: [6, 7] });
            S({ code: 'realloc', line: [8, 9], tones,
                desc: `Указатели переставлены на новый буфер: size = ${data.length}, capacity = ${cap}.` });
          }
          break;
        }
        case 'pop_back': {
          if (!data.length) { S({ code: 'pop_back', desc: `<code>pop_back()</code> на пустом векторе — <span class="warn">UB</span>. Пропускаем.` }); break; }
          const last = data.length - 1;
          S({ code: 'pop_back', line: [1], tones: { [last]: 'dead' }, desc: `<code>pop_back()</code>: <code>--finish</code> → указывает на последний элемент <b>${data[last]}</b>.` });
          if (it && !it.dead && it.i >= last) kill('удалён элемент/сдвинулся end()');
          data.pop();
          S({ code: 'pop_back', line: [2], desc: `Элемент уничтожен. capacity осталась <b>${cap}</b> — память не освобождается.` });
          break;
        }
        case 'insert': {
          const pos = a, x = b;
          if (pos < 0 || pos > data.length) { S({ code: 'insert', desc: `<code>insert</code>: позиция ${pos} вне [0, ${data.length}] — <span class="warn">UB</span>. Пропускаем.` }); break; }
          if (data.length === cap) {
            S({ code: 'insert', line: [1, 2], tones: Object.fromEntries(data.map((_, i) => [i, 'read'])),
                desc: `<code>insert(begin()+${pos}, ${x})</code>: места нет → реаллокация, вставка прямо при переносе.` });
            const n = data.length;
            const len = growth === 2 ? n + Math.max(n, 1) : Math.max(cap + Math.floor(cap / 2), n + 1);
            const tones = relocate(len, pos, x, 'realloc', { alloc: 2, construct: 3, move: [4, 5], free: [6, 7] });
            S({ code: 'realloc', line: [8, 9], tones, desc: `Готово: элементы до позиции ${pos} перенесены слева от нового, остальные — справа.` });
            break;
          }
          if (pos === data.length) {
            data.push(x);
            if (it && !it.dead && it.i >= pos) kill('вставка на его месте');
            S({ code: 'insert', line: [3, 4], tones: { [pos]: 'new' }, desc: `Вставка в конец — как <code>push_back</code>, без сдвигов.` });
            break;
          }
          const n = data.length;
          S({ code: 'insert', line: [1, 3], tones: { [pos]: 'active' },
              desc: `<code>insert(begin()+${pos}, ${x})</code>: место есть, но всё правее позиции ${pos} надо сдвинуть на одну ячейку.` });
          const after = [...data, data[n - 1]];
          S({ code: 'insert', line: [6, 7], cur: { addr, cap, vals: after, tones: { [n]: 'new' } }, size: n + 1, shifts: [[n - 1, n]],
              desc: `В сырую ячейку [${n}] конструируем копию последнего элемента (move).` });
          const shifted = [...after];
          const sh = [];
          for (let i = n - 1; i > pos; i--) { shifted[i] = shifted[i - 1]; sh.push([i - 1, i]); }
          shifts += n - pos;
          const tShift = Object.fromEntries(sh.map(([, j]) => [j, 'moved']));
          tShift[n] = 'moved';
          if (sh.length) S({ code: 'insert', line: [8], cur: { addr, cap, vals: shifted, tones: { ...tShift, [pos]: 'active' } }, size: n + 1, shifts: sh,
                            desc: `<code>move_backward</code>: сдвигаем элементы [${pos}..${n - 2}] на одну позицию вправо — <b>O(n − pos)</b>.` });
          shifted[pos] = x;
          data = shifted;
          if (it && !it.dead && it.i >= pos) kill('сдвиг при вставке');
          S({ code: 'insert', line: [9], tones: { ...tShift, [pos]: 'new' }, desc: `<code>*pos = ${x}</code>. Итераторы на позиции ≥ ${pos} теперь указывают не туда.` });
          break;
        }
        case 'erase': {
          const pos = a;
          if (pos < 0 || pos >= data.length) { S({ code: 'erase', desc: `<code>erase</code>: позиция ${pos} вне [0, ${data.length}) — <span class="warn">UB</span>. Пропускаем.` }); break; }
          const n = data.length;
          S({ code: 'erase', line: [0], tones: { [pos]: 'dead' }, desc: `<code>erase(begin()+${pos})</code>: удаляем <b>${data[pos]}</b>.` });
          const sh = [];
          const v = [...data];
          for (let i = pos; i < n - 1; i++) { v[i] = v[i + 1]; sh.push([i + 1, i]); }
          shifts += n - 1 - pos;
          if (sh.length) S({ code: 'erase', line: [1, 2], cur: { addr, cap, vals: v, tones: Object.fromEntries(sh.map(([, j]) => [j, 'moved'])) }, shifts: sh,
                            desc: `Сдвигаем хвост [${pos + 1}..${n - 1}] на одну позицию влево — <b>O(n − pos)</b>.` });
          if (it && !it.dead && it.i >= pos) kill('удаление на его месте или левее');
          S({ code: 'erase', line: [3, 4], cur: { addr, cap, vals: v, tones: { [n - 1]: 'dead' } }, size: n,
              desc: `Последняя ячейка теперь лишняя: <code>--finish</code>, объект в ней уничтожается.` });
          v.pop(); data = v;
          S({ code: 'erase', line: [5], desc: `size = ${data.length}, capacity = ${cap}.` });
          break;
        }
        case 'reserve': {
          if (a <= cap) { S({ code: 'reserve', line: [1], desc: `<code>reserve(${a})</code>: ${a} ≤ capacity ${cap} — ничего не делаем (уменьшать reserve не умеет).` }); break; }
          if (a > 64) { S({ code: 'reserve', desc: `Для наглядности ограничимся ёмкостью 64.` }); break; }
          S({ code: 'reserve', line: [1], desc: `<code>reserve(${a})</code>: ${a} &gt; capacity ${cap} — выделяем ровно ${a}.` });
          relocate(a, 0, undefined, 'reserve', { alloc: 2, construct: 2, move: [3], free: [4, 5] });
          S({ code: 'reserve', line: [6, 7], desc: `capacity = ${cap}. Следующие ${cap - data.length} вставок в конец пройдут без реаллокаций.` });
          break;
        }
        case 'shrink_to_fit': {
          if (cap === data.length) { S({ code: 'shrink', line: [1], desc: `capacity == size — ничего не делаем.` }); break; }
          if (!data.length) {
            S({ code: 'shrink', line: [3, 4], desc: `Временный вектор пуст и памяти не выделяет.` });
            kill('shrink_to_fit');
            addr = null; cap = 0;
            S({ code: 'shrink', line: [5], desc: `После <code>swap</code> наш вектор пуст и без буфера, старый буфер освобождён.` });
            break;
          }
          S({ code: 'shrink', line: [1, 2], desc: `capacity ${cap} &gt; size ${data.length}: строим копию ровно на ${data.length} элементов.` });
          relocate(data.length, 0, undefined, 'shrink', { alloc: [3, 4], construct: 3, move: [3, 4], free: [5] });
          S({ code: 'shrink', line: [5], desc: `capacity = size = ${cap}. Это тоже реаллокация — итераторы инвалидированы.` });
          break;
        }
        case 'clear': {
          S({ code: 'clear', line: [1], tones: Object.fromEntries(data.map((_, i) => [i, 'dead'])), desc: `<code>clear()</code>: уничтожаем все ${data.length} элемент(ов).` });
          kill('clear');
          data = [];
          S({ code: 'clear', line: [2], desc: `size = 0, но capacity = <b>${cap}</b>: буфер остаётся. Чтобы отдать память — <code>shrink_to_fit()</code> или swap с пустым.` });
          break;
        }
        case 'it': {
          if (a < 0 || a > data.length) { S({ code: 'it', desc: `Итератор на позицию ${a} вне [0, ${data.length}] — пропускаем.` }); break; }
          it = { i: a, addr: addr === null ? null : addr + 4 * a, val: data[a], dead: false };
          S({ code: 'it', line: [0], tones: { [a]: 'ok' },
              desc: `<code>it = v.begin() + ${a}</code> → адрес <b>${it.addr === null ? 'nullptr' : hex(it.addr)}</b>${a < data.length ? `, <code>*it == ${data[a]}</code>` : ' (это end())'}. Следим, что с ним станет.` });
          break;
        }
      }
    });
    opIdx = -1;
    S({ code: 'push_back', desc: `<span class="ok">Готово.</span> Аллокаций: ${allocs}, перенесено при реаллокациях: ${moves}, сдвигов при insert/erase: ${shifts}.` });
    return steps;
  }

  /* ── Rendering ────────────────────────────────────────── */
  const X0 = 24, GAP = 4;
  function geometry(step) {
    const maxCap = Math.max(1, step.cur?.cap || 0, step.old?.cap || 0);
    const cw = Math.max(16, Math.min(46, Math.floor((672 - GAP * (maxCap - 1)) / maxCap)));
    return { cw, ch: 40, cx: i => X0 + i * (cw + GAP) };
  }

  const captionBelow = (cap, cw) => X0 + cap * (cw + GAP) - GAP + 16 + 230 >= 716;

  function drawBuffer(g, buf, y, geo, { caption, faded = false } = {}) {
    const { cw, ch, cx } = geo;
    if (!buf || buf.addr === null || buf.cap === 0) {
      label(g, X0, y + ch / 2 + 4, 'nullptr — буфера нет', { color: COL.muted, size: 12, mono: true });
      return;
    }
    const w = buf.cap * (cw + GAP) - GAP;
    frame(g, X0 - 6, y - 6, w + 12, ch + 12, null, { color: faded ? '#4a2a2a' : '#2c2c2c', dash: faded ? '4 3' : null });
    const right = X0 + w + 16;
    if (!captionBelow(buf.cap, cw)) label(g, right, y + ch / 2 + 4, caption, { color: COL.muted2, size: 10.5 });
    else label(g, X0 - 4, y + ch + 22, caption, { color: COL.muted2, size: 10.5 });
    for (let i = 0; i < buf.cap; i++) {
      const v = buf.vals[i];
      const has = v !== null && v !== undefined && i < buf.vals.length;
      const tone = buf.tones[i] || (has ? 'none' : 'raw');
      cell(g, cx(i), y, cw, ch, has ? v : '', tone, { size: cw < 26 ? 11 : 15 });
      if (cw >= 22) label(g, cx(i) + 4, y + 10, i, { color: '#4a4a4a', size: 8, mono: true });
    }
  }

  function applyStep(step) {
    root.selectAll('*').remove();
    const g = root;
    const geo = geometry(step);
    const { cw, ch, cx } = geo;
    const st = step.st;

    /* vector object on the stack */
    const OX = 24, OY = 40, OW = 260;
    frame(g, OX, OY, OW, 92, 'v — объект std::vector<int> на стеке (24 байта)');
    const ptrBuf = step.ptrOn === 'old' ? step.old : step.cur;
    const pa = ptrBuf && ptrBuf.addr !== null && ptrBuf.cap ? ptrBuf.addr : null;
    const fmt = off => pa === null ? 'nullptr' : hex(pa + 4 * off);
    const sizeForPtr = step.ptrOn === 'old' ? step.old.vals.length : st.size;
    const capForPtr = step.ptrOn === 'old' ? step.old.cap : st.cap;
    [['_M_start', fmt(0), 'start'], ['_M_finish', fmt(sizeForPtr), 'finish'], ['_M_end_of_storage', fmt(capForPtr), 'end']]
      .forEach(([k, v], r) => {
        const y = OY + 22 + r * 26;
        label(g, OX + 12, y, k, { color: COL.muted2, size: 11, mono: true });
        label(g, OX + OW - 12, y, v, { color: v === 'nullptr' ? COL.muted : COL.amberHi, size: 11.5, mono: true, anchor: 'end', weight: 700 });
      });

    /* size / capacity summary */
    const sx = 320;
    label(g, sx, OY + 22, `size()      = ${st.size}`, { color: COL.text, size: 12.5, mono: true, weight: 600 });
    label(g, sx, OY + 48, `capacity()  = ${st.cap}`, { color: COL.text, size: 12.5, mono: true, weight: 600 });
    label(g, sx, OY + 74, `сырой памяти: ${Math.max(0, st.cap - st.size)} × 4 байта`, { color: COL.muted, size: 11, mono: true });

    /* buffers */
    const hasOld = !!step.old;
    const yCur = hasOld ? 320 : 240, yOld = 200;
    if (hasOld) drawBuffer(g, step.old, yOld, geo, {
      caption: `старый буфер @${hex(step.old.addr || 0)}, capacity ${step.old.cap}`,
      faded: Object.values(step.old.tones).includes('dead'),
    });
    drawBuffer(g, step.cur, yCur, geo, {
      caption: step.cur.addr !== null ? `${hasOld ? 'новый буфер' : 'буфер в куче'} @${hex(step.cur.addr)}, ${step.cur.cap} × int` : '',
    });

    /* pointer tags above the buffer that `start` points to */
    if (pa !== null) {
      const yb = step.ptrOn === 'old' ? yOld : yCur;
      const tags = [['start', 0, 14, COL.amber], ['finish', sizeForPtr, 30, COL.blue], ['end_of_storage', capForPtr, 46, COL.muted2]];
      tags.forEach(([name, off, h, color]) => {
        const x = off < capForPtr ? cx(off) : cx(capForPtr - 1) + cw;
        const top = yb - 6 - h - 4;
        g.append('line').attr('x1', x).attr('x2', x).attr('y1', top + 3).attr('y2', yb - 7)
          .attr('stroke', color).attr('stroke-width', 1.3);
        const flip = x + name.length * 6.2 > 716;
        label(g, flip ? x - 3 : x + 3, top + 6, name, { color, size: 10, mono: true, weight: 700, anchor: flip ? 'end' : 'start' });
      });
    }

    /* relocation arrows old → new */
    if (hasOld) step.moves.forEach(([i, j]) => arrow(g, cx(i) + cw / 2, yOld + ch + 3, cx(j) + cw / 2, yCur - 9, { color: 'purple', width: 1.3, opacity: .85 }));
    /* shift arcs inside a buffer */
    step.shifts.forEach(([i, j]) => arrow(g, cx(i) + cw / 2, yCur - 7, cx(j) + cw / 2, yCur - 7, { color: 'purple', bend: i < j ? -14 : 14, width: 1.3 }));

    /* tracked iterator */
    if (step.it) {
      const it = step.it, yb = yCur + ch + 6 + (captionBelow(step.cur.cap || 0, cw) ? 22 : 0);
      const x = cx(Math.min(it.i, Math.max(0, (step.cur.cap || 1) - 1))) + (it.i >= (step.cur.cap || 0) ? cw : cw / 2);
      const color = it.dead ? COL.red : COL.greenHi;
      g.append('line').attr('x1', x).attr('x2', x).attr('y1', yb + 18).attr('y2', yb + 2).attr('stroke', color).attr('stroke-width', 1.5)
        .attr('stroke-dasharray', it.dead ? '3 2' : null);
      label(g, x, yb + 32, it.dead ? `it → ${it.addr === null ? 'nullptr' : hex(it.addr)} висячий!` : `it → ${hex(it.addr ?? 0)}`,
        { color, size: 10.5, mono: true, anchor: 'middle', weight: 700 });
    }

    /* side panel */
    CppViz.code(LISTINGS, step.code, step.line);
    CppViz.opsStripSync(step.op);
    VizState.setDesc(step.desc);
    CppViz.state({
      's-size': st.size,
      's-cap': st.cap,
      's-data': st.addr === null ? '<span class="dim">nullptr</span>' : hex(st.addr),
      's-alloc': st.allocs,
      's-moves': `${st.moves}${st.pushes ? ` <span class="dim">(${(st.moves / st.pushes).toFixed(2)} на push_back)</span>` : ''}`,
      's-it': !step.it ? '<span class="dim">—</span>'
        : step.it.dead ? `<span class="warn">висячий (${step.it.why})</span>` : `<span class="ok">валиден</span>, индекс ${step.it.i}`,
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */
  const PRESETS = [
    { name: 'Рост ёмкости', script: 'push_back 10 20 30 40 50; it 1; push_back 60 70 80; push_back 90; pop_back; shrink_to_fit' },
    { name: 'insert и erase', script: 'push_back 1 2 3 4 5; reserve 8; it 3; insert 1 9; erase 0; insert 5 7; erase 2; clear' },
    { name: 'reserve заранее', script: 'reserve 8; push_back 1..8; push_back 9' },
    { name: 'Амортизация: 17 push_back', script: 'push_back 1..17' },
  ];
  const bar = CppViz.scriptBar({
    presets: PRESETS, onRun: () => run(),
    hint: 'Операции: <code>push_back x…</code> <code>pop_back</code> <code>insert i x</code> <code>erase i</code> <code>reserve n</code> <code>shrink_to_fit</code> <code>clear</code> <code>it i</code> · диапазон <code>1..8</code> · повтор <code>pop_back x3</code>',
  });

  function run() {
    LISTINGS = CODE();
    CppViz.resetCode();
    let ops;
    try { ops = CppViz.parse(bar.text, SPEC); bar.error(''); }
    catch (e) { bar.error(e.message); return; }
    const steps = simulate(ops);
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
