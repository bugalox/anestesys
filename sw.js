// ═══════════════════════════════════════════════════════════
// AnesteSys — Service Worker v2.0
// ═══════════════════════════════════════════════════════════

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

// ── Abrir/inicializar IndexedDB ──────────────────────────
function dbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ag_reminders_v2', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('reminders', { keyPath: 'id' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Guardar recordatorio en IndexedDB ───────────────────
async function dbSave(ct, fireAt) {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction('reminders', 'readwrite');
    tx.objectStore('reminders').put({ id: ct.id, cita: ct, fireAt });
    tx.oncomplete = res;
    tx.onerror    = rej;
  });
}

// ── Eliminar recordatorio ────────────────────────────────
async function dbDelete(id) {
  const db = await dbOpen();
  return new Promise((res) => {
    const tx = db.transaction('reminders', 'readwrite');
    tx.objectStore('reminders').delete(id);
    tx.oncomplete = res;
    tx.onerror    = res; // no falla
  });
}

// ── Leer todos los recordatorios ─────────────────────────
async function dbGetAll() {
  const db = await dbOpen();
  return new Promise((res, rej) => {
    const tx  = db.transaction('reminders', 'readonly');
    const req = tx.objectStore('reminders').getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror   = () => res([]);
  });
}

// ── Mostrar notificación ─────────────────────────────────
function fireNotification(ct) {
  const iconos  = { cirugia:'🔪', consulta:'🩺', seguimiento:'📋', urgencia:'🚨', revision:'🔬', otro:'📌' };
  const nombres = { cirugia:'Cirugía', consulta:'Consulta', seguimiento:'Seguimiento', urgencia:'Urgencia', revision:'Revisión', otro:'Cita' };

  const pacN  = (ct.pacNombre && ct.pacNombre !== 'undefined') ? ct.pacNombre : 'Paciente';
  const tipo  = nombres[ct.tipo] || ct.tipo || 'Cita';
  const icono = iconos[ct.tipo]  || '📅';
  const hora  = ct.hora  || '--:--';
  const sala  = ct.sala  ? ' · ' + ct.sala : '';
  const dx    = ct.pacDx || tipo;

  // Tiempo restante
  let tiempoRestante = '';
  if (ct.fecha && ct.hora) {
    const diff = new Date(ct.fecha + 'T' + ct.hora + ':00').getTime() - Date.now();
    if (diff > 0) {
      const mins = Math.round(diff / 60000);
      tiempoRestante = mins < 60  ? `en ${mins} min`
                     : mins < 120 ? 'en 1 hora'
                     :              `en ${Math.round(mins/60)} horas`;
    }
  }

  const title = `${icono} ${tipo}${tiempoRestante ? '  —  ' + tiempoRestante : ''}`;
  let   body  = `👤 ${pacN}\n${dx}\n🕐 ${hora}${sala}`;
  if (ct.pacEdad) {
    const u = ct.pacEdadUnit === 'meses' ? 'm' : ct.pacEdadUnit === 'dias' ? 'd' : ct.pacEdadUnit === 'semanas' ? 'sem' : 'a';
    body += `  ·  ${ct.pacEdad} ${u}`;
  }

  return self.registration.showNotification(title, {
    body,
    icon:               '/anestesys/icon.svg',
    badge:              '/anestesys/icon.svg',
    tag:                'ag-' + ct.id,
    requireInteraction: true,
    vibrate:            [300, 100, 300, 100, 300, 200, 500],
    data:               { citaId: ct.id, url: 'https://bugalox.github.io/anestesys/' }
  });
}

// ── Recibir mensaje desde la app ─────────────────────────
self.addEventListener('message', async (e) => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_REMINDER') {
    const ct = e.data.cita;
    let   ms = Number(e.data.ms);

    // Validar ms
    if (!ct || !isFinite(ms) || ms <= 0) return;

    const fireAt = Date.now() + ms;

    // 1. Siempre persistir en IndexedDB
    try { await dbSave(ct, fireAt); } catch(err) {}

    // 2. Si la cita es dentro de 30 min: usar waitUntil + setTimeout
    //    para que el SW no se duerma antes de disparar
    if (ms <= 1800000) {
      e.waitUntil(new Promise(resolve => {
        setTimeout(async () => {
          await fireNotification(ct);
          await dbDelete(ct.id);
          resolve();
        }, ms);
      }));
    }
    // Para ms > 30min: solo IndexedDB — se recarga al activar SW o al abrir la app
  }

  if (e.data.type === 'CANCEL_REMINDER') {
    try { await dbDelete(e.data.citaId); } catch(err) {}
  }
});

// ── Al activar: disparar vencidos, reprogramar próximos ──
self.addEventListener('activate', async (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    const items = await dbGetAll();
    const now   = Date.now();

    for (const item of items) {
      const ms = item.fireAt - now;

      if (ms <= 0) {
        // Ya venció → disparar inmediatamente
        await fireNotification(item.cita);
        await dbDelete(item.id);
      } else if (ms <= 1800000) {
        // Dentro de 30 min → programar setTimeout
        setTimeout(async () => {
          await fireNotification(item.cita);
          await dbDelete(item.id);
        }, ms);
      }
      // > 30 min → se reprograma la próxima vez que se active el SW
    }
  })());
});

// ── Click en notificación → enfocar app ─────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('bugalox.github.io')) return client.focus();
      }
      return self.clients.openWindow('https://bugalox.github.io/anestesys/');
    })
  );
});
