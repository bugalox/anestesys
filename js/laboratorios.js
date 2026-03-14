// LABORATORIOS MODULE
// ═══════════════════════════════════════════════════════════════

var _labData = {
  fecha:'', hb:'', hto:'', plt:'', leu:'',
  tp:'', tpt:'', inr:'',
  glu:'', urea:'', crea:'', bun:'', col:'', tg:'',
  notas:'', extra:[]
};

var _LAB_KEY_PREFIX = 'anestesys_lab_';
var _labExtraSeq = 0;

// Reference ranges [lo, hi] — lo=0 means one-sided (only hi matters)
var _labRefs = {
  hb:[4.39,18.5], hto:[35,53], plt:[150,400], leu:[4.5,11.0],
  tp:[10,14], tpt:[25,35], inr:[0.8,1.2],
  glu:[70,100], urea:[17,49], crea:[0.6,1.3], bun:[7,20],
  col:[0,200], tg:[0,150]
};

var _labLabels = {
  hb:'Hemoglobina', hto:'Hematocrito', plt:'Plaquetas', leu:'Leucocitos',
  tp:'TP', tpt:'TPT', inr:'INR',
  glu:'Glucosa', urea:'Urea', crea:'Creatinina', bun:'BUN',
  col:'Colesterol', tg:'Triglicéridos'
};

var _labUnits = {
  hb:'g/dL', hto:'%', plt:'×10³/µL', leu:'×10³/µL',
  tp:'seg', tpt:'seg', inr:'',
  glu:'mg/dL', urea:'mg/dL', crea:'mg/dL', bun:'mg/dL',
  col:'mg/dL', tg:'mg/dL'
};

function _labKey() {
  return _LAB_KEY_PREFIX + (S._casoId || 'current');
}

function labSave() {
  try {
    var notasEl = document.getElementById('lab-notas');
    _labData.notas = notasEl ? notasEl.value : '';
    localStorage.setItem(_labKey(), JSON.stringify(_labData));
  } catch(e) {}
  try { debounceSave(); } catch(e) {}
}
function labLoad() {
  try {
    var raw = localStorage.getItem(_labKey());
    if (raw) {
      _labData = JSON.parse(raw);
      _labRestoreUI();
    } else {
      _labData = {fecha:'',hb:'',hto:'',plt:'',leu:'',tp:'',tpt:'',inr:'',
                  glu:'',urea:'',crea:'',bun:'',col:'',tg:'',notas:'',extra:[]};
      _labClearInputs();
    }
  } catch(e) {
    _labData = {fecha:'',hb:'',hto:'',plt:'',leu:'',tp:'',tpt:'',inr:'',
                glu:'',urea:'',crea:'',bun:'',col:'',tg:'',notas:'',extra:[]};
    _labClearInputs();
  }
}

function _labClearInputs() {
  var keys = ['hb','hto','plt','leu','tp','tpt','inr','glu','urea','crea','bun','col','tg'];
  keys.forEach(function(k) {
    var el = document.getElementById('lab-' + k);
    if (el) el.value = '';
    _labSetFieldClass(k, '');
  });
  try { document.getElementById('lab-notas').value = ''; } catch(e) {}
  try { document.getElementById('lab-fecha').value = ''; } catch(e) {}
  try { document.getElementById('lab-fecha-lbl').textContent = 'Sin fecha registrada'; } catch(e) {}
  try { document.getElementById('lab-extra-list').innerHTML = _labEmptyPlaceholder(); } catch(e) {}
  _labRefreshAllBadges();
}

function _labRestoreUI() {
  var keys = ['hb','hto','plt','leu','tp','tpt','inr','glu','urea','crea','bun','col','tg'];
  keys.forEach(function(k) {
    var el = document.getElementById('lab-' + k);
    if (el) {
      el.value = _labData[k] || '';
      if (_labData[k] !== '') _labColorField(k, parseFloat(_labData[k]));
    }
  });
  try {
    var notasEl = document.getElementById('lab-notas');
    if (notasEl) notasEl.value = _labData.notas || '';
  } catch(e) {}
  try {
    if (_labData.fecha) {
      document.getElementById('lab-fecha').value = _labData.fecha;
      _labUpdateFechaLabel(_labData.fecha);
    }
  } catch(e) {}
  _labRenderExtra();
  _labRefreshAllBadges();
}

function _labEmptyPlaceholder() {
  return '<div style="text-align:center;color:var(--muted);font-size:12px;padding:20px 16px">'
       + 'Toca <b style="color:var(--cyan)"><i class="ph ph-plus-circle btn-ico"></i>Agregar</b> para incluir un parámetro adicional'
       + '</div>';
}

// Called from oninput on each field
function labInput(key) {
  var el = document.getElementById('lab-' + key);
  if (!el) return;
  var v = el.value.trim();
  _labData[key] = v;
  if (v === '') {
    _labSetFieldClass(key, '');
  } else {
    _labColorField(key, parseFloat(v));
  }
  _labRefreshAllBadges();
  labSave();
}

function _labColorField(key, v) {
  if (isNaN(v)) { _labSetFieldClass(key, ''); return; }
  var r = _labRefs[key];
  if (!r) { _labSetFieldClass(key, 'ok'); return; }
  var lo = r[0], hi = r[1];
  var cls;
  if (lo === 0) {
    // one-sided
    cls = v <= hi ? 'ok' : (v <= hi * 1.3 ? 'warn' : 'danger');
  } else {
    if (v >= lo && v <= hi) cls = 'ok';
    else if (v < lo * 0.80 || v > hi * 1.25) cls = 'danger';
    else cls = 'warn';
  }
  _labSetFieldClass(key, cls);
}

function _labSetFieldClass(key, cls) {
  var fi = document.getElementById('fi-' + key);
  if (!fi) return;
  fi.className = 'lab-field-inner' + (cls ? ' ' + cls : '');
}

function _labGetFieldClass(key) {
  var fi = document.getElementById('fi-' + key);
  if (!fi) return '';
  if (fi.classList.contains('danger')) return 'danger';
  if (fi.classList.contains('warn')) return 'warn';
  if (fi.classList.contains('ok')) return 'ok';
  return '';
}

function _labRefreshAllBadges() {
  _labUpdateBadge('bh',   ['hb','hto','plt','leu'],                    'lab-bh-badge',   'lab-bh-summary');
  _labUpdateBadge('coag', ['tp','tpt','inr'],                          'lab-coag-badge', 'lab-coag-summary');
  _labUpdateBadge('qs',   ['glu','urea','crea','bun','col','tg'],      'lab-qs-badge',   'lab-qs-summary');
}

function _labUpdateBadge(group, keys, badgeId, summaryId) {
  var badge   = document.getElementById(badgeId);
  var summary = document.getElementById(summaryId);
  if (!badge || !summary) return;

  var filled = keys.filter(function(k) { return _labData[k] !== '' && _labData[k] != null; });

  if (!filled.length) {
    badge.className = 'lab-badge nd';
    badge.textContent = 'Sin datos';
    summary.style.display = 'none';
    return;
  }

  var hasDanger = filled.some(function(k) { return _labGetFieldClass(k) === 'danger'; });
  var hasWarn   = filled.some(function(k) { return _labGetFieldClass(k) === 'warn'; });

  if (hasDanger) {
    badge.className = 'lab-badge danger';
    badge.textContent = 'Anormal';
  } else if (hasWarn) {
    badge.className = 'lab-badge warn';
    badge.textContent = 'Revisar';
  } else {
    badge.className = 'lab-badge ok';
    badge.textContent = 'Normal';
  }

  // Build summary
  var html = '';
  filled.forEach(function(k) {
    var cls = _labGetFieldClass(k);
    var colorCls = cls === 'danger' ? 'alto' : cls === 'warn' ? 'bajo' : 'normal';
    html += '<div class="lab-sum-row">'
          + '<span class="lab-sum-lbl">' + (_labLabels[k] || k) + '</span>'
          + '<span class="lab-sum-val ' + colorCls + '">'
          + _labData[k] + (_labUnits[k] ? ' ' + _labUnits[k] : '')
          + '</span></div>';
  });
  summary.innerHTML = html;
  summary.style.display = 'block';
}

// ── Date label ───────────────────────────────────────────────────────────────
function labFechaChange() {
  var el = document.getElementById('lab-fecha');
  if (!el) return;
  _labData.fecha = el.value;
  _labUpdateFechaLabel(el.value);
  labSave();
}

function _labUpdateFechaLabel(val) {
  var lbl = document.getElementById('lab-fecha-lbl');
  if (!lbl) return;
  if (val) {
    try {
      var d = new Date(val + 'T12:00:00');
      lbl.textContent = 'Muestra: ' + d.toLocaleDateString('es-MX', {day:'2-digit', month:'long', year:'numeric'});
    } catch(e) { lbl.textContent = val; }
  } else {
    lbl.textContent = 'Sin fecha registrada';
  }
}

// ── Clear all ─────────────────────────────────────────────────────────────────
function labClearAll() {
  showConfirm('¿Limpiar todos los laboratorios de este caso?', function() {
    _labData = {fecha:'',hb:'',hto:'',plt:'',leu:'',tp:'',tpt:'',inr:'',
                glu:'',urea:'',crea:'',bun:'',col:'',tg:'',notas:'',extra:[]};
    _labClearInputs();
    labSave();
    showToast('🧹 Laboratorios limpiados');
  });
}

// ── Extra parameters ──────────────────────────────────────────────────────────
function labAddExtra() {
  var container = document.getElementById('lab-extra-list');
  if (!container) return;

  // Remove empty placeholder
  var ph = container.querySelector('[data-ph]');
  if (ph) ph.remove();

  _labExtraSeq++;
  var uid = 'lx' + _labExtraSeq;

  var div = document.createElement('div');
  div.id = uid + '-form';
  div.style.cssText = 'padding:12px;border-bottom:1px solid var(--border)';
  div.innerHTML =
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;'
    + 'color:var(--cyan);font-weight:800;margin-bottom:8px">Nuevo parámetro</div>'
    + '<input id="' + uid + '-n" placeholder="Nombre del parámetro (ej: Sodio)" '
    + 'style="width:100%;background:var(--bg);border:1px solid var(--cyan);border-radius:8px;'
    + 'color:var(--white);font-size:13px;padding:9px 11px;outline:none;margin-bottom:6px">'
    + '<div style="display:flex;gap:6px;margin-bottom:8px">'
    + '<input id="' + uid + '-v" placeholder="Valor" type="number" inputmode="decimal" '
    + 'style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;'
    + 'color:var(--white);font-size:14px;font-weight:700;padding:8px 10px;outline:none;text-align:right">'
    + '<input id="' + uid + '-u" placeholder="Unidad" '
    + 'style="width:80px;background:var(--bg);border:1px solid var(--border);border-radius:8px;'
    + 'color:var(--muted);font-size:12px;padding:8px 9px;outline:none">'
    + '</div>'
    + '<div style="display:flex;gap:8px">'
    + '<button id="' + uid + '-save" style="flex:1;background:var(--green);border:none;border-radius:9px;'
    + 'color:#000;font-size:13px;font-weight:800;padding:10px;cursor:pointer">✓ Agregar</button>'
    + '<button id="' + uid + '-cancel" style="background:var(--s2);border:1px solid var(--border);'
    + 'border-radius:9px;color:var(--muted);font-size:12px;padding:10px 16px;cursor:pointer">✕</button>'
    + '</div>';

  container.insertBefore(div, container.firstChild);

  document.getElementById(uid + '-save').onclick = function() {
    var name = (document.getElementById(uid + '-n') || {}).value || '';
    var val  = (document.getElementById(uid + '-v') || {}).value || '';
    var unit = (document.getElementById(uid + '-u') || {}).value || '';
    if (!name.trim()) { showToast('⚠️ Escribe el nombre del parámetro'); return; }
    if (!_labData.extra) _labData.extra = [];
    _labData.extra.push({id: Date.now(), name: name.trim(), value: val, unit: unit.trim()});
    div.remove();
    _labRenderExtra();
    labSave();
    showToast('✅ ' + name.trim() + ' agregado');
  };

  document.getElementById(uid + '-cancel').onclick = function() {
    div.remove();
    if (!_labData.extra || !_labData.extra.length) {
      container.innerHTML = _labEmptyPlaceholder();
    }
  };

  try { document.getElementById(uid + '-n').focus(); } catch(e) {}
}

function labDeleteExtra(id) {
  _labData.extra = (_labData.extra || []).filter(function(e) { return e.id !== id; });
  _labRenderExtra();
  labSave();
}

function labEditExtraVal(id, val) {
  var item = (_labData.extra || []).find(function(e) { return e.id === id; });
  if (item) { item.value = val; labSave(); }
}

function _labRenderExtra() {
  var container = document.getElementById('lab-extra-list');
  if (!container) return;

  // Keep any active add-forms
  var forms = Array.from(container.querySelectorAll('[id$="-form"]'));

  container.innerHTML = '';
  forms.forEach(function(f) { container.appendChild(f); });

  if (!_labData.extra || !_labData.extra.length) {
    if (!forms.length) container.innerHTML = _labEmptyPlaceholder();
    return;
  }

  _labData.extra.forEach(function(item) {
    var row = document.createElement('div');
    row.setAttribute('data-eid', item.id);
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 12px;'
                      + 'border-bottom:1px solid var(--border)';
    row.innerHTML =
      '<div style="flex:1;font-size:13px;font-weight:600;color:var(--white)">' + item.name + '</div>'
      + '<input type="number" inputmode="decimal" value="' + (item.value || '') + '" '
      + 'style="width:88px;background:var(--bg);border:1px solid var(--border);border-radius:8px;'
      + 'color:var(--white);font-size:14px;font-weight:700;padding:7px 9px;outline:none;text-align:right" '
      + 'oninput="labEditExtraVal(' + item.id + ',this.value)" placeholder="—">'
      + '<span style="font-size:10px;color:var(--muted);width:42px;flex-shrink:0">'
      + (item.unit || '') + '</span>'
      + '<button onclick="labDeleteExtra(' + item.id + ')" '
      + 'style="background:none;border:none;color:var(--muted);font-size:18px;'
      + 'cursor:pointer;padding:4px 6px;line-height:1">×</button>';
    container.appendChild(row);
  });
}

// ── Expose lab data for genRes PDF ────────────────────────────────────────────
function labGetDataForPDF() { return _labData; }

// ── Auto-load when nav to lab tab ─────────────────────────────────────────────
// (handled by hook in nav() override below)

// ── Hooks into case lifecycle ─────────────────────────────────────────────────
(function() {
  var _origReset = window.resetForNewCase;
  window.resetForNewCase = function() {
    if (typeof _origReset === 'function') _origReset();
    _labData = {fecha:'',hb:'',hto:'',plt:'',leu:'',tp:'',tpt:'',inr:'',
                glu:'',urea:'',crea:'',bun:'',col:'',tg:'',notas:'',extra:[]};
    try { _labClearInputs(); } catch(e) {}
  };

  var _origNav = window.nav;
  window.nav = function(id, btn) {
    if (typeof _origNav === 'function') _origNav(id, btn);
    if (id === 'lab') { try { labLoad(); } catch(e) {} }
  };
})();

// Initial load after page ready
setTimeout(function() { try { labLoad(); } catch(e) {} }, 800);


// ═══════════════════════════════════════════════════════════════
// DOCTOR DIRECTORY — localStorage autocomplete
// ═══════════════════════════════════════════════════════════════
var _DOC_KEY = 'anestesys_doctores';

function docGetAll() {
  try { return JSON.parse(localStorage.getItem(_DOC_KEY) || '[]'); } catch(e) { return []; }
}
function docSaveAll(arr) {
  try { localStorage.setItem(_DOC_KEY, JSON.stringify(arr)); } catch(e) {}
}

function docSuggest(role, val) {
  var dropId = 'doc-drop-' + role;
  var drop   = document.getElementById(dropId);
  if (!drop) return;
  var inputId = (role === 'anest') ? 'm-anest' : 'm-ciru';
  var inputEl = document.getElementById(inputId);
  var query   = (val || '').trim().toLowerCase();
  var all     = docGetAll();
  var matches = query.length
    ? all.filter(function(d){ return d.nombre.toLowerCase().indexOf(query) >= 0; })
    : all.slice(0, 8);

  var rows = '';
  matches.forEach(function(d) {
    var cedLine = [];
    if (d.cedula)    cedLine.push('C\u00e9d: ' + d.cedula);
    if (d.cedulaEsp) cedLine.push('Esp: ' + d.cedulaEsp);
    var sid = '' + d.id;
    rows += '<div class="ddi" onclick="docPick(\'' + role + '\',' + sid + ')">'
          + '<div class="ddi-name">' + d.nombre + '</div>'
          + (cedLine.length ? '<div class="ddi-ced">' + cedLine.join(' \u00b7 ') + '</div>' : '')
          + '</div>';
  });

  var curName = inputEl ? inputEl.value.trim() : '';
  var saved   = all.some(function(d){
    return d.nombre.toLowerCase() === curName.toLowerCase();
  });
  if (curName && !saved) {
    rows += '<div class="ddi-save" onclick="docSaveNew(\'' + role + '\')">'
          + '\ud83d\udcbe Recordar a <b style="color:#fff;margin-left:4px">' + curName + '</b>'
          + '</div>';
  }

  if (!rows) { drop.style.display = 'none'; return; }
  drop.innerHTML = rows;
  drop.style.display = 'block';
}

function docPick(role, id) {
  var all = docGetAll();
  var doc = all.find(function(d){ return d.id === id; });
  if (!doc) return;
  if (role === 'anest') {
    try{ document.getElementById('m-anest').value          = doc.nombre;       }catch(e){}
    try{ document.getElementById('m-anest-ced').value      = doc.cedula    || '';}catch(e){}
    try{ document.getElementById('m-anest-ced-esp').value  = doc.cedulaEsp || '';}catch(e){}
  } else {
    try{ document.getElementById('m-ciru').value           = doc.nombre;       }catch(e){}
    try{ document.getElementById('m-ciru-ced').value       = doc.cedula    || '';}catch(e){}
    try{ document.getElementById('m-ciru-ced-esp').value   = doc.cedulaEsp || '';}catch(e){}
  }
  document.getElementById('doc-drop-' + role).style.display = 'none';
  showToast('\u2705 ' + doc.nombre);
}

function docSaveNew(role) {
  var nId  = (role === 'anest') ? 'm-anest'         : 'm-ciru';
  var cId  = (role === 'anest') ? 'm-anest-ced'     : 'm-ciru-ced';
  var ceId = (role === 'anest') ? 'm-anest-ced-esp' : 'm-ciru-ced-esp';
  var nombre    = ((document.getElementById(nId)  || {}).value || '').trim();
  var cedula    = ((document.getElementById(cId)  || {}).value || '').trim();
  var cedulaEsp = ((document.getElementById(ceId) || {}).value || '').trim();
  if (!nombre) { showToast('\u26a0\ufe0f Escribe el nombre primero'); return; }
  var all = docGetAll();
  if (all.some(function(d){ return d.nombre.toLowerCase() === nombre.toLowerCase(); })) {
    showToast('\u2139\ufe0f ' + nombre + ' ya est\u00e1 en el directorio');
    document.getElementById('doc-drop-' + role).style.display = 'none';
    return;
  }
  all.push({ id: Date.now(), nombre: nombre, cedula: cedula, cedulaEsp: cedulaEsp });
  docSaveAll(all);
  document.getElementById('doc-drop-' + role).style.display = 'none';
  showToast('\ud83d\udcbe ' + nombre + ' guardado en el directorio');
}

// Close on outside tap
document.addEventListener('click', function(e) {
  ['anest','ciru'].forEach(function(role) {
    var drop  = document.getElementById('doc-drop-' + role);
    var input = document.getElementById((role === 'anest') ? 'm-anest' : 'm-ciru');
    if (drop && !drop.contains(e.target) && e.target !== input) {
      drop.style.display = 'none';
    }
  });
}, true);


// ── PROFILE EDIT MODAL ──────────────────────────────────────────
function lsAbrirEditPerfil() {
  var u = getUser() || {};
  // Pre-fill fields with current values
  var fields = {
    'ep-nombre':     u.nombre    || '',
    'ep-inst':       u.inst      || '',
    'ep-cedula':     u.cedula    || '',
    'ep-cedula-esp': u.cedulaEsp || '',
    'ep-email':      u.email     || ''
  };
  Object.keys(fields).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = fields[id];
  });
  var modal = document.getElementById('ls-edit-modal');
  if (modal) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    // Focus nombre field
    setTimeout(function() {
      var n = document.getElementById('ep-nombre');
      if (n) n.focus();
    }, 100);
  }
}

function lsCerrarEditPerfil() {
  var modal = document.getElementById('ls-edit-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function lsGuardarEditPerfil() {
  var nombre = (document.getElementById('ep-nombre').value || '').trim();
  if (!nombre) {
    showToast('⚠️ El nombre es obligatorio');
    document.getElementById('ep-nombre').focus();
    return;
  }
  var u = {
    nombre:    nombre,
    inst:      (document.getElementById('ep-inst').value      || '').trim(),
    cedula:    (document.getElementById('ep-cedula').value     || '').trim(),
    cedulaEsp: (document.getElementById('ep-cedula-esp').value || '').trim(),
    email:     (document.getElementById('ep-email').value      || '').trim()
  };
  // Preserve Firebase auth data if present
  var old = getUser() || {};
  if (old.uid)   u.uid   = old.uid;
  if (old.token) u.token = old.token;
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  // Also sync the old login-* inputs so lsGuardarPerfil stays in sync
  try { document.getElementById('login-user').value        = u.nombre; } catch(e){}
  try { document.getElementById('login-inst').value        = u.inst; } catch(e){}
  try { document.getElementById('login-email').value       = u.email; } catch(e){}
  try { document.getElementById('login-cedula').value      = u.cedula; } catch(e){}
  try { document.getElementById('login-cedula-esp').value  = u.cedulaEsp; } catch(e){}
  lsMostrarPerfil(u);
  lsCerrarEditPerfil();
  showToast('✅ Perfil actualizado');
  if (navigator.vibrate) navigator.vibrate(30);
}

// Close edit modal on backdrop click
document.addEventListener('click', function(e) {
  var modal = document.getElementById('ls-edit-modal');
  if (modal && e.target === modal) lsCerrarEditPerfil();
});


// ── SHARE / WHATSAPP ────────────────────────────────────────────
// ── SHARE / WHATSAPP — PDF VERSION ────────────────────────────
async function shareResumen() {
  // 1. Ensure print-area is populated
  try { genRes(); } catch(e) {}

  var printEl = document.getElementById('print-area');
  if (!printEl) { showToast('⚠️ Sin datos para compartir'); return; }

  // Show spinner toast
  showToast('⏳ Generando PDF...');

  // 2. Make print-area visible for capture (off-screen)
  printEl.style.position  = 'fixed';
  printEl.style.left      = '-9999px';
  printEl.style.top       = '0';
  printEl.style.display   = 'block';
  printEl.style.width     = '794px';  // A4 width px at 96dpi
  printEl.style.background= '#fff';
  printEl.style.color     = '#000';
  printEl.style.zIndex    = '-1';

  try {
    // 3. Capture with html2canvas
    var canvas = await html2canvas(printEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794
    });

    // 4. Build PDF with jsPDF
    var { jsPDF } = window.jspdf;
    var pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });

    var pageW   = pdf.internal.pageSize.getWidth();
    var pageH   = pdf.internal.pageSize.getHeight();
    var imgW    = canvas.width;
    var imgH    = canvas.height;
    var ratio   = pageW / imgW;
    var scaledH = imgH * ratio;

    // Add image page by page
    var imgData    = canvas.toDataURL('image/jpeg', 0.92);
    var yPos       = 0;
    var firstPage  = true;

    while (yPos < scaledH) {
      if (!firstPage) pdf.addPage();
      // Crop the canvas slice for this page
      var srcY    = Math.round(yPos / ratio);
      var srcH    = Math.min(Math.round(pageH / ratio), imgH - srcY);
      var slice   = document.createElement('canvas');
      slice.width = imgW;
      slice.height= srcH;
      var ctx = slice.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);
      var sliceData = slice.toDataURL('image/jpeg', 0.92);
      pdf.addImage(sliceData, 'JPEG', 0, 0, pageW, srcH * ratio);
      yPos += pageH;
      firstPage = false;
    }

    // 5. Patient name for filename
    var pacNombre = (S.pac && S.pac.nombre) ? S.pac.nombre.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g,'').trim() : 'Paciente';
    var fecha     = new Date().toLocaleDateString('es-MX').replace(/\//g,'-');
    var filename  = 'AnesteSys_' + pacNombre + '_' + fecha + '.pdf';

    // 6. Try native share with PDF file
    var blob = pdf.output('blob');
    var file = new File([blob], filename, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Registro Anestésico — ' + pacNombre,
        files: [file]
      });
      showToast('✅ PDF compartido');
    } else if (navigator.share) {
      // Share without file (older browsers) — share download URL instead
      var url = URL.createObjectURL(blob);
      // Trigger download as fallback
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast('✅ PDF descargado');
    } else {
      // Desktop fallback: direct download
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast('✅ PDF descargado');
    }

  } catch(err) {
    console.error('PDF share error:', err);
    showToast('⚠️ Error al generar PDF. Usa Imprimir → Guardar como PDF');
  } finally {
    // 7. Always hide print-area and restore
    printEl.style.display   = 'none';
    printEl.style.position  = '';
    printEl.style.left      = '';
    printEl.style.top       = '';
    printEl.style.width     = '';
    printEl.style.zIndex    = '';
  }
}

function compartirCaso(casoId) {
  var casos = getCasos();
  var caso  = casos.find(function(c){ return c.id === casoId; });
  if (!caso) { showToast('⚠️ Caso no encontrado'); return; }

  var p     = caso.pac || {};
  var pac   = p.nombre || 'Sin nombre';
  var dx    = p.dx     || '—';
  var cx    = p.cx     || '—';
  var an    = p.med    || '—';
  var fecha = caso.fecha
    ? new Date(caso.fecha).toLocaleDateString('es-MX',
        {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
    : '—';

  // Vitals summary from saved case
  var hist  = caso.history || [];
  var lastV = hist.length ? hist[hist.length-1] : null;
  var vitStr = lastV
    ? 'TA: '+(lastV.tas||'—')+'/'+(lastV.tad||'—')+' mmHg  FC: '+(lastV.fc||'—')+' lpm  SpO₂: '+(lastV.spo2||'—')+'%'
    : 'Sin vitales';

  // Farms count
  var nFarms = (caso.farms || []).length;

  var msg =
    '🩺 *REGISTRO ANESTÉSICO — AnesteSys*\n'
  + '━━━━━━━━━━━━━━━━━━━━━━\n'
  + '👤 *Paciente:* ' + pac + '\n'
  + '📋 *Dx:* ' + dx + '\n'
  + '🔪 *Cx:* ' + cx + '\n'
  + '👨‍⚕️ *Anest:* ' + an + '\n'
  + '━━━━━━━━━━━━━━━━━━━━━━\n'
  + '📊 *Vitales egreso:* ' + vitStr + '\n'
  + '💊 *Fármacos:* ' + nFarms + ' registros\n'
  + '━━━━━━━━━━━━━━━━━━━━━━\n'
  + '📅 ' + fecha + '\n'
  + '🔗 AnesteSys Pro';

  if (navigator.share) {
    navigator.share({
      title: 'Registro — ' + pac,
      text:  msg
    }).catch(function() {});
  } else {
    var wa = 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(wa, '_blank');
  }
}


// ── COLLAPSIBLE PERFIL FORM ─────────────────────────────────────
var _perfilFormOpen = false;

function togglePerfilForm() {
  _perfilFormOpen = !_perfilFormOpen;
  _setPerfilFormOpen(_perfilFormOpen);
}

function _setPerfilFormOpen(open) {
  _perfilFormOpen = open;
  var body    = document.getElementById('perfil-form-body');
  var chevron = document.getElementById('perfil-form-chevron');
  if (!body) return;
  if (open) {
    body.style.maxHeight    = body.scrollHeight + 'px';
    body.style.marginTop    = '16px';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    body.style.maxHeight    = '0';
    body.style.marginTop    = '0';
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}


// ─────────────────────────────────────────────────────────────
// BÚSQUEDA EN HISTORIAL
// ─────────────────────────────────────────────────────────────
var _histSearch = '';
function histSearch(val) {
  _histSearch = (val||'').trim().toLowerCase();
  var clrBtn = document.getElementById('hist-search-clear');
  if(clrBtn) clrBtn.style.display = _histSearch ? 'flex' : 'none';
  refreshHistorial();
}
function histSearchClear() {
  _histSearch = '';
  var inp = document.getElementById('hist-search');
  if(inp) inp.value = '';
  var clrBtn = document.getElementById('hist-search-clear');
  if(clrBtn) clrBtn.style.display = 'none';
  var info = document.getElementById('hist-search-info');
  if (info) info.style.display = 'none';
  refreshHistorial();
}


</script>
