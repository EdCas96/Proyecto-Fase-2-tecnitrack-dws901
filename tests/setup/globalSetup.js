/**
 * Se ejecuta una vez antes de todas las pruebas:
 * crea tecnitrack_test si no existe y reconstruye su esquema con las migraciones
 * (undo:all + migrate), de modo que las pruebas siempre usan el esquema real.
 */
const path = require('path');
const { execFileSync } = require('child_process');
const mysql = require('mysql2/promise');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  require('../../config/env');

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  // Protección: nunca correr las pruebas (que borran datos) contra una base que no sea de pruebas
  if (!/_test$/.test(DB_NAME || '')) {
    throw new Error(`Las pruebas solo pueden usar una base terminada en _test (DB_NAME=${DB_NAME}). Revisa .env.test.`);
  }

  const conexion = await mysql.createConnection({
    host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD || undefined,
  });
  await conexion.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conexion.end();

  const cli = path.resolve(__dirname, '../../node_modules/sequelize-cli/lib/sequelize');
  const opciones = { cwd: path.resolve(__dirname, '../..'), env: process.env, stdio: 'pipe' };
  execFileSync(process.execPath, [cli, 'db:migrate:undo:all'], opciones);
  execFileSync(process.execPath, [cli, 'db:migrate'], opciones);
};
