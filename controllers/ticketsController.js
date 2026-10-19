const TicketService = require('../services/TicketService');
const MaquinaEstadosTicket = require('../services/MaquinaEstadosTicket');
const CotizacionService = require('../services/CotizacionService');
const ClienteService = require('../services/ClienteService');
const EquipoService = require('../services/EquipoService');
const { ESTADOS_TICKET, TIPOS_EQUIPO } = require('../utils/constantes');
const { migasDe, etiquetaEstado } = require('../utils/vistas');

const MIGA_TICKETS = { texto: 'Tickets', url: '/tickets' };

/** Los listados del técnico cuelgan de "Mis tickets" (/tecnico). */
const migaListado = (usuario) => (usuario.rol === 'admin' ? MIGA_TICKETS : { texto: 'Mis tickets', url: '/tickets' });

/**
 * Tickets (HU-02, HU-06). El controlador solo lee la petición, llama a
 * TicketService y responde; el filtro por técnico (RN-02) lo aplica el servicio.
 */
class TicketsController {
  /** GET /tickets?estado=&q=&pagina= */
  static async listar(req, res) {
    const estado = String(req.query.estado || '');
    const busqueda = String(req.query.q || '').trim();
    const paginacion = await TicketService.listar({ estado, busqueda, pagina: req.query.pagina }, req.usuario);
    const admin = req.usuario.rol === 'admin';
    res.render('tickets/index', {
      titulo: admin ? 'Tickets' : 'Mis tickets',
      migas: migasDe(req.usuario, { texto: admin ? 'Tickets' : 'Mis tickets' }),
      paginacion,
      filtros: { estado, q: busqueda },
      estados: ESTADOS_TICKET,
    });
  }

  /** GET /tickets/nuevo — formulario con cliente/equipo existentes o nuevos y fotos. */
  static async nuevo(req, res) {
    // Si el formulario regresó con errores, se vuelven a mostrar los equipos del cliente que ya estaba elegido
    const clienteElegido = res.locals.datos && res.locals.datos.cliente_id;
    const [clientes, tecnicos, equiposCliente] = await Promise.all([
      // Lista para el select con filtro (RNF-01); los equipos se cargan según el cliente elegido
      ClienteService.listarParaSeleccion(),
      req.usuario.rol === 'admin' ? TicketService.tecnicosActivos() : [],
      EquipoService.opcionesDeCliente(clienteElegido),
    ]);
    res.render('tickets/form', {
      titulo: 'Nuevo ticket',
      migas: migasDe(req.usuario, migaListado(req.usuario), { texto: 'Nuevo ticket' }),
      clientes,
      tecnicos,
      equiposCliente,
      tiposEquipo: TIPOS_EQUIPO,
      hoy: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date()),
    });
  }

  /** GET /tickets/equipos?cliente_id= — JSON con los equipos de un cliente (para el formulario). */
  static async equiposDeCliente(req, res) {
    res.json(await EquipoService.opcionesDeCliente(req.query.cliente_id));
  }

  /** POST /tickets (multipart: las fotos llegan en req.files) */
  static async crear(req, res) {
    const ticket = await TicketService.crear(req.body, req.files || [], req.usuario);
    req.flash('exito', `Ticket ${ticket.folio} creado en estado «Recibido».`);
    res.redirect(303, `/tickets/${ticket.id}`);
  }

  /** GET /tickets/:id */
  static async detalle(req, res) {
    const ticket = await TicketService.obtenerDetalle(req.params.id, req.usuario);
    const admin = req.usuario.rol === 'admin';
    res.render('tickets/detalle', {
      titulo: `Ticket ${ticket.folio}`,
      migas: migasDe(req.usuario, migaListado(req.usuario), { texto: ticket.folio }),
      ticket,
      flujo: MaquinaEstadosTicket.FLUJO,
      permitidos: MaquinaEstadosTicket.transicionesManuales(ticket.estado),
      puedeCancelar: MaquinaEstadosTicket.puedeCancelar(ticket.estado, req.usuario.rol),
      puedeCotizar: CotizacionService.puedeCotizar(ticket, req.usuario),
      puedeEditarCotizacion: Boolean(ticket.cotizaciones[0] && ticket.cotizaciones[0].estado === 'Pendiente')
        && (admin || ticket.tecnico_id === req.usuario.id),
      tecnicos: admin && !MaquinaEstadosTicket.esFinal(ticket.estado) ? await TicketService.tecnicosActivos() : [],
    });
  }

  /** PATCH /tickets/:id/estado — estado=<destino>, motivo (al cancelar) */
  static async cambiarEstado(req, res) {
    const ticket = await TicketService.cambiarEstado(req.params.id, req.body.estado, req.usuario, { motivo: req.body.motivo });
    req.flash('exito', `Ticket ${ticket.folio}: pasó a «${etiquetaEstado(ticket.estado)}».`);
    res.redirect(303, `/tickets/${ticket.id}`);
  }

  /** PATCH /tickets/:id/tecnico — tecnico_id (solo admin) */
  static async reasignar(req, res) {
    const ticket = await TicketService.reasignar(req.params.id, req.body.tecnico_id, req.usuario);
    req.flash('exito', `Ticket ${ticket.folio} asignado. Se notificó al técnico.`);
    res.redirect(303, `/tickets/${ticket.id}`);
  }
}

module.exports = TicketsController;
