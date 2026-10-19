/**
 * Respuesta provisional de los módulos que aún no se implementan.
 * Cada router la usa en su ruta raíz para que el ruteo modular se pueda
 * probar desde ya; se reemplaza por el controlador real en cada paso.
 */
class EnConstruccionController {
  /**
   * @param {string} titulo Nombre del módulo.
   * @param {Array<{texto: string, url?: string}>} migas Migas de pan.
   * @returns {Function} Controlador de Express.
   */
  static pagina(titulo, migas = []) {
    return (req, res) => {
      res.render('en-construccion', {
        titulo,
        migas: [...migas, { texto: titulo }],
        rutaBase: req.baseUrl || '/',
      });
    };
  }
}

module.exports = EnConstruccionController;
