const UsuarioService = require('../services/UsuarioService');
const { migasDe } = require('../utils/vistas');

const MIGA_USUARIOS = { texto: 'Usuarios', url: '/usuarios' };

/**
 * Cuentas del personal (HU-09). Solo admin.
 */
class UsuariosController {
  /** GET /usuarios?q=&pagina= */
  static async listar(req, res) {
    const busqueda = String(req.query.q || '').trim();
    const paginacion = await UsuarioService.listar({ busqueda, pagina: req.query.pagina });
    res.render('usuarios/index', {
      titulo: 'Usuarios',
      migas: migasDe(req.usuario, { texto: 'Usuarios' }),
      paginacion,
      filtros: { q: busqueda },
    });
  }

  /** GET /usuarios/nuevo */
  static nuevo(req, res) {
    res.render('usuarios/form', {
      titulo: 'Nuevo técnico',
      migas: migasDe(req.usuario, MIGA_USUARIOS, { texto: 'Nuevo técnico' }),
      usuario: null,
    });
  }

  /** POST /usuarios — crea un técnico con contraseña temporal. */
  static async crear(req, res) {
    const usuario = await UsuarioService.crearTecnico(req.body);
    req.flash('exito', `Técnico "${usuario.nombre}" creado. Comparte con él su contraseña temporal.`);
    res.redirect(303, '/usuarios');
  }

  /** GET /usuarios/:id/editar */
  static async editar(req, res) {
    const usuario = await UsuarioService.obtenerPorId(req.params.id);
    res.render('usuarios/form', {
      titulo: 'Editar usuario',
      migas: migasDe(req.usuario, MIGA_USUARIOS, { texto: usuario.nombre }),
      usuario: usuario.toJSON(),
    });
  }

  /** PUT /usuarios/:id — nombre y correo. */
  static async actualizar(req, res) {
    const usuario = await UsuarioService.actualizar(req.params.id, req.body);
    req.flash('exito', `Usuario "${usuario.nombre}" actualizado.`);
    res.redirect(303, '/usuarios');
  }

  /** PATCH /usuarios/:id/activo — activo=true|false */
  static async cambiarEstado(req, res) {
    const activo = req.body.activo === 'true';
    const usuario = await UsuarioService.cambiarEstado(req.params.id, activo, req.usuario.id);
    req.flash('exito', activo
      ? `"${usuario.nombre}" fue activado y ya puede iniciar sesión.`
      : `"${usuario.nombre}" fue desactivado y ya no puede iniciar sesión.`);
    res.redirect(303, '/usuarios');
  }

  /** GET /usuarios/:id/password */
  static async formularioPassword(req, res) {
    const usuario = await UsuarioService.obtenerPorId(req.params.id);
    res.render('usuarios/password', {
      titulo: 'Restablecer contraseña',
      migas: migasDe(req.usuario, MIGA_USUARIOS, { texto: usuario.nombre }, { texto: 'Restablecer contraseña' }),
      usuario: usuario.toJSON(),
    });
  }

  /** PUT /usuarios/:id/password */
  static async restablecerPassword(req, res) {
    const usuario = await UsuarioService.restablecerPassword(req.params.id, req.body.password);
    req.flash('exito', `Contraseña de "${usuario.nombre}" restablecida. Comparte con él la nueva contraseña temporal.`);
    res.redirect(303, '/usuarios');
  }

  /** DELETE /usuarios/:id — solo cuentas sin historial. */
  static async eliminar(req, res) {
    const usuario = await UsuarioService.eliminar(req.params.id, req.usuario.id);
    req.flash('exito', `Usuario "${usuario.nombre}" eliminado.`);
    res.redirect(303, '/usuarios');
  }
}

module.exports = UsuariosController;
