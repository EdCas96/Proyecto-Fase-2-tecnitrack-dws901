const asyncHandler = require('../../utils/asyncHandler');
const { BusinessRuleError } = require('../../utils/errors');

describe('asyncHandler', () => {
  test('pasa a next() el error de una promesa rechazada', async () => {
    const error = new BusinessRuleError('Regla violada');
    const next = jest.fn();

    await asyncHandler(async () => { throw error; })({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('pasa a next() un error lanzado de forma síncrona dentro del controlador', async () => {
    const next = jest.fn();

    await asyncHandler(() => { throw new Error('síncrono'); })({}, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'síncrono' }));
  });

  test('no llama a next() cuando el controlador responde sin errores', async () => {
    const next = jest.fn();
    const res = { send: jest.fn() };

    await asyncHandler(async (req, r) => r.send('ok'))({}, res, next);

    expect(res.send).toHaveBeenCalledWith('ok');
    expect(next).not.toHaveBeenCalled();
  });

  test('entrega al controlador los mismos req, res y next', async () => {
    const controlador = jest.fn().mockResolvedValue(undefined);
    const req = {};
    const res = {};
    const next = jest.fn();

    await asyncHandler(controlador)(req, res, next);

    expect(controlador).toHaveBeenCalledWith(req, res, next);
  });
});
