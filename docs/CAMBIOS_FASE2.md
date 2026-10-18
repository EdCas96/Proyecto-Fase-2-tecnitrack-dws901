# Solicitudes de cambio — Fase 2

El Documento Maestro (Fase 1) establece, en sus riesgos, que cualquier ajuste de alcance tras su aprobación se documenta como **solicitud de cambio formal**. Este archivo registra los cambios al modelo de datos introducidos en la Fase 2.

---

## SC-01 — Nueva tabla `ticket_historiales`

| Campo | Detalle |
|---|---|
| **Fecha** | 18/10/2026 |
| **Solicitante** | Eduardo Francisco Castro Ramírez (desarrollador) |
| **Tipo** | Ampliación del modelo de datos |
| **Estado** | Aprobado e implementado (`migrations/20261018000007-crear-ticket-historiales.js`) |

### Situación anterior
El diagrama entidad-relación de la Fase 1 guardaba solo el **estado actual** del ticket (`TICKET.estado`). No había dónde registrar cuándo ni quién hizo cada cambio de estado.

### Cambio
Se agrega la entidad **TicketHistorial** (tabla `ticket_historiales`):

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | INT UNSIGNED, PK | No | Identificador |
| `ticket_id` | INT UNSIGNED, FK → `tickets` (RESTRICT) | No | Ticket afectado |
| `estado_anterior` | ENUM (8 estados) | **Sí** | NULL en el primer registro (creación del ticket) |
| `estado_nuevo` | ENUM (8 estados) | No | Estado al que pasó |
| `usuario_id` | INT UNSIGNED, FK → `usuarios` (RESTRICT) | **Sí** | Quién hizo el cambio; NULL si lo provocó el cliente desde el portal (aprobar/rechazar) |
| `fecha` | DATETIME | No | Momento del cambio (por defecto, la hora actual) |
| `created_at`, `updated_at` | DATETIME | No | Auditoría |

Índices: `(ticket_id, fecha)` para la línea de tiempo y `(estado_nuevo, fecha)` para el reporte.

### Justificación
1. **Lo exige el propio prototipo:** las pantallas de detalle de ticket (admin, técnico y portal del cliente) muestran una línea de tiempo con la fecha de cada estado. Sin esta tabla no habría datos para esa vista.
2. **HU-08 / RF-11 no se pueden cumplir sin ella:** el reporte pide el *tiempo promedio entre "Recibido" y "Entregado"*. `tickets.fecha_ingreso` y `fecha_entrega` dan los extremos, pero solo el historial permite medir tiempos por etapa y confirmar que el ticket realmente recorrió el flujo.
3. **Trazabilidad de RN-04 y RN-06:** queda evidencia de que no se saltaron estados y de quién aprobó o rechazó (el técnico o el cliente).
4. **Auditoría:** si hay un reclamo, se puede reconstruir qué pasó con el equipo y cuándo.

### Impacto
- **Tablas:** +1 tabla; no se modifica ninguna existente.
- **Requerimientos:** RF-04, RF-05, RF-11.
- **Historias:** HU-06, HU-08.
- **Reglas:** RN-04, RN-06.
- **Código:** `TicketService` deberá insertar un registro en la misma transacción en que cambie el estado (al crear el ticket, al cotizar, al aprobar/rechazar y en cada avance).

---

## SC-02 — Formato de folio `TT-AAAA-NNNN`

| Campo | Detalle |
|---|---|
| **Fecha** | 18/10/2026 |
| **Solicitante** | Eduardo Francisco Castro Ramírez (desarrollador) |
| **Tipo** | Cambio en el diccionario de datos |
| **Estado** | Aprobado e implementado (`migrations/20261018000005-crear-tickets.js`, `models/Ticket.js`) |

### Situación anterior
El diccionario de datos de la Fase 1 definía el folio como *"correlativo único autogenerado (ej. TK-0001)"*. Sin embargo, las pantallas del prototipo ya usaban `TT-2026-0042`, así que el documento y el prototipo no coincidían.

### Cambio
El folio pasa a tener el formato **`TT-AAAA-NNNN`**:
- `TT`: prefijo fijo de TecniTrack.
- `AAAA`: año de ingreso del ticket.
- `NNNN`: correlativo de 4 dígitos con ceros a la izquierda, que **reinicia cada año** (TT-2026-0001, TT-2026-0002, …, TT-2027-0001).

Se aplica en tres niveles:
| Nivel | Implementación |
|---|---|
| Base de datos | `VARCHAR(20) NOT NULL`, índice único `uq_tickets_folio`, `CHECK (folio REGEXP '^TT-[0-9]{4}-[0-9]{4,}$')` |
| Modelo | Validación `is: REGEX_FOLIO` (`utils/constantes.js`) con mensaje en español |
| Servicio | `FolioService` (pendiente) generará el siguiente correlativo del año dentro de una transacción |

### Justificación
1. **Unifica documento y prototipo**, que ya mostraba `TT-2026-00xx`.
2. **El año da contexto** al cliente y al taller: se sabe de un vistazo cuándo ingresó el equipo.
3. **Reiniciar por año mantiene los folios cortos**, más fáciles de dictar por teléfono o escribir en el portal del cliente (HU-04).
4. **El prefijo `TT`** identifica el sistema y evita confusiones con otros números (factura, número de serie).
5. El patrón admite más de 4 dígitos (`{4,}`) por si un año supera los 9 999 tickets, sin cambiar el esquema.

### Impacto
- **Tablas:** `tickets.folio` (tipo, índice único y CHECK).
- **Reglas:** RN-03 se redacta con el nuevo formato.
- **Historias:** HU-02 (asignación del folio) y HU-04 (consulta por folio).
- **Datos de ejemplo:** los seeders usan los folios del prototipo (TT-2026-0035 a TT-2026-0042).

---

## Ajustes menores del modelo (sin cambio de alcance)

Decisiones de diseño tomadas al implementar el modelo de la Fase 1. No cambian requerimientos; se registran para la trazabilidad.

| Ajuste | Motivo |
|---|---|
| `equipos.tipo` es ENUM (`Laptop`, `Computadora de escritorio`, `Impresora`, `Otro`) | Son las opciones del formulario del prototipo. |
| `equipos.numero_serie` es opcional pero UNIQUE | Algunos equipos no tienen la serie visible; MySQL admite varios NULL en un índice único. |
| `clientes.correo` es opcional | No todos los clientes tienen correo; la verificación del portal usa el teléfono. |
| `cotizacion_items.precio_unitario` se guarda aparte del `precio_referencia` del catálogo | Un cambio de precio en el catálogo no debe alterar cotizaciones ya emitidas, y el técnico puede ajustar el precio (ej. descuento). |
| Columna generada `cotizaciones.pendiente_ticket_id` + índice único | Garantiza RN-09 (una sola cotización Pendiente por ticket) directamente en la base de datos. |
| Todas las tablas tienen `created_at` y `updated_at` | Auditoría básica uniforme. |
