const bcrypt = require('bcrypt');
const { Usuario, Ticket, Equipo, Cliente } = require('../models');
const { AuthError, ValidationError } = require('../utils/errors');

/** Costo de bcrypt (2^10 rondas): el mismo que usan los seeders. */
const COSTO_BCRYPT = 10;

const MENSAJE_CREDENCIALES = 'Credenciales incorrectas';
const MENSAJE_INACTIVO = 'Cuenta desactivada, contacte al administrador';
const MENSAJE_PORTAL = 'No se encontró un ticket con esos datos';

/**
 * Hash válido de una contraseña cualquiera. Si el correo no existe se compara
 * contra este hash para que la respuesta tarde lo mismo que con un correo real
 * y el tiempo no revele qué correos están registrados.
 */
const HASH_SENUELO = bcrypt.hashSync('contraseña-señuelo', COSTO_BCRYPT);

/**
 * Autenticación del personal (correo + contraseña) y acceso del cliente al
 * portal (folio + teléfono).
 */
class AuthService {
  /**
   * Verifica las credenciales del personal.
   * El mensaje es el mismo si el correo no existe o si la contraseña falla
   * (no revela qué correos están registrados). La cuenta desactivada solo se
   * informa cuando la contraseña es correcta, por la misma razón.
   *
   * @implements HU-09, RF-10, RN-07, RN-08
   * @param {string} correo
   * @param {string} password
   * @returns {Promise<{id: number, nombre: string, correo: string, rol: string, activo: boolean}>}
   *   Usuario sin password_hash.
   * @throws {AuthError}
   */
  static async login(correo, password) {
    const correoNormalizado = typeof correo === 'string' ? correo.trim().toLowerCase() : '';
    const usuario = correoNormalizado
      ? await Usuario.scope('conPassword').findOne({ where: { correo: correoNormalizado } })
      : null;

    const coincide = await bcrypt.compare(
      typeof password === 'string' ? password : '',
      usuario ? usuario.password_hash : HASH_SENUELO,
    );
    if (!usuario || !coincide) throw new AuthError(MENSAJE_CREDENCIALES);

    // RN-07: un técnico desactivado no puede iniciar sesión
    if (!usuario.activo) throw new AuthError(MENSAJE_INACTIVO);

    // RN-08: toJSON() quita password_hash
    return usuario.toJSON();
  }

  /**
   * Busca un usuario activo por id (para revalidar la sesión en cada petición).
   *
   * @implements RN-07
   * @param {number} id
   * @returns {Promise<{id: number, nombre: string, rol: string}|null>} null si no existe o está desactivado.
   */
  static async obtenerUsuarioActivo(id) {
    if (!id) return null;
    const usuario = await Usuario.findByPk(id, { attributes: ['id', 'nombre', 'rol', 'activo'] });
    if (!usuario || !usuario.activo) return null;
    return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
  }

  /**
   * Genera el hash bcrypt de una contraseña, después de validar su fortaleza.
   *
   * @implements RN-08
   * @param {string} texto
   * @returns {Promise<string>}
   * @throws {ValidationError} Si la contraseña es débil.
   */
  static async hashPassword(texto) {
    AuthService.validarFortaleza(texto);
    return bcrypt.hash(texto, COSTO_BCRYPT);
  }

  /**
   * Contraseña mínima: 8 caracteres, al menos una letra y un número.
   *
   * @implements RN-08
   * @param {string} texto
   * @returns {true}
   * @throws {ValidationError} Con el detalle en errores.password.
   */
  static validarFortaleza(texto) {
    let problema = null;
    if (typeof texto !== 'string' || texto.length < 8) {
      problema = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/\p{L}/u.test(texto)) {
      problema = 'La contraseña debe incluir al menos una letra.';
    } else if (!/\d/.test(texto)) {
      problema = 'La contraseña debe incluir al menos un número.';
    }
    if (problema) {
      throw new ValidationError(problema, { errores: { password: problema } });
    }
    return true;
  }

  /**
   * Deja solo los dígitos significativos de un teléfono: quita espacios,
   * guiones y paréntesis ("7123-4567" y "7123 4567" quedan como "71234567").
   *
   * @param {string} telefono
   * @returns {string}
   */
  static normalizarTelefono(telefono) {
    return typeof telefono === 'string' ? telefono.replace(/[\s()-]/g, '') : '';
  }

  /**
   * Acceso del cliente al portal: el folio debe existir y el teléfono debe
   * coincidir con el del cliente dueño del equipo. Cualquier fallo da el
   * mismo mensaje, para no revelar qué folios existen.
   *
   * @implements HU-04
   * @param {string} folio
   * @param {string} telefono
   * @returns {Promise<number>} Id del ticket.
   * @throws {AuthError}
   */
  static async verificarAccesoCliente(folio, telefono) {
    const folioNormalizado = typeof folio === 'string' ? folio.trim().toUpperCase() : '';
    const telefonoNormalizado = AuthService.normalizarTelefono(telefono);
    if (!folioNormalizado || !telefonoNormalizado) throw new AuthError(MENSAJE_PORTAL);

    const ticket = await Ticket.findOne({
      where: { folio: folioNormalizado },
      attributes: ['id'],
      include: {
        model: Equipo,
        as: 'equipo',
        attributes: ['id'],
        include: { model: Cliente, as: 'cliente', attributes: ['telefono'] },
      },
    });

    const telefonoCliente = ticket && ticket.equipo && ticket.equipo.cliente
      ? AuthService.normalizarTelefono(ticket.equipo.cliente.telefono)
      : null;
    if (!telefonoCliente || telefonoCliente !== telefonoNormalizado) {
      throw new AuthError(MENSAJE_PORTAL);
    }
    return ticket.id;
  }
}

AuthService.MENSAJE_CREDENCIALES = MENSAJE_CREDENCIALES;
AuthService.MENSAJE_INACTIVO = MENSAJE_INACTIVO;
AuthService.MENSAJE_PORTAL = MENSAJE_PORTAL;

module.exports = AuthService;
