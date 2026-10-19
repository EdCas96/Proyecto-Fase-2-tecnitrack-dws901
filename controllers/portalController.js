const AuthService = require('../services/AuthService');
const PortalService = require('../services/PortalService');
const CotizacionService = require('../services/CotizacionService');
const { AuthError, NotFoundError } = require('../utils/errors');
const {
  COOKIE_SESION, regenerarSesion, guardarSesion, destruirSesion,
} = require('../utils/sesion');

const TITULO = 'Consultar mi ticket';

/**
 * Portal público del cliente: acceso con folio + teléfono, sin cuenta.
 */
class PortalController {
  /** GET /portal */
  static mostrarConsulta(req, res) {
    res.render('cliente/consulta', { titulo: TITULO });
  }

  /**
   * POST /portal — Si el folio y el teléfono coinciden, regenera la sesión y
   * guarda solo el id del ticket (clienteTicketId).
   * @implements HU-04
   */
  static async consultar(req, res) {
    const { folio, telefono } = req.body;
    let ticketId;
    try {
      ticketId = await AuthService.verificarAccesoCliente(folio, telefono);
    } catch (error) {
      if (!(error instanceof AuthError)) throw error;
      return res.status(401).render('cliente/consulta', {
        titulo: TITULO,
        mensajes: { exito: [], error: [error.message] },
        datos: { folio, telefono },
      });
    }

    await regenerarSesion(req);
    req.session.clienteTicketId = ticketId;
    await guardarSesion(req);
    return res.redirect(303, '/portal/ticket');
  }

  /**
   * GET /portal/ticket — Estado del ticket del cliente.
   * @implements HU-04
   */
  static async verTicket(req, res) {
    let ticket;
    try {
      ticket = await PortalService.obtenerResumenTicket(req.session.clienteTicketId);
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      // El ticket se eliminó después de entrar: se cierra el acceso
      await destruirSesion(req);
      res.clearCookie(COOKIE_SESION, { path: '/' });
      return res.redirect(303, '/portal');
    }
    const cotizacion = await CotizacionService.vigenteDelTicket(req.session.clienteTicketId);
    return res.render('cliente/ticket', { titulo: `Ticket ${ticket.folio}`, ticket, cotizacion });
  }

  /**
   * POST /portal/cotizaciones/:id/aprobar y /rechazar — respuesta del cliente.
   * Solo la cotización Pendiente del ticket de su sesión (lo verifica CotizacionService).
   * @implements HU-05, RN-06
   */
  static responder(decision) {
    return async (req, res) => {
      await CotizacionService.responder(req.params.id, decision, {
        clienteTicketId: req.session.clienteTicketId,
        motivo: req.body.motivo,
      });
      req.flash('exito', decision === 'aprobar'
        ? 'Gracias. Aprobaste la cotización: el técnico ya puede reparar tu equipo.'
        : 'Registramos que rechazaste la cotización. Puedes pasar a retirar tu equipo.');
      res.redirect(303, '/portal/ticket');
    };
  }

  /** POST /portal/salir — Cierra el acceso del cliente. */
  static async salir(req, res) {
    await destruirSesion(req);
    res.clearCookie(COOKIE_SESION, { path: '/' });
    res.redirect(303, '/portal');
  }
}

module.exports = PortalController;
