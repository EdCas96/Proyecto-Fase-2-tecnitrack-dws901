const { bus, EVENTOS } = require('./busEventos');
const NotificacionService = require('../NotificacionService');
const { ETIQUETA_ESTADO } = require('../../utils/constantes');

const etiqueta = (estado) => ETIQUETA_ESTADO[estado] || estado;

/**
 * Decide a quién notificar por cada evento (HU-10, RF-12):
 * - cotizacion.respondida: al técnico asignado y a los admins.
 * - ticket.reasignado:     al técnico que recibe el ticket.
 * - ticket.cancelado:      al técnico asignado, si lo canceló otra persona (el admin).
 * - ticket.estadoCambiado: al técnico asignado, si el cambio lo hizo el admin.
 * - cotizacion.creada:     nadie (el cliente la ve en el portal).
 *
 * Los manejadores son asíncronos: EventEmitter no los espera, así que se
 * guardan sus promesas para que las pruebas puedan esperarlas (esperar())
 * y sus errores se registran sin tumbar la petición que originó el evento.
 *
 * @implements HU-10, RF-12, RN-06
 */
class NotificacionListener {
  /** Notificaciones que deja cada evento (función pura, se prueba sin base de datos). */
  static notificacionesPara(evento, datos) {
    const {
      ticketId, folio, tecnicoId, actorId,
    } = datos;
    switch (evento) {
      case EVENTOS.COTIZACION_RESPONDIDA: {
        const accion = datos.aprobada ? 'aprobó' : 'rechazó';
        const mensaje = `El cliente ${accion} la cotización del ticket ${folio}.`;
        const motivo = !datos.aprobada && datos.motivo ? ` Motivo: ${datos.motivo}` : '';
        const lista = [{ para: 'admins', ticketId, tipo: 'cotizacion_respondida', mensaje: mensaje + motivo }];
        if (tecnicoId) lista.unshift({ usuarioId: tecnicoId, ticketId, tipo: 'cotizacion_respondida', mensaje: mensaje + motivo });
        return lista;
      }
      case EVENTOS.TICKET_REASIGNADO:
        return [{ usuarioId: tecnicoId, ticketId, tipo: 'ticket_asignado', mensaje: `Se te asignó el ticket ${folio}.` }];
      case EVENTOS.TICKET_CANCELADO:
        if (!tecnicoId || tecnicoId === actorId) return [];
        return [{
          usuarioId: tecnicoId, ticketId, tipo: 'ticket_cancelado', mensaje: `El administrador canceló el ticket ${folio}. Motivo: ${datos.motivo}`,
        }];
      case EVENTOS.TICKET_ESTADO_CAMBIADO:
        if (!tecnicoId || datos.actorRol !== 'admin' || tecnicoId === actorId) return [];
        return [{
          usuarioId: tecnicoId,
          ticketId,
          tipo: 'ticket_estado',
          mensaje: `El administrador pasó el ticket ${folio} a «${etiqueta(datos.nuevo)}».`,
        }];
      default:
        return [];
    }
  }

  /** Crea en la base las notificaciones de un evento. */
  static async procesar(evento, datos) {
    const notificaciones = NotificacionListener.notificacionesPara(evento, datos);
    for (const { para, ...notificacion } of notificaciones) {
      if (para === 'admins') await NotificacionService.notificarAdmins(notificacion);
      else await NotificacionService.crear(notificacion);
    }
  }

  /** Suscribe el listener al bus (una sola vez, en app.js). */
  static registrar(emisor = bus) {
    if (NotificacionListener.registrado) return;
    NotificacionListener.registrado = true;
    [EVENTOS.COTIZACION_RESPONDIDA, EVENTOS.TICKET_REASIGNADO, EVENTOS.TICKET_CANCELADO, EVENTOS.TICKET_ESTADO_CAMBIADO]
      .forEach((evento) => {
        emisor.on(evento, (datos) => {
          const tarea = NotificacionListener.procesar(evento, datos)
            .catch((error) => console.error(`[Eventos] No se pudo notificar "${evento}":`, error))
            .finally(() => NotificacionListener.pendientes.delete(tarea));
          NotificacionListener.pendientes.add(tarea);
        });
      });
  }

  /** Espera a que terminen las notificaciones en curso (para las pruebas). */
  static async esperar() {
    await Promise.all([...NotificacionListener.pendientes]);
  }
}

NotificacionListener.pendientes = new Set();
NotificacionListener.registrado = false;

module.exports = NotificacionListener;
