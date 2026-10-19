/**
 * FolioService (RN-03): formato, correlativo y reinicio al cambiar de año.
 * Se simula sequelize.query; la prueba con la base real y creaciones
 * simultáneas está en tests/integration/tickets.test.js.
 */
const { sequelize } = require('../../models');
const FolioService = require('../../services/FolioService');

const TRANSACCION = { id: 'tx-falsa' };

/**
 * Simula la base: el contador del año vale "contador" y el folio más alto en
 * tickets es "maximo". Devuelve el espía para revisar las consultas.
 */
function simularBase({ contador = 0, maximo = null } = {}) {
  return jest.spyOn(sequelize, 'query').mockImplementation(async (sql) => {
    if (sql.includes('FOR UPDATE')) return [{ ultimo: contador }];
    if (sql.includes('MAX(')) return [{ ultimo: maximo }];
    return [];
  });
}

afterEach(() => jest.restoreAllMocks());

describe('Formato TT-AAAA-NNNN', () => {
  test.each([
    [2026, 1, 'TT-2026-0001'],
    [2026, 42, 'TT-2026-0042'],
    [2026, 9999, 'TT-2026-9999'],
    [2026, 12345, 'TT-2026-12345'],
  ])('formatear(%i, %i) = %s', (anio, numero, folio) => {
    expect(FolioService.formatear(anio, numero)).toBe(folio);
  });

  test('el folio generado cumple el formato del modelo', async () => {
    simularBase({ contador: 7 });
    const folio = await FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'));

    expect(folio).toMatch(/^TT-\d{4}-\d{4,}$/);
  });
});

describe('Correlativo', () => {
  test('continúa después del contador del año', async () => {
    simularBase({ contador: 42, maximo: 42 });

    await expect(FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'))).resolves.toBe('TT-2026-0043');
  });

  test('si hay tickets con un número mayor al contador, sigue después del mayor (respaldo)', async () => {
    simularBase({ contador: 10, maximo: 57 });

    await expect(FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'))).resolves.toBe('TT-2026-0058');
  });

  test('bloquea el contador del año con FOR UPDATE y lo actualiza, todo en la misma transacción', async () => {
    const espia = simularBase({ contador: 3 });

    await FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'));

    const consultas = espia.mock.calls.map(([sql, opciones]) => ({ sql, opciones }));
    expect(consultas.map(({ sql }) => sql.split(' ')[0])).toEqual(['INSERT', 'SELECT', 'SELECT', 'UPDATE']);
    expect(consultas[1].sql).toMatch(/FOR UPDATE$/);
    expect(consultas.every(({ opciones }) => opciones.transaction === TRANSACCION)).toBe(true);
    expect(consultas[3].opciones.replacements).toEqual({ anio: 2026, siguiente: 4 });
  });

  test('exige una transacción', async () => {
    await expect(FolioService.generar(undefined)).rejects.toThrow('dentro de una transacción');
  });
});

describe('Reinicio al cambiar de año', () => {
  test('el primer ticket de un año nuevo es el 0001', async () => {
    const espia = simularBase({ contador: 0, maximo: null });

    const folio = await FolioService.generar(TRANSACCION, new Date('2027-01-02T09:00:00-06:00'));

    expect(folio).toBe('TT-2027-0001');
    expect(espia.mock.calls[0][1].replacements).toEqual({ anio: 2027 });
  });

  test('el año se toma en hora de El Salvador (UTC-6), no en UTC', () => {
    // 1 de enero de 2027 a las 03:00 UTC todavía es 31 de diciembre de 2026 en El Salvador
    expect(FolioService.anioDe(new Date('2027-01-01T03:00:00Z'))).toBe(2026);
    expect(FolioService.anioDe(new Date('2027-01-01T06:00:00Z'))).toBe(2027);
  });
});
