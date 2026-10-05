document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();
  const { COL, cell, frame, label, arrow, path, hex } = CppViz;

  const svg = d3.select('#viz-svg').attr('viewBox', '0 0 720 450');
  CppViz.defs(svg);
  const root = svg.append('g');

  const LOCAL = 15;               // _S_local_capacity в libstdc++ (64 бит)
  const MAX_CAP = 120;
  const STACK = { s: 0x7ffd3a20, t: 0x7ffd3a40 };

  const kw = s => `<span class="kw">${s}</span>`, fn = s => `<span class="fn">${s}</span>`;
  const cm = s => `<span class="cm">${s}</span>`, nm = s => `<span class="num">${s}</span>`;
  const LISTINGS = {
    append: [
      `string&amp; ${fn('append')}(${kw('const char')}* s, size_t n) {`,
      `  len = ${fn('size')}() + n;`,
      `  ${kw('if')} (len &lt;= ${fn('capacity')}())`,
      `    ${fn('copy')}(${fn('data')}() + ${fn('size')}(), s, n); ${cm('// на месте')}`,
      `  ${kw('else')}`,
      `    ${fn('_M_mutate')}(${fn('size')}(), ${nm(0)}, s, n);`,
      `  ${fn('_M_set_length')}(len);   ${cm("// + '\\0'")}`,
      `}`,
      `${cm('// operator= — то же, но с позиции 0')}`,
    ],
    mutate: [
      `${kw('void')} ${fn('_M_mutate')}(pos, len1, s, len2) {`,
      `  new_cap = ${fn('size')}() + len2 - len1;`,
      `  p = ${fn('_M_create')}(new_cap, ${fn('capacity')}());`,
      `  ${fn('copy')}(p, старое + новое);`,
      `  ${fn('_M_dispose')}();   ${cm('// free, если не SSO')}`,
      `  ${fn('_M_data')}(p); ${fn('_M_capacity')}(new_cap);`,
      `}`,
      `${kw('char')}* ${fn('_M_create')}(size_t&amp; cap, size_t old) {`,
      `  ${kw('if')} (cap &gt; old &amp;&amp; cap &lt; ${nm(2)} * old)`,
      `    cap = ${nm(2)} * old;        ${cm('// рост ×2')}`,
      `  ${kw('return')} ${fn('allocate')}(cap + ${nm(1)});  ${cm("// +'\\0'")}`,
      `}`,
    ],
    push_back: [
      `${kw('void')} ${fn('push_back')}(${kw('char')} c) {`,
      `  n = ${fn('size')}();`,
      `  ${kw('if')} (n + ${nm(1)} &gt; ${fn('capacity')}())`,
      `    ${fn('_M_mutate')}(n, ${nm(0)}, ${kw('nullptr')}, ${nm(1)});`,
      `  ${fn('data')}()[n] = c;`,
      `  ${fn('_M_set_length')}(n + ${nm(1)});`,
      `}`,
    ],
    pop_back: [
      `${kw('void')} ${fn('pop_back')}() {`,
      `  ${fn('_M_set_length')}(${fn('size')}() - ${nm(1)});`,
      `  ${cm("// просто пишет '\\0' раньше")}`,
      `}`,
    ],
    reserve: [
      `${kw('void')} ${fn('reserve')}(size_t res) {`,
      `  ${kw('if')} (res &lt;= ${fn('capacity')}()) ${kw('return')};`,
      `  p = ${fn('_M_create')}(res, ${fn('capacity')}()); ${cm('// ×2')}`,
      `  ${fn('copy')}(p, ${fn('data')}(), ${fn('size')}() + ${nm(1)});`,
      `  ${fn('_M_dispose')}();`,
      `  ${fn('_M_data')}(p); ${fn('_M_capacity')}(res);`,
      `}`,
      `${cm('// C++20: reserve() больше не сжимает')}`,
    ],
    shrink: [
      `${kw('void')} ${fn('shrink_to_fit')}() {`,
      `  ${kw('if')} (${fn('_M_is_local')}()) ${kw('return')};`,
      `  ${kw('if')} (${fn('size')}() &lt;= ${nm(15)}) {     ${cm('// назад в SSO')}`,
      `    ${fn('copy')}(local_buf, ${fn('data')}(), ${fn('size')}()+${nm(1)});`,
      `    ${fn('_M_destroy')}(); ${fn('_M_data')}(local_buf);`,
      `  } ${kw('else if')} (${fn('size')}() &lt; ${fn('capacity')}()) {`,
      `    p = ${fn('allocate')}(${fn('size')}() + ${nm(1)});`,
      `    ${fn('copy')}(p, ${fn('data')}(), ${fn('size')}() + ${nm(1)});`,
      `    ${fn('_M_dispose')}(); ${fn('_M_data')}(p);`,
      `    ${fn('_M_capacity')}(${fn('size')}());`,
      `  }`,
      `}`,
    ],
    clear: [
      `${kw('void')} ${fn('clear')}() {`,
      `  ${fn('_M_set_length')}(${nm(0)});  ${cm("// data()[0] = '\\0'")}`,
      `  ${cm('// буфер и capacity остаются')}`,
      `}`,
    ],
    move: [
      `string(string&amp;&amp; o) ${kw('noexcept')} {`,
      `  _M_p = local_buf;`,
      `  ${kw('if')} (o.${fn('_M_is_local')}())`,
      `    ${fn('copy')}(local_buf, o.local_buf, o.${fn('size')}()+${nm(1)});`,
      `  ${kw('else')} {`,
      `    _M_p = o._M_p;           ${cm('// забираем буфер')}`,
      `    ${fn('_M_capacity')}(o.${fn('capacity')}());`,
      `  }`,
      `  ${fn('_M_length')}(o.${fn('size')}());`,
      `  o._M_p = o.local_buf; o.${fn('_M_set_length')}(${nm(0)});`,
      `}`,
    ],
    ptr: [
      `${kw('const char')}* p = s.${fn('c_str')}();   ${cm('// == data()')}`,
      `${cm('// при SSO p указывает ВНУТРЬ объекта s,')}`,
      `${cm('// иначе — в кучу. Висячим станет после')}`,
      `${cm('// любой реаллокации буфера и после move.')}`,
    ],
  };

  /* ── Parse C++-like script ────────────────────────────── */
  function parseScript(text) {
    const parts = [];
    let cur = '', q = false;
    for (const ch of text) {
      if (ch === '"') q = !q;
      if ((ch === ';' || ch === '\n') && !q) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    const ops = [];
    const rx = [
      [/^s\s*=\s*"(.*)"$/, m => ({ name: 'assign', str: m[1] })],
      [/^s\s*\+=\s*"(.*)"$/, m => ({ name: 'append', str: m[1] })],
      [/^s\.append\(\s*"(.*)"\s*\)$/, m => ({ name: 'append', str: m[1] })],
      [/^s\.push_back\(\s*'(.)'\s*\)$/, m => ({ name: 'push_back', str: m[1] })],
      [/^s\.pop_back\(\s*\)$/, () => ({ name: 'pop_back' })],
      [/^s\.reserve\(\s*(\d+)\s*\)$/, m => ({ name: 'reserve', n: +m[1] })],
      [/^s\.shrink_to_fit\(\s*\)$/, () => ({ name: 'shrink' })],
      [/^s\.clear\(\s*\)$/, () => ({ name: 'clear' })],
      [/^(?:const\s+char\s*\*\s*|auto\s+)?p\s*=\s*s\.(?:c_str|data)\(\s*\)$/, () => ({ name: 'ptr' })],
      [/^(?:std::string\s+|auto\s+)?t\s*=\s*(?:std::)?move\(\s*s\s*\)$/, () => ({ name: 'move' })],
    ];
    for (const raw of parts) {
      const src = raw.trim();
      if (!src) continue;
      const hit = rx.find(([r]) => r.test(src));
      if (!hit) throw new Error(`не понял «${src}». Примеры: s = "hi"; s += "!"; s.push_back('x'); s.reserve(40); s.shrink_to_fit(); s.clear(); p = s.c_str(); t = std::move(s)`);
      const op = hit[1](src.match(hit[0]));
      if (op.str !== undefined && op.str.length > 60) throw new Error('строка длиннее 60 символов');
      op.label = src.replace(/\s+/g, ' ');
      ops.push(op);
    }
    if (ops.length > 60) throw new Error('слишком много операций');
    return ops;
  }

  /* ── Simulation ───────────────────────────────────────── */
  function simulate(ops) {
    const heap = CppViz.heap(9, 0x4eb0);
    const steps = [];
    const mk = () => ({ local: true, len: 0, cap: LOCAL, addr: null, buf: ['\0', ...new Array(15).fill(null)] });
    let s = mk(), t = null, ptr = null, opIdx = -1, allocs = 0, frees = 0;
    const clone = x => x && { ...x, buf: [...x.buf] };
    const S = (o = {}) => steps.push({
      op: opIdx, code: o.code, line: o.line || [], desc: o.desc || '',
      s: clone(o.s || s), t: clone(t), old: clone(o.old || null), ptrOn: o.ptrOn || 's',
      tones: o.tones || {}, ttones: o.ttones || {}, otones: o.otones || {},
      ptr: ptr && { ...ptr }, allocs, frees,
    });
    const setLen = (x, n) => { x.len = n; x.buf[n] = '\0'; };
    const toneRange = (a, b, tone) => Object.fromEntries(Array.from({ length: Math.max(0, b - a) }, (_, i) => [a + i, tone]));
    const killPtr = why => { if (ptr && !ptr.dead) { ptr.dead = true; ptr.why = why; } };
    const ptrAddr = x => (x.local ? STACK.s + 16 : x.addr);

    /* grow to hold `need` chars; contents: keep first `keep` chars, then `extra` chars */
    function mutate(need, keep, extra, codeKey, lines) {
      const old = clone(s);
      let cap = need;
      const doubled = cap > s.cap && cap < 2 * s.cap;
      if (doubled) cap = 2 * s.cap;
      if (cap > MAX_CAP) return false;
      S({ code: 'mutate', line: [1, 2, 7, 8, 9], tones: toneRange(0, s.len, 'read'),
          desc: `Нужно ${need} символов, а capacity = ${s.cap}. <code>_M_create(${need}, ${s.cap})</code>: ${doubled ? `${need} &lt; 2·${s.cap} → берём <b>${cap}</b> (рост минимум вдвое)` : `берём ровно <b>${cap}</b>`}.` });
      const addr = heap.alloc(cap + 1); allocs++;
      const fresh = { local: false, len: 0, cap, addr, buf: new Array(cap + 1).fill(null) };
      for (let i = 0; i < keep; i++) fresh.buf[i] = old.buf[i];
      [...extra].forEach((c, i) => { fresh.buf[keep + i] = c; });
      setLen(fresh, keep + extra.length);
      const tn = { ...toneRange(0, keep, 'moved'), ...toneRange(keep, keep + extra.length, 'new') };
      S({ code: 'mutate', line: [3, 10], s: fresh, old, ptrOn: 'old', tones: tn, otones: toneRange(0, keep, 'moved'),
          desc: `<code>allocate(${cap + 1})</code> в куче (${hex(addr)}; +1 байт под <code>'\\0'</code>), копируем ${keep} старых символа и ${extra.length} новых.` });
      killPtr('буфер перевыделен');
      if (!old.local) frees++;
      s = fresh;
      S({ code: 'mutate', line: [4, 5], tones: tn, otones: toneRange(0, old.cap + 1, 'dead'),
          desc: old.local
            ? 'Старый буфер — это <code>_M_local_buf</code> внутри объекта, освобождать нечего. <code>_M_p</code> теперь смотрит в кучу, а в союзе вместо символов хранится <code>_M_allocated_capacity</code>.'
            : `Старый буфер ${hex(old.addr)} освобождён, <code>_M_p</code> → ${hex(addr)}.` });
      return true;
    }

    S({ code: 'append', desc: '<code>std::string s;</code> — 32 байта на стеке: указатель, длина и 16-байтный буфер. Пустая строка уже «лежит» во внутреннем буфере, <code>_M_p</code> указывает на него. Ни одной аллокации.' });

    ops.forEach((o, i) => {
      opIdx = i;
      switch (o.name) {
        case 'assign': case 'append': {
          const isA = o.name === 'append';
          const keep = isA ? s.len : 0, len = keep + o.str.length;
          S({ code: 'append', line: isA ? [0, 1, 2] : [8, 1, 2], tones: toneRange(0, s.len, isA ? 'none' : 'read'),
              desc: `<code>${o.label}</code>: итоговая длина ${len}, capacity ${s.cap}${s.local ? ' (SSO)' : ''}.` });
          if (len <= s.cap) {
            [...o.str].forEach((c, k) => { s.buf[keep + k] = c; });
            setLen(s, len);
            if (ptr && !ptr.dead && s.len === 0) { /* still valid */ }
            S({ code: 'append', line: [3, 6], tones: { ...toneRange(keep, len, 'new'), [len]: 'active' },
                desc: `Влезает в текущий буфер${s.local ? ' — прямо внутри объекта, <b>без аллокации</b>' : ''}: копируем символы и ставим <code>'\\0'</code> на позицию ${len}.` });
          } else {
            S({ code: 'append', line: [4, 5], tones: toneRange(0, s.len, 'read'), desc: `${len} &gt; capacity ${s.cap} → <code>_M_mutate</code>.` });
            if (!mutate(len, keep, o.str, 'append')) { S({ code: 'append', desc: `Для наглядности ёмкость ограничена ${MAX_CAP}. Операция пропущена.` }); break; }
            S({ code: 'append', line: [6], tones: { [s.len]: 'active' }, desc: `size = ${s.len}, capacity = ${s.cap}. Строка живёт в куче.` });
          }
          break;
        }
        case 'push_back': {
          const n = s.len;
          S({ code: 'push_back', line: [1, 2], tones: { [n]: 'active' }, desc: `<code>push_back('${o.str}')</code>: size ${n}, capacity ${s.cap}.` });
          if (n + 1 > s.cap) {
            if (!mutate(n + 1, n, o.str, 'push_back')) { S({ code: 'push_back', desc: `Ёмкость ограничена ${MAX_CAP}.` }); break; }
            S({ code: 'push_back', line: [4, 5], tones: { [n]: 'new' }, desc: `Символ записан, size = ${s.len}.` });
          } else {
            s.buf[n] = o.str; setLen(s, n + 1);
            S({ code: 'push_back', line: [4, 5], tones: { [n]: 'new', [n + 1]: 'active' }, desc: `Место есть: пишем '${o.str}' и сдвигаем <code>'\\0'</code>.` });
          }
          break;
        }
        case 'pop_back': {
          if (!s.len) { S({ code: 'pop_back', desc: 'Пустая строка — <span class="warn">UB</span>.' }); break; }
          setLen(s, s.len - 1);
          S({ code: 'pop_back', line: [1, 2], tones: { [s.len]: 'active' }, desc: `Длина ${s.len}: <code>'\\0'</code> записан поверх последнего символа. Память не трогаем.` });
          break;
        }
        case 'reserve': {
          if (o.n <= s.cap) { S({ code: 'reserve', line: [1, 7], desc: `<code>reserve(${o.n})</code> ≤ capacity ${s.cap} — ничего (с C++20 reserve не сжимает).` }); break; }
          if (!mutate(o.n, s.len, '', 'reserve')) { S({ code: 'reserve', desc: `Ёмкость ограничена ${MAX_CAP}.` }); break; }
          S({ code: 'reserve', line: [5], tones: { [s.len]: 'active' }, desc: `capacity = <b>${s.cap}</b>${s.cap !== o.n ? ` — больше запрошенных ${o.n}: сработало правило «не меньше чем вдвое»` : ''}.` });
          break;
        }
        case 'shrink': {
          if (s.local) { S({ code: 'shrink', line: [1], desc: 'Строка и так в SSO-буфере — ничего не делаем.' }); break; }
          if (s.len <= LOCAL) {
            const old = clone(s);
            const nl = mk();
            for (let k = 0; k < s.len; k++) nl.buf[k] = s.buf[k];
            setLen(nl, s.len);
            killPtr('строка вернулась в SSO');
            s = nl; frees++;
            S({ code: 'shrink', line: [2, 3, 4], old, ptrOn: 's', tones: toneRange(0, s.len, 'moved'), otones: toneRange(0, old.cap + 1, 'dead'),
                desc: `size ${s.len} ≤ 15 → строка <b>возвращается в SSO</b>: символы копируются во внутренний буфер, куча освобождена.` });
            S({ code: 'shrink', line: [], desc: `capacity = ${s.cap}, аллокаций в куче нет.` });
          } else if (s.len < s.cap) {
            const old = clone(s);
            const addr = heap.alloc(s.len + 1); allocs++;
            const fresh = { local: false, len: s.len, cap: s.len, addr, buf: [...s.buf.slice(0, s.len), '\0'] };
            killPtr('буфер перевыделен'); frees++;
            s = fresh;
            S({ code: 'shrink', line: [5, 6, 7, 8, 9], old, tones: toneRange(0, s.len, 'moved'), otones: toneRange(0, old.cap + 1, 'dead'),
                desc: `Новый буфер ровно на ${s.len}+1 байт, старый (${old.cap}+1) освобождён.` });
          } else S({ code: 'shrink', line: [5], desc: 'capacity == size — ничего не делаем.' });
          break;
        }
        case 'clear': {
          setLen(s, 0);
          S({ code: 'clear', line: [1, 2], tones: { 0: 'active' }, desc: `size = 0, но capacity = <b>${s.cap}</b>${s.local ? '' : ' — буфер в куче остался'}.` });
          break;
        }
        case 'ptr': {
          ptr = { owner: 's', addr: ptrAddr(s), local: s.local, dead: false };
          S({ code: 'ptr', line: [0], tones: { 0: 'ok' }, desc: `<code>p = s.c_str()</code> = ${hex(ptr.addr)} — ${s.local ? 'адрес <b>внутри самого объекта s</b> на стеке' : 'адрес буфера в куче'}.` });
          break;
        }
        case 'move': {
          const wasLocal = s.local;
          t = mk();
          S({ code: 'move', line: [0, 1], tones: toneRange(0, s.len, 'read'), desc: `<code>${o.label}</code>: создаём t, его <code>_M_p</code> сначала смотрит на свой локальный буфер.` });
          if (wasLocal) {
            for (let k = 0; k <= s.len; k++) t.buf[k] = s.buf[k];
            t.len = s.len;
            S({ code: 'move', line: [2, 3, 8], tones: toneRange(0, s.len, 'read'), ttones: toneRange(0, t.len, 'new'),
                desc: `s в SSO → <b>копируем ${s.len} символов</b>. Для коротких строк move — это обычное копирование (дёшево: ≤ 16 байт).` });
            if (ptr && !ptr.dead && ptr.local) killPtr('символы были внутри s, теперь s пуста');
          } else {
            t = { local: false, len: s.len, cap: s.cap, addr: s.addr, buf: [...s.buf] };
            S({ code: 'move', line: [4, 5, 6, 8], ttones: toneRange(0, t.len, 'ok'),
                desc: `s в куче → t просто <b>забирает указатель</b> ${hex(s.addr)} и capacity. Ни одного символа не скопировано, O(1). Указатель p (если был) смотрит в тот же буфер — теперь им владеет t.` });
          }
          s = mk();
          S({ code: 'move', line: [9], desc: 'Источник s приведён в пустое SSO-состояние: <code>_M_p</code> → свой local_buf, длина 0.' });
          break;
        }
      }
    });
    opIdx = -1;
    S({ code: 'append', desc: `<span class="ok">Готово.</span> Аллокаций в куче: ${allocs}, освобождений: ${frees}.` });
    return steps;
  }

  /* ── Rendering ────────────────────────────────────────── */
  const CW = 19, CG = 1;
  const show = c => (c === null || c === undefined ? '' : c === '\0' ? '\\0' : c === ' ' ? '␣' : c);

  function drawObject(g, name, x, y, st, tones, ptrState) {
    const base = STACK[name];
    frame(g, x - 6, y - 6, 32 * (CW + CG) + 12, 52, `${name} @${hex(base)} — std::string, sizeof = 32`);
    // _M_p
    cell(g, x, y, 8 * (CW + CG) - CG, 26, st.local ? hex(base + 16) : hex(st.addr), st.local ? 'active' : 'read', { size: 10.5, rx: 3 });
    label(g, x + 80, y + 38, '_M_p', { color: COL.muted, size: 9, mono: true, anchor: 'middle' });
    const x2 = x + 8 * (CW + CG);
    cell(g, x2, y, 8 * (CW + CG) - CG, 26, st.len, 'none', { size: 11, rx: 3 });
    label(g, x2 + 80, y + 38, '_M_string_length', { color: COL.muted, size: 9, mono: true, anchor: 'middle' });
    const x3 = x2 + 8 * (CW + CG);
    if (st.local) {
      for (let i = 0; i < 16; i++) {
        const c = st.buf[i];
        const tone = tones[i] || (i < st.len ? 'none' : c === '\0' ? 'active' : 'raw');
        cell(g, x3 + i * (CW + CG), y, CW, 26, show(i <= st.len ? c : null) || (i > st.len ? '·' : ''), tone, { size: c === '\0' ? 8 : 11, rx: 2 });
      }
      label(g, x3 + 160, y + 38, '_M_local_buf[16]', { color: COL.amber, size: 9, mono: true, anchor: 'middle' });
    } else {
      cell(g, x3, y, 8 * (CW + CG) - CG, 26, st.cap, 'none', { size: 11, rx: 3 });
      label(g, x3 + 80, y + 38, '_M_allocated_capacity', { color: COL.muted, size: 9, mono: true, anchor: 'middle' });
      cell(g, x3 + 8 * (CW + CG), y, 8 * (CW + CG) - CG, 26, 'не используется', 'raw', { size: 9, rx: 3, weight: 500, font: 'sans' });
    }
    return { pX: x + 4 * (CW + CG), pY: y + 26, bufX: x3 };
  }

  function drawHeap(g, st, x, y, tones, { dead = false, caption } = {}) {
    const n = st.cap + 1, PER = 32;
    const rows = Math.ceil(n / PER);
    frame(g, x - 6, y - 6, Math.min(n, PER) * (CW + CG) + 12, rows * 30 + 6, caption, { color: dead ? '#4a2a2a' : '#2c2c2c', dash: dead ? '4 3' : null });
    for (let i = 0; i < n; i++) {
      const c = st.buf[i];
      const tone = tones[i] || (i < st.len ? 'none' : (c === '\0' && i === st.len) ? 'active' : 'raw');
      cell(g, x + (i % PER) * (CW + CG), y + Math.floor(i / PER) * 30, CW, 26, i <= st.len ? show(c) : '', tone, { size: c === '\0' ? 8 : 11, rx: 2 });
    }
    return rows * 30;
  }

  function applyStep(st) {
    root.selectAll('*').remove();
    const g = root;
    const X = 24;
    const sObj = drawObject(g, 's', X, 44, st.ptrOn === 'old' && st.old ? st.old : st.s, st.ptrOn === 'old' ? st.otones : st.tones);
    if (st.ptrOn === 'old' && st.old && !st.old.local) { /* old heap buffer drawn below */ }

    let y = 160;
    if (st.t) {
      drawObject(g, 't', X, 150, st.t, st.ttones);
      y = 250;
    }

    // heap buffers
    const cur = st.s;
    const heapBufs = [];
    if (st.old && !st.old.local) heapBufs.push({ b: st.old, tones: st.otones, dead: Object.values(st.otones).includes('dead'), cap: `старый буфер @${hex(st.old.addr)}` });
    if (!cur.local) heapBufs.push({ b: cur, tones: st.tones, cap: `куча @${hex(cur.addr)}: capacity ${cur.cap} + 1 байт под '\\0'` });
    if (st.t && !st.t.local && !heapBufs.some(h => h.b.addr === st.t.addr)) heapBufs.push({ b: st.t, tones: st.ttones, cap: `куча @${hex(st.t.addr)} — теперь принадлежит t` });
    const yHeap = {};
    heapBufs.forEach(h => { yHeap[h.b.addr] = y + 18; y += drawHeap(g, h.b, X, y + 18, h.tones, { dead: h.dead, caption: h.cap }) + 40; });

    // _M_p arrows
    const sShown = st.ptrOn === 'old' && st.old ? st.old : st.s;
    if (sShown.local) {
      path(g, [[sObj.pX, 44 + 26], [sObj.pX, 44 + 54], [sObj.bufX + 8, 44 + 54], [sObj.bufX + 8, 44 + 27]], { color: 'amber', width: 1.4, r: 6 });
      label(g, (sObj.pX + sObj.bufX) / 2 + 20, 44 + 68, '_M_p указывает внутрь самого объекта', { color: COL.amber, size: 9.5, anchor: 'middle' });
    } else if (yHeap[sShown.addr] !== undefined) arrow(g, sObj.pX, sObj.pY + 2, X + 8, yHeap[sShown.addr] - 8, { color: 'blue', width: 1.4 });
    if (st.t && !st.t.local && yHeap[st.t.addr] !== undefined) arrow(g, sObj.pX + 40, 150 + 28, X + 30, yHeap[st.t.addr] - 8, { color: 'green', width: 1.4 });

    // tracked c_str() pointer
    if (st.ptr) {
      const text = `p = ${hex(st.ptr.addr)}${st.ptr.dead ? ` — висячий (${st.ptr.why})` : st.ptr.local ? ' → внутри s' : ' → куча'}`;
      label(g, 720 - 24, 438, text, { color: st.ptr.dead ? COL.red : COL.greenHi, size: 10.5, mono: true, anchor: 'end', weight: 700 });
    }

    CppViz.code(LISTINGS, st.code, st.line);
    CppViz.opsStripSync(st.op);
    VizState.setDesc(st.desc);
    const sv = st.s;
    CppViz.state({
      's-size': sv.len,
      's-cap': `${sv.cap}${sv.local ? ' <span class="dim">(SSO)</span>' : ''}`,
      's-where': sv.local ? '<span class="ok">внутри объекта (SSO)</span>' : 'в куче',
      's-str': `"${sv.buf.slice(0, sv.len).join('')}"`,
      's-alloc': `${st.allocs} <span class="dim">/ освобождено ${st.frees}</span>`,
    });
  }

  /* ── Wiring ───────────────────────────────────────────── */
  const PRESETS = [
    { name: 'Граница SSO: 15 → 16 символов', script: 's = "hello"; s += " world"; p = s.c_str(); s += "!!!!"; s.push_back(\'?\'); s.push_back(\'!\')' },
    { name: 'Рост ×2 и shrink_to_fit', script: 's = "0123456789abcdef"; s += "0123456789abcdef"; s.clear(); s = "short"; s.shrink_to_fit()' },
    { name: 'reserve: правило ×2', script: 's = "abc"; s.reserve(20); s.reserve(25); s.reserve(70)' },
    { name: 'move: короткая и длинная', script: 's = "tiny"; t = std::move(s); s = "a string that does not fit"; p = s.c_str(); t = std::move(s)' },
  ];
  const bar = CppViz.scriptBar({
    presets: PRESETS, onRun: () => run(),
    hint: 'Синтаксис: <code>s = "…"</code> <code>s += "…"</code> <code>s.push_back(\'c\')</code> <code>s.pop_back()</code> <code>s.reserve(n)</code> <code>s.shrink_to_fit()</code> <code>s.clear()</code> <code>p = s.c_str()</code> <code>t = std::move(s)</code>',
  });

  function run() {
    CppViz.resetCode();
    let ops;
    try { ops = parseScript(bar.text); bar.error(''); }
    catch (e) { bar.error(e.message); return; }
    const steps = simulate(ops);
    CppViz.opsStrip(ops, steps);
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizAnim.bindUI(run);
  run();
});
