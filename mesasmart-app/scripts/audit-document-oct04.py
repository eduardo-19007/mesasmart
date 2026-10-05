"""Read-only source audit; writes separate evidence, never edits the Word file."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import re
from lxml import etree
from docx import Document
from pypdf import PdfReader

root = Path(__file__).resolve().parents[2]
out = root / 'mesasmart-app/qa/audit-2026-10-04'
out.mkdir(exist_ok=True)
path = root / 'Proyecto_MesaSmart_Corregido_2026-09-28.docx'
doc = Document(path)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with ZipFile(path) as archive:
    xml = etree.fromstring(archive.read('word/document.xml'))
def text(element):
    return ''.join(element.xpath('.//w:t/text()', namespaces=ns))
bookmarks = {b.get('{%s}name' % ns['w']): text(b.getparent()) for b in xml.xpath('//w:bookmarkStart', namespaces=ns)}
toc = []
for link in xml.xpath('//w:hyperlink[@w:anchor]', namespaces=ns):
    anchor = link.get('{%s}anchor' % ns['w'])
    if anchor.startswith('_Toc'):
        title = text(link)
        target = bookmarks.get(anchor)
        toc.append({'entry': title, 'target': target, 'matches': bool(target and title.startswith(target))})
headings = [p.text for p in doc.paragraphs if p.style.name.startswith('Heading')]
captions = [p.text for p in doc.paragraphs if re.match(r'^(Tabla|Figura) \d+', p.text)]
report = {'source': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
          'headings': headings, 'toc': toc, 'toc_missing_headings': [h for h in headings if not any(t['target'] == h for t in toc)],
          'tables': len(doc.tables), 'images': len(doc.inline_shapes), 'captions': captions}
for kind in ['Tabla', 'Figura']:
    numbers = [int(re.match(kind + r' (\d+)', c)[1]) for c in captions if c.startswith(kind)]
    report[kind + '_sequential'] = numbers == list(range(1, len(numbers) + 1))
    report[kind + '_count'] = len(numbers)
for source in root.glob('*.pptx'):
    if source.name.startswith('~$'):
        continue
    with ZipFile(source) as archive:
        slides = sorted((n for n in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml', n)), key=lambda n: int(re.search(r'(\d+)\.xml', n)[1]))
        content = '\n'.join(f'SLIDE {i}\n' + '\n'.join(etree.fromstring(archive.read(n)).xpath('//*[local-name()="t"]/text()')) for i, n in enumerate(slides, 1))
        (out / (source.stem + '.txt')).write_text(content, encoding='utf-8')
for name in ['ProyectoAvance1_Grupo7.pdf', 'modelo del proyecto.docx', 'MesaSmart_Metodologia_Scrum.docx']:
    source = root / name
    if not source.exists():
        continue
    if source.suffix == '.pdf':
        content = '\n'.join(f'PAGE {i}\n{p.extract_text()}' for i, p in enumerate(PdfReader(source).pages, 1))
    else:
        d = Document(source)
        content = '\n'.join(p.text for p in d.paragraphs) + '\n' + '\n'.join(' | '.join(c.text for c in row.cells) for t in d.tables for row in t.rows)
    (out / (source.stem + '.txt')).write_text(content, encoding='utf-8')
syllabus = Path('C:/Users/Alice April/Downloads/100000SI63_InnovacionYTransformacionDigital.pdf')
if syllabus.exists():
    (out / 'silabo.txt').write_text('\n'.join(p.extract_text() for p in PdfReader(syllabus).pages), encoding='utf-8')
pdf = root / 'qa_corregido_20260928/Proyecto_MesaSmart_Corregido_2026-09-28.pdf'
report['existing_pdf_pages'] = len(PdfReader(pdf).pages)
report['pdf_newer_than_docx'] = pdf.stat().st_mtime >= path.stat().st_mtime
report['page_locations'] = []
terms = ['Tabla 11.', 'Tabla 56.', 'Tabla 57.', '11.5 Escenarios', '9.5', 'Referencias', 'Anexo K.']
for i, page in enumerate(PdfReader(pdf).pages, 1):
    content = page.extract_text()
    for term in terms:
        if term in content:
            report['page_locations'].append({'page': i, 'term': term})
(out / 'document-structure.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k not in ['headings', 'toc', 'captions']}, ensure_ascii=False, indent=2))
print('TOC entries:', len(toc), 'Mismatch:', [t for t in toc if not t['matches']])
