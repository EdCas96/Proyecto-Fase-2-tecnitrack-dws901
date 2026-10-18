/**
 * Fábricas de registros válidos para las pruebas. Cada una acepta campos que
 * sobrescriben los valores por defecto. Los valores únicos usan un contador.
 */
const {
  Usuario, Cliente, Equipo, CatalogoItem, Ticket, Cotizacion,
} = require('../../models');

let contador = 0;
const siguiente = () => {
  contador += 1;
  return contador;
};

// Hash bcrypt fijo: las pruebas de modelos no necesitan calcular uno real
const HASH_FALSO = '$2b$04$abcdefghijklmnopqrstuuJ3h1Zb5mXkFQ0Gd7d0uW3m3nL5Gq6eW';

function crearUsuario(campos = {}) {
  const n = siguiente();
  return Usuario.create({
    nombre: `Técnico ${n}`,
    correo: `tecnico${n}@tecnitrack.com`,
    password_hash: HASH_FALSO,
    rol: 'tecnico',
    ...campos,
  });
}

function crearCliente(campos = {}) {
  const n = siguiente();
  return Cliente.create({
    nombre: `Cliente ${n}`,
    telefono: '7000-0000',
    correo: `cliente${n}@example.com`,
    ...campos,
  });
}

async function crearEquipo(campos = {}) {
  const n = siguiente();
  const clienteId = campos.cliente_id ?? (await crearCliente()).id;
  return Equipo.create({
    tipo: 'Laptop',
    marca: 'Dell',
    modelo: 'Inspiron 15',
    numero_serie: `SN-${n}`,
    ...campos,
    cliente_id: clienteId,
  });
}

function crearCatalogoItem(campos = {}) {
  const n = siguiente();
  return CatalogoItem.create({
    nombre: `Servicio ${n}`,
    tipo: 'Servicio',
    precio_referencia: 10,
    ...campos,
  });
}

async function crearTicket(campos = {}) {
  const n = siguiente();
  const equipoId = campos.equipo_id ?? (await crearEquipo()).id;
  return Ticket.create({
    folio: `TT-2026-${String(n).padStart(4, '0')}`,
    diagnostico_inicial: 'No enciende la pantalla.',
    ...campos,
    equipo_id: equipoId,
  });
}

async function crearCotizacion(campos = {}) {
  const ticketId = campos.ticket_id ?? (await crearTicket()).id;
  return Cotizacion.create({ total: 0, ...campos, ticket_id: ticketId });
}

module.exports = {
  HASH_FALSO,
  crearUsuario,
  crearCliente,
  crearEquipo,
  crearCatalogoItem,
  crearTicket,
  crearCotizacion,
};
