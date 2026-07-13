// wallpaper-selector.js - Selector jerárquico de fondos (FONDO -> GIRAS/FANMEETING -> colección)
(function () {
    'use strict';

    function crearGaleria(carpeta, cantidad, sufijo) {
        return Array.from({ length: cantidad }, (_, i) => {
            const numero = String(i + 1).padStart(2, '0');
            return `${carpeta}/img${numero}_${sufijo}.jpg`;
        });
    }

    // Galerías base
    const galerias = {
        // Giras
        rits: crearGaleria('wallpaper/Giras/RUNIT/Seoul', 33, 'rits'),
        rimc: crearGaleria('wallpaper/Giras/RUNIT/Merch', 17, 'rimc'),
        mane: crearGaleria('wallpaper/Giras/Maniac/Encore', 9, 'mane'),
        manj: crearGaleria('wallpaper/Giras/Maniac/Japan', 9, 'manj'),
        mans: crearGaleria('wallpaper/Giras/Maniac/Seoul', 9, 'mans'),
        atej: crearGaleria('wallpaper/Giras/dominATE/Japan', 28, 'atej'),
        ates: crearGaleria('wallpaper/Giras/dominATE/Seoul', 17, 'ates'),
        '5st1': crearGaleria('wallpaper/Giras/5STAR/t1', 9, '5st1'),
        '5st2': crearGaleria('wallpaper/Giras/5STAR/t2', 9, '5st2'),

        // Fanmeeting
        '1sts': crearGaleria('wallpaper/Fanmeeting/1stLoveSTAY', 13, '1sts'),
        '2sts': crearGaleria('wallpaper/Fanmeeting/2ndLoveSTAY', 9, '2sts'),
        '3rpf': crearGaleria('wallpaper/Fanmeeting/3rd_PilotFor', 12, '3rpf'),
        '4tms': crearGaleria('wallpaper/Fanmeeting/4th_MagicSchool', 20, '4tms'),
        '5t5c': crearGaleria('wallpaper/Fanmeeting/5th_5Clock', 10, '5t5c'),
        '6toh': crearGaleria('wallpaper/Fanmeeting/6th_STAYinOLH', 11, '6toh'),
        stig: crearGaleria('wallpaper/Fanmeeting/STAYing', 8, 'stig'),
        tywd: crearGaleria('wallpaper/Fanmeeting/ToyWorld', 23, 'tywd')
    };

    // Estructura jerárquica solicitada
    const catalogo = {
        giras: {
            titulo: 'GIRAS',
            opciones: [
                {
                    id: 'dominate',
                    label: 'DOMINATE',
                    imagenes: [...galerias.atej, ...galerias.ates]
                },
                {
                    id: 'runit',
                    label: 'RUN IT',
                    imagenes: [...galerias.rits, ...galerias.rimc]
                },
                {
                    id: 'maniac',
                    label: 'MANIAC',
                    imagenes: [...galerias.mane, ...galerias.manj, ...galerias.mans]
                },
                {
                    id: '5star',
                    label: '5 STAR',
                    imagenes: [...galerias['5st1'], ...galerias['5st2']]
                }
            ]
        },
        fanmeeting: {
            titulo: 'FANMEETING',
            opciones: [
                { id: '1sts', label: '1ST LOVE STAY', imagenes: galerias['1sts'] },
                { id: '2sts', label: '2ND LOVESTAY', imagenes: galerias['2sts'] },
                { id: '3rpf', label: '3RD PILOTFOR', imagenes: galerias['3rpf'] },
                { id: '4tms', label: '4TH MAGIC SCHOOL', imagenes: galerias['4tms'] },
                { id: '5t5c', label: '5TH 5 CLOCK', imagenes: galerias['5t5c'] },
                { id: '6toh', label: '6TH STAY IN OUR LITTLE HOUSE', imagenes: galerias['6toh'] },
                { id: 'stig', label: 'STAYING', imagenes: galerias.stig },
                { id: 'tywd', label: 'TOYWORLD', imagenes: galerias.tywd }
            ]
        }
    };

    let categoriaActiva = null;
    let opcionActiva = null;
    let fondoActual = null;

    function aplicarFondo(imagenUrl) {
        document.body.style.backgroundImage = `url(${imagenUrl})`;
        fondoActual = imagenUrl;
        try {
            localStorage.setItem('nachimbong_wallpaper', imagenUrl);
        } catch (e) {
            console.warn('No se pudo guardar el fondo:', e);
        }
    }

    function actualizarSeleccionMiniatura() {
        const grid = document.getElementById('wallpaper-grid');
        if (!grid) return;

        grid.querySelectorAll('.wallpaper-thumb').forEach((thumb) => {
            thumb.classList.toggle('selected', thumb.getAttribute('data-url') === fondoActual);
        });
    }

    function renderizarGrid() {
        const grid = document.getElementById('wallpaper-grid');
        const vacio = document.getElementById('wallpaper-empty');
        if (!grid || !vacio) return;

        grid.innerHTML = '';

        if (!categoriaActiva || !opcionActiva) {
            vacio.style.display = 'block';
            return;
        }

        vacio.style.display = 'none';

        const opcion = catalogo[categoriaActiva].opciones.find((o) => o.id === opcionActiva);
        if (!opcion) return;

        opcion.imagenes.forEach((imgUrl, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'wallpaper-thumb';
            thumb.style.backgroundImage = `url(${imgUrl})`;
            thumb.setAttribute('data-url', imgUrl);
            thumb.title = `${opcion.label} #${index + 1}`;

            if (imgUrl === fondoActual) thumb.classList.add('selected');

            thumb.addEventListener('click', function () {
                aplicarFondo(imgUrl);
                actualizarSeleccionMiniatura();
            });

            grid.appendChild(thumb);
        });
    }

    function renderizarOpcionesCategoria() {
        const contenedor = document.getElementById('wallpaper-submenu');
        if (!contenedor) return;

        contenedor.innerHTML = '';
        contenedor.classList.toggle('visible', !!categoriaActiva);
        if (!categoriaActiva) return;

        catalogo[categoriaActiva].opciones.forEach((opcion) => {
            const btn = document.createElement('button');
            btn.className = 'wallpaper-option-btn';
            btn.textContent = opcion.label;
            btn.type = 'button';

            if (opcion.id === opcionActiva) btn.classList.add('active');

            btn.addEventListener('click', () => {
                // Toggle: si la opción ya está activa, cerrarla
                if (opcionActiva === opcion.id) {
                    opcionActiva = null;
                } else {
                    opcionActiva = opcion.id;
                }
                renderizarOpcionesCategoria();
                renderizarGrid();
            });

            contenedor.appendChild(btn);
        });
    }

    function setCategoria(categoria) {
        // Toggle: si la categoría ya está activa, cerrarla
        if (categoriaActiva === categoria) {
            categoriaActiva = null;
            opcionActiva = null;
            
            const titulo = document.getElementById('wallpaper-section-title');
            if (titulo) {
                titulo.textContent = '';
                titulo.classList.remove('visible');
            }

            document.querySelectorAll('.wallpaper-category-btn').forEach((btn) => {
                btn.classList.remove('active');
            });
        } else {
            // Abrir la nueva categoría
            categoriaActiva = categoria;
            opcionActiva = catalogo[categoria].opciones[0]?.id || null;

            const titulo = document.getElementById('wallpaper-section-title');
            if (titulo) {
                titulo.textContent = catalogo[categoria].titulo;
                titulo.classList.add('visible');
            }

            document.querySelectorAll('.wallpaper-category-btn').forEach((btn) => {
                btn.classList.toggle('active', btn.dataset.category === categoria);
            });
        }

        renderizarOpcionesCategoria();
        renderizarGrid();
    }

    function inicializar() {
        const root = document.getElementById('wallpaper-selector');
        if (!root) return;

        root.innerHTML = `
            <div class="wallpaper-category-stack">
                <button class="wallpaper-category-btn" data-category="giras" type="button">GIRAS</button>
                <button class="wallpaper-category-btn" data-category="fanmeeting" type="button">FANMEETING</button>
            </div>

            <br>
            <div id="wallpaper-submenu" class="wallpaper-submenu"></div>
            <div id="wallpaper-empty" class="wallpaper-empty">Selecciona una categoría y colección para ver fondos.</div>
            <div id="wallpaper-grid" class="wallpaper-grid"></div>
        `;

        document.querySelectorAll('.wallpaper-category-btn').forEach((btn) => {
            btn.addEventListener('click', () => setCategoria(btn.dataset.category));
        });

        try {
            const fondoGuardado = localStorage.getItem('nachimbong_wallpaper');
            if (fondoGuardado) {
                aplicarFondo(fondoGuardado);
            } else {
                aplicarFondo(galerias.runit[0]);
            }
        } catch (e) {
            aplicarFondo(galerias.runit[0]);
        }

        // Estado inicial: solo mostrar botón FONDO + categorías (como referencia visual solicitada)
        categoriaActiva = null;
        opcionActiva = null;
        renderizarOpcionesCategoria();
        renderizarGrid();
    }

    window.WallpaperSelector = {
        init: inicializar,
        setWallpaper: aplicarFondo,
        catalogo
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
