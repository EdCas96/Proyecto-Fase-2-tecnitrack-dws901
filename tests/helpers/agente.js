/**
 * Agente de Supertest con sesión y token CSRF, para probar formularios y rutas
 * protegidas. El agente conserva las cookies (tecnitrack.sid y tecnitrack.csrf)
 * entre peticiones, igual que un navegador.
 *
 * Uso típico:
 *
 *   const { agente, csrfToken } = await crearAgenteAutenticado({ correo, password });
 *   await agente.post('/clientes').type('form').send({ _csrf: csrfToken, nombre: '...' });
 */
const request = require('supertest');
const app = require('../../app');

/** Contraseña de los usuarios de los seeders (README: usuarios de prueba). */
const PASSWORD_PRUEBA = 'Tecni2026!';

/** Usuarios de los seeders (seeders/20261018000101-usuarios.js). */
const USUARIOS = Object.freeze({
  admin: { id: 1, correo: 'admin@tecnitrack.com' },
  luis: { id: 2, correo: 'luis.fernandez@tecnitrack.com' },
  jorge: { id: 3, correo: 'jorge.pineda@tecnitrack.com' },
  oscarInactivo: { id: 4, correo: 'oscar.melendez@tecnitrack.com' },
});

/** Ticket de los seeders para el portal: Ana Lucía Martínez, Esperando aprobación. */
const TICKET_PORTAL = Object.freeze({ id: 5, folio: 'TT-2026-0040', telefono: '7345-6720' });

/**
 * Página pública que siempre se renderiza (con o sin sesión) y de la que se
 * puede leer el token CSRF; "/" y "/login" redirigen si ya hay sesión.
 */
const PAGINA_TOKEN = '/portal';

/** Crea un agente nuevo, sin sesión. */
function crearAgente() {
  return request.agent(app);
}

/**
 * Visita una página y lee el token CSRF de <meta name="csrf-token"> (partials/head.ejs).
 * La visita también deja en el agente las cookies de sesión y CSRF.
 *
 * @param {import('supertest').SuperAgentTest} agente
 * @param {string} [ruta] Página que se visita para obtener el token.
 * @returns {Promise<string>} Token para el campo _csrf o la cabecera X-CSRF-Token.
 */
async function obtenerTokenCsrf(agente, ruta = PAGINA_TOKEN) {
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
  const token = await obtenerTokenCsrf(agente);
  const respuesta = await agente
    .post('/login')
    .type('form')
    .send({ _csrf: token, correo, password });
  const csrfToken = await obtenerTokenCsrf(agente);
  return { respuesta, csrfToken };
}

/**
 * Entra al portal del cliente con folio + teléfono.
 *
 * @param {import('supertest').SuperAgentTest} agente
 * @param {{folio?: string, telefono?: string}} [datos] Por defecto, el ticket TT-2026-0040.
 */
async function entrarAlPortal(agente, { folio = TICKET_PORTAL.folio, telefono = TICKET_PORTAL.telefono } = {}) {
  const token = await obtenerTokenCsrf(agente);
  return agente.post('/portal').type('form').send({ _csrf: token, folio, telefono });
}

/** Atajo: agente nuevo que ya inició sesión. */
async function crearAgenteAutenticado(credenciales) {
  const agente = crearAgente();
  const { respuesta, csrfToken } = await iniciarSesion(agente, credenciales);
  return { agente, respuesta, csrfToken };
}

module.exports = {
  PASSWORD_PRUEBA,
  USUARIOS,
  TICKET_PORTAL,
  entrarAlPortal,
  crearAgente,
  obtenerTokenCsrf,
  iniciarSesion,
  crearAgenteAutenticado,
};
