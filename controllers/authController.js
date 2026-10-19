const AuthService = require('../services/AuthService');
const { AuthError } = require('../utils/errors');
const { INICIO_POR_ROL } = require('../utils/constantes');
const {
  COOKIE_SESION, regenerarSesion, guardarSesion, destruirSesion,
} = require('../utils/sesion');

const TITULO = 'Iniciar sesión';

/**
 * Inicio y cierre de sesión del personal (admin y técnico).
 */
class AuthController {
  /** GET /login */
  static mostrarLogin(req, res) {
    const mensajes = req.query.sesion === 'cerrada'
      ? { ...res.locals.mensajes, exito: ['Cerraste sesión correctamente.'] }
      : res.locals.mensajes;
    res.render('auth/login', { titulo: TITULO, mensajes });
  }

  /**
   * POST /login — Si las credenciales son correctas regenera la sesión (evita
   * la fijación de sesión) y guarda solo { id, nombre, rol }.
   * @implements HU-09, RF-10, RN-07, RN-08
   */
  static async iniciarSesion(req, res) {
    const { correo, password } = req.body;
    let usuario;
    try {
      usuario = await AuthService.login(correo, password);
    } catch (error) {
      if (!(error instanceof AuthError)) throw error;
      // 401 con el mismo formulario: el rate limit cuenta este intento como fallido
      return res.status(401).render('auth/login', {
        titulo: TITULO,
        mensajes: { exito: [], error: [error.message] },
        datos: { correo },
      });
    }

    await regenerarSesion(req);
    req.session.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    await guardarSesion(req);
    return res.redirect(303, INICIO_POR_ROL[usuario.rol]);
  }

  /** POST /logout — Elimina la sesión del almacén y la cookie del navegador. */
  static async cerrarSesion(req, res) {
    await destruirSesion(req);
    res.clearCookie(COOKIE_SESION, { path: '/' });
    res.redirect(303, '/login?sesion=cerrada');
  }
}

module.exports = AuthController;
