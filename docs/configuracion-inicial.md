# Configuración inicial del equipo

Esta guía asume que ya aplicaste el esquema y las migraciones, y que puedes
ingresar al panel con un usuario `ADMIN`. Ver
[`supabase-desde-cero.md`](supabase-desde-cero.md) y
[`primer-admin.md`](primer-admin.md).

El orden recomendado es: identidad → categorías → puntuación → corredores →
carreras y resultados → contenido → miembros y finanzas.

> Todo el contenido público se carga desde el panel. La aplicación no incluye
> corredores, resultados, noticias ni contactos de demostración. Si una sección
> está vacía, muestra un estado vacío honesto.

## 1. Identidad del equipo

Ve a **Admin → Configuración**, pestaña **Identidad**.

Completa:

- **Nombre completo** y **nombre corto**.
- **Lema** y **descripción breve**.
- **Año de fundación**.
- **Logo**: PNG o WEBP con fondo transparente, formato cuadrado.
- **Imagen de portada**: fotografía horizontal.
- **Colores**: principal, secundario y acento en formato `#RRGGBB`.

Puedes elegir una de las paletas sugeridas o definir colores propios. El tema
del sitio público se deriva de esos tres valores. La vista previa muestra el
resultado antes de guardar.

Pulsa **Guardar configuración**. El sitio público se actualiza sin reiniciar la
aplicación.

### Imágenes

Las imágenes se validan y optimizan en el navegador antes de subirse:

- formatos: JPG, PNG o WEBP;
- máximo de entrada: 8 MB;
- se redimensionan y convierten a WEBP cuando conviene;
- el logo y la portada se guardan en el bucket público `banners`.

No subas imágenes con datos personales o documentos. Para comprobantes existe el
bucket privado `documents`.

## 2. Contacto y redes

En **Configuración → Contacto y redes**:

- **Correo de contacto** y correo general.
- **WhatsApp** con código de país (por ejemplo `+591 70000000`).
- **Mensaje predeterminado** de WhatsApp.
- **Dirección**.
- **Facebook, Instagram, TikTok y YouTube** con URLs completas.
- Textos y correos para **auspiciadores** y **nuevos integrantes**.

Los campos vacíos no se muestran en el sitio. El botón de contacto usa un enlace
`mailto:` y el de WhatsApp un enlace `wa.me`; no hay un formulario falso ni un
endpoint que descarte mensajes.

Usa datos reales. Si todavía no tienes un correo o una red social, déjalo vacío en
lugar de inventarlo.

## 3. Historia y misión

En **Configuración → Historia y misión** puedes cargar:

- historia del equipo;
- misión;
- objetivos;
- actividades;
- logros.

Estos textos alimentan la página pública **Equipo**. Si un campo queda vacío, la
sección correspondiente no se muestra.

## 4. Categorías

Ve a **Admin → Categorías**.

Para cada categoría define:

- nombre;
- slug (identificador para la URL);
- descripción;
- orden de presentación;
- estado activo.

El seed opcional crea: Élite, Sub-23, Junior, Máster A, Máster B y Principiantes.
Ajústalas a la estructura real del equipo.

Recomendaciones:

- Usa una categoría por grupo competitivo real.
- No elimines una categoría con corredores o resultados asociados; desactívala.
- Mantén los slugs estables: cambiarlos rompe enlaces públicos.

## 5. Puntuación del ranking

Ve a **Admin → Puntuación**.

Define cuántos puntos otorga cada posición. La tabla parte de 20 posiciones y
puedes ampliarla si tu competencia lo necesita.

Reglas del sistema:

- Solo los resultados con estado `FINISHED` y posición válida suman puntos.
- `DNF`, `DSQ`, `DNS` y resultados anulados suman cero.
- Las posiciones compartidas están permitidas.
- Al guardar la puntuación, el servidor recalcula los puntos de los resultados
  existentes.
- El ranking público se calcula en el momento desde los resultados; no existe una
  tabla de posiciones que pueda quedar desactualizada.

Define la puntuación **antes** de cargar una temporada completa. Si la cambias
después, los resultados históricos también se recalculan: es útil para corregir
un error, pero cambia el ranking de todas las fechas.

## 6. Corredores

Ve a **Admin → Corredores**.

Datos útiles:

- nombre completo y slug;
- categoría;
- especialidad;
- número de competencia;
- foto;
- fecha de ingreso al equipo;
- corredor destacado;
- estado activo.

La **fecha de nacimiento** y las **notas privadas** son datos internos. No se
exponen al público: la vista `v_public_cyclists` excluye la fecha de nacimiento y
la API anónima solo recibe columnas públicas.

Solo los corredores activos aparecen en el sitio público y en el ranking. Para
dar de baja a alguien sin borrar su historial, desactívalo.

## 7. Carreras

Ve a **Admin → Carreras**.

Cada carrera tiene:

- nombre y slug;
- fecha;
- lugar, ciudad y departamento;
- organizador y tipo de carrera;
- temporada;
- estado: `PLANIFICADA`, `ABIERTA`, `FINALIZADA` o `CANCELADA`;
- fecha límite y enlace de inscripción (opcionales);
- imagen y descripción.

Una carrera cancelada no suma puntos al ranking. Una carrera finalizada es la que
ya tiene resultados cargados.

Las inscripciones (`race_registrations`) son opcionales; sirven para llevar el
seguimiento interno de quién participará.

## 8. Resultados

Ve a **Admin → Resultados**.

1. Selecciona la carrera.
2. Selecciona el corredor y su categoría.
3. Indica posición y estado.
4. Guarda.

El servidor asigna los puntos según la tabla de puntuación. No los escribas a
mano.

- Para un abandono usa `DNF`; una descalificación, `DSQ`; una no largada, `DNS`.
- Para corregir un resultado, edítalo.
- Para retirarlo del ranking sin borrar el historial, usa **Anular** e indica el
  motivo. Un resultado anulado queda registrado.
- Se permiten posiciones compartidas (empates).

Después de cargar resultados, revisa **Ranking** en el sitio público.

## 9. Contenido

### Noticias

**Admin → Noticias**. Estados:

- **Borrador privado**: solo visible en el panel.
- **Publicada**: visible en el sitio si la fecha de publicación ya pasó.
- **Oculta**: se conserva pero no se muestra.

Cada noticia puede tener portada, resumen, contenido y fecha de publicación. Usa
imágenes reales del equipo o de la carrera.

### Galería

**Admin → Galería**. Sube fotografías, escribe un texto alternativo descriptivo y
decide si se publican. Puedes asociarlas a una carrera o a un corredor.

El texto alternativo no es decorativo: mejora la accesibilidad y el
posicionamiento. Evita “foto 1”; describe lo que se ve.

### Banners

**Admin → Banners**. Cada banner tiene imagen, título, subtítulo, texto de botón,
URL, orden, estado activo y ventana de programación (`starts_at` / `ends_at`).

- Desactiva un banner para ocultarlo sin borrarlo.
- Usa el orden para definir cuál aparece primero.
- Si programas fechas, revisa la zona horaria del navegador y del equipo.

### Auspiciadores

**Admin → Auspiciadores**. Carga nombre, logo, sitio web, nivel y orden. Los
auspiciadores inactivos no se muestran.

No publiques logos de marcas sin autorización.

## 10. Miembros y membresías

### Miembros

**Admin → Miembros**. Registra:

- nombre completo, CI, teléfono y correo (datos internos);
- tipo de miembro;
- fecha de ingreso y, si corresponde, fecha de baja;
- cuota mensual en bolivianos;
- exención de cuota;
- estado: activo, inactivo o suspendido.

Desactivar un miembro conserva su historial y sus deudas. No lo elimines para
“limpiar” la lista.

### Generar cuotas

**Admin → Membresías → Generar cuotas**.

Selecciona mes y año. La operación:

- crea una obligación por cada miembro activo, no exento, con cuota mayor a cero
  y con ingreso anterior al vencimiento;
- usa como vencimiento el último día del mes;
- es idempotente: si la cuota ya existe, no la duplica.

Después puedes ajustar el monto esperado, la fecha de vencimiento o marcar una
cuota como exenta. Esas modificaciones pasan por una función validada y quedan en
auditoría.

### Registrar pagos

Cada obligación admite **pagos parciales**. El estado se deriva de lo pagado:

- `PENDIENTE`: sin pagos;
- `PARCIAL`: pagó una parte;
- `PAGADO`: cubrió el total;
- `VENCIDO`: pasó la fecha y queda saldo;
- `EXENTA`: no corresponde cobro;
- `ANULADA`: la obligación se anuló con motivo.

Un pago genera un ingreso en caja dentro de la misma transacción. Si te
equivocas, **revierte el pago**; no borres filas.

No se puede anular una obligación con pagos confirmados: primero revierte los
pagos.

## 11. Finanzas

### Saldo inicial

**Admin → Caja y gastos → Saldo inicial**.

Solo un `ADMIN` puede registrarlo. Se registra una vez y se informa por separado
de los ingresos operativos. Si necesitas corregirlo, revierte el saldo inicial con
un motivo y registra el nuevo.

El saldo inicial no debe usarse para “cuadrar” diferencias. Si falta dinero,
registra el gasto o ingreso real con su comprobante.

### Ingresos y aportes

**Admin → Aportes e ingresos**. Tipos disponibles:

- aporte extraordinario;
- auspicio;
- donación;
- otro ingreso.

Cada ingreso genera un movimiento de caja confirmado. Indica concepto, fecha,
monto, método y referencia cuando corresponda.

### Gastos

**Admin → Caja y gastos**. Registra:

- fecha y concepto;
- categoría (inscripciones, transporte, combustible, alimentación, hospedaje,
  mecánica, equipamiento, logística, otros);
- monto;
- carrera asociada, si aplica;
- beneficiario y método de pago;
- comprobante (imagen o PDF, opcional pero recomendado).

El comprobante se guarda en el bucket privado `documents` y se abre con un enlace
firmado temporal. No se publica.

### Reversos

Los movimientos no se eliminan. Para corregir:

1. Abre el movimiento.
2. Elige **Revertir** o **Anular**.
3. Escribe el motivo.

El movimiento original queda anulado y la auditoría conserva quién, cuándo y por
qué. Los reportes dejan de contarlo.

### Permisos financieros

- `ADMIN` y `TESORERIA`: registrar, editar por RPC, revertir y exportar.
- `DIRECTIVA`: consultar y exportar, sin modificar.
- `EDITOR` y `CONSULTA`: sin acceso a finanzas.

La interfaz oculta acciones, pero la protección real está en RLS y en las RPC
`SECURITY DEFINER`.

## 12. Reportes

**Admin → Reportes** incluye:

- **Caja**: ingresos, egresos, neto y saldo inicial separado.
- **Membresías**: esperado, cobrado y pendiente por período.
- **Carreras**: ingresos y gastos por carrera.

Puedes imprimir o exportar cada sección a CSV. Los reportes respetan los permisos
del usuario: `DIRECTIVA` puede verlos y exportarlos, pero no modificarlos.

## 13. Usuarios y auditoría

### Usuarios

**Admin → Usuarios y roles** permite asignar roles a perfiles existentes. No crea
credenciales: las cuentas se crean en Supabase Auth.

- No puedes cambiar tu propio rol desde esta pantalla.
- La base impide quitarle el rol al último `ADMIN`.
- Cada cambio de rol queda auditado.

### Auditoría

**Admin → Auditoría** muestra las operaciones registradas: altas, cambios,
pagos, reversos, cambios de rol y anulaciones. Puedes filtrar y exportar.

La auditoría es de solo lectura. No se edita ni se borra desde el panel.

## 14. Checklist antes de publicar

- [ ] Identidad, logo, portada y colores guardados.
- [ ] Contacto y redes reales (o vacíos, sin inventar).
- [ ] Categorías alineadas al equipo.
- [ ] Puntuación definida.
- [ ] Corredores activos con foto y categoría.
- [ ] Carreras y resultados de la temporada cargados.
- [ ] Noticias y galería publicadas.
- [ ] Auspiciadores con autorización para usar su marca.
- [ ] Miembros y cuotas del período generadas.
- [ ] Saldo inicial registrado por un `ADMIN`.
- [ ] Reportes revisados.
- [ ] Sitio público probado en incógnito.
- [ ] Panel probado con cada rol.

## 15. Buenas prácticas de datos

- No inventes resultados, fechas, contactos ni montos.
- No borres historial: desactiva, anula o revierte.
- Usa comprobantes reales y nombres de archivo sin datos sensibles.
- Revisa la auditoría después de una carga masiva.
- Haz copias de seguridad antes de cambios grandes.
- Mantén una sola cuenta por persona.
