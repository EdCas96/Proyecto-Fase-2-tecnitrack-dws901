const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');
const { ValidationError } = require('../utils/errors');
const { ESTADOS_TICKET } = require('../utils/constantes');

const ZONA_HORARIA = 'America/El_Salvador';
const MAX_DIAS_RANGO = 366;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
/** Marca de orden de bytes: Excel la necesita para leer el CSV como UTF-8. */
const BOM = String.fromCharCode(0xfeff);
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** "AAAA-MM-DD" de una fecha en la hora de El Salvador. */
const fechaLocal = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(fecha);

/** Inicio del día "AAAA-MM-DD" en El Salvador (UTC-6, sin horario de verano). */
const inicioDelDia = (texto) => new Date(`${texto}T00:00:00-06:00`);

/** Error de validación del rango, con el mensaje junto al campo. */
const errorRango = (campo, mensaje) => new ValidationError(mensaje, { errores: { [campo]: mensaje } });

/**
 * Reportes del admin (HU-08, RF-11). Todos los cálculos se hacen con
 * consultas agregadas en la base de datos (COUNT, SUM, AVG, GROUP BY):
 * nunca se traen los tickets a memoria para contarlos.
 *
 * Rango: desde y hasta son días completos en hora de El Salvador (incluidos ambos).
 */
class ReporteService {
  /**
   * Valida el rango del reporte. Sin fechas, usa el mes actual (del día 1 a hoy).
   *
   * @param {{desde?: string, hasta?: string}} [filtros] Fechas "AAAA-MM-DD".
   * @param {Date} [hoy]
   * @returns {{desde: string, hasta: string, inicio: Date, fin: Date}} fin es exclusivo (día siguiente a "hasta").
   * @throws {ValidationError}
   */
  static validarRango({ desde, hasta } = {}, hoy = new Date()) {
    const sinFechas = !desde && !hasta;
    const hoyTexto = fechaLocal(hoy);
    const textoDesde = sinFechas ? `${hoyTexto.slice(0, 8)}01` : String(desde || '').trim();
    const textoHasta = sinFechas ? hoyTexto : String(hasta || '').trim();

    if (!textoDesde) throw errorRango('desde', 'Indica la fecha inicial del reporte.');
    if (!textoHasta) throw errorRango('hasta', 'Indica la fecha final del reporte.');
    const valida = (texto) => REGEX_FECHA.test(texto) && fechaLocal(inicioDelDia(texto)) === texto;
    if (!valida(textoDesde)) throw errorRango('desde', 'La fecha inicial no es válida.');
    if (!valida(textoHasta)) throw errorRango('hasta', 'La fecha final no es válida.');

    const inicio = inicioDelDia(textoDesde);
    const fin = new Date(inicioDelDia(textoHasta).getTime() + MS_POR_DIA);
    if (textoDesde > textoHasta) throw errorRango('hasta', 'La fecha final debe ser igual o posterior a la inicial.');
    if ((fin - inicio) / MS_POR_DIA > MAX_DIAS_RANGO) throw errorRango('hasta', 'El rango no puede ser mayor a un año.');

    return {
      desde: textoDesde, hasta: textoHasta, inicio, fin,
    };
  }

  /**
   * Por técnico: tickets Entregados en el rango y tiempo promedio de reparación
   * en días (un decimal), medido en ticket_historiales desde que el ticket
   * entró a Recibido hasta que pasó a Entregado. Incluye a los técnicos activos
   * sin entregas (con 0) y a los inactivos que sí entregaron en el rango.
   *
   * @implements HU-08, RF-11
   * @param {string} desde "AAAA-MM-DD"
   * @param {string} hasta "AAAA-MM-DD"
   * @returns {Promise<Array<{tecnicoId: number, tecnico: string, activo: boolean, atendidos: number, promedioDias: number|null}>>}
   */
  static async ticketsPorTecnico(desde, hasta) {
    const { inicio, fin } = ReporteService.validarRango({ desde, hasta });
    const filas = await sequelize.query(`
      SELECT u.id AS tecnicoId, u.nombre AS tecnico, u.activo AS activo,
             COUNT(e.ticket_id) AS atendidos,
             ROUND(AVG(TIMESTAMPDIFF(SECOND, r.fecha, e.fecha)) / 86400, 1) AS promedioDias
      FROM usuarios AS u
      LEFT JOIN (
        SELECT t.id AS ticket_id, t.tecnico_id, MAX(h.fecha) AS fecha
        FROM tickets AS t
        JOIN ticket_historiales AS h ON h.ticket_id = t.id AND h.estado_nuevo = 'Entregado'
        WHERE t.estado = 'Entregado'
        GROUP BY t.id, t.tecnico_id
        HAVING MAX(h.fecha) >= :inicio AND MAX(h.fecha) < :fin
      ) AS e ON e.tecnico_id = u.id
      LEFT JOIN (
        SELECT ticket_id, MIN(fecha) AS fecha
        FROM ticket_historiales
        WHERE estado_nuevo = 'Recibido'
        GROUP BY ticket_id
      ) AS r ON r.ticket_id = e.ticket_id
      WHERE u.rol = 'tecnico'
      GROUP BY u.id, u.nombre, u.activo
      HAVING u.activo = 1 OR COUNT(e.ticket_id) > 0
      ORDER BY atendidos DESC, u.nombre ASC
    `, { replacements: { inicio, fin }, type: QueryTypes.SELECT });

    return filas.map((fila) => ({
      tecnicoId: Number(fila.tecnicoId),
      tecnico: fila.tecnico,
      activo: Boolean(fila.activo),
      atendidos: Number(fila.atendidos),
      promedioDias: fila.promedioDias === null ? null : Number(fila.promedioDias),
    }));
  }

  /**
   * Ítems del catálogo más usados en cotizaciones Aprobadas (por fecha de la
   * cotización dentro del rango), sumando cantidades.
   *
   * @implements HU-08
   * @param {string} desde
   * @param {string} hasta
   * @param {number} [limite=10]
   * @returns {Promise<Array<{catalogoId: number, nombre: string, tipo: string, cantidad: number}>>}
   */
  static async serviciosMasSolicitados(desde, hasta, limite = 10) {
    const { inicio, fin } = ReporteService.validarRango({ desde, hasta });
    const filas = await sequelize.query(`
      SELECT ci.catalogo_id AS catalogoId, cat.nombre, cat.tipo, SUM(ci.cantidad) AS cantidad
      FROM cotizacion_items AS ci
      JOIN cotizaciones AS c ON c.id = ci.cotizacion_id AND c.estado = 'Aprobada'
      JOIN catalogo_items AS cat ON cat.id = ci.catalogo_id
      WHERE c.fecha >= :inicio AND c.fecha < :fin
      GROUP BY ci.catalogo_id, cat.nombre, cat.tipo
      ORDER BY cantidad DESC, cat.nombre ASC
      LIMIT :limite
    `, { replacements: { inicio, fin, limite: Number(limite) }, type: QueryTypes.SELECT });

    return filas.map((fila) => ({
      catalogoId: Number(fila.catalogoId), nombre: fila.nombre, tipo: fila.tipo, cantidad: Number(fila.cantidad),
    }));
  }

  /**
   * Tickets que ingresaron en el rango, agrupados por su estado actual
   * (todos los estados, con 0 los que no tienen tickets).
   *
   * @implements HU-08
   * @returns {Promise<Array<{estado: string, total: number}>>}
   */
  static async resumenPorEstado(desde, hasta) {
    const { inicio, fin } = ReporteService.validarRango({ desde, hasta });
    const filas = await sequelize.query(`
      SELECT estado, COUNT(*) AS total
      FROM tickets
      WHERE fecha_ingreso >= :inicio AND fecha_ingreso < :fin
      GROUP BY estado
    `, { replacements: { inicio, fin }, type: QueryTypes.SELECT });

    const porEstado = Object.fromEntries(filas.map(({ estado, total }) => [estado, Number(total)]));
    return ESTADOS_TICKET.map((estado) => ({ estado, total: porEstado[estado] || 0 }));
  }

  /**
   * CSV del reporte por técnico, en UTF-8 con BOM para que Excel muestre bien las tildes.
   *
   * @implements HU-08
   * @param {Array<{tecnico: string, atendidos: number, promedioDias: number|null}>} filas
   * @returns {string}
   */
  static csvTicketsPorTecnico(filas) {
    const campo = (valor) => {
      const texto = String(valor ?? '');
      return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const lineas = [
      ['Técnico', 'Tickets atendidos', 'Tiempo promedio de reparación (días)'],
      ...filas.map((f) => [f.tecnico, f.atendidos, f.promedioDias === null ? '' : f.promedioDias.toFixed(1)]),
    ];
    return `${BOM}${lineas.map((linea) => linea.map(campo).join(',')).join('\r\n')}\r\n`;
  }
}

ReporteService.MAX_DIAS_RANGO = MAX_DIAS_RANGO;

module.exports = ReporteService;
