#!/usr/bin/env python3
"""BRGRN sitesinin sayfalarını üretir.

Kaynak : tools/page.html (şablon) + tools/metinler.json (dört dilde metinler)
Çıktı  : index.html (Türkçe), en/index.html, de/index.html, zh/index.html

Kullanım: python3 tools/build.py
Metin ya da şablon değişince yeniden çalıştırılır. Çıktı dosyaları elle düzenlenmez.
Stil ya da betik değiştiyse aşağıdaki VER bir artırılır (tarayıcı önbelleği için).
"""
import html
import json
import pathlib
import re
import sys

import ikonlar                                      # tools/ikonlar.py: alan çizimleri

VER = "17"
LANGS = ["tr", "en", "de", "zh"]          # ilk dil kök adreste yayınlanır
HREFLANG = {"tr": "tr", "en": "en", "de": "de", "zh": "zh-Hans"}

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = (ROOT / "tools" / "page.html").read_text(encoding="utf-8")
TEXTS = json.loads((ROOT / "tools" / "metinler.json").read_text(encoding="utf-8"))
SITE = TEXTS["_site"]


def esc(text):
    return html.escape(str(text), quote=True)


def path_of(lang):
    return "" if lang == LANGS[0] else lang + "/"


def check_icons():
    """Her alanın bir çizimi olmalı."""
    missing = [item["id"] for item in TEXTS[LANGS[0]]["fields"] if item["id"] not in ikonlar.ICONS]
    if missing:
        sys.exit(f"tools/ikonlar.py: şu alanların çizimi yok: {missing}")


def check_same_shape():
    """Bütün dillerde aynı anahtarlar ve aynı uzunlukta listeler olmalı."""
    def shape(value):
        if isinstance(value, dict):
            return {key: shape(item) for key, item in value.items()}
        if isinstance(value, list):
            return [shape(item) for item in value]
        return None
    base = shape(TEXTS[LANGS[0]])
    for lang in LANGS[1:]:
        if shape(TEXTS[lang]) != base:
            sys.exit(f"metinler.json: '{lang}' dilinin anahtarları '{LANGS[0]}' ile aynı değil")


def build(lang):
    t = TEXTS[lang]
    root = "" if lang == LANGS[0] else "../"
    url = SITE["url"] + path_of(lang)

    hreflang = "\n".join(
        f'<link rel="alternate" hreflang="{HREFLANG[code]}" href="{SITE["url"]}{path_of(code)}">' for code in LANGS
    ) + f'\n<link rel="alternate" hreflang="x-default" href="{SITE["url"]}">'

    lang_switch = "\n".join(
        "    <a href=\"{href}\" lang=\"{hl}\" hreflang=\"{hl}\" title=\"{name}\"{cur}>{code}</a>".format(
            href=esc((root + path_of(code)) or "./"), hl=HREFLANG[code], name=esc(TEXTS[code]["lang_name"]),
            cur=' aria-current="true"' if code == lang else "", code=esc(TEXTS[code]["lang_code"]),
        ) for code in LANGS
    )

    fields = "\n".join(
        f'''        <li class="field" data-reveal style="--i:{n % 3}">
          {ikonlar.svg(item["id"])}
          <h3 class="field__name">{esc(item["name"])}</h3>
          <p class="field__text">{esc(item["text"])}</p>
        </li>''' for n, item in enumerate(t["fields"])
    )

    # Betiklerin kullandığı metinler sayfaya JSON olarak gömülür.
    script_texts = {"net": t["net_msg"], "flow": {"in": t["flow_in"], "out": t["flow_out"]}, "form": t["form_msg"]}
    i18n_json = json.dumps(script_texts, ensure_ascii=False).replace("</", "<\\/")

    values = {key: esc(value) for key, value in t.items() if isinstance(value, str)}
    for n, item in enumerate(t["principles"], start=1):
        values[f"p{n}_name"] = esc(item["name"])
        values[f"p{n}_text"] = esc(item["text"])
    values.update(
        root=root, home=root or "./", url=esc(url), site_url=esc(SITE["url"]), ver=VER, mail=esc(SITE["mail"]),
        form_endpoint=esc(SITE["form_endpoint"]), form_key=esc(SITE["form_key"]),
        hreflang=hreflang, lang_switch=lang_switch, fields=fields, i18n_json=i18n_json,
    )

    def fill(match):
        key = match.group(1)
        if key not in values:
            sys.exit(f"page.html: '{{{{{key}}}}}' için değer yok ({lang})")
        return values[key]

    page = re.sub(r"\{\{(\w+)\}\}", fill, TEMPLATE)
    note = "<!-- Üretilen dosya, elle düzenlenmez. Kaynak: tools/page.html + tools/metinler.json (python3 tools/build.py) -->"
    page = page.replace("<!doctype html>", "<!doctype html>\n" + note, 1)

    out = ROOT / path_of(lang) / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    return out


if __name__ == "__main__":
    check_same_shape()
    check_icons()
    for code in LANGS:
        print("yazıldı:", build(code).relative_to(ROOT))
