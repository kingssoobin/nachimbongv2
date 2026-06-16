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
  let lastCanvasSource = 'clear'; // clear | text | emoji | draw | design

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
    lastCanvasSource = 'emoji';
    statusEl.innerText = 'Emoji cargado: ' + emoji;
  }

  // LINES
  function setLines(n, btn){
  numLines = n;
  document.querySelectorAll('.line-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  // show/hide the actual input elements used in index.html
  const l1 = document.getElementById('line1');
  const l2 = document.getElementById('line2');
  const l3 = document.getElementById('line3');
  if(l1) l1.classList.toggle('hidden', false);
  if(l2) l2.classList.toggle('hidden', n < 2);
  if(l3) l3.classList.toggle('hidden', n < 3);
  const sizeMap = {1:28, 2:22, 3:16};
  const fs = document.getElementById('fontSize');
  if(fs){ fs.value = sizeMap[n] || 24; const sv = document.getElementById('sizeVal'); if(sv) sv.innerText = fs.value; }
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

    if(lines.length === 0){ statusEl.innerText = '⚠️ Escribe algo primero.'; return false; }

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
    lastCanvasSource = 'text';
    statusEl.innerText = `✅ ${lines.length} línea(s) aplicada(s).`;
    return true;
  }

  // CANVAS helper
  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (128 / rect.width), y: (clientY - rect.top) * (128 / rect.height) };
  }

  canvas.addEventListener('pointerdown', (e) => { isDrawing = true; lastCanvasSource = 'draw'; draw(e); });
  window.addEventListener('pointerup', () => { if(isDrawing){ isDrawing = false; saveCanvas(); } });
  canvas.addEventListener('pointermove', draw);

  function draw(e){
    if(!isDrawing) return;
    ctx.fillStyle = 'white';
    const pos = getPos(e);
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, Math.PI*2); ctx.fill();
  }

  function clearCanvas(){
    try{ stopPreview(); }catch(e){}
    try{ previewIdx = 0; }catch(e){}
    try{ lastFrames = []; window.lastFrames = []; lastFramesChunks = null; window._lastLoadedDesign = null; }catch(e){}
    try{ ctx.fillStyle = 'black'; ctx.fillRect(0,0,128,128); }catch(e){}
    saveCanvas();
    lastCanvasSource = 'clear';
    try{ statusEl.innerText = 'Canvas limpiado.'; }catch(e){}
  }
  function saveCanvas(){ try{ localStorage.setItem('last_oled_img', canvas.toDataURL()); }catch(e){} }

  // BLUETOOTH helpers (bridge)
  function initBT(){ if(window.NachimbongConnect && typeof window.NachimbongConnect.initBT==='function'){ return window.NachimbongConnect.initBT(); } else { console.warn('NachimbongConnect not loaded'); } }

  function resetDevice(){ if(window.NachimbongConnect && typeof window.NachimbongConnect.resetDevice==='function'){ return window.NachimbongConnect.resetDevice(); } else { console.warn('NachimbongConnect not loaded for reset'); } }

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
    if(window.NachimbongConnect && typeof window.NachimbongConnect.sendOledChunks==='function'){ const ok = await window.NachimbongConnect.sendOledChunks(oledBytes, { perChunkDelay: 150, perFinalDelay: 200 }); if(!ok){ statusEl.innerText = '⚠️ Error enviando'; return; } } else { console.warn('NachimbongConnect not available — cannot send'); statusEl.innerText = 'Bridge no disponible'; return; }
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
      window.lastFrames = framesHex.slice();
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
      lastCanvasSource = 'design';

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


// --- ULTIMATE PATCH: full-compatible transfer (tries official tA format + multiple chunk ordering modes + reconnection helpers) ---
(function(){
  if(window._ultimate_oled_patch) return; window._ultimate_oled_patch = true;
  const STATUS_ID = 'status';
  const FRAME_BYTES = 2048; // bytes per frame
  const CHUNK_BYTES = 128; // bytes per chunk
  const CHUNKS_PER_FRAME = FRAME_BYTES / CHUNK_BYTES; // 16

  function setStatus(s){ try{ const el=document.getElementById(STATUS_ID); if(el) el.innerText = s; }catch(e){} console.log('[OLED_PATCH]', s); }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  function cleanHex(s){ return String(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase(); }
  function padToFrame(hex){ const FRAME_HEX_LEN = FRAME_BYTES*2; const h = cleanHex(hex); if(h.length>=FRAME_HEX_LEN) return h.substr(0,FRAME_HEX_LEN); return h.padEnd(FRAME_HEX_LEN,'0'); }
  function buildChunksFromFrameHex(frameHex){ const padded = padToFrame(frameHex); const CHUNK_HEX_LEN = CHUNK_BYTES*2; const chunks = []; for(let i=0;i<padded.length;i+=CHUNK_HEX_LEN) chunks.push(padded.substr(i,CHUNK_HEX_LEN)); return chunks; }
  function F7(e){ const F = e.toString(16).toUpperCase(); return F.length==1?('0'+F):F; }

  // Send command using pt() if available, otherwise call native bridge directly
  function lowLevelSend(cmd){ try{ if(typeof pt === 'function'){ pt(cmd); return; } }catch(e){}
    try{ if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){ window.bridge.bleSendCmdList(cmd); return; } }catch(e){}
    try{ if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return; } }catch(e){}
    console.warn('No native bridge available for BLE send: ', cmd);
  }

  // Ensure BLE connection state resets properly (for WebBluetooth fallback scenarios)
  try{
    if(window.state && window.state.bleDev && window.state.bleDev.gatt && !window._oled_gatt_listener){
      window._oled_gatt_listener = true;
      window.state.bleDev.addEventListener && window.state.bleDev.addEventListener('gattserverdisconnected', ()=>{
        window.state.bleChr = null; setStatus('BLE disconnected');
      });
    }
  }catch(e){}

  // Core: send one full animation using a single mode
  async function sendAnimationWithMode(frames, mode, perChunkDelay = 80, perFrameDelay = 100){
    // mode: 'zero', 'one', 'reverse-zero', 'reverse-one'
    const numFrames = frames.length;
    const e_hex = (numFrames-1).toString(16).toUpperCase().padStart(4,'0');

    setStatus(`Modo: ${mode}. Frames=${numFrames}. chunkDelay=${perChunkDelay}ms`);

    // initial prep
    lowLevelSend('8110,-');
    await sleep(120);

    for(let f=0; f<numFrames; f++){
      const frameHex = padToFrame(frames[f]);
      const chunks = buildChunksFromFrameHex(frameHex);
      const F_hex = (f).toString(16).toUpperCase().padStart(4,'0');
      setStatus(`Modo ${mode}: enviando frame ${f+1}/${numFrames} (${chunks.length} chunks)`);

      const order = [];
      for(let i=0;i<chunks.length;i++) order.push(i);
      if(mode.indexOf('reverse')!==-1) order.reverse();

      for(let idx=0; idx<order.length; idx++){
        const ci = order[idx];
        const partIndex = (mode.indexOf('one')!==-1) ? (ci+1) : ci; // 0..15 or 1..16
        const part_hex = F7(partIndex);
        const cmd = `810F${e_hex}${F_hex}${part_hex}${chunks[ci]},-`;
        lowLevelSend(cmd);
        await sleep(perChunkDelay);
      }

      // post-frame commit
      lowLevelSend('8110,-');
      await sleep(perFrameDelay);

      setStatus(`Modo ${mode}: frame ${f+1}/${numFrames} enviado`);
    }

    setStatus(`Modo ${mode}: animación enviada (completo)`).toString();
  }

  // Full automated runner: tries several modes sequentially until user stops
  async function autoTryAllModes(frames, opts){
    opts = opts || {};
    const perChunkDelay = opts.perChunkDelay || 80;
    const perFrameDelay = opts.perFrameDelay || 120;
    const modes = ['zero','one','reverse-zero','reverse-one'];
    setStatus('Inicio secuencia automatizada de modos: '+modes.join(', '));
    for(let m of modes){
      setStatus(`Intentando modo: ${m}`);
      await sendAnimationWithMode(frames, m, perChunkDelay, perFrameDelay);
      // small pause between modes to allow device to settle
      setStatus(`Pausa tras modo ${m}...`);
      await sleep(1000);
    }
    setStatus('Secuencia automatizada completada. Revisa la OLED.');
  }

  // Public API: transferCurrentAnimationUltimate
  window.transferCurrentAnimationUltimate = async function(options){
    options = options || {};
    const perChunkDelay = options.perChunkDelay || 80;
    const perFrameDelay = options.perFrameDelay || 120;
    // gather frames
    let frames = [];
    if(Array.isArray(window.lastFrames) && window.lastFrames.length>0) frames = window.lastFrames.slice();
    else if(window.MIS_ANIMATIONS){ const k=Object.keys(window.MIS_ANIMATIONS)[0]; if(k) frames = window.MIS_ANIMATIONS[k].slice(); }
    if(!frames || frames.length===0){ setStatus('No hay frames para enviar.'); return; }

    // Normalize frames to hex strings of length FRAME_BYTES*2
    frames = frames.map(f=>padToFrame(f));

    // Run official single-mode first (zero), then auto if needed
    try{
      setStatus('Enviando en modo oficial (0..15)');
      await sendAnimationWithMode(frames, 'zero', perChunkDelay, perFrameDelay);
      setStatus('Modo oficial completado. Si no funciona, ejecutar autoTryAllModes con más opciones.');
    }catch(err){ console.error('transfer error',err); setStatus('Error durante envio: '+(err&&err.message)); }
  };

  // convenience: attach to sendBtn (will call transferCurrentAnimationUltimate with conservative defaults)
  window.addEventListener('DOMContentLoaded', ()=>{
    try{
      const sendBtn = document.getElementById('sendBtn');
      if(sendBtn){ try{ sendBtn.removeAttribute && sendBtn.removeAttribute('onclick'); }catch(e){}
        sendBtn.addEventListener('click', async (ev)=>{ ev&&ev.preventDefault&&ev.preventDefault(); try{ await window.transferCurrentAnimationUltimate({perChunkDelay:80, perFrameDelay:120}); }catch(e){ console.error(e); } }, {passive:false});
      }
    }catch(e){ console.error(e); }
  });

})();


// --- BULK SINGLE-SHOT UPLOAD: open once, send all frames (all chunks), close once ---
(function(){
  if(window._bulk_single_shot_patch) return; window._bulk_single_shot_patch = true;

  function cleanHex(s){ return String(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase(); }
  function padToFrame(hex){ const FRAME_HEX_LEN = 2048*2; const h = cleanHex(hex); if(h.length>=FRAME_HEX_LEN) return h.substr(0,FRAME_HEX_LEN); return h.padEnd(FRAME_HEX_LEN,'0'); }
  function buildChunksFromFrameHex(frameHex){ const padded = padToFrame(frameHex); const CHUNK_HEX_LEN = 128*2; const chunks = []; for(let i=0;i<padded.length;i+=CHUNK_HEX_LEN) chunks.push(padded.substr(i,CHUNK_HEX_LEN)); return chunks; }
  function F7(e){ const F = e.toString(16).toUpperCase(); return F.length==1?('0'+F):F; }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  function lowLevelSend(cmd){ try{ if(typeof pt === 'function'){ pt(cmd); return; } }catch(e){}
    try{ if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){ window.bridge.bleSendCmdList(cmd); return; } }catch(e){}
    try{ if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return; } }catch(e){}
    console.warn('No native bridge available for BLE send: ', cmd);
  }
  function setStatus(msg){ try{ const el=document.getElementById('status'); if(el) el.innerText = msg; }catch(e){} console.log('[BULK]', msg); }

  // Single-shot bulk upload: open once, send all frames, then commit once.
  window.transferBulkFramesSingleShot = async function(opts){
    opts = opts || {};
    const perChunkDelay = typeof opts.perChunkDelay === 'number' ? opts.perChunkDelay : 80;
    const perFinalDelay = typeof opts.perFinalDelay === 'number' ? opts.perFinalDelay : 200;

    // fetch frames
    let frames = [];
    if(Array.isArray(window.lastFrames) && window.lastFrames.length>0) frames = window.lastFrames.slice();
    else if(window.MIS_ANIMATIONS){ const k=Object.keys(window.MIS_ANIMATIONS)[0]; if(k) frames = window.MIS_ANIMATIONS[k].slice(); }
    if(!frames || frames.length===0){ setStatus('No hay frames para enviar.'); return; }

    // pad frames to 2048 bytes
    frames = frames.map(f=>padToFrame(f));
    const numFrames = frames.length;
    const e_hex = (numFrames-1).toString(16).toUpperCase().padStart(4,'0');

    setStatus(`Bulk upload: frames=${numFrames} perChunkDelay=${perChunkDelay}ms`);

    // OPEN door once - use 8110,- as prep (matches native behavior in many places)
    lowLevelSend('8110,-');
    await sleep(150);

    for(let f=0; f<numFrames; f++){
      const F_hex = (f).toString(16).toUpperCase().padStart(4,'0');
      const chunks = buildChunksFromFrameHex(frames[f]);
      setStatus(`Bulk: enviando frame ${f+1}/${numFrames} (${chunks.length} chunks)`);
      for(let ci=0; ci<chunks.length; ci++){
        const part_hex = F7(ci); // parts 0..15
        const cmd = `810F${e_hex}${F_hex}${part_hex}${chunks[ci]},-`;
        lowLevelSend(cmd);
        await sleep(perChunkDelay);
      }
    }

    // FINAL commit/close once
    setStatus('Bulk: enviando commit final...');
    lowLevelSend('8110,-');
    await sleep(perFinalDelay);

    setStatus('Bulk upload completado. Revisa la OLED.');
  };

  // Attach send button to bulk single-shot by default
  window.addEventListener('DOMContentLoaded', ()=>{
    try{
      const sendBtn = document.getElementById('sendBtn');
      if(sendBtn){ try{ sendBtn.removeAttribute && sendBtn.removeAttribute('onclick'); }catch(e){}
        sendBtn.addEventListener('click', async (ev)=>{ ev&&ev.preventDefault&&ev.preventDefault(); try{ await window.transferBulkFramesSingleShot({perChunkDelay:80, perFinalDelay:200}); }catch(e){ console.error(e); } }, {passive:false});
      }
    }catch(e){ console.error(e); }
  });

})();


// --- FIX: single-open single-close transfer and static-image handling ---
(function(){
  if(window._single_open_fix) return; window._single_open_fix = true;

  // Config
  const FRAME_BYTES = 2048;
  const CHUNK_BYTES = 128;
  const CHUNKS_PER_FRAME = FRAME_BYTES / CHUNK_BYTES; // 16

  function cleanHex(s){ return String(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase(); }
  function padToFrame(hex){ const FRAME_HEX_LEN = FRAME_BYTES*2; const h = cleanHex(hex); if(h.length>=FRAME_HEX_LEN) return h.substr(0,FRAME_HEX_LEN); return h.padEnd(FRAME_HEX_LEN,'0'); }
  function buildChunksFromFrameHex(frameHex){ const padded = padToFrame(frameHex); const CHUNK_HEX_LEN = CHUNK_BYTES*2; const chunks = []; for(let i=0;i<padded.length;i+=CHUNK_HEX_LEN) chunks.push(padded.substr(i,CHUNK_HEX_LEN)); return chunks; }
  function F7(e){ const F = e.toString(16).toUpperCase(); return F.length==1?('0'+F):F; }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  function lowLevelSend(cmd){ try{ if(typeof pt === 'function'){ pt(cmd); return; } }catch(e){}
    try{ if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){ window.bridge.bleSendCmdList(cmd); return; } }catch(e){}
    try{ if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return; } }catch(e){}
    console.warn('No native bridge available for BLE send: ', cmd);
  }
  function setStatus(msg){ try{ const el=document.getElementById('status'); if(el) el.innerText = msg; }catch(e){} console.log('[SINGLE_OPEN]', msg); }

  // Guard to prevent nested transfers
  window._transferInProgress = window._transferInProgress || false;

  // Single-open single-close bulk transfer: opens once, sends everything, closes once.
  window.transferSingleOpenAllFrames = async function(opts){
    if(window._transferInProgress){ setStatus('Transfer ya en progreso, espera...'); return; }
    opts = opts || {};
    const perChunkDelay = typeof opts.perChunkDelay === 'number' ? opts.perChunkDelay : 80;
    const perFinalDelay = typeof opts.perFinalDelay === 'number' ? opts.perFinalDelay : 200;
    const partIndexMode = opts.partIndexMode || 'zero'; // 'zero' => 0..15, 'one' => 1..16

    let frames = [];
    if(Array.isArray(window.lastFrames) && window.lastFrames.length>0) frames = window.lastFrames.slice();
    else if(window.MIS_ANIMATIONS){ const k=Object.keys(window.MIS_ANIMATIONS)[0]; if(k) frames = window.MIS_ANIMATIONS[k].slice(); }
    if(!frames || frames.length===0){ setStatus('No hay frames para enviar.'); return; }

    frames = frames.map(f=>padToFrame(f));
    const numFrames = frames.length;
    const e_hex = (numFrames-1).toString(16).toUpperCase().padStart(4,'0');

    try{
      window._transferInProgress = true;
      setStatus(`Inicio transferencia: frames=${numFrames} chunksPerFrame=${CHUNKS_PER_FRAME} mode=${partIndexMode}`);

      // OPEN once
      lowLevelSend('8110,-');
      await sleep(150);

      for(let f=0; f<numFrames; f++){
        const F_hex = (f).toString(16).toUpperCase().padStart(4,'0');
        const chunks = buildChunksFromFrameHex(frames[f]);
        setStatus(`Enviando frame ${f+1}/${numFrames} (${chunks.length} chunks)`);

        for(let ci=0; ci<chunks.length; ci++){
          const part_val = (partIndexMode === 'one') ? (ci+1) : ci;
          const part_hex = F7(part_val);
          const cmd = `810F${e_hex}${F_hex}${part_hex}${chunks[ci]},-`;
          lowLevelSend(cmd);
          await sleep(perChunkDelay);
        }

        // no per-frame commit
      }

      // FINAL commit/close once
      setStatus('Enviando commit final...');
      lowLevelSend('8110,-');
      await sleep(perFinalDelay);

      setStatus('Transfer completado.');
    }catch(err){ console.error('transfer error',err); setStatus('Error: '+(err&&err.message)); }
    finally{ window._transferInProgress = false; }
  };

  // Ensure sendBtn only binds to the single-open transfer and remove other onclick handlers
  window.addEventListener('DOMContentLoaded', ()=>{
    try{
      const sendBtn = document.getElementById('sendBtn');
      if(sendBtn){
        // remove inline handlers if present
        try{ sendBtn.onclick = null; }catch(e){}
        // remove other listeners by cloning
        const newBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newBtn, sendBtn);
        newBtn.addEventListener('click', async (ev)=>{ ev&&ev.preventDefault&&ev.preventDefault(); try{ await window.transferSingleOpenAllFrames({perChunkDelay:80, perFinalDelay:200, partIndexMode:'zero'}); }catch(e){ console.error(e); } }, {passive:false});
      }
    }catch(e){ console.error(e); }
  });

})();


// --- 



// ===== PATCH: LOGICA DE BOTONES, 1L/2L/3L Y RESET DESPUÉS DE ENVIAR =====
(function(){
  const WOLF_NAME = 'wolfchan_mexa';
  const BANG_NAME = 'bangchan_an01';
  const RESET_DELAY = 500;

  async function triggerReset() {
    return new Promise(resolve => {
      if (typeof window.resetDevice === 'function') {
        window.resetDevice();
      } else {
        const btn = document.querySelector('button[onclick*="resetDevice"]') || [...document.querySelectorAll('button')].find(b => b.innerText.includes('🔁'));
        if (btn) btn.click();
      }
      setTimeout(resolve, RESET_DELAY);
    });
  }

  async function handleSendGlobal() {
    // El boton original de enviar suele llamar a transferOled o transferCurrentAnimation.
    // Primero nos aseguramos de que el texto actual esté "aplicado" al canvas/preview.
    if (typeof window.applyText === 'function') {
      window.applyText(); 
    }

    // Ahora enviamos
    if (typeof window.transferOled === 'function') {
      await window.transferOled();
    } else if (typeof window.transferCurrentAnimation === 'function') {
      await window.transferCurrentAnimation(8, 150);
    }

    // Finalmente el RESET implicito despues de enviar
    await triggerReset();
  }

  async function handleSendDesign(name) {
    if (typeof getFramesForDesign !== 'function') return;
    const frames = getFramesForDesign(name);
    if (!frames || !frames.length) return;

    if (typeof window.transferAnimationFull === 'function') {
      await window.transferAnimationFull(frames.slice(), 8, 150);
    } else if (typeof window.transferCurrentAnimation === 'function') {
      if (window.loadDesign) window.loadDesign(name, 'standard');
      await window.transferCurrentAnimation(8, 150);
    }

    await triggerReset();
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Vinculamos nuestros botones
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
      // Reemplazamos el listener original o agregamos el nuestro
      sendBtn.onclick = null; // Limpiar si tenia inline
      sendBtn.addEventListener('click', (e) => { e.preventDefault(); handleSendGlobal(); });
    }

    const showWolf = document.getElementById('showWolfchanBtn');
    const showBang = document.getElementById('showBangchanBtn');
    const sendWolf = document.getElementById('sendWolfchanBtn');
    const sendBang = document.getElementById('sendBangchanBtn');
    const recon = document.getElementById('reconnectBtn');

    if (showWolf) showWolf.addEventListener('click', () => window.loadDesign && window.loadDesign(WOLF_NAME, 'standard'));
    if (showBang) showBang.addEventListener('click', () => window.loadDesign && window.loadDesign(BANG_NAME, 'standard'));
    if (sendWolf) sendWolf.addEventListener('click', () => handleSendDesign(WOLF_NAME));
    if (sendBang) sendBang.addEventListener('click', () => handleSendDesign(BANG_NAME));
    if (recon) recon.addEventListener('click', () => window.initBT && window.initBT());
  });
})();


// ===== CLEAN PATCH: styled buttons + text/emoji send + implicit reset after send =====
(function(){
  const WOLF_NAME = 'wolfchan_mexa';
  const BANG_NAME = 'bangchan_an01';
  const RESET_DELAY_MS = 500;

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  function resetAfterSend() {
    try {
      if (typeof window.resetDevice === 'function') {
        window.resetDevice();
      }
    } catch (e) {
      console.warn('resetDevice failed', e);
    }
  }

  function getResetButtonLike() {
    return document.querySelector('button[onclick*="resetDevice"]')
      || document.querySelector('button[title="Reiniciar"]')
      || [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes('🔁'))
      || null;
  }

  // Ensure our handlers win over previous listeners from older patches
  function replaceButton(btn) {
    if (!btn || !btn.parentNode) return btn;
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    return clone;
  }

  async function sendCurrentCanvasAndReset() {
    try {
      // Solo auto-aplicar texto si no hay un emoji/dibujo/diseño ya cargado en canvas.
      if (lastCanvasSource === 'clear' && typeof window.applyText === 'function') {
        try { window.applyText(); } catch (e) { console.warn('applyText failed', e); }
      }

      if (typeof window.transferOled === 'function') {
        await window.transferOled();
      } else if (typeof window.transferSingleOpenAllFrames === 'function') {
        await window.transferSingleOpenAllFrames({ perChunkDelay: 80, perFinalDelay: 200, partIndexMode: 'zero' });
      } else if (typeof window.transferCurrentAnimation === 'function') {
        await window.transferCurrentAnimation(80, 80);
      }

      await wait(RESET_DELAY_MS);
      resetAfterSend();
    } catch (e) {
      console.error('sendCurrentCanvasAndReset error', e);
      await wait(RESET_DELAY_MS);
      resetAfterSend();
    }
  }

  async function sendDesignAndReset(name) {
    try {
      if (typeof window.loadDesign === 'function') {
        window.loadDesign(name, 'standard');
        await wait(200);
      }

      if (typeof window.transferSingleOpenAllFrames === 'function') {
        await window.transferSingleOpenAllFrames({ perChunkDelay: 80, perFinalDelay: 200, partIndexMode: 'zero' });
      } else if (typeof window.transferAnimationFull === 'function') {
        const frames = typeof getFramesForDesign === 'function' ? getFramesForDesign(name) : null;
        if (frames && frames.length) {
          await window.transferAnimationFull(frames.slice(), 8, 150);
        }
      } else if (typeof window.transferCurrentAnimation === 'function') {
        await window.transferCurrentAnimation(80, 80);
      }

      await wait(RESET_DELAY_MS);
      resetAfterSend();
    } catch (e) {
      console.error('sendDesignAndReset error', e);
      await wait(RESET_DELAY_MS);
      resetAfterSend();
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    try {
      // Kill older send-button listeners by cloning the button once.
      const sendBtn = replaceButton(document.getElementById('sendBtn'));
      const reconnectBtn = replaceButton(document.getElementById('reconnectBtn'));

      const showWolf = document.getElementById('showWolfchanBtn');
      const showBang = document.getElementById('showBangchanBtn');
      const sendWolf = document.getElementById('sendWolfchanBtn');
      const sendBang = document.getElementById('sendBangchanBtn');

      if (sendBtn) {
        sendBtn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          await sendCurrentCanvasAndReset();
        }, { passive: false });
      }

      if (reconnectBtn) {
        reconnectBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (typeof window.initBT === 'function') window.initBT();
        }, { passive: false });
      }

      if (showWolf) showWolf.addEventListener('click', () => { if (typeof window.loadDesign === 'function') window.loadDesign(WOLF_NAME, 'standard'); });
      if (showBang) showBang.addEventListener('click', () => { if (typeof window.loadDesign === 'function') window.loadDesign(BANG_NAME, 'standard'); });
      if (sendWolf) sendWolf.addEventListener('click', async () => { await sendDesignAndReset(WOLF_NAME); });
      if (sendBang) sendBang.addEventListener('click', async () => { await sendDesignAndReset(BANG_NAME); });

      // If the reset button itself is used manually, let it work normally.
      const resetBtn = getResetButtonLike();
      if (resetBtn && !resetBtn.dataset.boundKeepReset) {
        resetBtn.dataset.boundKeepReset = '1';
      }
    } catch (e) {
      console.error('clean patch init failed', e);
    }
  });
})();
