const ClienteService = require('../services/ClienteService');
const EquipoService = require('../services/EquipoService');
const { TIPOS_EQUIPO } = require('../utils/constantes');
const { migasDe } = require('../utils/vistas');

/** Migas: Clientes / <cliente> / <página>. */
const migasEquipo = (usuario, cliente, texto) => migasDe(
  usuario,
  { texto: 'Clientes', url: '/clientes' },
  { texto: cliente.nombre, url: `/clientes/${cliente.id}` },
  { texto },
);

/**
 * Equipos de un cliente (HU-01). Se administran desde el detalle del cliente.
 */
class EquiposController {
  /** GET /equipos — los equipos se consultan dentro de cada cliente. */
  static listar(req, res) {
    res.redirect(303, '/clientes');
  }

  /** GET /equipos/nuevo?cliente_id= */
  static async nuevo(req, res) {
    const cliente = await ClienteService.obtenerPorId(req.query.cliente_id);
    res.render('equipos/form', {
      titulo: 'Nuevo equipo',
      migas: migasEquipo(req.usuario, cliente, 'Nuevo equipo'),
      cliente,
      equipo: null,
      tiposEquipo: TIPOS_EQUIPO,
    });
  }

  /** POST /equipos */
  static async crear(req, res) {
    const equipo = await EquipoService.crear(req.body.cliente_id, req.body);
    req.flash('exito', `Equipo ${equipo.marca} ${equipo.modelo} agregado correctamente.`);
    res.redirect(303, `/clientes/${equipo.cliente_id}`);
  }

  /** GET /equipos/:id/editar */
  static async editar(req, res) {
    const equipo = await EquipoService.obtenerPorId(req.params.id);
    res.render('equipos/form', {
      titulo: 'Editar equipo',
      migas: migasEquipo(req.usuario, equipo.cliente, 'Editar equipo'),
      cliente: equipo.cliente,
      equipo,
      tiposEquipo: TIPOS_EQUIPO,
    });
  }

  /** PUT /equipos/:id */
  static async actualizar(req, res) {
    const equipo = await EquipoService.actualizar(req.params.id, req.body);
    req.flash('exito', `Equipo ${equipo.marca} ${equipo.modelo} actualizado correctamente.`);
    res.redirect(303, `/clientes/${equipo.cliente_id}`);
  }

  /** DELETE /equipos/:id — solo si no tiene tickets. */
  static async eliminar(req, res) {
    const { clienteId } = await EquipoService.eliminar(req.params.id);
    req.flash('exito', 'Equipo eliminado.');
    res.redirect(303, `/clientes/${clienteId}`);
  }
}

module.exports = EquiposController;
