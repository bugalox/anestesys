// CLOCK
// ═══════════════════════════════════════════════
function fmt(ms){const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function fmt2(ms){
  if(ms < 0) return '--:--';  // fase del día anterior — no mostrar negativo
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
  return String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m';
}

// ═══════════════════════════════════════════════
// DEBOUNCED AUTOSAVE — for liquid inputs
// ═══════════════════════════════════════════════
var _saveDebounce = null;
function debounceSave() {
  clearTimeout(_saveDebounce);
  _saveDebounce = setTimeout(function() {
    var _liq=['in-nacl','in-hart','in-col','in-pg','in-med','in-otro',
      'eg-ins','eg-bas','eg-diu','eg-sang','eg-trau','eg-otro'].some(function(id){
        var e=document.getElementById(id);return e&&parseInt(e.value)>0;
      });
    // FIX SAVE-3: incluir ventHist y liqHora en la condición
    if(!S._readOnly&&(S.pac.nombre||S.history.length||S.farms.length||S.ventHist.length||S.liqHora.length||_liq)){
      try{autoSave();}catch(e){}
    }
  }, 1200); // FIX SAVE-1: 3000→1200ms (guarda antes de cerrar app)
}


// ═══════════════════════════════════════════════
// WAKE LOCK — evitar que la pantalla se apague
// durante el procedimiento
// ═══════════════════════════════════════════════
var _wakeLock = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', function() { _wakeLock = null; });
    } catch(e) { /* No soportado o denegado */ }
  }
}

function releaseWakeLock() {
  if(_wakeLock) { try { _wakeLock.release(); _wakeLock = null; } catch(e) {} }
}

// Solicitar wakeLock cuando empieza anestesia, liberar al finalizar
document.addEventListener('visibilitychange', function() {
  if(document.visibilityState === 'visible' && S.phases.an && S._frozenTan == null) {
    requestWakeLock();
  }
  // FIX SAVE-4: guardar al salir (pantalla off / cambio de app)
  if(document.visibilityState === 'hidden') {
    try {
      if(!S._readOnly&&(S.pac.nombre||S.history.length||S.farms.length||S.ventHist.length||S.liqHora.length))
        autoSave();
    } catch(e) {}
  }
});
// FIX SAVE-4b: pagehide — iOS Safari PWA no dispara beforeunload
window.addEventListener('pagehide', function() {
  try {
    if(!S._readOnly&&(S.pac.nombre||S.history.length||S.farms.length||S.ventHist.length||S.liqHora.length))
      autoSave();
  } catch(e) {}
});


function tick() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('es-MX',{hour12:false});

  // ── ANESTESIA ──
  if(S.phases.an) {
    if(S._frozenTan != null) {
      // Finalizada — mostrar tiempo congelado
      document.getElementById('st-tan').textContent = fmt2(S._frozenTan);
      document.getElementById('dur-an').textContent  = fmt2(S._frozenTan);
    } else {
      // Corriendo
      const ms  = now - S.phases.an;
      const el  = Math.floor(ms / 1000);
      document.getElementById('st-tan').textContent = fmt2(ms);
      document.getElementById('dur-an').textContent  = fmt2(ms);
      // Alarma horaria (solo si anestesia activa)
      const nx = Math.ceil((el+1)/3600)*3600 - el;
      const ts = String(Math.floor(nx/60)).padStart(2,'0') + ':' + String(nx%60).padStart(2,'0');
      document.getElementById('st-alarm').textContent  = ts;
      document.getElementById('alarm-big').textContent = ts;
      const hr = Math.floor(el/3600);
      // FIX #3: Ventana exacta de 1 segundo (era <3 → podía disparar 3 veces por hora)
      if(el>0 && el%3600===0 && !S.hrAlarms.includes(hr) && hr>0) { S.hrAlarms.push(hr); fireHrAlarm(hr); }
    }
  }

  // ── CIRUGÍA ──
  if(S.phases.cx) {
    if(S._frozenTcx != null) {
      // Finalizada — mostrar tiempo congelado
      document.getElementById('st-tcx').textContent = fmt2(S._frozenTcx);
      document.getElementById('dur-cx').textContent  = fmt2(S._frozenTcx);
    } else {
      // Corriendo
      const ms = now - S.phases.cx;
      document.getElementById('st-tcx').textContent = fmt2(ms);
      document.getElementById('dur-cx').textContent  = fmt2(ms);
    }
  }

  // ── ISQUEMIA ──
  _tickIsquemia(now);
  // ── PANTALLA GRANDE ──
  if(_bigScreenOn) updateBigScreen();

  // ── AGENDA: polling de recordatorios cada 30 seg ──
  if(!tick._agLast || (now.getTime() - tick._agLast) >= 30000) {
    tick._agLast = now.getTime();
    try { agCheckReminders(); } catch(e) {}
  }
}
setInterval(tick,1000); tick();

// ═══════════════════════════════════════════════
