# BRGRN sitesi

Dört dilde tek sayfalık statik site (Türkçe, İngilizce, Almanca, Çince). GitHub Pages'ta yayınlanır: https://brgrn.com.tr

## Sayfalar nasıl üretilir

Dört dil sayfası tek bir şablondan ve tek bir metin dosyasından üretilir:

```bash
python3 tools/build.py
```

| Kaynak | İçerik |
|---|---|
| `tools/page.html` | Sayfa şablonu; metinlerin yerinde `{{anahtar}}` durur |
| `tools/metinler.json` | Bütün metinler, dört dilde; site ayarları en üstte `_site` içinde |
| `tools/build.py` | Üretici betik |

Çıktılar `index.html` (Türkçe), `en/index.html`, `de/index.html` ve `zh/index.html` dosyalarıdır. Bunlar elle düzenlenmez; değişiklik şablonda ya da metin dosyasında yapılır, sonra betik yeniden çalıştırılır. Betik, bir dilde eksik anahtar varsa durur.

## Diğer dosyalar

| Dosya | İçerik |
|---|---|
| `404.html` | Olmayan adreslerde gösterilen sayfa (stili ve logosu içinde) |
| `assets/css/site.css` | Stil; renkler ve yazı tipleri en üstte `:root` içinde |
| `assets/js/network.js` | Giriş bölümündeki canlı ağ |
| `assets/js/flow.js` | Girdi → çıktı akışı |
| `assets/js/contact.js` | İletişim bölümü: "adresi kopyala" düğmesi ve mesaj formu |
| `assets/img/` | Logo: `mark.svg` (amblem), `wordmark.svg` (yazı), site simgeleri |
| `assets/fonts/` | Yazı tipleri (Michroma, IBM Plex Sans, IBM Plex Mono) |
| `CNAME` | Alan adı (`brgrn.com.tr`) |
| `.nojekyll` | GitHub Pages dosyaları işlemeden yayınlasın diye |

## Stil ya da betik değişince

`tools/build.py` içindeki `VER` sayısını bir artır ve sayfaları yeniden üret. Tarayıcılar stil ve betik dosyalarını önbellekte tutar; sayı değişmezse ziyaretçi eski sürümü görür.

## İletişim formu

Form, mesajı bir form hizmetine (Web3Forms) gönderecek şekilde yazıldı. Hizmetin verdiği erişim anahtarı `tools/metinler.json` içinde `_site.form_key` alanına yazılır. Bu alan boşken form, ziyaretçinin posta programını konu ve mesaj dolu olarak açar.

## Önizleme

```bash
python3 -m http.server 7961 --bind 127.0.0.1
```

Tarayıcıda `http://localhost:7961` adresini aç. Diller: `/`, `/en/`, `/de/`, `/zh/`.

## Proje eklemek

Şimdilik proje bölümü yok. İlk proje geldiğinde `tools/page.html` içinde `id="akis"` bölümünden önce yeni bir `<section class="band">` olarak eklenir; metinleri `tools/metinler.json` dosyasına dört dilde yazılır.
