from pathlib import Path
from PIL import Image, ImageDraw

folder = Path(__file__).resolve().parents[2] / "qa_implementacion_verificada"
pages = sorted(folder.glob("page-*.png"), key=lambda path: int(path.stem.split("-")[-1]))
thumb_width = 700
for sheet_index in range(0, len(pages), 4):
    group = pages[sheet_index:sheet_index + 4]
    thumbs = []
    for page in group:
        image = Image.open(page).convert("RGB")
        height = round(image.height * thumb_width / image.width)
        thumbs.append((page, image.resize((thumb_width, height))))
    cell_height = max(image.height for _, image in thumbs) + 45
    canvas = Image.new("RGB", (thumb_width * 2 + 60, cell_height * 2 + 60), "#d9dde1")
    draw = ImageDraw.Draw(canvas)
    for index, (page, image) in enumerate(thumbs):
        x = 20 + (index % 2) * (thumb_width + 20)
        y = 20 + (index // 2) * cell_height
        canvas.paste(image, (x, y + 25))
        draw.text((x, y + 4), page.stem, fill="black")
    canvas.save(folder / f"contact-{sheet_index // 4 + 1:02}.jpg", quality=88)
