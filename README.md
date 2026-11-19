# BRGRN sitesi

Tek sayfalık statik site. Derleme adımı yok: dosyalar olduğu gibi yayınlanır (GitHub Pages'a uygun).

## Önizleme

```bash
python3 -m http.server 7940 --bind 127.0.0.1
```

Tarayıcıda `http://localhost:7940` adresini aç.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Sayfanın tamamı; metinler burada değişir |
| `404.html` | Olmayan adreslerde gösterilen sayfa (stili ve logosu içinde) |
| `assets/css/site.css` | Stil; renkler ve yazı tipleri en üstte `:root` içinde |
| `assets/js/network.js` | Giriş bölümündeki canlı ağ |
| `assets/img/` | Logo: `mark.svg` (amblem), `wordmark.svg` (yazı), site simgeleri |
| `assets/fonts/` | Yazı tipleri (Michroma, IBM Plex Sans, IBM Plex Mono) |
| `.nojekyll` | GitHub Pages dosyaları işlemeden yayınlasın diye |

## Proje eklemek

`index.html` içindeki `id="projeler"` bölümünde boş durum kutusu (`.slot`) duruyor. İlk proje geldiğinde bu kutu proje listesiyle değiştirilir.
