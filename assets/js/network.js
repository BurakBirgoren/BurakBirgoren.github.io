/* BRGRN — giriş bölümündeki canlı ağ.
   İstek soldan sağa gider (beyaz), yanıt geri döner (mavi).
   Bir bağlantı koparılınca yol yeniden hesaplanır; kopan bağlantı bir süre sonra kendini onarır. */
(() => {
  'use strict';

  const fig = document.querySelector('[data-net]');
  if (!fig) return;
  const svg = fig.querySelector('svg');
  const NS = 'http://www.w3.org/2000/svg';
  const T = JSON.parse(document.getElementById('i18n').textContent).net;   // durum cümleleri, sayfanın dilinde

  // Izgara: 9 sütun × 6 satır. Tüm bağlantılar yatay, dikey ya da 45° — amblemin geometrisi gibi.
  const STEP = 64, PAD_X = 36, PAD_TOP = 30;
  const HEAL_MS = 9000;      // kopan bağlantının kendini onarma süresi
  const SPEED = 0.40;        // darbe hızı, birim/ms
  const COMET = 56;          // darbe uzunluğu
  const TURN_MS = 240, REST_MS = 850;

  const GRID = {
    S: [0, 3], a: [1, 2], b: [1, 4], c: [3, 1], d: [3, 3], e: [2, 5],
    f: [5, 0], g: [5, 3], h: [5, 5], i: [7, 2], j: [6, 4], T: [8, 3],
  };
  // [uç, uç, isteğe bağlı dönüş noktaları]
  const LINKS = [
    ['S', 'a'], ['S', 'b'], ['S', 'd'],
    ['a', 'c', [2, 1]], ['a', 'd', [2, 2]], ['b', 'd', [2, 4]], ['b', 'e'],
    ['c', 'd'], ['d', 'e', [3, 4]],
    ['c', 'f', [4, 0]], ['c', 'g'], ['d', 'g'], ['d', 'h'], ['e', 'h'],
    ['f', 'g'], ['g', 'h'],
    ['f', 'i'], ['g', 'i', [6, 2]], ['g', 'j'], ['h', 'j'], ['g', 'T'],
    ['i', 'T'], ['j', 'T', [7, 4]],
  ];

  const px = ([c, r]) => [PAD_X + c * STEP, PAD_TOP + r * STEP];
  const toD = (pts) => pts.map(([x, y], n) => (n ? 'L' : 'M') + x + ' ' + y).join('');
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };

  // ---------- çizim ----------
  const gEdges = el('g', {}, svg);
  const routeEl = el('path', { class: 'net__route' }, svg);
  const pulseReq = el('path', { class: 'net__pulse net__pulse--req' }, svg);
  const pulseRes = el('path', { class: 'net__pulse net__pulse--res' }, svg);
  const gNodes = el('g', {}, svg);

  const edges = LINKS.map(([a, b, ...via], id) => {
    const pts = [GRID[a], ...via, GRID[b]].map(px);
    let len = 0;
    for (let n = 1; n < pts.length; n++) len += Math.hypot(pts[n][0] - pts[n - 1][0], pts[n][1] - pts[n - 1][1]);
    const g = el('g', { class: 'net__edge' }, gEdges);
    el('path', { class: 'net__line', d: toD(pts) }, g);
    el('path', { class: 'net__hit', d: toD(pts) }, g);
    const edge = { id, a, b, pts, len, cut: false, timer: 0, g };
    g.addEventListener('click', () => (edge.cut ? heal(edge, true) : cut(edge)));
    return edge;
  });

  const rings = {};
  for (const name in GRID) {
    const [x, y] = px(GRID[name]);
    if (name === 'S' || name === 'T') {
      const res = name === 'T';
      rings[name] = el('circle', { class: 'net__ring' + (res ? ' net__ring--res' : ''), cx: x, cy: y, r: 9 }, gNodes);
      el('circle', { class: 'net__end' + (res ? ' net__end--res' : ''), cx: x, cy: y, r: 8 }, gNodes);
      el('circle', { class: 'net__core' + (res ? ' net__core--res' : ''), cx: x, cy: y, r: 2.75 }, gNodes);
    } else {
      el('circle', { class: 'net__node', cx: x, cy: y, r: 3.5 }, gNodes);
    }
  }

  // ---------- yol bulma (en kısa yol, kopuk bağlantılar hariç) ----------
  function findRoute() {
    const dist = {}, prev = {}, done = {};
    for (const name in GRID) dist[name] = Infinity;
    dist.S = 0;
    for (;;) {
      let u = null;
      for (const name in dist) if (!done[name] && (u === null || dist[name] < dist[u])) u = name;
      if (u === null || dist[u] === Infinity) return null;
      if (u === 'T') break;
      done[u] = true;
      for (const e of edges) {
        if (e.cut || (e.a !== u && e.b !== u)) continue;
        const v = e.a === u ? e.b : e.a;
        if (dist[u] + e.len < dist[v]) { dist[v] = dist[u] + e.len; prev[v] = e; }
      }
    }
    const hops = [];
    for (let at = 'T'; at !== 'S';) { const e = prev[at]; hops.unshift(e); at = e.a === at ? e.b : e.a; }
    const pts = [px(GRID.S)];
    let at = 'S';
    for (const e of hops) {
      const forward = e.a === at;
      const seq = forward ? e.pts : [...e.pts].reverse();
      pts.push(...seq.slice(1));
      at = forward ? e.b : e.a;
    }
    return { hops, d: toD(pts), key: hops.map((e) => e.id).join('-') };
  }

  // ---------- durum ----------
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const out = {
    sent: fig.querySelector('[data-net-sent]'),
    answered: fig.querySelector('[data-net-answered]'),
    cut: fig.querySelector('[data-net-cut]'),
    status: fig.querySelector('[data-net-status]'),
    breakBtn: fig.querySelector('[data-net-break]'),
    healBtn: fig.querySelector('[data-net-heal]'),
  };
  let route = null, total = 0, phase = 'rest', t0 = 0, dur = 1;
  let sent = 0, answered = 0, pending = false;
  let onScreen = true, raf = 0;
  const active = () => onScreen && !document.hidden;

  const say = (text) => { out.status.textContent = text; };
  function refresh() {
    const n = edges.filter((e) => e.cut).length;
    out.sent.textContent = sent;
    out.answered.textContent = answered;
    out.cut.textContent = n + '/' + edges.length;
    out.healBtn.disabled = n === 0;
    out.breakBtn.disabled = n === edges.length;
  }

  function setRoute(next) {
    route = next;
    fig.classList.toggle('is-down', !route);
    if (!route) return;
    routeEl.setAttribute('d', route.d);
    pulseReq.setAttribute('d', route.d);
    pulseRes.setAttribute('d', route.d);
    total = routeEl.getTotalLength();
    dur = (total + COMET) / SPEED;
    const dash = COMET + ' ' + (total + COMET);
    pulseReq.style.strokeDasharray = dash;
    pulseRes.style.strokeDasharray = dash;
  }

  function hidePulses() {
    pulseReq.classList.remove('is-on');
    pulseRes.classList.remove('is-on');
    fig.classList.remove('is-answering');
  }
  const place = (pulse, p) => { pulse.style.strokeDashoffset = COMET - p * (total + COMET); };

  function flash(name) {
    const ring = rings[name];
    if (still || !ring.animate) return;
    ring.animate(
      [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.5)' }],
      { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)' },
    );
  }

  // Bir istek gönder (ya da yarıda kalanı yeniden gönder).
  function send(now) {
    hidePulses();
    setRoute(findRoute());
    if (!route) { phase = 'down'; return; }
    if (!pending) { pending = true; sent++; refresh(); }
    phase = 'req'; t0 = now;
    place(pulseReq, 0);
    pulseReq.classList.add('is-on');
    flash('S');
  }

  function frame(now) {
    raf = 0;
    if (!active()) return;
    const t = now - t0;
    if (phase === 'req') {
      place(pulseReq, Math.min(t / dur, 1));
      if (t >= dur) { pulseReq.classList.remove('is-on'); phase = 'turn'; t0 = now; flash('T'); }
    } else if (phase === 'turn') {
      if (t >= TURN_MS) { phase = 'res'; t0 = now; place(pulseRes, 1); pulseRes.classList.add('is-on'); fig.classList.add('is-answering'); }
    } else if (phase === 'res') {
      place(pulseRes, Math.max(1 - t / dur, 0));
      if (t >= dur) { hidePulses(); pending = false; answered++; refresh(); phase = 'rest'; t0 = now; flash('S'); }
    } else if (phase === 'rest') {
      if (t >= REST_MS) send(now);
    }
    if (phase !== 'down') raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!still && active() && !raf) raf = requestAnimationFrame(frame); };

  // Sekme ya da bölüm yeniden göründüğünde: yarıda kalan istek baştan gönderilir.
  function resume() {
    if (still || !active() || raf) return;
    if (phase === 'req' || phase === 'turn' || phase === 'res') send(performance.now());
    wake();
  }

  // ---------- koparma / onarma ----------
  function cut(edge) {
    if (edge.cut) return;
    edge.cut = true;
    edge.g.classList.add('is-cut');
    edge.timer = window.setTimeout(() => heal(edge, false), HEAL_MS);
    const onRoute = !!route && route.hops.includes(edge);
    const next = findRoute();
    if (!next) {
      hidePulses(); setRoute(null); phase = 'down';
      say(T.down);
    } else if (onRoute) {
      say(T.rerouted);
      if (still) setRoute(next);
      else if (phase === 'rest') setRoute(next);
      else send(performance.now());
    } else {
      say(T.unaffected);
    }
    refresh();
  }

  function heal(edge, byHand) {
    if (!edge.cut) return;
    window.clearTimeout(edge.timer);
    edge.cut = false;
    edge.g.classList.remove('is-cut');
    say(byHand ? T.healed_hand : T.healed_self);
    if (still || phase === 'rest') setRoute(findRoute());
    else if (phase === 'down') { send(performance.now()); wake(); }
    refresh();
  }

  out.breakBtn.addEventListener('click', () => {
    const live = (route ? route.hops : edges).filter((e) => !e.cut);
    const pool = live.length ? live : edges.filter((e) => !e.cut);
    if (pool.length) cut(pool[Math.floor(Math.random() * pool.length)]);
  });
  out.healBtn.addEventListener('click', () => {
    edges.filter((e) => e.cut).forEach((e) => heal(e, true));
    say(T.healed_all);
  });

  // ---------- başlat ----------
  setRoute(findRoute());
  refresh();
  if (still) {
    fig.classList.add('is-still');
    routeEl.style.opacity = '0.9';
  } else {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; resume(); }, { threshold: 0.15 }).observe(fig);
    }
    document.addEventListener('visibilitychange', resume);
    t0 = performance.now() + 700 - REST_MS;   // ilk istek, sayfa yerleştikten kısa süre sonra
    wake();
  }
})();
