/* BRGRN — açık / koyu tema düğmesi. Varsayılan koyu; seçim tarayıcıda saklanır.
   Saklanan seçim sayfa çizilmeden önce <head> içindeki kısa betikle uygulanır. */
(() => {
  'use strict';
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  const meta = document.querySelector('meta[name="theme-color"]');
  const isLight = () => root.getAttribute('data-theme') === 'light';
  const sync = () => {
    btn.setAttribute('aria-pressed', String(isLight()));
    if (meta) meta.content = isLight() ? '#f0f1f5' : '#050508';
  };
  sync();
  btn.addEventListener('click', () => {
    const next = isLight() ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
    try { window.localStorage.setItem('brgrn-tema', next); } catch (err) { /* saklanamazsa seçim yalnız bu sayfada geçerli olur */ }
    sync();
  });
})();
