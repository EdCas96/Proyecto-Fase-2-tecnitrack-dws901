const {
  AppError, ValidationError, AuthError, ForbiddenError, NotFoundError, BusinessRuleError,
} = require('../../utils/errors');

describe('Clases de error propias', () => {
  test.each([
    [ValidationError, 400],
    [AuthError, 401],
    [ForbiddenError, 403],
    [NotFoundError, 404],
    [BusinessRuleError, 422],
  ])('%p tiene statusCode %i, hereda de AppError y trae un mensaje por defecto en español', (Clase, codigo) => {
    const error = new Clase();

    expect(error.statusCode).toBe(codigo);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(Clase.name);
    expect(error.message).toMatch(/[a-záéíóúñ]/i);
    expect(error.esOperacional).toBe(true);
  });

  test('AppError usa 500 por defecto', () => {
    expect(new AppError('Algo falló').statusCode).toBe(500);
  });

  test('conserva el mensaje y los detalles recibidos', () => {
    const detalles = { errores: { correo: 'El correo no es válido.' } };
    const error = new ValidationError('Revisa los datos.', detalles);

    expect(error.message).toBe('Revisa los datos.');
    expect(error.detalles).toBe(detalles);
  });

  test('el stack apunta a donde se creó el error, no al constructor', () => {
    const error = new NotFoundError();

    expect(error.stack).toContain('errores.test.js');
    expect(error.stack.split('\n')[1]).not.toContain('AppError.js');
  });
});
