const { EventEmitter } = require('events');

/**
 * Nombres de los eventos del dominio. Los servicios los emiten cuando algo
 * importante ya quedó guardado; los listeners (ej. NotificacionListener)
 * reaccionan sin que el servicio tenga que conocerlos.
 */
const EVENTOS = Object.freeze({
  COTIZACION_CREADA: 'cotizacion.creada',
  COTIZACION_RESPONDIDA: 'cotizacion.respondida',
  TICKET_ESTADO_CAMBIADO: 'ticket.estadoCambiado',
  TICKET_REASIGNADO: 'ticket.reasignado',
  TICKET_CANCELADO: 'ticket.cancelado',
});

/**
 * Bus de eventos de la aplicación (EventEmitter de Node, una sola instancia).
 * Ver "Eventos y notificaciones" en docs/ARQUITECTURA.md.
 */
class BusEventos extends EventEmitter {
  /**
   * Emite el evento solo cuando la transacción confirma (commit). Si se
   * revierte, el evento nunca se emite: no se notifican cambios que no ocurrieron.
   *
   * @param {import('sequelize').Transaction} transaction
   * @param {string} evento Uno de EVENTOS.
   * @param {object} datos
   */
  emitirAlConfirmar(transaction, evento, datos) {
    transaction.afterCommit(() => this.emit(evento, datos));
  }
}

const bus = new BusEventos();

module.exports = { bus, BusEventos, EVENTOS };
