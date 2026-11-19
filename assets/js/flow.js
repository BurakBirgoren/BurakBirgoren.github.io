/* BRGRN — girdi → çıktı akışı.
   Soldaki girdi türlerinden biri ambleme akar (beyaz), sağdaki çıktı türlerinden biri olarak çıkar (mavi).
   Eşleşmeler rastgele değil: her biri gerçekten yapılan bir dönüşümü gösterir. Etkileşim yok.
   Etiketler çizimin dışında, iki yan sütunda durur; böylece uzun sözcükler (ör. Almanca) çizimi taşırmaz. */
(() => {
  'use strict';

  const fig = document.querySelector('[data-flow]');
  if (!fig) return;
  const svg = fig.querySelector('svg');
  const NS = 'http://www.w3.org/2000/svg';
  const T = JSON.parse(document.getElementById('i18n').textContent).flow;   // etiketler, sayfanın dilinde

  const CX = 224, CY = 120;                 // çizim alanı 448 × 240
  const ROWS = [40, 80, 120, 160, 200];     // yan sütunlardaki etiket satırlarıyla aynı hizada (yüksekliğin 1/6'sı aralıkla)
  const X_IN = 8, X_OUT = 440;              // uç düğümler
  const MERGE_IN = 152, MERGE_OUT = 296;    // hatların birleştiği / ayrıldığı noktalar
  const CORE_R = 36;                        // altıgenin yarıçapı
  const CORE_HALF = CORE_R * Math.cos(Math.PI / 6);

  // [girdi, çıktı] — sırayla döner. Sıra: ses, belge, görüntü, metin, veri → döküm, özet, yanıt, karar, görsel
  const PAIRS = [
    [0, 0], [1, 2], [2, 3], [3, 2], [4, 3], [0, 2],
    [1, 1], [2, 4], [3, 4], [1, 3], [0, 1], [3, 1],
  ];

  const SPEED = 0.2;      // birim/ms
  const COMET = 44;       // darbe uzunluğu
  const DWELL = 160;      // amblemde bekleme
  const EVERY = 1150;     // iki darbe arası

  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };
  // Yatay çık, 45° ile orta hatta in, ambleme gir (çıkışta tersi).
  const inPath = (y) => {
    const d = Math.abs(y - CY);
    return `M${X_IN} ${y}` + (d ? `H${MERGE_IN - d}L${MERGE_IN} ${CY}` : '') + `H${CX - CORE_HALF}`;
  };
  const outPath = (y) => {
    const d = Math.abs(y - CY);
    return `M${CX + CORE_HALF} ${CY}H${MERGE_OUT}` + (d ? `L${MERGE_OUT + d} ${y}` : '') + `H${X_OUT}`;
  };

  // ---------- çizim ----------
  const column = (side, labels) => {
    const col = document.createElement('div');
    col.className = 'flow__col flow__col--' + side;
    col.setAttribute('aria-hidden', 'true');
    const tags = labels.map((text) => {
      const span = document.createElement('span');
      span.className = 'flow__tag';
      span.textContent = text;
      col.appendChild(span);
      return span;
    });
    if (side === 'in') fig.insertBefore(col, svg); else fig.appendChild(col);
    return tags;
  };
  const inTags = column('in', T.in);
  const outTags = column('out', T.out);

  const gLines = el('g', {}, svg);
  const gPulses = el('g', {}, svg);
  const gNodes = el('g', {}, svg);

  const ins = ROWS.map((y, n) => {
    const d = inPath(y);
    const line = el('path', { class: 'flow__line', d }, gLines);
    el('circle', { class: 'flow__node', cx: X_IN, cy: y, r: 3.5 }, gNodes);
    return { d, len: line.getTotalLength(), tag: inTags[n] };
  });
  const outs = ROWS.map((y, n) => {
    const d = outPath(y);
    const line = el('path', { class: 'flow__line', d }, gLines);
    const ring = el('circle', { class: 'flow__ring', cx: X_OUT, cy: y, r: 4 }, gNodes);
    el('circle', { class: 'flow__node flow__node--out', cx: X_OUT, cy: y, r: 3.5 }, gNodes);
    return { d, len: line.getTotalLength(), tag: outTags[n], ring };
  });

  // Ortada altıgen içinde amblem (logo sayfasındaki rozet).
  const hexPts = [];
  for (let n = 0; n < 6; n++) {
    const a = (Math.PI / 3) * n - Math.PI / 2;
    hexPts.push((CX + CORE_R * Math.cos(a)).toFixed(2) + ',' + (CY + CORE_R * Math.sin(a)).toFixed(2));
  }
  el('polygon', { class: 'flow__hex', points: hexPts.join(' ') }, gNodes);
  const glow = el('polygon', { class: 'flow__glow', points: hexPts.join(' ') }, gNodes);
  const MARK = 0.16;
  el('use', {
    href: '#brgrn-mark',
    transform: `translate(${(CX - (189.25 * MARK) / 2).toFixed(2)} ${(CY - (227.6 * MARK) / 2).toFixed(2)}) scale(${MARK})`,
  }, gNodes);

  // ---------- hareket ----------
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let pulses = [], next = 0, lastSpawn = 0, raf = 0, onScreen = false;
  const active = () => onScreen && !document.hidden;
  const place = (path, len, p) => { path.style.strokeDashoffset = COMET - p * (len + COMET); };
  const comet = (kind, d, len) => {
    const path = el('path', { class: 'flow__pulse flow__pulse--' + kind, d }, gPulses);
    path.style.strokeDasharray = COMET + ' ' + (len + COMET);
    place(path, len, 0);
    return path;
  };
  const blink = (node, frames, duration) => { if (node.animate) node.animate(frames, { duration, easing: 'cubic-bezier(.2,.7,.2,1)' }); };

  function spawn(now) {
    const [i, o] = PAIRS[next];
    next = (next + 1) % PAIRS.length;
    const a = ins[i], b = outs[o];
    a.tag.classList.add('is-on');
    pulses.push({ a, b, t0: now, tIn: (a.len + COMET) / SPEED, tOut: (b.len + COMET) / SPEED, pin: comet('in', a.d, a.len), pout: null });
  }

  function frame(now) {
    raf = 0;
    if (!active()) return;
    if (now - lastSpawn >= EVERY) { spawn(now); lastSpawn = now; }
    pulses = pulses.filter((p) => {
      const t = now - p.t0;
      if (p.pin) {
        place(p.pin, p.a.len, Math.min(t / p.tIn, 1));
        if (t >= p.tIn) {
          p.pin.remove(); p.pin = null;
          p.a.tag.classList.remove('is-on');
          blink(glow, [{ opacity: 0.95 }, { opacity: 0 }], 520);
        }
        return true;
      }
      const u = t - p.tIn - DWELL;
      if (u < 0) return true;
      if (!p.pout) p.pout = comet('out', p.b.d, p.b.len);
      place(p.pout, p.b.len, Math.min(u / p.tOut, 1));
      if (u < p.tOut) return true;
      p.pout.remove();
      p.b.tag.classList.add('is-on');
      window.setTimeout(() => p.b.tag.classList.remove('is-on'), 850);
      blink(p.b.ring, [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.6)' }], 600);
      return false;
    });
    raf = requestAnimationFrame(frame);
  }

  // Görünmezken durur; geri gelince yarım kalan darbeler silinip akış baştan başlar.
  function resume() {
    if (!active() || raf) return;
    pulses.forEach((p) => { if (p.pin) p.pin.remove(); if (p.pout) p.pout.remove(); });
    pulses = [];
    ins.forEach((a) => a.tag.classList.remove('is-on'));
    lastSpawn = performance.now() - EVERY + 250;
    raf = requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; resume(); }, { threshold: 0.2 }).observe(fig);
  } else {
    onScreen = true; resume();
  }
  document.addEventListener('visibilitychange', resume);
})();
