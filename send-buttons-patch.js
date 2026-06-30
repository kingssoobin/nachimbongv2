// send-buttons-patch.js
// Patch para enlazar múltiples botones de "Enviar a Nachimbong" (.sendBtn y #sendBtn).
(function(){
  // pequeño helper de espera
  function waitMs(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  async function sendHandlerForButton(btn) {
    try {
      // Si el botón especifica un diseño en data-design, lo cargamos primero
      const design = btn.dataset && btn.dataset.design;
      if (design && typeof window.loadDesign === 'function') {
        try {
          window.loadDesign(design);
          // espera breve para que el preview se renderice antes de enviar
          await waitMs(300);
        } catch (e) {
          console.warn('loadDesign falló para', design, e);
        }
      }

      // Preferencias de envío: intenta las funciones más completas en orden
      if (typeof window.transferCurrentAnimation === 'function') {
        await window.transferCurrentAnimation(100);
        return;
      }
      if (typeof window.transferCurrentAnimationUltimate === 'function') {
        await window.transferCurrentAnimationUltimate({ perChunkDelay: 80, perFrameDelay: 120 });
        return;
      }
      if (typeof window.transferBulkFramesSingleShot === 'function') {
        await window.transferBulkFramesSingleShot({ perChunkDelay: 80, perFinalDelay: 200 });
        return;
      }
      if (typeof window.transferOled === 'function') {
        // fallback para imagen única (transferOled envía el canvas actual)
        await window.transferOled();
        return;
      }

      // último recurso: si existe un bridge directo
      console.warn('No se encontró función de envío (transferCurrentAnimation/Ultimate/Bulk/transferOled)');
      const st = document.getElementById('status');
      if (st) st.innerText = 'Bridge no disponible para envío';
    } catch (err) {
      console.error('Error en envío desde botón:', err);
      // fallback: intentar alguna versión original si existe
      if (window._orig_transferCurrentAnimation) {
        try { await window._orig_transferCurrentAnimation(100); } catch(e){}
      }
    }
  }

  function attachAllSendButtons() {
    const selectorList = '#sendBtn, .sendBtn';
    const buttons = document.querySelectorAll(selectorList);
    if (!buttons || buttons.length === 0) return;

    buttons.forEach(btn => {
      try {
        // clonamos el nodo para eliminar listeners previos y evitar dobles ejecuciones
        const clone = btn.cloneNode(true);
        // intenta quitar handlers inline (si existieran)
        try { clone.removeAttribute && clone.removeAttribute('onclick'); } catch(e){}
        btn.parentNode.replaceChild(clone, btn);

        // añadir listener una sola vez
        clone.addEventListener('click', async (ev) => {
          ev && ev.preventDefault && ev.preventDefault();
          // pequeña protección contra múltiples clicks rápidos
          clone.disabled = true;
          try {
            await sendHandlerForButton(clone);
          } finally {
            // reactivar después de un breve retraso
            await waitMs(300);
            clone.disabled = false;
          }
        }, { passive: false });
      } catch(e) {
        console.error('attachAllSendButtons error:', e);
      }
    });
  }

  // Ejecutar después de DOMContentLoaded y después de pequeños parches que el app.js pueda aplicar
  document.addEventListener('DOMContentLoaded', () => {
    // esperar un momento para que todos los patches en app.js se registren
    setTimeout(attachAllSendButtons, 200);
    // también re-intentar si se desea (por si botones se agregan dinámicamente)
    // opcional: setInterval(attachAllSendButtons, 2000);
  });
})();
