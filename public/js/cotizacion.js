/**
 * Formulario de cotización: agregar y quitar filas, y mostrar subtotales y
 * total en vivo. Solo es una vista previa: el servidor ignora cualquier total
 * o precio enviado y recalcula con los precios del catálogo (en centavos).
 */
(() => {
  const cuerpo = document.getElementById('lineas-cotizacion');
  if (!cuerpo) return;
  const totalVisible = document.getElementById('total-cotizacion');

  // Centavos enteros, igual que el servidor: 3 x 0.10 = 0.30 exacto
  const aCentavos = (valor) => Math.round(Number(valor) * 100);
  const dinero = (centavos) => `$${(centavos / 100).toFixed(2)}`;

  function recalcular() {
    let total = 0;
    cuerpo.querySelectorAll('.linea-cotizacion').forEach((fila) => {
      const opcion = fila.querySelector('select').selectedOptions[0];
      const precio = opcion && opcion.dataset.precio ? aCentavos(opcion.dataset.precio) : 0;
      const cantidad = Math.max(0, Number.parseInt(fila.querySelector('input[name="cantidad"]').value, 10) || 0);
      const subtotal = precio * cantidad;
      fila.querySelector('.precio-unitario').textContent = precio ? dinero(precio) : '—';
      fila.querySelector('.subtotal').textContent = precio ? dinero(subtotal) : '—';
      total += subtotal;
    });
    totalVisible.textContent = dinero(total);
    // No se puede quitar la única fila
    const quitar = cuerpo.querySelectorAll('.quitar-linea');
    quitar.forEach((boton) => { boton.disabled = quitar.length === 1; });
  }

  document.getElementById('agregar-linea').addEventListener('click', () => {
    const nueva = cuerpo.querySelector('.linea-cotizacion').cloneNode(true);
    nueva.querySelector('select').value = '';
    nueva.querySelector('input[name="cantidad"]').value = '1';
    cuerpo.append(nueva);
    recalcular();
    nueva.querySelector('select').focus();
  });

  cuerpo.addEventListener('click', (evento) => {
    if (!evento.target.classList.contains('quitar-linea')) return;
    if (cuerpo.querySelectorAll('.linea-cotizacion').length > 1) evento.target.closest('tr').remove();
    recalcular();
  });
  cuerpo.addEventListener('input', recalcular);
  cuerpo.addEventListener('change', recalcular);
  recalcular();
})();
