/* BRGRN — iletişim bölümü: "adresi kopyala" düğmesi ve mesaj formu.
   Form, sayfaya gömülü anahtar (data-key) varsa mesajı form hizmetine gönderir;
   anahtar yoksa ziyaretçinin posta programını konu ve mesaj dolu olarak açar. */
(() => {
  'use strict';

  const T = JSON.parse(document.getElementById('i18n').textContent).form;

  // ---------- adresi kopyala ----------
  const copy = async (text) => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    // Güvenli olmayan bağlantıda (ör. yerel ağ önizlemesi) eski yöntem
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (!ok) throw new Error('kopyalanamadı');
  };
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.textContent;
    let timer = 0;
    btn.addEventListener('click', async () => {
      try { await copy(btn.dataset.copy); btn.textContent = btn.dataset.copied; }
      catch (err) { btn.textContent = btn.dataset.failed; }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { btn.textContent = label; }, 2200);
    });
  });

  // ---------- mesaj formu ----------
  const form = document.querySelector('[data-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const send = form.querySelector('[type="submit"]');
  const label = send.textContent;
  const say = (text, kind) => { status.textContent = text; status.dataset.kind = kind; };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get('botcheck')) return;               // gizli kutuyu yalnızca botlar işaretler

    if (!form.dataset.key) {
      const body = data.get('message') + '\n\n' + data.get('name') + '\n' + data.get('email');
      window.location.href = 'mailto:' + form.dataset.to
        + '?subject=' + encodeURIComponent(data.get('subject')) + '&body=' + encodeURIComponent(body);
      say(T.mailto, 'info');
      return;
    }

    send.disabled = true;
    send.textContent = T.sending;
    say('', '');
    try {
      // Hizmetin belgesindeki biçim: JSON gövde, JSON yanıt
      const payload = Object.fromEntries(data);
      payload.access_key = form.dataset.key;
      payload.from_name = 'brgrn.com.tr';
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.success === false) throw new Error('gönderilemedi');
      form.reset();
      say(T.sent, 'ok');
    } catch (err) {
      say(T.failed, 'error');
    } finally {
      send.disabled = false;
      send.textContent = label;
    }
  });
})();
