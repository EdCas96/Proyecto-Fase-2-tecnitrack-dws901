/**
 * Control de acceso: sesión del personal, roles y sesión del cliente del portal.
 *
 * Matriz de permisos (RN-02; también en README.md › Rutas):
 *   admin   -> todo
 *   tecnico -> tickets, cotizaciones, notificaciones; clientes, equipos y catálogo solo lectura
 *   cliente -> solo /portal (sin cuenta: folio + teléfono)
 */
const AuthService = require('../services/AuthService');
const { AuthError, ForbiddenError } = require('../utils/errors');
const { INICIO_POR_ROL } = require('../utils/constantes');
const { regenerarSesion } = require('../utils/sesion');
const asyncHandler = require('../utils/asyncHandler');
const { usuarioPublico } = require('./variablesVistas');

const MENSAJE_SIN_PERMISO = 'No tienes permiso para acceder a esta sección';
const METODOS_LECTURA = new Set(['GET', 'HEAD']);

/**
 * Evita que el navegador guarde en caché páginas con datos privados: tras
 * cerrar sesión, el botón "atrás" vuelve a pedir la página al servidor (que
 * redirige al login) en lugar de mostrar la copia guardada.
 */
function sinCache(req, res, next) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0',
  });
  next();
}

/**
 * Exige una sesión del personal. En cada petición verifica en la base de datos
 * que el usuario siga existiendo y activo: si el admin lo desactivó, se cierra
 * su sesión en ese momento (RN-07). Sin sesión: redirige a /login o responde
 * 401 JSON (lo decide errorHandler).
 *
 * @implements RN-02, RN-07
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const enSesion = req.session.usuario;
  if (!enSesion) throw new AuthError('Inicia sesión para continuar.');

  const usuario = await AuthService.obtenerUsuarioActivo(enSesion.id);
  if (!usuario) {
    await regenerarSesion(req);
    throw new AuthError('Tu sesión se cerró porque la cuenta fue desactivada.');
  }

  // Si el admin cambió el nombre o el rol, la sesión se actualiza
  if (usuario.nombre !== enSesion.nombre || usuario.rol !== enSesion.rol) {
    req.session.usuario = usuario;
  }
  req.usuario = usuario;
  res.locals.usuarioActual = usuarioPublico(usuario);
  return sinCache(req, res, next);
});

/**
 * Permite el paso solo a los roles indicados (va después de requireAuth).
 * @implements RN-02
 * @param {...string} roles
 */
function checkRole(...roles) {
  return (req, res, next) => {
    const rol = req.session.usuario && req.session.usuario.rol;
    return roles.includes(rol) ? next() : next(new ForbiddenError(MENSAJE_SIN_PERMISO));
  };
}

/**
 * El admin puede todo; los roles indicados solo pueden consultar (GET).
 * Ej.: el técnico ve clientes y catálogo pero no los modifica.
 * @implements RN-02
 * @param {...string} roles
 */
function soloLecturaPara(...roles) {
  return (req, res, next) => {
    const permitidos = METODOS_LECTURA.has(req.method) ? ['admin', ...roles] : ['admin'];
    return checkRole(...permitidos)(req, res, next);
  };
}

/**
 * Protege las páginas del portal: exige que el cliente haya validado folio y
 * teléfono (clienteTicketId en la sesión).
 * @implements HU-04
 */
function requireCliente(req, res, next) {
  if (!req.session.clienteTicketId) {
    if (typeof req.flash === 'function') req.flash('error', 'Ingresa el folio y el teléfono de tu ticket.');
    return res.redirect(303, '/portal');
  }
  return sinCache(req, res, next);
}

/** Quien ya inició sesión no ve el formulario de login: va a su panel. */
function redirectIfAuth(req, res, next) {
  const usuario = req.session.usuario;
  if (usuario && INICIO_POR_ROL[usuario.rol]) return res.redirect(INICIO_POR_ROL[usuario.rol]);
  return next();
}

module.exports = {
  requireAuth,
  checkRole,
  soloLecturaPara,
  requireCliente,
  redirectIfAuth,
  sinCache,
  MENSAJE_SIN_PERMISO,
};
