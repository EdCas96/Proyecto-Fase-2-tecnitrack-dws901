/**
 * Configuración de la aplicación Express. Se exporta sin levantar el puerto
 * para que las pruebas (Supertest) puedan usarla directamente.
 */
require('./config/env');

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');

const rutas = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/errores');

const app = express();

// Vistas EJS con layout común
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/principal');

// Seguridad: cabeceras HTTP (CSP, X-Frame-Options, etc.)
app.use(helmet());

// Archivos estáticos (CSS, JS y fotos subidas)
app.use(express.static(path.join(__dirname, 'public')));

// Lectura de formularios y JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Rutas
app.use('/', rutas);

// 404 y manejo central de errores (siempre al final)
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
