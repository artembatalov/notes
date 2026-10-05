document.addEventListener('DOMContentLoaded', () => {
  buildStdControls();

  const svg = d3.select('#viz-svg');
  svg.attr('viewBox', '0 0 700 380');

  let currentMode = 'edit';

  // ── Edit Distance ────────────────────────────────────────
  const S = 'KITTEN', T = 'SITTING';

  function buildEditSteps() {
    const n = S.length, m = T.length;
    const dp = Array.from({length:n+1}, (_,i) => Array.from({length:m+1}, (_,j) => i===0?j:j===0?i:0));
    const steps = [];

    steps.push({ mode:'edit', dp:dp.map(r=>[...r]), hl:[], path:[],
      desc:'Инициализация: dp[0][j]=j (вставки), dp[i][0]=i (удаления).' });

    for (let i=1; i<=n; i++) {
      for (let j=1; j<=m; j++) {
        const deps = [[i-1,j],[i,j-1],[i-1,j-1]];
        if (S[i-1]===T[j-1]) {
          dp[i][j] = dp[i-1][j-1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
        const eq = S[i-1]===T[j-1];
        steps.push({ mode:'edit', dp:dp.map(r=>[...r]), hl:[[i,j]], deps,
          desc: eq
            ? `dp[${i}][${j}]: '${S[i-1]}'='${T[j-1]}' — совпадение, dp[${i}][${j}]=dp[${i-1}][${j-1}]=${dp[i][j]}`
            : `dp[${i}][${j}]: '${S[i-1]}'≠'${T[j-1]}' — min(удал, вст, замена)+1=${dp[i][j]}` });
      }
    }

    // Traceback
    const path=[];
    let ci=n, cj=m;
    while(ci>0||cj>0){
      path.push([ci,cj]);
      if(ci>0&&cj>0&&S[ci-1]===T[cj-1]){ci--;cj--;}
      else{
        const del=ci>0?dp[ci-1][cj]:Infinity;
        const ins=cj>0?dp[ci][cj-1]:Infinity;
        const rep=ci>0&&cj>0?dp[ci-1][cj-1]:Infinity;
        if(rep<=del&&rep<=ins){ci--;cj--;}
        else if(del<=ins){ci--;}
        else{cj--;}
      }
    }
    path.push([0,0]);
    steps.push({ mode:'edit', dp:dp.map(r=>[...r]), hl:[], path,
      desc:`Ответ: ${dp[n][m]} операций. Зелёный путь — оптимальная трассировка.` });
    return steps;
  }

  function renderEdit(step) {
    svg.selectAll('*').remove();
    const cellW=55, cellH=32, ox=60, oy=40;
    const n=S.length, m=T.length;
    const hlSet = new Set((step.hl||[]).map(([r,c])=>`${r},${c}`));
    const depSet = new Set((step.deps||[]).map(([r,c])=>`${r},${c}`));
    const pathSet = new Set((step.path||[]).map(([r,c])=>`${r},${c}`));

    // col headers (T)
    for(let j=0;j<=m;j++){
      svg.append('text').attr('x',ox+(j+1)*cellW+cellW/2).attr('y',oy-8)
        .attr('text-anchor','middle').attr('font-size',12)
        .attr('fill','#585858').text(j===0?'':T[j-1]);
    }
    // row headers (S)
    for(let i=0;i<=n;i++){
      svg.append('text').attr('x',ox+cellW/2).attr('y',oy+(i+1)*cellH+cellH/2+4)
        .attr('text-anchor','middle').attr('font-size',12)
        .attr('fill','#585858').text(i===0?'':S[i-1]);
    }
    // cells
    for(let i=0;i<=n;i++){
      for(let j=0;j<=m;j++){
        const x=ox+(j+1)*cellW, y=oy+(i+1)*cellH;
        const key=`${i},${j}`;
        let fill='#1a1a1a', stroke='#333';
        if(pathSet.has(key)){fill='#2d5e3e';stroke='#5a9a72';}
        else if(hlSet.has(key)){fill='#6a4000';stroke='#c8973e';}
        else if(depSet.has(key)){fill='#1a3050';stroke='#6a9fd4';}
        svg.append('rect').attr('x',x).attr('y',y).attr('width',cellW).attr('height',cellH)
          .attr('fill',fill).attr('stroke',stroke).attr('rx',3);
        svg.append('text').attr('x',x+cellW/2).attr('y',y+cellH/2+5)
          .attr('text-anchor','middle').attr('font-size',12).attr('font-weight',600)
          .attr('font-family',"'JetBrains Mono',monospace")
          .attr('fill', hlSet.has(key)?'#c8973e': pathSet.has(key)?'#7fc999': depSet.has(key)?'#9dc8f0': '#888')
          .text(step.dp[i][j]);
      }
    }
    document.getElementById('s-task').textContent='Ред. расстояние';
    const last=step.hl&&step.hl[0];
    document.getElementById('s-cell').textContent=last?`[${last[0]}][${last[1]}]`:'—';
    document.getElementById('s-val').textContent=last?step.dp[last[0]][last[1]]:'—';
  }

  // ── Bitmask DP (small TSP, n=4) ─────────────────────────
  const CITIES=4;
  const DIST=[[0,3,6,7],[3,0,2,8],[6,2,0,4],[7,8,4,0]];
  const INF=1e9;

  function buildMaskSteps(){
    const dp=Array.from({length:1<<CITIES},()=>new Array(CITIES).fill(INF));
    const steps=[];
    dp[1][0]=0;
    steps.push({ mode:'mask', dp:dp.map(r=>[...r]), curMask:-1, curV:-1,
      desc:'dp[{0}][0]=0 — начинаем в городе 0 (только он посещён).' });

    for(let mask=1;mask<(1<<CITIES);mask++){
      for(let v=0;v<CITIES;v++){
        if(!(mask&(1<<v))||dp[mask][v]===INF) continue;
        for(let u=0;u<CITIES;u++){
          if(mask&(1<<u)) continue;
          const nMask=mask|(1<<u);
          const nd=dp[mask][v]+DIST[v][u];
          if(nd<dp[nMask][u]){
            dp[nMask][u]=nd;
            steps.push({ mode:'mask', dp:dp.map(r=>[...r]), curMask:nMask, curV:u, fromMask:mask, fromV:v,
              desc:`маска ${mask.toString(2).padStart(4,'0')} (${getBits(mask)}) → добавляем город ${u}: dp[${nMask.toString(2).padStart(4,'0')}][${u}]=${nd}` });
          }
        }
      }
    }
    const fullMask=(1<<CITIES)-1;
    let best=INF,bestV=-1;
    for(let v=0;v<CITIES;v++) if(dp[fullMask][v]<best){best=dp[fullMask][v];bestV=v;}
    steps.push({ mode:'mask', dp:dp.map(r=>[...r]), curMask:fullMask, curV:bestV,
      desc:`Ответ: минимальный гамильтонов путь = ${best} (заканчивается в городе ${bestV}).` });
    return steps;
  }

  function getBits(mask){
    const res=[];
    for(let i=0;i<CITIES;i++) if(mask&(1<<i)) res.push(i);
    return '{'+res.join(',')+'}';
  }

  function renderMask(step){
    svg.selectAll('*').remove();
    // City graph
    const cx=180, cy=180, r=100;
    const pos=Array.from({length:CITIES},(_,i)=>[
      cx+r*Math.cos(2*Math.PI*i/CITIES-Math.PI/2),
      cy+r*Math.sin(2*Math.PI*i/CITIES-Math.PI/2)
    ]);
    // edges
    for(let i=0;i<CITIES;i++) for(let j=i+1;j<CITIES;j++){
      svg.append('line')
        .attr('x1',pos[i][0]).attr('y1',pos[i][1])
        .attr('x2',pos[j][0]).attr('y2',pos[j][1])
        .attr('stroke','#2a2a2a').attr('stroke-width',1);
      svg.append('text')
        .attr('x',(pos[i][0]+pos[j][0])/2).attr('y',(pos[i][1]+pos[j][1])/2-4)
        .attr('text-anchor','middle').attr('font-size',10).attr('fill','#555').text(DIST[i][j]);
    }
    // nodes
    for(let i=0;i<CITIES;i++){
      const inMask=step.curMask>=0&&(step.curMask&(1<<i));
      svg.append('circle').attr('cx',pos[i][0]).attr('cy',pos[i][1]).attr('r',20)
        .attr('fill',step.curV===i?'#c8973e': inMask?'#2d5e3e':'#1e1e1e')
        .attr('stroke',inMask?'#5a9a72':'#333');
      svg.append('text').attr('x',pos[i][0]).attr('y',pos[i][1]+5)
        .attr('text-anchor','middle').attr('font-size',13).attr('font-weight',700)
        .attr('fill','#efefef').text(i);
    }
    // dp table (right side, show full mask row)
    const tx=380, ty=30, cellW=60, cellH=26;
    const fullMask=(1<<CITIES)-1;
    const masks=[1,3,7,5,15,fullMask];
    svg.append('text').attr('x',tx).attr('y',ty-5).attr('font-size',11).attr('fill','#585858').text('dp[mask][v] (выборка):');
    // headers
    for(let v=0;v<CITIES;v++){
      svg.append('text').attr('x',tx+80+v*cellW+cellW/2).attr('y',ty+14)
        .attr('text-anchor','middle').attr('font-size',11).attr('fill','#585858').text(`v=${v}`);
    }
    const shownMasks=[...new Set([1,step.curMask>=0?step.curMask:-1,fullMask])].filter(m=>m>=0).slice(0,6);
    shownMasks.forEach((mask,mi)=>{
      const ry=ty+20+mi*cellH;
      svg.append('text').attr('x',tx+2).attr('y',ry+cellH/2+4)
        .attr('font-size',10).attr('fill','#888').attr('font-family',"'JetBrains Mono',monospace")
        .text(mask.toString(2).padStart(4,'0'));
      for(let v=0;v<CITIES;v++){
        const val=step.dp[mask]?step.dp[mask][v]:INF;
        const hl=mask===step.curMask&&v===step.curV;
        svg.append('rect').attr('x',tx+80+v*cellW).attr('y',ry)
          .attr('width',cellW).attr('height',cellH)
          .attr('fill',hl?'#6a4000':'#1a1a1a').attr('stroke',hl?'#c8973e':'#333').attr('rx',2);
        svg.append('text').attr('x',tx+80+v*cellW+cellW/2).attr('y',ry+cellH/2+4)
          .attr('text-anchor','middle').attr('font-size',11)
          .attr('font-family',"'JetBrains Mono',monospace")
          .attr('fill',hl?'#c8973e':'#888').text(val>=INF?'∞':val);
      }
    });
    document.getElementById('s-task').textContent='ДП по маскам';
    document.getElementById('s-cell').textContent=step.curMask>=0?step.curMask.toString(2).padStart(4,'0'):'—';
    document.getElementById('s-val').textContent=step.curV>=0?`город ${step.curV}`:'—';
  }

  // ── VizCode ────────────────────────────────────────────
  const CODES = {
    edit: [
      { id:0, html:'<span class="cm">// Редакционное расстояние (Левенштейн)</span>' },
      { id:1, html:'dp[0][j]=j; dp[i][0]=i' },
      { id:2, html:'<span class="kw">for</span> i=1..n, j=1..m:' },
      { id:3, html:'  <span class="kw">if</span> s[i-1]==t[j-1]: dp[i][j]=dp[i-1][j-1]' },
      { id:4, html:'  <span class="kw">else</span>: dp[i][j]=<span class="num">1</span>+min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])' },
      { id:5, html:'<span class="cm">// T=O(nm), M=O(m) с перекатыванием</span>' },
    ],
    mask: [
      { id:0, html:'<span class="cm">// ДП по подмножествам (TSP)</span>' },
      { id:1, html:'dp[1&lt;&lt;s][s] = <span class="num">0</span>' },
      { id:2, html:'<span class="kw">for</span> mask=1..(1&lt;&lt;n)-1:' },
      { id:3, html:'  <span class="kw">for</span> v <span class="kw">in</span> mask:' },
      { id:4, html:'    <span class="kw">for</span> u <span class="kw">not in</span> mask:' },
      { id:5, html:'      nMask=mask|(1&lt;&lt;u)' },
      { id:6, html:'      dp[nMask][u]=min(dp[nMask][u], dp[mask][v]+dist[v][u])' },
      { id:7, html:'<span class="cm">// T=O(2ⁿ·n²), M=O(2ⁿ·n)</span>' },
    ],
  };

  let steps=[], mode='edit';

  function setMode(m){
    mode=m;
    document.querySelectorAll('[id^=tab-]').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+m)?.classList.add('active');
    VizCode.init(CODES[m]);
    run();
  }

  function applyStep(step){
    VizCode.highlight(step.line||[]);
    VizState.setDesc(step.desc||'');
    if(step.mode==='edit') renderEdit(step);
    else renderMask(step);
  }

  function run(){
    steps = mode==='edit' ? buildEditSteps() : buildMaskSteps();
    VizAnim.init(steps, applyStep);
    VizAnim.reset();
  }

  VizCode.init(CODES.edit);
  VizAnim.bindUI(run);
  run();

  // expose setMode globally for onclick
  window.setMode = setMode;
});
