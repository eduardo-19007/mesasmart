"""Create the revised academic manuscript from the retained, reviewed version."""
from pathlib import Path
from copy import deepcopy
import re
import json
import textwrap
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.table import Table
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'mesasmart-app'
OUT = ROOT / 'Proyecto_MesaSmart_Corregido_Silabo_Rubrica_2026-10-04.docx'
QA = ROOT / 'qa_correccion_20261004'
QA.mkdir(exist_ok=True)
doc = Document(ROOT / 'Proyecto_MesaSmart_Corregido_2026-09-28.docx')
for style_name in ['Body Text', 'Heading 3']:
    doc.styles[style_name].font.name = 'Times New Roman'
    doc.styles[style_name].font.size = Pt(12)
doc.styles['Body Text'].paragraph_format.line_spacing = 1.5
doc.styles['Body Text'].paragraph_format.first_line_indent = Inches(0.5)
doc.styles['Subtitle'].font.color.rgb = RGBColor(0,0,0)
for style in doc.styles:
    if style.name.lower().startswith('toc '):
        style.font.name = 'Times New Roman'
        style.font.size = Pt(10)
        style.paragraph_format.line_spacing = 1
        style.paragraph_format.space_before = Pt(0)
        style.paragraph_format.space_after = Pt(3)

def all_paragraphs():
    yield from doc.paragraphs
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from cell.paragraphs

def replace(p, value):
    if not p._p.xpath('.//w:drawing') and not p._p.xpath('.//w:fldChar'):
        p.text = value

def find(prefix):
    return next(p for p in doc.paragraphs if p.text.startswith(prefix))

def after(p, value, style='Body Text'):
    new = doc.add_paragraph(value, style)
    p._p.addnext(new._p)
    return new

def before(p, value, style='Body Text'):
    return p.insert_paragraph_before(value, style)

def table_for(number):
    p = find(f'Tabla {number}.')
    node = p._p.getnext()
    while node is not None and node.tag != qn('w:tbl'):
        node = node.getnext()
    assert node is not None, number
    return Table(node, doc._body)

def rewrite_table(number, rows):
    t = table_for(number)
    assert all(len(row) == len(t.columns) for row in rows), number
    while len(t.rows) > len(rows):
        t._tbl.remove(t.rows[-1]._tr)
    while len(t.rows) < len(rows):
        t.add_row()
    for row, values in zip(t.rows, rows):
        for cell, value in zip(row.cells, values):
            cell.text = str(value)

# Preserve the first advance objectives and central question verbatim.
original_objectives = [p.text for p in doc.paragraphs if re.match(r'^[1-6]\. (Analizar las necesidades|Diseñar el flujo|Implementar una arquitectura|Desarrollar un modelo|Incorporar mecanismos|Evaluar el funcionamiento)', p.text)]
replacements = {
    'Implementación local, evaluación técnica y plan de validación': 'Implementación local y evaluación académica',
    'Causas observadas': 'Causas planteadas para contrastar',
    'Seguimiento de estado en tiempo real': 'Seguimiento mediante consulta periódica de cinco segundos',
    'Datos centralizados en Cloud': 'Datos centralizados en PostgreSQL local; Cloud pendiente',
    'Estimación progresivamente inteligente': 'Regla operativa y experimento ML separado',
    'Arquitectura no seleccionada': 'Infraestructura Cloud aún no seleccionada ni validada',
    'Definir componentes, datos, proveedor Cloud y seguridad': 'Validar proveedor Cloud, HTTPS, continuidad y costos de la arquitectura ya seleccionada',
    'hasta vencer': 'durante la vigencia; después, solo lectura de la sesión con pedidos activos y hasta 24 horas después de su finalización',
    'hasta vencimiento': 'durante la vigencia y según la política de seguimiento posterior de la sesión',
    'Si el total vigente difiere del carrito, no se crea el pedido y se exige confirmar el nuevo importe.': 'Se comparan total y precios unitarios; se exige reconfirmación incluso si dos cambios mantienen el total. Verificación posterior al cambio identificada en el registro de cierre.',
    'Auditoría integral/paginada y política de credenciales temporales': 'Verificar visor paginado ampliado; faltan política de credenciales temporales y centralización de incidentes',
}
for p in list(all_paragraphs()):
    value = p.text
    for a, b in replacements.items():
        value = value.replace(a, b)
    if value != p.text:
        replace(p, value)

for p in list(doc.paragraphs):
    s = p.text
    if s.startswith('Se restituyen la pregunta central') or s.startswith('La correspondencia con el sílabo 2026-2 se documenta'):
        p._p.getparent().remove(p._p)
    elif s.startswith('Estado al 28/09/2026:'):
        replace(p, 'Corte al 04/10/2026. Los objetivos del avance 1 se conservan. El anexo N distingue pruebas históricas y nuevas verificaciones. La unidad de Machine Learning se desarrolla mediante el experimento; el cumplimiento operativo y el piloto siguen pendientes.')
    elif s.startswith('El proyecto responde a demoras'):
        replace(p, 'El proyecto responde a fricciones de coordinación descritas en la literatura y pendientes de medición en un establecimiento autorizado. El MVP conecta carta, registro, cocina, atención, estados y administración sobre PostgreSQL local. El experimento de regresión demuestra entrenamiento y evaluación con datos artificiales, sin acreditar mejora de servicio. El despliegue Cloud y la predicción operativa se mantienen como etapas pendientes.')
    elif s.startswith('Los servicios Cloud facilitan'):
        replace(p, 'Cloud Computing ofrece acceso por red a recursos compartidos y configurables que pueden aprovisionarse con rapidez. Esta definición no equivale a instalar PostgreSQL en un equipo local. MesaSmart debe demostrar despliegue, configuración y operación antes de atribuirse esta capacidad. La elección del proveedor considerará presupuesto, responsabilidades de seguridad y recuperación (Mell y Grance, 2011). Humble y Farley (2010) fundamentan la entrega automatizada, no la definición de Cloud.')
    elif s.startswith('A partir de esta comparación, MesaSmart adopta'):
        replace(p, 'MesaSmart combina acceso QR, persistencia, seguimiento y permisos en una implementación local. Cloud es una decisión de despliegue aún pendiente y Ridge es un experimento independiente. La literatura orienta el diseño, pero no prueba la eficacia de esta combinación ni su aceptación en Lima. La contribución a contrastar es reducir intermediación en el registro y proporcionar trazabilidad sin eliminar la atención humana.')
    elif s.startswith('La API utilizará JSON'):
        replace(p, 'La API utiliza JSON y códigos públicos MS protegidos por sesión o rol. La creación admite reintentos con idempotencyKey; una misma clave no debe duplicar un pedido. Las transiciones verifican rol y estado bajo bloqueo de fila: repetir una transición ya aplicada responde con conflicto, no constituye una operación de replay idempotente. La respuesta de detalle incluye historial de estados y horas. El registro nuevo compara precios unitarios y total esperado; un conflicto requiere nueva confirmación.')
    elif s.startswith('El gráfico conserva la planificación original'):
        replace(p, 'El gráfico revisado y la tabla 28 representan cuatro sprints de dos semanas. Son una planificación, no fechas ejecutadas. Los hitos académicos del curso duran 18 semanas y no equivalen a la duración de construcción. Solo las actas reales permitirán informar cumplimiento de sprints.')
    elif s.startswith('Actualización del diagrama:'):
        replace(p, 'El diagrama muestra el estado inicial Confirmado y sus transiciones operativas. REGISTERED permanece en el enum histórico de la base, pero la aplicación no lo utiliza al crear pedidos. Cerrar un pedido no acredita un pago.')
    elif s.startswith('Alcance de la figura: diseño conceptual.'):
        replace(p, 'La figura distingue implementación local de integraciones pendientes. No representa una publicación Cloud ni una pasarela operativa.')
    elif s.startswith('La implementación local demuestra viabilidad'):
        replace(p, 'Las conclusiones se organizan según los seis objetivos del primer avance. La evidencia técnica acredita comportamientos en el entorno de prueba, no disponibilidad productiva ni mejora causal del restaurante. No se declara cumplido un objetivo que dependa de trabajo de campo o integraciones pendientes.')
    elif s.startswith('La suite de integración completó 73'):
        replace(p, 'Línea base anterior a los cambios de esta edición: 73 comprobaciones de integración aprobadas. Su evidencia se conserva en qa/audit-2026-10-04/integration-results.json. La ejecución posterior y sus limitaciones deben consultarse en el anexo N y en el registro de correcciones; no se sustituye una ejecución faltante por el resultado anterior.')
    elif s.startswith('Se verificó localmente el ciclo de pedido'):
        replace(p, 'La línea base técnica comprende 73 comprobaciones de integración y cuatro grupos de regresiones, anteriores a las correcciones de esta edición. El experimento Ridge fue reproducido con MAE de 2,289 minutos y RMSE de 2,883 minutos sobre datos sintéticos. Las correcciones nuevas se distinguen de aquella evidencia en el anexo N. Ninguno de estos resultados acredita mejora real de atención, validación comercial o ejecución de Scrum.')
    elif s.startswith('La implementación podrá comenzar'):
        replace(p, 'La implementación local ya existe. La selección de infraestructura Cloud queda pendiente de autorización de costos y de evaluación de seguridad, respaldo, monitoreo y reversión. No se incluirán credenciales en la entrega académica.')
    elif s.startswith('La estimación del tiempo hasta el estado Listo es un problema'):
        replace(p, 'El experimento ejecutado estima minutos entre Confirmado y Listo. Usa dos predictores disponibles al confirmar: minutos base y cantidad total. Se separa cronológicamente entrenamiento, validación y prueba; marcas temporales iguales no cruzan fronteras. El baseline ejecutado es el tiempo configurado, no una mediana aprendida de históricos. Las variables futuras se mantienen fuera del contrato ejecutable actual.')
    elif s.startswith('El presupuesto final deberá presentar tres escenarios.'):
        replace(p, 'Se presentan tres escenarios hipotéticos comparables a continuación. No representan restaurantes contratados, demanda observada ni cotizaciones. Sirven para identificar condiciones de sostenibilidad y orientar entrevistas de disposición de pago. La inversión valorizada inicial no se recupera solo por alcanzar equilibrio operativo mensual.')
    elif s.startswith('Anexo de implementación y verificación técnica'):
        replace(p, 'Anexo N Implementación y control técnico')
        p.style = 'Heading 2'
    elif s.startswith('Anexo J.') or s.startswith('Anexo K.') or s.startswith('Anexo L.') or s.startswith('Anexo M.'):
        replace(p, s.replace('. ', ' ', 1))
        p.style = 'Heading 2'

before(find('1.2 Problema central'), 'Las causas de este apartado son hipótesis de diagnóstico apoyadas por antecedentes; no se dispone todavía de una observación propia del restaurante. Antes del piloto se medirá registro, preparación y entrega por separado y se anotarán aforo, turno, personal y correcciones. Esta distinción evita atribuir toda demora a la toma de pedidos.')

# Deepen theory with the exact implemented experiment rather than unrelated AI topics.
anchor = find('4.6 Ciberseguridad')
for title, body in [
    ('4.5.1 Regresión supervisada y variable objetivo', 'Un problema de regresión predice una magnitud continua. Aquí cada fila representa un pedido, las entradas se conocen al confirmarlo y la salida observada es su duración hasta Listo. No se predice satisfacción ni entrega a la mesa. La regla operativa toma el máximo de minutos configurados de los productos; no aprende parámetros y no debe denominarse IA entrenada. La regresión independiente permite comparar un método aprendido contra esa regla bajo las mismas observaciones.'),
    ('4.5.2 Regularización y escalado', 'Ridge ajusta coeficientes lineales penalizando su magnitud mediante regularización L2. Alpha controla la intensidad de la penalización; el proyecto compara 0,1, 1 y 10 y selecciona por error de validación. StandardScaler centra y escala los predictores con estadísticas del entrenamiento, reutilizadas sin recalcular en validación y prueba. Esto evita que el tamaño de las unidades determine por sí solo la penalización. Fuente: scikit-learn, documentación 1.7 de Ridge y StandardScaler.'),
    ('4.5.3 Evaluación y fuga de información', 'La validación selecciona alpha y la prueba reservada estima el error fuera de las filas utilizadas para elegirlo. Calcular estadísticas con todo el conjunto, usar ready_at como predictor o escoger alpha por el resultado del test produciría fuga de información. El script usa 144 filas para entrenamiento, 48 para validación y 48 para prueba en la demostración sintética. Su división es un holdout temporal propio, no una llamada a TimeSeriesSplit ni validación cruzada.'),
    ('4.5.4 Métricas e interpretación', 'MAE = promedio de |tiempo observado - tiempo predicho|, expresado en minutos. RMSE = raíz del promedio de errores cuadrados; da más peso a errores grandes. Se reportan junto al baseline sobre las mismas filas. Un MAE bajo en datos artificiales no demuestra precisión en un restaurante. La decisión operativa requiere datos autorizados, análisis por turnos y carga, control de valores extremos y seguimiento posterior. P90 de error, cobertura e intervalos son evaluaciones propuestas que el script actual no calcula.'),
]:
    before(anchor, title, 'Heading 3')
    before(anchor, body)

before(find('5.1 Brecha identificada'), 'La pertinencia de un antecedente no implica equivalencia de contextos. Menús QR y estudios de intención de compra ayudan a formular decisiones de experiencia; no acreditan tiempos de cocina. Restaurantes virtuales no reproducen la entrega presencial, y un control QR para dispositivos no acredita seguridad integral de MesaSmart. Se conserva esta distinción al interpretar la tabla. Cuando no se ha cotejado el texto completo, muestra, instrumento y magnitud del efecto quedan sin confirmar y no se usan para cuantificar beneficios.')
before(find('5.1 Brecha identificada'), 'La brecha formulada es de integración y validación contextual, no una afirmación de inexistencia de otras plataformas. Para cerrarla, el piloto deberá contrastar si el flujo reduce correcciones y consultas de estado en condiciones comparables. Un resultado desfavorable también es informativo: puede revelar barreras de conectividad, carga de cocina o accesibilidad que el QR por sí solo no resuelve.')

rewrite_table(5, [
    ['Resultado del curso', 'Aplicación en MesaSmart', 'Evidencia y límite'],
    ['Unidad 1: describir innovación y transformación digital', 'Problema, proceso, conocimiento y selección tecnológica', 'Capítulos 1, 4 y 6; diagnóstico local pendiente'],
    ['Unidad 2: aplicar metodologías de innovación', 'Canvas, Design Thinking, Lean Startup y Scrum', 'Capítulos 6, 8 y 9; instrumentos listos, actas y entrevistas pendientes'],
    ['Unidad 3: implementar soluciones con Machine Learning', 'Pipeline Ridge ejecutable y evaluado', 'Anexo K y ml/train.py; datos sintéticos, sin inferencia operativa'],
    ['Logro general: mejorar la gestión organizacional', 'MVP técnico y protocolo de evaluación', 'Pruebas locales; efecto organizacional aún no demostrado'],
])
rewrite_table(38, [
    ['Elemento', 'Definición verificable'],
    ['Variable objetivo', 'actual_minutes: duración Confirmado a Listo, positiva'],
    ['Predictores ejecutados', 'baseline_minutes y quantity; disponibles al confirmar'],
    ['Partición ejecutada', 'Holdout temporal: entrenamiento 144, validación 48, prueba 48 en el conjunto sintético'],
    ['Baseline', 'Minutos configurados del pedido; mediana histórica propuesta, no ejecutada'],
    ['Modelo ejecutado', 'StandardScaler + Ridge; alpha 0,1/1/10; selección por MAE de validación'],
    ['Métricas ejecutadas', 'MAE y RMSE en prueba; MAE del baseline sobre las mismas filas'],
    ['Activación operativa', 'No aprobada; requiere procedencia real, evaluación externa y decisión registrada'],
])
rewrite_table(56, [
    ['Campo', 'Tipo', 'Descripción', 'Regla'],
    ['created_at', 'ISO 8601 UTC', 'Creación del pedido; ordena el corte temporal', 'Fecha válida con zona horaria'],
    ['baseline_minutes', 'Número', 'Minutos configurados y persistidos al crear', 'Finito y mayor que cero'],
    ['quantity', 'Entero', 'Suma de unidades de las líneas', 'Mayor que cero'],
    ['actual_minutes', 'Decimal', 'Diferencia ready_at - confirmed_at en minutos', 'Mayor que cero; solo READY, DELIVERED o CLOSED'],
])
after(find('Anexo G Diccionario mínimo del dataset'), 'Este es el contrato del exportador actual, no una lista de variables futuras. El CSV no incluye nombres, observaciones ni identificadores personales. El equipo revisará procedencia, duplicados, coherencia temporal y exclusiones antes de entrenar. Franja, día y carga simultánea son futuras ampliaciones y exigen una nueva versión del dataset.')

rewrite_table(57, [
    ['OE', 'Req.', 'HU', 'Prueba o criterio', 'Evidencia', 'Estado'],
    ['OE1', 'Campo', 'Transv.', 'Entrevistas y línea base', 'Anexos D-F; sin actas', 'Pendiente de campo'],
    ['OE2', 'RF01', 'HU01/HU04', 'QR válido, alterado, vencido y renovado', 'test-integration.mjs; review-probes.mjs', 'Base local probada; extensión de lectura por verificar'],
    ['OE5', 'RF07', 'HU02/HU03', 'Login, roles y revocación', 'test-integration.mjs; staff-auth.ts', 'Base local probada'],
    ['OE2', 'RF02', 'HU05', 'Carta, precio y disponibilidad', 'test-integration.mjs; audit-offset-prices.mjs', 'Precio por línea añadido; verificar nueva ejecución'],
    ['OE2', 'RF03', 'HU06', 'Registro y replay concurrente', 'server-order-repository.ts; suite integración', 'Base local probada; contrato ampliado'],
    ['OE2', 'RF04/RF05', 'HU07', 'Estados, roles, motivo y hora visible', 'order-tracker.tsx; integración', 'Historial añadido; aceptación física pendiente'],
    ['OE4', 'RF06', 'HU08', 'Regla visible y evaluación separada', 'ml/train.py; metrics.json', 'Demo sintética verificada; real pendiente'],
    ['OE6', 'RF08', 'HU09', 'Indicadores y filtros por fecha', 'api/admin/metrics; admin-dashboard.tsx', 'Filtros añadidos; verificar nueva ejecución'],
    ['OE5', 'RF10', 'HU10', 'Cambios, accesos e incidentes', 'admin/audit; api.ts; logs con ID', 'Parcial; centralización de errores pendiente'],
    ['OE2', 'RF09', 'HU11', 'Firma/replay de pago externo', 'Sin proveedor ni webhook', 'No implementado'],
    ['OE3', 'RNF disp.', 'Transv.', 'HTTPS, monitor, backup restaurado', 'Guía de despliegue', 'Plan, sin ejecución Cloud'],
    ['OE5', 'RNF seg.', 'Transv.', 'Permisos, integridad y recuperación', 'Suite local; aceptación y pentest pendientes', 'Parcial'],
    ['OE6', 'RNF uso', 'Transv.', 'Teléfonos, roles y tareas', 'Anexos E/F/L', 'Pendiente de campo'],
    ['OE6', 'RNF rend.', 'Transv.', 'Carga mixta y recursos', 'Ensayo histórico de solo lectura', 'No acredita carga representativa'],
    ['OE3/ OE5', 'RNF mant.', 'Transv.', 'Versionado, CI y revisiones', 'Workflow preparado y manifiesto de hashes', 'CI remota y revisión de equipo pendientes'],
    ['OE4', 'Rec.', 'Futura', 'Comparar Precision@K con baseline', 'Diseño 10.7', 'No implementado'],
])
replace(find('Anexo I Plantilla'), 'Anexo I Matriz de trazabilidad y estado de evidencia')
replace(find('La columna Evidencia se completará'), 'Las rutas técnicas son relativas a mesasmart-app. Cada ejecución deberá conservar fecha, versión o hash, nombre exacto de caso y resultado. Las filas no equivalen a aceptación del usuario. La matriz distingue evidencia previa, código añadido y validación pendiente; no atribuye IDs de prueba ficticios a la suite.')

anchor = find('11.6 Impacto esperado')
before(anchor, 'Escenarios mensuales de sensibilidad', 'Heading 3')
before(anchor, 'Supuestos comunes: suscripción S/ 249, costo variable S/ 70 por establecimiento y costo fijo S/ 600 mensuales. Resultado operativo = establecimientos × (249 - 70) - 600. No incluye impuestos, financiamiento, recuperación del desarrollo valorizado ni adquisición de clientes; los valores no son cotizaciones.')
before(anchor, 'Escenario conservador: 2 establecimientos; ingresos S/ 498, variables S/ 140 y resultado operativo de -S/ 242. Escenario de referencia: 4 establecimientos; ingresos S/ 996, variables S/ 280 y resultado de S/ 116. Escenario favorable: 8 establecimientos; ingresos S/ 1 992, variables S/ 560 y resultado de S/ 832. Son ejercicios hipotéticos, no previsiones de ventas.')
before(anchor, 'El equilibrio es cuatro establecimientos bajo los supuestos anteriores. Si el costo variable sube a S/ 100, se necesitan cinco; si la suscripción baja a S/ 199 manteniendo costo variable de S/ 70, también se requieren cinco. La decisión comercial debe esperar entrevistas, cotizaciones fechadas y un registro de horas de soporte.')

start = find('14.1 Conclusiones')
end = find('14.2 Recomendaciones')
node = start._p.getnext()
while node is not end._p:
    following = node.getnext()
    node.getparent().remove(node)
    node = following
for body in [
    'OE1. Se estructuraron necesidades, fricciones e instrumentos de diagnóstico. Sin entrevistas ni línea base propia no se concluye que su frecuencia o magnitud represente a restaurantes de Lima Metropolitana.',
    'OE2. El flujo QR, carta, registro y seguimiento está implementado localmente, con controles de precio e historial ampliados en esta edición. El proceso de pago sigue pendiente; por ello, el objetivo completo mantiene cumplimiento parcial.',
    'OE3. Se dispone de arquitectura Next.js/PostgreSQL y preparación de contenedor. No existe evidencia de publicación Cloud, disponibilidad medida o escalamiento, por lo que la implementación local no cumple por sí sola este objetivo.',
    'OE4. Se ejecutó Ridge con dos predictores y prueba temporal reservada, reproduciendo MAE de 2,289 minutos en datos sintéticos. El resultado acredita el procedimiento, no precisión real. Faltan datos históricos autorizados, recomendaciones y decisión de integración operativa.',
    'OE5. Existen autenticación, permisos, transacciones, validación e historial. El cumplimiento es parcial mientras falten verificación productiva de HTTPS, centralización de incidentes y restauración probada. Seguridad desde el diseño no significa ausencia certificada de vulnerabilidades.',
    'OE6. Las pruebas locales demuestran casos funcionales y el experimento aporta métricas sintéticas. No se ha medido adopción, satisfacción ni mejora antes/después. El impacto debe evaluarse en un piloto autorizado con turnos comparables y limitaciones explícitas.',
]:
    before(end, body)

# Place the technical annex after M, keeping one hierarchy for all annexes.
technical = find('Anexo N Implementación')
next_j = find('Anexo J ')
nodes = []
node = technical._p
while node is not next_j._p:
    following = node.getnext()
    nodes.append(node)
    node = following
for node in nodes:
    doc._body._body.insert(len(doc._body._body) - 1, node)
in_technical = False
for p in doc.paragraphs:
    if p.text.startswith('Anexo N '):
        in_technical = True
    elif in_technical and p.style.name == 'Heading 2':
        p.style = 'Heading 3'

doc.add_heading('Control de las correcciones de esta edición', 3)
doc.add_paragraph('Se añadieron al código comparación de precios unitarios, historial con horas, filtros por fecha, agregación SQL, paginación de auditoría, aislamiento del aprovisionamiento CLI y lectura posterior a caducidad para sesiones con pedidos activos o finalizados en las últimas 24 horas. La creación de nuevos pedidos sigue exigiendo QR vigente y sesión abierta. Estos cambios no habilitan pagos ni IA operativa.', 'Body Text')
doc.add_paragraph('Verificación al generar este archivo: lint y compilación pasaron antes del último ajuste SQL; la nueva integración detectó una consulta de seguimiento incorrecta, que fue corregida. La repetición posterior quedó pendiente por disponibilidad del servicio de aprobación. No se declara aprobado el conjunto corregido hasta conservar una nueva ejecución completa. El registro CORRECCIONES_SILABO_RUBRICA_2026-10-04.md documenta cualquier cierre posterior.', 'Body Text')

refs = find('Referencias')
refs_end = find('Anexos')
before(refs_end, 'scikit-learn developers. (2025a). Ridge. Documentación de scikit-learn 1.7. https://scikit-learn.org/1.7/modules/generated/sklearn.linear_model.Ridge.html')
before(refs_end, 'scikit-learn developers. (2025b). StandardScaler. Documentación de scikit-learn 1.7. https://scikit-learn.org/1.7/modules/generated/sklearn.preprocessing.StandardScaler.html')
before(refs_end, 'Mell, P., y Grance, T. (2011). The NIST Definition of Cloud Computing (SP 800-145). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.SP.800-145')

rubric = table_for(51)
for row, points in zip(rubric.rows[1:], [2, 2, 4, 2, 4, 3, 3]):
    row.cells[0].text += f' ({points} puntos)'
after(find('15.1 Correspondencia con la rúbrica'), 'La rúbrica suma 20 puntos: problema 2, objetivos 2, marco teórico 4, presentación formal 2, claridad y dominio 4, respuestas y argumentación 3, recursos visuales 3. Esta distribución es distinta de los pesos del sílabo para APF1, APF2, APF3, participación y proyecto final. La asistencia y el uso de IA tienen penalizaciones de hasta dos puntos según la rúbrica aportada. No es posible medir un porcentaje fiable de autoría automática a partir del texto; el equipo debe revisar, comprender y declarar el apoyo utilizado conforme a la política docente.')

result_path = APP/'qa/integration-results.json'
if result_path.exists():
    result = json.loads(result_path.read_text(encoding='utf-8'))
    if result.get('status') == 'PASS' and result.get('passed', 0) >= 79:
        for p in list(all_paragraphs()):
            value = p.text
            value = value.replace('Base local probada; extensión de lectura por verificar', 'Verificado localmente; aceptación física pendiente')
            value = value.replace('Precio por línea añadido; verificar nueva ejecución', 'Compensación y reconfirmación verificadas localmente')
            value = value.replace('Filtros añadidos; verificar nueva ejecución', 'Filtros de API verificados; aceptación física pendiente')
            if value.startswith('Verificación al generar este archivo:'):
                value = 'Verificación posterior a la corrección: 79 comprobaciones de integración aprobadas, cuatro grupos de regresiones de continuidad y contraseña, y cinco grupos adicionales para precios unitarios, reconfirmación, historial y caducidad. Los fixtures se eliminaron al finalizar. El primer fallo SQL se corrigió y la repetición completa pasó. Evidencias: qa/integration-results.json, qa/correction-regressions.json y qa/correction-price-qr-results.json. Estas pruebas no equivalen a piloto ni aceptación física.'
            if value != p.text:
                replace(p, value)

for p in doc.paragraphs:
    if p.text.startswith('El modelo del proyecto propone que varias personas'):
        replace(p, 'La implementación permite registrar varios pedidos asociados a una misma sesión de mesa. Los dispositivos que conservan el QR autorizado pueden consultar los pedidos de esa sesión según su política de vigencia; no existe identificación individual de comensales. El carrito es local a cada dispositivo y no se sincroniza entre participantes. La edición simultánea de un carrito compartido y la atribución de productos a personas siguen siendo extensiones propuestas, sujetas a reglas de concurrencia y privacidad.')
    elif p.text.startswith('Se adopta una arquitectura web modular'):
        replace(p, 'Se adopta una arquitectura web modular orientada a productividad, trazabilidad y portabilidad. Las dependencias utilizadas se registran en package.json y pnpm-lock.yaml; la versión reproducible debe verificarse contra esos archivos y el manifiesto de entrega, no contra una enumeración que pueda quedar desactualizada en esta memoria.')
replace(find('Tabla 57.'), 'Tabla 57. Matriz de trazabilidad entre objetivos, requisitos y evidencias')
for row in table_for(17).rows[1:]:
    if row.cells[0].text in ('Predicción', 'Pago externo'):
        row.cells[0].text += ' (propuesto)'
        row.cells[2].text += '; no integrado en el sistema actual'
    elif row.cells[0].text == 'Mesa':
        row.cells[1].text = 'Código, capacidad y estado; el token pertenece a la sesión QR'
dependencies = table_for(29)
for row in dependencies.rows:
    if row.cells[0].text.startswith('HU09'):
        row.cells[1].text = 'HU07; no requiere ML'
for values in [
    ['HU10 Auditoría', 'HU02, HU03 y eventos de operación', 'Reestimar con el equipo', 'Registro implementado parcialmente; centralización pendiente'],
    ['HU11 Pago externo', 'HU06 y proveedor autorizado', 'Reestimar con el equipo', 'Pendiente; validar primero integración en sandbox'],
]:
    for cell, value in zip(dependencies.add_row().cells, values):
        cell.text = value

# Replace outdated code-native diagrams with deterministic, readable versions.
font_path = 'C:/Windows/Fonts/arial.ttf'
def diagram(number, title, boxes, note):
    width, height = 1800, 500
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    title_font = ImageFont.truetype(font_path, 42)
    body_font = ImageFont.truetype(font_path, 31)
    small = ImageFont.truetype(font_path, 27)
    draw.text((65, 40), title, font=title_font, fill='#153f44')
    cols = min(3, len(boxes))
    bw, bh = 520, 230
    for i, label in enumerate(boxes):
        col, row = i % cols, i // cols
        x, y = 65 + col * 580, 135 + row * 280
        draw.rounded_rectangle((x, y, x+bw, y+bh), radius=10, fill=['#edf5f4','#eef1f6','#fbf0e7'][col], outline='#557476', width=3)
        wrapped = '\n'.join('\n'.join(textwrap.wrap(line, 28)) for line in label.split('\n'))
        draw.multiline_text((x+25, y+24), wrapped, font=body_font, fill='#18282d', spacing=12)
        if col < cols-1:
            ax, ay = x+bw+8, y+bh//2
            draw.line((ax,ay,ax+43,ay), fill='#557476', width=5)
            draw.polygon([(ax+43,ay),(ax+30,ay-10),(ax+30,ay+10)],fill='#557476')
    draw.multiline_text((65, 410), '\n'.join(textwrap.wrap(note, 108)), font=small, fill='#3f4c50', spacing=5)
    path = QA / f'figura-{number}.png'
    image.save(path)
    caption = find(f'Figura {number}.')
    node = caption._p.getprevious()
    while node is not None and not node.xpath('.//w:drawing'):
        node = node.getprevious()
    assert node is not None, number
    p = next(p for p in doc.paragraphs if p._p is node)
    p.clear()
    shape = p.add_run().add_picture(str(path), width=Inches(6.1))
    shape._inline.docPr.set('descr', title + '. ' + ' / '.join(boxes) + '. ' + note)
    p.paragraph_format.keep_with_next = True

diagram(3, 'Flujo operativo de MesaSmart', ['QR y carta\nSesión validada\nPrecios visibles', 'Confirmación\nPrecios por producto\nClave de reintento', 'Cocina y atención\nEstados autorizados\nEntrega y cierre'], 'Persistencia local y seguimiento periódico. Cierre no acredita pago. IA operativa y Cloud pendientes.')
diagram(5, 'Arquitectura implementada y límites', ['Navegadores\nCliente, cocina, atención\ny administración', 'Next.js y API\nRoles y validaciones\nReglas del pedido', 'PostgreSQL local\nPedidos y sesiones\nEventos y auditoría'], 'Ridge se ejecuta por separado. Contenedor preparado; publicación Cloud, pasarela y monitor pendientes.')
diagram(6, 'Estados y excepciones autorizadas', ['Confirmado\nPuede pasar a preparación\no ser rechazado', 'En preparación\nPuede pasar a Listo\nCancelación autorizada', 'Listo > Entregado\nEntregado > Cerrado\nEstados terminales'], 'Rechazo: desde Confirmado. Cancelación: Confirmado o En preparación, por ADMIN y con motivo.')
diagram(7, 'Relaciones principales de datos', ['Restaurante\nPersonal y productos\nMesas', 'Mesa y sesión QR\nUna mesa tiene sesiones\nUna sesión tiene pedidos', 'Pedido\nLíneas con precio fijado\nEventos con fecha y actor'], 'Esquema operativo PostgreSQL. No existe módulo de pagos o predicciones integrado a la aplicación.')
diagram(9, 'Plan de construcción de ocho semanas', ['SP1 | Semanas 1 y 2\nAcceso y roles\nSP2 | Semanas 3 y 4\nMesas y carta', 'SP3 | Semanas 5 y 6\nRegistro de pedidos\nCocina y atención\nHistorial de estados', 'SP4 | Semanas 7 y 8\nEstimación e indicadores\nPruebas y cierre\nAuditoría'], 'Plan relativo de construcción, no ejecución acreditada. El curso conserva sus hitos de 18 semanas.')
diagram(11, 'Experimento de regresión ejecutado', ['Datos sintéticos\n240 filas; semilla 42851\nBase y cantidad', 'División temporal\n144 / 48 / 48\nScaler solo en train', 'Ridge y evaluación\nAlpha por validación\nMAE y RMSE en test'], 'Baseline configurado. MAE 2,289 min en datos artificiales; no es validación en restaurante.')

# Consistent labels, styling, and updateable Word fields.
after(find('La línea base técnica comprende'), 'Los puntos siguientes son criterios de cierre del proyecto, no una relación de resultados alcanzados. Su cumplimiento deberá contrastarse con los estados y evidencias de los anexos I, K, L y N.')
reference_start = find('Referencias')
reference_end = find('Anexos')
entries = []
node = reference_start._p.getnext()
while node is not None and node is not reference_end._p:
    following = node.getnext()
    p = next((p for p in doc.paragraphs if p._p is node), None)
    if p is not None and p.text.strip():
        entries.append(p)
    node = following
anchor = reference_start._p
for p in sorted(entries, key=lambda p: p.text.casefold()):
    anchor.addnext(p._p)
    anchor = p._p
    p.paragraph_format.left_indent = Inches(0.5)
    p.paragraph_format.first_line_indent = Inches(-0.5)
    p.paragraph_format.line_spacing = 1.5
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
for p in doc.paragraphs:
    if p.style.name.startswith('Heading'):
        p.paragraph_format.keep_with_next = True
        for run in p.runs:
            run.font.color.rgb = RGBColor(0,0,0)
    if p.text.startswith('Tabla ') and p.style.name == 'Caption':
        p.paragraph_format.keep_with_next = True
        for run in p.runs:
            run.font.color.rgb = RGBColor(0,0,0)
for t in doc.tables:
    for row_index, row in enumerate(t.rows):
        props = row._tr.get_or_add_trPr()
        if row_index == 0 and not props.find(qn('w:tblHeader')) is not None:
            props.append(OxmlElement('w:tblHeader'))
        for c in row.cells:
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(4)
                for r in p.runs:
                    r.font.size = Pt(9)
                    if row_index == 0:
                        r.bold = True
    if len(t.columns) == 6:
        widths = [0.45, 0.65, 0.65, 1.45, 1.55, 1.3]
        t.autofit = False
        for row in t.rows:
            for cell, width in zip(row.cells, widths):
                cell.width = Inches(width)

assert original_objectives == [p.text for p in doc.paragraphs if re.match(r'^[1-6]\. (Analizar las necesidades|Diseñar el flujo|Implementar una arquitectura|Desarrollar un modelo|Incorporar mecanismos|Evaluar el funcionamiento)', p.text)]
update = OxmlElement('w:updateFields')
update.set(qn('w:val'), 'true')
doc.settings.element.append(update)
doc.save(OUT)
(QA/'editorial-checks.json').write_text(json.dumps({'source': 'Proyecto_MesaSmart_Corregido_2026-09-28.docx', 'output': OUT.name, 'original_objectives_preserved': len(original_objectives), 'images': len(doc.inline_shapes), 'tables': len(doc.tables), 'render_pending': True}, indent=2), encoding='utf-8')
print(OUT)
