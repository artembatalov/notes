/* Красно-чёрное дерево как в libstdc++ (_Rb_tree): вставка с балансировкой,
   удаление с перестановкой узлов (а не копированием ключей), find / lower_bound
   только через operator<, обход через _Rb_tree_increment.
   rbSimulate(ops) → массив шагов-снимков. Без DOM. */
function rbSimulate(ops) {
  const N = {};
  let root = null, nextId = 1, size = 0, opIdx = -1;
  const steps = [];

  const S = (o = {}) => steps.push({
    op: opIdx, code: o.code, line: o.line || [], desc: o.desc || '',
    nodes: Object.fromEntries(Object.entries(N).map(([k, n]) => [k, { ...n }])),
    root, size, hl: o.hl || {}, probe: o.probe ?? null, nil: o.nil || null,
    cand: o.cand ?? null, iter: o.iter ?? null, visited: o.visited || [],
  });
  const P = id => (id === null ? null : N[id].parent);
  const L = id => (id === null ? null : N[id].left);
  const R = id => (id === null ? null : N[id].right);
  const red = id => id !== null && N[id].color === 'R';
  const black = id => !red(id);
  const key = id => N[id].key;
  const sideOf = id => (L(P(id)) === id ? 'left' : 'right');

  function rotateLeft(x) {
    const y = N[x].right;
    N[x].right = N[y].left;
    if (N[y].left !== null) N[N[y].left].parent = x;
    N[y].parent = N[x].parent;
    if (N[x].parent === null) root = y;
    else if (x === N[N[x].parent].left) N[N[x].parent].left = y;
    else N[N[x].parent].right = y;
    N[y].left = x; N[x].parent = y;
  }
  function rotateRight(x) {
    const y = N[x].left;
    N[x].left = N[y].right;
    if (N[y].right !== null) N[N[y].right].parent = x;
    N[y].parent = N[x].parent;
    if (N[x].parent === null) root = y;
    else if (x === N[N[x].parent].right) N[N[x].parent].right = y;
    else N[N[x].parent].left = y;
    N[y].right = x; N[x].parent = y;
  }
  const rotate = (x, dir) => (dir === 'left' ? rotateLeft(x) : rotateRight(x));
  const dirRu = d => (d === 'left' ? 'влево' : 'вправо');

  function insert(k) {
    let y = null, x = root;
    const visited = [];
    if (x === null) S({ code: 'insert', line: [0, 1], probe: { at: null, key: k }, desc: `<code>insert(${k})</code>: дерево пустое.` });
    while (x !== null) {
      y = x;
      visited.push(x);
      if (k < key(x)) {
        S({ code: 'insert', line: [1], hl: { [x]: 'read' }, probe: { at: x, key: k }, visited: [...visited], desc: `${k} &lt; ${key(x)} → идём <b>влево</b>.` });
        x = L(x);
      } else if (key(x) < k) {
        S({ code: 'insert', line: [1], hl: { [x]: 'read' }, probe: { at: x, key: k }, visited: [...visited], desc: `${k} &gt; ${key(x)} → идём <b>вправо</b>.` });
        x = R(x);
      } else {
        S({ code: 'insert', line: [0], hl: { [x]: 'active' }, desc: `Ключ ${k} уже есть: <code>insert</code> возвращает <code>{it, false}</code>, дерево не меняется. Ни <code>map</code>, ни <code>set</code> не хранят дубликаты (для них — <code>multimap</code>/<code>multiset</code>).` });
        return;
      }
    }
    const z = String(nextId++);
    N[z] = { key: k, color: 'R', left: null, right: null, parent: y };
    if (y === null) root = z;
    else if (k < key(y)) N[y].left = z;
    else N[y].right = z;
    size++;
    S({ code: 'insert', line: [2], hl: { [z]: 'new' }, desc: `Новый узел <b>${k}</b> подвешиваем ${y === null ? 'в корень' : `${k < key(y) ? 'левым' : 'правым'} сыном к ${key(y)}`}. Новые узлы всегда <b>красные</b> — так не ломается чёрная высота.` });

    let cur = z;
    while (cur !== root && red(P(cur))) {
      const p = P(cur), g = P(p);
      const pSide = sideOf(p);
      const u = pSide === 'left' ? R(g) : L(g);
      S({ code: 'insert', line: [3, 4, 5], hl: { [cur]: 'active', [p]: 'warn', ...(u !== null ? { [u]: 'read' } : {}), [g]: 'read' },
          desc: `Нарушение: красный ${key(cur)} под красным родителем ${key(p)}. Дядя — ${u === null ? '<b>nil</b> (чёрный)' : `<b>${key(u)}</b> (${red(u) ? 'красный' : 'чёрный'})`}.` });
      if (red(u)) {
        N[p].color = 'B'; N[u].color = 'B'; N[g].color = 'R';
        S({ code: 'insert', line: [6, 7, 8], hl: { [p]: 'ok', [u]: 'ok', [g]: 'active' },
            desc: `<b>Случай 1</b> — дядя красный: перекрашиваем родителя и дядю в чёрный, деда — в красный. Проблема могла подняться выше: продолжаем с ${key(g)}.` });
        cur = g;
        continue;
      }
      if (sideOf(cur) !== pSide) {
        S({ code: 'insert', line: [10, 11], hl: { [cur]: 'active', [p]: 'read' },
            desc: `<b>Случай 2</b> — «треугольник»: ${key(cur)} внутренний внук. Поворачиваем ${key(p)} ${dirRu(pSide)}, чтобы выпрямить в линию.` });
        cur = p;
        rotate(cur, pSide);
        S({ code: 'insert', line: [11, 13], hl: { [cur]: 'active', [P(cur)]: 'read' }, desc: `После поворота ${key(cur)} и ${key(P(cur))} стоят в линию — это случай 3.` });
      }
      const p2 = P(cur);
      S({ code: 'insert', line: [14, 15], hl: { [cur]: 'active', [p2]: 'read', [g]: 'read' },
          desc: `<b>Случай 3</b> — «линия»: ${key(p2)} → чёрный, ${key(g)} → красный…` });
      N[p2].color = 'B'; N[g].color = 'R';
      rotate(g, pSide === 'left' ? 'right' : 'left');
      S({ code: 'insert', line: [16], hl: { [p2]: 'ok', [g]: 'read' },
          desc: `…и поворот вокруг деда ${dirRu(pSide === 'left' ? 'right' : 'left')}. ${key(p2)} занял место деда — дерево снова корректно.` });
    }
    if (red(root)) {
      N[root].color = 'B';
      S({ code: 'insert', line: [19], hl: { [root]: 'ok' }, desc: `Корень всегда чёрный: перекрашиваем ${key(root)}.` });
    } else S({ code: 'insert', line: [3], hl: { [z]: 'ok' }, desc: `Родитель ${cur === root ? '— корень' : 'чёрный'}: свойства выполнены. Высота ≤ 2·log₂(n+1).` });
  }

  function transplant(u, v) {
    if (P(u) === null) root = v;
    else if (u === L(P(u))) N[P(u)].left = v;
    else N[P(u)].right = v;
    if (v !== null) N[v].parent = N[u].parent;
  }

  function erase(k) {
    let z = root;
    const visited = [];
    while (z !== null && key(z) !== k) {
      visited.push(z);
      S({ code: 'erase', line: [1], hl: { [z]: 'read' }, probe: { at: z, key: k }, visited: [...visited], desc: `Ищем ${k}: ${k < key(z) ? `${k} &lt; ${key(z)} → влево` : `${k} &gt; ${key(z)} → вправо`}.` });
      z = k < key(z) ? L(z) : R(z);
    }
    if (z === null) { S({ code: 'erase', line: [1], desc: `Ключа ${k} нет: <code>erase(${k})</code> вернул 0.` }); return; }
    S({ code: 'erase', line: [1], hl: { [z]: 'dead' }, desc: `Нашли <b>${k}</b>.` });

    let y = z, yColor = N[z].color, x, xParent;
    if (L(z) === null) {
      x = R(z); xParent = P(z);
      transplant(z, R(z));
    } else if (R(z) === null) {
      x = L(z); xParent = P(z);
      transplant(z, L(z));
    } else {
      y = R(z);
      S({ code: 'erase', line: [2, 3], hl: { [z]: 'dead', [y]: 'read' }, desc: `У ${k} два сына. Ищем преемника — минимум правого поддерева.` });
      while (L(y) !== null) { y = L(y); S({ code: 'erase', line: [3], hl: { [z]: 'dead', [y]: 'read' }, desc: `…влево до упора: ${key(y)}.` }); }
      yColor = N[y].color; x = R(y);
      S({ code: 'erase', line: [4, 5], hl: { [z]: 'dead', [y]: 'active' },
          desc: `Преемник — <b>${key(y)}</b>. libstdc++ <b>перевешивает сам узел</b> ${key(y)} на место ${k}, а не копирует ключ: итераторы на другие элементы остаются валидными.` });
      if (P(y) === z) xParent = y;
      else {
        xParent = P(y);
        transplant(y, R(y));
        N[y].right = R(z); N[R(y)].parent = y;
      }
      transplant(z, y);
      N[y].left = L(z); N[L(y)].parent = y;
      N[y].color = N[z].color;
    }
    delete N[z];
    size--;
    const nil = x === null && xParent !== null ? { parent: xParent, side: L(xParent) === null ? 'left' : 'right' } : null;
    S({ code: 'erase', line: [7], hl: { ...(y !== z ? { [y]: 'active' } : {}), ...(x !== null ? { [x]: 'read' } : {}) }, nil,
        desc: `Узел ${k} удалён${y !== z ? `, ${key(y)} встал на его место (и принял его цвет)` : ''}. Убранный из структуры цвет — <b>${yColor === 'R' ? 'красный' : 'чёрный'}</b>.` });
    if (yColor === 'R') { S({ code: 'erase', line: [8], desc: 'Удалён красный — чёрная высота не изменилась, балансировка не нужна.' }); return; }

    while (x !== root && black(x)) {
      const xSide = x !== null ? sideOf(x) : (L(xParent) === null ? 'left' : 'right');
      const far = xSide === 'left' ? 'right' : 'left';
      let w = xSide === 'left' ? R(xParent) : L(xParent);
      const nilHere = () => (x === null ? { parent: xParent, side: xSide } : null);
      S({ code: 'erase', line: [8, 11, 12], hl: { ...(x !== null ? { [x]: 'active' } : {}), [w]: 'read', [xParent]: 'read' }, nil: nilHere(),
          desc: `${x === null ? 'На месте удалённого — nil' : key(x)} «дважды чёрный»: на его пути не хватает одного чёрного. Брат — <b>${key(w)}</b> (${red(w) ? 'красный' : 'чёрный'}).` });
      if (red(w)) {
        N[w].color = 'B'; N[xParent].color = 'R';
        rotate(xParent, xSide);
        S({ code: 'erase', line: [13, 14], hl: { [w]: 'ok', [xParent]: 'read' }, nil: nilHere(),
            desc: `<b>Случай 1</b> — брат красный: перекрашиваем и поворачиваем ${key(xParent)} ${dirRu(xSide)}. Теперь брат чёрный — переходим к случаям 2–4.` });
        w = xSide === 'left' ? R(xParent) : L(xParent);
      }
      const wNear = xSide === 'left' ? L(w) : R(w), wFar = xSide === 'left' ? R(w) : L(w);
      if (black(wNear) && black(wFar)) {
        N[w].color = 'R';
        S({ code: 'erase', line: [15, 16, 17], hl: { [w]: 'warn', [xParent]: 'active' }, nil: nilHere(),
            desc: `<b>Случай 2</b> — оба сына брата чёрные: брат → красный, проблема переходит к родителю ${key(xParent)}.` });
        x = xParent; xParent = P(xParent);
        continue;
      }
      if (black(wFar)) {
        N[wNear].color = 'B'; N[w].color = 'R';
        rotate(w, far);
        S({ code: 'erase', line: [19, 20], hl: { [wNear]: 'read', [w]: 'read' }, nil: nilHere(),
            desc: `<b>Случай 3</b> — дальний сын брата чёрный, ближний красный: поворот брата ${dirRu(far)} сводит к случаю 4.` });
        w = xSide === 'left' ? R(xParent) : L(xParent);
      }
      N[w].color = N[xParent].color; N[xParent].color = 'B';
      const wf = xSide === 'left' ? R(w) : L(w);
      if (wf !== null) N[wf].color = 'B';
      rotate(xParent, xSide);
      S({ code: 'erase', line: [22, 23, 24], hl: { [w]: 'ok', [xParent]: 'read', ...(wf !== null ? { [wf]: 'read' } : {}) },
          desc: `<b>Случай 4</b> — дальний сын брата красный: перекраска и поворот ${key(xParent)} ${dirRu(xSide)}. Недостающий чёрный восполнен — готово.` });
      x = root; xParent = null;
    }
    if (x !== null && red(x)) {
      N[x].color = 'B';
      S({ code: 'erase', line: [27], hl: { [x]: 'ok' }, desc: `${key(x)} был красным — просто красим его в чёрный, и чёрная высота восстановлена.` });
    } else S({ code: 'erase', line: [27], desc: 'Дерево снова красно-чёрное.' });
  }

  function lowerBound(k, code, isFind) {
    let x = root, y = null;
    const visited = [];
    S({ code, line: [1], probe: root !== null ? { at: root, key: k } : null, desc: `<code>${isFind ? 'find' : 'lower_bound'}(${k})</code>: кандидат y = end().` });
    while (x !== null) {
      visited.push(x);
      if (!(key(x) < k)) {
        y = x;
        S({ code, line: [3, 4], hl: { [x]: 'ok' }, cand: y, probe: { at: x, key: k }, visited: [...visited], desc: `!(${key(x)} &lt; ${k}) → <b>${key(x)}</b> — новый кандидат, идём влево искать меньше.` });
        x = L(x);
      } else {
        S({ code, line: [5], hl: { [x]: 'read' }, cand: y, probe: { at: x, key: k }, visited: [...visited], desc: `${key(x)} &lt; ${k} → вправо.` });
        x = R(x);
      }
    }
    if (isFind) {
      const hit = y !== null && !(k < key(y));
      S({ code, line: [7, 8], hl: y !== null ? { [y]: hit ? 'ok' : 'dead' } : {}, cand: y,
          desc: hit ? `Кандидат ${key(y)} и !(${k} &lt; ${key(y)}) → ключи равны: <b>найдено</b>. Только <code>operator&lt;</code>: равенство = «ни один не меньше другого».`
                    : `${y === null ? 'Кандидата нет' : `${k} &lt; ${key(y)}`} → <code>find</code> вернул <b>end()</b>.` });
    } else
      S({ code, line: [7], hl: y !== null ? { [y]: 'ok' } : {}, cand: y,
          desc: y !== null ? `<code>lower_bound(${k})</code> = <b>${key(y)}</b> — первый ключ ≥ ${k}. O(log n).` : `Все ключи &lt; ${k}: результат <b>end()</b>.` });
  }

  function iterate() {
    if (root === null) { S({ code: 'iter', line: [0], desc: 'Пусто: begin() == end().' }); return; }
    let x = root;
    while (L(x) !== null) x = L(x);
    const seen = [x];
    S({ code: 'iter', line: [0, 1], hl: { [x]: 'active' }, iter: [...seen], desc: `<code>begin()</code> = <b>${key(x)}</b>. Его не ищут: header хранит самый левый узел, поэтому begin() — O(1).` });
    for (;;) {
      if (R(x) !== null) {
        let y = R(x);
        while (L(y) !== null) y = L(y);
        S({ code: 'iter', line: [3, 4, 5], hl: { [y]: 'active', [x]: 'read' }, iter: [...seen, y], desc: `++it: у ${key(x)} есть правый сын → самый левый в правом поддереве: <b>${key(y)}</b>.` });
        x = y;
      } else {
        let y = P(x), c = x;
        while (y !== null && c === R(y)) { c = y; y = P(y); }
        if (y === null) { S({ code: 'iter', line: [7, 8, 9, 10], hl: { [x]: 'read' }, iter: [...seen], desc: `++it: поднимаемся от ${key(x)}, пока мы правый сын… дошли до header → <b>end()</b>. Весь обход — O(n): каждое ребро пройдено дважды.` }); return; }
        S({ code: 'iter', line: [7, 8, 9, 10], hl: { [y]: 'active', [x]: 'read' }, iter: [...seen, y], desc: `++it: правого сына нет → поднимаемся, пока мы правый сын: <b>${key(y)}</b>.` });
        x = y;
      }
      seen.push(x);
    }
  }

  S({ code: 'insert', desc: '<code>std::set&lt;int&gt; s;</code> (или <code>std::map&lt;int, V&gt;</code>) — пустое дерево. В объекте только header и счётчик: 48 байт.' });
  ops.forEach((o, i) => {
    opIdx = i;
    switch (o.name) {
      case 'insert': insert(o.args[0]); break;
      case 'erase': erase(o.args[0]); break;
      case 'find': lowerBound(o.args[0], 'find', true); break;
      case 'lower_bound': lowerBound(o.args[0], 'lower', false); break;
      case 'iterate': iterate(); break;
    }
  });
  opIdx = -1;
  S({ code: 'insert', desc: `<span class="ok">Готово.</span> Элементов: ${size}.` });
  return steps;
}

/* Проверка свойств КЧ-дерева (для тестов). */
function rbCheck(s) {
  const N = s.nodes;
  if (s.root !== null && N[s.root].color !== 'B') return 'root red';
  let err = null;
  const walk = (id, lo, hi, parent) => {
    if (id === null) return 1;
    const n = N[id];
    if (n.parent !== parent) err = err || `bad parent at ${n.key}`;
    if ((lo !== null && n.key <= lo) || (hi !== null && n.key >= hi)) err = err || `order at ${n.key}`;
    if (n.color === 'R' && ((n.left && N[n.left].color === 'R') || (n.right && N[n.right].color === 'R'))) err = err || `red-red at ${n.key}`;
    const a = walk(n.left, lo, n.key, id), b = walk(n.right, n.key, hi, id);
    if (a !== b) err = err || `black height at ${n.key}`;
    return a + (n.color === 'B' ? 1 : 0);
  };
  walk(s.root, null, null, null);
  if (Object.keys(N).length !== s.size) err = err || 'size';
  return err;
}

if (typeof module !== 'undefined') module.exports = { rbSimulate, rbCheck };
