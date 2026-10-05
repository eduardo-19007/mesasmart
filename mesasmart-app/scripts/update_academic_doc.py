from pathlib import Path
from shutil import copy2

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "Proyecto_MesaSmart_Completo_PreImplementacion.docx"
OUTPUT = ROOT / "Proyecto_MesaSmart_Implementacion_Verificada.docx"


def shade(cell, fill):
    properties = cell._tc.get_or_add_tcPr()
    element = OxmlElement("w:shd")
    element.set(qn("w:fill"), fill)
    properties.append(element)


def borders(table):
    properties = table._tbl.tblPr
    element = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        border = OxmlElement(f"w:{edge}")
        border.set(qn("w:val"), "single")
        border.set(qn("w:sz"), "4")
        border.set(qn("w:color"), "D9D9D9")
        element.append(border)
    properties.append(element)


def set_cell_margins(cell, value=110):
    properties = cell._tc.get_or_add_tcPr()
    margins = properties.first_child_found_in("w:tcMar")
    if margins is None:
        margins = OxmlElement("w:tcMar")
        properties.append(margins)
    for side in ("top", "start", "bottom", "end"):
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        margins.append(node)


def add_heading(doc, text, level):
    paragraph = doc.add_heading(text, level=level)
    paragraph.paragraph_format.space_before = Pt(10 if level == 1 else 7)
    paragraph.paragraph_format.space_after = Pt(5)
    for run in paragraph.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)
    return paragraph


def add_body(doc, text):
    paragraph = doc.add_paragraph(text)
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1.15
    return paragraph


copy2(SOURCE, OUTPUT)
doc = Document(OUTPUT)
doc.add_page_break()
add_heading(doc, "Anexo de implementación y verificación técnica", 1)
add_body(doc, "Este anexo actualiza el estado técnico del proyecto MesaSmart sin modificar el planteamiento, los objetivos ni los resultados presentados en el primer avance. Distingue lo que fue implementado y verificado localmente de las actividades que todavía requieren trabajo de campo, despliegue y validación académica.")

add_heading(doc, "Estado funcional comprobado", 2)
rows = [
    ("Pedidos por QR", "Implementado", "Sesiones persistidas, acceso por mesa, idempotencia y cálculo del precio en el servidor."),
    ("Cocina y atención", "Implementado", "Preparación, pedido listo, entrega y cierre con permisos diferenciados."),
    ("Cancelación y rechazo", "Implementado", "Motivo obligatorio, actor registrado y causa visible en el seguimiento del comensal."),
    ("Cambio de precio", "Implementado", "Si el total vigente difiere del carrito, no se crea el pedido y se exige confirmar el nuevo importe."),
    ("Renovación del QR", "Implementado", "El acceso anterior deja de crear pedidos, pero conserva el seguimiento de pedidos existentes hasta vencer."),
    ("Indicadores", "Implementado", "Conteos y tiempos derivados de datos persistidos; no se muestran porcentajes de satisfacción inventados."),
    ("Estimación de espera", "Estimación inicial", "Regla basada en minutos configurados por producto; todavía no es un modelo de inteligencia artificial entrenado."),
]
table = doc.add_table(rows=1, cols=3)
table.autofit = False
widths = (Cm(4.0), Cm(3.0), Cm(10.0))
headers = ("Componente", "Estado", "Evidencia técnica")
for index, cell in enumerate(table.rows[0].cells):
    cell.width = widths[index]
    cell.text = headers[index]
    shade(cell, "17324D")
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)
    for run in cell.paragraphs[0].runs:
        run.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)
        run.font.size = Pt(9)
for row_index, values in enumerate(rows, start=1):
    cells = table.add_row().cells
    for index, value in enumerate(values):
        cells[index].width = widths[index]
        cells[index].text = value
        cells[index].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cells[index])
        if row_index % 2 == 0:
            shade(cells[index], "F2F6F8")
        for paragraph in cells[index].paragraphs:
            paragraph.paragraph_format.space_after = Pt(0)
            if index == 1:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.font.size = Pt(8.5)
borders(table)

add_heading(doc, "Resultados técnicos verificados", 2)
for text in (
    "La suite de integración completó 61 comprobaciones sobre autenticación, autorización por roles, aislamiento entre restaurantes, sesiones QR, pedidos concurrentes, cambios de estado, precios, excepciones, indicadores y cierre de sesión. Los datos temporales se eliminaron por identificador al finalizar.",
    "La aplicación superó la revisión estática y la compilación de producción. La base local quedó con un restaurante, doce mesas, ocho productos y seis migraciones aplicadas.",
    "La prueba responsive emulada a 390 por 844 píxeles cubrió acceso, panel administrativo, carta, carrito, registro, seguimiento, cocina y rechazo motivado sin desbordamiento horizontal observado.",
    "Una prueba exploratoria de solo lectura ejecutó 50 solicitudes a la carta con concurrencia cinco. Todas respondieron HTTP 200; se observaron 20,08 solicitudes por segundo, p50 de 181 ms, p95 de 591 ms y p99 de 638 ms. La comprobación de salud respondió HTTP 200 y confirmó conexión con PostgreSQL.",
):
    paragraph = doc.add_paragraph(style="List Bullet")
    paragraph.add_run(text)
    paragraph.paragraph_format.space_after = Pt(4)

add_body(doc, "Estos resultados corresponden al entorno local y constituyen evidencia de implementación, no de disponibilidad productiva, impacto en el restaurante ni aceptación por usuarios finales. La prueba de carga fue breve y no midió CPU, memoria o conexiones de base de datos.")

add_heading(doc, "Protocolo pendiente de aceptación", 2)
add_body(doc, "La siguiente validación debe ejecutarse con un administrador, una persona de cocina, una de atención y al menos dos teléfonos físicos. Deben comprobarse el escaneo del QR, el doble envío, la actualización del seguimiento, el rechazo y la cancelación con motivo, la entrega y el cierre, la reconfirmación de precios, la renovación del QR y la recuperación después de perder conexión. Cada caso debe registrar dispositivo, navegador, red, fecha, responsable, resultado e incidencia.")

add_heading(doc, "Despliegue y continuidad operativa", 2)
add_body(doc, "Antes de operar con clientes se requiere un entorno HTTPS, PostgreSQL administrado o mantenido, secretos fuera del repositorio, monitoreo del punto de salud, alertas, revisión de errores, prueba de carga representativa y un procedimiento de reversión. El respaldo solo será válido cuando se restaure en otra base y se comprueben migraciones, pedidos y eventos. En esta etapa no se ha seleccionado ni configurado un proveedor Cloud.")

add_heading(doc, "Piloto académico y componente predictivo", 2)
add_body(doc, "El piloto permanece pendiente. Las cantidades planteadas de 120 pedidos de línea base y 120 con el sistema, 30 a 50 comensales y 6 a 12 colaboradores son metas de recolección, no resultados observados. Antes del trabajo de campo deben aprobarse instrumentos, consentimiento, anonimización, definiciones de tiempo y criterios de exclusión.")
add_body(doc, "La evaluación deberá reportar el tamaño final, datos faltantes, mediana y rango intercuartílico de tiempos, tasa de errores y cancelaciones, satisfacción, contexto y limitaciones. No corresponde afirmar reducción de tiempos, mejora de satisfacción o disponibilidad mientras no existan mediciones verificables.")
add_body(doc, "La estimación actual usa minutos base configurados por producto. Para presentar inteligencia artificial se necesita un conjunto de datos suficiente, separación temporal de entrenamiento y prueba, una línea base, una métrica definida como el error absoluto medio y evaluación fuera de muestra. Cualquier porcentaje de mejora debe mantenerse como hipótesis hasta ser medido.")

add_heading(doc, "Redacción académica recomendada para el estado actual", 2)
quote = doc.add_paragraph()
quote.paragraph_format.left_indent = Cm(0.8)
quote.paragraph_format.right_indent = Cm(0.8)
quote.paragraph_format.space_before = Pt(4)
quote.paragraph_format.space_after = Pt(8)
run = quote.add_run("Se implementó y verificó localmente un MVP de pedidos por QR con control de acceso, idempotencia, seguimiento, roles operativos, excepciones motivadas y persistencia PostgreSQL. La verificación automatizada y responsive no sustituye el piloto con usuarios. La estimación de espera es configurada y todavía no corresponde a un modelo de inteligencia artificial entrenado.")
run.italic = True

add_body(doc, "Los resultados del piloto deberán incorporarse después de ejecutar el trabajo de campo, conservar los instrumentos y revisar la coherencia entre metodología, resultados, discusión, conclusiones, Canvas y evidencias Scrum.")

doc.save(OUTPUT)
print(OUTPUT)
