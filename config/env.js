/**
 * Carga las variables de entorno una sola vez para toda la aplicación.
 * Con NODE_ENV=test se lee .env.test (base de datos tecnitrack_test); en otro caso, .env.
 */
const path = require('path');
const dotenv = require('dotenv');

const archivo = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const raiz = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(raiz, archivo), quiet: true });

module.exports = {
  entorno: process.env.NODE_ENV || 'development',
  puerto: Number(process.env.PORT) || 3000,
  secretoSesion: process.env.SESSION_SECRET,
  diasLimiteCotizacion: Number(process.env.DIAS_LIMITE_COTIZACION) || 7,
  maxFotoMb: Number(process.env.MAX_FOTO_MB) || 5,
  // Fotos de tickets: fuera de public/ para servirlas solo con permiso (GET /fotos/:id).
  // Las pruebas usan su propia carpeta para no mezclar archivos.
  directorioFotos: process.env.DIRECTORIO_FOTOS
    ? path.resolve(raiz, process.env.DIRECTORIO_FOTOS)
    : path.join(raiz, 'storage', process.env.NODE_ENV === 'test' ? 'fotos-tickets-test' : 'fotos-tickets'),
  // Rate limit del login y del portal: intentos fallidos por IP en la ventana (0 lo desactiva)
  limiteIntentos: process.env.LIMITE_INTENTOS === undefined ? 5 : Number(process.env.LIMITE_INTENTOS),
  ventanaIntentosMin: Number(process.env.VENTANA_INTENTOS_MIN) || 15,
};
