/**
 * FolioService (RN-03): formato, correlativo y reinicio al cambiar de año.
 * Se simula sequelize.query; la prueba con la base real y creaciones
 * simultáneas está en tests/integration/tickets.test.js.
 */
const { sequelize } = require('../../models');
const FolioService = require('../../services/FolioService');

const TRANSACCION = { id: 'tx-falsa' };

/**
 * Simula la base: "contador" es el valor del contador del año DESPUÉS de
 * incrementarlo y "maximo" el folio más alto en tickets. Devuelve el espía.
 */
function simularBase({ contador = 1, maximo = null } = {}) {
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
    simularBase({ contador: 43, maximo: 42 });

    await expect(FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'))).resolves.toBe('TT-2026-0043');
  });

  test('si hay tickets con un número mayor al contador, sigue después del mayor (respaldo)', async () => {
    simularBase({ contador: 11, maximo: 57 });

    await expect(FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'))).resolves.toBe('TT-2026-0058');
  });

  test('incrementa y bloquea el contador del año (FOR UPDATE), todo en la misma transacción', async () => {
    const espia = simularBase({ contador: 4, maximo: 3 });

    const folio = await FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'));

    const consultas = espia.mock.calls.map(([sql, opciones]) => ({ sql, opciones }));
    expect(consultas.map(({ sql }) => sql.split(' ')[0])).toEqual(['INSERT', 'SELECT', 'SELECT']);
    expect(consultas[0].sql).toMatch(/ON DUPLICATE KEY UPDATE ultimo = ultimo \+ 1$/);
    expect(consultas[1].sql).toMatch(/FOR UPDATE$/);
    expect(consultas.every(({ opciones }) => opciones.transaction === TRANSACCION)).toBe(true);
    expect(folio).toBe('TT-2026-0004');
  });

  test('con el respaldo, el contador se corrige para el siguiente ticket', async () => {
    const espia = simularBase({ contador: 11, maximo: 57 });

    await FolioService.generar(TRANSACCION, new Date('2026-10-19T12:00:00-06:00'));

    const [sql, opciones] = espia.mock.calls[3];
    expect(sql).toMatch(/^UPDATE folio_contadores/);
    expect(opciones.replacements).toEqual({ anio: 2026, siguiente: 58 });
  });

  test('exige una transacción', async () => {
    await expect(FolioService.generar(undefined)).rejects.toThrow('dentro de una transacción');
  });
});

describe('Reinicio al cambiar de año', () => {
  test('el primer ticket de un año nuevo es el 0001', async () => {
    const espia = simularBase({ contador: 1, maximo: null });

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
