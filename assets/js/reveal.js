/* BRGRN — kaydırdıkça beliren bölümler ve yapışkan üst şerit.
   [data-reveal] ve [data-line] taşıyan öğeler ekrana girince "is-in" sınıfını alır; geçişin kendisi CSS'te. */
(() => {
  'use strict';

  const header = document.querySelector('.top');
  if (header) {
    const stuck = () => header.classList.toggle('is-stuck', window.scrollY > 12);
    stuck();
    window.addEventListener('scroll', stuck, { passive: true });
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
