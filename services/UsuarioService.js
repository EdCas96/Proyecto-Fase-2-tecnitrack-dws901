const { Op, literal } = require('sequelize');
const { Usuario } = require('../models');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../utils/errors');
const { escaparLike, textoOpcional } = require('../utils/texto');
const { opcionesPaginacion, resultadoPaginado } = require('../utils/paginacion');
const AuthService = require('./AuthService');

/** Columnas públicas: password_hash nunca se selecciona aquí (RN-08). */
const ATRIBUTOS = ['id', 'nombre', 'correo', 'rol', 'activo'];

/** Registros que dependen del usuario y que impiden eliminarlo. */
const REGISTROS_ASOCIADOS = [
  literal(`(
    (SELECT COUNT(*) FROM tickets AS t WHERE t.tecnico_id = \`Usuario\`.\`id\`)
    + (SELECT COUNT(*) FROM ticket_historiales AS h WHERE h.usuario_id = \`Usuario\`.\`id\`)
    + (SELECT COUNT(*) FROM notificaciones AS n WHERE n.usuario_id = \`Usuario\`.\`id\`)
  )`),
  'registrosAsociados',
];

const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);

/**
 * Cuentas del personal. El admin crea técnicos, los edita, los activa o
 * desactiva y les restablece la contraseña.
 */
class UsuarioService {
  /**
   * Listado paginado en la consulta (RNF-04) con búsqueda por nombre o correo.
   *
   * @implements HU-09, RF-09
   * @param {{busqueda?: string, pagina?: number}} [filtros]
   */
  static async listar({ busqueda = '', pagina = 1 } = {}) {
    const opciones = {
      attributes: ATRIBUTOS,
      order: [['rol', 'ASC'], ['activo', 'DESC'], ['nombre', 'ASC']],
      ...opcionesPaginacion(pagina),
    };
    const texto = String(busqueda || '').trim();
    if (texto) {
      const patron = `%${escaparLike(texto)}%`;
      opciones.where = { [Op.or]: [{ nombre: { [Op.like]: patron } }, { correo: { [Op.like]: patron } }] };
    }
    const resultado = await Usuario.findAndCountAll(opciones);
    return resultadoPaginado({ count: resultado.count, rows: resultado.rows.map((u) => u.toJSON()) }, pagina);
  }

  /**
   * @param {number|string} id
   * @returns {Promise<Usuario>} Sin password_hash.
   * @throws {NotFoundError}
   */
  static async obtenerPorId(id) {
    const usuario = idValido(id) && await Usuario.findByPk(idValido(id), {
      attributes: [...ATRIBUTOS, REGISTROS_ASOCIADOS],
    });
    if (!usuario) throw new NotFoundError('El usuario no existe.');
    return usuario;
  }

  /** Correo en minúsculas que no use otra cuenta (la base también lo impide). */
  static async validarCorreoUnico(correo, excluirId) {
    if (!correo) return;
    const where = { correo: correo.toLowerCase() };
    if (excluirId) where.id = { [Op.ne]: excluirId };
    if (await Usuario.findOne({ where, attributes: ['id'] })) {
      const mensaje = 'Ya existe un usuario con ese correo.';
      throw new ValidationError(mensaje, { errores: { correo: mensaje } });
    }
  }

  /**
   * Crea un técnico con una contraseña temporal (fortaleza validada y cifrada con bcrypt).
   *
   * @implements HU-09, RF-09, RN-08
   * @param {{nombre: string, correo: string, password: string}} datos
   * @returns {Promise<object>} Usuario sin password_hash.
   */
  static async crearTecnico({ nombre, correo, password } = {}) {
    const correoLimpio = textoOpcional(correo);
    await UsuarioService.validarCorreoUnico(correoLimpio);
    const passwordHash = await AuthService.hashPassword(password);
    const usuario = await Usuario.create({
      nombre: textoOpcional(nombre),
      correo: correoLimpio,
      password_hash: passwordHash,
      rol: 'tecnico',
      activo: true,
    });
    return usuario.toJSON();
  }

  /**
   * Edita nombre y correo (el rol no se cambia desde aquí).
   *
   * @implements HU-09, RF-09
   * @param {number|string} id
   * @param {{nombre: string, correo: string}} datos
   * @returns {Promise<object>}
   */
  static async actualizar(id, { nombre, correo } = {}) {
    const usuario = await UsuarioService.obtenerPorId(id);
    const correoLimpio = textoOpcional(correo);
    await UsuarioService.validarCorreoUnico(correoLimpio, usuario.id);
    await usuario.update({ nombre: textoOpcional(nombre), correo: correoLimpio }, { fields: ['nombre', 'correo'] });
    return usuario.toJSON();
  }

  /**
   * Un admin no puede quitarse el acceso a sí mismo, y siempre debe quedar al
   * menos un admin activo (si no, nadie podría administrar el sistema).
   *
   * @param {Usuario} usuario Usuario afectado.
   * @param {number} actorId Admin que realiza la acción.
   * @param {string} accion "desactivar" o "eliminar", para el mensaje.
   * @throws {BusinessRuleError}
   */
  static async validarQueQuedeAcceso(usuario, actorId, accion) {
    if (usuario.id === Number(actorId)) {
      throw new BusinessRuleError(`No puedes ${accion} tu propia cuenta.`);
    }
    if (usuario.rol === 'admin' && usuario.activo) {
      const adminsActivos = await Usuario.count({ where: { rol: 'admin', activo: true } });
      if (adminsActivos <= 1) {
        throw new BusinessRuleError(`No se puede ${accion} al último administrador activo.`);
      }
    }
  }

  /**
   * Activa o desactiva una cuenta. Un usuario desactivado no puede iniciar
   * sesión y, si tenía una sesión abierta, se cierra en su siguiente petición.
   *
   * @implements HU-09, RF-09, RN-07
   * @param {number|string} id
   * @param {boolean} activo
   * @param {number} actorId Admin en sesión.
   * @returns {Promise<object>}
   */
  static async cambiarEstado(id, activo, actorId) {
    const usuario = await UsuarioService.obtenerPorId(id);
    if (!activo) await UsuarioService.validarQueQuedeAcceso(usuario, actorId, 'desactivar');
    await usuario.update({ activo: Boolean(activo) }, { fields: ['activo'] });
    return usuario.toJSON();
  }

  /**
   * El admin asigna una contraseña nueva (temporal) a un usuario.
   *
   * @implements HU-09, RN-08
   * @param {number|string} id
   * @param {string} password
   * @returns {Promise<object>}
   */
  static async restablecerPassword(id, password) {
    const usuario = await UsuarioService.obtenerPorId(id);
    const passwordHash = await AuthService.hashPassword(password);
    await usuario.update({ password_hash: passwordHash }, { fields: ['password_hash'] });
    return usuario.toJSON();
  }

  /**
   * Elimina una cuenta sin historial. Si el usuario tiene tickets, cambios de
   * estado o notificaciones, hay que desactivarlo (el historial se conserva).
   *
   * @implements HU-09, RF-09
   * @param {number|string} id
   * @param {number} actorId Admin en sesión.
   * @returns {Promise<object>}
   * @throws {BusinessRuleError}
   */
  static async eliminar(id, actorId) {
    const usuario = await UsuarioService.obtenerPorId(id);
    await UsuarioService.validarQueQuedeAcceso(usuario, actorId, 'eliminar');
    if (Number(usuario.get('registrosAsociados')) > 0) {
      throw new BusinessRuleError(
        `No se puede eliminar a ${usuario.nombre} porque tiene tickets o historial registrados. Desactívalo para que no pueda iniciar sesión.`,
      );
    }
    await usuario.destroy();
    return usuario.toJSON();
  }
}

module.exports = UsuarioService;
