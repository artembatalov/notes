/* Модель std::unordered_map<int, V> как в libstdc++ (_Hashtable):
   - все узлы — один односвязный список от _M_before_begin;
   - узлы одной корзины идут подряд, корзина хранит указатель на узел ПЕРЕД группой;
   - _Prime_rehash_policy: 1 корзина у пустой таблицы, затем 13 → 29 → 59 → 127…
   umSimulate(ops) → шаги-снимки. Без DOM. */
const UM_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
  103, 109, 113, 127, 137, 139, 149, 157, 167, 179, 193, 199, 211, 227, 241, 257, 277, 293, 313, 337, 359, 383,
  409, 439, 467, 503, 541];
const UM_FAST = [2, 2, 2, 3, 5, 5, 7, 7, 11, 11, 11, 11, 13, 13];
const UM_MAX_BUCKETS = 127;

function umSimulate(ops) {
  const steps = [];
  let bc = 1, mlf = 1.0, nextResize = 0, list = [], opIdx = -1, nextId = 1;
  let stats = { rehashes: 0, cmps: 0 };
  const bkt = (k, n = bc) => k % n;

  function nextBkt(n) {
    if (n < UM_FAST.length) {
      if (n === 0) return 1;
      nextResize = Math.floor(UM_FAST[n] * mlf);
      return UM_FAST[n];
    }
    const p = UM_PRIMES.slice(6).find(x => x >= n) ?? UM_PRIMES[UM_PRIMES.length - 1];
    nextResize = Math.floor(p * mlf);
    return p;
  }
  /* returns {rehash: bool, n, why} */
  function needRehash(nBkt, nElt, nIns) {
    if (nElt + nIns > nextResize) {
      const minBkts = Math.max(nElt + nIns, nextResize ? 0 : 11) / mlf;
      if (minBkts >= nBkt) {
        const want = Math.max(Math.floor(minBkts) + 1, nBkt * 2);
        return { rehash: true, want, minBkts };
      }
      nextResize = Math.floor(nBkt * mlf);
      return { rehash: false, minBkts, updated: true };
    }
    return { rehash: false };
  }

  const S = (o = {}) => steps.push({
    op: opIdx, code: o.code, line: o.line || [], desc: o.desc || '',
    bc: o.bc ?? bc, mlf, nextResize, size: o.size ?? list.length,
    list: (o.list || list).map(n => ({ ...n })), pending: o.pending ? o.pending.map(n => ({ ...n })) : null,
    hl: o.hl || {}, bhl: o.bhl || {}, floating: o.floating || null, stats: { ...stats },
  });

  /* insert at group start, or at list head if the bucket is empty */
  function bucketBeginInsert(arr, node, n) {
    const b = bkt(node.key, n);
    const i = arr.findIndex(x => bkt(x.key, n) === b);
    if (i >= 0) { arr.splice(i, 0, node); return 'group'; }
    arr.unshift(node); return 'head';
  }

  function rehash(n, why) {
    S({ code: 'rehash', line: [0, 1, 2, 3], desc: `${why} Выделяем новый массив на <b>${n}</b> корзин; узлы не копируются — только перецепляются.` });
    const old = [...list];
    const fresh = [];
    for (let i = 0; i < old.length; i++) {
      const p = old[i];
      const b = bkt(p.key, n);
      const where = bucketBeginInsert(fresh, p, n);
      S({ code: 'rehash', line: where === 'head' ? [5, 6, 7, 8, 9, 10, 11] : [5, 12, 13, 14], bc: n, list: fresh, pending: old.slice(i + 1),
          hl: { [p.id]: 'new' }, bhl: { [b]: 'active' },
          desc: `${p.key} % ${n} = <b>${b}</b>: ${where === 'head' ? 'корзина пуста → узел в голову списка' : 'корзина уже есть → в начало её группы'}.` });
    }
    list = fresh; bc = n; stats.rehashes++;
    S({ code: 'rehash', line: [18, 19], desc: `Старый массив корзин освобождён. bucket_count = <b>${bc}</b>, load_factor = ${(list.length / bc).toFixed(2)}. Все итераторы инвалидированы, а указатели и ссылки на элементы — нет.` });
  }

  function findIn(k, code, lines) {
    const b = bkt(k);
    const group = list.filter(x => bkt(x.key) === b);
    S({ code, line: lines.hash, bhl: { [b]: 'active' }, floating: { key: k },
        desc: `hash(${k}) = ${k} (для int — тождественная), корзина ${k} % ${bc} = <b>${b}</b>.` });
    if (!group.length) { S({ code, line: lines.empty, bhl: { [b]: 'read' }, floating: { key: k }, desc: `Корзина ${b} пуста.` }); return null; }
    for (const x of group) {
      stats.cmps++;
      if (x.key === k) {
        S({ code, line: lines.hit, bhl: { [b]: 'read' }, hl: { [x.id]: 'ok' }, floating: { key: k }, desc: `Сравнение ${x.key} == ${k} → <b>найден</b>.` });
        return x;
      }
      S({ code, line: lines.miss, bhl: { [b]: 'read' }, hl: { [x.id]: 'read' }, floating: { key: k }, desc: `${x.key} ≠ ${k}, идём дальше по цепочке…` });
    }
    S({ code, line: lines.end, bhl: { [b]: 'read' }, floating: { key: k }, desc: `Следующий узел уже из другой корзины → в корзине ${b} ключа ${k} нет.` });
    return null;
  }

  S({ code: 'insert', desc: '<code>std::unordered_map&lt;int, V&gt; m;</code> — у пустой таблицы <b>одна</b> встроенная корзина и никаких аллокаций. Узлы ещё не созданы.' });

  ops.forEach((o, i) => {
    opIdx = i;
    const a = o.args[0];
    switch (o.name) {
      case 'insert': {
        if (findIn(a, 'insert', { hash: [1, 2], empty: [3], hit: [3, 4], miss: [3], end: [3] })) {
          S({ code: 'insert', line: [3, 4], desc: `Ключ ${a} уже есть: <code>insert</code> вернул <code>{it, false}</code>.` });
          break;
        }
        const node = { id: nextId++, key: a };
        S({ code: 'insert', line: [5, 6], floating: { key: a, node: true }, desc: `Создаём узел {${a}, …}. Проверяем политику: size + 1 = ${list.length + 1}, next_resize = ${nextResize}.` });
        const nr = nextResize;
        const need = needRehash(bc, list.length, 1);
        if (need.rehash) {
          const n = nextBkt(need.want);
          if (n > UM_MAX_BUCKETS) { S({ code: 'policy', desc: `Нужно ${n} корзин — для наглядности визуализация ограничена ${UM_MAX_BUCKETS}. Вставка пропущена.` }); break; }
          S({ code: 'policy', line: [1, 2, 3, 4, 5, 6], floating: { key: a, node: true },
              desc: `${list.length + 1} &gt; next_resize (${nr}) и нужно ≥ ${need.minBkts.toFixed(0)} корзин ≥ ${bc} → <b>rehash</b> на следующее простое ≥ max(${Math.floor(need.minBkts) + 1}, ${bc}·2) = <b>${n}</b>.` });
          rehash(n, list.length ? `Нагрузка превысила max_load_factor = ${mlf}.` : 'Первая вставка: таблица заводит настоящий массив корзин.');
        } else if (need.updated)
          S({ code: 'policy', line: [1, 7], floating: { key: a, node: true }, desc: `Корзин хватает — обновляем next_resize = ⌊${bc} · ${mlf}⌋ = <b>${nextResize}</b>.` });
        const b = bkt(a);
        const where = bucketBeginInsert(list, node, bc);
        S({ code: 'insert', line: where === 'head' ? [10, 16, 17, 18, 19, 20] : [10, 13, 14, 15], hl: { [node.id]: 'new' }, bhl: { [b]: 'active' },
            desc: where === 'head'
              ? `Корзина ${b} была пуста → узел встаёт в <b>голову</b> общего списка, а корзина ${b} теперь указывает на <code>_M_before_begin</code>.`
              : `Корзина ${b} не пуста → узел встаёт в <b>начало её группы</b>. Коллизия: в корзине теперь ${list.filter(x => bkt(x.key) === b).length} узла.` });
        break;
      }
      case 'find': {
        const r = findIn(a, 'find', { hash: [1], empty: [2, 3], hit: [4, 5], miss: [4, 5, 6, 7], end: [6, 7] });
        S({ code: 'find', line: r ? [5] : [3], hl: r ? { [r.id]: 'ok' } : {}, desc: r ? `<code>find(${a})</code> → итератор на узел ${a}.` : `<code>find(${a})</code> → <code>end()</code>.` });
        break;
      }
      case 'erase': {
        const r = findIn(a, 'erase', { hash: [1], empty: [1], hit: [1], miss: [1], end: [1] });
        if (!r) { S({ code: 'erase', line: [1], desc: `<code>erase(${a})</code> вернул 0.` }); break; }
        list = list.filter(x => x.id !== r.id);
        S({ code: 'erase', line: [2, 3, 4, 5], bhl: { [bkt(a)]: 'read' }, desc: `Узел ${a} вырезан из списка и удалён. Число корзин <b>не уменьшается</b> — ни при erase, ни при clear.` });
        break;
      }
      case 'rehash': case 'reserve': {
        const isRes = o.name === 'reserve';
        const want = isRes ? Math.ceil(a / mlf) : a;
        const saved = nextResize;
        let n = Math.max(Math.ceil((list.length + 1) / mlf), want);
        n = nextBkt(n);
        if (n > UM_MAX_BUCKETS) { nextResize = saved; S({ code: 'reserve', desc: `Получилось бы ${n} корзин — для наглядности ограничимся ${UM_MAX_BUCKETS}.` }); break; }
        S({ code: 'reserve', line: isRes ? [5, 6, 0, 1, 2] : [0, 1, 2], desc: `<code>${o.label}</code>: нужно ≥ ${Math.max(Math.ceil((list.length + 1) / mlf), want)} корзин → следующее простое = <b>${n}</b>.` });
        if (n === bc) { nextResize = saved; S({ code: 'reserve', line: [3], desc: 'Уже столько корзин — ничего не делаем.' }); break; }
        rehash(n, `<code>${o.label}</code>:`);
        break;
      }
      case 'max_load_factor': {
        mlf = a; nextResize = 0;
        S({ code: 'reserve', line: [8, 9, 10], desc: `max_load_factor = <b>${a}</b>. Сразу ничего не перестраивается: next_resize обнулён, и решение примет следующая вставка.` });
        break;
      }
    }
  });
  opIdx = -1;
  S({ code: 'insert', desc: `<span class="ok">Готово.</span> size = ${list.length}, bucket_count = ${bc}, load_factor = ${(list.length / bc).toFixed(2)}, rehash-ей: ${stats.rehashes}.` });
  return steps;
}

if (typeof module !== 'undefined') module.exports = { umSimulate };
