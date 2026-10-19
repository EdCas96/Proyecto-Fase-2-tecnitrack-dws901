const CotizacionService = require('../services/CotizacionService');
const CatalogoService = require('../services/CatalogoService');
const TicketService = require('../services/TicketService');
const { migasDe } = require('../utils/vistas');

/** Migas: Tickets (o Mis tickets) / <folio> / <página>. */
const migasCotizacion = (usuario, ticket, texto) => migasDe(
  usuario,
  { texto: usuario.rol === 'admin' ? 'Tickets' : 'Mis tickets', url: '/tickets' },
  { texto: ticket.folio, url: `/tickets/${ticket.id}` },
  { texto },
);

/**
 * Cotizaciones (HU-03). El total y los precios los pone CotizacionService;
 * el controlador solo pasa los ítems elegidos.
 */
class CotizacionesController {
  /** GET /cotizaciones?estado=&vencidas=1&pagina= */
  static async listar(req, res) {
    const estado = String(req.query.estado || '');
    const vencidas = req.query.vencidas === '1';
    const paginacion = await CotizacionService.listar({ estado, vencidas, pagina: req.query.pagina }, req.usuario);
    res.render('cotizaciones/index', {
      titulo: 'Cotizaciones',
      migas: migasDe(req.usuario, { texto: 'Cotizaciones' }),
      paginacion,
      filtros: { estado, vencidas: vencidas ? '1' : '' },
    });
  }

  /** GET /cotizaciones/nueva?ticket_id= */
  static async nueva(req, res) {
    const ticket = await TicketService.obtenerDetalle(req.query.ticket_id, req.usuario);
    CotizacionService.asegurarCotizable(ticket, req.usuario);
    res.render('cotizaciones/form', {
      titulo: `Cotización — Ticket ${ticket.folio}`,
      migas: migasCotizacion(req.usuario, ticket, 'Cotización'),
      ticket,
      cotizacion: null,
      catalogo: await CatalogoService.listarActivos(),
      adicional: ticket.estado !== 'Diagnosticado',
    });
  }

  /** POST /cotizaciones — ticket_id, catalogo_id[], cantidad[] (el total del formulario se ignora) */
  static async crear(req, res) {
    const cotizacion = await CotizacionService.crear(req.body.ticket_id, req.body, req.usuario);
    req.flash('exito', `Cotización enviada al cliente por $${Number(cotizacion.total).toFixed(2)}. El ticket pasó a «Esperando aprobación».`);
    res.redirect(303, `/tickets/${cotizacion.ticket_id}`);
  }

  /** GET /cotizaciones/:id/editar — solo mientras esté Pendiente */
  static async editar(req, res) {
    const cotizacion = await CotizacionService.obtenerConItems(req.params.id, req.usuario);
    const ticket = await TicketService.obtenerDetalle(cotizacion.ticket_id, req.usuario);
    res.render('cotizaciones/form', {
      titulo: `Editar cotización — Ticket ${ticket.folio}`,
      migas: migasCotizacion(req.usuario, ticket, 'Editar cotización'),
      ticket,
      cotizacion,
      catalogo: await CatalogoService.listarActivos(),
      adicional: false,
    });
  }

  /** PUT /cotizaciones/:id */
  static async actualizar(req, res) {
    const cotizacion = await CotizacionService.editar(req.params.id, req.body, req.usuario);
    req.flash('exito', `Cotización actualizada: nuevo total $${Number(cotizacion.total).toFixed(2)}.`);
    res.redirect(303, `/tickets/${cotizacion.ticket_id}`);
  }
}

module.exports = CotizacionesController;
