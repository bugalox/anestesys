// VITALS
// ═══════════════════════════════════════════════
const vColors = {tas:'var(--cyan)',tad:'var(--cyan)',fc:'var(--orange)',spo2:'var(--green)',fr:'var(--green)',temp:'var(--yellow)'};
const vWarnHi = {tas:160,tad:110,pam:110,fc:120,spo2:100,fr:28,temp:38.5};
const vWarnLo = {tas:80,tad:40,pam:60,fc:45,spo2:92,fr:8,temp:35};
const vDangHi = {tas:190,pam:130,fc:150,spo2:100,fr:35,temp:39};
const vDangLo = {tas:70,pam:50,fc:35,spo2:90,fr:6};

function updatePAM(){
  try {
    var tas = parseFloat(S.vitals.tas)||0;
    var tad = parseFloat(S.vitals.tad)||0;
    var pam = Math.round(tad + (tas - tad)/3);
    var el = document.getElementById('dv-pam');
    if (el) el.textContent = pam;
    var bar = document.getElementById('pam-bar');
    if (bar) {
      var pct = Math.max(0, Math.min(100, Math.round((pam-40)/(130-40)*100)));
      bar.style.width = pct + '%';
    }
  } catch(e) {}
}

function upV(key, val) {
  S.vitals[key] = parseFloat(val);
  const dv = document.getElementById('dv-'+key);
  const sl = document.getElementById('sl-'+key);
  // BUG-J FIX: null guard antes de acceder a propiedades
  if(!dv || !sl) return;
  dv.textContent = val;
  updatePAM();
  const v = parseFloat(val);
  sl.className = '';
  dv.style.color = vColors[key] || 'var(--white)';
  if((vDangLo[key]!==undefined&&v<=vDangLo[key])||(vDangHi[key]!==undefined&&v>=vDangHi[key])){
    sl.className='danger'; dv.style.color='var(--red)';
  } else if(v<=vWarnLo[key]||v>=vWarnHi[key]){
    sl.className='warn'; dv.style.color='var(--yellow)';
  }
}

function registrar() {
  if(S._readOnly){
    showToast('🔒 Solo lectura — toca Editar caso primero');
    return;
  }
  if(!S.phases.an && !S.history.length)
    showToast('⚠️ Tip: inicia la fase Anestesia antes de registrar');
  const hora = getT();
  const pam = Math.round(S.vitals.tad+(S.vitals.tas-S.vitals.tad)/3);
  const row = {...S.vitals, hora, pam, etco2: S.etco2, bis: S.bis};
  S.history.push(row);
  renderVitalTable();
  drawChart();
  checkAlarms(row, hora);
  addToHourBucket('vital', row);
  if(navigator.vibrate) navigator.vibrate(30);
  // Auto-save every 5 registros to prevent data loss
  if(S.history.length % 5 === 0) { try { autoSave(); } catch(e) {} }
}

function checkAlarms(v, hora) {
  const c = S.alarmCfg;
  if(v.tas>=c.tHi) addAlert('danger',`⚠️ TA Sistólica ALTA: ${v.tas} mmHg`,hora);
  if(v.tas<=c.tLo) addAlert('danger',`⚠️ TA Sistólica BAJA: ${v.tas} mmHg`,hora);
  const pam = v.pam || Math.round(v.tad+(v.tas-v.tad)/3);
  if(pam < 60) addAlert('danger', `🚨 PAM BAJA: ${pam} mmHg — riesgo hipoperfusión`, hora);
  if(v.fc>=c.fHi) addAlert('warn',`⚠️ Taquicardia: FC ${v.fc} lpm`,hora);
  if(v.fc<=c.fLo) addAlert('danger',`🚨 Bradicardia: FC ${v.fc} lpm`,hora);
  if(v.spo2<=c.sLo) addAlert('danger',`🚨 SpO2 CRÍTICA: ${v.spo2}%`,hora);
  if(v.spo2<=94 && v.spo2>c.sLo) addAlert('warn',`⚠️ SpO2 baja: ${v.spo2}%`,hora);
  if(v.temp>=c.tpHi) addAlert('warn',`⚠️ Hipertermia: ${v.temp}°C`,hora);
  if(v.temp < 35.5) addAlert('warn', `⚠️ Hipotermia: ${v.temp}°C`, hora);
  if(v.etco2 && v.etco2 > 50) addAlert('warn', `⚠️ EtCO₂ elevado: ${v.etco2} mmHg — hipoventilación`, hora);
  if(v.etco2 && v.etco2 < 28) addAlert('warn', `⚠️ EtCO₂ bajo: ${v.etco2} mmHg — hiperventilación`, hora);
  if(S.bis!=null&&S.bis<40) addAlert('danger',`BIS muy bajo (${S.bis}) — posible sobredosis`,hora);
  if(S.bis!=null&&S.bis>70) addAlert('warn',`BIS elevado (${S.bis}) — verificar profundidad`,hora);
}

function renderVitalTable() {
  const b = document.getElementById('vital-tbody');
  if(!S.history.length){b.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:16px">Sin registros — toca "Registrar Punto"</td></tr>';return;}
  const n = S.history.length;
  b.innerHTML=[...S.history].map((r,i)=>({r,i})).reverse().map(({r,i})=>`
    <tr onclick="openEditVital(${i})" style="cursor:pointer;transition:background .15s">
      <td class="hl" style="font-weight:800">${r.hora}</td>
      <td class="${r.tas>160||r.tas<80?'dc':r.tas>140?'wc':''}">${r.tas}</td>
      <td>${r.tad}</td>
      <td style="color:#d500f9;font-weight:700">${r.pam||Math.round(r.tad+(r.tas-r.tad)/3)}</td>
      <td class="${r.fc>120||r.fc<45?'dc':''}">${r.fc}</td>
      <td class="${r.spo2<92?'dc':r.spo2<94?'wc':''}">${r.spo2}</td>
      <td class="${(r.etco2&&(r.etco2>50||r.etco2<30))?'wc':''}">${r.etco2||'--'}</td>
      <td class="${parseFloat(r.temp)>=38.5?'wc':''}">${r.temp}</td>
      <td style="color:var(--cyan);font-size:11px">${r.nota||'✏️'}</td>
    </tr>`).join('');
  document.getElementById('reg-count').textContent = n;
  const stReg=document.getElementById('st-reg'); if(stReg) stReg.textContent=n;
}
renderVitalTable();

// ═══════════════════════════════════════════════
