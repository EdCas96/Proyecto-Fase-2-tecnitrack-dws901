/**
 * Pruebas unitarias de los métodos principales de ClienteService,
 * EquipoService, CatalogoService y UsuarioService. Los modelos se simulan
 * con jest.spyOn: aquí no se toca la base de datos (eso lo prueban
 * tests/integration/clientes, catalogo y usuarios).
 */
const {
  Cliente, Equipo, CatalogoItem, Usuario,
} = require('../../models');
const ClienteService = require('../../services/ClienteService');
const EquipoService = require('../../services/EquipoService');
const CatalogoService = require('../../services/CatalogoService');
const UsuarioService = require('../../services/UsuarioService');
const { ValidationError, BusinessRuleError, NotFoundError } = require('../../utils/errors');
const {
  leerPagina, opcionesPaginacion, resultadoPaginado, POR_PAGINA,
} = require('../../utils/paginacion');
const { escaparLike, textoOpcional, formatearTelefonoSV } = require('../../utils/texto');

/** Registro simulado con get() para los atributos calculados (COUNT en subconsultas). */
const registro = (datos, calculados = {}) => ({
  ...datos,
  get: (campo) => calculados[campo],
  destroy: jest.fn().mockResolvedValue(),
  update: jest.fn(function actualizar(cambios) { Object.assign(this, cambios); return Promise.resolve(this); }),
  toJSON() { return { ...datos }; },
});

afterEach(() => jest.restoreAllMocks());

describe('utils/paginacion y utils/texto', () => {
  test('leerPagina acepta solo enteros positivos', () => {
    expect(leerPagina('3')).toBe(3);
    expect([leerPagina('0'), leerPagina('-2'), leerPagina('abc'), leerPagina(undefined)]).toEqual([1, 1, 1, 1]);
  });

  test('opcionesPaginacion calcula LIMIT/OFFSET de 10 en 10', () => {
    expect(POR_PAGINA).toBe(10);
    expect(opcionesPaginacion(1)).toEqual({ limit: 10, offset: 0 });
    expect(opcionesPaginacion(4)).toEqual({ limit: 10, offset: 30 });
  });

  test('resultadoPaginado calcula el total de páginas (mínimo 1)', () => {
    expect(resultadoPaginado({ count: 503, rows: [] }, 2)).toMatchObject({ total: 503, pagina: 2, totalPaginas: 51 });
    expect(resultadoPaginado({ count: 0, rows: [] }, 1).totalPaginas).toBe(1);
  });

  test('formatearTelefonoSV deja 8 dígitos en formato 0000-0000', () => {
    expect(formatearTelefonoSV('71234567')).toBe('7123-4567');
    expect(formatearTelefonoSV('7123-4567')).toBe('7123-4567');
    expect(formatearTelefonoSV('123')).toBeNull();
    expect(formatearTelefonoSV('7123-45678')).toBeNull();
  });

  test('escaparLike y textoOpcional', () => {
    expect(escaparLike('50%_x')).toBe('50\\%\\_x');
    expect(textoOpcional('  hola ')).toBe('hola');
    expect(textoOpcional('   ')).toBeNull();
  });
});

describe('ClienteService', () => {
  test('limpiarDatos solo deja nombre, teléfono y correo', () => {
    const limpio = ClienteService.limpiarDatos({
      nombre: ' Ana ', telefono: '73456720', correo: '', id: 99, createdAt: 'x',
    });

    expect(limpio).toEqual({ nombre: 'Ana', telefono: '7345-6720', correo: null });
  });

  test('limpiarDatos rechaza un teléfono que no tiene 8 dígitos', () => {
    expect(() => ClienteService.limpiarDatos({ nombre: 'Ana', telefono: '123' })).toThrow(ValidationError);
  });

  test('tieneEquipo detecta si se llenó algún campo del equipo', () => {
    expect(ClienteService.tieneEquipo({ nombre: 'Ana' })).toBe(false);
    expect(ClienteService.tieneEquipo({ equipo_marca: '  ' })).toBe(false);
    expect(ClienteService.tieneEquipo({ equipo_numero_serie: 'X-1' })).toBe(true);
  });

  test('eliminar rechaza a un cliente con equipos', async () => {
    const cliente = registro({ id: 3, nombre: 'Ana' }, { totalEquipos: 2 });
    jest.spyOn(Cliente, 'findByPk').mockResolvedValue(cliente);

    await expect(ClienteService.eliminar(3)).rejects.toThrow(BusinessRuleError);
    expect(cliente.destroy).not.toHaveBeenCalled();
  });

  test('eliminar borra a un cliente sin equipos', async () => {
    const cliente = registro({ id: 4, nombre: 'Sin equipos' }, { totalEquipos: 0 });
    jest.spyOn(Cliente, 'findByPk').mockResolvedValue(cliente);

    await ClienteService.eliminar(4);

    expect(cliente.destroy).toHaveBeenCalled();
  });

  test('obtenerPorId: un id que no es número da NotFoundError sin consultar', async () => {
    const espia = jest.spyOn(Cliente, 'findByPk');

    await expect(ClienteService.obtenerPorId('abc')).rejects.toThrow(NotFoundError);
    expect(espia).not.toHaveBeenCalled();
  });
});

describe('EquipoService', () => {
  test('eliminar rechaza un equipo con tickets', async () => {
    const equipo = registro({ id: 1, cliente_id: 1 }, { totalTickets: 3 });
    jest.spyOn(Equipo, 'findByPk').mockResolvedValue(equipo);

    await expect(EquipoService.eliminar(1)).rejects.toThrow('tiene 3 tickets registrados');
    expect(equipo.destroy).not.toHaveBeenCalled();
  });

  test('eliminar devuelve el cliente para regresar a su detalle', async () => {
    jest.spyOn(Equipo, 'findByPk').mockResolvedValue(registro({ id: 9, cliente_id: 2 }, { totalTickets: 0 }));

    await expect(EquipoService.eliminar(9)).resolves.toEqual({ clienteId: 2 });
  });

  test('validarSerieUnica rechaza un número de serie que ya existe en otro equipo', async () => {
    jest.spyOn(Equipo, 'findOne').mockResolvedValue({ id: 1 });

    await expect(EquipoService.validarSerieUnica('DL-88291', { excluirId: 2 }))
      .rejects.toMatchObject({ detalles: { errores: { numero_serie: 'Ya existe un equipo con ese número de serie.' } } });
  });

  test('validarSerieUnica no consulta si el equipo no tiene número de serie', async () => {
    const espia = jest.spyOn(Equipo, 'findOne');

    await EquipoService.validarSerieUnica(null);

    expect(espia).not.toHaveBeenCalled();
  });
});

describe('CatalogoService', () => {
  test.each([['25', '25.00'], ['0.5', '0.50'], ['19.99', '19.99']])('validarPrecio("%s") = "%s"', (entrada, salida) => {
    expect(CatalogoService.validarPrecio(entrada)).toBe(salida);
  });

  test.each([['0'], ['-1'], ['1.234'], ['abc'], [''], [undefined]])('validarPrecio rechaza "%s"', (entrada) => {
    expect(() => CatalogoService.validarPrecio(entrada)).toThrow(ValidationError);
  });

  test('eliminar rechaza un ítem que ya se usó en cotizaciones', async () => {
    const item = registro({ id: 1, nombre: 'Diagnóstico general' }, { vecesUsado: 5 });
    jest.spyOn(CatalogoItem, 'findByPk').mockResolvedValue(item);

    await expect(CatalogoService.eliminar(1)).rejects.toThrow(/Desactívalo/);
    expect(item.destroy).not.toHaveBeenCalled();
  });

  test('cambiarEstado solo modifica el campo activo', async () => {
    const item = registro({ id: 1, activo: true }, { vecesUsado: 5 });
    jest.spyOn(CatalogoItem, 'findByPk').mockResolvedValue(item);

    await CatalogoService.cambiarEstado(1, false);

    expect(item.update).toHaveBeenCalledWith({ activo: false }, { fields: ['activo'] });
  });

  test('listarActivos pide solo ítems activos', async () => {
    const espia = jest.spyOn(CatalogoItem, 'findAll').mockResolvedValue([]);

    await CatalogoService.listarActivos({ tipo: 'Servicio' });

    expect(espia.mock.calls[0][0].where).toEqual({ activo: true, tipo: 'Servicio' });
  });
});

describe('UsuarioService', () => {
  test('un admin no puede desactivarse a sí mismo', async () => {
    const usuario = registro({ id: 1, rol: 'admin', activo: true });

    await expect(UsuarioService.validarQueQuedeAcceso(usuario, 1, 'desactivar'))
      .rejects.toThrow('No puedes desactivar tu propia cuenta.');
  });

  test('no se puede quitar el acceso al último admin activo', async () => {
    jest.spyOn(Usuario, 'count').mockResolvedValue(1);
    const usuario = registro({ id: 1, rol: 'admin', activo: true });

    await expect(UsuarioService.validarQueQuedeAcceso(usuario, 7, 'desactivar'))
      .rejects.toThrow('No se puede desactivar al último administrador activo.');
  });

  test('con dos admins activos sí se puede desactivar a uno', async () => {
    jest.spyOn(Usuario, 'count').mockResolvedValue(2);

    await expect(UsuarioService.validarQueQuedeAcceso(registro({ id: 1, rol: 'admin', activo: true }), 7, 'desactivar'))
      .resolves.toBeUndefined();
  });

  test('desactivar a un técnico no necesita contar admins', async () => {
    const espia = jest.spyOn(Usuario, 'count');

    await UsuarioService.validarQueQuedeAcceso(registro({ id: 2, rol: 'tecnico', activo: true }), 1, 'desactivar');

    expect(espia).not.toHaveBeenCalled();
  });

  test('crearTecnico rechaza una contraseña débil antes de guardar', async () => {
    jest.spyOn(Usuario, 'findOne').mockResolvedValue(null);
    const crear = jest.spyOn(Usuario, 'create');

    await expect(UsuarioService.crearTecnico({ nombre: 'X', correo: 'x@tecnitrack.com', password: 'corta' }))
      .rejects.toThrow(ValidationError);
    expect(crear).not.toHaveBeenCalled();
  });

  test('crearTecnico siempre crea rol técnico, con el hash y no la contraseña', async () => {
    jest.spyOn(Usuario, 'findOne').mockResolvedValue(null);
    const crear = jest.spyOn(Usuario, 'create').mockImplementation(async (datos) => registro(datos));

    await UsuarioService.crearTecnico({ nombre: 'Nuevo', correo: 'nuevo@tecnitrack.com', password: 'Temporal2026', rol: 'admin' });

    const datos = crear.mock.calls[0][0];
    expect(datos.rol).toBe('tecnico');
    expect(datos.password_hash).toMatch(/^\$2[aby]\$10\$/);
    expect(datos).not.toHaveProperty('password');
  });

  test('validarCorreoUnico rechaza un correo usado por otra cuenta', async () => {
    jest.spyOn(Usuario, 'findOne').mockResolvedValue({ id: 2 });

    await expect(UsuarioService.validarCorreoUnico('luis.fernandez@tecnitrack.com', 5))
      .rejects.toMatchObject({ detalles: { errores: { correo: 'Ya existe un usuario con ese correo.' } } });
  });
});
