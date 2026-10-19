/**
 * Versiones con promesas de los métodos de express-session (que usan callbacks),
 * para poder usarlos con async/await en controladores y middlewares.
 */

/** Nombre de la cookie de sesión (config/sesion.js). */
const COOKIE_SESION = 'tecnitrack.sid';

/** Cambia el id de sesión y borra sus datos (evita la fijación de sesión). */
const regenerarSesion = (req) => new Promise((resolve, reject) => {
  req.session.regenerate((error) => (error ? reject(error) : resolve()));
});

/** Guarda la sesión antes de redirigir, para que la siguiente petición ya la vea. */
const guardarSesion = (req) => new Promise((resolve, reject) => {
  req.session.save((error) => (error ? reject(error) : resolve()));
});

/** Elimina la sesión del almacén (tabla sesiones). */
const destruirSesion = (req) => new Promise((resolve, reject) => {
  req.session.destroy((error) => (error ? reject(error) : resolve()));
});

module.exports = {
  COOKIE_SESION, regenerarSesion, guardarSesion, destruirSesion,
};
