const { EventEmitter } = require('events');
const logger = require('../../middlewares/logger');

describe('logger', () => {
  test('registra método, ruta sin query string, código y tiempo en ms al terminar la respuesta', () => {
    const escribir = jest.fn();
    const req = { method: 'POST', originalUrl: '/tickets?_csrf=secreto' };
    const res = Object.assign(new EventEmitter(), { statusCode: 303 });
    const next = jest.fn();

    logger({ escribir })(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(escribir).not.toHaveBeenCalled();

    res.emit('finish');
    expect(escribir).toHaveBeenCalledTimes(1);
    const [linea] = escribir.mock.calls[0];
    expect(linea).toMatch(/^\[HTTP\] POST \/tickets 303 \d+\.\d ms$/);
    expect(linea).not.toContain('secreto');
  });
});
