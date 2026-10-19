/**
 * Agente de Supertest con sesión y token CSRF, para probar formularios y rutas
 * protegidas. El agente conserva las cookies (tecnitrack.sid y tecnitrack.csrf)
 * entre peticiones, igual que un navegador.
 *
 * Uso típico (desde el Paso 4, cuando exista POST /auth/login):
 *
 *   const { agente, csrfToken } = await crearAgenteAutenticado({ correo, password });
 *   await agente.post('/clientes').type('form').send({ _csrf: csrfToken, nombre: '...' });
 */
const request = require('supertest');
const app = require('../../app');

/** Contraseña de los usuarios de los seeders (README: usuarios de prueba). */
const PASSWORD_PRUEBA = 'Tecni2026!';

/** Crea un agente nuevo, sin sesión. */
function crearAgente() {
  return request.agent(app);
}

/**
 * Visita una página y lee el token CSRF de <meta name="csrf-token"> (partials/head.ejs).
 * La visita también deja en el agente las cookies de sesión y CSRF.
 *
 * @param {import('supertest').SuperAgentTest} agente
 * @param {string} [ruta='/'] Página que se visita para obtener el token.
 * @returns {Promise<string>} Token para el campo _csrf o la cabecera X-CSRF-Token.
 */
async function obtenerTokenCsrf(agente, ruta = '/') {
  const respuesta = await agente.get(ruta);
  const coincidencia = /<meta name="csrf-token" content="([^"]+)">/.exec(respuesta.text);
  if (!coincidencia) {
    throw new Error(`No se encontró el token CSRF en GET ${ruta} (estado ${respuesta.status}).`);
  }
  return coincidencia[1];
}

/**
 * Inicia sesión con el formulario de login y devuelve un token CSRF nuevo:
 * el login regenera la sesión, y el token anterior queda ligado a la sesión vieja.
 *
 * @param {import('supertest').SuperAgentTest} agente
 * @param {{correo: string, password?: string}} credenciales
 * @returns {Promise<{respuesta: import('supertest').Response, csrfToken: string}>}
 */
async function iniciarSesion(agente, { correo, password = PASSWORD_PRUEBA }) {
  const token = await obtenerTokenCsrf(agente, '/auth/login');
  const respuesta = await agente
    .post('/auth/login')
    .type('form')
    .send({ _csrf: token, correo, password });
  const csrfToken = await obtenerTokenCsrf(agente);
  return { respuesta, csrfToken };
}

/** Atajo: agente nuevo que ya inició sesión. */
async function crearAgenteAutenticado(credenciales) {
  const agente = crearAgente();
  const { respuesta, csrfToken } = await iniciarSesion(agente, credenciales);
  return { agente, respuesta, csrfToken };
}

module.exports = {
  PASSWORD_PRUEBA,
  crearAgente,
  obtenerTokenCsrf,
  iniciarSesion,
  crearAgenteAutenticado,
};
