// INIT
// ─────────────────────────────────────────────────────────────
function agInit() {
  _agAnchor = new Date();
  _agSelDay = agTodayStr();
  agInitSwipe();
  agRender();
}

// ── Hook nav() ──
(function(){
  var _orig=window.nav;
  if(typeof _orig==='function'){
    window.nav=function(id,btn){
      _orig(id,btn);
      if(id==='agenda'){ try{ agInit(); }catch(e){} }
    };
  }
})();

// Inicializar recordatorios DESPUÉS de que el SW esté activo
if(navigator.serviceWorker) {
  navigator.serviceWorker.ready.then(function(){ agInitReminders(); }).catch(function(){ agInitReminders(); });
} else {
  agInitReminders();
}

(function(){
  if(typeof Notification!=='undefined'&&Notification.permission==='default'){
    setTimeout(function(){
      Notification.requestPermission().then(function(p){
        if(p==='granted'){
          try{showToast('Notificaciones activadas — llegaras aunque cierres la app');}catch(e){}
          // Re-registrar SW para que tome el permiso nuevo
          if(navigator.serviceWorker){
            navigator.serviceWorker.ready.then(function(reg){
              window._swReg = reg;
            }).catch(function(){});
          }
          // Reprogramar todos los recordatorios pendientes con el SW
          try{ agInitReminders(); }catch(e){}
        }
      }).catch(function(){});
    },2500);
  }
})();


// ── Buscador de agenda ──────────────────────────────────────
function agSearchFilter(q) {
  var clearBtn = document.getElementById('ag-search-clear');
  var infoEl   = document.getElementById('ag-search-info');
  if(clearBtn) clearBtn.style.display = q ? 'block' : 'none';
  q = q.toLowerCase().trim();
  if(!q) {
    if(infoEl) infoEl.style.display = 'none';
    agRenderProximas();
    return;
  }
  var lista = agGet();
  var resultados = lista.filter(function(ct) {
    return (ct.pacNombre||'').toLowerCase().indexOf(q)>=0
        || (ct.pacDx||'').toLowerCase().indexOf(q)>=0
        || (ct.sala||'').toLowerCase().indexOf(q)>=0
        || (ct.pacExp||'').toLowerCase().indexOf(q)>=0
        || (ct.notas||'').toLowerCase().indexOf(q)>=0
        || (ct.tipo||'').toLowerCase().indexOf(q)>=0;
  });
  // Ordenar: primero futuras, luego pasadas
  var now = Date.now();
  resultados.sort(function(a,b){
    var da = new Date((a.fecha||'')+'T'+(a.hora||'00:00')+':00').getTime();
    var db2 = new Date((b.fecha||'')+'T'+(b.hora||'00:00')+':00').getTime();
    var aFut = da >= now, bFut = db2 >= now;
    if(aFut && !bFut) return -1;
    if(!aFut && bFut) return 1;
    return aFut ? da-db2 : db2-da;
  });
  if(infoEl){
    infoEl.style.display = 'block';
    infoEl.textContent = resultados.length
      ? resultados.length + ' resultado' + (resultados.length>1?'s':'') + ' para "' + q + '"'
      : 'Sin resultados para "' + q + '"';
  }
  var el = document.getElementById('ag-proximas-list');
  if(!el) return;
  if(!resultados.length){
    el.innerHTML='<div style="text-align:center;color:#3d5a78;padding:20px;font-size:13px">Sin resultados</div>';
    return;
  }
  el.innerHTML = resultados.map(function(ct){ return agCitaCard(ct); }).join('');
}

function agSearchClear() {
  var inp = document.getElementById('ag-search');
  var clr = document.getElementById('ag-search-clear');
  var inf = document.getElementById('ag-search-info');
  if(inp) inp.value = '';
  if(clr) clr.style.display = 'none';
  if(inf) inf.style.display = 'none';
  agRenderProximas();
}

// ─── TEST DE NOTIFICACIONES ───────────────────────────────────────────
window.agTestNotification = function() {
  if(typeof Notification === 'undefined') {
    try{showToast('❌ Notificaciones no soportadas');}catch(e){alert('No soportado');}
    return;
  }
  if(Notification.permission === 'denied') {
    try{showToast('🔕 Bloqueadas — actívalas en ajustes del browser');}catch(e){}
    return;
  }
  var doTest = function() {
    var testCita = {
      id: 'test-' + Date.now(),
      tipo: 'cirugia',
      pacNombre: 'Paciente Prueba',
      pacDx: 'Test de Notificación',
      fecha: new Date().toISOString().slice(0,10),
      hora: new Date(Date.now()+5000).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false}),
      sala: 'Qx 1',
      recordatorio: 0
    };
    if(navigator.serviceWorker) {
      navigator.serviceWorker.ready.then(function(reg) {
        var target = reg.active || navigator.serviceWorker.controller;
        if(target) {
          target.postMessage({ type: 'SCHEDULE_REMINDER', cita: testCita, ms: 5000 });
          try{showToast('🔔 Notificación de prueba en 5 segundos (SW)');}catch(e){}
          return;
        }
        // fallback directo
        setTimeout(function(){
          try{ new Notification('AnesteSys — Prueba',{body:'Paciente Prueba\nTest exitoso ✅',tag:'test-ag',requireInteraction:false}); }catch(e){}
        }, 5000);
        try{showToast('🔔 Test en 5 seg (directa)');}catch(e){}
      }).catch(function(){
        try{showToast('❌ SW no disponible');}catch(e){}
      });
    } else {
      setTimeout(function(){
        try{new Notification('AnesteSys — Prueba',{body:'Sin SW — OK',tag:'test'});}catch(e){}
      },5000);
      try{showToast('🔔 Test en 5 seg');}catch(e){}
    }
  };
  if(Notification.permission === 'granted') {
    doTest();
  } else {
    Notification.requestPermission().then(function(p){
      if(p==='granted') doTest();
      else try{showToast('❌ Permiso denegado — activa notificaciones');}catch(e){}
    });
  }
};

// ── Navegar a Agenda desde Mi Perfil (sin navbtn) ──
function irAgenda() {
  // Cerrar login-screen si está abierto
  var ls = document.getElementById('login-screen');
  if (ls) ls.style.display = 'none';
  document.body.style.overflow = '';
  // Activar página agenda
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var pa = document.getElementById('page-agenda');
  if (pa) pa.classList.add('active');
  // Desmarcar todos los navbtn y no marcar ninguno (agenda no está en el nav)
  document.querySelectorAll('.navbtn').forEach(function(b){ b.classList.remove('active'); });
  window.scrollTo(0,0);
  try { agRender(); } catch(e) {}
}

</script>
