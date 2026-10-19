const ReporteService = require('../services/ReporteService');
const { ValidationError } = require('../utils/errors');

const MIGAS = [{ texto: 'Administrador', url: '/admin' }, { texto: 'Reportes' }];

/**
 * Reportes del admin (HU-08, RF-11).
 */
class ReportesController {
  /** GET /reportes?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (por defecto, el mes actual) */
  static async mostrar(req, res) {
    let rango;
    try {
      rango = ReporteService.validarRango(req.query);
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      // Rango inválido: se muestra el formulario con el error junto al campo y sin datos
      return res.status(400).render('reportes/index', {
        titulo: 'Reportes',
        migas: MIGAS,
        rango: { desde: req.query.desde || '', hasta: req.query.hasta || '' },
        errores: error.detalles.errores,
        mensajes: { exito: [], error: [error.message] },
        tecnicos: [],
        servicios: [],
        estados: [],
      });
    }

    const { desde, hasta } = rango;
    const [tecnicos, servicios, estados] = await Promise.all([
      ReporteService.ticketsPorTecnico(desde, hasta),
      ReporteService.serviciosMasSolicitados(desde, hasta),
      ReporteService.resumenPorEstado(desde, hasta),
    ]);
    return res.render('reportes/index', {
      titulo: 'Reportes', migas: MIGAS, rango, tecnicos, servicios, estados,
    });
  }

  /** GET /reportes/tecnicos.csv?desde=&hasta= — descarga del reporte por técnico. */
  static async exportarCsv(req, res) {
    const { desde, hasta } = ReporteService.validarRango(req.query);
    const filas = await ReporteService.ticketsPorTecnico(desde, hasta);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tickets-por-tecnico_${desde}_${hasta}.csv"`,
    });
    res.send(ReporteService.csvTicketsPorTecnico(filas));
  }
}

module.exports = ReportesController;
