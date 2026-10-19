/**
 * Usuarios (HU-09, RF-09, RN-07, RN-08): crear técnicos con contraseña
 * temporal, editar, activar/desactivar, restablecer contraseña, reglas del
 * último admin y permisos (solo admin).
 */
const bcrypt = require('bcrypt');
const { Usuario } = require('../../models');
const UsuarioService = require('../../services/UsuarioService');
const { BusinessRuleError } = require('../../utils/errors');
const { reiniciarIntentos } = require('../../middlewares/limitarIntentos');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const {
  USUARIOS, crearAgente, iniciarSesion, crearAgenteAutenticado, enviarFormulario,
} = require('../helpers/agente');

let admin;

beforeAll(async () => {
  await sembrarDatos();
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
});
// Las pruebas de login fallido no deben acumular intentos del rate limit
beforeEach(reiniciarIntentos);
afterAll(cerrarConexiones);

const comoAdmin = (opciones) => enviarFormulario(admin.agente, { csrfToken: admin.csrfToken, ...opciones });

/** Intenta iniciar sesión y devuelve a dónde redirige (o el código si falla). */
async function resultadoLogin(correo, password) {
  const { respuesta } = await iniciarSesion(crearAgente(), { correo, password });
  return respuesta.status === 303 ? respuesta.headers.location : respuesta.status;
}

/** Hash guardado en la base (solo con el scope del login). */
const hashDe = async (id) => (await Usuario.scope('conPassword').findByPk(id)).password_hash;

describe('Listado de usuarios', () => {
  test('muestra rol y estado con badge, sin password_hash', async () => {
    const respuesta = await admin.agente.get('/usuarios');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toMatch(/Óscar Meléndez<\/td>[\s\S]*?<td>Técnico<\/td>\s*<td><span class="badge badge-gris">Inactivo<\/span>/);
    expect(respuesta.text).toMatch(/Luis Fernández<\/td>[\s\S]*?<span class="badge badge-verde">Activo<\/span>/);
    expect(respuesta.text).toContain('<td>Administrador</td>');
    expect(respuesta.text).not.toMatch(/password_hash|\$2[aby]\$/);
  });

  test('el admin no ve el botón para desactivarse a sí mismo', async () => {
    const respuesta = await admin.agente.get('/usuarios');

    expect(respuesta.text).not.toContain(`action="/usuarios/${USUARIOS.admin.id}/activo"`);
    expect(respuesta.text).toContain(`action="/usuarios/${USUARIOS.luis.id}/activo"`);
  });

  test('UsuarioService.listar nunca devuelve el hash', async () => {
    const { registros } = await UsuarioService.listar();

    expect(registros.length).toBeGreaterThan(0);
    registros.forEach((usuario) => expect(usuario).not.toHaveProperty('password_hash'));
  });
});

describe('Crear técnicos', () => {
  test('crea un técnico activo con la contraseña cifrada con bcrypt, que ya puede iniciar sesión', async () => {
    const respuesta = await comoAdmin({
      ruta: '/usuarios',
      datos: { nombre: 'Karla Rivas', correo: 'Karla.Rivas@TecniTrack.com', password: 'Temporal2026' },
    });

    expect(respuesta.status).toBe(303);
    const usuario = await Usuario.findOne({ where: { correo: 'karla.rivas@tecnitrack.com' } });
    expect(usuario).toMatchObject({ nombre: 'Karla Rivas', rol: 'tecnico', activo: true });
    const hash = await hashDe(usuario.id);
    expect(hash).not.toBe('Temporal2026');
    expect(await bcrypt.compare('Temporal2026', hash)).toBe(true);
    expect(await resultadoLogin('karla.rivas@tecnitrack.com', 'Temporal2026')).toBe('/tecnico');
  });

  test.each([
    ['corta1', 'La contraseña debe tener al menos 8 caracteres.'],
    ['solamenteletras', 'La contraseña debe incluir al menos un número.'],
    ['12345678', 'La contraseña debe incluir al menos una letra.'],
  ])('rechaza la contraseña débil "%s"', async (password, mensaje) => {
    const respuesta = await comoAdmin({
      ruta: '/usuarios', json: true, datos: { nombre: 'Débil', correo: 'debil@tecnitrack.com', password },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ password: mensaje });
    expect(await Usuario.count({ where: { correo: 'debil@tecnitrack.com' } })).toBe(0);
  });

  test('rechaza un correo que ya usa otra cuenta', async () => {
    const respuesta = await comoAdmin({
      ruta: '/usuarios', json: true, datos: { nombre: 'Duplicado', correo: 'LUIS.FERNANDEZ@tecnitrack.com', password: 'Temporal2026' },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ correo: 'Ya existe un usuario con ese correo.' });
  });

  test('si falla la validación, vuelve al formulario con los datos pero sin la contraseña', async () => {
    await comoAdmin({
      ruta: '/usuarios', referer: '/usuarios/nuevo',
      datos: { nombre: 'Pedro Gómez', correo: 'pedro@tecnitrack.com', password: 'debil' },
    });

    const formulario = await admin.agente.get('/usuarios/nuevo');
    expect(formulario.text).toContain('value="Pedro Gómez"');
    expect(formulario.text).toContain('value="pedro@tecnitrack.com"');
    expect(formulario.text).not.toContain('value="debil"');
    expect(formulario.text).toContain('<p class="campo-error" id="error-password">La contraseña debe tener al menos 8 caracteres.</p>');
  });
});

describe('Editar, activar y desactivar', () => {
  test('edita nombre y correo de un técnico', async () => {
    const tecnico = await UsuarioService.crearTecnico({ nombre: 'Para Editar', correo: 'editar@tecnitrack.com', password: 'Temporal2026' });

    const respuesta = await comoAdmin({
      metodo: 'PUT', ruta: `/usuarios/${tecnico.id}`, datos: { nombre: 'Editado', correo: 'editado@tecnitrack.com' },
    });

    expect(respuesta.headers.location).toBe('/usuarios');
    expect(await Usuario.findByPk(tecnico.id)).toMatchObject({ nombre: 'Editado', correo: 'editado@tecnitrack.com' });
  });

  test('desactivar a un técnico le impide iniciar sesión; activarlo se lo devuelve (RN-07)', async () => {
    const desactivar = await comoAdmin({
      metodo: 'PATCH', ruta: `/usuarios/${USUARIOS.jorge.id}/activo`, datos: { activo: 'false' },
    });

    expect(desactivar.status).toBe(303);
    expect((await Usuario.findByPk(USUARIOS.jorge.id)).activo).toBe(false);
    expect(await resultadoLogin(USUARIOS.jorge.correo, 'Tecni2026!')).toBe(401);

    await comoAdmin({ metodo: 'PATCH', ruta: `/usuarios/${USUARIOS.jorge.id}/activo`, datos: { activo: 'true' } });
    expect(await resultadoLogin(USUARIOS.jorge.correo, 'Tecni2026!')).toBe('/tecnico');
  });

  test('un admin no puede desactivarse a sí mismo', async () => {
    const respuesta = await comoAdmin({
      metodo: 'PATCH', ruta: `/usuarios/${USUARIOS.admin.id}/activo`, json: true, datos: { activo: 'false' },
    });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('No puedes desactivar tu propia cuenta.');
    expect((await Usuario.findByPk(USUARIOS.admin.id)).activo).toBe(true);
  });

  test('no se puede desactivar ni eliminar al último admin activo', async () => {
    // Otro admin (aún sin guardar en la base) intenta quitarle el acceso al único admin activo
    const otroAdminId = 999;

    await expect(UsuarioService.cambiarEstado(USUARIOS.admin.id, false, otroAdminId))
      .rejects.toThrow(new BusinessRuleError('No se puede desactivar al último administrador activo.'));
    await expect(UsuarioService.eliminar(USUARIOS.admin.id, otroAdminId))
      .rejects.toThrow('No se puede eliminar al último administrador activo.');
  });

  test('con dos admins activos, uno puede desactivar al otro', async () => {
    const segundo = await Usuario.create({
      nombre: 'Segundo Admin', correo: 'admin2@tecnitrack.com', rol: 'admin', password_hash: await bcrypt.hash('Tecni2026!', 4),
    });

    const usuario = await UsuarioService.cambiarEstado(segundo.id, false, USUARIOS.admin.id);

    expect(usuario.activo).toBe(false);
  });
});

describe('Restablecer contraseña y eliminar', () => {
  test('el admin asigna una contraseña nueva: la nueva funciona y la anterior no', async () => {
    const respuesta = await comoAdmin({
      metodo: 'PUT', ruta: `/usuarios/${USUARIOS.luis.id}/password`, datos: { password: 'NuevaClave77' },
    });

    expect(respuesta.status).toBe(303);
    expect(await resultadoLogin(USUARIOS.luis.correo, 'NuevaClave77')).toBe('/tecnico');
    expect(await resultadoLogin(USUARIOS.luis.correo, 'Tecni2026!')).toBe(401);
  });

  test('rechaza una contraseña nueva débil sin cambiar la actual', async () => {
    const antes = await hashDe(USUARIOS.jorge.id);

    const respuesta = await comoAdmin({
      metodo: 'PUT', ruta: `/usuarios/${USUARIOS.jorge.id}/password`, json: true, datos: { password: 'abc' },
    });

    expect(respuesta.status).toBe(400);
    expect(await hashDe(USUARIOS.jorge.id)).toBe(antes);
  });

  test('elimina una cuenta sin historial', async () => {
    const tecnico = await UsuarioService.crearTecnico({ nombre: 'Temporal', correo: 'temporal@tecnitrack.com', password: 'Temporal2026' });

    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: `/usuarios/${tecnico.id}` });

    expect(respuesta.status).toBe(303);
    expect(await Usuario.findByPk(tecnico.id)).toBeNull();
  });

  test('no elimina a un técnico con tickets o historial: hay que desactivarlo', async () => {
    const respuesta = await comoAdmin({ metodo: 'DELETE', ruta: `/usuarios/${USUARIOS.luis.id}`, json: true });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toMatch(/tiene tickets o historial registrados\. Desactívalo/);
    expect(await Usuario.findByPk(USUARIOS.luis.id)).not.toBeNull();
  });

  test('un usuario inexistente responde 404', async () => {
    expect((await admin.agente.get('/usuarios/99999/editar')).status).toBe(404);
  });
});

describe('Permisos: solo el admin gestiona usuarios', () => {
  test('el técnico no puede entrar a /usuarios ni crear cuentas', async () => {
    const tecnico = await crearAgenteAutenticado({ correo: USUARIOS.jorge.correo });

    const listado = await tecnico.agente.get('/usuarios');
    const crear = await enviarFormulario(tecnico.agente, {
      ruta: '/usuarios', csrfToken: tecnico.csrfToken, json: true,
      datos: { nombre: 'Intruso', correo: 'intruso@tecnitrack.com', password: 'Temporal2026' },
    });

    expect(listado.status).toBe(403);
    expect(crear.status).toBe(403);
    expect(await Usuario.count({ where: { correo: 'intruso@tecnitrack.com' } })).toBe(0);
  });
});
