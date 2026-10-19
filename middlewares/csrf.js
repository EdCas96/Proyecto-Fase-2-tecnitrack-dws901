/**
 * Protección CSRF con csrf-csrf (patrón "double submit cookie" ligado a la sesión).
 *
 * - El token se guarda en una cookie httpOnly y se repite en cada formulario
 *   (campo oculto _csrf), en la cabecera X-CSRF-Token o, para formularios
 *   multipart (fotos), en la query string ?_csrf=..., porque esos cuerpos los
 *   lee Multer después de esta verificación.
 * - El token se firma con SESSION_SECRET y el id de sesión: tras
 *   session.regenerate() (login) el token anterior deja de ser válido y
 *   generarTokenCsrf() emite uno nuevo automáticamente.
 * - GET, HEAD y OPTIONS no se verifican; por eso method-override solo permite
 *   convertir POST en PUT/PATCH/DELETE.
 */
const { doubleCsrf } = require('csrf-csrf');
const { entorno, secretoSesion } = require('../config/env');

const enProduccion = entorno === 'production';

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => secretoSesion,
  getSessionIdentifier: (req) => req.session.id,
  // El prefijo __Host- exige HTTPS, así que solo se usa en producción
  cookieName: enProduccion ? '__Host-tecnitrack.csrf' : 'tecnitrack.csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: enProduccion,
    path: '/',
  },
  getCsrfTokenFromRequest: (req) => (req.body && req.body._csrf)
    || req.headers['x-csrf-token']
    || (req.query && req.query._csrf),
});

/**
 * Devuelve el token CSRF de la petición (reutiliza el de la cookie si sigue
 * siendo válido para la sesión actual; si no, genera uno nuevo).
 * Marca la sesión para que se guarde: el token se liga a su id, y una sesión
 * sin guardar cambiaría de id en la siguiente petición.
 */
function generarTokenCsrf(req, res) {
  if (!req.session.iniciadaEn) req.session.iniciadaEn = Date.now();
  return generateCsrfToken(req, res);
}

module.exports = { proteccionCsrf: doubleCsrfProtection, generarTokenCsrf };
