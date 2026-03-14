// PHASES
// ═══════════════════════════════════════════════
function timeStrToDate(hhmm) {
  // FIX M: Guard contra valor vacío o sin ':' — evita crash en .split
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return new Date();
  const [hh,mm] = hhmm.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return new Date();
  const d = new Date();
  d.setHours(hh,mm,0,0);
  return d;
}

function startPhase(p) {
  const hora = getT();
  const now  = new Date();
  if(p === 'an') {
    S.phases.an = now;
    document.getElementById('ph-an').className    = 'phase-pill active-phase';
    document.getElementById('ph-an-t').textContent = hora;
    document.getElementById('time-an').value       = hora;
    document.getElementById('btn-an').style.background = 'var(--green)';
    document.getElementById('btn-an').textContent  = '✓ Anestesia';
    addAlert('info', '▶ Anestesia iniciada: ' + hora, hora);
    requestWakeLock();
  } else if(p === 'cx') {
    S.phases.cx = now;
    document.getElementById('ph-cx').className    = 'phase-pill active-phase';
    document.getElementById('ph-cx-t').textContent = hora;
    document.getElementById('time-cx').value       = hora;
    document.getElementById('btn-cx').style.background = 'var(--green)';
    document.getElementById('btn-cx').textContent  = '✓ Cirugía';
    addAlert('info', '🔪 Cirugía iniciada: ' + hora, hora);
  }
  if(navigator.vibrate) navigator.vibrate([50,30,50]);
  try { autoSave(); } catch(e) {}
}

// ── Finalizar cronómetro independiente (an o cx) ──
function endPhase(p) {
  const hora = getT();
  const now  = new Date();

  if(p === 'an') {
    if(!S.phases.an) { showToast('⚠️ Primero inicia anestesia'); return; }
    S.phases.finAn = now;
    var totalMs = now - S.phases.an;
    document.getElementById('time-fin-an').value        = hora;
    document.getElementById('dur-fin-an').textContent   = fmt2(totalMs);
    document.getElementById('btn-fin-an').style.background = 'var(--muted)';
    document.getElementById('btn-fin-an').textContent   = '✓ Fin anest.';
    document.getElementById('ph-rec').className         = 'phase-pill done';
    document.getElementById('ph-rec-t').textContent     = hora;
    // Congelar el display de anestesia
    S._frozenTan = totalMs;
    addAlert('info', '■ Fin anestesia: ' + hora + ' · Total: ' + fmt2(totalMs), hora);
    releaseWakeLock();

  } else if(p === 'cx') {
    if(!S.phases.cx) { showToast('⚠️ Primero inicia cirugía'); return; }
    S.phases.finCx = now;
    // FIX N: totalMs re-asignado (no re-declarado) para evitar hoisting issues en strict mode
    totalMs = now - S.phases.cx;
    document.getElementById('time-fin-cx').value        = hora;
    document.getElementById('dur-fin-cx').textContent   = fmt2(totalMs);
    document.getElementById('btn-fin-cx').style.background = 'var(--muted)';
    document.getElementById('btn-fin-cx').textContent   = '✓ Fin cx';
    // Congelar el display de cirugía
    S._frozenTcx = totalMs;
    addAlert('info', '🔪 Fin cirugía: ' + hora + ' · Total: ' + fmt2(totalMs), hora);
  }

  // Si ambas terminaron → cerrar isquemia si está activa
  if(S.phases.finAn && S.phases.finCx) {
    if(S.phases.isqIni && !S.phases.isqFin) {
      S.phases.isqFin = now;
      _updateIsqUI();
    }
  }
  if(navigator.vibrate) navigator.vibrate([50,30,50]);
  try { autoSave(); } catch(e) {}
}

// ── editar hora de FIN manualmente ──
function editEndPhaseTime(p, val) {
  if(!val) return;
  const d = timeStrToDate(val);
  if(p === 'an') {
    S.phases.finAn = d;
    if(S.phases.an) {
      var ms = d - S.phases.an;
      S._frozenTan = ms;
      document.getElementById('dur-fin-an').textContent = fmt2(ms);
    }
  } else if(p === 'cx') {
    S.phases.finCx = d;
    if(S.phases.cx) {
      var ms = d - S.phases.cx;
      S._frozenTcx = ms;
      document.getElementById('dur-fin-cx').textContent = fmt2(ms);
    }
  }
}

// Reset all timers and phases
function resetCronometros() {
  showConfirm('¿Reiniciar cronómetros?', 'Las fases se borran. Los vitales y fármacos se conservan.', '🔄 Reiniciar', '#ff6d00', _doResetCronometros);
}
function _doResetCronometros() {
  // BUG-L FIX: 'fin' phase removida del modelo de datos — no incluir
  S.phases = {an: null, finAn: null, cx: null, finCx: null, isqIni: null, isqFin: null};
  S._frozenTan = null; S._frozenTcx = null;
  S.hrAlarms = [];
  // Reset isquemia UI
  // Reset fin buttons
  var bFA=document.getElementById('btn-fin-an'); if(bFA){bFA.style.background='var(--red)';bFA.textContent='■ Fin anest.';}
  var bFC=document.getElementById('btn-fin-cx'); if(bFC){bFC.style.background='var(--red)';bFC.textContent='■ Fin cx';}
  var dFA=document.getElementById('dur-fin-an'); if(dFA) dFA.textContent='--:--';
  var dFC=document.getElementById('dur-fin-cx'); if(dFC) dFC.textContent='--:--';
  var tFA=document.getElementById('time-fin-an'); if(tFA) tFA.value='';
  var tFC=document.getElementById('time-fin-cx'); if(tFC) tFC.value='';
  var biIni=document.getElementById('btn-isq-ini');
  var biEnd=document.getElementById('btn-isq-fin');
  var tiIni=document.getElementById('time-isq-ini');
  var tiFin=document.getElementById('time-isq-fin');
  var dIsq=document.getElementById('dur-isq');
  var dIsqT=document.getElementById('dur-isq-total');
  if(biIni){biIni.style.background='var(--yellow)';biIni.textContent='▶ Inicio';biIni.disabled=false;}
  if(biEnd){biEnd.style.background='var(--orange)';biEnd.textContent='■ Fin';}
  if(tiIni) tiIni.value='';
  if(tiFin) tiFin.value='';
  if(dIsq)  dIsq.textContent='--:--';
  if(dIsqT) dIsqT.textContent='--:--';
  // Reset displays
  ['an','cx','rec'].forEach(function(p) {
    const el = document.getElementById('ph-' + p);
    if (el) el.className = 'phase-pill';
    const tel = document.getElementById('ph-' + p + '-t');
    if (tel) tel.textContent = '--:--';
  });
  document.getElementById('st-tan').textContent = '--:--';
  document.getElementById('st-tcx').textContent = '--:--';
  document.getElementById('st-alarm').textContent = '60:00';
  document.getElementById('alarm-big').textContent = '60:00';
  document.getElementById('dur-an').textContent = '--:--';
  document.getElementById('dur-cx').textContent = '--:--';
  ['time-an','time-cx'].forEach(function(id) {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['btn-an','btn-cx','btn-fin'].forEach(function(id) {
    const el = document.getElementById(id); if (!el) return;
    if (id === 'btn-an')  { el.style.background = 'var(--cyan)';  el.textContent = '▶ Inicio Anest.'; }
    if (id === 'btn-cx')  { el.style.background = 'var(--orange)'; el.textContent = '▶ Inicio Cx'; }
    if (id === 'btn-fin') { el.style.background = 'var(--red)';    el.textContent = '■ Finalizar'; }
  });
  addAlert('info', '🔄 Cronómetros reiniciados', getT());
  if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
}

// Allow manually editing phase times
function editPhaseTime(p, val) {
  if(!val) return;
  const d = timeStrToDate(val);
  if(p==='an'){ S.phases.an=d; document.getElementById('ph-an-t').textContent=val; }
  else if(p==='cx'){ S.phases.cx=d; document.getElementById('ph-cx-t').textContent=val; }
  // BUG-M FIX: 'fin' phase eliminada — se usa finAn para marcar fin de anestesia
  else if(p==='finAn'){ S.phases.finAn=d; document.getElementById('ph-rec-t').textContent=val; }
}


// ═══════════════════════════════════════════════
// ISQUEMIA / TORNIQUETE
// ═══════════════════════════════════════════════
function startIsquemia() {
  const now  = new Date();
  const hora = getT();
  S.phases.isqIni = now;
  S.phases.isqFin = null;
  var tIni = document.getElementById('time-isq-ini');
  var bIni = document.getElementById('btn-isq-ini');
  var bFin = document.getElementById('btn-isq-fin');
  if(tIni) tIni.value = hora;
  if(bIni) { bIni.style.background='var(--green)'; bIni.textContent='✓ Torniquete'; }
  if(bFin) { bFin.style.background='var(--orange)'; bFin.disabled=false; }
  addAlert('warn','🩺 Torniquete / Isquemia iniciada: '+hora, hora);
  if(navigator.vibrate) navigator.vibrate([80,40,80]);
  autoSave();
}

function stopIsquemia() {
  if(!S.phases.isqIni) { showToast('⚠️ Primero inicia el torniquete'); return; }
  const now  = new Date();
  const hora = getT();
  S.phases.isqFin = now;
  var tFin = document.getElementById('time-isq-fin');
  var bFin = document.getElementById('btn-isq-fin');
  var bIni = document.getElementById('btn-isq-ini');
  if(tFin) tFin.value = hora;
  if(bFin) { bFin.style.background='var(--muted)'; bFin.textContent='✓ Fin torniquete'; }
  if(bIni) bIni.disabled = true;
  const totalMs = S.phases.isqFin - S.phases.isqIni;
  var dTot = document.getElementById('dur-isq-total');
  if(dTot) dTot.textContent = fmt2(totalMs);
  addAlert('info','🩺 Torniquete liberado: '+hora+' · Isquemia: '+fmt2(totalMs), hora);
  if(navigator.vibrate) navigator.vibrate([50,30,50]);
  autoSave();
}

function editIsquemiaTime(tipo, val) {
  if(!val) return;
  const d = timeStrToDate(val);
  if(tipo === 'ini') {
    S.phases.isqIni = d;
    var bIni = document.getElementById('btn-isq-ini');
    if(bIni) { bIni.style.background='var(--green)'; bIni.textContent='✓ Torniquete'; }
  } else {
    S.phases.isqFin = d;
    if(S.phases.isqIni) {
      var dTot = document.getElementById('dur-isq-total');
      if(dTot) dTot.textContent = fmt2(S.phases.isqFin - S.phases.isqIni);
    }
  }
}

function _updateIsqUI() {
  var tIni = document.getElementById('time-isq-ini');
  var tFin = document.getElementById('time-isq-fin');
  var bIni = document.getElementById('btn-isq-ini');
  var bFin = document.getElementById('btn-isq-fin');
  var dTot = document.getElementById('dur-isq-total');
  if(S.phases.isqIni) {
    var h = S.phases.isqIni;
    if(tIni) tIni.value = String(h.getHours()).padStart(2,'0')+':'+String(h.getMinutes()).padStart(2,'0');
    if(bIni) { bIni.style.background='var(--green)'; bIni.textContent='✓ Torniquete'; }
  }
  if(S.phases.isqFin) {
    var h2 = S.phases.isqFin;
    if(tFin) tFin.value = String(h2.getHours()).padStart(2,'0')+':'+String(h2.getMinutes()).padStart(2,'0');
    if(bFin) { bFin.style.background='var(--muted)'; bFin.textContent='✓ Fin torniquete'; }
    if(bIni) bIni.disabled = true;
    if(dTot && S.phases.isqIni) dTot.textContent = fmt2(S.phases.isqFin - S.phases.isqIni);
  }
}

function _tickIsquemia(now) {
  var dIsq  = document.getElementById('dur-isq');
  if(!dIsq) return;
  if(S.phases.isqIni && !S.phases.isqFin) {
    // Activo — mostrar tiempo corriendo
    var ms = now - S.phases.isqIni;
    dIsq.textContent = fmt2(ms);
    // Alerta si >60 min sin liberar
    if(ms > 60*60*1000) dIsq.style.color='var(--red)';
    else if(ms > 45*60*1000) dIsq.style.color='var(--orange)';
    else dIsq.style.color='var(--yellow)';
  } else if(S.phases.isqIni && S.phases.isqFin) {
    // Ya terminó — mostrar tiempo total fijo
    dIsq.textContent = fmt2(S.phases.isqFin - S.phases.isqIni);
    dIsq.style.color='var(--muted)';
  }
}

// ═══════════════════════════════════════════════
// HOURLY BUCKETS (accumulate per hour)
// ═══════════════════════════════════════════════
// S.hourBuckets = { "Hora 1": {farms:[], liqIn:0, liqEg:0, sang:0, diu:0}, ... }
S.hourBuckets = {};

function getCurrentHourLabel() {
  if(!S.phases.an) return 'Hora 0';
  const el = Math.floor((new Date()-S.phases.an)/3600000);
  return 'Hora '+(el+1);
}

function addToHourBucket(type, data) {
  const lbl = getCurrentHourLabel();
  if(!S.hourBuckets[lbl]) S.hourBuckets[lbl]={farms:[],liqIn:0,liqEg:0,sang:0,diu:0,vitals:[]};
  if(type==='farm') S.hourBuckets[lbl].farms.push(data);
  if(type==='liq') { S.hourBuckets[lbl].liqIn+=data.in||0; S.hourBuckets[lbl].liqEg+=data.eg||0; S.hourBuckets[lbl].sang+=data.sang||0; S.hourBuckets[lbl].diu+=data.diu||0; }
  if(type==='vital') S.hourBuckets[lbl].vitals.push(data);
  renderHourBuckets();
}

function renderHourBuckets() {
  // Render in liquidos page
  const el = document.getElementById('hour-buckets');
  if(!el) return;
  const hrs = Object.keys(S.hourBuckets);
  if(!hrs.length){el.innerHTML='<div style="text-align:center;color:var(--muted);padding:16px;font-size:13px">Sin registros horarios aún</div>';return;}
  el.innerHTML = hrs.map(hr => {
    const b = S.hourBuckets[hr];
    return `<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:800;color:var(--cyan);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${hr}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-bottom:8px">
        <div style="background:var(--s2);border-radius:6px;padding:6px 8px"><span style="color:var(--muted);font-size:10px;display:block">Ingresos IV</span><b style="color:var(--green)">${b.liqIn} ml</b></div>
        <div style="background:var(--s2);border-radius:6px;padding:6px 8px"><span style="color:var(--muted);font-size:10px;display:block">Sangrado</span><b style="color:var(--red)">${b.sang} ml</b></div>
        <div style="background:var(--s2);border-radius:6px;padding:6px 8px"><span style="color:var(--muted);font-size:10px;display:block">Diuresis</span><b style="color:var(--cyan)">${b.diu} ml</b></div>
        <div style="background:var(--s2);border-radius:6px;padding:6px 8px"><span style="color:var(--muted);font-size:10px;display:block">Balance hr</span><b style="color:${b.liqIn-(b.sang+b.diu)>=0?'var(--green)':'var(--yellow)'}">${b.liqIn-(b.sang+b.diu)>=0?'+':''}${b.liqIn-(b.sang+b.diu)} ml</b></div>
      </div>
      ${b.farms.length?`<div style="font-size:10px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Fármacos (${b.farms.length})</div>${b.farms.map(f=>`<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">${f.h} — <b>${f.n}</b> ${f.d} ${f.v}</div>`).join('')}`:''}
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
