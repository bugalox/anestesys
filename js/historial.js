// HISTORIAL DE CASOS
// ═══════════════════════════════════════════════════════════════
var _histTab = 'privado';
function setHistTab(tab) {
  _histTab = tab;
  var tPriv = document.getElementById('hist-tab-priv');
  var tHosp = document.getElementById('hist-tab-hosp');
  if(tPriv && tHosp) {
    if(tab === 'privado') {
      tPriv.style.cssText = 'padding:10px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;background:rgba(0,229,255,.15);border:2px solid #00e5ff;color:#00e5ff;transition:all .2s';
      tHosp.style.cssText = 'padding:10px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;background:rgba(0,0,0,0);border:2px solid #1e2d44;color:#3d5a78;transition:all .2s';
    } else {
      tHosp.style.cssText = 'padding:10px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;background:rgba(0,230,118,.15);border:2px solid #00e676;color:#00e676;transition:all .2s';
      tPriv.style.cssText = 'padding:10px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;background:rgba(0,0,0,0);border:2px solid #1e2d44;color:#3d5a78;transition:all .2s';
    }
  }
  refreshHistorial();
}

function refreshHistorial() {
  if (!window.__ACCESS_GRANTED) {
    try {
      var el0 = document.getElementById('historial-list');
      if (el0) el0.innerHTML = '<div style="text-align:center;color:#3d5a78;padding:24px;font-size:13px;line-height:1.8">Acceso requerido.</div>';
    } catch(e) {}
    try { if (typeof showToast === 'function') showToast('🔒 Inicia sesión para ver casos guardados'); } catch(e) {}
    return;
  }

  var el = document.getElementById('historial-list');
  if (!el) return;
  var casos = getCasos(_histTab);
  if(_histSearch){
    casos=casos.filter(function(cc){
      var hay=[(cc.pac&&cc.pac.nombre)||'',(cc.pac&&cc.pac.dx)||'',(cc.pac&&cc.pac.cx)||'',(cc.pac&&cc.pac.exp)||'',cc.fecha||''].join(' ').toLowerCase();
      return hay.indexOf(_histSearch)>=0;
    });
    var iEl=document.getElementById('hist-search-info');
    if(iEl){iEl.style.display='block';iEl.textContent=casos.length+' resultado'+(casos.length!==1?'s':'')+' para "'+_histSearch+'"';}
  }else{var iEl=document.getElementById('hist-search-info');if(iEl)iEl.style.display='none';}
  // Auto-switch to the tab that has cases if current is empty
  if(!casos.length){
    var _xalt=_histTab==='privado'?'hospital':'privado';
    if(getCasos(_xalt).length){_histTab=_xalt;casos=getCasos(_xalt);try{setHistTab(_xalt);}catch(e){}}
  }
  // Show empty state if truly no cases
  if (!casos.length) {
    el.innerHTML = '<div style="text-align:center;color:#3d5a78;padding:28px 16px;font-size:13px;line-height:1.9">No hay casos guardados.<br><span style="color:#1e2d44">Se guardan automáticamente al registrar.</span></div>';
    return;
  }
  // Build with DOM nodes so onclick always works on iPhone
  el.innerHTML = '';
  casos.forEach(function(c) {
    var nombre = (c.pac && c.pac.nombre) ? c.pac.nombre : 'Sin nombre';
    var edad   = (c.pac && c.pac.edad)   ? ' · ' + c.pac.edad + 'a' : '';
    var exp    = (c.pac && c.pac.exp)    ? ' · Exp ' + c.pac.exp : '';
    var cx     = (c.pac && c.pac.cx)     ? c.pac.cx : '';
    var dx     = (c.pac && c.pac.dx)     ? c.pac.dx : '';
    var nVit   = (c.history || []).length;
    var nFar   = (c.farms   || []).length;
    var fecha  = c.fecha || '';
    var isCurr = S._casoId === c.id;
    // Duración del procedimiento
    var durStr = '';
    if(c.phases && c.phases.an) {
      var anMs = new Date(c.phases.an).getTime();
      var finMs = 0;
      if(c.phases.finAn) finMs = Math.max(finMs, new Date(c.phases.finAn).getTime());
      if(c.phases.finCx) finMs = Math.max(finMs, new Date(c.phases.finCx).getTime());
      if(finMs > anMs) {
        var dur = finMs - anMs;
        var dh = Math.floor(dur/3600000), dm = Math.floor((dur%3600000)/60000);
        durStr = ' · ' + dh + 'h ' + String(dm).padStart(2,'0') + 'm';
      }
    }
    // Categoria badge
    var catBadge = _histTab === 'hospital'
      ? '<span style="font-size:9px;background:rgba(0,230,118,.15);border:1px solid #00e676;border-radius:5px;color:#00e676;padding:2px 6px;font-weight:700"><i class="ph ph-hospital" style="margin-right:5px"></i>Hospital</span>'
      : '<span style="font-size:9px;background:rgba(0,229,255,.1);border:1px solid #00e5ff;border-radius:5px;color:#00e5ff;padding:2px 6px;font-weight:700">🔒 Privado</span>';

    var card = document.createElement('div');
    card.style.cssText = 'background:#04060d;border:2px solid ' + (isCurr ? '#00e5ff' : '#1e2d44')
      + ';border-radius:14px;padding:16px;margin-bottom:12px;position:relative';

    if (isCurr) {
      var badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:12px;right:12px;font-size:9px;font-weight:800;color:#00e5ff;text-transform:uppercase;letter-spacing:1px';
      badge.textContent = '● Activo';
      card.appendChild(badge);
    }

    var nameDiv = document.createElement('div');
    nameDiv.style.cssText = 'font-size:17px;font-weight:800;color:#dde8ff;margin-bottom:3px;padding-right:' + (isCurr ? '70px' : '8px');
    nameDiv.textContent = nombre + edad + exp;
    card.appendChild(nameDiv);

    if (cx) {
      var cxDiv = document.createElement('div');
      cxDiv.style.cssText = 'font-size:12px;color:#00e5ff;margin-bottom:4px';
      cxDiv.textContent = cx;
      card.appendChild(cxDiv);
    }

    if(dx) {
      var dxDiv = document.createElement('div');
      dxDiv.style.cssText = 'font-size:11px;color:#3d5a78;margin-bottom:2px';
      dxDiv.textContent = 'Dx: ' + dx;
      card.appendChild(dxDiv);
    }

    var infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'font-size:11px;color:#3d5a78;margin-bottom:4px';
    infoDiv.textContent = fecha + durStr + ' · ' + nVit + ' vitales · ' + nFar + ' fármacos';
    var badgeDiv = document.createElement('div');
    badgeDiv.style.cssText = 'margin-bottom:10px';
    badgeDiv.innerHTML = catBadge;
    card.appendChild(infoDiv);
    card.appendChild(badgeDiv);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px';

    var btnAbrir = document.createElement('button');
    btnAbrir.style.cssText = 'padding:11px;font-size:13px;font-weight:700;background:rgba(0,229,255,.1);border:1.5px solid #00e5ff;border-radius:10px;color:#00e5ff;cursor:pointer';
    btnAbrir.textContent = '📂 Abrir y editar';
    (function(id) {
      btnAbrir.addEventListener('click', function(e) { e.stopPropagation(); loadCaso(id); });
    })(c.id);

    // Share button
    var btnShare = document.createElement('button');
    btnShare.style.cssText = 'padding:11px;font-size:13px;font-weight:700;background:rgba(37,211,102,.12);border:1.5px solid #25D366;border-radius:10px;color:#25D366;cursor:pointer';
    btnShare.innerHTML = '<i class="ph ph-share-network" style="font-size:13px;margin-right:4px"></i>Compartir';
    (function(id) {
      btnShare.addEventListener('click', function(e) { e.stopPropagation(); compartirCaso(id); });
    })(c.id);

    var btnElim = document.createElement('button');
    btnElim.style.cssText = 'padding:11px;font-size:13px;font-weight:700;background:rgba(255,23,68,.1);border:1.5px solid #ff1744;border-radius:10px;color:#ff1744;cursor:pointer';
    btnElim.textContent = '🗑 Eliminar';
    (function(id) {
      btnElim.addEventListener('click', function(e) { e.stopPropagation(); deleteCaso(id); });
    })(c.id);

    btnRow.appendChild(btnShare);
    btnRow.appendChild(btnAbrir);
    btnRow.appendChild(btnElim);
    card.appendChild(btnRow);
    el.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════════
