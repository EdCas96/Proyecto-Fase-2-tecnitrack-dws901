/**
 * Configuración de la aplicación Express. Se exporta sin levantar el puerto
 * para que las pruebas (Supertest) puedan usarla directamente.
 *
 * El orden de los middlewares importa; está explicado en docs/ARQUITECTURA.md.
 */
const { entorno } = require('./config/env');

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');

const { sesion } = require('./config/sesion');
const logger = require('./middlewares/logger');
const { proteccionCsrf } = require('./middlewares/csrf');
const { variablesVistas } = require('./middlewares/variablesVistas');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const rutas = require('./routes');
const ayudantesVistas = require('./utils/vistas');

/** Tamaño máximo del cuerpo de formularios y JSON (las fotos van aparte, por Multer). */
const LIMITE_CUERPO = '100kb';
/** Métodos que un formulario puede simular con el campo oculto _method. */
const METODOS_SIMULABLES = new Set(['PUT', 'PATCH', 'DELETE']);

const app = express();

// Detrás de un proxy HTTPS (producción) para que la cookie "secure" funcione
if (entorno === 'production') app.set('trust proxy', 1);

// Vistas EJS con layout común y funciones auxiliares para todas las vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
Object.assign(app.locals, ayudantesVistas);

// 0. Registro de peticiones (primero, para medir el tiempo total de cada una)
if (entorno !== 'test') app.use(logger());

// 1. Cabeceras de seguridad (CSP, X-Frame-Options, nosniff, etc.)
app.use(helmet());

// Archivos estáticos: antes de la sesión para no crear sesiones al pedir CSS o imágenes
app.use(express.static(path.join(__dirname, 'public')));

// 2. Cuerpo de formularios y JSON, con límite de tamaño
app.use(express.urlencoded({ extended: false, limit: LIMITE_CUERPO }));
app.use(express.json({ limit: LIMITE_CUERPO }));

// 3. Cookies (las necesita csrf-csrf)
app.use(cookieParser());

// 4. PUT/PATCH/DELETE desde formularios: <input type="hidden" name="_method" value="DELETE">
app.use(methodOverride((req) => {
  const metodo = req.body && typeof req.body._method === 'string' ? req.body._method.toUpperCase() : null;
  if (req.body) delete req.body._method;
  return METODOS_SIMULABLES.has(metodo) ? metodo : undefined;
}));

// 5. Sesión guardada en MySQL (cookie httpOnly, sameSite=lax, secure en producción, 8 h)
app.use(sesion);

// 6. Mensajes flash (usan la sesión)
app.use(flash());

// 7. CSRF: rechaza con 403 cualquier POST/PUT/PATCH/DELETE sin token válido
app.use(proteccionCsrf);

// 8. Variables para todas las vistas: usuario de sesión, flash y token CSRF
app.use(variablesVistas);

// Rutas de los módulos
app.use('/', rutas);

// 404 y manejo central de errores (siempre al final)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
