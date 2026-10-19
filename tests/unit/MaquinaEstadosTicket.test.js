/**
 * MaquinaEstadosTicket (RN-04, HU-06): se prueban TODAS las combinaciones
 * origen -> destino de los 8 estados, para cada forma de provocar el cambio.
 */
const Maquina = require('../../services/MaquinaEstadosTicket');
const { BusinessRuleError } = require('../../utils/errors');
const { ESTADOS_TICKET } = require('../../utils/constantes');

const { ORIGENES } = Maquina;

/** Todas las parejas origen/destino distintas: 8 x 7 = 56. */
const PAREJAS = ESTADOS_TICKET.flatMap((de) => ESTADOS_TICKET.filter((a) => a !== de).map((a) => [de, a]));

const MANUALES = [
  ['Recibido', 'Diagnosticado'],
  ['En_reparacion', 'Esperando_repuesto'],
  ['Esperando_repuesto', 'En_reparacion'],
  ['En_reparacion', 'Listo'],
  ['Listo', 'Entregado'],
];
const es = (lista, de, a) => lista.some(([x, y]) => x === de && y === a);

describe('Transiciones manuales (técnico)', () => {
  test.each(PAREJAS)('%s -> %s', (de, a) => {
    const esperado = es(MANUALES, de, a);
    expect(Maquina.puedeTransicionar(de, a, { origen: ORIGENES.MANUAL, rol: 'tecnico' })).toBe(esperado);
    if (!esperado) {
      expect(() => Maquina.validarTransicion(de, a, { rol: 'tecnico' })).toThrow(BusinessRuleError);
    }
  });

  test('el admin tiene las mismas transiciones manuales (además de cancelar)', () => {
    PAREJAS.filter(([, a]) => a !== 'Cancelado').forEach(([de, a]) => {
      expect(Maquina.puedeTransicionar(de, a, { rol: 'admin' })).toBe(es(MANUALES, de, a));
    });
  });
});

describe('No se pueden saltar estados (RN-04)', () => {
  test.each([
    ['Recibido', 'Esperando_aprobacion'],
    ['Recibido', 'En_reparacion'],
    ['Recibido', 'Listo'],
    ['Recibido', 'Entregado'],
    ['Diagnosticado', 'En_reparacion'],
    ['Diagnosticado', 'Listo'],
    ['Esperando_repuesto', 'Listo'],
    ['En_reparacion', 'Entregado'],
  ])('%s -> %s se rechaza indicando el siguiente paso', (de, a) => {
    expect(() => Maquina.validarTransicion(de, a)).toThrow(/sin seguir el flujo/);
  });

  test('tampoco se puede retroceder', () => {
    expect(Maquina.puedeTransicionar('Diagnosticado', 'Recibido')).toBe(false);
    expect(Maquina.puedeTransicionar('Listo', 'En_reparacion')).toBe(false);
    expect(Maquina.puedeTransicionar('Entregado', 'Listo')).toBe(false);
  });

  test('el mensaje sugiere a dónde sí se puede pasar', () => {
    expect(() => Maquina.validarTransicion('Recibido', 'Listo'))
      .toThrow('No se puede pasar de «Recibido» a «Listo» sin seguir el flujo. Desde «Recibido» solo se puede pasar a «Diagnosticado».');
  });
});

describe('Transiciones que no son manuales (paso 7)', () => {
  test('Diagnosticado -> Esperando_aprobacion solo al crear una cotización', () => {
    expect(() => Maquina.validarTransicion('Diagnosticado', 'Esperando_aprobacion'))
      .toThrow('El ticket pasa a «Esperando aprobación» automáticamente al crear una cotización.');
    expect(Maquina.puedeTransicionar('Diagnosticado', 'Esperando_aprobacion', { origen: ORIGENES.COTIZACION })).toBe(true);
  });

  test.each([['En_reparacion'], ['Cancelado']])('Esperando_aprobacion -> %s solo por la respuesta del cliente', (a) => {
    expect(() => Maquina.validarTransicion('Esperando_aprobacion', a, { rol: 'tecnico' }))
      .toThrow(/Solo el cliente puede sacar el ticket de «Esperando aprobación»|Solo el administrador puede cancelar/);
    expect(Maquina.puedeTransicionar('Esperando_aprobacion', a, { origen: ORIGENES.CLIENTE })).toBe(true);
  });

  test('una cotización solo mueve a Esperando_aprobacion desde Diagnosticado o, si es adicional, durante la reparación', () => {
    const DESDE = ['Diagnosticado', 'En_reparacion', 'Esperando_repuesto'];
    PAREJAS.forEach(([de, a]) => {
      const esperado = a === 'Esperando_aprobacion' && DESDE.includes(de);
      expect(Maquina.puedeTransicionar(de, a, { origen: ORIGENES.COTIZACION })).toBe(esperado);
    });
  });

  test.each([['En_reparacion'], ['Esperando_repuesto']])('la cotización adicional desde %s no se puede hacer a mano', (de) => {
    expect(() => Maquina.validarTransicion(de, 'Esperando_aprobacion', { rol: 'admin' }))
      .toThrow('El ticket pasa a «Esperando aprobación» automáticamente al crear una cotización.');
  });

  test('el cliente solo decide desde Esperando_aprobacion', () => {
    PAREJAS.forEach(([de, a]) => {
      const esperado = de === 'Esperando_aprobacion' && ['En_reparacion', 'Cancelado'].includes(a);
      expect(Maquina.puedeTransicionar(de, a, { origen: ORIGENES.CLIENTE })).toBe(esperado);
    });
  });
});

describe('Cancelación por el admin', () => {
  const NO_FINALES = ['Recibido', 'Diagnosticado', 'Esperando_aprobacion', 'En_reparacion', 'Esperando_repuesto', 'Listo'];

  test.each(NO_FINALES)('el admin puede cancelar desde %s', (de) => {
    expect(Maquina.puedeCancelar(de, 'admin')).toBe(true);
    expect(() => Maquina.validarTransicion(de, 'Cancelado', { origen: ORIGENES.CANCELACION, rol: 'admin' })).not.toThrow();
  });

  test.each(['Entregado', 'Cancelado'])('no se cancela un ticket %s', (de) => {
    expect(Maquina.puedeCancelar(de, 'admin')).toBe(false);
  });

  test.each(NO_FINALES)('el técnico no puede cancelar desde %s', (de) => {
    expect(Maquina.puedeCancelar(de, 'tecnico')).toBe(false);
    expect(() => Maquina.validarTransicion(de, 'Cancelado', { origen: ORIGENES.CANCELACION, rol: 'tecnico' }))
      .toThrow(de === 'Esperando_aprobacion' ? /administrador|cliente/ : 'Solo el administrador puede cancelar un ticket.');
  });
});

describe('Estados finales y otros casos', () => {
  test.each(['Entregado', 'Cancelado'])('desde %s no se sale', (de) => {
    ESTADOS_TICKET.filter((a) => a !== de).forEach((a) => {
      [ORIGENES.MANUAL, ORIGENES.CLIENTE, ORIGENES.COTIZACION, ORIGENES.CANCELACION].forEach((origen) => {
        expect(Maquina.puedeTransicionar(de, a, { origen, rol: 'admin' })).toBe(false);
      });
    });
    expect(Maquina.esFinal(de)).toBe(true);
  });

  test('pasar al mismo estado se rechaza', () => {
    expect(() => Maquina.validarTransicion('Listo', 'Listo')).toThrow('El ticket ya está en «Listo».');
  });

  test('un estado que no existe se rechaza', () => {
    expect(() => Maquina.validarTransicion('Recibido', 'Perdido')).toThrow('El estado «Perdido» no existe.');
  });

  test('transicionesManuales da los botones habilitados de cada estado', () => {
    expect(Maquina.transicionesManuales('Recibido')).toEqual(['Diagnosticado']);
    expect(Maquina.transicionesManuales('Diagnosticado')).toEqual([]);
    expect(Maquina.transicionesManuales('Esperando_aprobacion')).toEqual([]);
    expect(Maquina.transicionesManuales('En_reparacion')).toEqual(['Esperando_repuesto', 'Listo']);
    expect(Maquina.transicionesManuales('Esperando_repuesto')).toEqual(['En_reparacion']);
    expect(Maquina.transicionesManuales('Listo')).toEqual(['Entregado']);
    expect(Maquina.transicionesManuales('Entregado')).toEqual([]);
  });

  test('RN-01: solo En_reparacion exige cotización aprobada', () => {
    expect(ESTADOS_TICKET.filter((e) => Maquina.requiereCotizacionAprobada(e))).toEqual(['En_reparacion']);
  });

  test('el flujo principal tiene los 7 estados en orden', () => {
    expect(Maquina.FLUJO).toEqual([
      'Recibido', 'Diagnosticado', 'Esperando_aprobacion', 'En_reparacion', 'Esperando_repuesto', 'Listo', 'Entregado',
    ]);
  });
});
