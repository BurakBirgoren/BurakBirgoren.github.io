"""Teknik birikim alanlarının küçük çizimleri (72 × 44).

Çizgi dili sitenin geri kalanıyla aynı: ince gri çizgi, beyaz = etkin, mavi = yanıt / sonuç, kesik = devre dışı.
Her çizimin bir "darbe" yolu var: hücre ekrana girince ve üzerine gelince bu yol boyunca mavi bir nokta akar.
Anahtarlar tools/metinler.json içindeki alanların "id" değerleriyle eşleşir.
"""


def L(d, cls=""):
    """Çizgi. Kesik olmayanlar sayfaya girerken kendini çizer (pathLength=1)."""
    length = "" if "off" in cls.split() else ' pathLength="1"'
    return f'<path class="ln {cls}".strip() d="{d}"{length}/>'.replace('".strip()', '"')


def N(x, y, cls="", r=2.6):
    """Düğüm."""
    return f'<circle class="nd {cls}" cx="{x}" cy="{y}" r="{r}"/>'


def P(d):
    """Darbe yolu."""
    return f'<path class="pulse" d="{d}" pathLength="1"/>'


ICONS = {
    # Planlayan, uygulayan, denetleyen üç ajan bir döngüde; sonuç dışarı çıkar
    "ajan": [
        L("M14 10H40L27 34Z", "on"),
        L("M30 34H59", "res"),
        N(14, 10, "on"), N(40, 10, "on"), N(27, 34, "on"), N(63, 34, "res", 3),
        P("M14 10H40L27 34Z"),
    ],
    # Belgelerden getirme, kaynaklı yanıt
    "rag": [
        L("M12 9V3H32V31H26", "off"),                  # arkadaki belge: yalnız öndekinin dışında kalan kenarları
        L("M6 9H26V39H6Z"),
        L("M10 17H22M10 29H18"),
        L("M10 23H22", "on"),
        L("M26 23H40", "on"),
        L("M46 23H60", "res"),
        N(43, 23, "on"), N(64, 23, "res", 3),
        P("M10 23H60"),
    ],
    # Ses dalgası metne dönüşür; son satırda düzeltme imleci
    "dikte": [
        L("M6 19v6M10 15v14M14 10v24M18 16v12M22 12v20M26 17v10M30 20v4"),
        L("M34 22H42", "on"),
        L("M46 13H68M46 22H66M46 31H58", "on"),
        L("M62 27V35", "res"),
        P("M6 22H42"),
    ],
    # Gelen ses, diyalog, giden ses
    "asistan": [
        L("M6 18v8M10 14v16M14 17v10M18 20v4"),
        L("M22 22H30M42 22H50", "on"),
        L("M54 20v4M58 17v10M62 14v16M66 18v8", "res"),
        N(36, 22, "on", 5),
        P("M18 22H54"),
    ],
    # İki konuşmacı ayrılır; karar ve görev listesi çıkar
    "analiz": [
        L("M12 9v4M16 7v8M20 10v2M24 6v10M28 9v4"),
        L("M12 30v2M16 27v8M20 28v6M24 30v2M28 26v10", "on"),
        L("M34 21H41", "on"),
        L("M45 8h6v6h-6zM45 18h6v6h-6zM45 28h6v6h-6z"),
        L("M55 11H68M55 21H66M55 31H62", "on"),
        L("M46.5 11l1.5 1.5 2.5-3", "res"),
        N(5, 11), N(5, 31, "on"),
        P("M8 31H41"),
    ],
    # Taranmış sayfa okunur, bir alan çıkarılır
    "ocr": [
        L("M10 10V4h6M40 4h6v6M46 34v6h-6M16 40h-6v-6", "res"),
        L("M14 7H42V37H14Z"),
        L("M18 14H36M18 26H32M18 32H34"),
        L("M18 20H38M42 20H54M54 15H70V25H54Z", "on"),
        L("M57 20H67", "res"),
        P("M18 20H54"),
    ],
    # Nesne bölütlenir, kutulanır, boyutu ölçülür
    "goruntu": [
        L("M4 4H46V40H4Z"),
        L("M13 11H39V35H13Z", "off res"),
        L("M16 32L20 18L30 14L36 24L34 32Z", "on"),
        L("M56 11V35M52 11H60M52 35H60", "res"),
        P("M16 32L20 18L30 14L36 24L34 32Z"),
    ],
    # Kare, oynatma ve üretim
    "uretim": [
        L("M8 2H48V34", "off"),
        L("M4 6H44V40H4Z"),
        L("M19 15L31 23L19 31Z", "on"),
        L("M60 7L62 13L68 15L62 17L60 23L58 17L52 15L58 13Z", "res"),
        P("M19 15L31 23L19 31Z"),
    ],
    # Kısıt altında en iyi nokta
    "karar": [
        L("M6 4V38H68"),
        L("M50 4V38", "off"),
        L("M10 10C22 36 38 38 64 12", "on"),
        N(31.75, 30.5, "res", 3),
        P("M10 10C22 36 38 38 64 12"),
    ],
    # W + BA: büyük ağırlık matrisi ve dar (düşük kerteli) uyarlayıcı
    "uyarlama": [
        L("M6 8H30V36H6Z"),
        L("M6 17.3H30M6 26.6H30M14 8V36M22 8V36"),
        L("M35 22h6M38 19v6", "on"),
        L("M46 8L56 19V25L46 36ZM56 19L66 8V36L56 25Z", "res"),
        P("M46 22H66"),
    ],
    # İstekler sunuculara dağılır
    "sunum": [
        L("M30 5H68V15H30ZM30 17H68V27H30ZM30 29H68V39H30Z"),
        L("M35 10H48M35 22H48M35 34H48"),
        L("M4 10H26M4 34H26"),
        L("M4 22H26", "on"),
        N(62, 10, "on", 2.2), N(62, 22, "res", 2.2), N(62, 34, "on", 2.2),
        P("M4 22H48"),
    ],
    # Model cihazın içinde çalışır; buluta bağlantı gerekmez
    "uc": [
        L("M24 2H44Q47 2 47 5V39Q47 42 44 42H24Q21 42 21 39V5Q21 2 24 2Z", "on"),
        L("M31 6H37"),
        L("M28 16H40V28H28Z", "res"),
        L("M31 13v3M37 13v3M31 28v3M37 28v3M25 19h3M25 25h3M40 19h3M40 25h3", "res"),
        L("M47 22H62", "off"),
        N(65, 22),
        P("M28 16H40V28H28Z"),
    ],
}


def svg(key):
    parts = ICONS[key]
    return '<svg class="field__fig" viewBox="0 0 72 44" aria-hidden="true">' + "".join(parts) + "</svg>"
