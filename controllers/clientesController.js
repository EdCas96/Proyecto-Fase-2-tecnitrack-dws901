const ClienteService = require('../services/ClienteService');
const TicketService = require('../services/TicketService');
const { TIPOS_EQUIPO } = require('../utils/constantes');
const { migasDe } = require('../utils/vistas');

const MIGA_CLIENTES = { texto: 'Clientes', url: '/clientes' };

/**
 * Clientes (HU-01). Admin: CRUD; técnico: solo consulta.
 */
class ClientesController {
  /** GET /clientes?q=&pagina= */
  static async listar(req, res) {
    const busqueda = String(req.query.q || '').trim();
    const paginacion = await ClienteService.listar({ busqueda, pagina: req.query.pagina });
    res.render('clientes/index', {
      titulo: 'Clientes',
      migas: migasDe(req.usuario, { texto: 'Clientes' }),
      paginacion,
      filtros: { q: busqueda },
    });
  }

  /** GET /clientes/nuevo */
  static nuevo(req, res) {
    res.render('clientes/form', {
      titulo: 'Nuevo cliente',
      migas: migasDe(req.usuario, MIGA_CLIENTES, { texto: 'Nuevo cliente' }),
      cliente: null,
      tiposEquipo: TIPOS_EQUIPO,
    });
  }

  /** POST /clientes — cliente y, opcionalmente, su primer equipo (una transacción). */
  static async crear(req, res) {
    const cliente = await ClienteService.crear(req.body);
    const conEquipo = ClienteService.tieneEquipo(req.body) ? ' con su equipo' : '';
    req.flash('exito', `Cliente "${cliente.nombre}" registrado correctamente${conEquipo}.`);
    res.redirect(303, `/clientes/${cliente.id}`);
  }

  /** GET /clientes/:id — datos del cliente, sus equipos y su historial de tickets (RF-05). */
  static async detalle(req, res) {
    const cliente = await ClienteService.obtenerPorId(req.params.id, { conEquipos: true });
    const tickets = await TicketService.listarPorCliente(cliente.id, req.usuario);
    res.render('clientes/detalle', {
      titulo: cliente.nombre,
      migas: migasDe(req.usuario, MIGA_CLIENTES, { texto: cliente.nombre }),
      cliente,
      tickets,
    });
  }

  /** GET /clientes/:id/editar */
  static async editar(req, res) {
    const cliente = await ClienteService.obtenerPorId(req.params.id);
    res.render('clientes/form', {
      titulo: 'Editar cliente',
      migas: migasDe(req.usuario, MIGA_CLIENTES, { texto: cliente.nombre, url: `/clientes/${cliente.id}` }, { texto: 'Editar' }),
      cliente,
      tiposEquipo: TIPOS_EQUIPO,
    });
  }

  /** PUT /clientes/:id */
  static async actualizar(req, res) {
    const cliente = await ClienteService.actualizar(req.params.id, req.body);
    req.flash('exito', `Cliente "${cliente.nombre}" actualizado correctamente.`);
    res.redirect(303, `/clientes/${cliente.id}`);
  }

  /** DELETE /clientes/:id — solo si no tiene equipos. */
  static async eliminar(req, res) {
    const cliente = await ClienteService.eliminar(req.params.id);
    req.flash('exito', `Cliente "${cliente.nombre}" eliminado.`);
    res.redirect(303, '/clientes');
  }
}

module.exports = ClientesController;
