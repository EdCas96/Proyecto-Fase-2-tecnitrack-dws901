/**
 * Rate limit (express-rate-limit) del login y del portal del cliente, contra
 * ataques de fuerza bruta a contraseñas y a combinaciones folio + teléfono.
 *
 * - Cuenta solo los intentos fallidos (respuestas 4xx/5xx) por IP; un login
 *   correcto no consume intentos.
 * - Límite y ventana configurables con LIMITE_INTENTOS y VENTANA_INTENTOS_MIN
 *   (.env); LIMITE_INTENTOS=0 lo desactiva.
 * - Cada limitador guarda sus contadores en memoria (se reinician al
 *   reiniciar el servidor); las pruebas los vacían con reiniciarIntentos().
 */
const { rateLimit, MemoryStore } = require('express-rate-limit');
const { AppError } = require('../utils/errors');
const { limiteIntentos, ventanaIntentosMin } = require('../config/env');

const almacenes = [];

/**
 * @param {string} mensaje Mensaje en español cuando se supera el límite.
 * @param {{max?: number, ventanaMin?: number}} [opciones]
 * @returns {import('express').RequestHandler}
 */
function crearLimitador(mensaje, { max = limiteIntentos, ventanaMin = ventanaIntentosMin } = {}) {
  if (!max) return (req, res, next) => next();

  const store = new MemoryStore();
  almacenes.push(store);
  return rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: max,
    store,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Responde con el manejador central (vista errores/429 o JSON)
    handler: (req, res, next) => next(new AppError(mensaje, 429)),
  });
}

const minutos = `${ventanaIntentosMin} minutos`;

const limitarLogin = crearLimitador(
  `Demasiados intentos de inicio de sesión. Espera ${minutos} e inténtalo de nuevo.`,
);

const limitarPortal = crearLimitador(
  `Demasiadas consultas fallidas. Espera ${minutos} e inténtalo de nuevo.`,
);

/** Vacía los contadores de todos los limitadores (para las pruebas). */
async function reiniciarIntentos() {
  await Promise.all(almacenes.map((store) => store.resetAll()));
}

module.exports = {
  limitarLogin, limitarPortal, crearLimitador, reiniciarIntentos,
};
