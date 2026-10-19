/**
 * Valores de dominio compartidos por modelos, servicios y vistas.
 * (Las migraciones guardan su propia copia para reflejar el esquema tal como era al crearse.)
 */

const ROLES = Object.freeze(['admin', 'tecnico']);

/** Página a la que entra cada rol al iniciar sesión. */
const INICIO_POR_ROL = Object.freeze({ admin: '/admin', tecnico: '/tecnico' });

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

/**
 * Color semántico de cada estado (clase CSS badge-<color>):
 * gris = recibido, azul = en proceso, ámbar = esperando algo, verde = listo/entregado, rojo = cancelado.
 * Incluye los estados de cotización.
 */
const COLOR_ESTADO = Object.freeze({
  Recibido: 'gris',
  Diagnosticado: 'azul',
  Esperando_aprobacion: 'ambar',
  En_reparacion: 'azul',
  Esperando_repuesto: 'ambar',
  Listo: 'verde',
  Entregado: 'verde',
  Cancelado: 'rojo',
  Pendiente: 'ambar',
  Aprobada: 'verde',
  Rechazada: 'rojo',
});

/** Texto para mostrar de los estados que en la base llevan guion bajo. */
const ETIQUETA_ESTADO = Object.freeze({
  Esperando_aprobacion: 'Esperando aprobación',
  En_reparacion: 'En reparación',
  Esperando_repuesto: 'Esperando repuesto',
});

/**
 * Tipos de notificación (SC-06). Las migraciones guardan su propia copia.
 * cotizacion_respondida: el cliente aprobó o rechazó (alerta del dashboard del técnico, HU-10).
 */
const TIPOS_NOTIFICACION = Object.freeze(['cotizacion_respondida', 'ticket_asignado', 'ticket_cancelado', 'ticket_estado']);

const TIPOS_CATALOGO = Object.freeze(['Servicio', 'Repuesto']);

const TIPOS_EQUIPO = Object.freeze(['Laptop', 'Computadora de escritorio', 'Impresora', 'Otro']);

/** RN-03: TT-AAAA-NNNN (el correlativo puede crecer más allá de 4 dígitos). */
const REGEX_FOLIO = /^TT-\d{4}-\d{4,}$/;

/**
 * Validación del modelo: dígitos con guiones, espacios, paréntesis o "+" opcionales.
 * Los formularios usan la regla más estricta REGEX_TELEFONO_SV.
 */
const REGEX_TELEFONO = /^\+?[0-9\s()-]{8,20}$/;

/** Teléfono de El Salvador en formularios: 8 dígitos, con guion opcional (7123-4567 o 71234567). */
const REGEX_TELEFONO_SV = /^\d{4}-?\d{4}$/;

module.exports = {
  ROLES,
  INICIO_POR_ROL,
  ESTADOS_TICKET,
  ESTADOS_COTIZACION,
  TIPOS_NOTIFICACION,
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  TIPOS_CATALOGO,
  TIPOS_EQUIPO,
  REGEX_FOLIO,
  REGEX_TELEFONO,
  REGEX_TELEFONO_SV,
};
