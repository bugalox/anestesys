// SISTEMA DE LOGIN Y GUARDADO
// ═══════════════════════════════════════════════════════════════
var DB_KEY_PRIV = 'anestesys_casos_privado';
var DB_KEY_HOSP = 'anestesys_casos_hospital';
var USER_KEY    = 'anestesys_user';

function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || '{"nombre":"","inst":""}'); }
  catch(e) { return {nombre:'',inst:''}; }
}

function getCasos(cat) {
  var key = (cat === 'hospital') ? DB_KEY_HOSP : DB_KEY_PRIV;
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch(e) { return []; }
}

function saveCasos(arr, cat) {
  var key = (cat === 'hospital') ? DB_KEY_HOSP : DB_KEY_PRIV;
  // FIX C: Capturar QuotaExceededError (localStorage lleno) para no silenciar el crash
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch(e) {
    // Quota exceeded — intentar liberar espacio eliminando caso más viejo
    try {
      var existing = JSON.parse(localStorage.getItem(key) || '[]');
      if (existing.length > 5) {
        existing = existing.slice(0, 5); // conservar solo 5 más recientes
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch(e2) {}
    try { showToast('⚠️ Almacenamiento lleno — se redujo el historial'); } catch(e3) {}
  }
}

function getCasoCategoria() {
  return S.pac && S.pac.categoria === 'hospital' ? 'hospital' : 'privado';
}

function getAllCasos() {
  var priv = getCasos('privado').map(function(c){ c._cat = 'privado'; return c; });
  var hosp = getCasos('hospital').map(function(c){ c._cat = 'hospital'; return c; });
  return priv.concat(hosp).sort(function(a,b){ return (b.savedAt||0)-(a.savedAt||0); });
}

function getCasoId() {
  if (!S._casoId) S._casoId = 'caso_' + Date.now();
  return S._casoId;
}

function serializeState() {
  // CRÍTICO: usar JSON deep-copy para que los casos guardados sean
  // independientes del estado actual — sin esto, modificar el caso
  // actual modifica también los datos de los casos ya guardados.
  function _dc(obj) { return JSON.parse(JSON.stringify(obj || null)); }
  return {
    id:      getCasoId(),
    fecha:   new Date().toLocaleString('es-MX'),
    savedAt: Date.now(),
    pac:     _dc(S.pac),
    vitals:  _dc(S.vitals),
    history: _dc(S.history),
    farms:   _dc(S.farms),
    ventHist:    _dc(S.ventHist),
    liqHora:     _dc(S.liqHora),
    hourBuckets: _dc(S.hourBuckets),
    alerts:      _dc(S.alerts),
    alarmCfg:    _dc(S.alarmCfg),
    phases: {
      an:     S.phases.an     ? S.phases.an.toISOString()     : null,
      finAn:  S.phases.finAn  ? S.phases.finAn.toISOString()  : null,
      cx:     S.phases.cx     ? S.phases.cx.toISOString()     : null,
      finCx:  S.phases.finCx  ? S.phases.finCx.toISOString()  : null,
      isqIni: S.phases.isqIni ? S.phases.isqIni.toISOString() : null,
      isqFin: S.phases.isqFin ? S.phases.isqFin.toISOString() : null,
    },
    timeInputs: {
      an:     (document.getElementById('time-an')      || {value:''}).value,
      finAn:  (document.getElementById('time-fin-an')  || {value:''}).value,
      cx:     (document.getElementById('time-cx')      || {value:''}).value,
      finCx:  (document.getElementById('time-fin-cx')  || {value:''}).value,
      // fin: removed (phase 'fin' no longer used)
      isqIni: (document.getElementById('time-isq-ini') || {value:''}).value,
      isqFin: (document.getElementById('time-isq-fin') || {value:''}).value,
    },
    liqInputs: {
      nacl: (document.getElementById('in-nacl')  || {value:''}).value,
      hart: (document.getElementById('in-hart')  || {value:''}).value,
      col:  (document.getElementById('in-col')   || {value:''}).value,
      pg:   (document.getElementById('in-pg')    || {value:''}).value,
      med:  (document.getElementById('in-med')   || {value:''}).value,
      otro: (document.getElementById('in-otro')  || {value:''}).value,
      ins:  (document.getElementById('eg-ins')   || {value:''}).value,
      bas:  (document.getElementById('eg-bas')   || {value:''}).value,
      diu:  (document.getElementById('eg-diu')   || {value:''}).value,
      sang: (document.getElementById('eg-sang')  || {value:''}).value,
      trau: (document.getElementById('eg-trau')  || {value:''}).value,
      oeg:  (document.getElementById('eg-otro')  || {value:''}).value
    },
    vscManual: S._vscManual || null,
    vspManual: S._vspManual || null,
    etco2:     (S.etco2 != null ? S.etco2 : 38),
    bis:       (S.bis   != null ? S.bis   : null),
    aldrete: {
      act:  (document.getElementById('al-act')  || {value:'2'}).value,
      resp: (document.getElementById('al-resp') || {value:'2'}).value,
      circ: (document.getElementById('al-circ') || {value:'2'}).value,
      conc: (document.getElementById('al-conc') || {value:'2'}).value,
      sat:  (document.getElementById('al-sat')  || {value:'2'}).value
    },
    postop: {
      eva:      (document.getElementById('po-eva')       || {value:'0'}).value,
      nausea:   (document.getElementById('po-nausea')    || {value:'No'}).value,
      shiver:   (document.getElementById('po-shivering') || {value:'No'}).value,
      analgesia:(document.getElementById('po-analgesia') || {value:''}).value,
      ingucpa:  (document.getElementById('po-ingucpa')   || {value:''}).value,
      egreso:   (document.getElementById('po-egreso')    || {value:''}).value,
      destino:  (document.getElementById('po-destino')   || {value:''}).value,
      notas:    (document.getElementById('po-notas')     || {value:''}).value
    },
    preop: {
      alergias:    (document.getElementById('m-alergias')    ||{value:''}).value,
      ayuno:       (document.getElementById('m-ayuno')       ||{value:''}).value,
      ayunoTipo:   (document.getElementById('m-ayuno-tipo')  ||{value:''}).value,
      antecedentes:(document.getElementById('m-antecedentes')||{value:''}).value,
      medCronicos: (document.getElementById('m-medcronicos') ||{value:''}).value,
      mallampati:  (document.getElementById('m-mallampati')  ||{value:''}).value,
      apertura:    (document.getElementById('m-apertura')    ||{value:''}).value,
      dtm:         (document.getElementById('m-dtm')         ||{value:''}).value,
      antID:       (document.getElementById('m-antid')       ||{value:'No'}).value,
      premed:      (document.getElementById('m-premed')      ||{value:''}).value
    }
  };
}

function autoSave(manual) {
  // Si estamos en modo sólo lectura (caso histórico), no sobreescribir
  if (S._readOnly && !manual) return;
  var state  = serializeState();
  var cat    = getCasoCategoria();
  var casos  = getCasos(cat);
  var idx    = casos.findIndex(function(c){ return c.id === state.id; });
  if (idx >= 0) { casos[idx] = state; } else { casos.unshift(state); }
  if (casos.length > 50) casos.splice(50);
  saveCasos(casos, cat);
  // FIX SAVE-6: flash verde en botón 💾 para confirmar guardado silencioso
  try {
    var _sb = document.querySelector('[title="Guardar caso"]');
    if(_sb) {
      _sb.style.background = 'rgba(0,230,118,.55)';
      setTimeout(function(){ _sb.style.background = 'rgba(0,230,118,.12)'; }, 700);
    }
  } catch(e) {}
  if (manual) {
    showToast('💾 Guardado: ' + (S.pac.nombre || 'Sin nombre'));
    if (navigator.vibrate) navigator.vibrate([30,30,30]);
  }
}

function showToast(msg) {
  var t = document.getElementById('toast-msg');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-msg';
    t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#0f1628;border:1px solid #1e2d44;border-radius:10px;padding:11px 20px;font-size:13px;color:#dde8ff;z-index:600;pointer-events:none;white-space:nowrap;box-shadow:0 4px 24px rgba(0,0,0,.7);transition:opacity .4s';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.style.opacity='0'; }, 2500);
}

function restoreState(caso) {
  // Deep-copy todo para que el estado activo sea completamente
  // independiente del objeto guardado en localStorage
  function _dc(obj, def) { try { return JSON.parse(JSON.stringify(obj || def)); } catch(e) { return def; } }
  S._casoId     = caso.id;
  S.pac         = _dc(caso.pac,         {});
  // Restore current vitals values into sliders
  if (caso.vitals) {
    Object.assign(S.vitals, caso.vitals);
    ['tas','tad','fc','spo2','fr','temp'].forEach(function(k) {
      var sl = document.getElementById('sl-'+k);
      var dv = document.getElementById('dv-'+k);
      if (sl && S.vitals[k] != null) sl.value = S.vitals[k];
      if (dv && S.vitals[k] != null) dv.textContent = S.vitals[k];
    });
    try { updatePAM(); } catch(e) {}
  }
  S.history     = _dc(caso.history,     []);
  S.farms       = _dc(caso.farms,       []);
  S.ventHist    = _dc(caso.ventHist,    []);
  S.liqHora     = _dc(caso.liqHora,     []);
  S.hourBuckets = _dc(caso.hourBuckets, {});
  S.alerts      = _dc(caso.alerts,      []);
  S.alarmCfg    = _dc(caso.alarmCfg,    null) || S.alarmCfg;
  // FIX #4: Reconstruir hrAlarms basado en horas transcurridas para evitar
  // que el tick re-dispare fireHrAlarm() (y su forceHourSnapshot) al cargar un caso activo.
  S.hrAlarms = [];
  if (caso.phases && caso.phases.an) {
    var _phAnDate = new Date(caso.phases.an);
    var _nowDate  = new Date();
    if (!isNaN(_phAnDate) && _phAnDate < _nowDate) {
      var _elapsedSec = Math.floor((_nowDate - _phAnDate) / 1000);
      var _horasTransc = Math.floor(_elapsedSec / 3600);
      for (var _hh = 1; _hh <= _horasTransc; _hh++) S.hrAlarms.push(_hh);
    }
  }
  // Reset frozen timers — se recalculan abajo según finAn/finCx
  S._frozenTan  = null;
  S._frozenTcx  = null;
  S._sangAlerted = false;

  var ph = caso.phases || {};
  // Ajustar fases: si la fecha guardada es en el futuro (caso de ayer restaurado hoy),
  // restar 24h para que el cronómetro sea positivo y correcto.
  function _fixPhaseDate(val) {
    if (!val) return null;
    var d = new Date(val);
    var now = new Date();
    // Si la fecha es más de 1 minuto en el futuro, es del día anterior
    while (d > now && (d - now) > 60000) {
      d = new Date(d.getTime() - 86400000); // restar 24h
    }
    return d;
  }
  S.phases = {
    an:     _fixPhaseDate(ph.an),
    finAn:  _fixPhaseDate(ph.finAn),
    cx:     _fixPhaseDate(ph.cx),
    finCx:  _fixPhaseDate(ph.finCx),
    isqIni: _fixPhaseDate(ph.isqIni),
    isqFin: _fixPhaseDate(ph.isqFin),
  };

  // ── CRONÓMETROS: congelar al momento del guardado si no hay fin explícito ──
  // Si el caso tiene inicio de anestesia pero no fin, al restaurarlo
  // mañana el cronómetro mostraría 14h, 73h, etc. de forma incorrecta.
  // Solución: si no hay finAn pero hay savedAt, congelar en (savedAt - an).
  var _savedAt = caso.savedAt ? new Date(caso.savedAt) : null;
  if(S.phases.an) {
    if(S.phases.finAn) {
      S._frozenTan = S.phases.finAn - S.phases.an;
    } else if(_savedAt) {
      // Caso histórico sin fin — congelar al momento del último guardado
      S._frozenTan = _savedAt - S.phases.an;
      if(S._frozenTan < 0) S._frozenTan = 0;
    }
  }
  if(S.phases.cx) {
    if(S.phases.finCx) {
      S._frozenTcx = S.phases.finCx - S.phases.cx;
    } else if(_savedAt) {
      S._frozenTcx = _savedAt - S.phases.cx;
      if(S._frozenTcx < 0) S._frozenTcx = 0;
    }
  }

  // Phase buttons
  function setBtn(id, bg, txt) { var b=document.getElementById(id); if(b){b.style.background=bg;b.textContent=txt;} }
  if(S.phases.an) {
    setBtn('btn-an', 'var(--green)', '✓ Anestesia');
    var phAn = document.getElementById('ph-an');
    if(phAn) phAn.className = 'phase-pill ' + (S._frozenTan==null?'active-phase':'done');
    var phAnT = document.getElementById('ph-an-t');
    if(phAnT && S.phases.an) phAnT.textContent = String(S.phases.an.getHours()).padStart(2,'0')+':'+String(S.phases.an.getMinutes()).padStart(2,'0');
  }
  if(S.phases.cx) {
    setBtn('btn-cx', 'var(--green)', '✓ Cirugía');
    var phCx = document.getElementById('ph-cx');
    if(phCx) phCx.className = 'phase-pill ' + (S._frozenTcx==null?'active-phase':'done');
    var phCxT = document.getElementById('ph-cx-t');
    if(phCxT && S.phases.cx) phCxT.textContent = String(S.phases.cx.getHours()).padStart(2,'0')+':'+String(S.phases.cx.getMinutes()).padStart(2,'0');
  }
  if(S.phases.finAn) {
    setBtn('btn-fin-an', 'var(--muted)', '✓ Fin anest.');
    var dFA = document.getElementById('dur-fin-an');
    if(dFA && S._frozenTan != null) dFA.textContent = fmt2(S._frozenTan);
    var phRec = document.getElementById('ph-rec');
    if(phRec) phRec.className = 'phase-pill done';
  } else if(S._frozenTan != null) {
    // Caso sin fin explícito — mostrar duración congelada, habilitar edición
    var dFA2 = document.getElementById('dur-an');
    if(dFA2) dFA2.textContent = fmt2(S._frozenTan);
  }
  if(S.phases.finCx) {
    setBtn('btn-fin-cx', 'var(--muted)', '✓ Fin cx');
    var dFC = document.getElementById('dur-fin-cx');
    if(dFC && S._frozenTcx != null) dFC.textContent = fmt2(S._frozenTcx);
  } else if(S._frozenTcx != null) {
    var dFC2 = document.getElementById('dur-cx');
    if(dFC2) dFC2.textContent = fmt2(S._frozenTcx);
  }

  // Restaurar isquemia UI
  try { _updateIsqUI(); } catch(e) {}

  // Time inputs
  var ti = caso.timeInputs || {};
  // Restore all time inputs
  var _tmap = {
    'time-an':      ti.an,
    'time-fin-an':  ti.finAn,
    'time-cx':      ti.cx,
    'time-fin-cx':  ti.finCx,
    'time-isq-ini': ti.isqIni,
    'time-isq-fin': ti.isqFin,
  };
  Object.keys(_tmap).forEach(function(id){
    var el = document.getElementById(id); if(el && _tmap[id]) el.value = _tmap[id];
  });

  // VSC manual overrides
  S._vscManual = caso.vscManual || null;
  S._vspManual = caso.vspManual || null;
  S.etco2 = caso.etco2 != null ? caso.etco2 : 38;
  S.bis   = caso.bis   != null ? caso.bis   : null;
  // Sync EtCO2 display
  try { var me = document.getElementById('mon-etco2'); if(me) { me.textContent = S.etco2; me.style.color = S.etco2>50?'var(--red)':S.etco2<30?'var(--yellow)':'var(--purple)'; } } catch(e){}
  // Sync BIS display
  try { if(S.bis != null) { adjBis(0); } } catch(e){}

  // Liquid inputs
  var li = caso.liqInputs || {};
  var lm = {nacl:'in-nacl',hart:'in-hart',col:'in-col',pg:'in-pg',med:'in-med',otro:'in-otro',
             ins:'eg-ins',bas:'eg-bas',diu:'eg-diu',sang:'eg-sang',trau:'eg-trau',oeg:'eg-otro'};
  Object.keys(lm).forEach(function(k){ var el=document.getElementById(lm[k]); if(el) el.value=li[k]||''; });

  // Aldrete
  var al = caso.aldrete || {};
  ['act','resp','circ','conc','sat'].forEach(function(k){ var el=document.getElementById('al-'+k); if(el&&al[k]) el.value=al[k]; });
  // Postop
  var po = caso.postop || {};
  var _pset = function(id,val){ var e=document.getElementById(id); if(e&&val!=null) e.value=val; };
  _pset('po-eva',       po.eva);       try{updEVA(po.eva||0);}catch(e){}
  _pset('po-nausea',    po.nausea);
  _pset('po-shivering', po.shiver);
  _pset('po-analgesia', po.analgesia);
  _pset('po-ingucpa',   po.ingucpa);
  _pset('po-egreso',    po.egreso);
  _pset('po-destino',   po.destino);
  _pset('po-notas',     po.notas);

  // Refresh all UI
  updateTopbar();
  renderVitalTable();
  drawChart();
  renderFarms();
  renderHourBuckets();
  calcLiq();
  if(typeof calcAld==='function') calcAld();
  try { renderLiqHoraTable(); renderLiqHoraBtns(); } catch(e) {}
  // FIX #5: Relanzar el auto-interval de vitales si aplica (se pierde al serializar)
  try {
    var _viInt = document.getElementById('vi-interval');
    if (_viInt && parseInt(_viInt.value) > 0 && S.phases.an && S._frozenTan == null) {
      if (S.autoInterval) clearInterval(S.autoInterval);
      changeVitalInterval();
    }
  } catch(e) {}
}

function loadCaso(id) {
  if (!window.__ACCESS_GRANTED) {
    try { if (typeof showToast === 'function') showToast('🔒 Acceso requerido'); } catch(e) {}
    return;
  }

  // Search both categories
  var casoPriv = getCasos('privado').find(function(c){ return c.id === id; });
  var casoHosp = getCasos('hospital').find(function(c){ return c.id === id; });
  var caso = casoPriv || casoHosp;
  if (!caso) { showToast('Error: caso no encontrado'); return; }
  // Remember which category this case belongs to so autoSave goes to the right place
  if(caso.pac) caso.pac.categoria = casoHosp ? 'hospital' : 'privado';

  // Guardar caso actual antes de cambiar (si tiene datos)
  if (hasCurrentData()) { try { autoSave(); } catch(e) {} }

  // ── Limpiar UI completamente antes de restaurar ──
  // Evita mezcla de datos entre casos
  _resetUIOnly();

  restoreState(caso);
  // Marcar como solo lectura — no sobreescribir con autoSave automático
  S._readOnly = true;
  _showReadOnlyBanner(true);
  hideLogin();
  try { labLoad(); } catch(e) {}
  showToast('📂 Cargado: ' + (caso.pac && caso.pac.nombre ? caso.pac.nombre : 'Sin nombre'));
}

// Limpia SOLO la UI (displays, inputs, botones) sin tocar S.*
// Se usa antes de restoreState para evitar mezcla visual
function _resetUIOnly() {
  // Sliders a default
  var slDef = {'sl-tas':135,'sl-tad':91,'sl-fc':100,'sl-spo2':93,'sl-fr':17,'sl-temp':37.0};
  Object.keys(slDef).forEach(function(id){
    var el=document.getElementById(id); if(el) el.value=slDef[id];
  });
  // Borrar todos los inputs de tiempo, líquidos, fármacos
  var clearIds = [
    'time-an','time-cx','time-fin-an','time-fin-cx','time-isq-ini','time-isq-fin',
    'in-nacl','in-hart','in-col','in-pg','in-med','in-otro',
    'eg-ins','eg-bas','eg-diu','eg-sang','eg-trau','eg-otro',
    'fn','fd','fnota','fh'
  ];
  clearIds.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  // Reset displays de duración
  ['dur-an','dur-cx','dur-fin-an','dur-fin-cx','dur-isq','dur-isq-total','st-tan','st-tcx'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent='--:--'; });
  // Reset pills
  ['ph-an','ph-cx','ph-rec'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.className='phase-pill';
  });
  ['ph-an-t','ph-cx-t','ph-rec-t'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.textContent='--:--';
  });
  // Reset botones de fase
  var phBtns = {
    'btn-an':     ['var(--cyan)',   '▶ Inicio'],
    'btn-cx':     ['var(--orange)', '▶ Inicio'],
    'btn-fin-an': ['var(--red)',    '■ Fin anest.'],
    'btn-fin-cx': ['var(--red)',    '■ Fin cx'],
    'btn-isq-ini':['var(--yellow)', '▶ Inicio'],
    'btn-isq-fin':['var(--orange)', '■ Fin isq.'],
  };
  Object.keys(phBtns).forEach(function(id){
    var el=document.getElementById(id);
    if(el){ el.style.background=phBtns[id][0]; el.textContent=phBtns[id][1]; el.disabled=false; }
  });
  // Reset alarma
  try{ document.getElementById('st-alarm').textContent='60:00'; }catch(e){}
  try{ document.getElementById('alarm-big').textContent='60:00'; }catch(e){}
  // EtCO2 + BIS display
  try { var me=document.getElementById('mon-etco2'); if(me){me.textContent='38';me.style.color='var(--purple)';} }catch(e){}
  try { var mb=document.getElementById('mon-bis'); if(mb) mb.textContent='--'; }catch(e){}
  try { var mbl=document.getElementById('mon-bis-lbl'); if(mbl){mbl.textContent='sin dato';mbl.style.color='';} }catch(e){}
  // Ventilador: sliders + displays + modo
  try {
    var ventDefs = {fio2:40, vc:400, fr:12, peep:5, ppeak:20, etco2:38};
    var ventUnits = {fio2:'%', vc:' ml', fr:' rpm', peep:' cmH₂O', ppeak:' cmH₂O', etco2:' mmHg'};
    Object.keys(ventDefs).forEach(function(k) {
      var sl = document.getElementById('sv-'+k);
      if(sl) sl.value = ventDefs[k];
      var dv = document.getElementById('dvv-'+k);
      if(dv) dv.textContent = ventDefs[k] + (ventUnits[k]||'');
      if(typeof ventVals !== 'undefined') ventVals[k] = ventDefs[k];
    });
    var slHal = document.getElementById('sv-hal'); if(slHal) slHal.value = 2;
    var dvHal = document.getElementById('dvv-hal'); if(dvHal) dvHal.textContent = '2%';
    var vmModo = document.getElementById('vm-modo'); if(vmModo) vmModo.selectedIndex = 0;
  }catch(e){}
  // Post-operatorio: reset a valores vacíos/default
  try {
    var po_eva = document.getElementById('po-eva'); if(po_eva){ po_eva.value='0'; try{updEVA(0);}catch(ex){} }
    ['po-nausea','po-shivering','po-destino'].forEach(function(id){ var el=document.getElementById(id); if(el) el.selectedIndex=0; });
    ['po-analgesia','po-ingucpa','po-egreso','po-notas'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  }catch(e){}
  // Liqhora table + botones
  try {
    var lb = document.getElementById('liq-tbody');
    if(lb) lb.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:16px">Sin registros hora por hora</td></tr>'; // BUG-N FIX
    var lhb = document.getElementById('liq-hora-btns');
    if(lhb) lhb.innerHTML = '';
    var lhc = document.getElementById('liq-hora-count');
    if(lhc) lhc.textContent = '0 horas';
  }catch(e){}
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM CONFIRM MODAL (Safari PWA blocks native confirm())
// ═══════════════════════════════════════════════════════════════
var _confirmCb = null;

function showConfirm(msg, sub, okLabel, okColor, cb) {
  _confirmCb = cb;
  var m = document.getElementById('confirm-modal');
  var mEl = document.getElementById('confirm-msg');
  var sEl = document.getElementById('confirm-sub');
  var bEl = document.getElementById('confirm-ok-btn');
  if (mEl) mEl.textContent = msg || '';
  if (sEl) sEl.textContent = sub || '';
  if (bEl) { bEl.textContent = okLabel || 'Confirmar'; bEl.style.background = okColor || '#ff1744'; }
  if (m)   m.style.display = 'flex';
}
function confirmOk() {
  var m = document.getElementById('confirm-modal');
  if (m) m.style.display = 'none';
  if (_confirmCb) { _confirmCb(); _confirmCb = null; }
}
function confirmCancel() {
  var m = document.getElementById('confirm-modal');
  if (m) m.style.display = 'none';
  _confirmCb = null;
}

// ═══════════════════════════════════════════════════════════════
