// MODAL GUARDAR EN CARPETA
// ═══════════════════════════════════════════════
var _saveCatSelected = null;

function openSaveModal() {
  try {
    _saveCatSelected = (window.S && S.pac && S.pac.categoria) ? S.pac.categoria : 'privado';

    // Preview patient name
    var prev = document.getElementById('save-pac-preview');
    if(prev) {
      var parts = [];
      if(window.S && S.pac) {
        if(S.pac.nombre) parts.push(S.pac.nombre);
        if(S.pac.dx)     parts.push(S.pac.dx);
        if(S.pac.cx)     parts.push(S.pac.cx);
      }
      prev.textContent = parts.join(' · ') || '(sin paciente registrado)';
    }

    // Show case counts in each folder
    try {
      var nPriv = getCasos('privado').length;
      var nHosp = getCasos('hospital').length;
      var cp = document.getElementById('save-count-priv');
      var ch = document.getElementById('save-count-hosp');
      if(cp) cp.textContent = nPriv + (nPriv !== 1 ? ' casos' : ' caso');
      if(ch) ch.textContent = nHosp + (nHosp !== 1 ? ' casos' : ' caso');
    } catch(e) {}

    // Pre-select current category
    selectSaveCat(_saveCatSelected);

    // Show the modal — override any inline style
    var modal = document.getElementById('save-modal');
    if(modal) {
      modal.removeAttribute('hidden');
      modal.style.cssText = modal.style.cssText.replace('display:none', '');
      modal.style.display = 'flex';
    } else {
      console.error('[AnesteSys] save-modal element not found in DOM');
      showToast('Error: modal no encontrado');
    }
  } catch(err) {
    console.error('[AnesteSys] openSaveModal error:', err);
    showToast('Error al abrir modal: ' + err.message);
  }
}

function closeSaveModal() {
  var modal = document.getElementById('save-modal');
  if(modal) modal.style.display = 'none';
  _saveCatSelected = null;
}

function selectSaveCat(cat) {
  _saveCatSelected = cat;
  var isPriv = (cat === 'privado');
  var STYLE_ACT_P = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 12px;background:rgba(0,229,255,.18);border:2px solid #00e5ff;border-radius:14px;cursor:pointer;text-align:center;box-shadow:0 0 0 3px rgba(0,229,255,.15)';
  var STYLE_ACT_H = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 12px;background:rgba(0,230,118,.18);border:2px solid #00e676;border-radius:14px;cursor:pointer;text-align:center;box-shadow:0 0 0 3px rgba(0,230,118,.15)';
  var STYLE_OFF   = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 12px;background:rgba(255,255,255,.02);border:2px solid #1e2d44;border-radius:14px;cursor:pointer;text-align:center';
  var lblPriv = document.getElementById('save-lbl-priv');
  var lblHosp = document.getElementById('save-lbl-hosp');
  var msg     = document.getElementById('save-selected-msg');
  var btn     = document.getElementById('save-confirm-btn');
  if(lblPriv) lblPriv.style.cssText = isPriv ? STYLE_ACT_P : STYLE_OFF;
  if(lblHosp) lblHosp.style.cssText = isPriv ? STYLE_OFF   : STYLE_ACT_H;
  if(msg) {
    msg.textContent = isPriv ? '📁 Se guardará en tu carpeta Privado' : '📁 Se guardará en la carpeta Hospital';
    msg.style.color = isPriv ? '#00e5ff' : '#00e676';
  }
  if(btn) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.color = '#000';
    btn.textContent = '\uD83D\uDCBE Guardar en ' + (isPriv ? '\uD83D\uDD12 Privado' : '\uD83C\uDFE5 Hospital');
    btn.style.background = isPriv ? 'linear-gradient(135deg,#00e5ff,#0066aa)' : 'linear-gradient(135deg,#00e676,#007722)';
  }
}

function confirmSave() {
  if(!_saveCatSelected) return;

  // Check if there's actually data worth saving
  var hasData = (S.pac && S.pac.nombre) || (S.history && S.history.length) || (S.farms && S.farms.length);
  if(!hasData) {
    showToast('⚠️ Ingresa datos del paciente antes de guardar');
    closeSaveModal();
    setTimeout(function(){ openPacModal(); }, 400);
    return;
  }

  // Update category in state
  S.pac.categoria = _saveCatSelected;

  // If the case was in a different category before, remove it from the old one
  var oldCat = _saveCatSelected === 'privado' ? 'hospital' : 'privado';
  var oldCasos = getCasos(oldCat);
  var existsInOld = oldCasos.some(function(c){ return c.id === S._casoId; });
  if(existsInOld) {
    // Remove from old category
    saveCasos(oldCasos.filter(function(c){ return c.id !== S._casoId; }), oldCat);
  }

  // Remove readOnly so autoSave works
  var wasReadOnly = S._readOnly;
  S._readOnly = false;
  autoSave(false); // silent save
  S._readOnly = wasReadOnly;

  closeSaveModal();

  // Update historial tabs to show new category
  try { setHistTab(_saveCatSelected); } catch(e) {}

  // Update topbar category badge
  try { updateTopbar(); } catch(e) {}

  // Show success with folder name
  var catName = _saveCatSelected === 'privado' ? '🔒 Privado' : '<i class="ph ph-hospital" style="margin-right:5px"></i>Hospital';
  showToast('✅ Guardado en ' + catName + ' — ' + (S.pac.nombre || 'Sin nombre'));
  if(navigator.vibrate) navigator.vibrate([30,30,30]);
}

// Backdrop tap handled by onclick on modal div


// ═══════════════════════════════════════════════
// MODO SOLO LECTURA — casos históricos
// ═══════════════════════════════════════════════
function _showReadOnlyBanner(show) {
  var banner = document.getElementById('readonly-banner');
  var strip  = document.getElementById('readonly-strip');

  if(show) {
    // Fill patient info
    var infoEl = document.getElementById('ro-pac-info');
    if(infoEl && window.S && S.pac) {
      var parts = [];
      if(S.pac.nombre) parts.push('<b style="color:#fff">' + S.pac.nombre + '</b>');
      if(S.pac.edad)   parts.push(S.pac.edad + ' años');
      if(S.pac.dx)     parts.push(S.pac.dx);
      if(S.pac.cx)     parts.push('Cx: ' + S.pac.cx);
      infoEl.innerHTML = parts.length ? parts.join(' · ') : 'Paciente sin nombre';
    }

    // Show amber strip at very top
    if(strip) strip.style.display = 'block';

    // Position banner right below topbar and slide it in
    if(banner) {
      var tb  = document.querySelector('.topbar');
      var tbH = tb ? tb.getBoundingClientRect().height : 62;
      banner.style.top     = tbH + 'px';
      banner.style.display = 'block';
      banner.offsetHeight;                   // force reflow
      banner.classList.add('visible');

      // After transition ends, measure actual banner height
      // and push page content down so nothing is hidden underneath
      setTimeout(function() {
        var bH = banner.getBoundingClientRect().height;
        // Apply top-padding to every .page div (they scroll independently)
        document.querySelectorAll('.page').forEach(function(p) {
          p.style.paddingTop = (bH + 8) + 'px';
        });
      }, 320); // wait for slide-down animation to finish
    }

  } else {
    // Slide banner back up
    if(banner) {
      banner.classList.remove('visible');
      setTimeout(function() { banner.style.display = 'none'; }, 320);
    }
    if(strip) strip.style.display = 'none';

    // Restore original page padding (defined in CSS as 12px)
    document.querySelectorAll('.page').forEach(function(p) {
      p.style.paddingTop = '';
    });
  }
}

function closeBanner() {
  _showReadOnlyBanner(false);
}

// Convierte el caso histórico en editable (usuario puede modificar y guardar)
function convertToEditable() {
  S._readOnly = false;
  _showReadOnlyBanner(false);
  showToast('✏️ Editando — recuerda guardar cuando termines');
}



// Modal para editar la hora de fin manualmente en casos históricos
function editFinHoraModal() {
  function _fmtT(d) {
    if(!d) return '';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  var anIni = _fmtT(S.phases.an);
  var anFin = _fmtT(S.phases.finAn);
  var cxIni = _fmtT(S.phases.cx);
  var cxFin = _fmtT(S.phases.finCx);

  var modal = document.createElement('div');
  modal.id = 'fin-hora-modal';
  modal.style.cssText = [
    'position:fixed;inset:0;z-index:600;',
    'background:rgba(4,6,13,.97);overflow-y:auto;',
    'padding:24px 16px;padding-top:calc(32px + env(safe-area-inset-top))'
  ].join('');

  function inp(id, val, color) {
    return '<div><input type="time" id="' + id + '" value="' + val +
           '" style="width:100%;padding:10px;font-size:16px;font-weight:700;' +
           'background:#04060d;border:1.5px solid ' + color + ';border-radius:8px;' +
           'color:' + color + ';box-sizing:border-box"></div>';
  }

  var rows = [
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">',
    '<div style="font-size:18px;font-weight:800;color:#ffd600">✏️ Editar Tiempos</div>',
    '<button id="efh-close-btn" style="background:#0f1628;border:1px solid #1e2d44;border-radius:8px;color:#dde8ff;padding:8px 14px;font-size:13px;cursor:pointer">✕ Cerrar</button>',
    '</div>',
    '<div style="background:#0a0f1c;border:1px solid #1e2d44;border-radius:14px;padding:16px;margin-bottom:14px">',
    '<div style="font-size:10px;color:#00e5ff;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px">🫁 Anestesia</div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">',
    '<div><label style="font-size:10px;color:#3d5a78;display:block;margin-bottom:4px">Inicio</label>' + inp('efh-an-ini', anIni, '#00e5ff') + '</div>',
    '<div><label style="font-size:10px;color:#3d5a78;display:block;margin-bottom:4px">Fin</label>'   + inp('efh-an-fin', anFin, '#ff4444') + '</div>',
    '</div>',
    '<div style="font-size:10px;color:#ff6d00;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px">🔪 Cirugía</div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">',
    '<div><label style="font-size:10px;color:#3d5a78;display:block;margin-bottom:4px">Inicio</label>' + inp('efh-cx-ini', cxIni, '#ff6d00') + '</div>',
    '<div><label style="font-size:10px;color:#3d5a78;display:block;margin-bottom:4px">Fin</label>'   + inp('efh-cx-fin', cxFin, '#ff4444') + '</div>',
    '</div>',
    '</div>',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">',
    '<button id="efh-cancel-btn" style="padding:14px;font-size:14px;font-weight:700;background:#0f1628;border:1px solid #1e2d44;border-radius:12px;color:#3d5a78;cursor:pointer">Cancelar</button>',
    '<button onclick="saveFinHora()" style="padding:14px;font-size:14px;font-weight:700;background:#ffd600;border:none;border-radius:12px;color:#04060d;cursor:pointer"><i class="ph ph-floppy-disk btn-ico"></i>Guardar</button>',
    '</div>'
  ];

  var wrap = document.createElement('div');
  wrap.style.cssText = 'max-width:400px;margin:0 auto';
  wrap.innerHTML = rows.join('');
  modal.appendChild(wrap);
  document.body.appendChild(modal);

  // Wire close buttons after DOM insertion
  function _close() { var m = document.getElementById('fin-hora-modal'); if(m) m.remove(); }
  document.getElementById('efh-close-btn').addEventListener('click', _close);
  document.getElementById('efh-cancel-btn').addEventListener('click', _close);
}


function saveFinHora() {
  function _tv(id) { var el=document.getElementById(id); return el ? el.value : ''; }
  function _set(field, val) {
    if(!val) return;
    var d = new Date(); var parts = val.split(':');
    d.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
    return d;
  }
  var anIni = _tv('efh-an-ini'), anFin = _tv('efh-an-fin');
  var cxIni = _tv('efh-cx-ini'), cxFin = _tv('efh-cx-fin');
  
  if(anIni) { S.phases.an    = _set('efh-an-ini', anIni); document.getElementById('time-an').value = anIni; }
  if(anFin) { 
    S.phases.finAn = _set('efh-an-fin', anFin); 
    document.getElementById('time-fin-an').value = anFin;
    if(S.phases.an) { S._frozenTan = S.phases.finAn - S.phases.an; var dFA=document.getElementById('dur-fin-an'); if(dFA) dFA.textContent = fmt2(S._frozenTan); }
  }
  if(cxIni) { S.phases.cx    = _set('efh-cx-ini', cxIni); document.getElementById('time-cx').value = cxIni; }
  if(cxFin) { 
    S.phases.finCx = _set('efh-cx-fin', cxFin); 
    document.getElementById('time-fin-cx').value = cxFin;
    if(S.phases.cx) { S._frozenTcx = S.phases.finCx - S.phases.cx; var dFC=document.getElementById('dur-fin-cx'); if(dFC) dFC.textContent = fmt2(S._frozenTcx); }
  }
  // Guardar cambios (desactivar readOnly temporalmente)
  var wasReadOnly = S._readOnly;
  S._readOnly = false;
  autoSave(true);
  S._readOnly = wasReadOnly;
  document.getElementById('fin-hora-modal').remove();
  showToast('✅ Tiempos actualizados y guardados');
}

function calcVSCyPermisible() {
  // VSC según sexo y peso
  var peso  = parseFloat(S.pac.pesoC) || parseFloat(S.pac.peso) || 70;
  var edad  = parseInt(S.pac.edad)  || 30;
  var sexo  = (S.pac.sexo || 'Masculino').toLowerCase();
  // Factor de volumen sanguíneo (ml/kg)
  var vscFactor = sexo.includes('fem') || sexo === 'f' ? 65 : 70;
  if(edad < 1)       vscFactor = 80;
  else if(edad <= 5) vscFactor = 75;
  else if(edad < 12) vscFactor = 72;
  var vscCalc = Math.round(peso * vscFactor);
  // Hematocrito de referencia según sexo/edad
  var hto0 = sexo.includes('fem') || sexo === 'f' ? 42 : 45;
  if(edad < 1)       hto0 = 44;
  else if(edad <= 5) hto0 = 40;
  // Sangrado permisible = VSC × (Hto inicial - Hto mínimo aceptable 21%) / Hto inicial
  var htoMin = 21;
  var vspCalc = Math.round(vscCalc * (hto0 - htoMin) / hto0);
  // Si el usuario editó manualmente, respetar esos valores
  var vscManual  = S._vscManual  != null  ? S._vscManual  : vscCalc;
  var vspManual  = S._vspManual  != null  ? S._vspManual  : vspCalc;
  // Actualizar displays
  var vscEl = document.getElementById('vsc-lbl');
  var spEl  = document.getElementById('sp-lbl');
  if(vscEl) vscEl.textContent = vscManual + ' ml';
  if(spEl)  spEl.textContent  = vspManual + ' ml';
  var spEl2 = document.getElementById('sp-lbl2');
  if(spEl2) spEl2.textContent = vspManual + ' ml';
  return { vsc: vscManual, vsp: vspManual };
}

function calcLiq() {
  const get=id=>{ const e=document.getElementById(id); return e?parseInt(e.value)||0:0; };

  // ── Auto-sugerencia de P. Insensibles y Req. Basal (solo si el campo está vacío) ──
  // Fórmulas estándar anestesiología:
  //   P. Insensibles = 2 ml/kg/h × horas de cirugía
  //   Req. Basal     = 4 ml/kg/h para los primeros 10 kg
  //                  + 2 ml/kg/h para los siguientes 10 kg
  //                  + 1 ml/kg/h por cada kg adicional (Holiday-Segar)
  //                  × horas de cirugía
  const peso = parseFloat(S.pac.pesoC) || parseFloat(S.pac.peso) || 0;
  const hrsCx = S.phases.cx ? Math.max(0.5, (new Date() - S.phases.cx) / 3600000) : 0;
  if (peso > 0 && hrsCx > 0) {
    const insEl = document.getElementById('eg-ins');
    const basEl = document.getElementById('eg-bas');
    if (insEl && !insEl.value) {
      insEl.value = Math.round(2 * peso * hrsCx);
      insEl.style.borderColor = 'var(--muted)';
      insEl.title = 'Auto: 2 ml/kg/h × ' + hrsCx.toFixed(1) + 'h';
      var insLbl = document.getElementById('lbl-ins-auto');
      if(insLbl) insLbl.textContent = '⚡ auto';
    }
    if (basEl && !basEl.value) {
      var basalHr = peso <= 10 ? 4*peso :
                   peso <= 20 ? 40 + 2*(peso-10) :
                                60 + 1*(peso-20);
      basEl.value = Math.round(basalHr * hrsCx);
      basEl.style.borderColor = 'var(--muted)';
      basEl.title = 'Auto: Holiday-Segar × ' + hrsCx.toFixed(1) + 'h';
      var basLbl = document.getElementById('lbl-bas-auto');
      if(basLbl) basLbl.textContent = '⚡ auto';
    }
  }

  const ti=get('in-nacl')+get('in-hart')+get('in-col')+get('in-pg')+get('in-med')+get('in-otro');
  const sang=get('eg-sang');
  const diu=get('eg-diu');
  const te=get('eg-ins')+get('eg-bas')+diu+sang+get('eg-trau')+get('eg-otro');
  const bal=ti-te;
  document.getElementById('ing-total').textContent=ti+' ml';
  document.getElementById('eg-total').textContent=te+' ml';
  const bb=document.getElementById('bal-big');
  bb.textContent=(bal>=0?'+':'')+bal+' ml';
  bb.style.color=bal>0?'var(--green)':bal<-300?'var(--red)':'var(--yellow)';
  document.getElementById('st-bal').textContent=(bal>=0?'+':'')+bal;
  document.getElementById('st-sang').textContent=sang;
  // VSC y permisible dinámicos
  const {vsc, vsp} = calcVSCyPermisible();
  const pct=Math.min(100,Math.round(sang/vsp*100));
  document.getElementById('sang-bar').style.width=pct+'%';
  document.getElementById('sang-pct').textContent=sang+' ml ('+pct+'%)';
  // diuresis/hr
  const hrs=S.phases.an?Math.max(0.5,(new Date()-S.phases.an)/3600000):2.5;
  const dur=(diu/(parseFloat(S.pac.pesoC)||parseFloat(S.pac.peso)||70)/hrs).toFixed(2);
  document.getElementById('diu-hr').textContent=dur+' ml/kg/h';
  if(sang>vsp*0.8&&!S._sangAlerted){S._sangAlerted=true;addAlert('danger','🩸 Sangrado >80% del permisible — evaluar transfusión',getT());}
  // Additional thresholds
  var sangEl = document.getElementById('eg-sang');
  if(sangEl) sangEl.style.borderColor = sang>vsp?'var(--red)':sang>vsp*0.6?'var(--yellow)':'';
  try { debounceSave(); } catch(e) {}
}
calcLiq();

function forceHourSnapshot() {
  const get=id=>parseInt(document.getElementById(id)?.value)||0;
  const lbl = getCurrentHourLabel();
  if(!S.hourBuckets[lbl]) S.hourBuckets[lbl]={farms:[],liqIn:0,liqEg:0,sang:0,diu:0,vitals:[]};
  var _totalIn = get('in-nacl')+get('in-hart')+get('in-col')+get('in-pg')+get('in-med')+get('in-otro');
  var _totalEg = get('eg-sang')+get('eg-diu')+get('eg-trau')+get('eg-ins')+get('eg-bas')+get('eg-otro');
  S.hourBuckets[lbl].liqIn += _totalIn;
  S.hourBuckets[lbl].liqEg += _totalEg;
  S.hourBuckets[lbl].sang  += get('eg-sang');
  S.hourBuckets[lbl].diu   += get('eg-diu');
  renderHourBuckets();
  const bc = document.getElementById('hr-bucket-count');
  if(bc) bc.textContent = Object.keys(S.hourBuckets).length+' horas';
  if(navigator.vibrate) navigator.vibrate(30);
  addAlert('info','📌 Snapshot horario registrado: '+getCurrentHourLabel(),getT());
}

// ──────────────────────────────────────────────────────
// REGISTRO HORA POR HORA — funciones principales
// ──────────────────────────────────────────────────────
var _ordinalHora = ['1ª Hora','2ª Hora','3ª Hora','4ª Hora','5ª Hora','6ª Hora',
                    '7ª Hora','8ª Hora','9ª Hora','10ª Hora','11ª Hora','12ª Hora'];

function _liqHoraLabel(idx) {
  return _ordinalHora[idx] || ((idx+1)+'ª Hora');
}

function renderLiqHoraBtns() {
  var container = document.getElementById('liq-hora-btns');
  if (!container) return;
  var count = S.liqHora.length;
  // Botones para horas ya registradas (verde/done) + la siguiente pendiente
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<button onclick="openEditLiq('+i+')" style="padding:10px 4px;border-radius:10px;border:2px solid #00c853;background:rgba(0,200,83,.12);color:#00c853;font-weight:800;font-size:12px;cursor:pointer;text-align:center">'+
      '✓ '+_liqHoraLabel(i)+'<br><span style="font-size:9px;color:var(--muted)">'+S.liqHora[i].hora+'</span></button>';
  }
  // FIX #1: Sin onclick inline — se asigna via addEventListener después de innerHTML
  // para que el lock JS global _liqHoraLock sea efectivo aunque se recree el DOM.
  html += '<button id="btn-add-liq-hora" style="padding:10px 4px;border-radius:10px;border:2px solid var(--cyan);background:rgba(0,229,255,.12);color:var(--cyan);font-weight:800;font-size:12px;cursor:pointer;text-align:center;animation:pulse 1.5s infinite">'+
    '📌 '+_liqHoraLabel(count)+'<br><span style="font-size:9px;opacity:.7">Registrar ahora</span></button>';
  container.innerHTML = html;

  // Asignar listener programáticamente para que el lock JS sea efectivo
  var addBtn = document.getElementById('btn-add-liq-hora');
  if (addBtn) {
    // FIX #1b: touchend con preventDefault() bloquea el ghost click de 300ms en iOS
    addBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      addLiqHoraManual();
    }, { passive: false });
    // Fallback click para desktop/Android
    addBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      addLiqHoraManual();
    });
  }

  var badge = document.getElementById('liq-hora-count');
  if (badge) badge.textContent = count + ' hora' + (count!==1?'s':'') + ' registradas';
}

function renderLiqHoraTable() {
  var b = document.getElementById('liq-tbody');
  if (!b) return;
  if (!S.liqHora || !S.liqHora.length) {
    b.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:16px">Sin registros hora por hora</td></tr>';
    return;
  }
  b.innerHTML = S.liqHora.map(function(r, i) {
    var tIn = r.totalIn != null ? r.totalIn : (r.nacl||0)+(r.hart||0)+(r.col||0)+(r.pg||0)+(r.med||0)+(r.otro||0);
    var tEg = r.totalEg != null ? r.totalEg : (r.sang||0)+(r.diu||0)+(r.trau||0)+(r.ins||0)+(r.bas||0)+(r.oeg||0);
    var inD=[], egD=[];
    if(r.nacl) inD.push('NaCl:'+r.nacl);
    if(r.hart) inD.push('Hart:'+r.hart);
    if(r.col)  inD.push('Col:'+r.col);
    if(r.pg)   inD.push('PG:'+r.pg);
    if(r.med)  inD.push('Med:'+r.med);
    if(r.sang) egD.push('🩸'+r.sang);
    if(r.diu)  egD.push('💧'+r.diu);
    if(r.trau) egD.push('Trau:'+r.trau);
    if(r.ins)  egD.push('Ins:'+r.ins);
    if(r.bas)  egD.push('Bas:'+r.bas);
    return '<tr onclick="openEditLiq('+i+')" style="cursor:pointer">' +
      '<td style="font-weight:800;color:var(--cyan);font-size:11px">'+_liqHoraLabel(i)+'</td>' +
      '<td class="hl" style="font-weight:800">'+r.hora+'</td>' +
      '<td style="color:var(--green)">'+tIn+'<br><span style="color:var(--muted);font-size:9px">'+inD.join(' ')+'</span></td>' +
      '<td style="color:var(--red)">'+tEg+'<br><span style="color:var(--muted);font-size:9px">'+egD.join(' ')+'</span></td>' +
      '<td class="'+(r.balHr<0?'wc':'')+'" style="font-weight:800">'+( r.balHr>=0?'+':'')+r.balHr+'</td>' +
      '<td class="'+(r.acum<-500?'dc':r.acum<0?'wc':'hl')+'">'+( r.acum>=0?'+':'')+r.acum+'</td>' +
      '<td style="color:var(--cyan);font-size:16px;text-align:center">✏️</td>' +
    '</tr>';
  }).join('');
}

function addLiqHora() { addLiqHoraManual(); }

var _liqHoraLock = false;
function addLiqHoraManual() {
  // FIX #2: Guard contra double-tap / ghost click en iOS
  // 1500ms cubre el delay de 300ms de iOS + el ciclo de render del DOM
  if (_liqHoraLock) return;
  _liqHoraLock = true;
  setTimeout(function(){ _liqHoraLock = false; }, 1500);

  var get = function(id){ var e=document.getElementById(id); return e?parseInt(e.value)||0:0; };
  var hora = getT();
  var nacl = get('in-nacl'), hart = get('in-hart');
  var col  = get('in-col'),  pg   = get('in-pg');
  var med  = get('in-med'),  otro = get('in-otro');
  var totalIn = nacl + hart + col + pg + med + otro;
  var sang = get('eg-sang'), diu  = get('eg-diu');
  var trau = get('eg-trau'), ins  = get('eg-ins');
  var bas  = get('eg-bas'),  oeg  = get('eg-otro');
  var totalEg = sang + diu + trau + ins + bas + oeg;
  var balHr = totalIn - totalEg;
  var prev  = S.liqHora.length ? S.liqHora[S.liqHora.length-1].acum : 0;
  var acum  = prev + balHr;
  S.liqHora.push({hora:hora, nacl:nacl, hart:hart, col:col, pg:pg, med:med, otro:otro,
                  sang:sang, diu:diu, trau:trau, ins:ins, bas:bas, oeg:oeg,
                  totalIn:totalIn, totalEg:totalEg, balHr:balHr, acum:acum});
  try { addToHourBucket('liq', {in:totalIn, eg:totalEg, sang:sang, diu:diu}); } catch(e) {}
  renderLiqHoraTable();
  renderLiqHoraBtns();
  if (navigator.vibrate) navigator.vibrate([30,30,30]);
  // Visual feedback
  var msg = document.createElement('div');
  msg.textContent = '✓ '+_liqHoraLabel(S.liqHora.length-1)+' registrada';
  msg.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#00c853;color:#fff;padding:10px 20px;border-radius:20px;font-weight:800;z-index:9999;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.3)';
  document.body.appendChild(msg);
  setTimeout(function(){ msg.remove(); }, 2500);
  try { autoSave(); } catch(e) {}
}

// ═══════════════════════════════════════════════
