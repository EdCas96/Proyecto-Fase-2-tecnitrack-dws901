const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

/** Zona horaria del taller: el año del folio es el de El Salvador, no el de UTC. */
const ZONA_HORARIA = 'America/El_Salvador';

/**
 * Folios de ticket TT-AAAA-NNNN, correlativos por año (SC-02, SC-05).
 *
 * Seguro ante creaciones simultáneas: el contador del año (tabla
 * folio_contadores) se bloquea con SELECT ... FOR UPDATE dentro de la
 * transacción del ticket, así la segunda creación espera a que la primera
 * confirme. El índice único uq_tickets_folio queda como respaldo.
 *
 * @implements RN-03
 */
class FolioService {
  /** "TT-2026-0042"; el número crece más allá de 4 dígitos si hace falta. */
  static formatear(anio, numero) {
    return `TT-${anio}-${String(numero).padStart(4, '0')}`;
  }

  /** Año de una fecha en la zona horaria del taller. */
  static anioDe(fecha = new Date()) {
    return Number(new Intl.DateTimeFormat('en', { timeZone: ZONA_HORARIA, year: 'numeric' }).format(fecha));
  }

  /**
   * Reserva el siguiente folio del año. Debe llamarse dentro de la transacción
   * que crea el ticket: el bloqueo dura hasta que esa transacción termina, y si
   * se revierte, el número no se consume.
   *
   * @implements RN-03
   * @param {import('sequelize').Transaction} transaction
   * @param {Date} [fecha] Fecha de ingreso (define el año).
   * @returns {Promise<string>}
   */
  static async generar(transaction, fecha = new Date()) {
    if (!transaction) throw new Error('FolioService.generar debe usarse dentro de una transacción.');
    const anio = FolioService.anioDe(fecha);
    const opciones = { transaction, replacements: { anio } };

    // El primer ticket del año crea su contador (si otra transacción lo crea a la vez, este INSERT espera e ignora)
    await sequelize.query('INSERT IGNORE INTO folio_contadores (anio, ultimo) VALUES (:anio, 0)', opciones);
    const [contador] = await sequelize.query(
      'SELECT ultimo FROM folio_contadores WHERE anio = :anio FOR UPDATE',
      { ...opciones, type: QueryTypes.SELECT },
    );

    // Respaldo: si hay tickets de ese año que no pasaron por el contador (datos importados), se continúa después del mayor
    const [maximo] = await sequelize.query(
      "SELECT MAX(CAST(SUBSTRING(folio, 9) AS UNSIGNED)) AS ultimo FROM tickets WHERE folio LIKE CONCAT('TT-', :anio, '-%')",
      { ...opciones, type: QueryTypes.SELECT },
    );

    const siguiente = Math.max(Number(contador.ultimo), Number(maximo.ultimo) || 0) + 1;
    await sequelize.query('UPDATE folio_contadores SET ultimo = :siguiente WHERE anio = :anio', {
      transaction, replacements: { anio, siguiente },
    });
    return FolioService.formatear(anio, siguiente);
  }
}

module.exports = FolioService;
