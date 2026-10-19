/**
 * Sesiones de express-session guardadas en MySQL (tabla "sesiones").
 * La tabla la crea la migración 20261018000011-crear-sesiones.js.
 */
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const { entorno, secretoSesion } = require('./env');
const { COOKIE_SESION } = require('../utils/sesion');

if (!secretoSesion) {
  throw new Error('Falta SESSION_SECRET en el archivo .env (ver .env.example).');
}

/** Duración de la sesión: una jornada de trabajo. */
const DURACION_SESION_MS = 8 * 60 * 60 * 1000;

const MySQLStore = MySQLStoreFactory(session);

const almacenSesiones = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME,
  createDatabaseTable: false,
  expiration: DURACION_SESION_MS,
  // En pruebas no se programa la limpieza periódica: su temporizador dejaría a Jest esperando
  clearExpired: entorno !== 'test',
  schema: { tableName: 'sesiones' },
});

const sesion = session({
  name: COOKIE_SESION,
  secret: secretoSesion,
  store: almacenSesiones,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: entorno === 'production',
    maxAge: DURACION_SESION_MS,
  },
});

module.exports = { sesion, almacenSesiones, DURACION_SESION_MS };
