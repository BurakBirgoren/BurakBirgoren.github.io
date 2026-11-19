/* BRGRN — kaydırdıkça beliren bölümler, yapışkan üst şerit ve teknik birikimdeki imleç ışığı.
   [data-reveal] ve [data-line] taşıyan öğeler ekrana girince "is-in" sınıfını alır; geçişin kendisi CSS'te. */
(() => {
  'use strict';

  const header = document.querySelector('.top');
  if (header) {
    const stuck = () => header.classList.toggle('is-stuck', window.scrollY > 12);
    stuck();
    window.addEventListener('scroll', stuck, { passive: true });
  }

  // Teknik birikim ızgarası: ışık imleci izler (yalnız fare olan cihazlarda)
  const grid = document.querySelector('.fields');
  if (grid && window.matchMedia('(hover: hover)').matches) {
    const cells = [...grid.children];
    let raf = 0, last = null;
    const paint = () => {
      raf = 0;
      for (const cell of cells) {
        const r = cell.getBoundingClientRect();
        cell.style.setProperty('--x', Math.round(last.clientX - r.left) + 'px');
        cell.style.setProperty('--y', Math.round(last.clientY - r.top) + 'px');
      }
    };
    grid.addEventListener('pointermove', (e) => { last = e; grid.classList.add('is-lit'); if (!raf) raf = requestAnimationFrame(paint); });
    grid.addEventListener('pointerleave', () => grid.classList.remove('is-lit'));
  }

  const items = document.querySelectorAll('[data-reveal], [data-line]');
  const showAll = () => items.forEach((el) => el.classList.add('is-in'));
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { showAll(); return; }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  items.forEach((el) => io.observe(el));
})();
