/**
 * Cadena de middlewares de app.js: 404, CSRF, sesión, method-override,
 * límite de tamaño, ruteo modular y vistas base.
 */
const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../models');
const { PREFIJOS } = require('../../routes');
const { limpiarBaseDatos, cerrarConexiones } = require('../helpers/baseDatos');
const { crearAgente, obtenerTokenCsrf } = require('../helpers/agente');

beforeAll(limpiarBaseDatos);
afterAll(cerrarConexiones);

describe('Rutas inexistentes (notFound + errorHandler)', () => {
  test('desde el navegador responde 404 con la vista de error y el layout', async () => {
    const respuesta = await request(app).get('/ruta-que-no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta.headers['content-type']).toMatch(/text\/html/);
    expect(respuesta.text).toContain('Página no encontrada');
    expect(respuesta.text).toContain('class="navbar"');
  });

  test('una petición JSON recibe JSON { error, mensaje }', async () => {
    const respuesta = await request(app).get('/api/no-existe').set('Accept', 'application/json');

    expect(respuesta.status).toBe(404);
    expect(respuesta.headers['content-type']).toMatch(/application\/json/);
    expect(respuesta.body).toEqual({
      error: 'NotFoundError',
      mensaje: 'La página que buscas no existe.',
      ruta: 'GET /api/no-existe',
    });
  });

  test('nunca envía el stack al cliente', async () => {
    const respuesta = await request(app).get('/no-existe').set('Accept', 'application/json');

    expect(JSON.stringify(respuesta.body)).not.toMatch(/stack|at .*\.js/);
  });
});

describe('Protección CSRF', () => {
  test('un POST sin token es rechazado con 403 y un mensaje en español', async () => {
    const respuesta = await request(app).post('/clientes').type('form').send({ nombre: 'Intruso' });

    expect(respuesta.status).toBe(403);
    expect(respuesta.text).toContain('Acceso denegado');
    expect(respuesta.text).toContain('El formulario expiró o no es válido');
  });

  test('un POST JSON sin token recibe 403 en JSON', async () => {
    const respuesta = await request(app).post('/clientes').set('Accept', 'application/json').send({});

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.error).toBe('ForbiddenError');
  });

  test('un token de otra sesión no sirve', async () => {
    const tokenAjeno = await obtenerTokenCsrf(crearAgente());
    const agente = crearAgente();
    await agente.get('/');

    const respuesta = await agente.post('/clientes').type('form').send({ _csrf: tokenAjeno });

    expect(respuesta.status).toBe(403);
  });

  test('con el token de su sesión (campo _csrf) la petición pasa el filtro', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente);

    // No existe POST /no-existe: llegar al 404 demuestra que CSRF lo dejó pasar
    const respuesta = await agente.post('/no-existe').type('form').send({ _csrf: token });

    expect(respuesta.status).toBe(404);
  });

  test('también acepta el token en la cabecera X-CSRF-Token', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente);

    const respuesta = await agente.post('/no-existe').set('X-CSRF-Token', token).send({});

    expect(respuesta.status).toBe(404);
  });
});

describe('Sesión', () => {
  test('la cookie de sesión es httpOnly, sameSite=lax, dura 8 horas y no es secure fuera de producción', async () => {
    const respuesta = await request(app).get('/');
    const cookie = respuesta.headers['set-cookie'].find((c) => c.startsWith('tecnitrack.sid='));

    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).not.toMatch(/Secure/);
    const expira = new Date(/Expires=([^;]+)/.exec(cookie)[1]);
    const horas = (expira - Date.now()) / 3600000;
    expect(horas).toBeGreaterThan(7.9);
    expect(horas).toBeLessThanOrEqual(8);
  });

  test('se guarda en la tabla sesiones de MySQL', async () => {
    await limpiarBaseDatos();
    await crearAgente().get('/');

    const [[{ total }]] = await sequelize.query('SELECT COUNT(*) AS total FROM sesiones');
    expect(total).toBe(1);
  });

  test('los archivos estáticos no crean sesiones', async () => {
    const respuesta = await request(app).get('/css/styles.css');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });
});

describe('Otros middlewares de app.js', () => {
  test('method-override convierte un POST con _method=DELETE en DELETE', async () => {
    const agente = crearAgente();
    const token = await obtenerTokenCsrf(agente);

    const respuesta = await agente
      .post('/clientes/1')
      .set('Accept', 'application/json')
      .type('form')
      .send({ _csrf: token, _method: 'DELETE' });

    expect(respuesta.body.ruta).toBe('DELETE /clientes/1');
  });

  test('method-override no permite convertir un POST en GET (evitaría la verificación CSRF)', async () => {
    const respuesta = await request(app)
      .post('/clientes')
      .type('form')
      .send({ _method: 'GET' });

    expect(respuesta.status).toBe(403);
  });

  test('rechaza un cuerpo JSON mayor al límite (100 kb) con 413', async () => {
    const respuesta = await request(app)
      .post('/no-existe')
      .set('Accept', 'application/json')
      .send({ texto: 'x'.repeat(110 * 1024) });

    expect(respuesta.status).toBe(413);
    expect(respuesta.body.mensaje).toBe('El contenido enviado supera el tamaño permitido.');
  });
});

describe('Ruteo modular y vistas base', () => {
  test.each(PREFIJOS.map((prefijo) => [prefijo]))('el router de %s está montado', async (prefijo) => {
    const ruta = prefijo === '/auth' ? '/auth/login' : prefijo;
    const respuesta = await request(app).get(ruta);

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('en construcción');
  });

  test('las migas de pan enlazan a las páginas anteriores y marcan la actual', async () => {
    const respuesta = await request(app).get('/clientes');

    expect(respuesta.text).toContain('<a href="/admin">Administrador</a>');
    expect(respuesta.text).toContain('<span aria-current="page">Clientes</span>');
  });

  test('sin sesión, la barra muestra los accesos públicos y no el submenú', async () => {
    const respuesta = await request(app).get('/');

    expect(respuesta.text).toContain('href="/portal"');
    expect(respuesta.text).toContain('href="/auth/login"');
    expect(respuesta.text).not.toContain('class="subnav"');
  });

  test('el badge de estado usa los colores semánticos', async () => {
    const respuesta = await request(app).get('/');

    expect(respuesta.text).toContain('<span class="badge badge-gris">Recibido</span>');
    expect(respuesta.text).toContain('<span class="badge badge-azul">En reparación</span>');
    expect(respuesta.text).toContain('<span class="badge badge-ambar">Esperando aprobación</span>');
    expect(respuesta.text).toContain('<span class="badge badge-verde">Entregado</span>');
    expect(respuesta.text).toContain('<span class="badge badge-rojo">Cancelado</span>');
  });
});
