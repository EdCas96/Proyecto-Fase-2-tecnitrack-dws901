/**
 * Middleware de subida de fotos (middlewares/upload.js), en una mini app que
 * guarda en una carpeta temporal.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { crearSubidaFotos, MAX_FOTOS } = require('../../middlewares/upload');
const { crearAppPrueba } = require('../helpers/appPrueba');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64)]);
const MAX_MB = 1;

let destino;
let app;

const archivosGuardados = () => fs.readdirSync(destino);

beforeEach(() => {
  destino = fs.mkdtempSync(path.join(os.tmpdir(), 'tecnitrack-fotos-'));
  const subir = crearSubidaFotos({ destino, maxMb: MAX_MB });
  app = crearAppPrueba((a) => {
    a.post('/fotos', subir, (req, res) => res.json({
      archivos: req.files.map((f) => ({ nombre: f.filename, original: f.originalname })),
    }));
  });
});

afterEach(() => {
  fs.rmSync(destino, { recursive: true, force: true });
});

const enviar = () => request(app).post('/fotos').set('Accept', 'application/json');

describe('upload: archivos aceptados', () => {
  test('acepta JPG, PNG y WEBP y los guarda con un nombre único', async () => {
    const respuesta = await enviar()
      .attach('fotos', JPG, { filename: 'Foto Frontal.JPG', contentType: 'image/jpeg' })
      .attach('fotos', PNG, { filename: 'pantalla.png', contentType: 'image/png' })
      .attach('fotos', WEBP, { filename: 'teclado.webp', contentType: 'image/webp' });

    expect(respuesta.status).toBe(200);
    const nombres = respuesta.body.archivos.map((a) => a.nombre);
    expect(nombres).toHaveLength(3);
    nombres.forEach((nombre) => expect(nombre).toMatch(/^\d+-[0-9a-f-]{36}\.(jpg|png|webp)$/));
    expect(nombres.join()).not.toMatch(/Frontal|pantalla|teclado/);
    expect(archivosGuardados()).toHaveLength(3);
  });

  test(`acepta hasta ${MAX_FOTOS} fotos`, async () => {
    let peticion = enviar();
    for (let i = 0; i < MAX_FOTOS; i += 1) {
      peticion = peticion.attach('fotos', PNG, { filename: `f${i}.png`, contentType: 'image/png' });
    }

    expect((await peticion).status).toBe(200);
  });
});

describe('upload: archivos rechazados (ValidationError en español)', () => {
  test('rechaza un archivo .txt', async () => {
    const respuesta = await enviar()
      .attach('fotos', Buffer.from('hola'), { filename: 'notas.txt', contentType: 'text/plain' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toMatchObject({
      error: 'ValidationError',
      mensaje: 'Solo se permiten fotos JPG, PNG o WEBP.',
      errores: { fotos: 'Solo se permiten fotos JPG, PNG o WEBP.' },
    });
    expect(archivosGuardados()).toHaveLength(0);
  });

  test('rechaza un archivo que supera el tamaño máximo', async () => {
    const grande = Buffer.concat([PNG, Buffer.alloc(MAX_MB * 1024 * 1024)]);
    const respuesta = await enviar()
      .attach('fotos', grande, { filename: 'grande.png', contentType: 'image/png' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe(`Cada foto puede pesar como máximo ${MAX_MB} MB.`);
    expect(archivosGuardados()).toHaveLength(0);
  });

  test(`rechaza más de ${MAX_FOTOS} fotos y no deja archivos a medias`, async () => {
    let peticion = enviar();
    for (let i = 0; i <= MAX_FOTOS; i += 1) {
      peticion = peticion.attach('fotos', PNG, { filename: `f${i}.png`, contentType: 'image/png' });
    }
    const respuesta = await peticion;

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe(`Puedes subir como máximo ${MAX_FOTOS} fotos.`);
    expect(archivosGuardados()).toHaveLength(0);
  });

  test('rechaza una extensión de imagen que no coincide con el tipo MIME', async () => {
    const respuesta = await enviar()
      .attach('fotos', PNG, { filename: 'foto.gif', contentType: 'image/png' });

    expect(respuesta.status).toBe(400);
  });

  test('rechaza un archivo disfrazado de PNG (nombre y MIME correctos, contenido de texto)', async () => {
    const respuesta = await enviar()
      .attach('fotos', Buffer.from('<?php echo "no soy una imagen"; ?>'), { filename: 'foto.png', contentType: 'image/png' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('Solo se permiten fotos JPG, PNG o WEBP.');
    expect(archivosGuardados()).toHaveLength(0);
  });

  test('rechaza un campo de archivo distinto de "fotos"', async () => {
    const respuesta = await enviar()
      .attach('otro', PNG, { filename: 'foto.png', contentType: 'image/png' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toBe('El campo de archivo "otro" no es válido.');
  });

  test('desde un formulario regresa a la página anterior con el error en flash', async () => {
    const agente = request.agent(app);
    const respuesta = await agente
      .post('/fotos')
      .set('Referer', 'http://127.0.0.1/tickets/nuevo')
      .field('diagnostico_inicial', 'No enciende')
      .attach('fotos', Buffer.from('hola'), { filename: 'notas.txt', contentType: 'text/plain' });

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/');
    const flash = (await agente.get('/__flash')).body;
    expect(flash.error).toEqual(['Solo se permiten fotos JPG, PNG o WEBP.']);
  });
});
