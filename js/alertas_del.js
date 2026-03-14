// ELIMINAR ALERTA
// ═══════════════════════════════════════════════════════════════
function deleteAlert(idx) {
  S.alerts.splice(idx, 1);
  // FIX E2: Usar _renderAlertList centralizado con indices frescos
  _renderAlertList();
  autoSave();
}

// Auto-save every 90 seconds
// FIX SAVE-2: 90s→45s, incluye ventHist+liqHora como condición
setInterval(function(){
  if(!S._readOnly&&(S.pac.nombre||S.history.length||S.farms.length||S.ventHist.length||S.liqHora.length))
    try{autoSave();}catch(e){}
}, 45000);

