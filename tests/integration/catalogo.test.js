/**
 * Catálogo de servicios y repuestos (HU-07, RF-08): CRUD, precio con
 * 2 decimales mayor a 0, desactivar en lugar de borrar y permisos.
 */
const { CatalogoItem } = require('../../models');
const CatalogoService = require('../../services/CatalogoService');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const { USUARIOS, crearAgenteAutenticado, enviarFormulario } = require('../helpers/agente');

let admin;
let tecnico;

beforeAll(async () => {
  await sembrarDatos();
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
  tecnico = await crearAgenteAutenticado({ correo: USUARIOS.jorge.correo });
});
afterAll(cerrarConexiones);

const comoAdmin = (opciones) => enviarFormulario(admin.agente, { csrfToken: admin.csrfToken, ...opciones });
const comoTecnico = (opciones) => enviarFormulario(tecnico.agente, { csrfToken: tecnico.csrfToken, ...opciones });

describe('Listado del catálogo', () => {
  test('muestra los ítems con su tipo, precio y estado', async () => {
    const respuesta = await admin.agente.get('/catalogo');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Diagnóstico general');
    expect(respuesta.text).toContain('<span class="badge badge-azul">Servicio</span>');
    expect(respuesta.text).toContain('<span class="badge badge-gris">Repuesto</span>');
    expect(respuesta.text).toContain('$10.00');
    expect(respuesta.text).toContain('6 ítems registrados');
  });

  test('filtra por tipo', async () => {
    const respuesta = await admin.agente.get('/catalogo?tipo=Repuesto');

    expect(respuesta.text).toContain('Memoria RAM 8GB DDR4');
    expect(respuesta.text).not.toContain('Diagnóstico general');
    expect(respuesta.text).toMatch(/<option value="Repuesto" selected>/);
  });

  test('un tipo que no existe se ignora', async () => {
    const respuesta = await admin.agente.get('/catalogo?tipo=Otro');

    expect(respuesta.text).toContain('Diagnóstico general');
    expect(respuesta.text).toContain('Memoria RAM 8GB DDR4');
  });
});

describe('CRUD del catálogo (admin)', () => {
  test('crea un ítem con precio de 2 decimales', async () => {
    const respuesta = await comoAdmin({
      ruta: '/catalogo', datos: { nombre: 'Cambio de pantalla', tipo: 'Servicio', precio_referencia: '45.5' },
    });

    expect(respuesta.status).toBe(303);
    const item = await CatalogoItem.findOne({ where: { nombre: 'Cambio de pantalla' } });
    expect(item).toMatchObject({ tipo: 'Servicio', precio_referencia: 45.5, activo: true });
    const listado = await admin.agente.get('/catalogo');
    expect(listado.text).toContain('Ítem &#34;Cambio de pantalla&#34; agregado al catálogo.');
  });

  test('edita un ítem', async () => {
    const item = await CatalogoItem.create({ nombre: 'Teclado genérico', tipo: 'Repuesto', precio_referencia: 15 });

    const respuesta = await comoAdmin({
      metodo: 'PUT', ruta: `/catalogo/${item.id}`,
      datos: { nombre: 'Teclado USB', tipo: 'Repuesto', precio_referencia: '18.99' },
    });

    expect(respuesta.headers.location).toBe('/catalogo');
    await item.reload();
    expect(item).toMatchObject({ nombre: 'Teclado USB', precio_referencia: 18.99 });
  });

  test.each([
    ['0', 'El precio debe ser mayor a 0.'],
    ['0.00', 'El precio debe ser mayor a 0.'],
    ['-5', 'El precio debe ser mayor a 0.'],
    ['abc', 'El precio debe ser un número (ej. 25.00).'],
    ['', 'El precio es obligatorio.'],
    ['12.345', 'El precio puede tener máximo 2 decimales.'],
  ])('rechaza el precio "%s"', async (precio, mensaje) => {
    const respuesta = await comoAdmin({
      ruta: '/catalogo', json: true, datos: { nombre: 'Ítem inválido', tipo: 'Servicio', precio_referencia: precio },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ precio_referencia: mensaje });
    expect(await CatalogoItem.count({ where: { nombre: 'Ítem inválido' } })).toBe(0);
  });

  test('rechaza un nombre repetido', async () => {
    const respuesta = await comoAdmin({
      ruta: '/catalogo', json: true, datos: { nombre: 'Diagnóstico general', tipo: 'Servicio', precio_referencia: '5' },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ nombre: 'Ya existe un ítem del catálogo con ese nombre.' });
  });

  test('un ítem que nunca se usó se puede eliminar', async () => {
    const item = await CatalogoItem.create({ nombre: 'Mouse inalámbrico', tipo: 'Repuesto', precio_referencia: 9 });

    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: `/catalogo/${item.id}` });

    expect(respuesta.status).toBe(303);
    expect(await CatalogoItem.findByPk(item.id)).toBeNull();
  });

  test('un ítem usado en cotizaciones no se elimina: hay que desactivarlo', async () => {
    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: '/catalogo/1', json: true });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe(
      '"Diagnóstico general" ya se usó en cotizaciones y no se puede eliminar. Desactívalo para que no se pueda cotizar.',
    );
    expect(await CatalogoItem.findByPk(1)).not.toBeNull();
  });

  test('el listado ofrece "Eliminar" solo en los ítems que nunca se usaron', async () => {
    const nuevo = await CatalogoItem.create({ nombre: 'Pasta térmica', tipo: 'Repuesto', precio_referencia: 4 });

    const respuesta = await admin.agente.get('/catalogo?q=a');

    expect(respuesta.text).toContain(`action="/catalogo/${nuevo.id}" data-confirmar=`);
    expect(respuesta.text).not.toContain('action="/catalogo/1" data-confirmar=');
  });

  test('desactiva y vuelve a activar un ítem usado', async () => {
    const desactivar = await comoAdmin({ metodo: 'PATCH', ruta: '/catalogo/6/activo', datos: { activo: 'false' } });

    expect(desactivar.status).toBe(303);
    expect((await CatalogoItem.findByPk(6)).activo).toBe(false);
    const listado = await admin.agente.get('/catalogo');
    expect(listado.text).toContain('desactivado: ya no aparecerá al cotizar.');
    expect(listado.text).toContain('<span class="badge badge-gris">Inactivo</span>');

    await comoAdmin({ metodo: 'PATCH', ruta: '/catalogo/6/activo', datos: { activo: 'true' } });
    expect((await CatalogoItem.findByPk(6)).activo).toBe(true);
  });

  test('listarActivos (para cotizar) excluye los ítems desactivados', async () => {
    await CatalogoItem.update({ activo: false }, { where: { id: 5 } });

    const activos = await CatalogoService.listarActivos();
    const repuestos = await CatalogoService.listarActivos({ tipo: 'Repuesto' });

    expect(activos.map((item) => item.id)).not.toContain(5);
    expect(activos.every((item) => item.activo === undefined)).toBe(true);
    expect(repuestos.every((item) => item.tipo === 'Repuesto')).toBe(true);
    await CatalogoItem.update({ activo: true }, { where: { id: 5 } });
  });
});

describe('Permisos: el técnico solo consulta el catálogo', () => {
  test('ve el listado sin botones de crear, editar, desactivar ni eliminar', async () => {
    const respuesta = await tecnico.agente.get('/catalogo');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Diagnóstico general');
    expect(respuesta.text).not.toMatch(/class="btn[^"]*"[^>]*>(Nuevo ítem|Editar|Desactivar|Activar|Eliminar)/);
  });

  test.each([['/catalogo/nuevo'], ['/catalogo/1/editar']])('GET %s responde 403', async (ruta) => {
    expect((await tecnico.agente.get(ruta)).status).toBe(403);
  });

  test.each([
    ['POST', '/catalogo'],
    ['PUT', '/catalogo/1'],
    ['PATCH', '/catalogo/1/activo'],
    ['DELETE', '/catalogo/2'],
  ])('%s %s responde 403', async (metodo, ruta) => {
    const respuesta = await comoTecnico({
      metodo, ruta, json: true, datos: { nombre: 'Intruso', tipo: 'Servicio', precio_referencia: '1', activo: 'false' },
    });

    expect(respuesta.status).toBe(403);
    expect(await CatalogoItem.findByPk(1)).toMatchObject({ nombre: 'Diagnóstico general', activo: true });
    expect(await CatalogoItem.findByPk(2)).not.toBeNull();
  });
});
