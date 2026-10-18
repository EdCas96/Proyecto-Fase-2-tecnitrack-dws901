/**
 * Genera database/tecnitrack.sql (esquema + datos) a partir de la base de desarrollo.
 * Uso: npm run db:sql   (antes: npm run db:reset para partir de los datos de ejemplo)
 *
 * Usa mysqldump y luego quita de los INSERT la columna generada
 * cotizaciones.pendiente_ticket_id: el mysqldump de MariaDB la incluye y MySQL 8
 * rechaza valores explícitos en columnas generadas (error 3105).
 * La ruta de mysqldump se toma de MYSQLDUMP_PATH, del XAMPP por defecto o del PATH.
 */
require('../config/env');

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RUTA_XAMPP = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
const mysqldump = process.env.MYSQLDUMP_PATH || (fs.existsSync(RUTA_XAMPP) ? RUTA_XAMPP : 'mysqldump');
const destino = path.join(__dirname, 'tecnitrack.sql');

const argumentos = [
  `--host=${process.env.DB_HOST}`,
  `--port=${process.env.DB_PORT}`,
  `--user=${process.env.DB_USER}`,
  '--databases', process.env.DB_NAME,
  '--add-drop-database',
  '--skip-dump-date',
  '--default-character-set=utf8mb4',
  '--routines',
  '--triggers',
  '--complete-insert',
];

// La contraseña va por variable de entorno para que no aparezca en la lista de procesos
const volcado = execFileSync(mysqldump, argumentos, {
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
  env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' },
});

const COLUMNA = 'pendiente_ticket_id';
const sql = volcado
  .replace(/\r\n/g, '\n') // mysqldump en Windows escribe CRLF
  .split('\n')
  .map((linea) => {
    if (!linea.startsWith('INSERT INTO `cotizaciones`')) return linea;
    // pendiente_ticket_id es la última columna: se quita del listado y el último valor de cada fila
    return linea
      .replace(`, \`${COLUMNA}\``, '')
      .replace(/,(NULL|\d+)\)(?=[,;])/g, ')');
  })
  .join('\n');

if (sql.includes(`\`${COLUMNA}\`) VALUES`)) {
  throw new Error(`No se pudo quitar ${COLUMNA} de los INSERT de cotizaciones.`);
}

const encabezado = [
  '-- TecniTrack: script completo de creación de la base, tablas y datos de ejemplo.',
  '-- Generado con: npm run db:sql (database/generar-sql.js). No editar a mano.',
  '-- Importar con: mysql -u root -p < database/tecnitrack.sql',
  '',
].join('\n');

fs.writeFileSync(destino, encabezado + sql);
console.log(`[BD] Script SQL generado en ${path.relative(process.cwd(), destino)}`);
