/**
 * Subida de fotos de tickets con Multer (HU-02).
 *
 * - Solo JPG, PNG y WEBP: se verifican el tipo MIME declarado, la extensión y
 *   la firma real del archivo (sus primeros bytes), porque los dos primeros
 *   los controla el cliente.
 * - Tamaño máximo por foto: MAX_FOTO_MB. Máximo 5 fotos por envío.
 * - Nombres únicos (fecha + UUID): nunca se usa el nombre original del archivo.
 * - Los errores se convierten en ValidationError con mensajes en español, y
 *   los archivos de un envío rechazado se borran.
 *
 * Los formularios multipart envían el token CSRF en la query string
 * (action="...?_csrf=<%= csrfToken %>"), ver middlewares/csrf.js.
 *
 * @implements HU-02
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { ValidationError } = require('../utils/errors');
const { maxFotoMb } = require('../config/env');

const MAX_FOTOS = 5;
const DIRECTORIO_FOTOS = path.join(__dirname, '..', 'public', 'uploads', 'tickets');
/** Ruta pública con la que se sirven (express.static de public/). */
const URL_FOTOS = '/uploads/tickets';

const TIPOS_PERMITIDOS = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

/** Firmas (magic numbers) de cada formato. */
const FIRMAS = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

const MENSAJE_TIPO = 'Solo se permiten fotos JPG, PNG o WEBP.';

function errorDeFotos(mensaje, campo) {
  return new ValidationError(mensaje, { errores: { [campo]: mensaje } });
}

function traducirErrorMulter(err, { campo, maxMb, maxFotos }) {
  if (err instanceof ValidationError) return err;
  if (!(err instanceof multer.MulterError)) return err;

  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      return errorDeFotos(`Cada foto puede pesar como máximo ${maxMb} MB.`, campo);
    case 'LIMIT_FILE_COUNT':
      return errorDeFotos(`Puedes subir como máximo ${maxFotos} fotos.`, campo);
    case 'LIMIT_UNEXPECTED_FILE':
      // Multer usa este código tanto para "demasiados archivos en el campo" como para un campo desconocido
      return err.field === campo
        ? errorDeFotos(`Puedes subir como máximo ${maxFotos} fotos.`, campo)
        : errorDeFotos(`El campo de archivo "${err.field}" no es válido.`, campo);
    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
      return errorDeFotos('El formulario enviado es demasiado grande.', campo);
    default:
      return errorDeFotos('No se pudo procesar el archivo enviado.', campo);
  }
}

async function leerCabecera(ruta) {
  const archivo = await fs.promises.open(ruta, 'r');
  try {
    const bytes = Buffer.alloc(12);
    await archivo.read(bytes, 0, 12, 0);
    return bytes;
  } finally {
    await archivo.close();
  }
}

async function borrarArchivos(archivos = []) {
  await Promise.all(archivos.map((a) => fs.promises.rm(a.path, { force: true })));
}

/**
 * Crea el middleware de subida. Las opciones permiten a las pruebas usar otro
 * directorio y límites más pequeños.
 *
 * @param {object} [opciones]
 * @param {string} [opciones.campo='fotos'] Nombre del campo <input type="file">.
 * @param {string} [opciones.destino] Carpeta donde se guardan los archivos.
 * @param {number} [opciones.maxMb=MAX_FOTO_MB] Tamaño máximo por foto en MB.
 * @param {number} [opciones.maxFotos=5] Cantidad máxima de fotos.
 * @returns {Function} Middleware de Express; deja las fotos en req.files.
 */
function crearSubidaFotos({
  campo = 'fotos', destino = DIRECTORIO_FOTOS, maxMb = maxFotoMb, maxFotos = MAX_FOTOS,
} = {}) {
  fs.mkdirSync(destino, { recursive: true });

  const almacenamiento = multer.diskStorage({
    destination: destino,
    filename: (req, archivo, cb) => {
      const extension = path.extname(archivo.originalname).toLowerCase().replace('.jpeg', '.jpg');
      cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  });

  const subir = multer({
    storage: almacenamiento,
    limits: { fileSize: maxMb * 1024 * 1024, files: maxFotos },
    fileFilter: (req, archivo, cb) => {
      const extension = path.extname(archivo.originalname).toLowerCase();
      const extensiones = TIPOS_PERMITIDOS[archivo.mimetype];
      if (!extensiones || !extensiones.includes(extension)) {
        return cb(errorDeFotos(MENSAJE_TIPO, campo));
      }
      return cb(null, true);
    },
  }).array(campo, maxFotos);

  return (req, res, next) => {
    subir(req, res, async (err) => {
      if (err) {
        await borrarArchivos(req.files);
        return next(traducirErrorMulter(err, { campo, maxMb, maxFotos }));
      }

      try {
        const archivos = req.files || [];
        const cabeceras = await Promise.all(archivos.map((a) => leerCabecera(a.path)));
        const falsificado = archivos.some((a, i) => !FIRMAS[a.mimetype](cabeceras[i]));
        if (falsificado) {
          await borrarArchivos(archivos);
          return next(errorDeFotos(MENSAJE_TIPO, campo));
        }
        return next();
      } catch (errorLectura) {
        await borrarArchivos(req.files);
        return next(errorLectura);
      }
    });
  };
}

/** Middleware listo para las rutas de tickets: campo "fotos", carpeta public/uploads/tickets. */
const subirFotos = crearSubidaFotos();

module.exports = {
  subirFotos,
  crearSubidaFotos,
  MAX_FOTOS,
  URL_FOTOS,
  DIRECTORIO_FOTOS,
};
