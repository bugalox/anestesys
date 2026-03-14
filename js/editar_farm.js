// EDITAR FÁRMACO
// ═══════════════════════════════════════════════════════════════
var _editFarmIdx = -1;

function openEditFarm2(idx) {
  _editFarmIdx = idx;
  var f = S.farms[idx];
  if (!f) return;
  document.getElementById('ef2-nombre').value = f.n    || '';
  document.getElementById('ef2-dosis').value  = f.d    || '';
  document.getElementById('ef2-via').value    = f.v    || '';
  document.getElementById('ef2-hora').value   = f.h    || '';
  document.getElementById('ef2-nota').value   = f.nota || '';
  document.getElementById('edit-farm-modal2').style.display = 'block';
}

function closeEditFarm2() {
  document.getElementById('edit-farm-modal2').style.display = 'none';
}

function saveFarm2() {
  if (_editFarmIdx < 0) return;
  var _origFarm = S.farms[_editFarmIdx] || {};
  // FIX I: Preservar tipo y vel — el modal de edición no los expone, no borrarlos
  S.farms[_editFarmIdx] = {
    n:    document.getElementById('ef2-nombre').value.trim(),
    d:    document.getElementById('ef2-dosis').value.trim(),
    v:    document.getElementById('ef2-via').value.trim(),
    h:    document.getElementById('ef2-hora').value,
    nota: document.getElementById('ef2-nota').value.trim(),
    tipo: _origFarm.tipo || 'Bolo',
    vel:  _origFarm.vel  || ''
  };
  closeEditFarm2();
  renderFarms();
  autoSave();
  if (navigator.vibrate) navigator.vibrate(30);
}


// ═══════════════════════════════════════════════════════════════
