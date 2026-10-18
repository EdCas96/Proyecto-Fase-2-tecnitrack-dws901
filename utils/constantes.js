/**
 * Valores de dominio compartidos por modelos, servicios y vistas.
 * (Las migraciones guardan su propia copia para reflejar el esquema tal como era al crearse.)
 */

const ROLES = Object.freeze(['admin', 'tecnico']);

/** Estados del ticket en el orden del flujo (RN-04). */
const ESTADOS_TICKET = Object.freeze([
  'Recibido',
  'Diagnosticado',
  'Esperando_aprobacion',
  'En_reparacion',
  'Esperando_repuesto',
  'Listo',
  'Entregado',
  'Cancelado',
]);

const ESTADOS_COTIZACION = Object.freeze(['Pendiente', 'Aprobada', 'Rechazada']);

const TIPOS_CATALOGO = Object.freeze(['Servicio', 'Repuesto']);

const TIPOS_EQUIPO = Object.freeze(['Laptop', 'Computadora de escritorio', 'Impresora', 'Otro']);

/** RN-03: TT-AAAA-NNNN (el correlativo puede crecer más allá de 4 dígitos). */
const REGEX_FOLIO = /^TT-\d{4}-\d{4,}$/;

/** Dígitos con guiones, espacios, paréntesis o "+" opcionales; ej. 7123-4567 o +503 7123 4567. */
const REGEX_TELEFONO = /^\+?[0-9\s()-]{8,20}$/;

module.exports = {
  ROLES,
  ESTADOS_TICKET,
  ESTADOS_COTIZACION,
  TIPOS_CATALOGO,
  TIPOS_EQUIPO,
  REGEX_FOLIO,
  REGEX_TELEFONO,
};
