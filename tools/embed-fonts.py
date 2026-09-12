"""Embed the eight unmodified Iosevka 34.8.1 faces from the user's TTC.

Run with Python plus fonttools and brotli installed:
    python tools/embed-fonts.py path/to/IosevkaSS03.ttc
All glyphs, shaping tables and license metadata are retained.
"""
import base64
import io
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.font-build-deps'))
from fontTools.ttLib import TTCollection, TTFont

collection = TTCollection(sys.argv[1], lazy=True)
faces = [('Iosevka Fixed SS03', 56, 400, 'normal'),
         ('Iosevka Fixed SS03', 65, 400, 'italic'),
         ('Iosevka Fixed SS03', 110, 700, 'normal'),
         ('Iosevka Fixed SS03', 119, 700, 'italic'),
         ('Iosevka SS03 Extended', 57, 400, 'normal'),
         ('Iosevka SS03 Extended', 67, 400, 'italic'),
         ('Iosevka SS03 Extended', 111, 700, 'normal'),
         ('Iosevka SS03 Extended', 121, 700, 'italic')]
rules = []
for family, index, weight, style in faces:
    font = collection.fonts[index]
    assert font['OS/2'].usWeightClass == weight
    assert bool(font['head'].macStyle & 2) == (style == 'italic')
    assert font['name'].getDebugName(16) == family.replace(' Extended', '')
    assert ('Extended' in font['name'].getDebugName(17)) == ('Extended' in family)
    font.flavor = 'woff2'
    output = io.BytesIO()
    font.save(output)
    data = output.getvalue()
    check = TTFont(io.BytesIO(data))
    assert check.getBestCmap() == font.getBestCmap()
    encoded = base64.b64encode(data).decode('ascii')
    rules.append(f'@font-face{{font-family:"{family}";font-style:{style};font-weight:{weight};font-display:swap;src:url(data:font/woff2;base64,{encoded}) format("woff2")}}')
    print(f'{family} {weight} {style}: {len(data):,} bytes, {len(check.getBestCmap()):,} characters')
license_text = (ROOT / 'FONT-LICENSE.txt').read_text(encoding='utf-8')
block = '<!-- BEGIN IOSEVKA FONTS -->\n<style>\n/*\n' + license_text + '\n*/\n' + '\n'.join(rules) + '\n</style>\n<!-- END IOSEVKA FONTS -->'
page = ROOT / 'Rotepad.html'
html = page.read_text(encoding='utf-8')
if '<!-- BEGIN IOSEVKA FONTS -->' in html:
    html = re.sub(r'<!-- BEGIN IOSEVKA FONTS -->.*?<!-- END IOSEVKA FONTS -->', lambda _: block, html, flags=re.S)
else:
    html = html.replace('</head>', block + '\n</head>')
page.write_text(html, encoding='utf-8')
