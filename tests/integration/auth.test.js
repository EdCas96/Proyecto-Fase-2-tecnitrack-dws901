/**
 * Autenticación y control de acceso (Paso 4): login y logout del personal,
 * revalidación de la sesión, matriz de permisos por rol, portal del cliente
 * y rate limit. Usa los datos de los seeders (usuarios, clientes y tickets).
 */
const request = require('supertest');
const app = require('../../app');
const { sequelize, Usuario } = require('../../models');
const { PREFIJOS } = require('../../routes');
const AuthService = require('../../services/AuthService');
const { reiniciarIntentos } = require('../../middlewares/limitarIntentos');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const {
  PASSWORD_PRUEBA, USUARIOS, TICKET_PORTAL,
  crearAgente, obtenerTokenCsrf, iniciarSesion, crearAgenteAutenticado, entrarAlPortal,
} = require('../helpers/agente');

beforeAll(sembrarDatos);
beforeEach(reiniciarIntentos);
afterAll(cerrarConexiones);

/** Texto de las alertas de error de una página (partials/flash.ejs). */
const alertasError = (html) => [...html.matchAll(/<div class="alert alert-error" role="alert">\s*([^<]+?)\s*</g)]
  .map(([, texto]) => texto);

/** Datos guardados en la tabla sesiones (JSON de express-session). */
async function sesionesGuardadas() {
  const [filas] = await sequelize.query('SELECT data FROM sesiones');
  return filas.map(({ data }) => JSON.parse(data));
}

/** Intenta iniciar sesión con un agente nuevo y devuelve la respuesta. */
async function intentarLogin(correo, password) {
  const agente = crearAgente();
  const { respuesta } = await iniciarSesion(agente, { correo, password });
  return respuesta;
}

describe('Inicio de sesión (HU-09, RF-10, RN-07, RN-08)', () => {
  test('GET /login muestra el formulario como el prototipo, con el acceso al portal', async () => {
    const respuesta = await request(app).get('/login');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('TecniTrack');
    expect(respuesta.text).toContain('name="correo"');
    expect(respuesta.text).toContain('name="password"');
    expect(respuesta.text).toMatch(/<a class="btn btn-secondary" href="\/portal">Consultar mi ticket \(Cliente\)<\/a>/);
  });

  test('el admin entra y es redirigido a /admin, donde ve su nombre', async () => {
    const { agente, respuesta } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/admin');
    const panel = await agente.get('/admin');
    expect(panel.status).toBe(200);
    expect(panel.text).toContain('Bienvenido, Administrador Principal');
  });

  test('el técnico entra y es redirigido a /tecnico, donde ve su nombre', async () => {
    const { agente, respuesta } = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });

    expect(respuesta.headers.location).toBe('/tecnico');
    const panel = await agente.get('/tecnico');
    expect(panel.status).toBe(200);
    expect(panel.text).toContain('Bienvenido, Luis Fernández');
    expect(panel.text).toContain('Técnico · Luis Fernández');
  });

  test('el correo no distingue mayúsculas ni espacios', async () => {
    const respuesta = await intentarLogin('  ADMIN@TecniTrack.com ', PASSWORD_PRUEBA);

    expect(respuesta.headers.location).toBe('/admin');
  });

  test('contraseña incorrecta y correo inexistente dan el MISMO mensaje genérico', async () => {
    const malaPassword = await intentarLogin(USUARIOS.admin.correo, 'NoEsLaClave1');
    const correoInexistente = await intentarLogin('nadie@tecnitrack.com', PASSWORD_PRUEBA);

    expect(malaPassword.status).toBe(401);
    expect(correoInexistente.status).toBe(401);
    expect(alertasError(malaPassword.text)).toEqual(['Credenciales incorrectas']);
    expect(alertasError(correoInexistente.text)).toEqual(alertasError(malaPassword.text));
  });

  test('tras un fallo, el formulario conserva el correo pero nunca la contraseña', async () => {
    const respuesta = await intentarLogin(USUARIOS.admin.correo, 'NoEsLaClave1');

    expect(respuesta.text).toContain(`value="${USUARIOS.admin.correo}"`);
    expect(respuesta.text).not.toContain('NoEsLaClave1');
  });

  test('el técnico inactivo (Óscar Meléndez) no puede iniciar sesión', async () => {
    const agente = crearAgente();
    const { respuesta } = await iniciarSesion(agente, { correo: USUARIOS.oscarInactivo.correo });

    expect(respuesta.status).toBe(401);
    expect(alertasError(respuesta.text)).toEqual(['Cuenta desactivada, contacte al administrador']);
    const panel = await agente.get('/tecnico');
    expect(panel.headers.location).toBe('/login');
  });

  test('la cuenta desactivada solo se informa si la contraseña es correcta', async () => {
    const respuesta = await intentarLogin(USUARIOS.oscarInactivo.correo, 'NoEsLaClave1');

    expect(alertasError(respuesta.text)).toEqual(['Credenciales incorrectas']);
  });

  test('un correo con formato inválido regresa al formulario con el error del campo', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente, '/login');
    const respuesta = await agente
      .post('/login')
      .set('Host', 'tecnitrack.local')
      .set('Referer', 'http://tecnitrack.local/login')
      .type('form')
      .send({ _csrf: token, correo: 'no-es-correo', password: 'x' });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/login');
    const formulario = await agente.get('/login');
    expect(formulario.text).toContain('Ingresa un correo válido.');
    expect(formulario.text).toContain('value="no-es-correo"');
  });

  test('campos vacíos: correo y contraseña son obligatorios', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente, '/login');
    const respuesta = await agente
      .post('/login')
      .set('Accept', 'application/json')
      .send({ _csrf: token, correo: '', password: '' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({
      correo: 'El correo es obligatorio.',
      password: 'La contraseña es obligatoria.',
    });
  });

  test('el login regenera la sesión: el id de sesión cambia (evita la fijación de sesión)', async () => {
    const agente = crearAgente();
    const visita = await agente.get('/login');
    const cookieAntes = visita.headers['set-cookie'].find((c) => c.startsWith('tecnitrack.sid='));
    const { respuesta } = await iniciarSesion(agente, { correo: USUARIOS.admin.correo });
    const cookieDespues = respuesta.headers['set-cookie'].find((c) => c.startsWith('tecnitrack.sid='));

    expect(cookieDespues).toBeDefined();
    expect(cookieDespues.split(';')[0]).not.toBe(cookieAntes.split(';')[0]);
  });

  test('la sesión guarda solo { id, nombre, rol } del usuario', async () => {
    await sequelize.query('DELETE FROM sesiones');
    await crearAgenteAutenticado({ correo: USUARIOS.jorge.correo });

    const [sesion] = await sesionesGuardadas();
    expect(sesion.usuario).toEqual({ id: USUARIOS.jorge.id, nombre: 'Jorge Pineda', rol: 'tecnico' });
  });

  test('ni las respuestas del login ni la sesión contienen password_hash (RN-08)', async () => {
    const fallo = await intentarLogin(USUARIOS.admin.correo, 'NoEsLaClave1');
    const { agente, respuesta } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
    const panel = await agente.get('/admin');
    const sesiones = JSON.stringify(await sesionesGuardadas());

    for (const texto of [fallo.text, respuesta.text, JSON.stringify(respuesta.headers), panel.text, sesiones]) {
      expect(texto).not.toMatch(/password_hash|\$2[aby]\$/);
    }
  });

  test('AuthService.login devuelve el usuario sin password_hash', async () => {
    const usuario = await AuthService.login(USUARIOS.admin.correo, PASSWORD_PRUEBA);

    expect(usuario).toMatchObject({ id: 1, rol: 'admin', activo: true });
    expect(usuario).not.toHaveProperty('password_hash');
  });

  test('con sesión abierta, /login y / llevan al panel del rol', async () => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });

    expect((await agente.get('/login')).headers.location).toBe('/tecnico');
    expect((await agente.get('/')).headers.location).toBe('/tecnico');
  });
});

describe('Cierre de sesión', () => {
  test('después del logout, /tecnico vuelve a pedir login', async () => {
    const { agente, csrfToken } = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });
    expect((await agente.get('/tecnico')).status).toBe(200);

    const salida = await agente.post('/logout').type('form').send({ _csrf: csrfToken });

    expect(salida.status).toBe(303);
    expect(salida.headers.location).toBe('/login?sesion=cerrada');
    expect(salida.headers['set-cookie'].join(';')).toMatch(/tecnitrack\.sid=;/);
    const despues = await agente.get('/tecnico');
    expect(despues.status).toBe(303);
    expect(despues.headers.location).toBe('/login');
  });

  test('el logout elimina la sesión de la tabla sesiones y muestra un mensaje', async () => {
    await sequelize.query('DELETE FROM sesiones');
    const { agente, csrfToken } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });

    expect(await sesionesGuardadas()).toHaveLength(1);

    const salida = await agente.post('/logout').type('form').send({ _csrf: csrfToken });

    expect(await sesionesGuardadas()).toEqual([]);
    const login = await request(app).get(salida.headers.location);
    expect(login.text).toContain('Cerraste sesión correctamente.');
  });

  test('el logout exige el token CSRF', async () => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });

    const salida = await agente.post('/logout').type('form').send({});

    expect(salida.status).toBe(403);
    expect((await agente.get('/admin')).status).toBe(200);
  });

  test('las páginas autenticadas no se guardan en caché (botón "atrás" tras cerrar sesión)', async () => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });

    const respuesta = await agente.get('/admin');

    expect(respuesta.headers['cache-control']).toMatch(/no-store/);
    expect(respuesta.headers.pragma).toBe('no-cache');
    expect(respuesta.headers.expires).toBe('0');
  });
});

describe('Revalidación de la sesión en cada petición (RN-07)', () => {
  afterEach(() => Usuario.update({ activo: true }, { where: { id: USUARIOS.jorge.id } }));

  test('si el admin desactiva a un técnico con sesión abierta, su siguiente petición lo saca', async () => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.jorge.correo });
    expect((await agente.get('/tecnico')).status).toBe(200);

    await Usuario.update({ activo: false }, { where: { id: USUARIOS.jorge.id } });

    const respuesta = await agente.get('/tecnico');
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/login');
    const login = await agente.get('/login');
    expect(login.text).toContain('Tu sesión se cerró porque la cuenta fue desactivada.');
    // Aunque lo reactiven, la sesión anterior ya no existe
    await Usuario.update({ activo: true }, { where: { id: USUARIOS.jorge.id } });
    expect((await agente.get('/tecnico')).headers.location).toBe('/login');
  });

  test('si el usuario fue eliminado de la base, también se cierra su sesión', async () => {
    const usuario = await Usuario.create({
      nombre: 'Temporal', correo: 'temporal@tecnitrack.com', rol: 'tecnico',
      password_hash: await AuthService.hashPassword('Temporal123'),
    });
    const { agente } = await crearAgenteAutenticado({ correo: 'temporal@tecnitrack.com', password: 'Temporal123' });
    await usuario.destroy();

    expect((await agente.get('/tecnico')).headers.location).toBe('/login');
  });
});

describe('Matriz de permisos (RN-02)', () => {
  test('sin sesión, /admin redirige a /login', async () => {
    const respuesta = await request(app).get('/admin');

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/login');
  });

  test('sin sesión, una petición JSON recibe 401', async () => {
    const respuesta = await request(app).get('/tickets').set('Accept', 'application/json');

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({ error: 'AuthError', mensaje: 'Inicia sesión para continuar.' });
  });

  test.each(['/admin', '/usuarios', '/reportes'])('un técnico que entra a %s recibe 403', async (ruta) => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });

    const respuesta = await agente.get(ruta);

    expect(respuesta.status).toBe(403);
    expect(respuesta.text).toContain('No tienes permiso para acceder a esta sección');
  });

  test.each(['/tickets', '/cotizaciones', '/notificaciones', '/clientes', '/clientes/1', '/catalogo'])(
    'un técnico sí puede consultar %s',
    async (ruta) => {
      const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });

      expect((await agente.get(ruta)).status).toBe(200);
    },
  );

  test.each(['/clientes', '/equipos', '/catalogo'])('un técnico no puede modificar %s (solo lectura)', async (ruta) => {
    const { agente, csrfToken } = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });

    const respuesta = await agente.post(ruta).set('Accept', 'application/json').send({ _csrf: csrfToken });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.mensaje).toBe('No tienes permiso para acceder a esta sección');
  });

  test('el admin puede entrar a todos los módulos', async () => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
    const protegidos = PREFIJOS.filter((prefijo) => !['/', '/portal'].includes(prefijo));

    // /equipos no tiene listado propio: redirige al de clientes
    for (const prefijo of protegidos) {
      const respuesta = await agente.get(prefijo);
      const esperado = prefijo === '/equipos' ? 303 : 200;
      expect([prefijo, respuesta.status]).toEqual([prefijo, esperado]);
    }
  });

  test('las escrituras del admin pasan el control de acceso', async () => {
    const { agente, csrfToken } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });

    // Sin datos: el 400 de validación demuestra que el permiso lo dejó pasar
    const respuesta = await agente.post('/clientes').set('Accept', 'application/json').send({ _csrf: csrfToken });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBe('ValidationError');
  });

  test('con sesión de admin, la barra muestra el submenú, las migas y el botón de cerrar sesión', async () => {
    const { agente } = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });

    const respuesta = await agente.get('/clientes');

    expect(respuesta.text).toContain('class="subnav"');
    expect(respuesta.text).toContain('<a href="/clientes" class="active" aria-current="page">Clientes</a>');
    expect(respuesta.text).toContain('<a href="/admin">Administrador</a>');
    expect(respuesta.text).toContain('<span aria-current="page">Clientes</span>');
    expect(respuesta.text).toContain('action="/logout"');
  });
});

describe('Portal del cliente (HU-04)', () => {
  test('GET /portal muestra el formulario de folio y teléfono', async () => {
    const respuesta = await request(app).get('/portal');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('name="folio"');
    expect(respuesta.text).toContain('name="telefono"');
  });

  test('folio y teléfono correctos dan acceso al ticket', async () => {
    const agente = crearAgente();
    const respuesta = await entrarAlPortal(agente);

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/portal/ticket');
    const ticket = await agente.get('/portal/ticket');
    expect(ticket.status).toBe(200);
    expect(ticket.text).toContain('Ticket TT-2026-0040 · Ana Lucía Martínez');
    expect(ticket.text).toContain('<span class="badge badge-ambar badge-lg">Esperando aprobación</span>');
    expect(ticket.text).toContain('Laptop Lenovo ThinkPad E14');
    expect(ticket.headers['cache-control']).toMatch(/no-store/);
  });

  test('el teléfono se compara sin guiones ni espacios, y el folio sin importar mayúsculas', async () => {
    const respuesta = await entrarAlPortal(crearAgente(), { folio: 'tt-2026-0040', telefono: '7345 6720' });

    expect(respuesta.headers.location).toBe('/portal/ticket');
  });

  test('la sesión del cliente guarda solo clienteTicketId', async () => {
    await sequelize.query('DELETE FROM sesiones');
    await entrarAlPortal(crearAgente());

    const [sesion] = await sesionesGuardadas();
    expect(sesion.clienteTicketId).toBe(TICKET_PORTAL.id);
    expect(sesion.usuario).toBeUndefined();
  });

  test('teléfono incorrecto y folio inexistente dan el mismo mensaje genérico', async () => {
    const malTelefono = await entrarAlPortal(crearAgente(), { telefono: '7000-0000' });
    const sinFolio = await entrarAlPortal(crearAgente(), { folio: 'TT-2026-9999' });
    const telefonoDeOtro = await entrarAlPortal(crearAgente(), { telefono: '7123-4567' });

    for (const respuesta of [malTelefono, sinFolio, telefonoDeOtro]) {
      expect(respuesta.status).toBe(401);
      expect(alertasError(respuesta.text)).toEqual(['No se encontró un ticket con esos datos']);
    }
  });

  test('un folio con formato inválido se rechaza con el formato esperado', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente);
    const respuesta = await agente
      .post('/portal')
      .set('Accept', 'application/json')
      .send({ _csrf: token, folio: '2026-40', telefono: '7345-6720' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.folio).toMatch(/TT-AAAA-NNNN/);
  });

  test('sin validar folio y teléfono, /portal/ticket regresa al formulario', async () => {
    const respuesta = await request(app).get('/portal/ticket');

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/portal');
  });

  test.each(['/tecnico', '/admin', '/tickets'])('el cliente no puede entrar a %s', async (ruta) => {
    const agente = crearAgente();
    await entrarAlPortal(agente);

    const respuesta = await agente.get(ruta);

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/login');
  });

  test('"Salir" cierra el acceso del cliente', async () => {
    const agente = crearAgente();
    await entrarAlPortal(agente);
    const token = await obtenerTokenCsrf(agente);

    await agente.post('/portal/salir').type('form').send({ _csrf: token });

    expect((await agente.get('/portal/ticket')).headers.location).toBe('/portal');
  });
});

describe('Rate limit (5 intentos fallidos cada 15 minutos)', () => {
  test('tras 5 logins fallidos, el sexto responde 429 con mensaje en español', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente);
    const intentar = () => agente.post('/login').type('form')
      .send({ _csrf: token, correo: USUARIOS.admin.correo, password: 'NoEsLaClave1' });

    for (let i = 0; i < 5; i += 1) {
      expect((await intentar()).status).toBe(401);
    }
    const bloqueado = await intentar();

    expect(bloqueado.status).toBe(429);
    expect(bloqueado.text).toContain('Demasiados intentos de inicio de sesión. Espera 15 minutos');
    // Bloquea también la contraseña correcta mientras dure la ventana
    const correcto = await agente.post('/login').type('form')
      .send({ _csrf: token, correo: USUARIOS.admin.correo, password: PASSWORD_PRUEBA });
    expect(correcto.status).toBe(429);
  });

  test('los inicios de sesión correctos no consumen intentos', async () => {
    for (let i = 0; i < 6; i += 1) {
      const respuesta = await intentarLogin(USUARIOS.admin.correo, PASSWORD_PRUEBA);
      expect(respuesta.status).toBe(303);
    }
  });

  test('el portal también se bloquea tras 5 consultas fallidas (JSON: 429)', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente);
    const consultar = () => agente.post('/portal').set('Accept', 'application/json')
      .send({ _csrf: token, folio: TICKET_PORTAL.folio, telefono: '7000-0000' });

    for (let i = 0; i < 5; i += 1) await consultar();
    const bloqueado = await consultar();

    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.mensaje).toBe('Demasiadas consultas fallidas. Espera 15 minutos e inténtalo de nuevo.');
  });
});
