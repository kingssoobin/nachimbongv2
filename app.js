(function(){
  // Safe element getters
  const canvas = document.getElementById('canvas');
  if (!canvas) return console.warn('canvas element not found');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const statusEl = document.getElementById('status') || { innerText: '' };

  // UI state
  let isDrawing = false;
  let selectedFont = 'Arial';
  let numLines = 1;

  // EMOJIS
  const emojiCats = {
    fav:     ['❤','⭐','⚡','🔥','👑','🐺','🌙','✨','🎵','💎','🦋','🌸','💫','🎀','🏆','🌈'],
    faces:   ['😀','😍','🥰','😎','🤩','😭','😤','🥺','😂','🤣','😊','🙃','😏','🤔','😴','👻'],
    nature:  ['🌸','🌺','🌻','🌹','🍀','🌿','🌊','🌋','🌙','☀️','⛅','❄️','🌈','🦋','🐺','🦊'],
    objects: ['💎','🎵','🎶','🎸','🎹','🎤','🎧','🏆','🎯','🎲','🎮','📱','💻','🔮','⚔️','🛸'],
    symbols: ['❤','🧡','💛','💚','💙','💜','🖤','🤍','♥','★','☆','♦','♣','♠','✦','✧']
  };
  let currentCat = 'fav';

  function showEmojiCat(cat, btn){
    currentCat = cat;
    document.querySelectorAll('.emoji-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderEmojis();
  }

  function renderEmojis(){
    const grid = document.getElementById('emojiGrid');
    if(!grid) return;
    grid.innerHTML = '';
    (emojiCats[currentCat] || []).forEach(em => {
      const div = document.createElement('div');
      div.className = 'emoji-item';
      div.textContent = em;
      div.onclick = () => loadEmoji(em);
      grid.appendChild(div);
    });
  }

  function loadEmoji(emoji){
    clearCanvas();
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '90px Arial';
    ctx.fillText(emoji, 64, 68);
    saveCanvas();
    statusEl.innerText = 'Emoji cargado: ' + emoji;
  }

  // LINES
  function setLines(n, btn){
    numLines = n;
    document.querySelectorAll('.line-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const r1 = document.getElementById('row1');
    const r2 = document.getElementById('row2');
    const r3 = document.getElementById('row3');
    if(r1) r1.classList.toggle('hidden', false);
    if(r2) r2.classList.toggle('hidden', n < 2);
    if(r3) r3.classList.toggle('hidden', n < 3);
    const sizeMap = {1:28, 2:22, 3:16};
    const fs = document.getElementById('fontSize');
    if(fs){ fs.value = sizeMap[n] || 24; document.getElementById('sizeVal').innerText = fs.value; }
  }

  // FONTS
  function selectFont(btn){
    document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
    if(!btn) return;
    btn.classList.add('active');
    selectedFont = btn.dataset.font || 'Arial';
  }

  // TEXT
  function applyText(){
    const lines = [
      document.getElementById('line1')?.value || '',
      document.getElementById('line2')?.value || '',
      document.getElementById('line3')?.value || ''
    ].slice(0, numLines).filter(l => l.length > 0);

    if(lines.length === 0){ statusEl.innerText = '⚠️ Escribe algo primero.'; return; }

    const size = parseInt(document.getElementById('fontSize')?.value || '24', 10);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size}px ${selectedFont}`;

    const lineHeight = size * 1.25;
    const totalH = lineHeight * lines.length;
    const startY = (128 - totalH) / 2 + lineHeight / 2;

    ctx.clearRect(0,0,128,128);
    for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], 64, startY + i * lineHeight);
    saveCanvas();
    statusEl.innerText = `✅ ${lines.length} línea(s) aplicada(s).`;
  }

  // CANVAS helper
  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (128 / rect.width), y: (clientY - rect.top) * (128 / rect.height) };
  }

  canvas.addEventListener('pointerdown', (e) => { isDrawing = true; draw(e); });
  window.addEventListener('pointerup', () => { if(isDrawing){ isDrawing = false; saveCanvas(); } });
  canvas.addEventListener('pointermove', draw);

  function draw(e){
    if(!isDrawing) return;
    ctx.fillStyle = 'white';
    const pos = getPos(e);
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, Math.PI*2); ctx.fill();
  }

  function clearCanvas(){ ctx.fillStyle = 'black'; ctx.fillRect(0,0,128,128); saveCanvas(); }
  function saveCanvas(){ try{ localStorage.setItem('last_oled_img', canvas.toDataURL()); }catch(e){} }

  // BLUETOOTH helpers (bridge)
  function initBT(){
    statusEl.innerText = 'Conectando Nachimbong...';
    try{
      if(window.bridge && typeof window.bridge.blePairingStart === 'function'){
        window.bridge.blePairingStart(''); statusEl.innerText = 'Emparejando...';
      } else if(window.webkit?.messageHandlers?.blePairingStart){
        window.webkit.messageHandlers.blePairingStart.postMessage(''); statusEl.innerText = 'Emparejando (iOS)...';
      } else {
        statusEl.innerText = '⚠️ Bridge no disponible (solo funciona en la app).';
      }
    }catch(e){ statusEl.innerText = 'Error BT: ' + (e && e.message); }
  }

  function resetDevice(){
    statusEl.innerText = 'Reiniciando Nachimbong...';
    try{
      const resetCmd = '8110,-';
      if(window.bridge) {
        window.bridge.bleSendCmdList(resetCmd);
        setTimeout(()=>{ window.bridge.bleDisconnect(''); setTimeout(initBT,2000); }, 500);
      } else if(window.webkit?.messageHandlers?.bleSendCmdList){
        window.webkit.messageHandlers.bleSendCmdList.postMessage(resetCmd);
        setTimeout(()=>{ window.webkit.messageHandlers.bleDisconnect?.postMessage(''); setTimeout(initBT,2000); }, 500);
      }
      statusEl.innerText = 'Reiniciando... reconectando en 2s';
    }catch(e){ statusEl.innerText = 'Error al reiniciar: ' + (e && e.message); }
  }

  // TRANSFER to NACHIMBONG: SSD1306 page-byte format
  async function transferOled(){
    statusEl.innerText = 'Preparando imagen...';
    const imgData = ctx.getImageData(0,0,128,128).data;
    const oledBytes = new Uint8Array(2048);

    for(let y=0;y<128;y++){
      for(let x=0;x<128;x++){
        const idx = (y*128 + x) * 4;
        const bright = imgData[idx];
        // bright > 128 -> white; adjust if your data is inverse.
        if(bright > 128){
          const byteIdx = Math.floor(y/8) * 128 + x;
          oledBytes[byteIdx] |= (1 << (y % 8));
        }
      }
    }

    // send in 16 chunks of 128 bytes via bridge or webkit
    for(let part=0; part<16; part++){
      const chunk = oledBytes.slice(part * 128, (part+1) * 128);
      const hexData = Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join('');
      const cmd = `810F00000000${part.toString(16).padStart(2,'0')}${hexData},-`;
      try{
        if(window.bridge && typeof window.bridge.bleSendCmdList === 'function') window.bridge.bleSendCmdList(cmd);
        else if(window.webkit?.messageHandlers?.bleSendCmdList) window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd);
        statusEl.innerText = `Enviando: ${Math.round(((part+1)/16)*100)}%`;
        await new Promise(r => setTimeout(r, 150));
      }catch(e){ statusEl.innerText = '⚠️ Error en parte ' + (part+1); console.error(e); return; }
    }
    statusEl.innerText = '✅ ¡Enviado correctamente!';
  }

  // ---------- Envío de animaciones (snapshot, chunks y progreso) ----------
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Construye 16 chunks de 128 bytes (256 hex chars) desde un frame hex de 4096 chars
  function buildChunksFromFrameHex(frameHex) {
    const clean = String(frameHex || '').replace(/[^0-9A-Fa-f]/g,'').toUpperCase();
    const padded = padTo2048Bytes(clean); // asegura 4096 hex chars
    const CHUNK_HEX_LEN = 128 * 2; // 256 hex chars
    const chunks = [];
    for (let i = 0; i < 2048 * 2; i += CHUNK_HEX_LEN) {
      chunks.push(padded.substr(i, CHUNK_HEX_LEN));
    }
    return chunks; // length debería ser 16
  }

  // Envía un chunk hex con el formato que usa transferOled (misma estructura)
  async function sendChunkHex(chunkHex, partIndex, perChunkDelay = 150) {
    const partHex = partIndex.toString(16).padStart(2, '0').toUpperCase();
    const cmd = `810F00000000${partHex}${chunkHex},-`;
    try {
      if (window.bridge && typeof window.bridge.bleSendCmdList === 'function') {
        window.bridge.bleSendCmdList(cmd);
      } else if (window.webkit?.messageHandlers?.bleSendCmdList) {
        window.webkit.messageHandlers?.bleSendCmdList.postMessage(cmd);
      } else {
        throw new Error('Bridge BLE no disponible');
      }
      await delay(perChunkDelay);
    } catch (e) {
      console.error('sendChunkHex error', e);
      throw e;
    }
  }

  // Envía una animación completa (array de frames hex). Pausa preview y hace snapshot.
  // framesHexArray: array de strings hex (cada una 4096 hex chars)
  // fps: frames por segundo deseados (default 8)
  // perChunkDelayMs: delay entre chunks (default 120-150 ms) — ajustar según estabilidad
  window.transferAnimationFull = async function(framesHexArray, fps = 8, perChunkDelayMs = 150) {
    if (!Array.isArray(framesHexArray) || framesHexArray.length === 0) {
      statusEl.innerText = 'No hay frames para enviar.';
      return;
    }

    // snapshot para evitar race conditions con la preview
    const snapshot = framesHexArray.slice().map(h => padTo2048Bytes(h));
    const totalFrames = snapshot.length;
    const frameIntervalMs = Math.max(1, Math.round(1000 / Math.max(1, fps)));

    // pausa preview si está corriendo
    const wasPreviewRunning = !!previewTimer;
    if (wasPreviewRunning) stopPreview();

    try {
      statusEl.innerText = `Enviando animación (${totalFrames} frames)...`;
      for (let fi = 0; fi < totalFrames; fi++) {
        const frameHex = snapshot[fi];
        const chunks = buildChunksFromFrameHex(frameHex); // 16 chunks
        const start = Date.now();

        for (let pi = 0; pi < chunks.length; pi++) {
          statusEl.innerText = `Enviando frame ${fi+1}/${totalFrames} chunk ${pi+1}/${chunks.length}...`;
          await sendChunkHex(chunks[pi], pi, perChunkDelayMs);
        }

        // Si queremos respetar fps, esperar lo que reste del frameInterval
        const elapsed = Date.now() - start;
        const wait = frameIntervalMs - elapsed;
        if (wait > 0) await delay(wait);

        // actualización de progreso por frames
        statusEl.innerText = `Enviado ${fi+1}/${totalFrames} frames (${Math.round(((fi+1)/totalFrames)*100)}%)`;
      }

      statusEl.innerText = '✅ Animación enviada correctamente.';
    } catch (err) {
      console.error('Error enviando animación:', err);
      statusEl.innerText = '⚠️ Error enviando animación: ' + (err && err.message ? err.message : err);
    } finally {
      // reanudar preview si estaba corriendo
      if (wasPreviewRunning && lastFrames && lastFrames.length > 1) {
        startPreview(lastFrames, previewMode, Math.round(1000 / Math.max(1, frameIntervalMs)));
      }
    }
  };

  // Conveniencia: envía la animación actualmente cargada (lastFrames) desde el primer frame.
  // Llama a transferAnimationFull con un snapshot para evitar leer el frame visible.
  window.transferCurrentAnimation = async function(fps = 8, perChunkDelayMs = 150) {
    if (!lastFrames || !lastFrames.length) {
      statusEl.innerText = 'No hay animación cargada para enviar.';
      return;
    }
    // snapshot copia
    const snap = lastFrames.slice();
    await window.transferAnimationFull(snap, fps, perChunkDelayMs);
  };

  // --- Helpers para diseños/animaciones ---
  function padTo2048Bytes(hex) {
    if (!hex) return '00'.repeat(2048);
    const cleaned = String(hex).replace(/[^0-9A-Fa-f]/g,'');
    const needed = 2048*2 - cleaned.length;
    if (needed <= 0) return cleaned.substr(0, 2048*2).toUpperCase();
    return (cleaned + '0'.repeat(needed)).toUpperCase();
  }

  function hexToBytes(hex){
    if(!hex) return new Uint8Array();
    const s = String(hex).replace(/[^0-9A-Fa-f]/g,'');
    const len = Math.floor(s.length/2);
    const out = new Uint8Array(len);
    for(let i=0;i<len;i++) out[i] = parseInt(s.substr(i*2,2), 16);
    return out;
  }

  // Conteo rápido de píxeles encendidos para heurística (incluye modo 'rows' y 'invert')
  function countLitPixels(bytes, mode){
    const w = 128, h = 128;
    let count = 0;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        let bit = 0;
        try{
          if(mode === 'standard'){
            const byteIdx = Math.floor(y/8) * w + x;
            bit = (bytes[byteIdx] >> (y % 8)) & 1;
          } else if(mode === 'revbit'){
            const byteIdx = Math.floor(y/8) * w + x;
            bit = (bytes[byteIdx] >> (7 - (y % 8))) & 1;
          } else if(mode === 'transpose'){
            const byteIdx = Math.floor(x/8) * h + y;
            bit = (bytes[byteIdx] >> (x % 8)) & 1;
          } else if(mode === 'rows'){
            const byteIdx = y * (w/8) + Math.floor(x/8);
            bit = (bytes[byteIdx] >> (7 - (x % 8))) & 1;
          } else if(mode === 'invert'){
            const byteIdx = Math.floor(y/8) * w + x;
            bit = ((bytes[byteIdx] >> (y % 8)) & 1) ? 0 : 1;
          }
        }catch(e){ bit = 0; }
        if(bit) count++;
      }
    }
    return count;
  }

  function renderOledBytes(bytes){
    renderOledBytesVariant(bytes, 'standard');
  }

  function renderOledBytesVariant(bytes, mode){
    try{
      const w = 128, h = 128;
      const img = ctx.createImageData(w,h);
      // fill background black (img already zeroed, but keep for clarity)
      for (let i=0;i<img.data.length;i+=4){ img.data[i]=0; img.data[i+1]=0; img.data[i+2]=0; img.data[i+3]=255; }

      for(let y=0; y<h; y++){
        for(let x=0; x<w; x++){
          let bit = 0;
          try {
            if(mode === 'standard') {
              // Modo SSD1306 (Páginas verticales)
              const byteIdx = Math.floor(y/8) * w + x;
              bit = (bytes[byteIdx] >> (y % 8)) & 1;
            } else if(mode === 'rows') {
              // Modo Horizontal (bytes por fila)
              const byteIdx = y * (w/8) + Math.floor(x/8);
              bit = (bytes[byteIdx] >> (7 - (x % 8))) & 1;
            } else if(mode === 'transpose') {
              // Modo transpuesto
              const byteIdx = Math.floor(x/8) * h + y;
              bit = (bytes[byteIdx] >> (x % 8)) & 1;
            } else if(mode === 'revbit') {
              const byteIdx = Math.floor(y/8) * w + x;
              bit = (bytes[byteIdx] >> (7 - (y % 8))) & 1;
            } else if(mode === 'invert') {
              const byteIdx = Math.floor(y/8) * w + x;
              bit = ((bytes[byteIdx] >> (y % 8)) & 1) ? 0 : 1;
            }
          } catch(e) { bit = 0; }

          const i = (y*w + x) * 4;
          const color = bit ? 255 : 0;
          img.data[i] = img.data[i+1] = img.data[i+2] = color;
          img.data[i+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      saveCanvas();
    } catch(e) {
      statusEl.innerText = 'Error render: ' + mode;
      console.error('renderOledBytesVariant error', e);
    }
  }

  // --- Flatten helpers + preview player ---
  function flattenToString(v) {
    if (Array.isArray(v)) return v.map(flattenToString).join('');
    return String(v ?? '');
  }

  let lastFrames = []; // array of hex strings (each frame = 2048 bytes = 4096 hex chars)
  let lastFramesChunks = null;
  let previewTimer = null;
  let previewIdx = 0;
  let previewMode = 'standard';

  function stopPreview() {
    if (previewTimer) {
      clearInterval(previewTimer);
      previewTimer = null;
    }
  }

  function startPreview(framesHex, mode = 'standard', fps = 10) {
    stopPreview();

    if (!framesHex || framesHex.length === 0) return;

    previewMode = mode;
    previewIdx = 0;

    const delay = Math.max(20, Math.round(1000 / fps));

    const renderCurrent = () => {
      const hex = framesHex[previewIdx];
      const bytes = hexToBytes(hex);
      renderOledBytesVariant(bytes, previewMode);

      statusEl.innerText =
        `Vista previa: frame ${previewIdx + 1}/${framesHex.length} (${fps} FPS, modo: ${previewMode})`;

      previewIdx = (previewIdx + 1) % framesHex.length;
    };

    renderCurrent();

    if (framesHex.length > 1) {
      previewTimer = setInterval(renderCurrent, delay);
    }
  }

  // --- Extraction from MIS_DISENOS / MIS_ANIMATIONS ---
  function getFramesFromMIS_DISENOS(name) {
    if (!window.MIS_DISENOS || !window.MIS_DISENOS[name]) return null;
    const entry = window.MIS_DISENOS[name];

    // If entry is array of arrays (each frame as chunks)
    if (Array.isArray(entry) && entry.length > 0 && Array.isArray(entry[0]) && typeof entry[0][0] === 'string') {
      return entry.map(frameArr => padTo2048Bytes(frameArr.join('')));
    }

    // If entry is array of chunk strings (single frame)
    if (Array.isArray(entry) && typeof entry[0] === 'string') {
      return [ padTo2048Bytes(entry.join('')) ];
    }

    return null;
  }

  function getFramesFromMIS_ANIMATIONS(name){
    if (!window.MIS_ANIMATIONS || !window.MIS_ANIMATIONS[name]) return null;

    const entry = window.MIS_ANIMATIONS[name];
    // flatten any shape to a single hex string, clean and uppercase
    const fullHex = flattenToString(entry).replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

    if (!fullHex) return null;

    const frames = [];
    for (let i = 0; i < fullHex.length; i += 4096) {
      frames.push(padTo2048Bytes(fullHex.slice(i, i + 4096)));
    }

    return frames.length ? frames : null;
  }

  function getFramesForDesign(name) {
    // Try MIS_ANIMATIONS first (more specific)
    const animFrames = getFramesFromMIS_ANIMATIONS(name);
    if (animFrames && animFrames.length) {
      console.log(`getFramesForDesign: found MIS_ANIMATIONS for ${name}, frames: ${animFrames.length}, hexLen=${String(animFrames[0]).length}`);
      return animFrames;
    }

    const disFrames = getFramesFromMIS_DISENOS(name);
    if (disFrames && disFrames.length) {
      console.log(`getFramesForDesign: found MIS_DISENOS for ${name}, frames: ${disFrames.length}, hexLen=${String(disFrames[0]).length}`);
      return disFrames;
    }

    return null;
  }

  // Heurística: prueba varios modos de interpretación de bits y elige el más "razonable"
  function pickBestModeForHex(hex){
    try{
      const bytes = hexToBytes(hex);
      const modes = ['standard','rows','revbit','transpose','invert'];
      const results = modes.map(m => ({ mode: m, lit: countLitPixels(bytes, m) }));
      results.forEach(r => r.score = Math.abs(r.lit - 4000));
      results.sort((a,b)=>a.score - b.score);
      console.log('pickBestModeForHex results', results);
      return results[0].mode;
    }catch(e){
      return 'standard';
    }
  }

  // loadDesign: soporte para animaciones y modos
  function loadDesign(nameOrArray, mode='standard') {
    try {
      stopPreview();

      let framesHex = [];

      if (Array.isArray(nameOrArray)) {
        for (let nm of nameOrArray) {
          const f = getFramesForDesign(nm);
          if (!f) { statusEl.innerText = 'Diseño no encontrado o formato inválido: ' + nm; return; }
          framesHex.push(...f);
        }
      } else {
        const name = nameOrArray;
        const f = getFramesForDesign(name);
        if (!f) { statusEl.innerText = 'Diseño no encontrado: ' + name; return; }
        framesHex = f;
      }

      if (!framesHex.length) {
        statusEl.innerText = 'No se obtuvieron frames para el/los diseño(s).';
        return;
      }

      framesHex = framesHex.map(h => padTo2048Bytes(h));

      lastFrames = framesHex;
      lastFramesChunks = null;

      let chosenMode = mode;
      if (mode === 'auto') {
        chosenMode = pickBestModeForHex(framesHex[0]);
      }

      if (mode === 'standard') {
        const stdCount = countLitPixels(hexToBytes(framesHex[0]), 'standard');
        if (stdCount < 100 || stdCount > 16000) {
          chosenMode = pickBestModeForHex(framesHex[0]);
        } else {
          chosenMode = 'standard';
        }
      }

      window._lastLoadedDesign = Array.isArray(nameOrArray) ? nameOrArray.join(',') : nameOrArray;

      // Si hay varios frames, reproducir animación
      if (framesHex.length > 1) {
        startPreview(framesHex, chosenMode, 10);
      } else {
        const bytes = hexToBytes(framesHex[0]);
        renderOledBytesVariant(bytes, chosenMode);
        statusEl.innerText =
          'Vista previa: ' + (Array.isArray(nameOrArray) ? ('Animación de: ' + nameOrArray.join(', ')) : nameOrArray) +
          ' (modo: ' + chosenMode + ', frames: ' + lastFrames.length + ')';
      }

      console.log('loadDesign loaded', window._lastLoadedDesign, 'frames:', lastFrames.length, 'hexLen:', framesHex[0].length);
    } catch (e) {
      console.error('loadDesign error', e);
      statusEl.innerText = 'Error cargando diseño';
    }
  }

  // Conveniencia para botones: acepta varargs o array
  function loadDesignAsAnimation(...args) {
    const names = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
    loadDesign(names, 'standard');
  }

  // expose functions globally used by HTML
  window.showEmojiCat = showEmojiCat;
  window.setLines = setLines;
  window.selectFont = selectFont;
  window.applyText = applyText;
  window.clearCanvas = clearCanvas;
  window.saveCanvas = saveCanvas;
  window.initBT = initBT;
  window.resetDevice = resetDevice;
  window.transferOled = transferOled;
  window.loadDesign = loadDesign;
  window.loadDesignAsAnimation = loadDesignAsAnimation;

  // init on DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    renderEmojis();
    const last = localStorage.getItem('last_oled_img');
    if(last){ const im = new Image(); im.onload = () => ctx.drawImage(im,0,0); im.src = last; } else { clearCanvas(); }

    document.getElementById('applyRenderMode')?.addEventListener('click', () => {
      const sel = document.getElementById('renderMode');
      const mode = sel?.value || 'standard';
      if(window._lastLoadedDesign) loadDesign(window._lastLoadedDesign, mode);
      else statusEl.innerText = 'Primero carga un diseño (ej. Wolfchan Mexa)';
    });

    setTimeout(() => { try{ initBT(); }catch(e){} }, 1000);

    // Botón mágico para arreglar la vista previa en el celular
    const fixBtn = document.createElement('button');
    fixBtn.innerText = "🔄 Cambiar Modo Vista";
    fixBtn.style = "position:fixed; bottom:10px; right:10px; z-index:9999; padding:10px; background:#ff9600; color:white; border-radius:5px; border:none;";
    document.body.appendChild(fixBtn);

    let modeIdx = 0;
    const modes = ['standard', 'rows', 'transpose', 'revbit', 'invert'];

    fixBtn.onclick = () => {
      modeIdx = (modeIdx + 1) % modes.length;
      const currentMode = modes[modeIdx];
      statusEl.innerText = "Modo: " + currentMode;
      if(window._lastLoadedDesign) {
         loadDesign(window._lastLoadedDesign, currentMode);
      }
    };
  });
})();


// --- PATCH: send frames at 100ms/frame (uses window.bridge on Android) ---
(function(){
  // preserve original if present
  try{ if(window.transferCurrentAnimation && !window._patched_send100) window._orig_transferCurrentAnimation = window.transferCurrentAnimation; } catch(e){}
  window._patched_send100 = true;

  // helper: clean hex and pad to 2048 bytes (4096 hex chars)
  function cleanHex(s){ return String(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase(); }
  function padToFrame(hex){ const FRAME_HEX_LEN = 2048*2; const h = cleanHex(hex); if(h.length>=FRAME_HEX_LEN) return h.substr(0,FRAME_HEX_LEN); return h.padEnd(FRAME_HEX_LEN,'0'); }
  function buildChunksFromFrameHex(frameHex){
    const padded = padToFrame(frameHex);
    const CHUNK_HEX_LEN = 128 * 2; // 256 hex chars => 128 bytes
    const chunks = [];
    for(let i=0;i<padded.length;i+=CHUNK_HEX_LEN) chunks.push(padded.substr(i,CHUNK_HEX_LEN));
    return chunks;
  }

  async function bridgeSend(cmd){
    if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
      try{ window.bridge.bleSendCmdList(cmd); }catch(e){ console.error('bridgeSend err',e); }
    } else if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){
      try{ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); }catch(e){ console.error('webkitSend err',e); }
    } else {
      throw new Error('bridge not available');
    }
  }

  // Main function: sends frames at perFrameMs (default 100ms)
  window.transferCurrentAnimation = async function(perFrameMs = 100, perChunkDelayMs = Math.max(4, Math.floor(perFrameMs/16))) {
    const statusEl = document.getElementById('status');
    function setStatus(t){ try{ if(statusEl) statusEl.innerText = t; }catch(e){} }

    // get frames from window.lastFrames or from MIS_ANIMATIONS selection
    let frames = [];
    if(Array.isArray(window.lastFrames) && window.lastFrames.length > 0){ frames = window.lastFrames.slice(); }
    else if(window.MIS_ANIMATIONS){
      // try first available animation
      const keys = Object.keys(window.MIS_ANIMATIONS);
      if(keys.length>0){ frames = window.MIS_ANIMATIONS[keys[0]].slice(); }
    }

    if(!frames || frames.length === 0){ setStatus('No hay frames para enviar.'); return; }

    setStatus(`Iniciando envío de ${frames.length} frames @ ${perFrameMs}ms/frame`);

    // initial prep/reset command commonly used by app
    try{ await bridgeSend('8110,-'); }catch(e){}
    await new Promise(r=>setTimeout(r, Math.max(80, Math.floor(perFrameMs/4))));

    for(let i=0;i<frames.length;i++){
      const fhex = padToFrame(frames[i]);
      const chunks = buildChunksFromFrameHex(fhex);
      setStatus(`Enviando frame ${i+1}/${frames.length} (chunks=${chunks.length})`);

      // send each chunk quickly to fit frame interval
      const start = Date.now();
      for(let ci=0; ci<chunks.length; ci++){
        const idxHex = ci.toString(16).padStart(2,'0').toUpperCase();
        const cmd = `810F00000000${idxHex}${chunks[ci]},-`;
        try{ await bridgeSend(cmd); }catch(e){ console.error('send chunk err', e); }
        // small delay between chunks
        await new Promise(r=>setTimeout(r, perChunkDelayMs));
      }

      // ensure at least perFrameMs elapsed since start before sending next frame
      const elapsed = Date.now() - start;
      const wait = Math.max(0, perFrameMs - elapsed);
      if(wait>0) await new Promise(r=>setTimeout(r, wait));
    }

    setStatus('Envío de animación completado.');
  };

  // Ensure send button uses transferCurrentAnimation(100)
  window.addEventListener('DOMContentLoaded', ()=>{
    try{
      const sendBtn = document.getElementById('sendBtn');
      if(sendBtn){
        try{ sendBtn.removeAttribute && sendBtn.removeAttribute('onclick'); }catch(e){}
        sendBtn.addEventListener('click', async (ev)=>{
          ev && ev.preventDefault && ev.preventDefault();
          try{ await window.transferCurrentAnimation(100); }catch(e){ console.error(e); if(window._orig_transferCurrentAnimation) try{ await window._orig_transferCurrentAnimation(100); }catch(e2){} }
        }, {passive:false});
      }
    }catch(e){}
  });
})();


// --- PATCH v2: Conservative send (Option B) - chunk numbering 1..16, larger delays and per-frame commit ---
(function(){
  try{ if(window._patched_transferCurrentAnimation_v2) return; }catch(e){}
  // keep backup of previous implementations
  try{ if(window.transferCurrentAnimation && !window._orig_transferCurrentAnimation_v2) window._orig_transferCurrentAnimation_v2 = window.transferCurrentAnimation; }catch(e){}
  window._patched_transferCurrentAnimation_v2 = true;

  function cleanHex(s){ return String(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase(); }
  function padToFrame(hex){ const FRAME_HEX_LEN = 2048*2; const h = cleanHex(hex); if(h.length>=FRAME_HEX_LEN) return h.substr(0,FRAME_HEX_LEN); return h.padEnd(FRAME_HEX_LEN,'0'); }
  function buildChunksFromFrameHex(frameHex){ const padded = padToFrame(frameHex); const CHUNK_HEX_LEN = 128*2; const chunks = []; for(let i=0;i<padded.length;i+=CHUNK_HEX_LEN) chunks.push(padded.substr(i,CHUNK_HEX_LEN)); return chunks; }

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  async function bridgeSend(cmd){
    if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
      try{ window.bridge.bleSendCmdList(cmd); }catch(e){ console.error('bridgeSend err',e); }
    } else if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){
      try{ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); }catch(e){ console.error('webkitSend err',e); }
    } else {
      throw new Error('bridge not available');
    }
  }

  // Conservative transfer: send chunks numbered 1..16, longer per-chunk delay and a prep/commit (8110,-) before and after each frame
  window.transferCurrentAnimation = async function(perChunkDelayMs = 80, perFrameDelayMs = 80) {
    const statusEl = document.getElementById('status');
    function setStatus(t){ try{ if(statusEl) statusEl.innerText = t; }catch(e){} }

    // obtain frames
    let frames = [];
    if(Array.isArray(window.lastFrames) && window.lastFrames.length>0) frames = window.lastFrames.slice();
    else if(window.MIS_ANIMATIONS){ const k = Object.keys(window.MIS_ANIMATIONS)[0]; if(k) frames = window.MIS_ANIMATIONS[k].slice(); }
    if(!frames || frames.length===0){ setStatus('No hay frames para enviar.'); return; }

    setStatus(`Iniciando envío conservador de ${frames.length} frames`);

    for(let fi=0; fi<frames.length; fi++){
      const fhex = padToFrame(frames[fi]);
      const chunks = buildChunksFromFrameHex(fhex);
      setStatus(`Frame ${fi+1}/${frames.length}: prep`);

      // pre-frame reset/prep
      try{ await bridgeSend('8110,-'); }catch(e){}
      await sleep(120);

      // send chunks numbered 1..N
      const start = Date.now();
      for(let ci=0; ci<chunks.length; ci++){
        const idx = (ci+1).toString(16).padStart(2,'0').toUpperCase();
        const cmd = `810F00000000${idx}${chunks[ci]},-`;
        try{ await bridgeSend(cmd); }catch(e){ console.error('chunk send err', e); }
        await sleep(perChunkDelayMs);
      }

      // post-frame commit/reset to force apply
      try{ await bridgeSend('8110,-'); }catch(e){}

      // ensure at least perFrameDelayMs since start
      const elapsed = Date.now() - start;
      const wait = Math.max(perFrameDelayMs, 0) - Math.max(0, elapsed - (perChunkDelayMs*chunks.length));
      if(wait>0) await sleep(wait);

      setStatus(`Frame ${fi+1}/${frames.length} enviado`);
    }

    setStatus('Envío conservador completado.');
  };

  // attach to sendBtn to use conservative defaults
  window.addEventListener('DOMContentLoaded', ()=>{
    try{
      const sendBtn = document.getElementById('sendBtn');
      if(sendBtn){ try{ sendBtn.removeAttribute && sendBtn.removeAttribute('onclick'); }catch(e){}
        sendBtn.addEventListener('click', async (ev)=>{ ev&&ev.preventDefault&&ev.preventDefault(); try{ await window.transferCurrentAnimation(80,80); }catch(e){ console.error(e); if(window._orig_transferCurrentAnimation_v2) try{ await window._orig_transferCurrentAnimation_v2(80,80); }catch(e2){} } }, {passive:false});
      }
    }catch(e){}
  });
})();
