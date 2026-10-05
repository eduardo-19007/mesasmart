from pathlib import Path
from docx import Document
from pypdf import PdfReader
from zipfile import ZipFile
from lxml import etree

root = Path(__file__).resolve().parents[2]
out = root / 'mesasmart-app' / 'qa' / 'review-sources'
out.mkdir(parents=True, exist_ok=True)
sources = list(root.glob('*.docx')) + list(root.glob('*.pptx')) + list(root.glob('*.pdf'))
sources.append(Path('C:/Users/Alice April/Downloads/100000SI63_InnovacionYTransformacionDigital.pdf'))
for path in sources:
    lines = [str(path)]
    if path.suffix == '.docx':
        doc = Document(path)
        for index, block in enumerate(doc.iter_inner_content(), 1):
            if hasattr(block, 'text'):
                lines.append(f'[{index} {block.style.name}] {block.text}')
            else:
                lines.append(f'[{index} TABLE]')
                lines.extend(' | '.join(c.text for c in row.cells) for row in block.rows)
        lines.append(f'IMAGES {len(doc.inline_shapes)}')
    elif path.suffix == '.pdf':
        for index, page in enumerate(PdfReader(path).pages, 1):
            lines.append(f'PAGE {index}\n{page.extract_text()}')
    else:
        with ZipFile(path) as z:
            slides = sorted((n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')), key=lambda n: int(n.split('slide')[-1].split('.')[0]))
            for name in slides:
                tree = etree.fromstring(z.read(name))
                lines.append(name + '\n' + '\n'.join(tree.xpath('//*[local-name()="t"]/text()')))
    (out / (path.stem + '.txt')).write_text('\n'.join(lines), encoding='utf-8')
    print(path.name, len('\n'.join(lines)), 'characters')
