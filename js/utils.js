// UTILS
// ═══════════════════════════════════════════════
function getT(){return new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false});}

// Request notifications
if('Notification' in window) Notification.requestPermission();

// Periodic recalc
setInterval(calcLiq, 60000);
setInterval(calcVentDerived, 10000);

// ═══════════════════════════════════════════════════════════════
