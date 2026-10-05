from pathlib import Path
from zipfile import ZipFile
import re
import json
from docx import Document
from lxml import etree
from pypdf import PdfReader

root = Path(__file__).resolve().parents[2]
path = root / 'Proyecto_MesaSmart_Implementacion_Verificada.docx'
doc = Document(path)
captions = [p.text for p in doc.paragraphs if re.match(r'^(Tabla|Figura) \d+', p.text)]
with ZipFile(path) as z:
    xml = etree.fromstring(z.read('word/document.xml'))
    props = xml.xpath('//*[local-name()="docPr"]')
    fields = xml.xpath('//*[local-name()="instrText"]/text()')
    structure = {
        'document': path.name, 'tables': len(doc.tables), 'images': len(props),
        'images_without_alt': sum(not p.get('descr') for p in props),
        'figure_numbers': [int(re.match(r'Figura (\d+)', c)[1]) for c in captions if c.startswith('Figura')],
        'table_numbers_in_order': [int(re.match(r'Tabla (\d+)', c)[1]) for c in captions if c.startswith('Tabla')],
        'fields': fields,
    }
pdf = PdfReader(root / 'qa_implementacion_verificada' / (path.stem + '.pdf'))
structure['render_pages'] = len(pdf.pages)
structure['page_locators'] = []
for i,p in enumerate(pdf.pages, 1):
    text = p.extract_text()
    for term in ['2.2. Objetivos', 'Tabla 49.', 'Tabla 51.', 'Tabla 56.', 'Tabla 36.', 'Anexo I', '61 comprobaciones', 'seis migraciones', '2026 - I']:
        if term in text:
            structure['page_locators'].append({'page': i,'term': term})
versions = []
for p in sorted(root.glob('*.docx')):
    d = Document(p)
    versions.append({'file':p.name,'paragraphs':len(d.paragraphs),'tables':len(d.tables),'images':len(d.inline_shapes)})
structure['versions']=versions
out = root / 'mesasmart-app' / 'qa' / 'review-structure.json'
out.write_text(json.dumps(structure,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(structure,ensure_ascii=False,indent=2))
