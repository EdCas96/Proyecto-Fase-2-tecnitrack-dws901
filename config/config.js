/**
 * Configuración de conexión usada por sequelize-cli (migraciones y seeders)
 * y por config/database.js. Todos los entornos leen sus datos de .env / .env.test.
 */
require('./env');

const base = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD || null,
  dialect: 'mysql',
  dialectOptions: { charset: 'utf8mb4' },
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  migrationStorageTableName: 'sequelize_meta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
};

module.exports = {
  development: { ...base, logging: false },
  test: { ...base, logging: false },
  production: { ...base, logging: false },
};
