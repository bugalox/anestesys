// ── On startup (deferred to after DOM is fully loaded) ──
// ─── PERFIL FUNCTIONS ───
function lsMostrarPerfil(u) {
  var formEl  = document.getElementById('ls-perfil-form');
  var savedEl = document.getElementById('ls-perfil-guardado');
  var nomEl   = document.getElementById('ls-nombre-display');
  var instEl  = document.getElementById('ls-inst-display');
  if (!u || !u.nombre || !window.__ACCESS_GRANTED) {
    if (formEl)  formEl.style.display  = 'none';
    if (savedEl) savedEl.style.display = 'none';
    if (!u || !u.nombre) setTimeout(function() { _setPerfilFormOpen(true); }, 50);
  } else {
    if (nomEl)   nomEl.textContent  = u.nombre;
    if (instEl) instEl.textContent = u.inst || '';
    var _cdEl = document.getElementById('ls-cedulas-display');
    if (_cdEl) {
      var _cp = [];
      if (u.cedula)    _cp.push('Céd. Prof: ' + u.cedula);
      if (u.cedulaEsp) _cp.push('Céd. Esp: '  + u.cedulaEsp);
      _cdEl.textContent = _cp.join('  ·  ');
      _cdEl.style.display = _cp.length ? 'block' : 'none';
    }
    var emailDispEl = document.getElementById('ls-email-display');
    if (emailDispEl) emailDispEl.textContent = u.email ? '✉️ ' + u.email : '';
    if (formEl)  formEl.style.display  = 'none';
    if (savedEl) savedEl.style.display = 'block';
    // Keep form inputs in sync
    var lu  = document.getElementById('login-user');       if(lu)  lu.value  = u.nombre;
    var li  = document.getElementById('login-inst');       if(li)  li.value  = u.inst || '';
    var le  = document.getElementById('login-email');      if(le)  le.value  = u.email || '';
    var lc  = document.getElementById('login-cedula');     if(lc)  lc.value  = u.cedula || '';
    var lce = document.getElementById('login-cedula-esp'); if(lce) lce.value = u.cedulaEsp || '';
  }
}

function lsGuardarPerfil() {
  var nombre = (document.getElementById('login-user').value || '').trim();
  if (!nombre) { showToast('⚠️ Escribe tu nombre primero'); return; }
  var inst      = (document.getElementById('login-inst').value       || '').trim();
  var email     = (document.getElementById('login-email').value      || '').trim();
  var cedula    = (document.getElementById('login-cedula').value     || '').trim();
  var cedulaEsp = (document.getElementById('login-cedula-esp').value || '').trim();
  var u = {nombre:nombre, inst:inst, email:email, cedula:cedula, cedulaEsp:cedulaEsp};
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  lsMostrarPerfil(u);
  showToast('✅ Perfil guardado: ' + nombre);
  if (navigator.vibrate) navigator.vibrate(30);
}

function lsCambiarPerfil() {
  var formEl  = document.getElementById('ls-perfil-form');
  var savedEl = document.getElementById('ls-perfil-guardado');
  if (formEl)  formEl.style.display  = 'block';
  if (savedEl) savedEl.style.display = 'none';
  // Expand the collapsible body
  setTimeout(function() { _setPerfilFormOpen(true); }, 50);
}

// ─── INIT APP ───
window.addEventListener('load', function() {
  var u     = getUser();
  var casos = getCasos();
  lsMostrarPerfil(u);
  if (casos.length > 0) { restoreState(casos[0]); }
  refreshHistorial();
  // NO forzar showLogin aquí — Firebase onAuthStateChanged maneja el estado de auth
  // Si no hay sesión, Firebase llamará showLogin() automáticamente
});


// ───────────────────────────────────────────────
// LOGIN SCREEN CONTROLS (added)
// ───────────────────────────────────────────────
function showLogin() {
  var ls = document.getElementById('login-screen');
  if (ls) { ls.style.display = 'block'; ls.style.opacity = ''; ls.style.visibility = ''; }
  document.body.style.overflow = 'hidden';
  // ✕ solo aparece si ya hay sesión activa (usuario abre historial desde la app)
  var cb = document.getElementById('btn-close-login');
  if (cb) cb.style.display = window.__ACCESS_GRANTED ? 'block' : 'none';
  try { if (window.__ACCESS_GRANTED) refreshHistorial(); } catch(e) {}
}

function hideLogin() {
  var ls = document.getElementById('login-screen');
  if (ls) ls.style.display = 'none';
  document.body.style.overflow = '';
  var cb = document.getElementById('btn-close-login');
  if (cb) cb.style.display = 'none';
}


// ───────────────────────────────────────────────
// ACCESS GATE helpers (show/hide profile sections)
// ───────────────────────────────────────────────
function setAccessUI(isAuthed) {
  window.__ACCESS_GRANTED = !!isAuthed;
  var pf = document.getElementById('ls-perfil-form');
  var ps = document.getElementById('ls-perfil-guardado');
  var hc = document.getElementById('historial-list');
  var rb = document.getElementById('btn-refresh-hist');
  var cb = document.getElementById('btn-close-login');

  // Secciones sensibles
  if (pf) pf.style.display = isAuthed ? 'block' : 'none';
  if (ps) ps.style.display = isAuthed ? ((getUser() && getUser().nombre) ? 'block' : 'none') : 'none';

  // Botón cerrar (solo si ya estás autorizado)
  if (cb) cb.style.display = 'none'; // se muestra solo cuando showLogin() es llamado post-auth

  // Botón refresh historial (solo si autorizado)
  if (rb) {
    rb.disabled = !isAuthed;
    rb.style.opacity = isAuthed ? '1' : '0.45';
    rb.style.pointerEvents = isAuthed ? 'auto' : 'none';
    rb.title = isAuthed ? 'Actualizar' : 'Acceso requerido';
  }

  if (!isAuthed) {
    try {
      if (hc) hc.innerHTML = '<div style="text-align:center;color:#3d5a78;padding:24px;font-size:13px;line-height:1.8">Acceso requerido.</div>';
    } catch(e) {}
  } else {
    try { refreshHistorial(); } catch(e) {}
  }
}





/* === CLINICAL SUMMARY PATCH v1 ===
   Objetivo (práctica anestésica):
   - Vitales/ventilador: NO se suman. Se reporta ÚLTIMO, PROMEDIO, MÍN–MÁX.
   - Fármacos: conteo total, primera/última hora, y top por frecuencia (no suma de dosis por unidades mixtas).
=== */

(function(){
  function _num(v){ var n = Number(v); return isFinite(n) ? n : null; }
  function _avg(arr){ var s=0,c=0; for(var i=0;i<arr.length;i++){ if(arr[i]!==null){ s+=arr[i]; c++; } } return c? (s/c): null; }
  function _min(arr){ var m=null; for(var i=0;i<arr.length;i++){ var v=arr[i]; if(v===null) continue; m = (m===null)? v : Math.min(m,v); } return m; }
  function _max(arr){ var m=null; for(var i=0;i<arr.length;i++){ var v=arr[i]; if(v===null) continue; m = (m===null)? v : Math.max(m,v); } return m; }
  function _fmt0(v){ return v===null ? '—' : String(Math.round(v)); }
  function _fmt1(v){ return v===null ? '—' : String(Math.round(v*10)/10); }
  function _timeToMin(h){ if(!h || typeof h!=='string' || h.indexOf(':')<0) return null; var p=h.split(':'),hh=parseInt(p[0],10),mm=parseInt(p[1],10); if(!isFinite(hh)||!isFinite(mm)) return null; return hh*60+mm; }
  function _minToTime(m){ if(m===null) return '—'; var hh=Math.floor(m/60)%24, mm=m%60; return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'); }

  // ─────────────────────────────────────────────────────────
  // VITALES: extender renderVitalTable() agregando resumen
  // ─────────────────────────────────────────────────────────
  var _origRenderVitalTable = window.renderVitalTable;
  window.renderVitalTable = function(){
    if (typeof _origRenderVitalTable === 'function') _origRenderVitalTable();
    var b = document.getElementById('vital-tbody');
    if(!b || !window.S || !S.history || !S.history.length) return;
    // Evita duplicar
    if (b.querySelector('tr[data-summary="vital"]')) return;

    var tas = S.history.map(function(r){ return _num(r.tas); });
    var tad = S.history.map(function(r){ return _num(r.tad); });
    var pam = S.history.map(function(r){
      if (_num(r.pam)!==null) return _num(r.pam);
      var TAS=_num(r.tas), TAD=_num(r.tad);
      return (TAS===null||TAD===null) ? null : (TAD + (TAS-TAD)/3);
    });
    var fc   = S.history.map(function(r){ return _num(r.fc); });
    var fr   = S.history.map(function(r){ return _num(r.fr); });
    var spo2 = S.history.map(function(r){ return _num(r.spo2); });
    var temp = S.history.map(function(r){ return _num(r.temp); });

    var last = S.history[S.history.length-1] || {};
    var lastPam = (_num(last.pam)!==null) ? _num(last.pam) : ((_num(last.tas)!==null && _num(last.tad)!==null) ? (_num(last.tad)+(_num(last.tas)-_num(last.tad))/3) : null);

    function row(label, cTas,cTad,cPam,cFc,cFr,cSp,cTp,note){
      return '<tr data-summary="vital" style="background:rgba(0,229,255,.06)">'
        + '<td class="hl" style="font-weight:900">'+label+'</td>'
        + '<td style="font-weight:800">'+cTas+'</td>'
        + '<td style="font-weight:800">'+cTad+'</td>'
        + '<td style="font-weight:900;color:#d500f9">'+cPam+'</td>'
        + '<td style="font-weight:900;color:var(--orange)">'+cFc+'</td>'
        + '<td style="font-weight:800">'+cFr+'</td>'
        + '<td style="font-weight:900;color:var(--green)">'+cSp+'</td>'
        + '<td style="font-weight:900;color:var(--yellow)">'+cTp+'</td>'
        + '<td style="color:var(--muted);font-size:11px">'+(note||'')+'</td>'
        + '</tr>';
    }

    var header = '<tr data-summary="vital"><td colspan="9" style="text-align:center;color:var(--muted);padding:10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-top:1px solid var(--border);background:rgba(255,255,255,.02)">Resumen clínico — '+S.history.length+' registros</td></tr>';
    var rLast = row('ÚLTIMO', _fmt0(_num(last.tas)), _fmt0(_num(last.tad)), _fmt0(lastPam), _fmt0(_num(last.fc)), _fmt0(_num(last.fr)), _fmt0(_num(last.spo2)), _fmt1(_num(last.temp)), '');
    var rAvg  = row('PROM', _fmt0(_avg(tas)), _fmt0(_avg(tad)), _fmt0(_avg(pam)), _fmt0(_avg(fc)), _fmt0(_avg(fr)), _fmt0(_avg(spo2)), _fmt1(_avg(temp)), '');
    var rMM   = row('MÍN–MÁX', _fmt0(_min(tas))+'–'+_fmt0(_max(tas)), _fmt0(_min(tad))+'–'+_fmt0(_max(tad)), _fmt0(_min(pam))+'–'+_fmt0(_max(pam)), _fmt0(_min(fc))+'–'+_fmt0(_max(fc)), _fmt0(_min(fr))+'–'+_fmt0(_max(fr)), _fmt0(_min(spo2))+'–'+_fmt0(_max(spo2)), _fmt1(_min(temp))+'–'+_fmt1(_max(temp)), '');
    b.insertAdjacentHTML('beforeend', header + rLast + rAvg + rMM);
  };

  // ─────────────────────────────────────────────────────────
  // VENTILADOR: post-procesar tabla y agregar resumen
  // ─────────────────────────────────────────────────────────
  function addVentSummary(){
    var b = document.getElementById('vent-tbody');
    if(!b || !window.S || !S.ventHist || !S.ventHist.length) return;
    if (b.querySelector('tr[data-summary="vent"]')) return;

    var fio2  = S.ventHist.map(function(r){ return _num(r.fio2); });
    var vc    = S.ventHist.map(function(r){ return _num(r.vc); });
    var fr    = S.ventHist.map(function(r){ return _num(r.fr); });
    var peep  = S.ventHist.map(function(r){ return _num(r.peep); });
    var ppeak = S.ventHist.map(function(r){ return _num(r.ppeak); });
    var etco2 = S.ventHist.map(function(r){ return _num(r.etco2); });
    var vm    = S.ventHist.map(function(r){ return _num(r.vm); });

    // En tu flujo usas unshift(), así que el último registro está en [0]
    var last = S.ventHist[0] || {};

    var header = '<tr data-summary="vent"><td colspan="10" style="text-align:center;color:var(--muted);padding:10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-top:1px solid var(--border);background:rgba(255,255,255,.02)">Resumen ventilatorio — '+S.ventHist.length+' registros</td></tr>';

    function row(label, modo, cFio2,cVc,cFr,cPeep,cPpeak,cEt,cVm){
      return '<tr data-summary="vent" style="background:rgba(0,229,255,.06)">'
        + '<td class="hl" style="font-weight:900">'+label+'</td>'
        + '<td style="font-weight:800">'+(modo||'—')+'</td>'
        + '<td style="font-weight:900;color:var(--green)">'+cFio2+'</td>'
        + '<td style="font-weight:900;color:var(--cyan)">'+cVc+'</td>'
        + '<td style="font-weight:900;color:var(--orange)">'+cFr+'</td>'
        + '<td style="font-weight:900">'+cPeep+'</td>'
        + '<td style="font-weight:900">'+cPpeak+'</td>'
        + '<td style="font-weight:900">'+cEt+'</td>'
        + '<td style="font-weight:900">'+cVm+'</td>'
        + '<td></td>'
        + '</tr>';
    }

    var rLast = row('ÚLTIMO', last.modo, _fmt0(_num(last.fio2))+'%', _fmt0(_num(last.vc)), _fmt0(_num(last.fr)), _fmt0(_num(last.peep)), _fmt0(_num(last.ppeak)), _fmt0(_num(last.etco2)), _fmt1(_num(last.vm)));
    var rAvg  = row('PROM', '—', _fmt0(_avg(fio2))+'%', _fmt0(_avg(vc)), _fmt0(_avg(fr)), _fmt0(_avg(peep)), _fmt0(_avg(ppeak)), _fmt0(_avg(etco2)), _fmt1(_avg(vm)));
    var rMM   = row('MÍN–MÁX', '—', _fmt0(_min(fio2))+'–'+_fmt0(_max(fio2))+'%', _fmt0(_min(vc))+'–'+_fmt0(_max(vc)), _fmt0(_min(fr))+'–'+_fmt0(_max(fr)), _fmt0(_min(peep))+'–'+_fmt0(_max(peep)), _fmt0(_min(ppeak))+'–'+_fmt0(_max(ppeak)), _fmt0(_min(etco2))+'–'+_fmt0(_max(etco2)), _fmt1(_min(vm))+'–'+_fmt1(_max(vm)));

    b.insertAdjacentHTML('beforeend', header + rLast + rAvg + rMM);
  }

  // Wrap regVent to add summary after it re-renders tbody
  var _origRegVent = window.regVent;
  window.regVent = function(){
    if (typeof _origRegVent === 'function') _origRegVent();
    addVentSummary();
  };

  // ─────────────────────────────────────────────────────────
  // FÁRMACOS: extender renderFarms() agregando resumen clínico
  // ─────────────────────────────────────────────────────────
  var _origRenderFarms = window.renderFarms;
  window.renderFarms = function(){
    if (typeof _origRenderFarms === 'function') _origRenderFarms();
    var el = document.getElementById('farm-list');
    if(!el || !window.S || !S.farms || !S.farms.length) return;

    // Evita duplicar
    if (el.querySelector('[data-summary="farms"]')) return;

    var n = S.farms.length;
    var times = S.farms.map(function(f){ return _timeToMin(f.h); }).filter(function(x){return x!==null;});
    var firstT = times.length ? _minToTime(Math.min.apply(null, times)) : '—';
    var lastT  = times.length ? _minToTime(Math.max.apply(null, times)) : '—';

    var freq = {};
    for (var i=0;i<S.farms.length;i++){
      var name = (S.farms[i].n || '—').trim();
      freq[name] = (freq[name]||0) + 1;
    }
    var top = Object.keys(freq).map(function(k){return [k,freq[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
    var topHtml = top.map(function(x){
      return '<span class="badge" style="margin-right:6px">'+x[0]+': '+x[1]+'</span>';
    }).join(' ');

    var box = document.createElement('div');
    box.setAttribute('data-summary','farms');
    box.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px';
    box.innerHTML = '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Resumen de fármacos</div>'
      + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">'
      + '<div><span style="color:var(--muted)">Total:</span> <b style="color:var(--orange)">'+n+'</b></div>'
      + '<div><span style="color:var(--muted)">Primero:</span> <b>'+firstT+'</b></div>'
      + '<div><span style="color:var(--muted)">Último:</span> <b>'+lastT+'</b></div>'
      + '</div>'
      + (topHtml ? ('<div style="margin-top:8px">'+topHtml+'</div>') : '');

    // Insert summary at top of list
    el.insertBefore(box, el.firstChild);
  };

  // ─────────────────────────────────────────────────────────
  // Recalcular resúmenes al cargar/restaurar
  // ─────────────────────────────────────────────────────────
  window.addEventListener('load', function(){
    try { window.renderVitalTable(); } catch(e){}
    try { addVentSummary(); } catch(e){}
    try { window.renderFarms(); } catch(e){}
  });

  // Hook restoreState if exists
  var _origRestore = window.restoreState;
  if (typeof _origRestore === 'function') {
    window.restoreState = function(caso){
      _origRestore(caso);
      try { window.renderVitalTable(); } catch(e){}
      try { addVentSummary(); } catch(e){}
      try { window.renderFarms(); } catch(e){}
    };
  }

})();

/* === MISSING HANDLERS PATCH v1 === */

/* === MISSING HANDLERS PATCH v1 ===
   Completa funciones que están referenciadas en onclick pero no estaban definidas.
   (iOS PWA falla silenciosamente si falta alguna.)
=== */

// ── LOGIN: Nuevo paciente desde historial ──
function hasCurrentData(){
  try{
    return !!(
      (S && S.pac && (S.pac.nombre || S.pac.exp || S.pac.dx || S.pac.cx)) ||
      (S && S.history && S.history.length) ||
      (S && S.farms && S.farms.length) ||
      (S && S.ventHist && S.ventHist.length) ||
      (S && S.liqHora && S.liqHora.length)
    );
  }catch(e){ return false; }
}

function resetForNewCase(){
  // ── Limpiar timers activos ──
  try { if(S.autoInterval) { clearInterval(S.autoInterval); S.autoInterval = null; } } catch(e) {}
  // FIX L: Resetear lock de liqHora — si quedó bloqueado de caso anterior, el botón no funcionaría
  try { if(typeof _liqHoraLock !== 'undefined') _liqHoraLock = false; } catch(e) {}
  // FIX L: Cancelar debounce pendiente para no guardar caso anterior sobre el nuevo
  try { if(typeof _saveDebounce !== 'undefined') clearTimeout(_saveDebounce); } catch(e) {}
  // ── Reset COMPLETO del estado ──
  S._casoId    = null;
  try { _showReadOnlyBanner(false); } catch(e) {}
  S.vitals     = {tas:135, tad:91, fc:100, spo2:93, fr:17, temp:37.0};
  S.history    = [];
  S.farms      = [];
  S.etco2      = 38;
  S.bis        = null;
  S._readOnly  = false;
  S.ventHist   = [];
  S.liqHora    = [];
  S.alerts     = [];
  S.hrAlarms   = [];
  S.hourBuckets= {};
  S.phases     = {an:null, finAn:null, cx:null, finCx:null, isqIni:null, isqFin:null};
  S._frozenTan = null;
  S._frozenTcx = null;
  S._vscManual = null;
  S._vspManual = null;
  S._sangAlerted = false;
  S.pac = {
    nombre:'', edad:'', sexo:'Masculino', exp:'', asa:'II',
    peso:'', pesoI:'', pesoC:'', talla:'',
    dx:'', cx:'',
    tipoAn:'AGB — Anestesia General Balanceada',
    tipoAn2:'', tipoAnNota:'',
    anLocal:'', anLocalDosis:'', guia:'',
    med:'', medCed:'', medCedEsp:'',
    ciru:'', ciruCed:'', ciruCedEsp:'', inst:'',
    alergias:'', ayuno:'', ayunoTipo:'',
    antecedentes:'', medCronicos:'',
    mallampati:'', aperturaBucal:'', dtm:'', antID:'No', premed:'',
    categoria:'privado'
  };

  // ── Limpiar TODOS los inputs y selects del modal paciente ──
  ['m-nombre','m-edad','m-exp','m-peso','m-talla','m-dx','m-cx',
   'm-anest','m-ciru','m-inst','m-tipoan-nota','m-anlocal-dosis',
   'm-alergias','m-ayuno','m-premed','m-antecedentes','m-medcronicos'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  try{document.getElementById('m-ayuno-tipo').value='';}catch(e){}
  try{document.getElementById('m-mallampati').value='';}catch(e){}
  try{document.getElementById('m-apertura').value='';}catch(e){}
  try{document.getElementById('m-dtm').value='';}catch(e){}
  try{document.getElementById('m-antid').value='No';}catch(e){}
  try{document.getElementById('m-anest-ced').value='';}catch(e){}
  try{document.getElementById('m-anest-ced-esp').value='';}catch(e){}
  try{document.getElementById('m-ciru').value='';}catch(e){}
  try{document.getElementById('m-ciru-ced').value='';}catch(e){}
  try{document.getElementById('m-ciru-ced-esp').value='';}catch(e){}
  try{document.querySelectorAll('input[name="cat-caso"]').forEach(function(r){r.checked=(r.value==='privado');});}catch(e){}
  try{ document.getElementById('m-sexo').value = 'Masculino'; }catch(e){}
  try{ document.getElementById('m-asa').value  = 'II'; }catch(e){}
  try{ // FIX #7a: em-dash correcto (U+2014) — el value ASCII doble guion no coincide con la opcion HTML
  document.getElementById('m-tipoan').value = 'AGB — Anestesia General Balanceada'; }catch(e){}
  try{ document.getElementById('m-tipoan2').value = ''; }catch(e){}
  try{ document.getElementById('m-anlocal').value = ''; }catch(e){}
  // Desmarcar guía
  try{ document.querySelectorAll('input[name="guia"]').forEach(function(r){r.checked=false;}); }catch(e){}
  // FIX #7b: Ocultar alerta de vía aérea difícil (puede quedar visible del caso anterior)
  try{ var _la=document.getElementById('lemon-alert'); if(_la) _la.style.display='none'; }catch(e){}
  // FIX #7c: Resetear estilos visuales de labels de categoría (no solo el radio checked)
  try{
    var _pl=document.getElementById('cat-priv-lbl');
    var _hl=document.getElementById('cat-hosp-lbl');
    if(_pl) _pl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,229,255,.08);border:2px solid var(--cyan);border-radius:10px;cursor:pointer;transition:all .2s';
    if(_hl) _hl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,230,118,.05);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s';
  }catch(e){}
  // FIX #7d: Resetear pill Pre-Anest. (no estaba en el array de pills)
  try{ var _phPre=document.getElementById('ph-pre'); if(_phPre) _phPre.className='phase-pill'; }catch(e){}
  try{ var _phPreT=document.getElementById('ph-pre-t'); if(_phPreT) _phPreT.textContent='--:--'; }catch(e){}
  // FIX #7e: Resetear contadores st-fm y st-reg a 0 antes del re-render
  try{ var _sfm=document.getElementById('st-fm'); if(_sfm) _sfm.textContent='0'; }catch(e){}
  try{ var _srg=document.getElementById('st-reg'); if(_srg) _srg.textContent='0'; }catch(e){}

  // ── Limpiar todos los campos de líquidos ──
  ['in-nacl','in-hart','in-col','in-pg','in-med','in-otro',
   'eg-ins','eg-bas','eg-diu','eg-sang','eg-trau','eg-otro'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });

  // ── Limpiar cronómetros completamente ──
  ['time-an','time-cx','time-fin-an','time-fin-cx','time-isq-ini','time-isq-fin'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });

  // ── Reset botones de fases ──
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

  // ── Reset displays de duración ──
  ['dur-an','dur-cx','dur-fin-an','dur-fin-cx','dur-isq','dur-isq-total',
   'st-tan','st-tcx'
  ].forEach(function(id){ var el=document.getElementById(id); if(el) el.textContent='--:--'; });

  // ── Reset pills de fase ──
  ['ph-an','ph-cx','ph-rec'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.className='phase-pill';
  });
  ['ph-an-t','ph-cx-t','ph-rec-t'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.textContent='--:--';
  });

  // ── Reset alarma ──
  try{ document.getElementById('st-alarm').textContent='60:00'; }catch(e){}
  try{ document.getElementById('alarm-big').textContent='60:00'; }catch(e){}

  // ── Reset sliders a valores default ──
  var sliderDefs = {
    'sl-tas':135,'sl-tad':91,'sl-fc':100,'sl-spo2':93,'sl-fr':17,'sl-temp':37.0
  };
  Object.keys(sliderDefs).forEach(function(id){
    var sl=document.getElementById(id); if(sl) sl.value=sliderDefs[id];
    upV(id.replace('sl-',''), sliderDefs[id]);
  });

  // ── Limpiar campos de fármaco ──
  ['fn','fd','fnota','fh'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });

  // ── Aldrete: reset a máximo ──
  ['al-act','al-resp','al-circ','al-conc','al-sat'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='2';
  });
  try{ calcAld(); }catch(e){}

  // ── Ventilador: reset sliders + displays + ventVals + modo ──
  try {
    var ventDefs = {fio2:40, vc:400, fr:12, peep:5, ppeak:20, etco2:38};
    var ventUnits = {fio2:'%', vc:' ml', fr:' rpm', peep:' cmH₂O', ppeak:' cmH₂O', etco2:' mmHg'};
    Object.keys(ventDefs).forEach(function(k) {
      var sl = document.getElementById('sv-'+k); if(sl) sl.value = ventDefs[k];
      var dv = document.getElementById('dvv-'+k); if(dv) dv.textContent = ventDefs[k] + (ventUnits[k]||'');
      ventVals[k] = ventDefs[k];
    });
    var slHal = document.getElementById('sv-hal'); if(slHal) slHal.value = 2;
    var dvHal = document.getElementById('dvv-hal'); if(dvHal) dvHal.textContent = '2%';
    var vmModo = document.getElementById('vm-modo'); if(vmModo) vmModo.selectedIndex = 0;
  }catch(e){}

  // ── Post-operatorio: reset a valores vacíos/default ──
  try {
    var po_eva = document.getElementById('po-eva'); if(po_eva){ po_eva.value='0'; try{updEVA(0);}catch(ex){} }
    ['po-nausea','po-shivering','po-destino'].forEach(function(id){ var el=document.getElementById(id); if(el) el.selectedIndex=0; });
    ['po-analgesia','po-ingucpa','po-egreso','po-notas'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  }catch(e){}

  // ── Monitor EtCO2 + BIS display ──
  try { var me=document.getElementById('mon-etco2'); if(me){me.textContent='38';me.style.color='var(--purple)';} }catch(e){}
  try { var mb=document.getElementById('mon-bis');   if(mb) mb.textContent='--'; }catch(e){}
  try { var mbl=document.getElementById('mon-bis-lbl'); if(mbl){mbl.textContent='sin dato';mbl.style.color='';} }catch(e){}

  // ── Render vacíos ──
  try{ updateTopbar(); }catch(e){}
  try{ renderVitalTable(); drawChart(); }catch(e){}
  try{ renderFarms(); }catch(e){}
  try{ calcLiq(); }catch(e){}
  try{
    var vb=document.getElementById('vent-tbody');
    if(vb) vb.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:16px">Sin registros</td></tr>';
  }catch(e){}
  try{
    S.alerts = [];
    S.hrAlarms = [];
    S.alarmCfg = {tHi:160, tLo:80, fHi:120, fLo:45, sLo:92, tpHi:38.5};
    // FIX G+H: _renderAlertList reconstruye DOM de alertas Y resetea badge correctamente
    try { _renderAlertList(); } catch(e) {}
  }catch(e){}

  try { if(typeof _renderLiqTable==='function') _renderLiqTable(); } catch(e) {}
  try { renderLiqHoraBtns(); } catch(e) {}
  try { if(typeof _renderVentTable==='function') _renderVentTable(); } catch(e) {}
  try { labClearAll(); } catch(e) {}
  // ════════════════════════════════════════════════════════
  // FIX RESET: 18 contadores y displays que no se reseteaban
  // ════════════════════════════════════════════════════════

  // ── Fármacos ──
  try{ var _fb=document.getElementById('farm-badge');
    if(_fb) _fb.textContent='0'; }catch(e){}
  try{ var _fab=document.getElementById('farm-acum-bar');
    if(_fab) _fab.style.display='none'; }catch(e){}
  try{ var _fv=document.getElementById('fvel'); if(_fv) _fv.value=''; }catch(e){}
  try{ var _ft=document.getElementById('ftipo'); if(_ft) _ft.selectedIndex=0; }catch(e){}

  // ── Contador registros de vitales ──
  try{ var _rc=document.getElementById('reg-count'); if(_rc) _rc.textContent='0'; }catch(e){}

  // ── Balance hídrico: textos y barras ──
  try{ var _it=document.getElementById('ing-total');
    if(_it) _it.textContent='0 ml'; }catch(e){}
  try{ var _et2=document.getElementById('eg-total');
    if(_et2) _et2.textContent='0 ml'; }catch(e){}
  try{ var _bb=document.getElementById('bal-big');
    if(_bb){ _bb.textContent='+0 ml'; _bb.style.color='var(--green)'; } }catch(e){}
  try{ var _sbal=document.getElementById('st-bal');
    if(_sbal) _sbal.textContent='+0'; }catch(e){}
  try{ var _ssan=document.getElementById('st-sang');
    if(_ssan) _ssan.textContent='0'; }catch(e){}
  try{ var _sbr=document.getElementById('sang-bar');
    if(_sbr) _sbr.style.width='0%'; }catch(e){}
  try{ var _spc=document.getElementById('sang-pct');
    if(_spc) _spc.textContent='0 ml (0%)'; }catch(e){}
  // Limpiar color de borde del campo sangrado (queda rojo si había alerta)
  try{ var _egs=document.getElementById('eg-sang');
    if(_egs) _egs.style.borderColor=''; }catch(e){}

  // ── Diuresis / hora ──
  try{ var _dhr=document.getElementById('diu-hr');
    if(_dhr) _dhr.textContent='0.00 ml/kg/h'; }catch(e){}

  // ── VSC / Sangrado permisible — ocultar hasta que haya peso ──
  try{ var _vscl=document.getElementById('vsc-lbl');
    if(_vscl) _vscl.textContent='-- ml'; }catch(e){}
  try{ var _spl=document.getElementById('sp-lbl');
    if(_spl) _spl.textContent='-- ml'; }catch(e){}
  try{ var _spl2=document.getElementById('sp-lbl2');
    if(_spl2) _spl2.textContent='-- ml'; }catch(e){}

  // ── PAM display y barra ──
  // (calcLiq() ya corre arriba pero con peso vacío → NaN → mostramos defaults)
  try{ var _dvp=document.getElementById('dv-pam');
    if(_dvp) _dvp.textContent='--'; }catch(e){}
  try{ var _pb=document.getElementById('pam-bar');
    if(_pb) _pb.style.width='0%'; }catch(e){}

  // ── Horas de líquidos badge ──
  try{ var _lhc=document.getElementById('liq-hora-count');
    if(_lhc) _lhc.textContent='0 horas registradas'; }catch(e){}

  // ── Pantalla grande si está activa ──
  try{ if(typeof _bigScreenOn!=='undefined' && _bigScreenOn &&
          typeof updateBigScreen==='function') updateBigScreen(); }catch(e){}

  showToast('✅ Nuevo caso iniciado');
}

function _doNewPatient(){
  // Seguridad: autosave del caso actual si no es solo lectura
  if(!S._readOnly) {
    try{ if(hasCurrentData()) autoSave(true); }catch(e){ try{ autoSave(); }catch(_){} }
  }

  // Prefill médico e institución desde perfil
  var u = getUser();
  resetForNewCase();
  S._readOnly = false; // nuevo caso = editable
  if(u && u.nombre){ S.pac.med = u.nombre; }
  if(u && u.inst){ S.pac.inst = u.inst; }
  try{ updateTopbar(); }catch(e){}
  try{ hideLogin(); }catch(e){}
  try{ openPacModal(); }catch(e){}
}

function loginAndNew(){
  if(typeof showConfirm==='function' && hasCurrentData()){
    showConfirm('¿Iniciar nuevo paciente?', 'Se guardará automáticamente el caso actual y se reiniciará.', '➕ Nuevo', '#00e676', _doNewPatient);
  } else {
    _doNewPatient();
  }
}

// ── MODAL EDITAR LÍQUIDOS ──
var _editLiqIdx = -1;
function openEditLiq(idx){
  _editLiqIdx = idx;
  var r = (S.liqHora||[])[idx];
  if(!r) return;
  document.getElementById('el-nacl').value = r.nacl || 0;
  document.getElementById('el-hart').value = r.hart || 0;
  document.getElementById('el-col').value  = r.col  || 0;
  document.getElementById('el-pg').value   = r.pg   || 0;
  document.getElementById('el-med').value  = r.med  || 0;
  document.getElementById('el-otro').value = r.otro || 0;
  document.getElementById('el-sang').value = r.sang || 0;
  document.getElementById('el-diu').value  = r.diu  || 0;
  document.getElementById('el-trau').value = r.trau || 0;
  document.getElementById('el-ins').value  = r.ins  || 0;
  document.getElementById('el-bas').value  = r.bas  || 0;
  document.getElementById('el-oeg').value  = r.oeg  || 0;
  var titleEl = document.getElementById('edit-liq-title');
  if(titleEl) titleEl.textContent = '✏️ Editando ' + _liqHoraLabel(idx) + ' — ' + r.hora;
  document.getElementById('edit-liq-modal').style.display='block';
  document.body.style.overflow='hidden';
}
function closeEditLiq(){
  var m=document.getElementById('edit-liq-modal');
  if(m) m.style.display='none';
  document.body.style.overflow='';
}
function _renderLiqTable(){ renderLiqHoraTable(); renderLiqHoraBtns(); }
function saveLiqEdit(){
  if(_editLiqIdx<0) return;
  var gi = function(id){ return parseInt(document.getElementById(id).value)||0; };
  var nacl = gi('el-nacl'), hart = gi('el-hart'), col = gi('el-col');
  var pg   = gi('el-pg'),   med  = gi('el-med'), otro = gi('el-otro');
  var sang = gi('el-sang'), diu  = gi('el-diu'), trau = gi('el-trau');
  var ins  = gi('el-ins'),  bas  = gi('el-bas'), oeg  = gi('el-oeg');
  var r = S.liqHora[_editLiqIdx];
  if(!r) return;
  var totalIn = nacl+hart+col+pg+med+otro;
  var totalEg = sang+diu+trau+ins+bas+oeg;
  var balHr   = totalIn - totalEg;
  S.liqHora[_editLiqIdx] = {
    hora:r.hora, nacl:nacl, hart:hart, col:col, pg:pg, med:med, otro:otro,
    sang:sang, diu:diu, trau:trau, ins:ins, bas:bas, oeg:oeg,
    totalIn:totalIn, totalEg:totalEg, balHr:balHr, acum:0
  };
  // Recalcular acumulado en cascada para todas las filas
  var acum=0;
  S.liqHora.forEach(function(x,i){ acum += (x.balHr||0); S.liqHora[i].acum = acum; });
  closeEditLiq();
  renderLiqHoraTable(); renderLiqHoraBtns();
  try{ autoSave(); }catch(e){}
  try{ calcLiq(); }catch(e){}
  if(navigator.vibrate) navigator.vibrate(30);
}

// ── MODAL EDITAR VENTILADOR ──
var _editVentIdx = -1;
function openEditVent(idx){
  _editVentIdx = idx;
  var r=(S.ventHist||[])[idx];
  if(!r) return;
  document.getElementById('ev2-hora').value  = r.hora || '';
  document.getElementById('ev2-modo').value  = r.modo || '';
  document.getElementById('ev2-fio2').value  = r.fio2 || 0;
  document.getElementById('ev2-vc').value    = r.vc || 0;
  document.getElementById('ev2-fr').value    = r.fr || 0;
  document.getElementById('ev2-peep').value  = r.peep || 0;
  document.getElementById('ev2-ppeak').value = r.ppeak || 0;
  document.getElementById('ev2-etco2').value = r.etco2 || 0;
  document.getElementById('ev2-vm').value    = r.vm || 0;
  document.getElementById('edit-vent-modal').style.display='block';
  document.body.style.overflow='hidden';
}
function closeEditVent(){
  var m=document.getElementById('edit-vent-modal');
  if(m) m.style.display='none';
  document.body.style.overflow='';
}
function _renderVentTable(){
  var b=document.getElementById('vent-tbody');
  if(!b) return;
  if(!S.ventHist || !S.ventHist.length){
    b.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:16px">Sin registros</td></tr>';
    return;
  }
  b.innerHTML=S.ventHist.map(function(r,i){
    return '<tr onclick="openEditVent('+i+')" style="cursor:pointer">'
      + '<td class="hl">'+r.hora+'</td><td>'+r.modo+'</td><td>'+r.fio2+'%</td>'
      + '<td>'+r.vc+'</td><td>'+r.fr+'</td><td>'+r.peep+'</td>'
      + '<td class="'+(r.ppeak>30?'dc':'')+'">'+r.ppeak+'</td>'
      + '<td class="'+((r.etco2>45||r.etco2<30)?'wc':'')+'">'+r.etco2+'</td>'
      + '<td>'+r.vm+'</td>'
      + '<td style="color:var(--cyan);font-size:16px;text-align:center">✏️</td></tr>';
  }).join('');
  // Si existe el resumen ventilatorio del patch, lo vuelve a aplicar
  try{ if(window.renderVentTable) window.renderVentTable(); }catch(e){}
}
function saveVentEdit(){
  if(_editVentIdx<0) return;
  var r=S.ventHist[_editVentIdx];
  if(!r) return;
  var fio2=parseFloat(document.getElementById('ev2-fio2').value)||0;
  var vc=parseFloat(document.getElementById('ev2-vc').value)||0;
  var fr=parseFloat(document.getElementById('ev2-fr').value)||0;
  var peep=parseFloat(document.getElementById('ev2-peep').value)||0;
  var ppeak=parseFloat(document.getElementById('ev2-ppeak').value)||0;
  var etco2=parseFloat(document.getElementById('ev2-etco2').value)||0;
  var vm=parseFloat(document.getElementById('ev2-vm').value)|| (vc*fr/1000);
  // BUG-Q FIX: Preservar 'hal' (halogenado) del registro original — no expuesto en modal de edición
  S.ventHist[_editVentIdx] = {
    hora: document.getElementById('ev2-hora').value || r.hora,
    modo: document.getElementById('ev2-modo').value || r.modo,
    fio2:fio2, vc:vc, fr:fr, peep:peep, ppeak:ppeak, etco2:etco2, vm: vm.toFixed(1),
    hal: r.hal || ''
  };
  closeEditVent();
  _renderVentTable();
  try{ autoSave(); }catch(e){}
  if(navigator.vibrate) navigator.vibrate(30);
}

// ── MODAL EDIT FARM LEGACY (no usado): stubs para evitar errores ──
function closeEditFarm(){
  var m=document.getElementById('edit-farm-modal');
  if(m) m.style.display='none';
  document.body.style.overflow='';
}
function saveFarmEdit(){
  // Este modal legacy no se usa; evitar romper.
  closeEditFarm();
  try{ showToast('ℹ️ Usa el editor de fármacos (lista)'); }catch(e){}
}
function deleteFarmRow(){
  closeEditFarm();
  try{ showToast('ℹ️ Usa el editor de fármacos (lista)'); }catch(e){}
}


/* === FARM VIA SUMMARY PATCH v1 === */

/* === FARM VIA SUMMARY PATCH v1 ===
   Agrega al resumen de fármacos el desglose por VÍA (IV/IM/IT/etc.).
   - No suma dosis (unidades mixtas), solo cuenta administraciones por vía.
=== */
(function(){
  function addViaBreakdown(){
    try{
      if(!window.S || !S.farms || !S.farms.length) return;
      var list = document.getElementById('farm-list');
      if(!list) return;
      var box = list.querySelector('[data-summary="farms"]');
      if(!box) return;
      if(box.getAttribute('data-via') === '1') return; // idempotente

      // Conteo por vía
      var via = {};
      for(var i=0;i<S.farms.length;i++){
        var v = (S.farms[i].v || '—').trim();
        via[v] = (via[v]||0) + 1;
      }
      var vias = Object.keys(via).sort(function(a,b){ return via[b]-via[a]; });
      var viaHtml = vias.map(function(k){
        // Color semántico simple: IV verde, neuraxial/epidural amarillo, otros cyan
        var col = 'var(--cyan)';
        var kl = k.toLowerCase();
        if(kl==='iv') col='var(--green)';
        else if(kl.includes('epid') || kl.includes('it') || kl.includes('raqui') || kl.includes('espinal')) col='var(--yellow)';
        return '<span class="badge" style="margin-right:6px;color:'+col+'">'+k+': '+via[k]+'</span>';
      }).join(' ');

      var wrap = document.createElement('div');
      wrap.setAttribute('data-via','1');
      wrap.style.cssText = 'margin-top:8px;border-top:1px solid var(--border);padding-top:8px';
      wrap.innerHTML = '<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Por vía</div>'
        + (viaHtml || '<span style="color:var(--muted)">—</span>');

      box.appendChild(wrap);
      box.setAttribute('data-via','1');
    }catch(e){}
  }

  // Wrap renderFarms to always apply
  var _orig = window.renderFarms;
  if(typeof _orig === 'function'){
    window.renderFarms = function(){
      _orig();
      addViaBreakdown();
    };
  }

  // Apply on load and after restoreState
  window.addEventListener('load', function(){ setTimeout(addViaBreakdown, 50); });
  var _restore = window.restoreState;
  if(typeof _restore === 'function'){
    window.restoreState = function(caso){
      _restore(caso);
      setTimeout(addViaBreakdown, 50);
    };
  }
})();



// ═══════════════════════════════════════════════════════════════
