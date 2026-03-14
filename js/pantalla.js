// PANTALLA GRANDE
// ═══════════════════════════════════════════════
var _bigScreenOn = false;
function toggleBigScreen() {
  _bigScreenOn = !_bigScreenOn;
  var ov = document.getElementById('bigscreen-overlay');
  if(!ov) return;
  ov.style.display = _bigScreenOn ? 'flex' : 'none';
  if(_bigScreenOn) updateBigScreen();
}

function updateBigScreen() {
  if(!_bigScreenOn) return;
  var nombre = document.getElementById('bs-nombre');
  var ta     = document.getElementById('bs-ta');
  var fc     = document.getElementById('bs-fc');
  var spo2   = document.getElementById('bs-spo2');
  var etco2  = document.getElementById('bs-etco2');
  var pam    = document.getElementById('bs-pam');
  var timer  = document.getElementById('bs-timer');
  if(nombre) nombre.textContent = S.pac.nombre || 'Sin paciente';
  if(ta)     ta.textContent = (S.vitals.tas||'--') + '/' + (S.vitals.tad||'--');
  if(fc)     { fc.textContent = S.vitals.fc||'--'; fc.style.color = (S.vitals.fc>120||S.vitals.fc<45)?'var(--red)':'var(--orange)'; }
  if(spo2)   { spo2.textContent = S.vitals.spo2||'--'; spo2.style.color = S.vitals.spo2<92?'var(--red)':'var(--green)'; }
  if(etco2)  etco2.textContent = S.etco2||'--';
  if(pam)    pam.textContent = Math.round((S.vitals.tad||0)+((S.vitals.tas||0)-(S.vitals.tad||0))/3)||'--';
  if(timer)  timer.textContent = document.getElementById('st-tan') ? document.getElementById('st-tan').textContent : '--:--';
}

function flashBigScreen() {
  var ov = document.getElementById('bigscreen-overlay');
  if(!ov) return;
  ov.style.background = '#003322';
  setTimeout(function(){ ov.style.background = '#000'; }, 300);
  showToast('✅ Punto registrado');
}

// ═══════════════════════════════════════════════
// CONFIRMACIÓN VISUAL registro
// ═══════════════════════════════════════════════
var _origRegistrar = registrar;
registrar = function() {
  _origRegistrar();
  updateBigScreen();
  // Flash the register button green
  var btn = document.getElementById('btn-registrar');
  if(btn) {
    var origBg = btn.style.background;
    btn.style.background = 'var(--green)';
    btn.textContent = '✅ ¡Registrado!';
    setTimeout(function(){
      btn.style.background = '';
      btn.textContent = '📌 Registrar Punto';
    }, 1200);
  }
};


// ═══════════════════════════════════════════════
