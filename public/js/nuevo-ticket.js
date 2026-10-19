/**
 * Formulario "Nuevo ticket" (RNF-01: completarlo en menos de 2 minutos).
 * - Muestra solo la sección de cliente/equipo elegida (existente o nuevo).
 * - Filtra la lista de clientes mientras se escribe.
 * - Carga los equipos del cliente elegido (GET /tickets/equipos?cliente_id=).
 * - Vista previa de las fotos antes de enviar (máximo 5).
 * Sin JavaScript el formulario sigue funcionando: se ven todas las secciones y
 * el servidor usa las opciones marcadas.
 */
(() => {
  const formulario = document.getElementById('form-ticket');
  if (!formulario) return;

  const MAX_FOTOS = 5;
  const radioMarcado = (nombre) => formulario.querySelector(`input[name="${nombre}"]:checked`);

  // --- Secciones existente / nuevo ---
  function actualizarSecciones() {
    const modoCliente = radioMarcado('modo_cliente').value;
    const clienteNuevo = modoCliente === 'nuevo';
    const radiosEquipo = formulario.querySelector('[data-solo-cliente-existente]');
    // Un cliente nuevo no tiene equipos: su equipo también es nuevo
    radiosEquipo.hidden = clienteNuevo;
    const modoEquipo = clienteNuevo ? 'nuevo' : radioMarcado('modo_equipo').value;

    formulario.querySelectorAll('[data-modo-cliente]').forEach((seccion) => {
      seccion.hidden = seccion.dataset.modoCliente !== modoCliente;
    });
    formulario.querySelectorAll('[data-modo-equipo]').forEach((seccion) => {
      seccion.hidden = seccion.dataset.modoEquipo !== modoEquipo;
    });
  }
  formulario.querySelectorAll('input[name="modo_cliente"], input[name="modo_equipo"]').forEach((radio) => {
    radio.addEventListener('change', actualizarSecciones);
  });
  actualizarSecciones();

  // --- Filtro de clientes ---
  const filtro = document.getElementById('filtro-cliente');
  const selectCliente = document.getElementById('cliente_id');
  const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  filtro.addEventListener('input', () => {
    const buscado = normalizar(filtro.value.trim());
    const soloDigitos = buscado.replace(/\D/g, '');
    let primeraVisible = null;
    Array.from(selectCliente.options).forEach((opcion, i) => {
      if (i === 0) return;
      const texto = normalizar(opcion.textContent);
      const coincide = !buscado
        || texto.includes(buscado)
        || (soloDigitos && texto.replace(/\D/g, '').includes(soloDigitos));
      opcion.hidden = !coincide;
      if (coincide && !primeraVisible) primeraVisible = opcion;
    });
    // Si el filtro deja un solo cliente, se selecciona para ahorrar un clic
    const visibles = Array.from(selectCliente.options).filter((o, i) => i > 0 && !o.hidden);
    if (visibles.length === 1 && selectCliente.value !== visibles[0].value) {
      selectCliente.value = visibles[0].value;
      selectCliente.dispatchEvent(new Event('change'));
    }
  });

  // --- Equipos del cliente elegido ---
  const selectEquipo = document.getElementById('equipo_id');
  async function cargarEquipos() {
    const clienteId = selectCliente.value;
    const seleccionado = selectEquipo.dataset.seleccionado;
    selectEquipo.innerHTML = '';
    selectEquipo.add(new Option(clienteId ? 'Cargando equipos...' : 'Primero elige un cliente', ''));
    if (!clienteId) return;
    try {
      const respuesta = await fetch(`/tickets/equipos?cliente_id=${encodeURIComponent(clienteId)}`, {
        headers: { Accept: 'application/json' },
      });
      const equipos = respuesta.ok ? await respuesta.json() : [];
      selectEquipo.innerHTML = '';
      selectEquipo.add(new Option(equipos.length ? 'Seleccione un equipo' : 'El cliente no tiene equipos: registra uno nuevo', ''));
      equipos.forEach((equipo) => selectEquipo.add(new Option(equipo.descripcion, equipo.id, false, String(equipo.id) === seleccionado)));
      if (equipos.length === 1) selectEquipo.value = equipos[0].id;
      if (!equipos.length) {
        formulario.querySelector('input[name="modo_equipo"][value="nuevo"]').checked = true;
        actualizarSecciones();
      }
    } catch {
      selectEquipo.innerHTML = '';
      selectEquipo.add(new Option('No se pudieron cargar los equipos', ''));
    }
  }
  selectCliente.addEventListener('change', () => {
    selectEquipo.dataset.seleccionado = '';
    cargarEquipos();
  });
  if (selectCliente.value && selectEquipo.options.length <= 1) cargarEquipos();

  // --- Vista previa de fotos ---
  const inputFotos = document.getElementById('fotos');
  const vistaPrevia = document.getElementById('vista-previa-fotos');
  const zona = formulario.querySelector('.file-dropzone');
  const aviso = document.createElement('p');
  aviso.className = 'campo-error';

  function mostrarVistaPrevia() {
    vistaPrevia.innerHTML = '';
    aviso.remove();
    const archivos = Array.from(inputFotos.files || []);
    if (archivos.length > MAX_FOTOS) {
      aviso.textContent = `Seleccionaste ${archivos.length} fotos; el máximo es ${MAX_FOTOS}.`;
      vistaPrevia.after(aviso);
    }
    archivos.slice(0, MAX_FOTOS).forEach((archivo) => {
      const figura = document.createElement('figure');
      figura.className = 'foto-previa';
      const leyenda = document.createElement('figcaption');
      leyenda.textContent = archivo.name;
      if (/^image\/(jpeg|png|webp)$/.test(archivo.type)) {
        // Data URL (y no blob:) porque la política de contenido de helmet solo permite img-src 'self' data:
        const lector = new FileReader();
        lector.onload = () => {
          const imagen = document.createElement('img');
          imagen.className = 'photo-thumb';
          imagen.alt = `Vista previa de ${archivo.name}`;
          imagen.src = lector.result;
          figura.prepend(imagen);
        };
        lector.readAsDataURL(archivo);
      } else {
        leyenda.textContent = `${archivo.name}: formato no permitido`;
        leyenda.className = 'campo-error';
      }
      figura.append(leyenda);
      vistaPrevia.append(figura);
    });
  }
  inputFotos.addEventListener('change', mostrarVistaPrevia);

  ['dragenter', 'dragover'].forEach((evento) => zona.addEventListener(evento, (e) => {
    e.preventDefault();
    zona.classList.add('arrastrando');
  }));
  ['dragleave', 'drop'].forEach((evento) => zona.addEventListener(evento, () => zona.classList.remove('arrastrando')));
  zona.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length) {
      inputFotos.files = e.dataTransfer.files;
      mostrarVistaPrevia();
    }
  });
})();
