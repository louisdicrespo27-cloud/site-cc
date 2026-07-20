/* =====================================================================
   V12 — REDE NEURAL PARA FUNDO CLARO
   Correção da v11 (blending aditivo sobre creme):
   · NormalBlending + nodes redondos (textura radial)
   · Paleta tinta escura (G_CLARO); núcleo mais escuro
   · Perspetiva aérea: desvanecimento para FUNDO (#F7F5F3)
   Estrutura, movimento, velocidade e HUD: iguais à v11.
   Robustez (site): pausa rAF com visibilitychange + IntersectionObserver;
   fallback se WebGL indisponível (esconde contentor, sem erro).
   Requisitos: THREE r128 global (assets/js/vendor/three.min.js) e
   .palco-wrap > #palco + #hud na página.
   ===================================================================== */
(function(){
  const wrap = document.querySelector('.palco-wrap');
  const alvo = document.getElementById('palco');
  const hud = document.getElementById('hud');
  if (!wrap || !alvo || !hud || typeof THREE === 'undefined') return;

  function temWebGL(){
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!temWebGL()) {
    wrap.style.display = 'none';
    return;
  }

  const reduzMov = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
  cam.position.set(0, 0, 3.0);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  } catch (e) {
    wrap.style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  alvo.appendChild(renderer.domElement);

  let larg=1, alt=1;
  function dimensiona(){
    const r = wrap.getBoundingClientRect();
    larg = r.width; alt = r.height;
    renderer.setSize(larg, alt, false);
    cam.aspect = larg/alt || 1;
    cam.updateProjectionMatrix();
  }
  dimensiona();
  window.addEventListener('resize', dimensiona);

  /* ---------- textura circular (corrige os "quadrados") ---------- */
  function texturaPonto(){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32,32,0, 32,32,32);
    grad.addColorStop(0.00,'rgba(255,255,255,1)');
    grad.addColorStop(0.40,'rgba(255,255,255,0.98)');
    grad.addColorStop(0.72,'rgba(255,255,255,0.45)');
    grad.addColorStop(1.00,'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0,0,64,64);
    const t = new THREE.Texture(c); t.needsUpdate = true; return t;
  }
  const texPonto = texturaPonto();

  /* ---------- utilitários ---------- */
  let semente = 11;
  function rnd(){ semente = (semente*16807) % 2147483647; return semente/2147483647; }

  function fibonacci(n, raio, jitter){
    const pts = [];
    const dourado = Math.PI * (3 - Math.sqrt(5));
    for(let i=0;i<n;i++){
      const y = 1 - (i/(n-1))*2;
      const r = Math.sqrt(1 - y*y);
      const th = dourado * i;
      const esc = raio * (1 + (rnd()-0.5)*2*jitter);
      pts.push(new THREE.Vector3(Math.cos(th)*r*esc, y*esc, Math.sin(th)*r*esc));
    }
    return pts;
  }

  /* ---------- três cascas ---------- */
  const cascaExt = fibonacci(560, 1.00, 0.015);
  const cascaMed = fibonacci(280, 0.72, 0.070);
  const nucleo   = fibonacci(210, 0.44, 0.130);

  const base = cascaExt.concat(cascaMed, nucleo);
  const N  = base.length;
  const n1 = cascaExt.length, n2 = cascaMed.length;
  const fimMed = n1 + n2;
  function camada(i){ return i < n1 ? 0 : (i < fimMed ? 1 : 2); }

  /* ---------- arestas ---------- */
  const arestas = [];
  for(let i=0;i<N;i++){
    const ci = camada(i);
    for(let j=i+1;j<N;j++){
      const cj = camada(j);
      const d = base[i].distanceTo(base[j]);
      if(ci===0 && cj===0){ if(d < 0.245) arestas.push(i,j); }
      else if(ci===1 && cj===1){ if(d < 0.300) arestas.push(i,j); }
      else if(ci===2 && cj===2){ if(d < 0.300) arestas.push(i,j); }
      else if(Math.abs(ci-cj)===1){ if(d < 0.340 && rnd() < 0.16) arestas.push(i,j); }
      else { if(d < 0.640 && rnd() < 0.030) arestas.push(i,j); }
    }
  }
  const nA = arestas.length/2;

  /* ---------- buffers ---------- */
  const posPontos = new Float32Array(N*3);
  const corPontos = new Float32Array(N*3);
  const posLinhas = new Float32Array(nA*2*3);
  const corLinhas = new Float32Array(nA*2*3);

  function fazPontos(inicio, fim, tamanho, opac){
    const n = fim-inicio;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n*3),3));
    geo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(n*3),3));
    const mat = new THREE.PointsMaterial({
      size:tamanho, vertexColors:true, transparent:true, opacity:opac,
      map:texPonto, blending:THREE.NormalBlending,
      depthWrite:false, sizeAttenuation:true
    });
    return {obj:new THREE.Points(geo,mat), geo, inicio, fim};
  }
  const pExt = fazPontos(0, n1, 0.019, 0.85);
  const pMed = fazPontos(n1, fimMed, 0.030, 0.92);
  const pNuc = fazPontos(fimMed, N, 0.044, 1.00);

  const geoL = new THREE.BufferGeometry();
  geoL.setAttribute('position', new THREE.BufferAttribute(posLinhas,3));
  geoL.setAttribute('color', new THREE.BufferAttribute(corLinhas,3));
  const matL = new THREE.LineBasicMaterial({
    vertexColors:true, transparent:true, opacity:0.34,
    blending:THREE.NormalBlending, depthWrite:false
  });
  const linhas = new THREE.LineSegments(geoL, matL);

  const grupo = new THREE.Group();
  grupo.add(linhas); grupo.add(pExt.obj); grupo.add(pMed.obj); grupo.add(pNuc.obj);
  grupo.rotation.x = 0.30;
  cena.add(grupo);

  /* ---------- paleta clara — tinta escura sobre creme ----------
     Núcleo = mais escuro (lê-se através da casca); casca = vermelhos. */
  function hex(c){ const x = new THREE.Color(c); return [x.r,x.g,x.b]; }
  const G = [hex('#2B0A12'), hex('#6E1423'), hex('#A62435'), hex('#C63A47'), hex('#1F6F78'), hex('#4C6B70')];
  const FUNDO = [0.969, 0.961, 0.953]; // #F7F5F3 — alvo do desvanecimento
  function amostra(v, saida){
    const n = G.length-1;
    const t = Math.min(Math.max(v,0),0.9999)*n;
    const i = Math.floor(t), f = t-i;
    saida[0] = G[i][0]+(G[i+1][0]-G[i][0])*f;
    saida[1] = G[i][1]+(G[i+1][1]-G[i][1])*f;
    saida[2] = G[i][2]+(G[i+1][2]-G[i][2])*f;
  }

  /* ---------- ruído em duas oitavas ---------- */
  function ruido(p, t){
    const g = 0.55*Math.sin(2.1*p.x + 1.3*t)*Math.sin(1.7*p.y - 0.9*t + 2.0)
            + 0.45*Math.sin(2.6*p.z + 0.7*t + 4.1)*Math.sin(1.9*(p.x+p.y) - 1.1*t);
    const f = 0.30*Math.sin(5.3*p.x - 1.8*t + 1.1)*Math.sin(4.7*p.z + 1.5*t);
    return g + f;
  }

  /* ---------- contra-rotações internas ---------- */
  const eixoMed = new THREE.Vector3(0.30, 1.00, 0.15).normalize();
  const eixoNuc = new THREE.Vector3(-0.20, 0.85, 0.50).normalize();
  const qMed = new THREE.Quaternion();
  const qNuc = new THREE.Quaternion();

  const desloc = new Array(N);
  for(let i=0;i<N;i++) desloc[i] = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const mundo = new THREE.Vector3();
  const eixoCor = new THREE.Vector3(0.6, 0.8, 0.4).normalize();
  const corTmp = [0,0,0];
  const ruidoNode = new Float32Array(N);
  const profNode = new Float32Array(N);

  /* ================= HUD ================= */

  /* TIPO A — caixas de medição (9) */
  const CAIXAS = [
    {i: 40,        rot:'SYN',    fmt:(n,t)=> (148.0 + 4.5*n).toFixed(1)},
    {i: 205,       rot:'ΔT',     fmt:(n,t)=> (14.53 + 0.9*Math.sin(t*0.3)).toFixed(2)},
    {i: 355,       rot:'AXN',    fmt:(n,t)=> (0.084 + 0.02*n).toFixed(3)},
    {i: 500,       rot:'THR',    fmt:(n,t)=> (2.41 + 0.3*Math.abs(n)).toFixed(2)},
    {i: n1+60,     rot:'NODE',   fmt:(n,t)=> '0x'+((0x2F41 + (Math.floor(t*0.8)%7)*0x11).toString(16).toUpperCase())},
    {i: n1+180,    rot:'LAT',    fmt:(n,t)=> (9.6 + 1.8*Math.abs(n)).toFixed(1)+'ms'},
    {i: n1+250,    rot:'VEC',    fmt:(n,t)=> (0.372 + 0.04*n).toFixed(3)},
    {i: fimMed+120,rot:'ΣΦ',     fmt:(n,t)=> (1.618 + 0.05*n).toFixed(3)},
    {i: fimMed+70, rot:'FEED 07',fmt:(n,t)=> (97.0 + 2.4*Math.abs(n)).toFixed(1)+'%'}
  ];

  /* TIPO B — medidores de barra (5) */
  const MEDIDORES = [
    {i: 120,        rot:'DATA FEED 01', base:0.78},
    {i: 470,        rot:'DATA FEED 04', base:0.55},
    {i: n1+230,     rot:'BUFFER',       base:0.64},
    {i: fimMed+30,  rot:'CORE LOAD',    base:0.47},
    {i: 300,        rot:'UPLINK',       base:0.70}
  ];

  /* TIPO C — marcas de coordenadas soltas (10) */
  const MARCAS = [
    {i: 15,   txt:'84-451'},
    {i: 260,  txt:'0xA3.09'},
    {i: 415,  txt:'12-4471'},
    {i: 530,  txt:'NA-33'},
    {i: 90,   txt:'V-208'},
    {i: n1+20, txt:'07.114'},
    {i: n1+140,txt:'C-664'},
    {i: n1+100,txt:'0x1B.77'},
    {i: fimMed+180, txt:'IX-08'},
    {i: fimMed+150, txt:'K-092'}
  ];

  const elems = [];

  CAIXAS.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'hud-el etq';
    el.innerHTML = '<span class="rot">'+d.rot+'</span><span class="val"></span>';
    hud.appendChild(el);
    elems.push({tipo:'A', def:d, el, val:el.querySelector('.val'), ultimo:-1, opMax:0.95});
  });

  MEDIDORES.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'hud-el medidor';
    el.innerHTML = '<span class="rot">'+d.rot+'</span>'+
                   '<span class="trilho"><span class="carga"></span></span>';
    hud.appendChild(el);
    elems.push({tipo:'B', def:d, el, carga:el.querySelector('.carga'), ultimo:-1, opMax:0.88});
  });

  MARCAS.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'hud-el marca-c';
    el.innerHTML = '<span class="cruz">+</span>'+d.txt;
    hud.appendChild(el);
    elems.push({tipo:'C', def:d, el, ultimo:-1, opMax:0.62});
  });

  const proj = new THREE.Vector3();

  function atualizaHUD(t){
    for(const e of elems){
      const i = e.def.i;
      proj.copy(desloc[i]).applyMatrix4(grupo.matrixWorld);
      const zMundo = proj.z;
      proj.project(cam);
      e.el.style.left = (( proj.x*0.5 + 0.5) * larg).toFixed(1)+'px';
      e.el.style.top  = ((-proj.y*0.5 + 0.5) * alt ).toFixed(1)+'px';
      const vis = Math.max(0, Math.min(1, (zMundo + 0.25) / 0.65));
      e.el.style.opacity = (e.opMax * (0.14 + 0.86*vis)).toFixed(2);

      if(t - e.ultimo > 0.4){
        const n = ruidoNode[i];
        if(e.tipo==='A'){
          e.val.textContent = ' ' + e.def.fmt(n, t);
        }else if(e.tipo==='B'){
          const pct = Math.max(0.08, Math.min(0.97, e.def.base + 0.22*n));
          e.carga.style.width = (pct*100).toFixed(0)+'%';
        }
        e.ultimo = t;
      }
    }
  }

  function passo(t){
    qMed.setFromAxisAngle(eixoMed, -t*0.055);
    qNuc.setFromAxisAngle(eixoNuc,  t*0.085);
    const rExt = 1 + 0.028*Math.sin(t*0.45);
    const rMed = 1 + 0.034*Math.sin(t*0.45 + 1.6);
    const rNuc = 1 + 0.042*Math.sin(t*0.45 + 3.1);

    grupo.rotation.y = t*0.10;
    grupo.rotation.x = 0.30 + 0.05*Math.sin(t*0.17);
    grupo.updateMatrixWorld();

    for(let i=0;i<N;i++){
      const c = camada(i);
      tmp.copy(base[i]);
      if(c===1) tmp.applyQuaternion(qMed);
      else if(c===2) tmp.applyQuaternion(qNuc);

      const n = ruido(tmp, t);
      ruidoNode[i] = n;
      const resp = c===0 ? rExt : (c===1 ? rMed : rNuc);
      desloc[i].copy(tmp).multiplyScalar(resp * (1 + 0.055*n));
      posPontos[i*3]=desloc[i].x; posPontos[i*3+1]=desloc[i].y; posPontos[i*3+2]=desloc[i].z;

      mundo.copy(desloc[i]).applyMatrix4(grupo.matrixWorld);
      profNode[i] = mundo.z;

      const w = 0.5 + 0.5*Math.sin(tmp.dot(eixoCor)*2.4 + t*0.30 + n*1.6);
      let v;
      if(c===0)      v = 0.22 + 0.62*w;
      else if(c===1) v = 0.10 + 0.58*w;
      else           v = 0.00 + 0.46*w;
      amostra(v, corTmp);

      const d01 = Math.max(0, Math.min(1, (profNode[i] + 1.15) / 2.30));
      let fade = Math.pow(1 - d01, 1.25) * 0.80;
      if(c===2) fade *= 0.62;
      corPontos[i*3]   = corTmp[0] + (FUNDO[0]-corTmp[0])*fade;
      corPontos[i*3+1] = corTmp[1] + (FUNDO[1]-corTmp[1])*fade;
      corPontos[i*3+2] = corTmp[2] + (FUNDO[2]-corTmp[2])*fade;
    }

    for(let e=0;e<nA;e++){
      const a = arestas[e*2], b = arestas[e*2+1];
      posLinhas[e*6]  =desloc[a].x; posLinhas[e*6+1]=desloc[a].y; posLinhas[e*6+2]=desloc[a].z;
      posLinhas[e*6+3]=desloc[b].x; posLinhas[e*6+4]=desloc[b].y; posLinhas[e*6+5]=desloc[b].z;
      corLinhas[e*6]  =corPontos[a*3];   corLinhas[e*6+1]=corPontos[a*3+1]; corLinhas[e*6+2]=corPontos[a*3+2];
      corLinhas[e*6+3]=corPontos[b*3];   corLinhas[e*6+4]=corPontos[b*3+1]; corLinhas[e*6+5]=corPontos[b*3+2];
    }

    [pExt,pMed,pNuc].forEach(P=>{
      P.geo.attributes.position.array.set(posPontos.subarray(P.inicio*3, P.fim*3));
      P.geo.attributes.color.array.set(corPontos.subarray(P.inicio*3, P.fim*3));
      P.geo.attributes.position.needsUpdate = true;
      P.geo.attributes.color.needsUpdate = true;
    });
    geoL.attributes.position.needsUpdate = true;
    geoL.attributes.color.needsUpdate = true;

    renderer.render(cena, cam);
    atualizaHUD(t);
  }

  if(reduzMov){
    passo(1.4);
    alvo.classList.add('pronto');
  }else{
    let noEcra = true;
    let separadorVisivel = !document.hidden;
    let t = 0;
    let ultimo = performance.now();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        noEcra = es[0].isIntersecting;
        ultimo = performance.now();
      }, { threshold: 0.02 }).observe(wrap);
    }
    document.addEventListener('visibilitychange', function () {
      separadorVisivel = !document.hidden;
      ultimo = performance.now();
    });

    alvo.classList.add('pronto');
    (function loop(agora){
      requestAnimationFrame(loop);
      if (!separadorVisivel || !noEcra) {
        ultimo = agora;
        return;
      }
      const dt = Math.min((agora - ultimo) / 1000, 0.05);
      ultimo = agora;
      t += dt;
      passo(t);
    })(performance.now());
  }
})();
