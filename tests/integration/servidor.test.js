const request = require('supertest');
const app = require('../../app');
const sequelize = require('../../config/database');

describe('Servidor', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  test('GET / responde 200 con la página de prueba', async () => {
    const respuesta = await request(app).get('/');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('TecniTrack funcionando');
  });

  test('aplica las cabeceras de seguridad de helmet', async () => {
    const respuesta = await request(app).get('/');

    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    expect(respuesta.headers['content-security-policy']).toBeDefined();
  });

  test('una ruta inexistente responde 404', async () => {
    const respuesta = await request(app).get('/ruta-que-no-existe');

    expect(respuesta.status).toBe(404);
  });

  test('sirve los archivos estáticos de public/', async () => {
    const respuesta = await request(app).get('/css/styles.css');

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toMatch(/text\/css/);
  });

  test('la conexión a MySQL (base de datos de pruebas) funciona', async () => {
    await expect(sequelize.authenticate()).resolves.toBeUndefined();
    expect(sequelize.getDatabaseName()).toBe('tecnitrack_test');
  });
});
