const CatalogoService = require('../services/CatalogoService');
const { TIPOS_CATALOGO } = require('../utils/constantes');
const { migasDe } = require('../utils/vistas');

const MIGA_CATALOGO = { texto: 'Catálogo', url: '/catalogo' };

/**
 * Catálogo de servicios y repuestos (HU-07). Admin: CRUD; técnico: solo consulta.
 */
class CatalogoController {
  /** GET /catalogo?tipo=&q=&pagina= */
  static async listar(req, res) {
    const tipo = TIPOS_CATALOGO.includes(req.query.tipo) ? req.query.tipo : '';
    const busqueda = String(req.query.q || '').trim();
    const paginacion = await CatalogoService.listar({ tipo, busqueda, pagina: req.query.pagina });
    res.render('catalogo/index', {
      titulo: 'Catálogo de servicios y repuestos',
      migas: migasDe(req.usuario, { texto: 'Catálogo' }),
      paginacion,
      filtros: { tipo, q: busqueda },
      tipos: TIPOS_CATALOGO,
    });
  }

  /** GET /catalogo/nuevo */
  static nuevo(req, res) {
    res.render('catalogo/form', {
      titulo: 'Nuevo ítem',
      migas: migasDe(req.usuario, MIGA_CATALOGO, { texto: 'Nuevo ítem' }),
      item: null,
      tipos: TIPOS_CATALOGO,
    });
  }

  /** POST /catalogo */
  static async crear(req, res) {
    const item = await CatalogoService.crear(req.body);
    req.flash('exito', `Ítem "${item.nombre}" agregado al catálogo.`);
    res.redirect(303, '/catalogo');
  }

  /** GET /catalogo/:id/editar */
  static async editar(req, res) {
    const item = await CatalogoService.obtenerPorId(req.params.id);
    res.render('catalogo/form', {
      titulo: 'Editar ítem',
      migas: migasDe(req.usuario, MIGA_CATALOGO, { texto: item.nombre }),
      item,
      tipos: TIPOS_CATALOGO,
    });
  }

  /** PUT /catalogo/:id */
  static async actualizar(req, res) {
    const item = await CatalogoService.actualizar(req.params.id, req.body);
    req.flash('exito', `Ítem "${item.nombre}" actualizado.`);
    res.redirect(303, '/catalogo');
  }

  /** PATCH /catalogo/:id/activo — activo=true|false */
  static async cambiarEstado(req, res) {
    const activo = req.body.activo === 'true';
    const item = await CatalogoService.cambiarEstado(req.params.id, activo);
    req.flash('exito', activo
      ? `Ítem "${item.nombre}" activado: ya se puede cotizar.`
      : `Ítem "${item.nombre}" desactivado: ya no aparecerá al cotizar.`);
    res.redirect(303, '/catalogo');
  }

  /** DELETE /catalogo/:id — solo si nunca se usó en una cotización. */
  static async eliminar(req, res) {
    const item = await CatalogoService.eliminar(req.params.id);
    req.flash('exito', `Ítem "${item.nombre}" eliminado del catálogo.`);
    res.redirect(303, '/catalogo');
  }
}

module.exports = CatalogoController;
