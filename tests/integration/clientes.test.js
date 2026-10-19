/**
 * Clientes y equipos (HU-01, RF-01, RF-02): CRUD, validaciones, reglas de
 * negocio, transacción del nuevo cliente con equipo y permisos por rol.
 */
const { Cliente, Equipo } = require('../../models');
const ClienteService = require('../../services/ClienteService');
const { ValidationError } = require('../../utils/errors');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const { USUARIOS, crearAgenteAutenticado, enviarFormulario } = require('../helpers/agente');

let admin;
let tecnico;

beforeAll(async () => {
  await sembrarDatos();
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
  tecnico = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });
});
afterAll(cerrarConexiones);

/** Envía un formulario como admin. */
const comoAdmin = (opciones) => enviarFormulario(admin.agente, { csrfToken: admin.csrfToken, ...opciones });
/** Envía un formulario como técnico. */
const comoTecnico = (opciones) => enviarFormulario(tecnico.agente, { csrfToken: tecnico.csrfToken, ...opciones });

describe('Listado de clientes', () => {
  test('muestra la tabla del prototipo con el conteo de equipos', async () => {
    const respuesta = await admin.agente.get('/clientes');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('<th>Equipos registrados</th>');
    // Ana Lucía Martínez tiene 2 equipos en los seeders
    expect(respuesta.text).toMatch(/Ana Lucía Martínez<\/td>\s*<td>7345-6720<\/td>\s*<td>ana\.martinez@example\.com<\/td>\s*<td>2<\/td>/);
    expect(respuesta.text).toContain('Página 1 de 1');
  });

  test('busca por nombre', async () => {
    const respuesta = await admin.agente.get('/clientes?q=carlos');

    expect(respuesta.text).toContain('Carlos Alberto Ramírez');
    expect(respuesta.text).not.toContain('María Elena Hernández');
  });

  test('busca por teléfono con o sin guion', async () => {
    for (const q of ['7123-4567', '71234567', '7123']) {
      const respuesta = await admin.agente.get(`/clientes?q=${q}`);
      expect(respuesta.text).toContain('María Elena Hernández');
      expect(respuesta.text).not.toContain('Ana Lucía Martínez');
    }
  });

  test('los comodines de LIKE se buscan como texto', async () => {
    const respuesta = await admin.agente.get('/clientes?q=%25');

    expect(respuesta.text).toContain('Ningún cliente coincide con la búsqueda.');
  });
});

describe('CRUD de clientes (admin)', () => {
  test('crea un cliente sin equipo y lo guarda con el teléfono en formato 0000-0000', async () => {
    const respuesta = await comoAdmin({
      ruta: '/clientes',
      datos: { nombre: 'Rosa Castillo', telefono: '75551234', correo: 'Rosa@Example.com' },
    });

    expect(respuesta.status).toBe(303);
    const cliente = await Cliente.findOne({ where: { nombre: 'Rosa Castillo' } });
    expect(cliente).toMatchObject({ telefono: '7555-1234', correo: 'rosa@example.com' });
    expect(respuesta.headers.location).toBe(`/clientes/${cliente.id}`);

    const detalle = await admin.agente.get(respuesta.headers.location);
    expect(detalle.text).toContain('Cliente &#34;Rosa Castillo&#34; registrado correctamente.');
  });

  test('crea un cliente con su primer equipo en la misma operación', async () => {
    const respuesta = await comoAdmin({
      ruta: '/clientes',
      datos: {
        nombre: 'Mario Duarte', telefono: '7666-0001', correo: '',
        equipo_tipo: 'Laptop', equipo_marca: 'Asus', equipo_modelo: 'VivoBook 14', equipo_numero_serie: 'AS-1001',
      },
    });

    expect(respuesta.status).toBe(303);
    const cliente = await Cliente.findOne({ where: { nombre: 'Mario Duarte' }, include: { model: Equipo, as: 'equipos' } });
    expect(cliente.correo).toBeNull();
    expect(cliente.equipos).toHaveLength(1);
    expect(cliente.equipos[0]).toMatchObject({ marca: 'Asus', numero_serie: 'AS-1001' });
  });

  test('si el equipo es inválido, el cliente tampoco se guarda (transacción)', async () => {
    const respuesta = await comoAdmin({
      ruta: '/clientes',
      json: true,
      datos: {
        nombre: 'Cliente Revertido', telefono: '7666-0002',
        // DL-88291 ya existe: el cliente se inserta y luego falla el equipo
        equipo_tipo: 'Laptop', equipo_marca: 'Dell', equipo_modelo: 'Latitude', equipo_numero_serie: 'DL-88291',
      },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ equipo_numero_serie: 'Ya existe un equipo con ese número de serie.' });
    expect(await Cliente.count({ where: { nombre: 'Cliente Revertido' } })).toBe(0);
  });

  test('la transacción también revierte un error de validación del modelo del equipo', async () => {
    await expect(ClienteService.crear({
      nombre: 'Cliente Revertido Dos', telefono: '7666-0003',
      equipo_tipo: 'Tostadora', equipo_marca: 'X', equipo_modelo: 'Y',
    })).rejects.toThrow(ValidationError);

    expect(await Cliente.count({ where: { nombre: 'Cliente Revertido Dos' } })).toBe(0);
  });

  test('si se llena solo parte del equipo, pide los campos que faltan', async () => {
    const respuesta = await comoAdmin({
      ruta: '/clientes', json: true, datos: { nombre: 'Sin Equipo', telefono: '7666-0004', equipo_marca: 'HP' },
    });

    expect(respuesta.status).toBe(400);
    expect(Object.keys(respuesta.body.errores).sort()).toEqual(['equipo_modelo', 'equipo_tipo']);
  });

  test('edita un cliente', async () => {
    const cliente = await Cliente.create({ nombre: 'Para Editar', telefono: '7000-1111' });

    const respuesta = await comoAdmin({
      metodo: 'PUT', ruta: `/clientes/${cliente.id}`,
      datos: { nombre: 'Editado Correctamente', telefono: '22223333', correo: 'editado@example.com' },
    });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe(`/clientes/${cliente.id}`);
    await cliente.reload();
    expect(cliente).toMatchObject({ nombre: 'Editado Correctamente', telefono: '2222-3333', correo: 'editado@example.com' });
  });

  test('el detalle muestra los equipos del cliente con sus tickets', async () => {
    const respuesta = await admin.agente.get('/clientes/3');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('ThinkPad E14');
    expect(respuesta.text).toContain('L3250');
    expect(respuesta.text).toContain('<a href="/clientes">Clientes</a>');
    expect(respuesta.text).toMatch(/class="btn[^"]*"[^>]*>Editar cliente/);
    expect(respuesta.text).toContain('data-confirmar="¿Eliminar al cliente Ana Lucía Martínez?');
  });

  test('un cliente inexistente responde 404', async () => {
    expect((await admin.agente.get('/clientes/99999')).status).toBe(404);
    expect((await admin.agente.get('/clientes/abc')).status).toBe(404);
  });

  test('elimina un cliente sin equipos', async () => {
    const cliente = await Cliente.create({ nombre: 'Para Eliminar', telefono: '7000-2222' });

    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: `/clientes/${cliente.id}` });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/clientes');
    expect(await Cliente.findByPk(cliente.id)).toBeNull();
  });

  test('no elimina un cliente con equipos (BusinessRuleError)', async () => {
    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: '/clientes/3', json: true });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe(
      'No se puede eliminar a Ana Lucía Martínez porque tiene 2 equipos registrados. Elimina primero sus equipos.',
    );
    expect(await Cliente.findByPk(3)).not.toBeNull();
  });

  test('desde el navegador, el error de la regla regresa al detalle con el mensaje', async () => {
    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: '/clientes/3', referer: '/clientes/3' });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/clientes/3');
    const detalle = await admin.agente.get('/clientes/3');
    expect(detalle.text).toContain('porque tiene 2 equipos registrados');
  });
});

describe('Validaciones de clientes', () => {
  test.each([
    ['123', 'El teléfono debe tener 8 dígitos (ej. 7123-4567).'],
    ['7123-45678', 'El teléfono debe tener 8 dígitos (ej. 7123-4567).'],
    ['abcd-efgh', 'El teléfono debe tener 8 dígitos (ej. 7123-4567).'],
    ['7123 4567', 'El teléfono debe tener 8 dígitos (ej. 7123-4567).'],
    ['', 'El teléfono es obligatorio.'],
  ])('rechaza el teléfono "%s"', async (telefono, mensaje) => {
    const respuesta = await comoAdmin({ ruta: '/clientes', json: true, datos: { nombre: 'Prueba', telefono } });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.telefono).toBe(mensaje);
  });

  test('rechaza un correo inválido', async () => {
    const respuesta = await comoAdmin({
      ruta: '/clientes', json: true, datos: { nombre: 'Prueba', telefono: '7000-0000', correo: 'no-es-correo' },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ correo: 'El correo no tiene un formato válido.' });
  });

  test('al fallar, vuelve al formulario con los datos ingresados y el error junto al campo', async () => {
    const respuesta = await comoAdmin({
      ruta: '/clientes', referer: '/clientes/nuevo',
      datos: { nombre: 'Lucía Pérez', telefono: '12', equipo_marca: 'Lenovo' },
    });

    expect(respuesta.headers.location).toBe('/clientes/nuevo');
    const formulario = await admin.agente.get('/clientes/nuevo');
    expect(formulario.text).toContain('value="Lucía Pérez"');
    expect(formulario.text).toContain('value="12"');
    expect(formulario.text).toContain('value="Lenovo"');
    expect(formulario.text).toContain('<p class="campo-error" id="error-telefono">El teléfono debe tener 8 dígitos (ej. 7123-4567).</p>');
    expect(formulario.text).toContain('id="error-equipo_tipo"');
    expect(formulario.text).toContain('aria-invalid="true"');
  });
});

describe('Equipos (admin)', () => {
  test('agrega un equipo a un cliente', async () => {
    const respuesta = await comoAdmin({
      ruta: '/equipos',
      datos: { cliente_id: 2, tipo: 'Impresora', marca: 'Canon', modelo: 'G3110', numero_serie: 'CN-2001' },
    });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/clientes/2');
    expect(await Equipo.findOne({ where: { numero_serie: 'CN-2001' } })).toMatchObject({ cliente_id: 2, marca: 'Canon' });
  });

  test('rechaza un número de serie duplicado', async () => {
    const respuesta = await comoAdmin({
      ruta: '/equipos', json: true,
      datos: { cliente_id: 2, tipo: 'Laptop', marca: 'HP', modelo: 'X', numero_serie: 'HP-55210' },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ numero_serie: 'Ya existe un equipo con ese número de serie.' });
  });

  test('al editar, el equipo puede conservar su propio número de serie', async () => {
    const respuesta = await comoAdmin({
      metodo: 'PUT', ruta: '/equipos/2',
      datos: { tipo: 'Computadora de escritorio', marca: 'HP', modelo: 'Pavilion TP01-2', numero_serie: 'HP-55210' },
    });

    expect(respuesta.status).toBe(303);
    expect((await Equipo.findByPk(2)).modelo).toBe('Pavilion TP01-2');
  });

  test('un cliente inexistente responde 404 al agregar un equipo', async () => {
    const respuesta = await comoAdmin({
      ruta: '/equipos', json: true, datos: { cliente_id: 99999, tipo: 'Laptop', marca: 'HP', modelo: 'X' },
    });

    expect(respuesta.status).toBe(404);
  });

  test('elimina un equipo sin tickets', async () => {
    const equipo = await Equipo.create({ cliente_id: 1, tipo: 'Otro', marca: 'Genérica', modelo: 'Monitor' });

    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: `/equipos/${equipo.id}` });

    expect(respuesta.headers.location).toBe('/clientes/1');
    expect(await Equipo.findByPk(equipo.id)).toBeNull();
  });

  test('no elimina un equipo con tickets', async () => {
    // El equipo 1 (Dell de María) tiene tres tickets en los seeders
    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: '/equipos/1', json: true });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toMatch(/^No se puede eliminar el equipo porque tiene 3 tickets registrados/);
    expect(await Equipo.findByPk(1)).not.toBeNull();
  });
});

describe('Permisos: el técnico solo consulta clientes y equipos', () => {
  test('ve el listado y el detalle, sin botones de crear, editar ni eliminar', async () => {
    const listado = await tecnico.agente.get('/clientes');
    const detalle = await tecnico.agente.get('/clientes/3');

    expect(listado.status).toBe(200);
    expect(detalle.status).toBe(200);
    for (const html of [listado.text, detalle.text]) {
      // Busca los botones, no el texto suelto (un cliente de prueba podría llamarse "Para Editar")
      expect(html).not.toMatch(/class="btn[^"]*"[^>]*>(Nuevo cliente|Editar|Eliminar|Agregar equipo)/);
    }
    expect(listado.text).toContain('<a href="/tecnico">Técnico</a>');
  });

  test.each([
    ['/clientes/nuevo'],
    ['/clientes/1/editar'],
    ['/equipos/nuevo?cliente_id=1'],
    ['/equipos/1/editar'],
  ])('GET %s responde 403', async (ruta) => {
    const respuesta = await tecnico.agente.get(ruta);

    expect(respuesta.status).toBe(403);
    expect(respuesta.text).toContain('No tienes permiso para acceder a esta sección');
  });

  test.each([
    ['POST', '/clientes'],
    ['PUT', '/clientes/1'],
    ['DELETE', '/clientes/1'],
    ['POST', '/equipos'],
    ['PUT', '/equipos/1'],
    ['DELETE', '/equipos/4'],
  ])('%s %s responde 403 y no cambia nada', async (metodo, ruta) => {
    const respuesta = await comoTecnico({
      metodo, ruta, json: true,
      datos: { nombre: 'Intruso', telefono: '7000-0000', cliente_id: 1, tipo: 'Laptop', marca: 'X', modelo: 'Y' },
    });

    expect(respuesta.status).toBe(403);
    expect(await Cliente.count({ where: { nombre: 'Intruso' } })).toBe(0);
    expect(await Equipo.findByPk(4)).not.toBeNull();
  });
});
