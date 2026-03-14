// MODAL PACIENTE
// ═══════════════════════════════════════════════
function openPacModal() {
  // FIX #8: Siempre escribir al DOM (sin guard if-truthy) para evitar que queden
  // datos del caso anterior cuando el modal se abre después de resetForNewCase.
  var _pv = function(id, val){ var e=document.getElementById(id); if(e) e.value = val||''; };
  _pv('m-nombre',    S.pac.nombre);
  _pv('m-edad',      S.pac.edad);
  _pv('m-talla',     S.pac.talla);
  _pv('m-sexo',      S.pac.sexo  || 'Masculino');
  _pv('m-exp',       S.pac.exp);
  _pv('m-asa',       S.pac.asa   || 'II');
  _pv('m-peso',      S.pac.peso);
  _pv('m-dx',        S.pac.dx);
  _pv('m-cx',        S.pac.cx);
  // Tipo anestesia
  var tipoanSel = document.getElementById('m-tipoan');
  if (tipoanSel) {
    if (S.pac.tipoAn) {
      tipoanSel.value = S.pac.tipoAn;
    } else if (S.pac.tipoAnNota) {
      tipoanSel.value = '__otro__';
    } else {
      tipoanSel.value = 'AGB — Anestesia General Balanceada';
    }
  }
  toggleAnFields();
  _pv('m-tipoan2',       S.pac.tipoAn2);
  _pv('m-tipoan-nota',   S.pac.tipoAnNota);
  _pv('m-anlocal',       S.pac.anLocal);
  _pv('m-anlocal-dosis', S.pac.anLocalDosis);
  // Guía
  document.querySelectorAll('input[name="guia"]').forEach(function(r){ r.checked = (r.value === S.pac.guia && !!S.pac.guia); });
  // Médicos
  _pv('m-anest',         S.pac.med);
  _pv('m-anest-ced',     S.pac.medCed);
  _pv('m-anest-ced-esp', S.pac.medCedEsp);
  _pv('m-ciru',          S.pac.ciru);
  _pv('m-ciru-ced',      S.pac.ciruCed);
  _pv('m-ciru-ced-esp',  S.pac.ciruCedEsp);
  // Auto-fill anestesiologo desde perfil cuando esté en blanco
  try {
    var _pu = getUser();
    var _ae = document.getElementById('m-anest');
    if (_pu && _pu.nombre && _ae && !_ae.value) { _ae.value = _pu.nombre; }
    var _ace  = document.getElementById('m-anest-ced');
    var _acee = document.getElementById('m-anest-ced-esp');
    if (_pu && _pu.cedula    && _ace  && !_ace.value)  _ace.value  = _pu.cedula;
    if (_pu && _pu.cedulaEsp && _acee && !_acee.value) _acee.value = _pu.cedulaEsp;
  } catch(e) {}
  _pv('m-inst', S.pac.inst);
  // Preoperatorio
  _pv('m-alergias',     S.pac.alergias);
  _pv('m-ayuno',        S.pac.ayuno);
  _pv('m-ayuno-tipo',   S.pac.ayunoTipo);
  _pv('m-antecedentes', S.pac.antecedentes);
  _pv('m-medcronicos',  S.pac.medCronicos);
  _pv('m-mallampati',   S.pac.mallampati);
  _pv('m-apertura',     S.pac.aperturaBucal);
  _pv('m-dtm',          S.pac.dtm);
  _pv('m-antid',        S.pac.antID || 'No');
  _pv('m-premed',       S.pac.premed);
  // Categoría
  var cat = S.pac.categoria || 'privado';
  document.querySelectorAll('input[name="cat-caso"]').forEach(function(r){ r.checked = (r.value === cat); });
  // Sincronizar estilos visuales de categoría
  var privLbl = document.getElementById('cat-priv-lbl');
  var hospLbl = document.getElementById('cat-hosp-lbl');
  if (privLbl && hospLbl) {
    if (cat === 'hospital') {
      hospLbl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,230,118,.12);border:2px solid var(--green);border-radius:10px;cursor:pointer;transition:all .2s';
      privLbl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,229,255,.03);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s';
    } else {
      privLbl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,229,255,.08);border:2px solid var(--cyan);border-radius:10px;cursor:pointer;transition:all .2s';
      hospLbl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,230,118,.05);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s';
    }
  }
  // Sincronizar alerta vía aérea
  try { checkViaAerea(); } catch(e) {}
  document.getElementById('pac-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
  try{document.getElementById('doc-drop-anest').style.display='none';}catch(e){}
  try{document.getElementById('doc-drop-ciru').style.display='none';}catch(e){}
}

function closePacModal() {
  document.getElementById('pac-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function toggleAnFields() {
  const v = document.getElementById('m-tipoan').value.toLowerCase();
  const isBlock = v.includes('bloqueo') || v.includes('regional') || v.includes('plexo') ||
                  v.includes('espinal') || v.includes('epidural') || v.includes('cse') ||
                  v.includes('caudal') || v.includes('femoral') || v.includes('ciatico') ||
                  v.includes('ciático') || v.includes('tap') || v.includes('pecs') ||
                  v.includes('paravert') || v.includes('intercost') || v.includes('axilar') ||
                  v.includes('supracl') || v.includes('infracl') || v.includes('larín') ||
                  v.includes('cervical') || v.includes('retro') || v.includes('perib') ||
                  v.includes('safeno') || v.includes('poplít') || v.includes('tobillo') ||
                  v.includes('interescal');
  document.getElementById('guia-row').style.display = isBlock ? 'block' : 'none';
}

function savePacModal() {
  if(S._readOnly){showToast('🔒 Solo lectura — toca Editar caso');return;}
  const nombre = document.getElementById('m-nombre').value.trim();
  if(!nombre) { showToast('⚠️ Escribe el nombre del paciente'); return; }
  S.pac.nombre = nombre;
  S.pac.edad   = document.getElementById('m-edad').value;
  S.pac.sexo   = document.getElementById('m-sexo').value;
  S.pac.exp    = document.getElementById('m-exp').value.trim();
  S.pac.asa    = document.getElementById('m-asa').value;
  S.pac.peso   = document.getElementById('m-peso').value;
  S.pac.talla  = document.getElementById('m-talla').value;
  // FIX A: Convertir a número antes de operar — input.value es string, string*0.9 = NaN
  var _pesoNum = parseFloat(S.pac.peso) || 0;
  S.pac.pesoC  = _pesoNum || S.pac.peso;
  S.pac.pesoI  = _pesoNum ? Math.round(_pesoNum * 0.9) : '';
  S.pac.dx     = document.getElementById('m-dx').value.trim();
  S.pac.cx     = document.getElementById('m-cx').value.trim();
  const tipoanSel = document.getElementById('m-tipoan').value;
  S.pac.tipoAn   = tipoanSel === '__otro__' ? '' : tipoanSel;
  S.pac.tipoAn2  = document.getElementById('m-tipoan2').value;
  S.pac.tipoAnNota = document.getElementById('m-tipoan-nota').value.trim();
  S.pac.anLocal  = document.getElementById('m-anlocal').value;
  S.pac.anLocalDosis = document.getElementById('m-anlocal-dosis').value.trim();
  const guiaEl = document.querySelector('input[name="guia"]:checked');
  S.pac.guia = guiaEl ? guiaEl.value : '';
  S.pac.med        = document.getElementById('m-anest').value.trim();
  S.pac.medCed     = (document.getElementById('m-anest-ced')     || {value:''}).value.trim();
  S.pac.medCedEsp  = (document.getElementById('m-anest-ced-esp') || {value:''}).value.trim();
  S.pac.ciru       = document.getElementById('m-ciru').value.trim();
  S.pac.ciruCed    = (document.getElementById('m-ciru-ced')      || {value:''}).value.trim();
  S.pac.ciruCedEsp = (document.getElementById('m-ciru-ced-esp')  || {value:''}).value.trim();
  S.pac.inst       = document.getElementById('m-inst').value.trim();
  // Preoperatorio
  S.pac.alergias     = (document.getElementById('m-alergias')    ||{value:''}).value.trim();
  S.pac.ayuno        = (document.getElementById('m-ayuno')       ||{value:''}).value;
  S.pac.ayunoTipo    = (document.getElementById('m-ayuno-tipo')  ||{value:''}).value;
  S.pac.antecedentes = (document.getElementById('m-antecedentes')||{value:''}).value.trim();
  S.pac.medCronicos  = (document.getElementById('m-medcronicos') ||{value:''}).value.trim();
  S.pac.mallampati   = (document.getElementById('m-mallampati')  ||{value:''}).value;
  S.pac.aperturaBucal= (document.getElementById('m-apertura')    ||{value:''}).value;
  S.pac.dtm          = (document.getElementById('m-dtm')         ||{value:''}).value;
  S.pac.antID        = (document.getElementById('m-antid')       ||{value:'No'}).value;
  S.pac.premed       = (document.getElementById('m-premed')      ||{value:''}).value.trim();
  // Categoría
  var catEl = document.querySelector('input[name="cat-caso"]:checked');
  S.pac.categoria = catEl ? catEl.value : 'privado';
  // Update topbar
  updateTopbar();
  // Update resumen institution line
  const instEl = document.getElementById('res-inst-header');
  if(instEl) instEl.textContent = S.pac.inst || 'Anestesiología · Registro Perioperatorio';
  // Recalcular VSC y permisible con los nuevos datos del paciente
  try { if(S._vscManual == null && S._vspManual == null) calcVSCyPermisible(); calcLiq(); } catch(e) {}
  closePacModal();
  if(navigator.vibrate) navigator.vibrate(30);
  // FIX SAVE-5: guardar de inmediato al registrar paciente
  try { if(!S._readOnly&&(S.pac.nombre||S.history.length||S.farms.length)) autoSave(); }catch(e){}
}

function updateTopbar() {
  const p = S.pac;
  document.getElementById('tb-nombre').textContent = p.nombre || '✏️ Nuevo Paciente';
  const parts = [];
  if(p.edad) parts.push(p.edad+'a');
  if(p.peso) parts.push(p.peso+'kg');
  if(p.exp)  parts.push('Exp:'+p.exp);
  if(p.asa)  parts.push('ASA '+p.asa);
  if(p.alergias) parts.push('⚠ ALERGIA');
  const catEl = document.getElementById('tb-cat');
  if(catEl) {
    catEl.textContent = p.categoria === 'hospital' ? '🏥' : '🔒';
    catEl.title = p.categoria === 'hospital' ? 'Hospital' : 'Privado';
  }
  document.getElementById('tb-sub').textContent = parts.length ? parts.join(' · ') : 'Toca para editar';
}

// Show modal on first load if no patient
window.addEventListener('load', () => {
  setTimeout(() => {
    if(!S.pac.nombre) openPacModal();
  }, 500);
});


// ═══════════════════════════════════════════════
