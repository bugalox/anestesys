// ALERTS
// ═══════════════════════════════════════════════
function _renderAlertList() {
  // FIX E: Render centralizado con índices frescos para evitar stale closures
  var el = document.getElementById('alert-list');
  if (!el) return;
  el.innerHTML = '';
  // Mostrar más reciente primero (ya que push agrega al final, invertir)
  var reversed = S.alerts.slice().reverse();
  reversed.forEach(function(a, ri) {
    // Índice real en S.alerts = S.alerts.length - 1 - ri
    var realIdx = S.alerts.length - 1 - ri;
    var div = document.createElement('div');
    div.className = 'alert ' + a.type;
    var ic = a.type==='danger' ? '🚨' : a.type==='warn' ? '⚠️' : 'ℹ️';
    div.style.cssText = 'display:flex;align-items:center;gap:8px';
    div.innerHTML = '<span class="alert-icon">'+ic+'</span>'
      + '<div style="flex:1"><div>'+a.msg+'</div><span class="alert-time">'+a.hora+'</span></div>'
      + '<button onclick="deleteAlert('+realIdx+')" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 8px;flex-shrink:0">🗑</button>';
    el.appendChild(div);
  });
  var b = document.getElementById('alert-badge');
  // FIX D: Contar danger+warn (no solo danger) para el badge
  var cnt = S.alerts.filter(function(a){ return a.type!=='info'; }).length;
  if (b) { b.textContent = cnt; b.style.display = cnt ? 'inline' : 'none'; }
}
function addAlert(type,msg,hora) {
  S.alerts.push({type,msg,hora});
  _renderAlertList();
  try { debounceSave(); } catch(e) {}
}
function clearAlerts() {S.alerts=[]; _renderAlertList(); /* FIX F: usa render centralizado */}
function saveAlarmCfg() {
  S.alarmCfg={tHi:+document.getElementById('lim-thi').value,tLo:+document.getElementById('lim-tlo').value,
    fHi:+document.getElementById('lim-fhi').value,fLo:+document.getElementById('lim-flo').value,
    sLo:+document.getElementById('lim-slo').value,tpHi:+document.getElementById('lim-tphi').value};
  addAlert('info','✓ Límites de alarma actualizados',getT());
}

// ═══════════════════════════════════════════════
