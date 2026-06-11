const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const statusEl = document.getElementById('status');
let isDrawing = false;
let selectedFont = "Arial";
let numLines = 1;

// ── EMOJIS ──────────────────────────────────────────────
const emojiCats = {
    fav:     ['❤️','⭐','⚡','🔥','👑','🐺','🌙','✨','🎵','💎','🦋','🌸','💫','🎀','🏆','🌈'],
    faces:   ['😀','😍','🥰','😎','🤩','😭','😤','🥺','😂','🤣','😊','🙃','😏','🤔','😴','👻'],
    nature:  ['🌸','🌺','🌻','🌹','🍀','🌿','🌊','🌋','🌙','☀️','⛅','❄️','🌈','🦋','🐺','🦊'],
    objects: ['💎','🎵','🎶','🎸','🎹','🎤','🎧','🏆','🎯','🎲','🎮','📱','💻','🔮','⚔️','🛸'],
    symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','♥','★','☆','♦','♣','♠','✦','✧']
};
let currentCat = 'fav';

function showEmojiCat(cat, btn) {
    currentCat = cat;
    document.querySelectorAll('.emoji-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderEmojis();
}

function renderEmojis() {
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = '';
    emojiCats[currentCat].forEach(em => {
        const div = document.createElement('div');
        div.className = 'emoji-item';
        div.textContent = em;
        div.onclick = () => loadEmoji(em);
        grid.appendChild(div);
    });
}

function loadEmoji(emoji) {
    clearCanvas();
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "90px Arial";
    ctx.fillText(emoji, 64, 68);
    saveCanvas();
    statusEl.innerText = "Emoji cargado: " + emoji;
}

// ── LÍNEAS ───────────────────────────────────────────────
function setLines(n, btn) {
    numLines = n;
    document.querySelectorAll('.line-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('row1').classList.toggle('hidden', false);
    document.getElementById('row2').classList.toggle('hidden', n < 2);
    document.getElementById('row3').classList.toggle('hidden', n < 3);
    const sizeMap = { 1: 28, 2: 22, 3: 16 };
    document.getElementById('fontSize').value = sizeMap[n];
    document.getElementById('sizeVal').innerText = sizeMap[n];
}

// ── FUENTES ──────────────────────────────────────────────
function selectFont(btn) {
    document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFont = btn.dataset.font;
}

// ── TEXTO ────────────────────────────────────────────────
function applyText() {
    const lines = [
        document.getElementById('line1').value.trim(),
        document.getElementById('line2').value.trim(),
        document.getElementById('line3').value.trim()
    ].slice(0, numLines).filter(l => l.length > 0);

    if (lines.length === 0) { statusEl.innerText = "⚠️ Escribe algo primero."; return; }

    const size = parseInt(document.getElementById('fontSize').value);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${size}px ${selectedFont}`;

    const lineHeight = size * 1.25;
    const totalH = lineHeight * lines.length;
    const startY = (128 - totalH) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
        ctx.fillText(line, 64, startY + i * lineHeight);
    });

    saveCanvas();
    statusEl.innerText = `✅ ${lines.length} línea(s) aplicada(s).`;
}

// ── CANVAS ───────────────────────────────────────────────
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (128 / rect.width),
        y: (clientY - rect.top) * (128 / rect.height)
    };
}
canvas.addEventListener('pointerdown', (e) => { isDrawing = true; draw(e); });
window.addEventListener('pointerup', () => { if (isDrawing) { isDrawing = false; saveCanvas(); } });
canvas.addEventListener('pointermove', draw);

function draw(e) {
    if (!isDrawing) return;
    ctx.fillStyle = "white";
    const pos = getPos(e);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fill();
}

function clearCanvas() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 128, 128);
    saveCanvas();
}
function saveCanvas() { try { localStorage.setItem('last_oled_img', canvas.toDataURL()); } catch(e){} }

// ── BLUETOOTH ────────────────────────────────────────────
function initBT() {
    statusEl.innerText = "Conectando Nachimbong...";
    try {
        if (window.bridge) {
            window.bridge.blePairingStart("");
            statusEl.innerText = "Emparejando...";
        } else if (window.webkit?.messageHandlers?.blePairingStart) {
            window.webkit.messageHandlers.blePairingStart.postMessage("");
            statusEl.innerText = "Emparejando (iOS)...";
        } else {
            statusEl.innerText = "⚠️ Bridge no disponible (solo funciona en la app).";
        }
    } catch(e) { statusEl.innerText = "Error BT: " + e.message; }
}

function resetDevice() {
    statusEl.innerText = "Reiniciando Nachimbong...";
    try {
        const resetCmd = "8110,-";
        if (window.bridge) {
            window.bridge.bleSendCmdList(resetCmd);
            setTimeout(() => { window.bridge.bleDisconnect(""); setTimeout(initBT, 2000); }, 500);
        } else if (window.webkit?.messageHandlers?.bleSendCmdList) {
            window.webkit.messageHandlers.bleSendCmdList.postMessage(resetCmd);
            setTimeout(() => { window.webkit.messageHandlers.bleDisconnect?.postMessage(""); setTimeout(initBT, 2000); }, 500);
        }
        statusEl.innerText = "Reiniciando... reconectando en 2s";
    } catch(e) { statusEl.innerText = "Error al reiniciar: " + e.message; }
}

// ── ENVÍO AL NACHIMBONG (PROTOCOLO ORIGINAL) ─────────────
async function transferOled() {
    statusEl.innerText = "Preparando imagen...";
    const imgData = ctx.getImageData(0, 0, 128, 128).data;
    let oledBytes = new Uint8Array(2048);

    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
            const idx = (y * 128 + x) * 4;
            if (imgData[idx] > 128) {
                const byteIdx = (Math.floor(y / 8) * 128) + x;
                oledBytes[byteIdx] |= (1 << (y % 8));
            }
        }
    }

    for (let part = 0; part < 16; part++) {
        const chunk = oledBytes.slice(part * 128, (part + 1) * 128);
        const hexData = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join('');
        const cmd = `810F00000000${part.toString(16).padStart(2, '0')}${hexData},-`;

        try {
            if (window.bridge) window.bridge.bleSendCmdList(cmd);
            else if (window.webkit?.messageHandlers?.bleSendCmdList)
                window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd);
            statusEl.innerText = `Enviando: ${Math.round(((part + 1) / 16) * 100)}%`;
            await new Promise(r => setTimeout(r, 150));
        } catch(e) {
            statusEl.innerText = "⚠️ Error en parte " + (part + 1);
            return;
        }
    }
    statusEl.innerText = "✅ ¡Enviado correctamente!";
}

// ── INIT ─────────────────────────────────────────────────
window.onload = () => {
    renderEmojis();
    const last = localStorage.getItem('last_oled_img');
    if (last) {
        const im = new Image();
        im.onload = () => ctx.drawImage(im, 0, 0);
        im.src = last;
    } else {
        clearCanvas();
    }
    setTimeout(initBT, 1000);
};
