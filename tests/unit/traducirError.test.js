const traducirError = require('../../utils/traducirError');
const {
  AppError, ValidationError, ForbiddenError, NotFoundError,
} = require('../../utils/errors');

describe('traducirError (errores que no vienen de la base de datos)', () => {
  test('deja pasar los errores propios sin cambios', () => {
    const error = new NotFoundError();
    expect(traducirError(error)).toBe(error);
  });

  test('token CSRF inválido -> ForbiddenError (403) en español', () => {
    const error = traducirError(Object.assign(new Error('invalid csrf token'), { code: 'EBADCSRFTOKEN' }));

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toMatch(/formulario expiró/);
  });

  test('cuerpo demasiado grande -> 413', () => {
    const error = traducirError(Object.assign(new Error('too large'), { type: 'entity.too.large' }));

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(413);
  });

  test('JSON mal formado -> ValidationError', () => {
    const error = traducirError(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }));
    expect(error).toBeInstanceOf(ValidationError);
  });

  test('un error desconocido devuelve null (se responde como 500 genérico)', () => {
    expect(traducirError(new TypeError('x is undefined'))).toBeNull();
  });
});
