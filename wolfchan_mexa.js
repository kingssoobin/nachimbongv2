// wolfchan_mexa.js — pequeño descriptor para el diseño wolfchan
// Intenta no sobrescribir MIS_DISENOS si ya existe
(function(){
  // Si ya tienes una imagen local (wolfchan_mexa.png), el código de app.js cargará esa imagen por defecto.
  // Aquí exponemos una ruta alternativa (si quieres cambiarla).
  window.MIS_DISENOS = window.MIS_DISENOS || {};
  window.MIS_DISENOS.wolfchan_mexa = window.MIS_DISENOS.wolfchan_mexa || {
    // Si tienes la imagen embebida base64, puedes ponerla aquí en src.
    // src: 'data:image/png;base64,...'
    // o usar un archivo en la misma carpeta:
    src: 'wolfchan_mexa.png'
  };
})();
