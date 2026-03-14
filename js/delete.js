// DELETE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function deleteCaso(id) {
  showConfirm(
    '¿Eliminar este caso?',
    'Se elimina del historial permanentemente',
    '🗑 Eliminar', '#ff1744',
    function() {
      var cat = 'privado';
      // Find which category this case belongs to
      if(getCasos('hospital').some(function(c){return c.id===id;})) cat = 'hospital';
      var casos = getCasos(cat).filter(function(c){ return c.id !== id; });
      saveCasos(casos, cat);
      if (S._casoId === id) S._casoId = null;
      refreshHistorial();
      showToast('🗑 Caso eliminado');
    }
  );
}

function deleteVitalRow() {
  if (_editVitalIdx < 0) return;
  var hora = (S.history[_editVitalIdx] || {}).hora || '';
  showConfirm(
    '¿Eliminar registro de vitales?',
    'Hora: ' + hora,
    '🗑 Eliminar', '#ff1744',
    function() {
      S.history.splice(_editVitalIdx, 1);
      closeEditVital();
      renderVitalTable();
      try { drawChart(); } catch(e) {}
      autoSave();
      if (navigator.vibrate) navigator.vibrate([50,30,50]);
    }
  );
}

function deleteFarm2() {
  if (_editFarmIdx < 0) return;
  var f = S.farms[_editFarmIdx] || {};
  showConfirm(
    '¿Eliminar ' + (f.n || 'este fármaco') + '?',
    (f.d || '') + (f.v ? ' · ' + f.v : ''),
    '🗑 Eliminar', '#ff1744',
    function() {
      S.farms.splice(_editFarmIdx, 1);
      closeEditFarm2();
      renderFarms();
      var st = document.getElementById('st-fm');
      if (st) st.textContent = S.farms.length;
      autoSave();
      if (navigator.vibrate) navigator.vibrate([50,30,50]);
    }
  );
}

function deleteLiqRow() {
  if (_editLiqIdx < 0) return;
  var hora = (S.liqHora[_editLiqIdx] || {}).hora || '';
  showConfirm(
    '¿Eliminar registro de hora?',
    'Hora: ' + hora,
    '🗑 Eliminar', '#ff1744',
    function() {
      S.liqHora.splice(_editLiqIdx, 1);
      var acum = 0;
      S.liqHora.forEach(function(r, i) { acum += r.balHr; S.liqHora[i].acum = acum; });
      closeEditLiq();
      renderLiqHoraTable();
      renderLiqHoraBtns();
      autoSave();
      if (navigator.vibrate) navigator.vibrate([50,30,50]);
    }
  );
}

function deleteVentRow() {
  if (_editVentIdx < 0) return;
  var hora = (S.ventHist[_editVentIdx] || {}).hora || '';
  showConfirm(
    '¿Eliminar registro de ventilador?',
    'Hora: ' + hora,
    '🗑 Eliminar', '#ff1744',
    function() {
      S.ventHist.splice(_editVentIdx, 1);
      closeEditVent();
      var tb = document.getElementById('vent-tbody');
      if (tb) {
        if (!S.ventHist.length) {
          tb.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:16px">Sin registros</td></tr>';
        } else {
          tb.innerHTML = S.ventHist.map(function(r, i) {
            return '<tr onclick="openEditVent(' + i + ')" style="cursor:pointer">'
              + '<td class="hl">' + r.hora + '</td><td>' + r.modo + '</td><td>' + r.fio2 + '%</td>'
              + '<td>' + r.vc + '</td><td>' + r.fr + '</td><td>' + r.peep + '</td>'
              + '<td class="' + (r.ppeak > 30 ? 'dc' : '') + '">' + r.ppeak + '</td>'
              + '<td class="' + (r.etco2 > 45 || r.etco2 < 30 ? 'wc' : '') + '">' + r.etco2 + '</td>'
              + '<td>' + r.vm + '</td>'
              + '<td style="color:var(--cyan);font-size:16px;text-align:center">✏️</td></tr>';
          }).join('');
        }
      }
      autoSave();
      if (navigator.vibrate) navigator.vibrate([50,30,50]);
    }
  );
}

// ═══════════════════════════════════════════════════════════════
