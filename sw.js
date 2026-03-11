// ═══════════════════════════════════════════════════════════
// AnesteSys — Service Worker v1.0
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

  // Programar recordatorio
  if (e.data.type === 'SCHEDULE_REMINDER') {
    var ct  = e.data.cita;
    var ms  = e.data.ms;  // milisegundos hasta disparar
    if (!ct || ms <= 0) return;

    // Guardar en IndexedDB para sobrevivir cierre de app
    var req = self.indexedDB || indexedDB;
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

    // setTimeout dentro del SW (funciona mientras el SW está activo)
    setTimeout(function() {
      _fireNotification(ct);
      _deleteReminder(ct.id);
    }, ms);
  }

  // Cancelar recordatorio
  if (e.data.type === 'CANCEL_REMINDER') {
    _deleteReminder(e.data.citaId);
  }
});

// ── Al iniciar SW: revisar recordatorios pendientes en IndexedDB ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    _checkPendingReminders()
  );
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
              // Ya pasó — disparar inmediatamente
              _fireNotification(item.cita);
              str.delete(item.id);
            } else if (ms < 86400000) {
              // Aún vigente — reprogramar
              setTimeout(function() {
                _fireNotification(item.cita);
                _deleteReminder(item.id);
              }, ms);
            } else {
              // Muy lejano — eliminar (se reprogramará cuando abra la app)
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
  var tipos = {
    cirugia:'Cirugía', consulta:'Consulta', seguimiento:'Seguimiento',
    urgencia:'Urgencia', revision:'Revisión', otro:'Cita'
  };
  var pacN = (ct.pacNombre && ct.pacNombre !== 'undefined') ? ct.pacNombre : 'Paciente';
  var tipo = tipos[ct.tipo] || ct.tipo || 'Cita';
  var body = (ct.pacDx || tipo) + '\nCita a las ' + (ct.hora||'--') + (ct.sala?' | '+ct.sala:'');

  self.registration.showNotification('AnesteSys — Recordatorio', {
    body:              pacN + '\n' + body,
    tag:               'ag-' + ct.id,
    requireInteraction: false,
    vibrate:           [200, 100, 200, 100, 200],
    data:              { citaId: ct.id }
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
