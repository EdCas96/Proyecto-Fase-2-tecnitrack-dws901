/**
 * Middleware validar (express-validator) y el regreso al formulario que hace
 * errorHandler.js con los mensajes y los datos ingresados.
 */
const request = require('supertest');
const { body } = require('express-validator');
const validar = require('../../middlewares/validar');
const { crearAppPrueba } = require('../helpers/appPrueba');
const { BusinessRuleError } = require('../../utils/errors');

const reglas = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('correo').trim().isEmail().withMessage('El correo no es válido.'),
];

const app = crearAppPrueba((a) => {
  a.post('/clientes', validar(reglas), (req, res) => res.status(201).json({ ok: true }));
  a.post('/regla', () => { throw new BusinessRuleError('No se puede pasar a En_reparacion sin cotización aprobada.'); });
  a.get('/consulta', () => { throw new BusinessRuleError('Regla violada en una consulta.'); });
});

describe('validar', () => {
  test('deja pasar una petición válida', async () => {
    const respuesta = await request(app).post('/clientes').send({ nombre: 'Ana', correo: 'ana@example.com' });

    expect(respuesta.status).toBe(201);
  });

  test('a una petición JSON le responde 400 con los errores por campo', async () => {
    const respuesta = await request(app)
      .post('/clientes')
      .set('Accept', 'application/json')
      .send({ nombre: '', correo: 'no-es-correo' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      error: 'ValidationError',
      mensaje: 'Revisa los datos del formulario.',
      errores: { nombre: 'El nombre es obligatorio.', correo: 'El correo no es válido.' },
    });
  });

  test('a un formulario lo regresa a la página anterior con errores y datos ingresados (sin contraseñas ni tokens)', async () => {
    const agente = request.agent(app);
    const respuesta = await agente
      .post('/clientes')
      .set('Host', 'tecnitrack.local')
      .set('Referer', 'http://tecnitrack.local/clientes/nuevo?origen=menu')
      .type('form')
      .send({ nombre: 'Ana', correo: 'mal', password: 'Secreta1!', _csrf: 'token' });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/clientes/nuevo?origen=menu');

    const flash = (await agente.get('/__flash')).body;
    expect(flash.error).toEqual(['Revisa los datos del formulario.']);
    expect(flash.errores).toEqual({ correo: 'El correo no es válido.' });
    expect(flash.datos).toEqual({ nombre: 'Ana', correo: 'mal' });
  });

  test('no redirige a otro sitio aunque el Referer sea externo', async () => {
    const respuesta = await request(app)
      .post('/clientes')
      .set('Referer', 'https://sitio-malicioso.example/phishing')
      .type('form')
      .send({ nombre: '' });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/');
  });
});

describe('BusinessRuleError en errorHandler', () => {
  test('desde un formulario regresa con el mensaje en flash', async () => {
    const agente = request.agent(app);
    const respuesta = await agente.post('/regla').type('form').send({});

    expect(respuesta.status).toBe(303);
    expect((await agente.get('/__flash')).body.error[0]).toMatch(/sin cotización aprobada/);
  });

  test('en una petición GET renderiza la vista 422 en lugar de redirigir', async () => {
    const respuesta = await request(app).get('/consulta');

    expect(respuesta.status).toBe(422);
    expect(respuesta.text).toContain('Operación no permitida');
    expect(respuesta.text).toContain('Regla violada en una consulta.');
  });

  test('un error inesperado responde 500 con un mensaje genérico, sin detalles internos', async () => {
    const appConFallo = crearAppPrueba((a) => {
      a.get('/falla', () => { throw new Error('SELECT * FROM usuarios: conexión perdida'); });
    });
    const espia = jest.spyOn(console, 'error').mockImplementation(() => {});

    const respuesta = await request(appConFallo).get('/falla');

    expect(respuesta.status).toBe(500);
    expect(respuesta.text).toContain('Ocurrió un error inesperado');
    expect(respuesta.text).not.toContain('SELECT');
    expect(espia).toHaveBeenCalled();
    espia.mockRestore();
  });
});
