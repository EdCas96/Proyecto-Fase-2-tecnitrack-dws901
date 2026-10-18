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
  dialectOptions: { charset: 'utf8mb4', decimalNumbers: true },
  // Hora de El Salvador (UTC-6, sin horario de verano)
  timezone: '-06:00',
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  hooks: {
    // Modo estricto en cada conexión: sin él (p. ej. el sql_mode por defecto de XAMPP) MySQL
    // acepta ENUM inválidos o NOT NULL vacíos con solo un aviso en lugar de rechazarlos.
    async afterConnect(conexion) {
      await conexion
        .promise()
        .query(
          "SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'",
        );
    },
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
