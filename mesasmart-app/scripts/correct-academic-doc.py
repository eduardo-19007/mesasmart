"""Correct the retained manuscript without discarding illustrations or prior files."""
import json
import re
from pathlib import Path
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / 'mesasmart-app'
doc = Document(ROOT / 'Proyecto_MesaSmart_Implementacion_Verificada.docx')
out = ROOT / 'Proyecto_MesaSmart_Corregido_2026-09-28.docx'

def paragraphs():
    yield from doc.paragraphs
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from cell.paragraphs

def replace_text(p, text):
    if p.text == text:
        return
    # Only textual paragraphs are replaced; drawing and field paragraphs remain intact.
    if p._p.xpath('.//w:drawing') or p._p.xpath('.//w:fldChar'):
        return
    p.text = text

def after(p, text, style='Body Text'):
    new = doc.add_paragraph(text, style=style)
    p._p.addnext(new._p)
    return new

def body(text):
    return doc.add_paragraph(text, style='Body Text')

def table(headers, rows):
    titles={'Compromiso original':'Evolución de compromisos del primer avance', 'Medida':'Evaluación ML sobre datos sintéticos', 'Área':'Evidencias disponibles y actividades pendientes'}
    doc.add_paragraph('Tabla 999. '+titles[headers[0]],style='Caption')
    t = doc.add_table(rows=1, cols=len(headers))
    for c,v in zip(t.rows[0].cells,headers): c.text=v
    for values in rows:
        for c,v in zip(t.add_row().cells,values): c.text=str(v)
    return t

replacements = {
    'Especificación integral previa a la implementación y validación': 'Implementación local, evaluación técnica y plan de validación',
    '2026 - I': '2026 - II (según sílabo 2026-2)',
    '(Eito Brun, 2020)': '(Eito Brun y Sicilia Urbán, 2020)',
    'Eito Brun, R. (2020). Gestión de la innovación. Editorial UOC.': 'Eito Brun, R., y Sicilia Urbán, M. Á. (2020). Gestión de innovación y procesos Software. Editorial Universidad de Alcalá. ISBN 9788418254055.',
    'Registrado → Confirmado → En preparación → Listo → Entregado → Cerrado': 'Confirmado → En preparación → Listo → Entregado → Cerrado',
    'Registrado, Confirmado, En preparación, Listo, Entregado y Cerrado': 'Confirmado, En preparación, Listo, Entregado y Cerrado',
    'Proveedor administrado compatible con PostgreSQL': 'Autenticación propia: scrypt, cookie HttpOnly firmada HMAC y versión de sesión',
    'PostgreSQL administrado': 'PostgreSQL local; servicio administrado pendiente para Cloud',
    'Plataforma serverless compatible con Next.js': 'Next.js local; contenedor preparado, despliegue Cloud pendiente',
    'Python, pandas y scikit-learn': 'Python y scikit-learn; regresión Ridge demostrativa',
    'Git con integración continua': 'Git local; historial y CI pendientes de cierre',
    'Logs estructurados y monitor de disponibilidad': 'Salud local y auditoría parcial; monitor externo pendiente',
    'identificadores no secuenciales expuestos': 'códigos públicos secuenciales MS protegidos por autorización de sesión o rol',
    'Cuestionario SUS o escala equivalente': 'Cuestionario propio de seis ítems Likert; no corresponde a SUS',
    'API, base de datos, autenticación y servicio de pago sandbox': 'API, base de datos y autenticación; pago sandbox pendiente',
    '61 comprobaciones': '73 comprobaciones',
    'seis migraciones aplicadas': 'siete migraciones aplicadas',
    'Inicio de preparación': 'Confirmación del pedido (no inicio de preparación)',
    'Una pasarela externa procesa la información financiera. MesaSmart conserva únicamente una referencia y el estado de la operación.': 'No existe integración de pago en el MVP. El diseño futuro prevé una pasarela externa; actualmente no se registra referencia ni confirmación de cobro.',
}
for p in list(paragraphs()):
    text=p.text
    for old,new in replacements.items(): text=text.replace(old,new)
    replace_text(p,text)

for p in list(doc.paragraphs):
    text=p.text
    if text.startswith('MesaSmart es una propuesta de transformación digital'):
        replace_text(p,'MesaSmart aborda la autogestión de pedidos en restaurantes de atención en mesa de Lima Metropolitana. Se implementó un MVP local con Next.js y PostgreSQL: carta por QR, registro de pedidos, seguimiento, cocina, atención, administración y controles de acceso. La verificación técnica no demuestra todavía mejora de tiempos, satisfacción ni disponibilidad en el restaurante. Cloud, pagos y recomendaciones permanecen compromisos pendientes; no se presentan como capacidades desplegadas.')
    elif text.startswith('La ejecución se organiza con Scrum'):
        replace_text(p,'La planificación utiliza Scrum y un modelo de negocio Canvas. Existen código y pruebas, pero no actas verificables de ejecución de sprints ni entrevistas de validación comercial. Los pagos y las recomendaciones del alcance original se conservan como compromisos pendientes; cualquier reducción debe ser acordada con el equipo y el docente. La evaluación del piloto considerará eficiencia, adopción, seguridad y satisfacción con datos observados.')
    elif text.startswith('Los capítulos iniciales mantienen'):
        replace_text(p,'Se restituyen la pregunta central, el objetivo general y los seis objetivos específicos del primer avance. Las ampliaciones explican decisiones técnicas sin afirmar que los compromisos pendientes ya se cumplieron. El anexo de evolución distingue formulación original, implementación y validación pendiente; el PDF del avance 1 se conserva como fuente inalterada.')
    elif text.startswith('La versión corregida también se alinea'):
        replace_text(p,'La correspondencia con el sílabo 2026-2 se documenta por unidad. El experimento Ridge acredita entrenamiento y evaluación técnica con datos sintéticos, no desempeño real. La implementación Cloud y la validación con usuarios siguen pendientes. La propuesta de contenido de cada avance es organización del equipo; el sílabo sí establece semanas y pesos, no esa lista detallada de entregables.')
    elif text.startswith('Estado del proyecto. Este documento'):
        replace_text(p,'Estado al 28/09/2026: MVP local implementado y pruebas técnicas ejecutadas; experimento ML demostrativo entrenado. La aplicación mantiene la estimación configurada. No existe evidencia de despliegue Cloud, pagos integrados ni piloto real. Metas, costos y muestras son supuestos de planificación, no resultados.')
    elif text.startswith('¿Cómo diseñar e implementar un ecosistema'):
        replace_text(p,'¿Cómo un ecosistema digital basado en Cloud Computing, Inteligencia Artificial y ciberseguridad puede optimizar la autogestión de pedidos y mejorar la experiencia del cliente en restaurantes de atención en mesa de Lima Metropolitana?')
    elif text.startswith('Desarrollar un ecosistema digital inteligente y seguro'):
        replace_text(p,'Desarrollar un ecosistema digital inteligente y seguro de autogestión de pedidos, basado en Cloud Computing e Inteligencia Artificial, que optimice el proceso de atención y mejore la experiencia del cliente en restaurantes de atención en mesa de Lima Metropolitana.')
    elif text.startswith('La pasarela de pago se considera'):
        replace_text(p,'El acceso al pago pertenece al compromiso del avance 1 y permanece pendiente. La versión actual no integra pasarela, webhook ni registro de cobro; cerrar una orden no significa cobrarla. No se almacenan datos de tarjetas. La propuesta futura utilizaría un proveedor externo con verificación de firma e idempotencia, previa aprobación del alcance.')
    elif text.startswith('Tabla 36. Categorías del presupuesto'):
        p._p.getparent().remove(p._p)
    elif text.startswith('Este anexo actualiza el estado técnico'):
        replace_text(p,'Este anexo actualiza la implementación local y sus límites. Las correcciones de continuidad, validación de mesas y contraseña se documentan junto a las pruebas ejecutadas. No se confunde evidencia técnica con ejecución de Scrum, Cloud ni resultados del piloto.')
    elif text.startswith('La estimación actual usa minutos base'):
        replace_text(p,'La aplicación usa minutos base configurados por producto. Se añadió un pipeline Ridge con escalado entrenado solo con el conjunto de entrenamiento, elección de hiperparámetro mediante validación temporal y prueba reservada. Se ejecutó con datos sintéticos claramente identificados. El exportador local encontró cero pedidos terminados elegibles; no hay evaluación con datos reales ni promoción del modelo al servicio operativo.')
    elif text.startswith('Una prueba exploratoria de solo lectura') or text.startswith('La prueba responsive emulada'):
        replace_text(p,'Evidencia histórica del 27/09/2026, no reejecutada en su totalidad en esta corrección: '+text)
    elif text.startswith('Antes de operar con clientes se requiere'):
        replace_text(p,'Antes de operar con clientes se requiere HTTPS, PostgreSQL mantenido o administrado, secretos fuera del repositorio, alertas, carga representativa y reversión. El respaldo debe restaurarse en otra base y verificarse. Se preparó un Dockerfile y una guía; no se ha desplegado ni seleccionado proveedor Cloud.')
    elif text.startswith('Se compararán regresión lineal regularizada'):
        replace_text(p,'El experimento ejecutado compara Ridge con alpha 0,1, 1 y 10 usando las mismas particiones temporales; se selecciona por MAE de validación. Árboles, Random Forest y Gradient Boosting quedan como comparaciones futuras, no ejecutadas. La regla configurada es la referencia actual. Con históricos reales podrá añadirse una mediana por producto y franja estimada únicamente con entrenamiento.')
    elif text.startswith('Los valores de desempeño permanecerán como pendientes'):
        replace_text(p,'El anexo K presenta las métricas obtenidas sobre datos sintéticos y los artefactos reproducibles. El desempeño con datos del restaurante permanece pendiente. El experimento no prueba generalización ni reducción de tiempos; tampoco se ha integrado en el servicio de pedidos. Clustering, recomendaciones y otros algoritmos permanecen fuera del experimento ejecutado.')
    elif text.startswith('13 Resultados previstos y criterios de cierre'):
        replace_text(p,'13 Resultados técnicos y criterios de cierre')
        after(p,'Se verificó localmente el ciclo de pedido, roles y persistencia con 73 comprobaciones de integración. Las regresiones adicionales verificaron recuperación tras renovación del QR, rechazo de M00 y cambio de contraseña concurrente. El experimento Ridge generó métricas sintéticas reproducibles (anexo K). La lista siguiente corresponde a criterios de cierre: las mejoras de servicio, Canvas, Scrum y piloto no se dan por alcanzados.')
    elif text.startswith('14 Conclusiones de diseño y recomendaciones'):
        replace_text(p,'14 Conclusiones de implementación y recomendaciones')
    elif text.startswith('Las conclusiones de esta versión corresponden'):
        replace_text(p,'La implementación local demuestra viabilidad del flujo QR, registro, seguimiento y operación por roles. Las pruebas no acreditan disponibilidad Cloud ni efecto sobre la experiencia del restaurante. El ML demuestra un procedimiento de entrenamiento/evaluación sintético; falta validarlo con datos reales. Se conservan los objetivos del avance 1 y se documentan los compromisos aún no cumplidos.')
    elif text.startswith('3. Diseñar el prototipo de cliente'):
        replace_text(p,'3. Validar las pantallas implementadas con teléfonos físicos, cocina, atención y administración; corregir incidencias observadas.')
    elif text.startswith('4. Definir el modelo de datos, arquitectura'):
        replace_text(p,'4. Seleccionar proveedor Cloud, publicar en entorno autorizado y verificar HTTPS, monitoreo y restauración.')
    elif text.startswith('5. Construir el flujo completo de pedido'):
        replace_text(p,'5. Recolectar históricos autorizados y evaluar el modelo con datos reales antes de habilitar inferencia operativa.')

objectives = [
'Analizar las necesidades, puntos de espera y requerimientos funcionales presentes durante el proceso de atención y gestión de pedidos en restaurantes con servicio en mesa.',
'Diseñar el flujo de autogestión que permita acceder mediante QR a la carta digital, registrar pedidos, consultar su estado, visualizar un tiempo estimado de atención y acceder al proceso de pago.',
'Implementar una arquitectura basada en Cloud Computing que centralice la información de mesas, productos, pedidos, estados y operaciones, garantizando disponibilidad y capacidad de escalamiento.',
'Desarrollar un modelo inicial de Inteligencia Artificial que utilice información histórica y operativa para estimar el tiempo de atención de los pedidos y apoyar recomendaciones personalizadas.',
'Incorporar mecanismos de ciberseguridad orientados a proteger la confidencialidad, integridad y disponibilidad de los datos, accesos, comunicaciones y operaciones digitales.',
'Evaluar el funcionamiento de la propuesta mediante indicadores de tiempo de atención, precisión de las estimaciones, adopción de la autogestión, satisfacción del usuario, disponibilidad y seguridad.'
]
ps=list(doc.paragraphs)
start=next(i for i,p in enumerate(ps) if p.text=='2.2 Objetivos específicos')
for i,text in enumerate(objectives): replace_text(ps[start+1+i],f'{i+1}. {text}')
after(ps[start+6],'Los objetivos anteriores conservan el compromiso presentado en el avance 1. Su restitución no implica cumplimiento: pago, Cloud, recomendaciones y validación real están pendientes. La estimación ML se demuestra por separado, sin afirmar desempeño en operación.')

for t in doc.tables:
    for row in t.rows:
        values=[c.text for c in row.cells]
        if values[0]=='POST /api/table-sessions':
            row.cells[1].text='Administrador (ADMIN)'
            row.cells[2].text='Emitir o renovar QR temporal; no lo crea el comensal'
        if values[0]=='POST /api/payments/webhook':
            row.cells[0].text='Propuesta futura: POST /api/payments/webhook'
            row.cells[2].text='No implementado; confirmación externa de pago pendiente'
        if values[0]=='OE2' and values[1]=='RF05': row.cells[2].text='HU07'
        if values[0]=='OE2' and values[1] in ['RF01','RF05']:
            row.cells[4].text='qa/integration-results.json; qa/correction-regressions.json'
            row.cells[5].text='Verificado localmente; aceptación física pendiente'
        if values[0]=='OE4' and values[2]=='HU08':
            row.cells[1].text='RF06'
            row.cells[4].text='ml/results/demo/metrics.json; solo datos sintéticos'
            row.cells[5].text='Demostración técnica; validación real pendiente'
        if values[0]=='OE3' and values[1]=='RNF-Disponibilidad':
            row.cells[2].text='Transversal (no HU03)'
        if values[0] in ['SP3','SP4'] and len(values)==4 and 'semanas' in values[1]:
            row.cells[1].text='2 semanas (plan revisado)'
        if values[0]=='Daily Scrum' and len(values)>2:
            row.cells[2].text='Evento de Developers: inspeccionar progreso hacia el objetivo y adaptar el plan'
        if values[0]=='confirmed_at': row.cells[2].text='Confirmación automática al registrar; no inicio de preparación'
        if values[0]=='RF09':
            row.cells[1].text='Pago externo: compromiso original pendiente de implementación'
        if values[0]=='Estimación de espera':
            row.cells[2].text='Regla en la aplicación. Ridge entrenado y evaluado aparte con datos sintéticos; no aprobado para operación.'
        if values[0]=='Modelos candidatos': row.cells[1].text='Ejecutado: Ridge con alpha 0,1/1/10. Árboles y ensambles: futuros.'
        if values[0]=='Baseline': row.cells[1].text='Ejecutado: minutos configurados. Mediana histórica: futura, con datos reales.'
        if values[0]=='Hito' and len(values)==4: row.cells[3].text='Contenido propuesto por el equipo'

# Restore the two antecedents missing from the comparative matrix, without inventing samples.
for t in doc.tables:
    contents=' '.join(c.text for r in t.rows for c in r.cells)
    if 'Sultana' in contents and 'Davitadze' in contents:
        for author,topic,limitation in [
            ('Klouvidaki et al. (2023)','Experiencia del cliente en restaurantes virtuales','Contexto distinto a atención presencial en mesa; no prueba impacto de MesaSmart.'),
            ('Hassan et al. (2026)','Menú digital, satisfacción del sistema y lealtad','Relaciones del estudio externo no demuestran efecto causal ni validan este piloto.')]:
            cells=t.add_row().cells
            values=[author,topic,limitation+' Orienta el análisis de experiencia; no trasladar resultados al piloto.']
            for i,c in enumerate(cells): c.text=values[min(i,len(values)-1)]
        break

# Make conceptual illustrations explicitly distinguishable from the running software.
for p in list(doc.paragraphs):
    if p.text.startswith('Figura 5.') or p.text.startswith('Figura 7.'):
        after(p,'Alcance de la figura: diseño conceptual. Implementación comprobada: Next.js, PostgreSQL local, sesiones de mesa persistidas y autenticación propia; Cloud y pagos aún no desplegados.')
    if p.text.startswith('Figura 6.'):
        after(p,'Actualización del diagrama: la implementación confirma automáticamente el pedido; no persiste el estado Registrado. Flujo real: Confirmado, En preparación, Listo, Entregado y Cerrado; cancelación y rechazo requieren motivo.')
    if p.text.startswith('Figura 9.'):
        after(p,'El gráfico conserva la planificación original. El plan revisado propone cuatro sprints de dos semanas; no representa fechas ni reuniones ejecutadas. El equipo debe aprobar la cadencia y registrar sus eventos reales.')

doc.add_heading('Anexo J. Evolución del avance 1 y decisiones de alcance',1).paragraph_format.page_break_before=True
body('Fuente conservada: ProyectoAvance1_Grupo7.pdf. Se recuperaron literalmente los objetivos y la pregunta central; las explicaciones ampliadas no son una reproducción literal del resto del avance. No existe aprobación docente registrada de cambios de alcance. Los códigos de estudiante repetidos del avance requieren confirmación del equipo; no se adivina su corrección.')
table(['Compromiso original','Estado al corte','Decisión pendiente'],[
('QR físico permanente','Token temporal de 12 horas por defecto, configurable entre 15 y 1440 minutos; renovación cierra creación pero mantiene lectura hasta vencimiento','Validar con docente y restaurante la diferencia; no declarar QR permanente'),
('Cloud','MVP local; Dockerfile y procedimiento preparados','Elegir proveedor, autorizar costos y demostrar HTTPS/operación'),
('Inteligencia Artificial','Ridge demostrativo; regla base en aplicación','Reunir datos reales y aprobar promoción'),
('Recomendaciones personalizadas','No implementadas','Mantener compromiso o aprobar formalmente ajuste'),
('Pago','No implementado; cierre no acredita cobro','Proveedor sandbox, pruebas y aprobación de alcance'),
('Validación de impacto','Sin línea base ni piloto observado','Ejecutar protocolo y reportar resultados reales')])
body('La estructura amplia de esta memoria reúne especificaciones y anexos. El modelo docente propone límites por sección: el equipo debe confirmar si admite esta extensión o preparar una memoria resumida con remisión a anexos. No se presenta una autorización inexistente. El periodo se alineó al sílabo 2026-2; confirmar matrícula antes de entregar.')

doc.add_heading('Anexo K. Resultados reproducibles de Machine Learning',1)
m=json.loads((APP/'ml/results/demo/metrics.json').read_text())
body('Se implementó y ejecutó un experimento técnico con scikit-learn 1.7.2. La variable objetivo es la duración entre confirmed_at y ready_at; preparing_at es un hito distinto. Los predictores son minutos base del pedido y cantidad de unidades, disponibles al confirmar. El exportador excluye pedidos cancelados y rechazados, y no extrae nombres ni observaciones. La exportación local encontró cero filas elegibles: no hay resultados de aprendizaje con datos reales.')
body('La demostración usa 240 observaciones artificiales y semilla 42851. El orden temporal separa 144 filas de entrenamiento, 48 de validación y 48 de prueba. StandardScaler se ajusta solo con entrenamiento; se comparan valores alpha 0,1, 1 y 10 en validación y se conserva el modelo seleccionado sin volver a ajustar sobre prueba. Se verifica que la inferencia del artefacto JSON coincida con scikit-learn dentro de 1e-8.')
table(['Medida','Resultado sintético','Interpretación'],[
('MAE de Ridge',f"{m['test_mae']:.3f} minutos",'Error absoluto medio en 48 filas artificiales reservadas'),
('RMSE de Ridge',f"{m['test_rmse']:.3f} minutos",'Penaliza errores grandes; no estima impacto real'),
('MAE regla base',f"{m['baseline_test_mae']:.3f} minutos",'Comparador sobre las mismas filas'),
('Alpha seleccionado',str(m['alpha']),'Elegido en validación, no en test'),
('Producción','No aprobado','La aplicación conserva la regla configurada')])
body('Estos resultados comprueban el procedimiento, no superioridad en el restaurante: los datos se generaron con una relación conocida y ruido artificial. No se informa reducción real de esperas ni satisfacción. La evaluación externa requiere dataset autorizado, revisión de registros de ensayo, turnos comparables, variables de carga, tamaño justificado y seguimiento de errores. El mínimo técnico de 60 filas del script no es una exigencia del sílabo ni justificación estadística.')
body('Evidencia: mesasmart-app/ml/train.py; scripts/export-ml-data.mjs; ml/results/demo/metrics.json, model.json y predictions.csv. El archivo de métricas registra versión, hash del conjunto, particiones y limitaciones. Instrucciones: ml/README.md. Resultado académico: implementación y evaluación demostrativa; validación operativa pendiente.')

doc.add_heading('Anexo L. Evidencias de corrección y aceptación pendiente',1)
body('Fecha de corte: 28/09/2026. La suite de integración registró 73 casos aprobados. Las regresiones adicionales verificaron rechazo de M00, bloqueo de desactivación con pedido activo, reapertura de pedidos después de renovar QR, consulta autorizada, reintento idempotente y rechazo de pedidos nuevos con token cerrado. Son pruebas locales automatizadas, no aprobación de usuarios finales.')
body('El cambio de contraseña bloquea y valida el usuario vigente dentro de la misma transacción que actualiza el hash y escribe auditoría. La cookie se renueva después del commit. Se probaron dos solicitudes concurrentes sobre una cuenta temporal: hubo un solo cambio exitoso y un único evento. Falta ensayar fallo de auditoría en una base aislada; no se provocaron caídas en la base operativa. En navegador se comprobó seguimiento tras recarga y renovación del QR. La aceptación con teléfonos y personal reales sigue pendiente.')
table(['Área','Evidencia disponible','Pendiente'],[
('Código','Lint, compilación e integración local; qa/integration-results.json y qa/correction-regressions.json','Pruebas físicas y carga representativa'),
('Administración','Gestión de mesas, personal, productos, cuenta y visor de auditoría','Auditoría integral/paginada y política de credenciales temporales'),
('Scrum','Backlog y propuesta de roles/cadencia','Actas auténticas de Planning, Review y Retrospective'),
('Canvas','Nueve bloques y supuestos','Entrevistas y disposición real de pago'),
('Cloud','Dockerfile y guía de despliegue','Publicación, HTTPS, monitor y restauración comprobada'),
('Piloto','Instrumentos y protocolo','Autorización, línea base, aplicación, análisis y acta')])
body('Plantilla de acta Scrum: sprint, fechas reales, asistentes, objetivo, historias demostradas, criterios aceptados/rechazados, evidencia y acciones con responsable. No reconstruir reuniones ficticias a partir de commits. Daily Scrum es un evento de Developers; SCRUMstudy y sus procesos no son equivalentes a Scrum Guide. Cuatro sprints de dos semanas constituyen un plan revisado, no una cronología ejecutada.')
body('Plantilla de prueba física: ID seudónimo, fecha, rol, teléfono, navegador, red, tarea, resultado, tiempo, ayuda, incidencia y evidencia autorizada. Cubrir QR, recarga, renovación, pérdida de conexión, cambio de precio, cancelación, rechazo, entrega y cierre. Incluir alternativas asistidas para usuarios sin teléfono o con dificultades de acceso.')
body('Encuesta: conservar los seis ítems propios del anexo F, declarar escala Likert y analizar cada ítem; no denominarla SUS ni aplicar su puntuación. Falta revisión del instrumento y aplicación. Protección de datos: autorización del establecimiento, consentimiento aplicable, minimización, seudonimización, conservación y responsable antes de recopilar.')
body('Guía operativa: mesasmart-app/DESPLIEGUE_Y_EVIDENCIAS.md. Cada respaldo deberá restaurarse en una base aislada; el archivo por sí solo no acredita recuperación. El equipo debe registrar proveedor, URL HTTPS, fecha, versión y ventana de monitoreo antes de afirmar disponibilidad Cloud. No se desplegaron recursos ni se contrataron servicios en esta corrección.')

doc.add_heading('Anexo M. Control bibliográfico, autoría y entrega',1)
body('Se corrigió Eito Brun y Sicilia Urbán (2020), Gestión de innovación y procesos Software, Editorial Universidad de Alcalá. Se reincorporaron Klouvidaki y Hassan al análisis comparativo. Lin se cita como publicación 2025 de una conferencia BDEIM 2024. El cotejo completo de método, muestra y afirmaciones de Lin y Davitadze sigue pendiente de acceso al texto; no se consideran resultados propios. Toda cifra de antecedentes debe contrastarse con el artículo primario antes de la entrega.')
body('La regla de IA y la asistencia de la rúbrica requieren revisión del equipo; no se infiere autoría por apariencia ni se garantiza nota. Esta corrección recibió apoyo de IA y debe ser revisada, comprendida y declarada según la política docente. La sustentación debe mostrar funciones reales, diferenciar demostración ML de validación operativa y reconocer los compromisos pendientes.')
body('Fuentes de cotejo: https://portalcientifico.uah.es/documentos/61567ac0f4a2be5623443919 ; https://scrumguides.org/scrum-guide.html ; https://doi.org/10.3390/info14070406 ; https://doi.org/10.21511/im.22(1).2026.09 . Los documentos Canvas, Scrum y la presentación originales se conservan como antecedentes; esta memoria registra los ajustes, no acredita que sus archivos hayan sido reeditados.')

# Sequential captions, accessibility, and consistent pagination constraints.
number=0
for p in doc.paragraphs:
    if re.match(r'^Tabla \d+\.',p.text):
        number+=1
        replace_text(p,re.sub(r'^Tabla \d+\.',f'Tabla {number}.',p.text))
        p.paragraph_format.keep_with_next=True
    if p.style.name.startswith('Heading'):
        p.paragraph_format.keep_with_next=True
        for run in p.runs: run.font.color.rgb=RGBColor(0,0,0)
    if p.style.name in ['Title','Subtitle','Caption']:
        for run in p.runs: run.font.color.rgb=RGBColor(0,0,0)
    if p.text=='Resumen ejecutivo': p.paragraph_format.page_break_before=True
for i,shape in enumerate(doc.inline_shapes,1):
    prop=shape._inline.docPr
    prop.set('descr',f'Figura {i} de MesaSmart: diagrama conceptual del proyecto; consultar título y nota de alcance asociados.')
for t in doc.tables:
    props=t._tbl.tblPr
    borders=OxmlElement('w:tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']:
        edge=OxmlElement('w:'+side)
        for key,value in [('val','single'),('sz','4'),('color','D9D9D9')]: edge.set(qn('w:'+key),value)
        borders.append(edge)
    props.append(borders)
    header=t.rows[0]._tr.get_or_add_trPr()
    repeat=OxmlElement('w:tblHeader'); header.append(repeat)
    for c in t.rows[0].cells:
        shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'DCE6F1');c._tc.get_or_add_tcPr().append(shade)
        for p in c.paragraphs:
            p.paragraph_format.keep_with_next=True
            for r in p.runs: r.font.color.rgb=RGBColor(0,0,0);r.bold=True
    for row in t.rows:
        cant_split=OxmlElement('w:cantSplit');row._tr.get_or_add_trPr().append(cant_split)
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.space_after=Pt(3)
                for r in p.runs: r.font.size=Pt(9)

settings=doc.settings.element
update=OxmlElement('w:updateFields'); update.set(qn('w:val'),'true'); settings.append(update)
doc.save(out)
print(out)
