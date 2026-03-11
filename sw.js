// ═══════════════════════════════════════════════════════════
// AnesteSys — Service Worker v1.1
// Maneja notificaciones en background (app cerrada)
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'anestesys-v1';

// ── Instalar SW ──
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// ── Activar SW ──
self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

// ── Recibir mensaje desde la app para programar notificación ──
self.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_REMINDER') {
    var ct  = e.data.cita;
    var ms  = e.data.ms;
    if (!ct || ms <= 0) return;

    // Guardar en IndexedDB
    try {
      var dbReq = indexedDB.open('ag_reminders', 1);
      dbReq.onupgradeneeded = function(ev) {
        ev.target.result.createObjectStore('reminders', {keyPath:'id'});
      };
      dbReq.onsuccess = function(ev) {
        var db = ev.target.result;
        var tx = db.transaction('reminders','readwrite');
        tx.objectStore('reminders').put({
          id:    ct.id,
          cita:  ct,
          fireAt: Date.now() + ms
        });
      };
    } catch(err) {}

    setTimeout(function() {
      _fireNotification(ct);
      _deleteReminder(ct.id);
    }, ms);
  }

  if (e.data.type === 'CANCEL_REMINDER') {
    _deleteReminder(e.data.citaId);
  }
});

// ── Al activar SW: revisar recordatorios pendientes en IndexedDB ──
self.addEventListener('activate', function(e) {
  e.waitUntil(_checkPendingReminders());
});

function _checkPendingReminders() {
  return new Promise(function(resolve) {
    try {
      var dbReq = indexedDB.open('ag_reminders', 1);
      dbReq.onupgradeneeded = function(ev) {
        ev.target.result.createObjectStore('reminders', {keyPath:'id'});
      };
      dbReq.onsuccess = function(ev) {
        var db  = ev.target.result;
        var tx  = db.transaction('reminders','readwrite');
        var str = tx.objectStore('reminders');
        str.getAll().onsuccess = function(ev2) {
          var items = ev2.target.result || [];
          var now   = Date.now();
          items.forEach(function(item) {
            var ms = item.fireAt - now;
            if (ms <= 0) {
              _fireNotification(item.cita);
              str.delete(item.id);
            } else if (ms < 86400000) {
              setTimeout(function() {
                _fireNotification(item.cita);
                _deleteReminder(item.id);
              }, ms);
            } else {
              str.delete(item.id);
            }
          });
          resolve();
        };
      };
      dbReq.onerror = function() { resolve(); };
    } catch(e) { resolve(); }
  });
}

function _fireNotification(ct) {
  if (!ct) return;

  var iconosTipo = {
    cirugia:     '🔪',
    consulta:    '🩺',
    seguimiento: '📋',
    urgencia:    '🚨',
    revision:    '🔬',
    otro:        '📌'
  };
  var nombresTipo = {
    cirugia:'Cirugía', consulta:'Consulta', seguimiento:'Seguimiento',
    urgencia:'Urgencia', revision:'Revisión', otro:'Cita'
  };

  var pacN  = (ct.pacNombre && ct.pacNombre !== 'undefined') ? ct.pacNombre : 'Paciente';
  var tipo  = nombresTipo[ct.tipo] || ct.tipo || 'Cita';
  var icono = iconosTipo[ct.tipo]  || '📅';
  var hora  = ct.hora  || '--:--';
  var sala  = ct.sala  ? ' · ' + ct.sala : '';
  var dx    = ct.pacDx ? ct.pacDx : tipo;

  // Calcular tiempo restante desde ahora hasta la cita
  var tiempoRestante = '';
  if (ct.fecha && ct.hora) {
    var diff = new Date(ct.fecha + 'T' + ct.hora + ':00').getTime() - Date.now();
    if (diff > 0) {
      var mins = Math.round(diff / 60000);
      if (mins < 60)        tiempoRestante = 'en ' + mins + ' min';
      else if (mins < 120)  tiempoRestante = 'en 1 hora';
      else                  tiempoRestante = 'en ' + Math.round(mins/60) + ' horas';
    }
  }

  // Título: tipo + tiempo restante
  var title = icono + ' ' + tipo + (tiempoRestante ? '  —  ' + tiempoRestante : '');

  // Cuerpo: paciente + dx + hora + sala
  var body  = '👤 ' + pacN
            + '\n' + dx
            + '\n🕐 ' + hora + sala;

  if (ct.pacEdad) {
    var unidad = ct.pacEdadUnit === 'meses' ? 'm' : ct.pacEdadUnit === 'dias' ? 'd' : ct.pacEdadUnit === 'semanas' ? 'sem' : 'a';
    body += '  ·  ' + ct.pacEdad + ' ' + unidad;
  }

  self.registration.showNotification(title, {
    body:               body,
    icon:               '/anestesys/icon.svg',
    badge:              '/anestesys/icon.svg',
    tag:                'ag-' + ct.id,
    requireInteraction: true,
    vibrate:            [300, 100, 300, 100, 300, 200, 500],
    data:               { citaId: ct.id, url: 'https://bugalox.github.io/anestesys/' }
  });
}

function _deleteReminder(id) {
  try {
    var dbReq = indexedDB.open('ag_reminders', 1);
    dbReq.onsuccess = function(ev) {
      var db = ev.target.result;
      db.transaction('reminders','readwrite').objectStore('reminders').delete(id);
    };
  } catch(e) {}
}

// ── Click en notificación → abrir/enfocar la app ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('bugalox.github.io') >= 0) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow('https://bugalox.github.io/anestesys/');
    })
  );
});
