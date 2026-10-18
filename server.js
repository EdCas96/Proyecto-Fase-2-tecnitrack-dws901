/**
 * Punto de entrada: prueba la conexión a MySQL y levanta el servidor HTTP.
 */
const app = require('./app');
const sequelize = require('./config/database');
const { puerto, entorno } = require('./config/env');

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log(`[BD] Conexión a MySQL correcta (${sequelize.getDatabaseName()}).`);
  } catch (error) {
    console.error(`[BD] No se pudo conectar a MySQL: ${error.message}`);
  }

  app.listen(puerto, () => {
    console.log(`[Servidor] TecniTrack escuchando en http://localhost:${puerto} (${entorno})`);
  });
}

iniciar();
