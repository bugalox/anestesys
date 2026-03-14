// EDITAR SIGNO VITAL
// ═══════════════════════════════════════════════════════════════
var _editVitalIdx = -1;

function openEditVital(idx) {
  _editVitalIdx = idx;
  var r = S.history[idx];
  if (!r) return;
  document.getElementById('ev-hora').value  = r.hora  || '';
  document.getElementById('ev-tas').value   = r.tas   || '';
  document.getElementById('ev-tad').value   = r.tad   || '';
  document.getElementById('ev-pam').value   = r.pam   || Math.round(r.tad + (r.tas - r.tad) / 3);
  document.getElementById('ev-fc').value    = r.fc    || '';
  document.getElementById('ev-fr').value    = r.fr    || '';
  document.getElementById('ev-spo2').value  = r.spo2  || '';
  document.getElementById('ev-temp').value  = r.temp  || '';
  document.getElementById('ev-nota').value  = r.nota  || '';
  document.getElementById('edit-vital-modal').style.display = 'block';
}

function closeEditVital() {
  document.getElementById('edit-vital-modal').style.display = 'none';
}

function saveVitalEdit() {
  if (_editVitalIdx < 0) return;
  var tas = parseInt(document.getElementById('ev-tas').value) || 0;
  var tad = parseInt(document.getElementById('ev-tad').value) || 0;
  var pam = parseInt(document.getElementById('ev-pam').value) || Math.round(tad + (tas - tad) / 3);
  S.history[_editVitalIdx] = {
    hora:  document.getElementById('ev-hora').value,
    tas:   tas, tad: tad, pam: pam,
    fc:    parseInt(document.getElementById('ev-fc').value)   || 0,
    fr:    parseInt(document.getElementById('ev-fr').value)   || 0,
    spo2:  parseInt(document.getElementById('ev-spo2').value) || 0,
    temp:  parseFloat(document.getElementById('ev-temp').value) || 0,
    nota:  document.getElementById('ev-nota').value.trim(),
    // FIX K: Preservar etco2 y bis del registro original (el modal no los edita)
    etco2: (S.history[_editVitalIdx] || {}).etco2,
    bis:   (S.history[_editVitalIdx] || {}).bis
  };
  closeEditVital();
  renderVitalTable();
  drawChart();
  autoSave();
  if (navigator.vibrate) navigator.vibrate(30);
}

// ═══════════════════════════════════════════════════════════════
