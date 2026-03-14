// HOURLY ALARM
// ═══════════════════════════════════════════════
function fireHrAlarm(hr) {
  const msg='🔔 HORA '+hr+' de anestesia — Revisar: líquidos, vitales, fármacos';
  addAlert('warn', msg, getT());
  // Auto-snapshot de líquidos a esta hora
  try { forceHourSnapshot(); } catch(e) {}
  // Visual alarm
  var ab = document.getElementById('alarm-box');
  if(ab) { ab.classList.add('ringing'); setTimeout(function(){ ab.classList.remove('ringing'); }, 4000); }
  // Push notification
  if('Notification' in window && Notification.permission==='granted') {
    try { new Notification('AnesteSys — Hora '+hr, {body:msg, icon:'', tag:'hr-alarm'}); } catch(e){}
  }
  // Vibrate SOS pattern
  if(navigator.vibrate) navigator.vibrate([300,100,300,100,300,500,100,100,100,100,100,500]);
  // Show alarm toast
  showToast('🔔 HORA '+hr+' — Revisar líquidos y vitales');
}

// ═══════════════════════════════════════════════
