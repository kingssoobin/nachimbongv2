/* Nachimbong OLED Studio - app.js
 * Reescrito con protocolo nativo descubierto por ingeniería inversa.
 * Protocolo: AES-ECB + chunks ["810F"+count+idx+part+data] via window.bridge
 */

/* ======================= AES-128-ECB (pure JS) ======================= */
const AES = (function(){
  const S = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
  ];
  const rcon = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
  function subBytes(s){ for(let i=0;i<16;i++) s[i]=S[s[i]]; }
  function shiftRows(s){
    let t;
    t=s[1];s[1]=s[5];s[5]=s[9];s[9]=s[13];s[13]=t;
    t=s[2];s[2]=s[10];s[10]=t;t=s[6];s[6]=s[14];s[14]=t;
    t=s[15];s[15]=s[11];s[11]=s[7];s[7]=s[3];s[3]=t;
  }
  function gmul(a,b){ let p=0; for(let i=0;i<8;i++){ if(b&1) p^=a; let hi=a&0x80; a<<=1; if(hi) a^=0x1b; b>>=1; } return p&0xff; }
  function mixColumns(s){
    for(let i=0;i<4;i++){
      let a=s[i],b=s[i+4],c=s[i+8],d=s[i+12];
      s[i]    = gmul(a,2)^gmul(b,3)^c^d;
      s[i+4]  = a^gmul(b,2)^gmul(c,3)^d;
      s[i+8]  = a^b^gmul(c,2)^gmul(d,3);
      s[i+12] = gmul(a,3)^b^c^gmul(d,2);
    }
  }
  function addRoundKey(s,w,r){ for(let i=0;i<16;i++) s[i]^=w[r*16+i]; }
  function expandKey(key){
    let w=new Array(176),t=new Array(4);
    for(let i=0;i<16;i++) w[i]=key[i];
    for(let i=16;i<176;i+=4){
      for(let j=0;j<4;j++) t[j]=w[i-4+j];
      if(i%16===0){
        let x=t[0]; t[0]=S[t[1]]^rcon[i/16-1]; t[1]=S[t[2]]; t[2]=S[t[3]]; t[3]=S[x];
      }
      for(let j=0;j<4;j++) w[i+j]=w[i+j-16]^t[j];
    }
    return w;
  }
  function cipher(input,w){
    let s=input.slice(),nr=10;
    addRoundKey(s,w,0);
    for(let r=1;r<nr;r++){ subBytes(s); shiftRows(s); mixColumns(s); addRoundKey(s,w,r); }
    subBytes(s); shiftRows(s); addRoundKey(s,w,nr);
    return s;
  }
  function encrypt16(key16,block16){
    return cipher(block16,expandKey(key16));
  }
  return { encrypt16 };
})();

/* ======================= Utilidades protocolo ======================= */
const AES_KEY_HEX = '2174516473A1F5351004A13E6B716AB9';
const HANDSHAKE_HEX = 'ed3823c3d92e1b9d69000194db6c5244';

function hexToBytes(hex){
  const bytes=[];
  for(let i=0;i<hex.length;i+=2) bytes.push(parseInt(hex.substr(i,2),16));
  return new Uint8Array(bytes);
}
function bytesToHex(bytes){
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function pad16(bytes){
  const out=new Uint8Array(Math.ceil(bytes.length/16)*16);
  out.set(bytes);
  return out;
}
function aesEcbEncrypt(hexData,keyHex){
  const key=hexToBytes(keyHex);
  const data=hexToBytes(hexData);
  const padded=pad16(data);
  const out=new Uint8Array(padded.length);
  for(let i=0;i<padded.length;i+=16){
    const block=padded.slice(i,i+16);
    const enc=AES.encrypt16(Array.from(key),Array.from(block));
    out.set(enc,i);
  }
  return bytesToHex(out);
}

/* Formato chunk nativo: ["810F" + totalFrames(4) + frameIdx(4) + partIdx(2) + data] */
function buildNativeChunk(totalFrames, frameIdx, partIdx, dataHex128){
  const tf = totalFrames.toString(16).padStart(4,'0');
  const fi = frameIdx.toString(16).padStart(4,'0');
  const pi = partIdx.toString(16).padStart(2,'0');
  return '810F' + tf + fi + pi + dataHex128;
}

/* ======================= Estado global ======================= */
const state = {
  frames: [],      // array de ImageData
  raw: [],         // array de Uint8Array (OLED bytes)
  oledW: 64,
  oledH: 32,
  animTimer: null,
  bleDev: null,
  bleGatt: null,
  bleChr: null,
  useNative: false,
  nativeConnected: false,
  lastExportHex: '',
  transferLog: [],
};

/* ======================= Helpers UI ======================= */
const $ = id => document.getElementById(id);
function status(id,msg,err=false){ const el=$(id); if(!el)return; el.textContent=msg; el.className='status '+(err?'err':'ok'); }
function toArrBuf(hex){
  const b=hexToBytes(hex);
  return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
}

/* ======================= Conversión OLED ======================= */
function extractFramesFromGif(buf,cb){
  if(typeof gifuct!==undefined){
    const gr=gifuct.parseGIF(buf);
    const frames=gifuct.decompressFrames(gr,true);
    const out=[];
    const c=document.createElement('canvas'),x=c.getContext('2d');
    frames.forEach(f=>{
      c.width=f.dims.width; c.height=f.dims.height;
      const id=x.createImageData(f.dims.width,f.dims.height);
      id.data.set(f.patch);
      x.putImageData(id,0,0);
      out.push(c);
    });
    cb(out);
  } else { cb([]); }
}

function getLuma(r,g,b){ return 0.299*r+0.587*g+0.114*b; }

function imageToFrames(img, cfg){
  const W=state.oledW, H=state.oledH, count=+cfg.frameCount;
  const c=document.createElement('canvas');
  c.width=W; c.height=H;
  const x=c.getContext('2d');
  if(!cfg.frames||cfg.frames.length===0){
    for(let i=0;i<count;i++){
      drawFrame(img,x,W,H,cfg);
      state.frames.push(x.getImageData(0,0,W,H));
    }
  } else {
    cfg.frames.forEach(src=>{
      drawFrame(src,x,W,H,cfg);
      state.frames.push(x.getImageData(0,0,W,H));
    });
  }
}

function drawFrame(src,ctx,W,H,cfg){
  ctx.save();
  ctx.translate(W/2,H/2);
  ctx.rotate(cfg.rotate*Math.PI/180);
  if(cfg.flipH) ctx.scale(-1,1);
  if(cfg.flipV) ctx.scale(1,-1);
  let sx=0,sy=0,sw=src.width||src.videoWidth||src.naturalWidth||src.width,sh=src.height||src.videoHeight||src.naturalHeight||src.height;
  let ratio;
  if(cfg.fit==='contain'){ ratio=Math.min(W/sw,H/sh); }
  else if(cfg.fit==='cover'){ ratio=Math.max(W/sw,H/sh); }
  else { ratio=1; }
  const dw=sw*ratio,dh=sh*ratio;
  ctx.drawImage(src,-dw/2,-dh/2,dw,dh);
  ctx.restore();
  if(cfg.invert){
    const d=ctx.getImageData(0,0,W,H);
    for(let i=0;i<d.data.length;i+=4){ d.data[i]=255-d.data[i]; d.data[i+1]=255-d.data[i+1]; d.data[i+2]=255-d.data[i+2]; }
    ctx.putImageData(d,0,0);
  }
}

function binarize(frameData,cfg){
  const W=state.oledW, H=state.oledH;
  const d=frameData.data;
  const gs=new Float32Array(W*H);
  for(let i=0;i<W*H;i++){
    let lum=getLuma(d[i*4],d[i*4+1],d[i*4+2]);
    lum = ((lum-128)*(100+cfg.contrast)/100)+128+cfg.brightness;
    gs[i]=Math.max(0,Math.min(255,lum));
  }
  const out=new Uint8Array(W*H/8);
  if(cfg.dither==='threshold'||cfg.dither==='bayer'){
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        let thr=cfg.threshold;
        if(cfg.dither==='bayer') thr += (Bayer4x4[y%4][x%4]/16-0.5)*cfg.threshold*0.5;
        setPixel(out,x,y,gs[y*W+x]<thr?0:1);
      }
    }
  } else if(cfg.dither==='floyd'){
    const buf=new Float32Array(gs);
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=y*W+x, old=buf[i], nw=old<cfg.threshold?0:255, err=old-nw;
        buf[i]=nw;
        if(x+1<W) buf[i+1]+=err*7/16;
        if(x-1>=0&&y+1<H) buf[i+W-1]+=err*3/16;
        if(y+1<H) buf[i+W]+=err*5/16;
        if(x+1<W&&y+1<H) buf[i+W+1]+=err*1/16;
      }
    }
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) setPixel(out,x,y,buf[y*W+x]<cfg.threshold?0:1);
  } else if(cfg.dither==='atkinson'){
    const buf=new Float32Array(gs);
    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=y*W+x, old=buf[i], nw=old<cfg.threshold?0:255, err=(old-nw)/8;
        buf[i]=nw;
        const d=[1,2,W-1,W,W+1];
        d.forEach(o=>{ if(i+o>=0&&i+o<buf.length) buf[i+o]+=err; });
      }
    }
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) setPixel(out,x,y,buf[y*W+x]<cfg.threshold?0:1);
  }
  return out;
}
const Bayer4x4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
function setPixel(buf,x,y,on){ const page=y>>3, bit=y&7; if(on) buf[page*state.oledW+x] |= (1<<bit); else buf[page*state.oledW+x] &= ~(1<<bit); }

function generateRaw(cfg){ state.raw=state.frames.map(f=>binarize(f,cfg)); }

function rawToHex(raw){ return Array.from(raw).map(b=>b.toString(16).padStart(2,'0')).join(''); }
function hexToRaw(hex){ const b=hexToBytes(hex); return b; }

/* ======================= Exportación ======================= */
function buildExport(format,order){
  if(!state.raw.length){ status('output','Genera primero en Previsualizar',true); return ''; }
  const frames=state.raw.map(raw=>{
    if(order==='page-msb') return Array.from(raw).map(b=>rev8(b));
    if(order==='row-msb') return xbmFromRaw(raw);
    return Array.from(raw);
  });
  let out='';
  if(format==='hex') out = frames.map(f=>f.map(b=>b.toString(16).padStart(2,'0')).join('')).join('\n');
  else if(format==='bin') out = new Uint8Array(frames.flat());
  else if(format==='c') out = frames.map((f,i)=>'const uint8_t frame_'+i+'[] PROGMEM = {\n  '+chunk(Array.from(f).map(b=>'0x'+b.toString(16).padStart(2,'0')),12).join(',\n  ')+'\n};').join('\n\n');
  else if(format==='json') out = JSON.stringify({w:state.oledW,h:state.oledH,frameCount:frames.length,frames:frames.map(f=>Array.from(f))},null,2);
  else if(format==='u8g2') out = frames.map((f,i)=>'static const unsigned char frame_'+i+'[] U8X8_PROGMEM = {\n  '+chunk(Array.from(f).map(b=>'0x'+b.toString(16).padStart(2,'0')),12).join(',\n  ')+'\n};').join('\n\n');
  state.lastExportHex = frames.map(f=>f.map(b=>b.toString(16).padStart(2,'0')).join('')).join('');
  return out;
}
function rev8(b){ let r=0; for(let i=0;i<8;i++) if(b&(1<<i)) r|=(1<<(7-i)); return r; }
function xbmFromRaw(raw){ const W=state.oledH; const out=[]; for(let y=0;y<state.oledH;y++) for(let xByte=0;xByte<state.oledW/8;xByte++){ let b=0; for(let x=0;x<8;x++) if(getPixel(raw,xByte*8+x,y)) b|=(1<<x); out.push(b); } return out; }
function getPixel(raw,x,y){ const page=y>>3, bit=y&7; return (raw[page*state.oledW+x]>>bit)&1; }
function chunk(arr,n){ const out=[]; for(let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n).join(',')); return out; }

/* ======================= Previsualización ======================= */
function renderPreview(zoom=8){
  const c=$('previewCanvas'), x=c.getContext('2d');
  const W=state.oledW, H=state.oledH;
  c.width=W*zoom; c.height=H*zoom;
  const idx=+$('frameSlider').value;
  const raw=state.raw[idx];
  if(!raw) return;
  for(let y=0;y<H;y++){
    for(let x=0;x<W;x++){
      x.fillStyle = getPixel(raw,x,y) ? '#0f0' : '#000';
      x.fillRect(x*zoom,y*zoom,zoom,zoom);
    }
  }
  x.strokeStyle='#333'; x.lineWidth=1;
  for(let i=0;i<=W;i++){ x.beginPath(); x.moveTo(i*zoom,0); x.lineTo(i*zoom,H*zoom); x.stroke(); }
  for(let i=0;i<=H;i++){ x.beginPath(); x.moveTo(0,i*zoom); x.lineTo(W*zoom,i*zoom); x.stroke(); }
}

/* ======================= Tabs ======================= */
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(a=>a.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    t.classList.add('active');
    $(t.dataset.tab).classList.add('active');
  });
});

/* ======================= Event listeners UI ======================= */
$('fileInput').addEventListener('change',e=>handleFiles(e.target.files));
const dz=$('dropzone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');handleFiles(e.dataTransfer.files);});
dz.addEventListener('click',()=>$('fileInput').click());
dz.addEventListener('paste',e=>{
  const items=e.clipboardData.items;
  for(let i=0;i<items.length;i++) if(items[i].type.indexOf('image')!==-1){ const f=items[i].getAsFile(); handleFiles([f]); break; }
});

$('oledSize').addEventListener('change',e=>{
  const [w,h]=e.target.value.split('x').map(Number);
  state.oledW=w; state.oledH=h;
  $('resLabel').textContent=w+'×'+h;
});

function handleFiles(files){
  if(!files.length) return;
  const f=files[0];
  status('importStatus','Cargando...');
  const reader=new FileReader();
  reader.onload=ev=>{
    const buf=ev.target.result;
    if(f.type==='image/gif'){
      extractFramesFromGif(buf,imgs=>{
        if(!imgs.length){ status('importStatus','No se pudieron extraer frames del GIF',true); return; }
        state.frames=[]; state.raw=[];
        imageToFrames(imgs[0],buildCfg({frames:imgs}));
        status('importStatus','GIF cargado: '+state.frames.length+' frames');
        updatePreviewControls();
      });
    } else {
      const img=new Image();
      img.onload=()=>{
        state.frames=[]; state.raw=[];
        imageToFrames(img,buildCfg());
        status('importStatus','Imagen cargada');
        updatePreviewControls();
      };
      img.src=URL.createObjectURL(f);
    }
  };
  reader.readAsArrayBuffer(f);
}

function buildCfg(extra){
  return Object.assign({
    frameCount:+$('frameCount').value,
    fit:$('fitMode').value,
    rotate:+$('rotate').value,
    invert:$('invert').checked,
    flipH:$('flipH').checked,
    flipV:$('flipV').checked,
    dither:$('dither').value,
    brightness:+$('brightness').value,
    contrast:+$('contrast').value,
    threshold:+$('threshold').value,
  },extra||{});
}

function updatePreviewControls(){
  $('frameSlider').max=state.frames.length-1;
  $('frameLabel').textContent='0 / '+(state.frames.length-1);
  generateRaw(buildCfg());
  renderPreview(+$('zoom').value);
}

[$('brightness'),$('contrast'),$('threshold')].forEach(el=>{
  el.addEventListener('input',()=>{
    $('brightnessVal').textContent=$('brightness').value;
    $('contrastVal').textContent=$('contrast').value;
    $('thresholdVal').textContent=$('threshold').value;
    generateRaw(buildCfg()); renderPreview(+$('zoom').value);
  });
});
[$('fitMode'),$('rotate'),$('invert'),$('flipH'),$('flipV'),$('dither'),$('frameCount'),$('oledSize')].forEach(el=>{
  el.addEventListener('change',()=>{ if(state.frames.length){ state.frames=[]; state.raw=[]; handleFiles([$('fileInput').files[0]]); } });
});

$('zoom').addEventListener('input',()=>renderPreview(+$('zoom').value));
$('frameSlider').addEventListener('input',()=>{ $('frameLabel').textContent=$('frameSlider').value+' / '+(state.frames.length-1); renderPreview(+$('zoom').value); });

$('playBtn').addEventListener('click',()=>{
  if(state.animTimer) clearInterval(state.animTimer);
  state.animTimer=setInterval(()=>{
    let v=+$('frameSlider').value+1;
    if(v>state.frames.length-1) v=0;
    $('frameSlider').value=v;
    $('frameLabel').textContent=v+' / '+(state.frames.length-1);
    renderPreview(+$('zoom').value);
  },1000/+$('fps').value);
});
$('stopBtn').addEventListener('click',()=>{ if(state.animTimer){ clearInterval(state.animTimer); state.animTimer=null; } });

$('genBtn').addEventListener('click',()=>{
  if(!state.raw.length){ status('output','Primero importa y previsualiza',true); return; }
  const out=buildExport($('exportFormat').value,$('bitOrder').value);
  if(typeof out==='string') $('output').textContent=out;
  else { $('output').textContent='[Datos binarios listos para descargar]'; }
});

$('dlBtn').addEventListener('click',()=>{
  if(!state.lastExportHex){ status('output','Genera datos primero',true); return; }
  const fmt=$('exportFormat').value;
  const blob = fmt==='bin' ? new Blob([hexToBytes(state.lastExportHex)]) : new Blob([$('output').textContent],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download = fmt==='bin' ? 'nachimbong.bin' : 'nachimbong.txt';
  a.click();
});

$('copyBtn').addEventListener('click',()=>{
  if(!$('output').textContent){ status('output','Nada que copiar',true); return; }
  navigator.clipboard.writeText($('output').textContent).then(()=>status('output','Copiado al portapapeles'));
});

/* ======================= Protocolo Nativo / Bridge ======================= */
function detectNative(){
  state.useNative = !!(window.bridge && typeof window.bridge.bleSendCmdList==='function');
  const el=$('bridgeStatus');
  if(state.useNative){ el.textContent='✅ APK Nativo detectado (window.bridge activo)'; el.className='status ok'; }
  else { el.textContent='⚠️ Modo navegador (Web Bluetooth fallback)'; el.className='status err'; }
  return state.useNative;
}
detectNative();

/* pt() exacto del APK: convierte hex string a bytes y manda via bridge */
function pt(hexStr){
  if(!state.useNative) throw new Error('Bridge no disponible');
  const bytes = hexToBytes(hexStr);
  window.bridge.bleSendCmdList(bytes);
  logTransfer('TX(native): '+hexStr.slice(0,64)+(hexStr.length>64?'...':'')+' ('+bytes.length+' bytes)');
}

/* Handshake nativo */
function nativeHandshake(){ pt(HANDSHAKE_HEX); }

/* Esperar ACK nativo con timeout */
function waitNativeACK(timeoutMs=5000){
  return new Promise((resolve,reject)=>{
    if(!state.useNative){ reject(new Error('No native bridge')); return; }
    const t0=Date.now();
    const iv=setInterval(()=>{
      let status='';
      try{ status=window.bridge.bleGetUpdateStatus(); }catch(e){}
      if(status && status!==''){ clearInterval(iv); resolve(status); }
      if(Date.now()-t0>timeoutMs){ clearInterval(iv); reject(new Error('Timeout esperando ACK nativo')); }
    },200);
  });
}

/* Enviar un frame dividido en 16 chunks de 128 bytes hex (256 chars) */
async function sendFrameNative(frameIdx, totalFrames, rawBytes){
  // El frame OLED son 256 bytes. Los dividimos en 2 partes de 128 bytes.
  // PERO el protocolo nativo espera 16 partes por frame según el minificado.
  // Para un frame de 256 bytes, podemos hacer 2 partes reales + 14 vacías
  // o duplicar/rellenar. Aquí usamos el formato exacto descubierto:
  // 16 partes por frame, cada una 128 bytes hex = 256 chars hex.

  const rawHex = bytesToHex(rawBytes); // 512 chars para 256 bytes

  // Rellenamos a 16 partes de 128 bytes (256 hex chars) cada una
  // 16 * 128 bytes = 2048 bytes por frame (el protocolo del APK)
  // Para nuestros 256 bytes reales, replicamos o padding
  const fullData = rawHex.padEnd(16*256,'0'); // 4096 hex chars = 2048 bytes

  for(let part=0; part<16; part++){
    const partHex = fullData.substr(part*256, 256); // 256 hex chars = 128 bytes
    const chunk = buildNativeChunk(totalFrames, frameIdx, part, partHex);
    pt(chunk);

    // Esperar ACK cada 4 chunks o al final del frame (ajustable)
    if(part===15 || (part+1)%4===0){
      try{ await waitNativeACK(3000); logTransfer('ACK recibido frame '+frameIdx+' part '+part); }
      catch(e){ logTransfer('Sin ACK (continuando): '+e.message); }
    }
    await sleep(50); // Pausa entre chunks
  }
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function logTransfer(msg){
  state.transferLog.push('['+new Date().toLocaleTimeString()+'] '+msg);
  console.log('[Nachimbong]',msg);
}

/* ======================= Web Bluetooth (fallback) ======================= */
async function connectWebBluetooth(){
  if(!navigator.bluetooth){ throw new Error('Web Bluetooth no soportado en este navegador'); }
  const svc=$('svcUuid').value;
  const chr=$('chrUuid').value;
  status('bleStatus','Solicitando dispositivo...');
  const dev=await navigator.bluetooth.requestDevice({
    acceptAllDevices:true,
    optionalServices:[svc]
  });
  status('bleStatus','Conectando GATT...');
  const gatt=await dev.gatt.connect();
  status('bleStatus','Obteniendo servicio '+svc.slice(0,8)+'...');
  const service=await gatt.getPrimaryService(svc);
  const characteristic=await service.getCharacteristic(chr);
  state.bleDev=dev; state.bleGatt=gatt; state.bleChr=characteristic;
  status('bleStatus','✅ Conectado a '+dev.name);
  dev.addEventListener('gattserverdisconnected',()=>{
    state.bleGatt=null; state.bleChr=null;
    status('bleStatus','Desconectado',true);
  });
}

async function sendWebBluetooth(hexData){
  if(!state.bleChr) throw new Error('No conectado');
  const bytes=hexToBytes(hexData);
  const chunkSize=+$('chunkSize').value;
  for(let i=0;i<bytes.length;i+=chunkSize){
    const chunk=bytes.slice(i,i+chunkSize);
    await state.bleChr.writeValue(chunk);
    await sleep(30);
  }
}

/* ======================= Enviar (orquestador) ======================= */
$('connectBtn').addEventListener('click',async()=>{
  state.transferLog=[];
  if(detectNative()){
    // En modo nativo, el "conectar" solo intenta pairing si no está emparejado
    // pero sabemos que blePairingStart() del APK modificado está roto.
    // Mejor emparejar desde Ajustes de Android y aquí solo verificar.
    try{
      logTransfer('Modo nativo. Intentando handshake...');
      nativeHandshake();
      logTransfer('Handshake enviado. Si el lightstick está emparejado, debería responder.');
      status('bleStatus','✅ Handshake enviado via bridge. Si no responde, empareja desde Ajustes>Bluetooth de Android primero.');
    }catch(e){ status('bleStatus','Error: '+e.message,true); }
  } else {
    try{ await connectWebBluetooth(); }catch(e){ status('bleStatus','Error: '+e.message,true); }
  }
});

$('sendBtn').addEventListener('click',async()=>{
  state.transferLog=[];
  if(!state.raw.length){ status('bleStatus','Primero importa y genera frames',true); return; }

  const totalFrames = state.raw.length;
  logTransfer('Iniciando transferencia de '+totalFrames+' frames...');

  if(state.useNative){
    // Modo APK nativo (bridge)
    try{
      // Handshake inicial
      logTransfer('Handshake AES...');
      nativeHandshake();
      await sleep(500);

      // Enviar frames
      for(let f=0; f<totalFrames; f++){
        logTransfer('Enviando frame '+f+'/'+totalFrames+'...');
        await sendFrameNative(f, totalFrames, state.raw[f]);
        logTransfer('Frame '+f+' enviado.');
        await sleep(200);
      }

      logTransfer('✅ Transferencia nativa completada');
      status('bleStatus','✅ Enviado via APK nativo');
    }catch(e){ logTransfer('ERROR: '+e.message); status('bleStatus','Error: '+e.message,true); }
  } else {
    // Modo Web Bluetooth
    try{
      if(!state.bleChr){ status('bleStatus','Conecta primero',true); return; }
      for(let f=0; f<totalFrames; f++){
        const hex=rawToHex(state.raw[f]);
        status('bleStatus','Enviando frame '+(f+1)+'/'+totalFrames);
        await sendWebBluetooth(hex);
      }
      status('bleStatus','✅ Enviado via Web Bluetooth');
    }catch(e){ status('bleStatus','Error: '+e.message,true); }
  }
});

/* ======================= Inicialización ======================= */
// Auto-detectar si estamos dentro del APK nativo al cargar
window.addEventListener('load',()=>{
  detectNative();
  if(state.useNative){
    // Sobrescribir NativeInterface si el APK lo soporta para logs
    if(!window.NativeInterface) window.NativeInterface={};
    const orig = window.NativeInterface.bleGetUpdateStatus;
    window.NativeInterface.bleGetUpdateStatus = function(v){
      logTransfer('NativeInterface.bleGetUpdateStatus: '+JSON.stringify(v));
      if(typeof orig==='function') orig(v);
    };
  }
});

console.log('Nachimbong OLED Studio cargado. Protocolo nativo implementado.');
