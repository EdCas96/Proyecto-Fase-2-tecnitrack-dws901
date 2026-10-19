/**
 * Manejador central de errores (siempre el último middleware de app.js).
 *
 * 1. Traduce el error a un AppError (utils/traducirError.js); lo que no se
 *    reconoce se responde como 500 con un mensaje genérico.
 * 2. Si la petición espera JSON responde { error, mensaje } (y "errores" por campo).
 * 3. ValidationError y BusinessRuleError de un formulario (POST/PUT/PATCH/DELETE)
 *    regresan a la página anterior con el mensaje en flash y los datos ingresados.
 * 4. En los demás casos renderiza views/errores/<código>.ejs con el layout.
 *
 * El stack nunca se envía al navegador (en ningún entorno); solo se registra en consola.
 */
const {
  AppError, AuthError, ValidationError, BusinessRuleError,
} = require('../utils/errors');
const traducirError = require('../utils/traducirError');
const { asegurarVariablesVistas } = require('./variablesVistas');
const { entorno } = require('../config/env');

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';
const VISTAS = [400, 403, 404, 422, 429, 500];
const TITULOS = {
  400: 'Datos no válidos',
  403: 'Acceso denegado',
  404: 'Página no encontrada',
  422: 'Operación no permitida',
  429: 'Demasiados intentos',
  500: 'Error del servidor',
};
// Campos que nunca se devuelven al formulario
const CAMPOS_PRIVADOS = /^(_csrf|_method)$|password|contrasena|contraseña/i;

/** La petición viene de JavaScript o de un cliente de API y no de un navegador. */
function esperaJson(req) {
  return req.xhr
    || req.path.startsWith('/api/')
    || req.accepts(['html', 'json']) === 'json';
}

/** Ruta interna a la que regresar: el Referer si es del mismo sitio; si no, la raíz. */
function urlAnterior(req) {
  const referer = req.get('Referer');
  if (!referer) return '/';
  try {
    const url = new URL(referer);
    return url.host === req.get('host') ? `${url.pathname}${url.search}` : '/';
  } catch {
    return '/';
  }
}

/** Datos del formulario para volver a llenarlo, sin contraseñas ni tokens. */
function datosParaReingresar(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return {};
  return Object.fromEntries(Object.entries(cuerpo).filter(([campo]) => !CAMPOS_PRIVADOS.test(campo)));
}

/**
 * Los 500 se registran siempre (también en pruebas, para que un fallo inesperado
 * no pase en silencio); los 4xx solo en desarrollo.
 */
function registrar(err, statusCode) {
  if (statusCode >= 500) {
    console.error(err);
  } else if (entorno === 'development') {
    console.warn(`[Error ${statusCode}] ${err.message}`);
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const error = traducirError(err) || new AppError(MENSAJE_GENERICO, 500);
  const { statusCode } = error;
  const mensaje = statusCode >= 500 ? MENSAJE_GENERICO : error.message;
  const errores = (error.detalles && error.detalles.errores) || {};
  registrar(err, statusCode);

  if (esperaJson(req)) {
    const cuerpo = { error: error.name, mensaje };
    if (Object.keys(errores).length) cuerpo.errores = errores;
    if (statusCode === 404 && error.detalles && error.detalles.ruta) cuerpo.ruta = error.detalles.ruta;
    return res.status(statusCode).json(cuerpo);
  }

  const puedeRegresar = typeof req.flash === 'function' && req.method !== 'GET' && req.method !== 'HEAD';

  if (puedeRegresar && (error instanceof ValidationError || error instanceof BusinessRuleError)) {
    req.flash('error', mensaje);
    if (Object.keys(errores).length) req.flash('errores', errores);
    req.flash('datos', datosParaReingresar(req.body));
    return res.redirect(303, urlAnterior(req));
  }

  if (error instanceof AuthError && typeof req.flash === 'function') {
    req.flash('error', mensaje);
    return res.redirect(303, '/login');
  }

  const vista = VISTAS.includes(statusCode) ? statusCode : (statusCode >= 500 ? 500 : 400);
  asegurarVariablesVistas(req, res);
  return res.status(statusCode).render(`errores/${vista}`, {
    titulo: TITULOS[vista],
    statusCode,
    mensaje,
  }, (errorVista, html) => {
    // Si la propia vista falla, se responde texto plano para no entrar en un ciclo
    if (errorVista) {
      registrar(errorVista, 500);
      return res.type('text').send(mensaje);
    }
    return res.send(html);
  });
}

module.exports = errorHandler;
module.exports.esperaJson = esperaJson;
module.exports.urlAnterior = urlAnterior;
