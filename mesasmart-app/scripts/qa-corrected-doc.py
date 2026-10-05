from pathlib import Path
import json
import re
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
from docx import Document

root=Path(__file__).resolve().parents[2]
folder=root/'qa_corregido_20260928'
pdf=pdfium.PdfDocument(folder/'Proyecto_MesaSmart_Corregido_2026-09-28.pdf')
texts=[]
for i,page in enumerate(pdf,1):
    page.render(scale=1.5).to_pil().save(folder/f'page-{i}.png')
    texts.append(f'PAGE {i}\n'+page.get_textpage().get_text_range())
(folder/'rendered-text.txt').write_text('\n'.join(texts),encoding='utf-8')
for start in range(1,len(pdf)+1,4):
    canvas=Image.new('RGB',(1440,2100),'#d9dde1')
    draw=ImageDraw.Draw(canvas)
    for slot,n in enumerate(range(start,min(start+4,len(pdf)+1))):
        image=Image.open(folder/f'page-{n}.png').convert('RGB')
        image.thumbnail((690,990))
        x,y=15+(slot%2)*715,15+(slot//2)*1040
        canvas.paste(image,(x,y+25));draw.text((x,y),f'Page {n}',fill='black')
    canvas.save(folder/f'contact-{(start-1)//4+1:02}.jpg',quality=90)
doc=Document(root/'Proyecto_MesaSmart_Corregido_2026-09-28.docx')
captions=[int(re.match(r'Tabla (\d+)\.',p.text)[1]) for p in doc.paragraphs if re.match(r'Tabla (\d+)\.',p.text)]
assert captions==list(range(1,len(captions)+1))
assert all(s._inline.docPr.get('descr') for s in doc.inline_shapes)
report={'pages':len(pdf),'table_captions':len(captions),'images':len(doc.inline_shapes),'captions_sequential':True,'image_alt_text':True}
(folder/'structure.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(report)
