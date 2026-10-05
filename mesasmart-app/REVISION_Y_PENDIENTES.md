# MesaSmart: revision tecnica y ruta de cierre

Fecha local: 27 de septiembre de 2026 (America/Lima).
Estado: MVP local con PostgreSQL; no es una certificacion de seguridad ni una validacion del piloto.

## 1. Alcance y criterio

Se revisaron los modulos de autenticacion, sesiones QR, pedidos, cocina, atencion, administracion, catalogo, personal, migraciones, configuracion e instrucciones de instalacion. Se contrasto la implementacion con el documento Proyecto_MesaSmart_Completo_PreImplementacion.docx, especialmente el alcance del MVP, los estados, la seguridad, las estimaciones y la validacion planificada.

Esta entrega modifica el software y su documentacion tecnica. No reescribe ni certifica las referencias, cifras o contenido de todos los Word, PDF y PowerPoint historicos. El documento academico original permanece intacto. La conciliacion final entre todas sus versiones, el silabo y la rubrica requiere una pasada editorial separada usando el estado real descrito aqui.

## 2. Hallazgos corregidos

| Prioridad | Hallazgo | Correccion y evidencia principal |
| --- | --- | --- |
| Alta | El detalle de un pedido carecia de control suficiente de acceso | Exige personal autorizado o sesion vigente de la mesa propietaria; pruebas de acceso anonimo y otra mesa |
| Alta | Cookies antiguas podian seguir vigentes tras cambios de acceso | Validacion contra usuario activo y version de sesion; cambios de rol, clave o estado y logout revocan sesiones |
| Alta | Consultas y mutaciones no estaban delimitadas consistentemente al restaurante | Filtrado por RESTAURANT_SLUG y autorizacion del destino; pruebas con restaurante ajeno |
| Alta | QR firmados sin revocacion persistida ni validacion completa de mesa | Sesion almacenada por hash, mesa activa, caducidad y regeneracion revocable |
| Alta | Secretos debiles o valores por defecto | Secretos obligatorios de al menos 32 caracteres; se sustituyo el secreto QR local insuficiente |
| Alta | Reintentos de envio podian duplicar pedidos | Clave UUID de idempotencia, huella del contenido y bloqueo transaccional; concurrencia probada |
| Alta | Transiciones concurrentes podian duplicar cambios o eventos | Bloqueo de fila, reglas de transicion, permisos por rol y evento con actor |
| Media | Faltaban entrega y cierre operativos | Pantalla /atencion para WAITER y ADMIN; marcas temporales de entrega y cierre |
| Media | Seguimiento y panel mostraban datos de ejemplo o indicadores sin medicion | Seguimiento consultado al servidor; indicadores reales y ausencia de valor cuando no hay evidencia |
| Media | Faltaban campos editables de productos | Alta y edicion de nombre, descripcion, categoria, imagen HTTPS, precio, minutos y disponibilidad |
| Media | Restablecimiento de clave mediante entrada visible y pobre manejo de errores | Formulario de clave enmascarada; errores de red visibles y bloqueo de botones durante operaciones |
| Media | Entradas invalidas y acceso automatizado insuficientemente controlados | Validaciones de cantidades, lineas, claves, JSON y motivos; limite persistido de intentos de login |
| Media | Solicitudes de otros origenes y exposicion del token por referencia | Control de origen en mutaciones y cabeceras de seguridad; Referrer-Policy no-referrer |
| Media | Instrucciones desactualizadas | README, ejemplo de variables y guia pgAdmin actualizados a siete migraciones y comandos npm/node |

La correccion de estos hallazgos reduce riesgos concretos; no demuestra ausencia de otros defectos.

## 3. Evidencias y limites de prueba

| Verificacion | Resultado |
| --- | --- |
| npm run lint | Correcto, sin errores |
| npm run build | Correcto, compilacion y TypeScript; se requirio permiso para crear procesos fuera del aislamiento |
| npm run test:integration | 73 comprobaciones aprobadas contra PostgreSQL y el servidor local |
| Persistencia inicial tras limpieza | 1 restaurante, 12 mesas, 8 productos y 7 migraciones |
| Auditoria de dependencias realizada durante la revision | 0 vulnerabilidades conocidas reportadas; resultado puntual, no garantia futura |
| Inspeccion visual previa | Administracion y catalogo; formulario de producto en movil sin desbordamiento horizontal observado |
| Inspeccion responsive adicional | Flujo movil emulado a 390 x 844: login, carta, carrito, pedido, seguimiento, cocina y rechazo motivado sin desbordamiento observado |
| Salud y carga exploratoria | Health 200; 50 lecturas, concurrencia 5, 50 HTTP 200, p95 591 ms; no representa capacidad productiva |

La evidencia automatizada esta en [qa/integration-results.json](qa/integration-results.json). El instante del archivo es UTC; por eso puede aparecer el dia 28 mientras la fecha local es el 27. La captura disponible es [qa/producto-movil.png](qa/producto-movil.png).

La suite cubre accesos anonimos, roles, aislamiento entre restaurantes, cambios de personal, revocacion de cookies, token de otra mesa/manipulado/vencido, entradas invalidas, reintento concurrente, precios calculados por servidor, reconfirmacion de cambios de precio, saltos de estado, historial, indicadores, disponibilidad, cancelacion motivada, continuidad del seguimiento tras renovar QR y limitacion del login. No sustituye pruebas de penetracion, accesibilidad ni aceptacion en un restaurante.

Se eliminaron los usuarios, mesas, productos y pedidos temporales creados por las pruebas mediante sus identificadores. No se reiniciaron secuencias ni se borraron registros del usuario. El enlace de la mesa M97 usado para inspeccion visual ya no es valido: pertenecia a una mesa temporal eliminada.

## 4. Concordancia entre propuesta y sistema

| Parte de la propuesta | Estado comprobado | Brecha que debe constar en la entrega |
| --- | --- | --- |
| Carta y pedidos por QR | Implementado con PostgreSQL | Probar escaneo real en varios telefonos y red del local |
| Seguimiento del pedido | API y consulta periodica implementadas | Completar aceptacion visual de extremo a extremo en movil |
| Cocina | Confirmado, En preparacion, Listo y rechazo motivado | Validar el manejo de incidencias con el personal real |
| Entrega y cierre | Implementados para atencion | Cerrado no acredita pago: no hay pasarela ni comprobante fiscal |
| Registrado a Confirmado | Confirmacion automatica del pedido aceptado por servidor | El documento debe describir esta simplificacion o se debe implementar confirmacion manual |
| Cancelacion y rechazo | Pantallas, reglas, API y motivo visible implementados | Confirmar la politica de negocio con el restaurante |
| Estimacion de espera | Valor inicial basado en configuracion | No hay modelo entrenado ni mejora predictiva demostrada |
| Indicadores | Conteos y tiempos observados disponibles | No inferir satisfaccion, disponibilidad o impacto a partir de datos ficticios |
| Seguridad por roles | ADMIN, KITCHEN y WAITER; sesiones revocables | Falta endurecimiento y prueba independiente para produccion |
| Canvas | Insumo documental de negocio | Validar segmentos, costos, ingresos y supuestos mediante evidencia |
| Scrum | Insumo metodologico | Registrar backlog ejecutado, revisiones, retrospectivas y aceptacion reales |
| Cloud y continuidad | Pendiente de despliegue | Faltan TLS, monitoreo, respaldo restaurado y evidencia de operacion |
| Piloto e impacto | Planificados, no ejecutados en esta revision | Medir linea base y resultados; no presentarlos como logrados |

## 5. Ruta priorizada de trabajo restante

### Etapa 1. Cerrar el flujo funcional antes del piloto

1. Definir con el restaurante si los pedidos requieren confirmacion manual. Aceptacion: documento, estados persistidos y pantallas describen el mismo proceso.
2. Validar con personal real la cancelacion/rechazo, reconfirmacion de precios y politica de renovacion QR ya implementadas; conservar evidencia y observaciones.
5. Completar gestion de mesas segun alcance acordado: alta, edicion, capacidad y baja segura; evitar desactivar una mesa con pedidos activos sin una politica explicita.
6. Completar tratamiento uniforme de errores de base de datos en todas las APIs administrativas y pruebas de desconexion. Evitar indicadores vacios que se interpreten como ausencia real de pedidos.
7. Completar seguridad de uso: cambio obligatorio de clave temporal, cambio de clave propio y recuperacion controlada; no enviar claves por canales inseguros.
8. Ejecutar prueba manual en dos telefonos y tres roles: QR, carrito, envio, cocina, entrega, cierre, revocacion y reconexion. Conservar evidencia y resultado observado, no solo capturas de pantallas vacias.

### Etapa 2. Preparar operacion real

1. Desplegar en el entorno elegido con HTTPS, base separada de pruebas y secretos administrados. APP_URL debe ser accesible desde los dispositivos; localhost no sirve al telefono de un cliente.
2. Configurar copias de seguridad y probar restauracion en otra base. Registrar periodicidad, responsable, RPO y RTO propuestos y medidos.
3. Agregar monitoreo de errores, salud y tiempos de respuesta; redactar procedimiento de caida y continuidad de atencion manual.
4. Probar concurrencia y carga con volumen representativo; revisar indices, paginacion e historial creciente antes de prometer escalabilidad.
5. Integrar lint, build y pruebas a CI con PostgreSQL aislado. Ampliar cobertura a creacion de catalogo/personal, fallos parciales, accesibilidad y navegadores.
6. Revisar limitacion de peticiones mas alla del nombre de usuario, cabeceras para el despliegue, gestion de sesiones y proteccion de datos; realizar revision independiente si se usara con clientes reales.
7. Completar accesibilidad: foco y teclado en dialogos, nombres de controles, mensajes anunciados y contraste. Sustituir imagenes ilustrativas por fotografias autorizadas de la carta real.

### Etapa 3. Ejecutar la validacion academica

1. Conciliar el documento final con este inventario. Preservar el planteamiento y los objetivos del primer avance; justificar expresamente cualquier cambio de alcance.
2. Preparar instrumentos del piloto descrito: 120 pedidos de linea base y 120 con sistema, 30-50 comensales y 6-12 colaboradores, sujetos a viabilidad y aprobacion docente. Estas cantidades son el plan, no una muestra ya obtenida.
3. Definir inicio/fin de cada tiempo, tratamiento de cancelaciones, errores, valores faltantes y condiciones comparables. Reportar limitaciones y variabilidad, no solo promedios.
4. Medir satisfaccion y errores mediante instrumentos documentados. Separar datos de prueba, datos del piloto y simulaciones.
5. Si se mantiene el componente IA, construir un conjunto de datos util, separar entrenamiento y evaluacion temporalmente, comparar contra una linea base y calcular el error. No afirmar una mejora del 10% ni otra meta sin evidencia.
6. Validar el Canvas con entrevistas y costos sustentados; vincular Scrum a tareas y entregables realmente completados, responsables y criterios de aceptacion.
7. Actualizar referencias, conclusiones, limitaciones, anexos, figuras y tablas conforme a la rubrica. Preparar una demostracion y preguntas de sustentacion basadas en decisiones reales del proyecto.
8. Respetar la regla de uso de IA de la rubrica: la redaccion asistida no sustituye el analisis, la autoria y la verificacion del equipo. Declarar su uso conforme a lo solicitado por el docente.

### Fuera del MVP salvo cambio formal de alcance

Pasarela de pago, facturacion fiscal/SUNAT, division de cuenta, recomendaciones avanzadas y operacion multi-restaurante completa. El aislamiento de datos implementado no constituye una plataforma SaaS multiempresa terminada.

## 6. Prueba manual de aceptacion pendiente

| Paso | Resultado esperado | Estado |
| --- | --- | --- |
| Generar QR con ADMIN y escanear desde telefono | Carta de la mesa correcta sin acceso administrativo | Pendiente en dispositivo real |
| Agregar, editar cantidades y enviar | Un solo pedido con detalle y total correctos | API probada; completar recorrido visual |
| Repetir envio por doble pulsacion o red inestable | Sin duplicados y con respuesta comprensible | Concurrencia API probada; falta prueba UX |
| Avanzar con KITCHEN | Solo preparacion y listo; cliente actualizado | API probada; falta aceptacion simultanea en pantallas |
| Entregar y cerrar con WAITER | Tiempos y eventos persistidos; sale de pendientes | API probada; falta aceptacion del personal |
| Perder conexion y recuperarla | Error visible, sin pedido duplicado ni falsa confirmacion | Pendiente manual |
| Cambiar precio con carrito abierto | Nueva confirmacion si cambia el importe | Implementado y probado en API; UX pendiente de aceptacion manual |
| Rotar QR durante pedido | Seguimiento previo continua; no admite pedidos nuevos | Implementado y probado en API; UX pendiente de aceptacion manual |

## 7. Como retomar

Abrir http://localhost:3000/login con una cuenta propia y generar un QR nuevo en /admin/mesas. Los QR anteriores a la rotacion del secreto quedan invalidados. No utilizar el enlace temporal M97.

Prioridad inmediata recomendada: validar con el restaurante la confirmacion, las excepciones y el ciclo de QR ya implementado, y completar el recorrido manual antes de iniciar el piloto. No presentar el sistema como terminado para produccion mientras esas aceptaciones y las evidencias de operacion sigan pendientes.
