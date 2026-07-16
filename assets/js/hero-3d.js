/* =====================================================================
   HERO 3D — Correia Crespo, Advogados  ·  build v7 (god mode)
   A massa de tinta que se ALTERA: fases de material (cetim / lacre /
   metal vivo), veias de energia, onda de transmutacao, iridescencia
   e microtextura — tudo por pixel, tudo nao-ciclico, tudo na GPU.
   Degradacao inteligente:
   · DESKTOP (>=900px): 41k vertices (icosaedro detalhe 6)
   · MOBILE  (<900px): 10k vertices (detalhe 5) — indistinguivel num
     canvas pequeno; 4x mais leve em GPU e bateria.
   Salvaguardas: WebGL com fallback gracioso, prefers-reduced-motion
   (pose estatica), pausa fora do ecra (IntersectionObserver) e em
   separador oculto, pixel ratio limitado, arranque apos 'load'.
   Requisitos: THREE r128 global (assets/js/vendor/three.min.js) e um
   contentor <div id="hero3d"> na pagina.
   ===================================================================== */
(function () {
  'use strict';

  var palco = document.getElementById('hero3d');
  if (!palco || typeof THREE === 'undefined') return;

  function temWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }
  if (!temWebGL()) return;

  var DESKTOP  = window.matchMedia('(min-width: 900px)').matches;
  var REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var NOISE = `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0*floor(p*ns.z*ns.z);
  vec4 x_ = floor(j*ns.z);
  vec4 y_ = floor(j - 7.0*x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m*m;
  return 42.0*dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
/* eixo e centro da onda de transmutação — deriva quase-aleatória */
vec3 eixoOnda(float S){
  return normalize(vec3(sin(S*0.31), 0.55 + 0.30*sin(S*0.17), cos(S*0.23)));
}
float centroOnda(float S){
  return 1.15*sin(S*0.41) + 0.35*sin(S*1.13);
}
float bandaOnda(vec3 d, float S){
  float c = dot(d, eixoOnda(S));
  float x = (c - centroOnda(S)) * 3.2;
  return exp(-x*x);
}
`;
  var VERT  = NOISE + `
uniform float uT;
uniform float uS;
varying vec3  vDir;
varying vec3  vNrm;
varying vec3  vPosV;
varying float vElev;
varying float vBanda;

float campo(vec3 d){
  float wx = snoise(d*1.35 + vec3(uS*1.8, 4.1, 7.7));
  float wy = snoise(d*1.35 + vec3(3.3, uS*1.8, -2.2));
  float A = 0.55*snoise(d*0.85 + vec3(uS, 5.2 + uS*0.7, 8.1 - uS*0.5))
          + 0.25*snoise(d*1.9  + vec3(31.4 - uS*0.8, 2.7, 17.9 + uS));
  float B = 0.62*snoise(vec3(d.x + wx*0.6, d.y + wy*0.6, d.z)*1.6
                        + vec3(uT, uT*0.75, -uT*0.6))
          + 0.38*snoise(vec3(d.x, d.y + wx*0.45, d.z + wy*0.3)*3.6
                        + vec3(-uT, uT*0.6, uT*0.5));
  /* a onda incha ligeiramente a matéria à sua passagem */
  float banda = bandaOnda(d, uS);
  return A*0.30 + B*0.09 + banda*0.035;
}

vec3 superficie(vec3 d){
  return d * (1.0 + campo(d)) * vec3(1.04, 0.90, 0.97);
}

void main(){
  vec3 d = normalize(position);
  float s = campo(d);
  vec3 P = d * (1.0 + s) * vec3(1.04, 0.90, 0.97);

  vec3 up = abs(d.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 t1 = normalize(cross(d, up));
  vec3 t2 = normalize(cross(d, t1));
  float eps = 0.012;
  vec3 P1 = superficie(normalize(d + t1*eps));
  vec3 P2 = superficie(normalize(d + t2*eps));
  vec3 N = normalize(cross(P1 - P, P2 - P));
  if(dot(N, d) < 0.0) N = -N;

  vDir  = d;
  vElev = s;
  vBanda = bandaOnda(d, uS);
  vec4 mv = modelViewMatrix * vec4(P, 1.0);
  vPosV = mv.xyz;
  vNrm  = normalize(normalMatrix * N);
  gl_Position = projectionMatrix * mv;
}
`;
  var FRAG  = NOISE + `
precision highp float;
uniform float uT;
uniform float uS;
varying vec3  vDir;
varying vec3  vNrm;
varying vec3  vPosV;
varying float vElev;
varying float vBanda;

void main(){
  vec3 d = normalize(vDir);
  vec3 N = normalize(vNrm);
  vec3 V = normalize(-vPosV);

  /* ===== 0) microtextura: a pele da matéria, por pixel ===== */
  vec3 up = abs(N.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 tg1 = normalize(cross(N, up));
  vec3 tg2 = cross(N, tg1);
  vec3 offMicro = vec3(uT*0.35, -uT*0.28, uS*0.9);
  float m0 = snoise(d*7.5 + offMicro);
  float m1 = snoise((d + tg1*0.02)*7.5 + offMicro);
  float m2 = snoise((d + tg2*0.02)*7.5 + offMicro);
  N = normalize(N + (tg1*(m1 - m0) + tg2*(m2 - m0)) * 3.5 * 0.045);

  /* ===== 1) campos da matéria (por pixel) ===== */
  float wx = snoise(d*1.35 + vec3(uS*1.8, 4.1, 7.7));

  /* correntes de cor */
  float C = snoise(vec3(d.x + wx*0.85, d.y + wx*0.6, d.z)*2.3
                   + vec3(-uT*0.65, uT*0.5, uS*1.4));

  /* FASE do material: 0=cetim profundo … 1=lacre-espelho/metal vivo */
  float fase = 0.5 + 0.5*snoise(d*1.1 + vec3(uS*1.3, -uS*0.9, uS*0.6));

  /* VEIAS de energia: cristas de ruído afiadas, ativas por regiões */
  float vRaw = snoise(vec3(d.x + wx*0.5, d.y, d.z - wx*0.3)*3.4
                      + vec3(uT*0.22, -uT*0.18, uS*1.1));
  float veia = pow(1.0 - abs(vRaw), 7.0);
  float regiao = smoothstep(0.15, 0.62, snoise(d*0.9 + vec3(uS*0.8, 21.0, 13.5)));
  float veias = veia * regiao;

  /* ===== 2) cor base: abismo → bordeaux → crista + correntes ===== */
  vec3 ABISMO   = vec3(0.125, 0.027, 0.063);
  vec3 BASE     = vec3(0.361, 0.094, 0.161);
  vec3 CRISTA   = vec3(0.627, 0.310, 0.369);
  vec3 CORRENTE = vec3(0.769, 0.467, 0.435);

  float u = clamp((vElev + 0.4)/0.8, 0.0, 1.0);
  vec3 cor;
  if(u < 0.58){ cor = mix(ABISMO, BASE, u/0.58); }
  else { cor = mix(BASE, CRISTA, (u - 0.58)/0.42 * 0.85); }
  cor = mix(cor, CORRENTE, smoothstep(0.34, 0.84, C) * 0.5);

  /* ===== 3) iluminação com FASES de material ===== */
  vec3 Lk = normalize(vec3(-0.52, 0.62, 0.60));
  vec3 Lf = normalize(vec3( 0.62,-0.28,-0.45));
  vec3 corChave  = vec3(1.00, 0.906, 0.812);
  vec3 corContra = vec3(0.788, 0.831, 0.886);

  float dk = clamp((dot(N, Lk) + 0.38)/1.38, 0.0, 1.0);
  float df = clamp((dot(N, Lf) + 0.38)/1.38, 0.0, 1.0);
  vec3 luz = cor * (0.34 + corChave*dk*0.85 + corContra*df*0.28);

  /* especular por fase: cetim (largo, fraco) → lacre (apertado, forte);
     nas zonas de fase alta o reflexo tinge-se da própria cor: METAL VIVO */
  vec3 Hk = normalize(Lk + V);
  float NH = max(dot(N, Hk), 0.0);
  float brilho    = mix(18.0, 150.0, fase);
  float forca     = mix(0.18, 1.05, fase);
  float metal     = smoothstep(0.62, 0.88, fase);
  vec3  corSpec   = mix(corChave, cor*2.1 + vec3(0.10), metal);
  luz += pow(NH, brilho) * forca * corSpec;
  luz += pow(NH, 14.0) * 0.10 * corChave;   /* polimento residual */

  /* ===== 4) iridescência no contorno: vinho → violeta → ouro ===== */
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float tI = 0.5 + 0.5*snoise(d*2.0 + vec3(uS*2.0, 3.7, -1.9));
  vec3 iri1 = vec3(0.55, 0.30, 0.32);   /* rosé-vinho    */
  vec3 iri2 = vec3(0.44, 0.27, 0.56);   /* violeta       */
  vec3 iri3 = vec3(0.84, 0.64, 0.40);   /* ouro quente   */
  vec3 corIri = tI < 0.5 ? mix(iri1, iri2, tI*2.0) : mix(iri2, iri3, tI*2.0 - 1.0);
  float boostIri = 1.0 + vBanda*1.6;            /* a onda intensifica */
  luz += fres * corIri * 0.26 * boostIri;

  /* ===== 5) veias de energia + onda de transmutação ===== */
  vec3 corVeia = vec3(1.00, 0.52, 0.40);
  float acende = 0.32 + vBanda*0.9;             /* a onda acende as veias */
  luz += veias * corVeia * acende;
  /* a própria frente da onda cintila de leve */
  luz += vBanda * cor * 0.18;

  /* ===== 6) curva suave (evita estouro, dá corpo de filme) ===== */
  luz = luz / (1.0 + luz*0.22);

  gl_FragColor = vec4(luz, 1.0);
}
`;

  function aoOcioso(fn) {
    if (window.requestIdleCallback) { window.requestIdleCallback(fn, { timeout: 500 }); }
    else { window.setTimeout(fn, 1); }
  }
  function agendar(fn) {
    if (document.readyState === 'complete') {
      aoOcioso(fn);
    } else {
      window.addEventListener('load', function () { aoOcioso(fn); });
    }
  }

  agendar(function iniciar() {
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    function tamanho() { return Math.max(1, Math.min(palco.clientWidth, palco.clientHeight)); }
    renderer.setSize(tamanho(), tamanho());
    palco.appendChild(renderer.domElement);

    var cena = new THREE.Scene();
    var camara = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camara.position.set(0, 0, 4.25);
    var mundo = new THREE.Group();
    cena.add(mundo);

    var uniforms = { uT: { value: 8 }, uS: { value: 3 } };
    var geo = new THREE.IcosahedronGeometry(1, DESKTOP ? 6 : 5);
    var malha = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG
    }));
    mundo.add(malha);

    function n1(t, seed) {
      return Math.sin(t * 0.73 + seed) * 0.55 +
             Math.sin(t * 0.293 + seed * 2.7) * 0.30 +
             Math.sin(t * 1.31 + seed * 0.9) * 0.15;
    }

    var noEcra = true, visivel = !document.hidden;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        noEcra = es[0].isIntersecting; ultimo = performance.now();
      }, { threshold: 0.02 }).observe(palco);
    }
    document.addEventListener('visibilitychange', function () {
      visivel = !document.hidden; ultimo = performance.now();
    });

    var alvoX = 0, alvoY = 0, incX = 0, incY = 0;
    if (DESKTOP) {
      window.addEventListener('pointermove', function (e) {
        alvoX = (e.clientX / window.innerWidth  - 0.5) * 0.10;
        alvoY = (e.clientY / window.innerHeight - 0.5) * 0.07;
      }, { passive: true });
    }

    var T = 8, S = 3, ultimo = performance.now();

    function quadro(agora) {
      requestAnimationFrame(quadro);
      if (!visivel || !noEcra) return;
      var dt = Math.min((agora - ultimo) / 1000, 0.05);
      ultimo = agora;

      if (!REDUZIDO) {
        T += dt * 0.055;
        S += dt * 0.011;
        uniforms.uT.value = T;
        uniforms.uS.value = S;
        malha.rotation.x += dt * 0.045 * n1(T * 0.55, 2.7);
        malha.rotation.y += dt * (0.015 + 0.05 * n1(T * 0.48, 5.1));
        malha.rotation.z += dt * 0.032 * n1(T * 0.51, 8.3);
        malha.position.y  = 0.04 * n1(T * 0.36, 11.2);
      }
      incX += (alvoY - incX) * 0.02;
      incY += (alvoX - incY) * 0.02;
      mundo.rotation.x = incX;
      mundo.rotation.y = incY;
      renderer.render(cena, camara);
    }

    palco.classList.add('hero-3d--pronto');
    requestAnimationFrame(quadro);
    window.addEventListener('resize', function () {
      renderer.setSize(tamanho(), tamanho());
    });
  });
})();
