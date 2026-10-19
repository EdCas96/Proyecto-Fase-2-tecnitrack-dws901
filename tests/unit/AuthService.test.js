/**
 * Pruebas unitarias de AuthService que no tocan la base de datos:
 * fortaleza de contraseñas y normalización del teléfono del portal.
 */
const AuthService = require('../../services/AuthService');
const { ValidationError } = require('../../utils/errors');

describe('AuthService.validarFortaleza (RN-08)', () => {
  test.each([
    ['Tecni2026!'],
    ['abcdefg1'],
    ['contraseña9'],
    ['12345678a'],
  ])('acepta "%s"', (texto) => {
    expect(AuthService.validarFortaleza(texto)).toBe(true);
  });

  test.each([
    ['abc12', 'al menos 8 caracteres'],
    ['', 'al menos 8 caracteres'],
    ['12345678', 'al menos una letra'],
    ['solamenteletras', 'al menos un número'],
  ])('rechaza "%s" (%s)', (texto, motivo) => {
    expect(() => AuthService.validarFortaleza(texto)).toThrow(ValidationError);
    expect(() => AuthService.validarFortaleza(texto)).toThrow(motivo);
  });

  test('rechaza valores que no son texto', () => {
    expect(() => AuthService.validarFortaleza(undefined)).toThrow(ValidationError);
    expect(() => AuthService.validarFortaleza(12345678)).toThrow(ValidationError);
  });

  test('el error trae el detalle del campo password para el formulario', () => {
    try {
      AuthService.validarFortaleza('corta1');
    } catch (error) {
      expect(error.statusCode).toBe(400);
      expect(error.detalles.errores.password).toMatch(/8 caracteres/);
    }
    expect.assertions(2);
  });

  test('hashPassword valida antes de calcular el hash', async () => {
    await expect(AuthService.hashPassword('debil')).rejects.toThrow(ValidationError);
    const hash = await AuthService.hashPassword('Segura123');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });
});

describe('AuthService.normalizarTelefono (HU-04)', () => {
  test.each([
    ['7123-4567', '71234567'],
    ['7123 4567', '71234567'],
    [' 7123 - 4567 ', '71234567'],
    ['(503) 7123-4567', '50371234567'],
    ['71234567', '71234567'],
  ])('"%s" -> "%s"', (entrada, esperado) => {
    expect(AuthService.normalizarTelefono(entrada)).toBe(esperado);
  });

  test('un valor que no es texto queda vacío', () => {
    expect(AuthService.normalizarTelefono(undefined)).toBe('');
    expect(AuthService.normalizarTelefono(null)).toBe('');
  });
});
