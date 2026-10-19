/**
 * RNF-04: los listados paginan en la consulta (LIMIT/OFFSET) y responden
 * rápido aunque haya muchos registros.
 */
const { Cliente } = require('../../models');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const { USUARIOS, crearAgenteAutenticado } = require('../helpers/agente');

const TOTAL_NUEVOS = 500;
const LIMITE_MS = 3000;

let admin;

beforeAll(async () => {
  await sembrarDatos();
  const clientes = Array.from({ length: TOTAL_NUEVOS }, (_, i) => ({
    nombre: `Cliente de carga ${String(i + 1).padStart(3, '0')}`,
    telefono: `7${String(i).padStart(3, '0')}-${String(1000 + i).slice(-4)}`,
  }));
  await Cliente.bulkCreate(clientes);
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
});
afterAll(cerrarConexiones);

describe('Listado de clientes con 500 registros (RNF-04)', () => {
  test(`responde en menos de ${LIMITE_MS / 1000} segundos y muestra solo 10 clientes`, async () => {
    const inicio = Date.now();
    const respuesta = await admin.agente.get('/clientes');
    const duracion = Date.now() - inicio;

    expect(respuesta.status).toBe(200);
    expect(duracion).toBeLessThan(LIMITE_MS);
    const filas = respuesta.text.match(/href="\/clientes\/\d+">Ver equipos/g);
    expect(filas).toHaveLength(10);
    // 500 nuevos + 3 de los seeders = 503 -> 51 páginas
    expect(respuesta.text).toContain('503 clientes registrados');
    expect(respuesta.text).toContain('Página 1 de 51');
  });

  test('la última página también responde rápido y trae el resto', async () => {
    const inicio = Date.now();
    const respuesta = await admin.agente.get('/clientes?pagina=51');

    expect(Date.now() - inicio).toBeLessThan(LIMITE_MS);
    expect(respuesta.text.match(/href="\/clientes\/\d+">Ver equipos/g)).toHaveLength(3);
    expect(respuesta.text).toContain('rel="prev"');
    expect(respuesta.text).not.toContain('rel="next"');
  });

  test('la paginación se hace en la consulta (LIMIT/OFFSET), no en memoria', async () => {
    const espia = jest.spyOn(Cliente, 'findAndCountAll');
    try {
      await admin.agente.get('/clientes?pagina=3');
      expect(espia).toHaveBeenCalledTimes(1);
      expect(espia.mock.calls[0][0]).toMatchObject({ limit: 10, offset: 20 });
      const { rows } = await espia.mock.results[0].value;
      expect(rows).toHaveLength(10);
    } finally {
      espia.mockRestore();
    }
  });

  test('la búsqueda conserva el filtro en los enlaces de página', async () => {
    const respuesta = await admin.agente.get('/clientes?q=carga');

    expect(respuesta.text).toContain('500 clientes encontrados');
    expect(respuesta.text).toContain('href="/clientes?q=carga&amp;pagina=2"');
  });
});
