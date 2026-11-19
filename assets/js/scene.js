/* BRGRN — giriş sahnesi: katlanan metal amblem (WebGL, kütüphanesiz).
   Amblemin dört yüzü kalınlığı olan metal levhalardır. Açılışta iki ana levha yerine döner,
   iki küçük levha kıvrım çizgilerinden katlanarak oturur ve hafif açılı kalır: ışık her yüzde farklı kırılır.
   Işık fareyi izler, amblem hafifçe döner. Sayfa kaydırıldıkça amblem yan döner ve sahneden çıkar.
   Hareket azaltma ayarı açıksa ya da WebGL yoksa hiç başlamaz; yerinde SVG amblem kalır. */
(() => {
  'use strict';

  const root = document.documentElement;
  const canvas = document.querySelector('[data-scene]');
  const anchor = document.querySelector('[data-scene-anchor]');
  if (!canvas || !anchor) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return;

  // ---------- geometri: sayfadaki SVG amblemle aynı köşeler ----------
  const W = 189.25, H = 227.6;
  const FACES = [
    [[0, 25.5], [112.5, 126.2], [74, 126.2], [26.7, 83.9], [26.7, 206.5], [0, 227.6]],                                   // dikey kol + çapraz
    [[74, 126.2], [112.5, 126.2], [41.7, 197], [41.7, 158.5]],                                                           // geri katlanan şerit
    [[6.9, 0], [104, 0], [167.75, 63.75], [139.25, 92.25], [101.25, 92.25], [129.75, 63.75], [95.5, 29.5], [42.1, 29.5]], // üst kol + üst ok
    [[101.25, 92.25], [139.25, 92.25], [189.25, 142.25], [103.9, 227.6], [65.9, 227.6], [151.25, 142.25]],               // alt ok
  ];
  const D = 0.07;                                                         // levha yarı kalınlığı
  const nx = (x) => (x - W / 2) / (H / 2), ny = (y) => (H / 2 - y) / (H / 2);
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  // İçbükey çokgeni üçgenlere böler (kulak kesme).
  function triangulate(pts) {
    let signed = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) signed += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    const ccw = signed > 0, idx = pts.map((_, i) => i), tris = [];
    const sgn = (d) => (d > 1e-9 ? 1 : d < -1e-9 ? -1 : 0);
    const within = (p, a, b, c) => { const s1 = sgn(cross(a, b, p)), s2 = sgn(cross(b, c, p)), s3 = sgn(cross(c, a, p)); return s1 !== 0 && s1 === s2 && s2 === s3; };
    for (let guard = 0; idx.length > 3 && guard < 400; guard++) {
      for (let k = 0; k < idx.length; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
        const turn = cross(pts[i0], pts[i1], pts[i2]);
        if (ccw ? turn <= 1e-9 : turn >= -1e-9) continue;                 // içbükey köşe, kulak değil
        if (idx.some((m) => m !== i0 && m !== i1 && m !== i2 && within(pts[m], pts[i0], pts[i1], pts[i2]))) continue;
        tris.push(i0, i1, i2); idx.splice(k, 1); break;
      }
    }
    if (idx.length === 3) tris.push(idx[0], idx[1], idx[2]);
    return { tris, ccw };
  }

  const data = [];                                                        // x y z nx ny nz
  const ranges = [];
  for (const face of FACES) {
    const pts = face.map(([x, y]) => [nx(x), ny(y)]);
    const { tris, ccw } = triangulate(pts);
    const start = data.length / 6;
    for (const z of [D, -D]) for (const i of tris) data.push(pts[i][0], pts[i][1], z, 0, 0, z > 0 ? 1 : -1);   // ön ve arka yüz
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {        // yan duvarlar
      const a = pts[j], b = pts[i];
      let ex = b[1] - a[1], ey = -(b[0] - a[0]);
      const len = Math.hypot(ex, ey) || 1; ex /= len; ey /= len;
      if (!ccw) { ex = -ex; ey = -ey; }
      for (const [p, z] of [[a, D], [b, D], [b, -D], [a, D], [b, -D], [a, -D]]) data.push(p[0], p[1], z, ex, ey, 0);
    }
    ranges.push([start, data.length / 6 - start]);
  }

  // ---------- gölgelendiriciler ----------
  const VERT = `
    attribute vec3 aPos; attribute vec3 aNor;
    uniform mat4 uModel; uniform mat3 uNormal; uniform float uScale, uAspect; uniform vec2 uCenter;
    varying vec3 vN; varying vec3 vP;
    const float CAM = 4.0; const float FOC = 2.6;
    void main() {
      vec3 P = (uModel * vec4(aPos, 1.0)).xyz * uScale;
      vN = uNormal * aNor; vP = P;
      float depth = CAM - P.z;
      vec2 ndc = P.xy * (FOC / depth); ndc.x /= uAspect; ndc += uCenter;
      gl_Position = vec4(ndc, -P.z * 0.2, 1.0);
    }`;
  const FRAG = `
    precision highp float;
    varying vec3 vN; varying vec3 vP;
    uniform vec3 uLight, uBase, uRim; uniform float uFade, uGloss;
    void main() {
      vec3 N = normalize(vN);
      vec3 V = normalize(vec3(0.0, 0.0, 4.0) - vP);
      if (dot(N, V) < 0.0) N = -N;
      vec3 L = normalize(uLight - vP);
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, normalize(L + V)), 0.0), 70.0);
      // stüdyodaki şerit ışıkların yansıması: metalin parlak bantları
      vec3 R = reflect(-V, N);
      float band = smoothstep(0.5, 0.96, sin(R.y * 3.4 + R.x * 1.5 + uLight.x * 0.9) * 0.5 + 0.5);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      vec3 col = uBase * (0.14 + 0.78 * diff) + uBase * band * uGloss + vec3(1.0) * spec * 0.85 + uRim * rim;
      gl_FragColor = vec4(col * uFade, uFade);
    }`;
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos'), aNor = gl.getAttribLocation(prog, 'aNor');
  gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(aNor); gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, 24, 12);
  const U = {};
  ['uModel', 'uNormal', 'uScale', 'uAspect', 'uCenter', 'uLight', 'uBase', 'uRim', 'uFade', 'uGloss'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // ---------- 4×4 matrisler (sütun öncelikli) ----------
  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
  const move = (x, y) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, 0, 1]);
  const rotX = (t) => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const rotY = (t) => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const hingeX = (y, t) => mul(move(0, y), mul(rotX(t), move(0, -y)));     // yatay kıvrım çizgisi etrafında
  const hingeY = (x, t) => mul(move(x, 0), mul(rotY(t), move(-x, 0)));     // dikey kenar etrafında
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const outBack = (t) => { const c = 1.35; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const span = (t, a, b) => Math.min(Math.max((t - a) / (b - a), 0), 1);

  // ---------- boyut ----------
  const CAM = 4.0, FOC = 2.6;
  let vw = 1, vh = 1;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(U.uAspect, vw / vh);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- hareket ----------
  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => { tx = (e.clientX / vw) * 2 - 1; ty = (e.clientY / vh) * 2 - 1; }, { passive: true });

  let t0 = 0, last = 0, raf = 0, out = 0, shown = false;
  function frame(now) {
    raf = 0;
    if (document.hidden) return;
    if (!t0) t0 = now;
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016; last = now;
    const time = (now - t0) / 1000;
    px += (tx - px) * (1 - Math.exp(-dt * 3.5)); py += (ty - py) * (1 - Math.exp(-dt * 3.5));
    const goal = Math.min(Math.max(window.scrollY / (vh * 0.7), 0), 1);   // 0: sayfa başı, 1: giriş geçildi
    out += (goal - out) * (1 - Math.exp(-dt * 6));

    const light = root.getAttribute('data-theme') === 'light';
    gl.uniform3f(U.uBase, ...(light ? [0.2, 0.21, 0.26] : [0.8, 0.82, 0.87]));    // açık temada koyu metal
    gl.uniform3f(U.uRim, ...(light ? [0.2, 0.28, 0.95] : [0.26, 0.34, 0.95]));    // kenarlarda logonun mavisi
    gl.uniform1f(U.uGloss, light ? 1.5 : 0.5);
    gl.uniform3f(U.uLight, px * 3.2 + 1.1, -py * 2.4 + 1.5, 3.2);                 // ışık fareyi izler
    gl.uniform1f(U.uFade, 1 - span(out, 0.5, 1));

    // amblem, sayfadaki SVG'nin tam üstünde ve onunla aynı boyda durur
    const r = anchor.getBoundingClientRect();
    gl.uniform2f(U.uCenter, ((r.left + r.width / 2) / vw) * 2 - 1, 1 - ((r.top + r.height / 2) / vh) * 2);
    gl.uniform1f(U.uScale, (r.height / vh) * (CAM / FOC) * (1 - 0.1 * out));

    // tam tur atmaz (amblem ters görünmesin); kaydırınca yan döner
    const turn = mul(rotY(0.3 * Math.sin(time * 0.42) + px * 0.36 + out * 1.3), rotX(py * 0.18 - 0.04));
    const a1 = outCubic(span(time, 0.05, 1.0)), b1 = outCubic(span(time, 0.18, 1.1));
    const a2 = outBack(span(time, 0.75, 1.95)), b2 = outBack(span(time, 0.9, 2.1));
    const poses = [
      hingeY(nx(0), -1.5 * (1 - a1)),                                                        // soldaki dikey kenardan döner
      hingeX(ny(126.2), -2.9 + (2.9 + 0.3) * a2 + 0.035 * Math.sin(time * 0.9)),             // geri katlanan şerit, biraz geride kalır
      hingeX(ny(0), 1.5 * (1 - b1)),                                                         // üst kenardan döner
      hingeX(ny(92.25), 2.9 - (2.9 + 0.22) * b2 + 0.03 * Math.sin(time * 0.8 + 1.3)),        // alt ok, biraz öne eğik kalır
    ];
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    poses.forEach((pose, n) => {
      const m = mul(turn, pose);
      gl.uniformMatrix4fv(U.uModel, false, m);
      gl.uniformMatrix3fv(U.uNormal, false, new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]));
      gl.drawArrays(gl.TRIANGLES, ranges[n][0], ranges[n][1]);
    });
    if (!shown) { shown = true; root.classList.add('gl-on'); }
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); root.classList.remove('gl-on'); cancelAnimationFrame(raf); raf = 0; });
  start();
})();
