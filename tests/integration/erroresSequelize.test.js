/**
 * errorHandler traduce los errores reales de Sequelize/MySQL (únicos, llaves
 * foráneas, CHECK, validaciones del modelo) a mensajes claros en español.
 */
const request = require('supertest');
const { sequelize, Equipo, CatalogoItem } = require('../../models');
const asyncHandler = require('../../utils/asyncHandler');
const { crearAppPrueba } = require('../helpers/appPrueba');
const { limpiarBaseDatos, cerrarConexiones } = require('../helpers/baseDatos');
const {
  crearUsuario, crearCliente, crearEquipo, crearTicket, crearCotizacion,
} = require('../helpers/fabricas');

// Cada ruta ejecuta la operación que recibe en el cuerpo, como lo haría un servicio
const operaciones = {
  usuarioDuplicado: () => crearUsuario({ correo: 'luis@tecnitrack.com' }),
  segundaPendiente: async () => crearCotizacion({ ticket_id: (await sequelize.query('SELECT MAX(id) AS id FROM tickets', { plain: true })).id }),
  equipoSinCliente: () => Equipo.create({ cliente_id: 999999, tipo: 'Laptop', marca: 'Dell', modelo: 'X' }),
  borrarClienteConEquipos: async () => {
    const { cliente_id: clienteId } = await Equipo.findOne();
    return sequelize.query('DELETE FROM clientes WHERE id = ?', { replacements: [clienteId] });
  },
  precioNegativo: () => sequelize.query(
    "INSERT INTO catalogo_items (nombre, tipo, precio_referencia) VALUES ('Prueba CHECK', 'Servicio', -5)",
  ),
  validacionModelo: () => CatalogoItem.create({ nombre: 'X', tipo: 'Servicio', precio_referencia: 10 }),
};

const app = crearAppPrueba((a) => {
  a.post('/operacion/:nombre', asyncHandler(async (req, res) => {
    await operaciones[req.params.nombre]();
    res.status(201).json({ ok: true });
  }));
});

const ejecutar = (nombre) => request(app).post(`/operacion/${nombre}`).set('Accept', 'application/json');

beforeAll(async () => {
  await limpiarBaseDatos();
  await crearUsuario({ correo: 'luis@tecnitrack.com' });
  const ticket = await crearTicket({ equipo_id: (await crearEquipo({ cliente_id: (await crearCliente()).id })).id });
  await crearCotizacion({ ticket_id: ticket.id });
});

afterAll(async () => {
  await limpiarBaseDatos();
  await cerrarConexiones();
});

describe('Traducción de errores de Sequelize', () => {
  test('unique (correo repetido) -> 400 con el mensaje en español del modelo', async () => {
    const respuesta = await ejecutar('usuarioDuplicado');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toEqual({
      error: 'ValidationError',
      mensaje: 'Ya existe un usuario con ese correo.',
      errores: { correo: 'Ya existe un usuario con ese correo.' },
    });
  });

  test('unique solo de la base (RN-09: segunda cotización pendiente) -> 422 regla de negocio', async () => {
    const respuesta = await ejecutar('segundaPendiente');

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.error).toBe('BusinessRuleError');
    expect(respuesta.body.mensaje).toBe(
      'El ticket ya tiene una cotización pendiente. Solo puede haber una a la vez (RN-09).',
    );
  });

  test('llave foránea a un registro inexistente -> 400 "El cliente indicado no existe."', async () => {
    const respuesta = await ejecutar('equipoSinCliente');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('El cliente indicado no existe.');
    expect(respuesta.body.errores).toEqual({ cliente_id: 'El cliente indicado no existe.' });
  });

  test('borrar un registro con dependientes (RESTRICT) -> 422 con mensaje claro', async () => {
    const respuesta = await ejecutar('borrarClienteConEquipos');

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('No se puede eliminar el registro porque tiene otros registros asociados.');
  });

  test('restricción CHECK de la base -> 400 con el mensaje de esa restricción', async () => {
    const respuesta = await ejecutar('precioNegativo');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('El precio de referencia no puede ser negativo.');
  });

  test('validación del modelo -> 400 con el mensaje del modelo y el campo', async () => {
    const respuesta = await ejecutar('validacionModelo');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('El nombre debe tener entre 2 y 120 caracteres.');
    expect(respuesta.body.errores).toEqual({ nombre: 'El nombre debe tener entre 2 y 120 caracteres.' });
  });

  test('ningún mensaje deja ver SQL ni nombres internos de la base', async () => {
    const respuestas = await Promise.all(Object.keys(operaciones).map(ejecutar));

    respuestas.forEach(({ body }) => {
      expect(body.mensaje).not.toMatch(/SQL|CONSTRAINT|tecnitrack_test|ibfk|uq_|chk_|Validation error/);
    });
  });
});
