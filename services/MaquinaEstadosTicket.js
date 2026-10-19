const { BusinessRuleError } = require('../utils/errors');
const { ETIQUETA_ESTADO } = require('../utils/constantes');

/**
 * Quién o qué provoca un cambio de estado:
 * - manual:      el técnico (o el admin) desde el detalle del ticket.
 * - cotizacion:  al crear una cotización (paso 7, RN-06).
 * - cliente:     el cliente aprueba o rechaza la cotización en el portal (paso 7, RN-06).
 * - cancelacion: el admin cancela el ticket con un motivo.
 */
const ORIGENES = Object.freeze({
  MANUAL: 'manual',
  COTIZACION: 'cotizacion',
  CLIENTE: 'cliente',
  CANCELACION: 'cancelacion',
});

/** Estados del flujo principal en orden (para el stepper del detalle). */
const FLUJO = Object.freeze([
  'Recibido',
  'Diagnosticado',
  'Esperando_aprobacion',
  'En_reparacion',
  'Esperando_repuesto',
  'Listo',
  'Entregado',
]);

const FINALES = Object.freeze(['Entregado', 'Cancelado']);

/** Transiciones del flujo (RN-04) y qué las provoca. La cancelación del admin se trata aparte. */
const TRANSICIONES = Object.freeze([
  { de: 'Recibido', a: 'Diagnosticado', origen: ORIGENES.MANUAL },
  { de: 'Diagnosticado', a: 'Esperando_aprobacion', origen: ORIGENES.COTIZACION },
  { de: 'Esperando_aprobacion', a: 'En_reparacion', origen: ORIGENES.CLIENTE },
  { de: 'Esperando_aprobacion', a: 'Cancelado', origen: ORIGENES.CLIENTE },
  { de: 'En_reparacion', a: 'Esperando_repuesto', origen: ORIGENES.MANUAL },
  { de: 'Esperando_repuesto', a: 'En_reparacion', origen: ORIGENES.MANUAL },
  { de: 'En_reparacion', a: 'Listo', origen: ORIGENES.MANUAL },
  { de: 'Listo', a: 'Entregado', origen: ORIGENES.MANUAL },
]);

const nombre = (estado) => `«${ETIQUETA_ESTADO[estado] || estado}»`;

/**
 * Define las transiciones válidas entre estados del ticket.
 *
 *   Recibido -> Diagnosticado -> Esperando_aprobacion -> En_reparacion <-> Esperando_repuesto -> Listo -> Entregado
 *   Cancelado: desde Esperando_aprobacion (rechazo del cliente) o por el admin desde cualquier estado antes de Entregado.
 *
 * RN-01 (cotización aprobada para entrar a En_reparacion) necesita la base de
 * datos, así que la verifica TicketService; aquí solo se indica qué destinos la exigen.
 *
 * @implements RN-04, HU-06
 */
class MaquinaEstadosTicket {
  /**
   * @param {string} origen Estado actual.
   * @param {string} destino Estado al que se quiere pasar.
   * @param {{origen?: string, rol?: string}} [contexto] origen del cambio (ORIGENES) y rol de quien lo hace.
   * @returns {boolean}
   */
  static puedeTransicionar(origen, destino, contexto = {}) {
    return MaquinaEstadosTicket.motivoRechazo(origen, destino, contexto) === null;
  }

  /**
   * Lanza BusinessRuleError (422) con un mensaje claro si la transición no es válida.
   * @param {string} origen
   * @param {string} destino
   * @param {{origen?: string, rol?: string}} [contexto]
   * @throws {BusinessRuleError}
   */
  static validarTransicion(origen, destino, contexto = {}) {
    const motivo = MaquinaEstadosTicket.motivoRechazo(origen, destino, contexto);
    if (motivo) throw new BusinessRuleError(motivo);
  }

  /**
   * Explica por qué no se permite una transición; null si sí se permite.
   * @returns {string|null}
   */
  static motivoRechazo(origen, destino, { origen: via = ORIGENES.MANUAL, rol } = {}) {
    if (![...FLUJO, 'Cancelado'].includes(destino)) return `El estado ${nombre(destino)} no existe.`;
    if (origen === destino) return `El ticket ya está en ${nombre(destino)}.`;
    if (FINALES.includes(origen)) return `El ticket está ${nombre(origen)} y ya no puede cambiar de estado.`;

    // Cancelación del admin: desde cualquier estado que no sea final
    if (destino === 'Cancelado' && via !== ORIGENES.CLIENTE) {
      if (via !== ORIGENES.CANCELACION || rol !== 'admin') return 'Solo el administrador puede cancelar un ticket.';
      return null;
    }

    const transicion = TRANSICIONES.find((t) => t.de === origen && t.a === destino);
    if (!transicion) {
      const siguientes = MaquinaEstadosTicket.siguientes(origen).map(nombre);
      const sugerencia = siguientes.length ? ` Desde ${nombre(origen)} solo se puede pasar a ${siguientes.join(' o ')}.` : '';
      return `No se puede pasar de ${nombre(origen)} a ${nombre(destino)} sin seguir el flujo.${sugerencia}`;
    }
    if (transicion.origen === via) return null;

    // La transición existe en el flujo, pero no se hace a mano
    if (transicion.origen === ORIGENES.COTIZACION) {
      return `El ticket pasa a ${nombre(destino)} automáticamente al crear una cotización.`;
    }
    if (transicion.origen === ORIGENES.CLIENTE) {
      return `Solo el cliente puede sacar el ticket de ${nombre(origen)}, al aprobar o rechazar la cotización desde el portal.`;
    }
    return `El paso de ${nombre(origen)} a ${nombre(destino)} se hace desde el detalle del ticket.`;
  }

  /** Estados a los que se llega desde "origen" por el flujo (sin la cancelación del admin). */
  static siguientes(origen) {
    return TRANSICIONES.filter((t) => t.de === origen).map((t) => t.a);
  }

  /** Destinos que se pueden elegir a mano desde el detalle (botones habilitados). */
  static transicionesManuales(origen) {
    return TRANSICIONES.filter((t) => t.de === origen && t.origen === ORIGENES.MANUAL).map((t) => t.a);
  }

  /** El admin puede cancelar mientras el ticket no esté Entregado ni Cancelado. */
  static puedeCancelar(origen, rol) {
    return MaquinaEstadosTicket.puedeTransicionar(origen, 'Cancelado', { origen: ORIGENES.CANCELACION, rol });
  }

  /** RN-01: entrar a En_reparacion exige una cotización Aprobada. */
  static requiereCotizacionAprobada(destino) {
    return destino === 'En_reparacion';
  }

  static esFinal(estado) {
    return FINALES.includes(estado);
  }
}

MaquinaEstadosTicket.ORIGENES = ORIGENES;
MaquinaEstadosTicket.FLUJO = FLUJO;
MaquinaEstadosTicket.TRANSICIONES = TRANSICIONES;

module.exports = MaquinaEstadosTicket;
