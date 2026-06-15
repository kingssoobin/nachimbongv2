### SKZ V2 Mod — Instrucciones de instalación
-----
Cómo descargar e instalar la aplicación `SKZ-V2-Mod.xapk`.

Nota: La aplicación por el momento solo se encuentra disponible para Android

Incluye pasos recomendados, instalación alternativa, verificación de integridad y solución de problemas.

### Tabla de contenidos
- [Enlaces](#enlaces)
- [Requisitos previos](#requisitos-previos)
- [Instalación (método recomendado — Universal Manager)](#instalaci%C3%B3n-m%C3%A9todo-recomendado---universal-manager)
- [Instalación alternativa (manual)](#instalaci%C3%B3n-alternativa-manual)
- [Instalación por ADB (opcional)](#instalaci%C3%B3n-por-adb-opcional)
- [Permisos y seguridad](#permisos-y-seguridad)
- [Solución de problemas comunes](#soluci%C3%B3n-de-problemas-comunes)
- [Desinstalación](#desinstalaci%C3%B3n)
- [Soporte / Contacto](#soporte--contacto)
- [Licencia y contribuciones](#licencia-y-contribuciones)
- [Changelog](#changelog)

---

### Enlaces
- Archivo a descargar: [SKZ-V2-Mod.xapk (Dropbox)](https://www.dropbox.com/scl/fi/3lumajk8hylsnmbj6922o/SKZ-V2-Mod.xapk?rlkey=0krf4xrr5g234azmy7cpp4rmj&st=ap6rjsh5&dl=1)
- App recomendada para instalar XAPK: [Universal Manager (Play Store)](https://play.google.com/store/apps/details?id=com.universal.manager&hl=es)

### Requisitos previos
- Dispositivo Android (recomendado Android 8.0+).  
- Espacio libre suficiente (revisa el tamaño del XAPK antes de descargar).  
- Permitir instalaciones desde orígenes desconocidos para la aplicación que usarás.  
- Opcional: PC con ADB si prefieres instalar desde ordenador.

### Instalación (método recomendado — Universal Manager)
1. Instala Universal Manager desde Google Play mediante el enlace anterior.  
2. Descarga `SKZ-V2-Mod.xapk` en el móvil (o en el PC y transfiérelo al móvil).  
3. Abre Universal Manager y concede los permisos que solicite.  
4. En Universal Manager selecciona "Instalar XAPK/APK" o usa la opción para localizar el archivo descargado.  
5. Selecciona `SKZ-V2-Mod.xapk` y sigue las instrucciones en pantalla. Universal Manager extraerá el APK y colocará los archivos OBB/data si es necesario.  
6. Al finalizar, abre la app para verificar que funciona correctamente.

Consejo: si el sistema te pide permitir "Instalar apps desconocidas", otorga ese permiso a Universal Manager desde: Ajustes → Aplicaciones → Permisos especiales → Instalar apps desconocidas.

### Instalación alternativa (manual)
Si prefieres no usar Universal Manager:
1. Cambia la extensión `.xapk` a `.zip` y extrae el contenido (muchos gestores de archivos lo permiten).  
2. Dentro verás el/los APK(s) y quizás una carpeta `Android/obb/...` o `Android/data/...`.  
3. Copia el(los) APK(s) al móvil e instala (habilita orígenes desconocidos).  
4. Copia la(s) carpeta(s) OBB/data a:
   - `/sdcard/Android/obb/<nombre.del.paquete>/` (para OBB)  
   - `/sdcard/Android/data/<nombre.del.paquete>/` (para data, si aplica)  
5. Abre la app.

> Asegúrate de crear la carpeta con el nombre de paquete correcto (p. ej. `com.ejemplo.app`).

### Instalación por ADB (opcional)
Si tienes el APK separado y prefieres instalar desde un ordenador con ADB:
```bash
adb install -r path/to/app.apk
adb push path/to/main.obb /sdcard/Android/obb/<package.name>/
```
Reemplaza `<package.name>` por el identificador real de la app.

### Permisos y seguridad
- Instalar apps fuera de Play Store implica riesgos: instala solo desde fuentes confiables.  
- Revisa los permisos solicitados por la app al instalar y al ejecutar.  
- Opcional: analiza el APK/XAPK con VirusTotal antes de instalar para detectar firmas maliciosas.

### Solución de problemas comunes
- "Instalación fallida / Parse error": APK corrupto o no compatible con tu arquitectura (ARM vs ARM64).  
- "Falta de espacio": libera almacenamiento o usa tarjeta SD (si la app lo soporta).  
- Instalador colgado: borra datos del instalador de paquetes (Ajustes → Aplicaciones → Mostrar sistema → Package Installer → Almacenamiento → Borrar datos).  
- La app no abre tras instalar: reinicia el dispositivo y prueba de nuevo.

Si necesitas ayuda, indica el mensaje de error exacto o captura de pantalla y te ayudo a diagnosticar.

### Desinstalación
1. Ajustes → Aplicaciones → buscar la app → Desinstalar.  

### Soporte / Contacto
¿Algo no funciona como debería?
Si tienes problemas con el editor, fallos en la sincronización por Bluetooth o dudas sobre algún dato técnico, ¡házmelo saber!
También puedes escribirme si solo quieres pasar a saludar.

Envíame un correo electrónico y te responderé en unos días.

Correo: kingssoobin@gmail.com

¡Que tengas un excelente día y disfruta la app!

## Licencia y contribuciones
Este proyecto es una modificación de la app original que permite enviar imágenes personalizadas a la pantalla OLED de la Nachimbong V2.

- Autor original: PLVE App Developer.
- Esta modificación fue realizada por: Kings_Soobin.

**Importante — derechos y responsabilidad**
- El uso de esta modificación es bajo tu propia responsabilidad. No nos hacemos responsables por daños en hardware o software derivados de su uso.

### Changelog
- v1.0 — Versión inicial.

---
