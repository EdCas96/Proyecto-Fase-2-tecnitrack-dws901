/**
 * Pone en res.locals lo que usan todas las vistas:
 * - usuarioActual: solo { id, nombre, rol } del usuario en sesión (nunca password_hash, RN-08).
 * - mensajes: flash de éxito y error.
 * - errores / datos: errores por campo y datos ingresados de un formulario
 *   que no pasó la validación (los deja errorHandler.js al regresar).
 * - csrfToken: para el campo oculto _csrf de los formularios.
 * - rutaActual: para marcar la opción activa del menú.
 * - clienteEnPortal: el cliente validó folio + teléfono (la barra muestra "Cliente").
 */
const { generarTokenCsrf } = require('./csrf');

/** Copia solo los campos públicos del usuario guardado en la sesión. */
function usuarioPublico(usuario) {
  if (!usuario) return null;
  const { id, nombre, rol } = usuario;
  return { id, nombre, rol };
}

/** Lee (y consume) un tipo de flash solo si existe, para no modificar la sesión sin necesidad. */
function leerFlash(req, tipo) {
  const pendientes = req.session && req.session.flash;
  return pendientes && pendientes[tipo] ? req.flash(tipo) : [];
}

function variablesVistas(req, res, next) {
  res.locals.usuarioActual = usuarioPublico(req.session.usuario);
  res.locals.mensajes = { exito: leerFlash(req, 'exito'), error: leerFlash(req, 'error') };
  res.locals.errores = leerFlash(req, 'errores')[0] || {};
  res.locals.datos = leerFlash(req, 'datos')[0] || {};
  res.locals.csrfToken = generarTokenCsrf(req, res);
  res.locals.rutaActual = req.path;
  res.locals.clienteEnPortal = Boolean(req.session.clienteTicketId);
  next();
}

/**
 * Valores por defecto para cuando el error ocurrió antes de variablesVistas
 * (ej. token CSRF inválido o cuerpo mal formado) y aun así hay que renderizar
 * una vista con el layout.
 */
function asegurarVariablesVistas(req, res) {
  const { locals } = res;
  if (locals.usuarioActual === undefined) {
    locals.usuarioActual = usuarioPublico(req.session && req.session.usuario);
  }
  locals.mensajes = locals.mensajes || { exito: [], error: [] };
  locals.errores = locals.errores || {};
  locals.datos = locals.datos || {};
  locals.rutaActual = locals.rutaActual || req.path;
  if (locals.csrfToken === undefined) {
    try {
      locals.csrfToken = req.session ? generarTokenCsrf(req, res) : '';
    } catch {
      locals.csrfToken = '';
    }
  }
}

module.exports = { variablesVistas, asegurarVariablesVistas, usuarioPublico };
