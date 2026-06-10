// Nachimbong V2 OLED Studio - APK Bridge Version
const UI = {
    state: {
        W: 64, H: 32,
        pixels: new Uint8Array(64 * 32),
        frames: [], // Array de Uint8Array (binario)
        currentTool: 'pen'
    },
    $: id => document.getElementById(id),
    log: msg => { UI.$('log').textContent = `> ${msg}`; }
};

// --- INIT TABS ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn, .content-panel').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        UI.$(`tab-${btn.dataset.tab}`).classList.add('active');
    };
});

// --- CANVAS EDITOR ---
(function initEditor() {
    const canvas = UI.$('drawCanvas');
    const ctx = canvas.getContext('2d');
    const ZOOM = 20; // Zoom grande para el celular
    canvas.width = UI.state.W * ZOOM;
    canvas.height = UI.state.H * ZOOM;

    function render() {
        ctx.fillStyle = '#000'; ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        for(let i=0; i<UI.state.pixels.length; i++) {
            if(UI.state.pixels[i]) {
                const x = i % UI.state.W;
                const y = Math.floor(i / UI.state.W);
                ctx.fillRect(x*ZOOM, y*ZOOM, ZOOM, ZOOM);
            }
        }
        // Grid
        ctx.strokeStyle = '#1a222e'; ctx.lineWidth = 1;
        for(let x=0; x<=UI.state.W; x++) { ctx.beginPath(); ctx.moveTo(x*ZOOM,0); ctx.lineTo(x*ZOOM, canvas.height); ctx.stroke(); }
        for(let y=0; y<=UI.state.H; y++) { ctx.beginPath(); ctx.moveTo(0, y*ZOOM); ctx.lineTo(canvas.width, y*ZOOM); ctx.stroke(); }
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        const x = Math.floor(((ev.clientX - rect.left) / rect.width) * UI.state.W);
        const y = Math.floor(((ev.clientY - rect.top) / rect.height) * UI.state.H);
        return {x, y};
    }

    function draw(e) {
        if(!isDrawing) return;
        const {x, y} = getPos(e);
        if(x<0 || x>=UI.state.W || y<0 || y>=UI.state.H) return;
        UI.$('cursorPos').textContent = `${x},${y}`;
        UI.state.pixels[y * UI.state.W + x] = UI.state.currentTool === 'pen' ? 1 : 0;
        render();
    }

    let isDrawing = false;
    canvas.onmousedown = canvas.ontouchstart = (e) => { isDrawing = true; draw(e); if(e.type === 'touchstart') e.preventDefault(); };
    window.onmousemove = window.ontouchmove = (e) => { draw(e); };
    window.onmouseup = window.ontouchend = () => { isDrawing = false; };

    UI.$('toolPen').onclick = () => { UI.state.currentTool = 'pen'; updateTools(); };
    UI.$('toolErase').onclick = () => { UI.state.currentTool = 'erase'; updateTools(); };
    function updateTools() { UI.$('toolPen').className = UI.state.currentTool==='pen'?'tool active':'tool'; UI.$('toolErase').className = UI.state.currentTool==='erase'?'tool active':'tool'; }

    UI.$('toolClear').onclick = () => { UI.state.pixels.fill(0); render(); };
    UI.$('toolInvert').onclick = () => { for(let i=0; i<UI.state.pixels.length; i++) UI.state.pixels[i] = UI.state.pixels[i]?0:1; render(); };
    UI.$('toolFill').onclick = () => { UI.state.pixels.fill(1); render(); };

    // --- TEXT RENDER ---
    UI.$('btnRenderText').onclick = () => {
        const txt = UI.$('drawText').value;
        const tmp = document.createElement('canvas'); tmp.width=UI.state.W; tmp.height=UI.state.H;
        const tctx = tmp.getContext('2d');
        tctx.fillStyle='#000'; tctx.fillRect(0,0,64,32);
        tctx.fillStyle='#fff'; tctx.font='bold 12px monospace'; tctx.textAlign='center';
        tctx.fillText(txt, 32, 20);
        const img = tctx.getImageData(0,0,64,32);
        for(let i=0; i<UI.state.pixels.length; i++) UI.state.pixels[i] = img.data[i*4] > 127 ? 1 : 0;
        render();
    };

    render();
})();

// --- FRAME MANAGEMENT ---
UI.$('btnSaveFrame').onclick = () => {
    UI.state.frames.push(new Uint8Array(UI.state.pixels));
    updateFrames();
};
UI.$('btnClearFrames').onclick = () => { UI.state.frames = []; updateFrames(); };

function updateFrames() {
    UI.$('frameCount').textContent = `${UI.state.frames.length} frames guardados`;
    const thumbs = UI.$('frameThumbs'); thumbs.innerHTML = '';
    UI.state.frames.forEach(f => {
        const can = document.createElement('canvas'); can.width=64; can.height=32;
        const c = can.getContext('2d');
        const img = c.createImageData(64,32);
        for(let i=0; i<64*32; i++){
            const v = f[i]?255:0;
            img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v; img.data[i*4+3]=255;
        }
        c.putImageData(img,0,0);
        thumbs.appendChild(can);
    });
}

// --- PROTOCOLO NACHIMBONG (PACKING) ---
function packFrame(pixels) {
    const bytes = new Uint8Array(256); // 64 cols * 4 pages
    for (let page = 0; page < 4; page++) {
        for (let x = 0; x < 64; x++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                const y = page * 8 + bit;
                if (pixels[y * 64 + x]) byte |= (1 << bit);
            }
            bytes[page * 64 + x] = byte;
        }
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- BRIDGE ACTIONS ---
UI.$('btnPrepareDraw').onclick = () => {
    // Si no hay frames, usamos el actual repetido 16 veces (típico de SKZ V2)
    const activeFrames = UI.state.frames.length > 0 ? UI.state.frames : Array(16).fill(UI.state.pixels);
    UI.$('sendInfoMeta').textContent = `${activeFrames.length} frames • 64x32 px`;
    
    // Preview en pestaña enviar
    const can = UI.$('sendPreview'); can.width=64; can.height=32;
    const c = can.getContext('2d');
    const f = activeFrames[0];
    const img = c.createImageData(64,32);
    for(let i=0; i<64*32; i++){
        const v = f[i]?255:0;
        img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v; img.data[i*4+3]=255;
    }
    c.putImageData(img,0,0);

    // Guardar para envío
    window.currentPayload = {
        width: 64, height: 32,
        frames: activeFrames.map(f => packFrame(f))
    };

    // Cambiar de pestaña
    document.querySelector('[data-tab="send"]').click();
    UI.log("Datos listos para enviar");
};

UI.$('btnBridgeConnect').onclick = () => {
    if(window.bridge && window.bridge.blePairingStart) {
        UI.log("Iniciando vinculación nativa...");
        window.bridge.blePairingStart();
    } else {
        UI.log("ERROR: Bridge no detectado.");
    }
};

UI.$('btnBridgeSend').onclick = () => {
    if(!window.currentPayload) { UI.log("Error: Primero prepara el dibujo"); return; }
    if(window.bridge && window.bridge.bleSendCmdList) {
        UI.log("Enviando paquetes al bridge...");
        window.bridge.bleSendCmdList(JSON.stringify(window.currentPayload));
        UI.log("¡TRANSFERENCIA COMPLETADA!");
    } else {
        UI.log("ERROR: window.bridge.bleSendCmdList no disponible");
    }
};

// Check Bridge al cargar
window.onload = () => {
    if(window.bridge) {
        UI.$('bridgeIndicator').textContent = "✅ APK BRIDGE CONECTADO";
        UI.$('bridgeIndicator').className = "bridge-badge ok";
    }
};