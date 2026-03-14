// LIQUIDOS
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// VSC / SANGRADO PERMISIBLE — edición manual
// ═══════════════════════════════════════════════
function editVSCModal() {
  const {vsc, vsp} = calcVSCyPermisible();
  document.getElementById('ev-vsc').value = vsc;
  document.getElementById('ev-vsp').value = vsp;
  // Mostrar info del cálculo automático
  var peso = parseFloat(S.pac.pesoC) || parseFloat(S.pac.peso) || 70;
  var edad = parseInt(S.pac.edad) || 30;
  var sexo = (S.pac.sexo || 'Masculino');
  var factor = (sexo.toLowerCase().includes('fem') || sexo === 'F') ? 65 : 70;
  if(edad < 1) factor = 80; else if(edad <= 5) factor = 75; else if(edad < 12) factor = 72;
  var hto0 = (sexo.toLowerCase().includes('fem') || sexo === 'F') ? 42 : 45;
  if(edad < 1) hto0 = 44; else if(edad <= 5) hto0 = 40;
  var vscAuto = Math.round(peso * factor);
  var vspAuto = Math.round(vscAuto * (hto0 - 21) / hto0);
  document.getElementById('vsc-auto-info').innerHTML =
    '<b style="color:#00e5ff">Cálculo automático</b><br>' +
    'Paciente: ' + peso + ' kg · ' + edad + ' años · ' + sexo + '<br>' +
    'Factor VSC: ' + factor + ' ml/kg   Hto ref: ' + hto0 + '%<br>' +
    'VSC auto: <b>' + vscAuto + ' ml</b> &nbsp; Permisible auto: <b>' + vspAuto + ' ml</b>';
  document.getElementById('edit-vsc-modal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeVSCModal() {
  document.getElementById('edit-vsc-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function saveVSCEdit() {
  var v = parseInt(document.getElementById('ev-vsc').value);
  var p = parseInt(document.getElementById('ev-vsp').value);
  if(v > 0) S._vscManual = v;
  if(p > 0) S._vspManual = p;
  calcLiq();
  closeVSCModal();
  showToast('✅ VSC y permisible actualizados');
}

function resetVSCManual() {
  S._vscManual = null;
  S._vspManual = null;
  const {vsc, vsp} = calcVSCyPermisible();
  document.getElementById('ev-vsc').value = vsc;
  document.getElementById('ev-vsp').value = vsp;
  calcLiq();
  showToast('↻ Recalculado automáticamente');
}


// ═══════════════════════════════════════════════
// EtCO2 + BIS — controles monitor principal
// ═══════════════════════════════════════════════
S.etco2 = 38;
S.bis   = null;

function adjEtco2(delta) {
  S.etco2 = Math.max(0, Math.min(80, (S.etco2||38) + delta));
  var el = document.getElementById('mon-etco2');
  if(el) el.textContent = S.etco2;
  // Color warning
  if(el) el.style.color = S.etco2 > 50 ? 'var(--red)' : S.etco2 < 30 ? 'var(--yellow)' : 'var(--purple)';
  // Sync with ventilator slider
  var sv = document.getElementById('sv-etco2');
  if(sv) { sv.value = S.etco2; upVent('etco2', S.etco2, ' mmHg'); }
  if(navigator.vibrate) navigator.vibrate(15);
}

function adjBis(delta) {
  if(S.bis === null) S.bis = 50;
  S.bis = Math.max(0, Math.min(100, S.bis + delta));
  var el  = document.getElementById('mon-bis');
  var lbl = document.getElementById('mon-bis-lbl');
  if(el) el.textContent = S.bis;
  if(lbl) {
    if(S.bis >= 80)       { lbl.textContent = 'Consciente'; lbl.style.color='var(--red)'; }
    else if(S.bis >= 60)  { lbl.textContent = 'Sedado'; lbl.style.color='var(--yellow)'; }
    else if(S.bis >= 40)  { lbl.textContent = 'Anestesia ✓'; lbl.style.color='var(--green)'; }
    else                  { lbl.textContent = 'Profundo'; lbl.style.color='var(--orange)'; }
  }
  if(navigator.vibrate) navigator.vibrate(15);
}

// ═══════════════════════════════════════════════
// adjV — ajuste con botones +/- para vitales
// ═══════════════════════════════════════════════
function adjV(key, delta) {
  var sl = document.getElementById('sl-' + key);
  if(!sl) return;
  var newVal = Math.max(parseFloat(sl.min), Math.min(parseFloat(sl.max), parseFloat(sl.value) + delta));
  sl.value = newVal;
  upV(key, newVal);
  if(navigator.vibrate) navigator.vibrate(15);
}

// ═══════════════════════════════════════════════
// updEVA — escala de dolor postoperatorio
// ═══════════════════════════════════════════════
function updEVA(val) {
  var v = parseInt(val);
  var el  = document.getElementById('po-eva-val');
  var lbl = document.getElementById('po-eva-lbl');
  var labels = ['Sin dolor','Muy leve','Leve','Molesto','Moderado','Moderado-intenso','Intenso','Muy intenso','Severo','Muy severo','Insoportable'];
  var colors = ['var(--green)','var(--green)','var(--green)','var(--yellow)','var(--yellow)','var(--orange)','var(--orange)','var(--red)','var(--red)','var(--red)','var(--red)'];
  if(el) { el.textContent = v; el.style.color = colors[v]; }
  if(lbl) { lbl.textContent = labels[v]; lbl.style.color = colors[v]; }
}

// ═══════════════════════════════════════════════
// Mallampati — alerta vía aérea difícil
// ═══════════════════════════════════════════════
function checkViaAerea() {
  var mall  = (document.getElementById('m-mallampati') || {value:''}).value;
  var antid = (document.getElementById('m-antid') || {value:'No'}).value;
  var dtm   = (document.getElementById('m-dtm') || {value:''}).value;
  var alert_el = document.getElementById('lemon-alert');
  if(!alert_el) return;
  var risk = mall === 'III' || mall === 'IV' || antid === 'Sí' || (dtm && dtm.includes('Corta'));
  alert_el.style.display = risk ? 'block' : 'none';
}

// Wire up change handlers
document.addEventListener('change', function(e) {
  if(['m-mallampati','m-antid','m-dtm'].indexOf(e.target.id) >= 0) checkViaAerea();
  if(e.target.name === 'cat-caso') {
    // Visual feedback on category selection
    var privLbl = document.getElementById('cat-priv-lbl');
    var hospLbl = document.getElementById('cat-hosp-lbl');
    if(!privLbl || !hospLbl) return;
    if(e.target.value === 'privado') {
      privLbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,229,255,.12);border:2px solid var(--cyan);border-radius:10px;cursor:pointer;transition:all .2s';
      hospLbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,230,118,.03);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s';
    } else {
      hospLbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,230,118,.12);border:2px solid var(--green);border-radius:10px;cursor:pointer;transition:all .2s';
      privLbl.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(0,229,255,.03);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s';
    }
  }
  if(e.target.id === 'ftipo') {
    document.getElementById('farm-vel-field').style.display = e.target.value === 'Infusión' || e.target.value === 'Goteo' ? 'block' : 'none';
  }
});

// ═══════════════════════════════════════════════
// DOSIS por peso — sugerencias automáticas
// ═══════════════════════════════════════════════
var DOSIS_REF = {
  'Fentanilo':       {dosis:'1-3 mcg/kg IV', unidad:'mcg', factor:2},
  'Sufentanilo':     {dosis:'0.1-0.3 mcg/kg', unidad:'mcg', factor:0.2},
  'Remifentanilo':   {dosis:'0.05-0.3 mcg/kg/min infusión', unidad:'mcg/min', factor:null},
  'Morfina':         {dosis:'0.1-0.2 mg/kg IV', unidad:'mg', factor:0.15},
  'Tramadol':        {dosis:'1-2 mg/kg IV lento', unidad:'mg', factor:1.5},
  'Propofol':        {dosis:'1.5-2.5 mg/kg inducción / 4-12 mg/kg/h TIVA', unidad:'mg', factor:2},
  'Ketamina':        {dosis:'1-2 mg/kg IV / 4 mg/kg IM', unidad:'mg', factor:1.5},
  'Midazolam':       {dosis:'0.02-0.04 mg/kg IV premedicación', unidad:'mg', factor:0.03},
  'Etomidato':       {dosis:'0.3 mg/kg IV', unidad:'mg', factor:0.3},
  'Dexmedetomidina': {dosis:'0.5-1 mcg/kg carga, luego 0.2-0.7 mcg/kg/h', unidad:'mcg', factor:0.7},
  'Rocuronio':       {dosis:'0.6 mg/kg intubación / 0.1-0.2 mg/kg mantenimiento', unidad:'mg', factor:0.6},
  'Vecuronio':       {dosis:'0.1 mg/kg intubación', unidad:'mg', factor:0.1},
  'Cisatracurio':    {dosis:'0.15-0.2 mg/kg', unidad:'mg', factor:0.15},
  'Succinilcolina':  {dosis:'1-1.5 mg/kg IV / 2-4 mg/kg IM', unidad:'mg', factor:1.2},
  'Neostigmina':     {dosis:'0.04-0.08 mg/kg (máx 5mg)', unidad:'mg', factor:0.05},
  'Sugammadex':      {dosis:'2 mg/kg rev. moderada / 4 mg/kg profunda / 16 mg/kg emergencia', unidad:'mg', factor:2},
  'Atropina':        {dosis:'0.01-0.02 mg/kg IV (mín 0.1mg)', unidad:'mg', factor:0.015},
  'Glicopirrolato':  {dosis:'0.01 mg/kg IV', unidad:'mg', factor:0.01},
  'Efedrina':        {dosis:'5-10 mg IV en bolo', unidad:'mg', factor:null},
  'Fenilefrina':     {dosis:'50-100 mcg IV bolo / 0.5-1 mcg/kg/min', unidad:'mcg', factor:null},
  'Norepinefrina':   {dosis:'0.01-0.3 mcg/kg/min infusión', unidad:'mcg/min', factor:null},
  'Adrenalina':      {dosis:'10-100 mcg IV bolo / 0.01-0.3 mcg/kg/min', unidad:'mcg', factor:null},
  'Metaraminol':     {dosis:'0.5-2 mg IV bolo', unidad:'mg', factor:null},
  'Dopamina':        {dosis:'2-20 mcg/kg/min infusión', unidad:'mcg/min', factor:null},
  'Ketorolaco':      {dosis:'0.5 mg/kg IV (máx 30mg)', unidad:'mg', factor:0.5},
  'Paracetamol IV':  {dosis:'15 mg/kg IV (máx 1g)', unidad:'mg', factor:15},
  'Dipirona':        {dosis:'15-30 mg/kg IV lento (máx 2g)', unidad:'mg', factor:20},
  'Dexketoprofeno':  {dosis:'0.5 mg/kg IV (máx 50mg)', unidad:'mg', factor:0.5},
  'Ondansetrón':     {dosis:'4-8 mg IV profilaxis PONV', unidad:'mg', factor:null},
  'Dexametasona':    {dosis:'0.1-0.2 mg/kg (máx 8mg PONV / 20mg antiedema)', unidad:'mg', factor:0.1},
  'Dexametasona 4mg':{dosis:'4mg fijo PONV', unidad:'mg', factor:null},
  'Metoclopramida':  {dosis:'0.1-0.15 mg/kg IV', unidad:'mg', factor:0.1},
  'Furosemida':      {dosis:'0.5-1 mg/kg IV', unidad:'mg', factor:0.5},
  'Labetalol':       {dosis:'5-20 mg IV lento', unidad:'mg', factor:null},
  'Esmolol':         {dosis:'0.5 mg/kg carga / 50-300 mcg/kg/min', unidad:'mg', factor:0.5},
  'Amiodarona':      {dosis:'5 mg/kg en 20 min (máx 300mg)', unidad:'mg', factor:5},
  'Lidocaína IV':    {dosis:'1-1.5 mg/kg IV lento', unidad:'mg', factor:1.2},
  'Heparina':        {dosis:'100 UI/kg IV cirugía vascular', unidad:'UI', factor:100},
  'Protamina':       {dosis:'1mg por cada 100 UI heparina', unidad:'mg', factor:null},
  'Hidrocortisona':  {dosis:'1-2 mg/kg IV', unidad:'mg', factor:1.5},
  'Magnesio sulfato':{dosis:'30-50 mg/kg IV lento', unidad:'mg', factor:40},
  'Glucosa 50%':     {dosis:'0.5-1 g/kg IV', unidad:'g', factor:0.5},
  'Bicarbonato de sodio':{dosis:'1 mEq/kg IV', unidad:'mEq', factor:1},
  'Sugammadex 200mg':{dosis:'200mg fijo para rev. moderada', unidad:'mg', factor:null},
};

function sugerirDosis(farmName) {
  var hint = document.getElementById('farm-dosis-hint');
  if(!hint) return;
  var nombre = farmName.toLowerCase();
  var ref = null;
  Object.keys(DOSIS_REF).forEach(function(k){ if(nombre.includes(k.toLowerCase())) ref = DOSIS_REF[k]; });
  if(!ref) { hint.style.display = 'none'; return; }
  var peso = parseFloat(S.pac.pesoC) || parseFloat(S.pac.peso) || 0;
  var msg = '⚖️ Dosis referencia: ' + ref.dosis;
  if(ref.factor && peso > 0) {
    var calc = Math.round(ref.factor * peso * 10) / 10;
    msg += ' → para ' + peso + 'kg: <b style="color:var(--cyan)">' + calc + ' ' + ref.unidad + '</b>';
  }
  hint.innerHTML = msg;
  hint.style.display = 'block';
}

function openDosisCalc() {
  var peso = parseFloat(S.pac.pesoC) || parseFloat(S.pac.peso) || 0;
  var rows = Object.keys(DOSIS_REF).map(function(k) {
    var ref = DOSIS_REF[k];
    var calc = (ref.factor && peso > 0) ? (Math.round(ref.factor * peso * 10)/10) + ' ' + ref.unidad : ref.dosis;
    return '<tr style="border-bottom:1px solid #1e2d44"><td style="padding:7px 10px;color:#dde8ff;font-weight:700">' + k + '</td>' +
           '<td style="padding:7px 10px;color:#3d5a78;font-size:11px">' + ref.dosis + '</td>' +
           '<td style="padding:7px 10px;color:#00e5ff;font-weight:800">' + calc + '</td></tr>';
  }).join('');
  var modal = document.createElement('div');
  modal.id = 'dosis-calc-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(4,6,13,.97);overflow-y:auto;padding:20px 16px;padding-top:calc(24px + env(safe-area-inset-top))';
  modal.innerHTML = '<div style="max-width:480px;margin:0 auto">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
    '<div style="font-size:17px;font-weight:800;color:#ff6d00">⚖️ Calculadora de Dosis</div>' +
    '<button id="dc-close" style="background:#0f1628;border:1px solid #1e2d44;border-radius:8px;color:#dde8ff;padding:8px 14px;font-size:13px;cursor:pointer">✕ Cerrar</button></div>' +
    (peso > 0 ? '<div style="background:rgba(0,229,255,.06);border:1px solid rgba(0,229,255,.2);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#00e5ff">Paciente: <b>' + (S.pac.nombre||'Sin nombre') + '</b> · Peso: <b>' + peso + ' kg</b></div>' : '') +
    '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr style="background:#0a0f1c"><th style="padding:8px 10px;text-align:left;font-size:10px;color:#3d5a78;text-transform:uppercase;letter-spacing:1px">Fármaco</th><th style="padding:8px 10px;text-align:left;font-size:10px;color:#3d5a78;text-transform:uppercase;letter-spacing:1px">Dosis std</th><th style="padding:8px 10px;text-align:left;font-size:10px;color:#3d5a78;text-transform:uppercase;letter-spacing:1px">Para este px</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table></div>';
  document.body.appendChild(modal);
  document.getElementById('dc-close').addEventListener('click', function(){ modal.remove(); });
}

// ═══════════════════════════════════════════════
// renderFarmAcum — dosis acumulada por fármaco
// ═══════════════════════════════════════════════
function renderFarmAcum() {
  var bar = document.getElementById('farm-acum-bar');
  var list = document.getElementById('farm-acum-list');
  if(!bar || !list || !S.farms.length) { if(bar) bar.style.display='none'; return; }
  bar.style.display = 'block';
  var acum = {};
  S.farms.forEach(function(f) {
    var k = f.n;
    if(!acum[k]) acum[k] = [];
    acum[k].push(f.d);
  });
  list.innerHTML = Object.keys(acum).map(function(k) {
    var doses = acum[k];
    return '<div style="background:rgba(255,109,0,.1);border:1px solid rgba(255,109,0,.25);border-radius:7px;padding:5px 8px;font-size:11px">' +
      '<span style="color:#ff6d00;font-weight:700">' + k + '</span> ' +
      '<span style="color:#3d5a78">×' + doses.length + '</span> ' +
      '<span style="color:#dde8ff">' + doses.join(', ') + '</span></div>';
  }).join('');
}

// ═══════════════════════════════════════════════
