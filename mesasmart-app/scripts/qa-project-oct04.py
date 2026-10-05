from pathlib import Path
from zipfile import ZipFile
import json
import re
from lxml import etree
from docx import Document
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
folder = root/'qa_correccion_20261004'
stem = 'Proyecto_MesaSmart_Corregido_Silabo_Rubrica_2026-10-04'
pdf = pdfium.PdfDocument(folder/(stem+'.pdf'))
texts = []
for i, page in enumerate(pdf, 1):
    page.render(scale=1.4).to_pil().save(folder/f'page-{i}.png')
    texts.append(f'PAGE {i}\n'+page.get_textpage().get_text_range())
(folder/'rendered-text.txt').write_text('\n'.join(texts), encoding='utf-8')
for start in range(1,len(pdf)+1,4):
    canvas = Image.new('RGB',(1440,2100),'#d9dde1')
    draw = ImageDraw.Draw(canvas)
    for slot,n in enumerate(range(start,min(start+4,len(pdf)+1))):
        image = Image.open(folder/f'page-{n}.png').convert('RGB')
        image.thumbnail((690,990))
        x,y=15+(slot%2)*715,15+(slot//2)*1040
        canvas.paste(image,(x,y+25))
        draw.text((x,y),f'Page {n}',fill='black')
    canvas.save(folder/f'contact-{(start-1)//4+1:02}.jpg',quality=92)
doc = Document(root/(stem+'.docx'))
headings = [p.text for p in doc.paragraphs if p.style.name.startswith('Heading')]
with ZipFile(root/(stem+'.docx')) as archive:
    xml = etree.fromstring(archive.read('word/document.xml'))
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def text(node): return ''.join(node.xpath('.//w:t/text()',namespaces=ns))
bookmarks={b.get('{%s}name'%ns['w']):text(b.getparent()) for b in xml.xpath('//w:bookmarkStart',namespaces=ns)}
toc=[(text(a),bookmarks.get(a.get('{%s}anchor'%ns['w']))) for a in xml.xpath('//w:hyperlink[@w:anchor]',namespaces=ns) if a.get('{%s}anchor'%ns['w']).startswith('_Toc')]
missing=[h for h in headings if not any(target==h for _,target in toc)]
bad=[title for title,target in toc if not target or not title.startswith(target)]
tables=[int(re.match(r'Tabla (\d+)',p.text)[1]) for p in doc.paragraphs if re.match(r'Tabla \d+',p.text)]
figures=[int(re.match(r'Figura (\d+)',p.text)[1]) for p in doc.paragraphs if re.match(r'Figura \d+',p.text)]
report={'pages':len(pdf),'toc_entries':len(toc),'missing_headings':missing,'bad_toc_entries':bad,'table_captions':tables,'figure_captions':figures,'images':len(doc.inline_shapes)}
(folder/'structure.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert not missing and not bad
assert tables==list(range(1,61)) and figures==list(range(1,14))
checks_path = folder/'editorial-checks.json'
checks = json.loads(checks_path.read_text(encoding='utf-8'))
checks.update(render_pending=False, pages=len(pdf), structure_verified=True)
checks_path.write_text(json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf-8')
