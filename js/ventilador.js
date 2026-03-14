// VENTILADOR
// ═══════════════════════════════════════════════
const ventVals = {fio2:40,vc:400,fr:12,peep:5,ppeak:20,etco2:38};
function upVent(k,v,u) {
  ventVals[k]=parseFloat(v);
  var dvEl = document.getElementById('dvv-'+k);
  if(dvEl) dvEl.textContent=v+(u||'');
  // Sync EtCO2 monitor card
  if(k==='etco2') {
    S.etco2 = parseFloat(v);
    var monEl = document.getElementById('mon-etco2');
    if(monEl) {
      monEl.textContent = S.etco2;
      monEl.style.color = S.etco2>50?'var(--red)':S.etco2<30?'var(--yellow)':'var(--purple)';
    }
    // Sync monitor slider
    var sv = document.getElementById('sv-etco2');
    if(sv) sv.value = S.etco2;
  }
  calcVentDerived();
}
function calcVentDerived() {
  // Sync EtCO2 from monitor state
  if(S.etco2 != null) ventVals.etco2 = S.etco2;
  const vm=(ventVals.vc*ventVals.fr/1000);
  document.getElementById('calc-vm').textContent=vm.toFixed(1)+' L/min';
  const comp=(ventVals.vc/Math.max(1,ventVals.ppeak-ventVals.peep));
  document.getElementById('calc-comp').textContent=comp.toFixed(1)+' ml/cmH₂O';
  const vtkg=(ventVals.vc/(S.pac.pesoI||53));
  const vtkgEl=document.getElementById('calc-vtkg');
  // BUG-K FIX: null guard para vtkgEl
  if(vtkgEl){ vtkgEl.textContent=vtkg.toFixed(1)+' ml/kg'; vtkgEl.style.color=vtkg>8?'var(--red)':vtkg>6.5?'var(--yellow)':'var(--green)'; }
  // Alerts
  const msgs=[];
  if(ventVals.ppeak>30) msgs.push('⚠️ Presión pico alta (>30 cmH₂O)');
  if(vtkg>8) msgs.push('⚠️ Volutrauma — VT/kg >8 ml/kg');
  if(ventVals.etco2>45) msgs.push('⚠️ Hipercapnia — EtCO2 '+ventVals.etco2);
  if(ventVals.etco2<30) msgs.push('⚠️ Hipocapnia — EtCO2 '+ventVals.etco2);
  document.getElementById('vent-alert-box').innerHTML=msgs.length?
    msgs.map(m=>`<div style="color:var(--yellow);margin-bottom:4px">${m}</div>`).join(''):
    '<span style="color:var(--green)">✓ Parámetros dentro de límites</span>';
}

function regVent() {
  if(S._readOnly){showToast('🔒 Solo lectura — toca Editar caso');return;}
  const hora=getT();
  const v={hora,modo:document.getElementById('vm-modo').value.split('—')[0].trim(),...ventVals,
    vm:(ventVals.vc*ventVals.fr/1000).toFixed(1),
    hal:document.getElementById('sv-hal').value+'%'};
  S.ventHist.unshift(v);
  const b=document.getElementById('vent-tbody');
  b.innerHTML=S.ventHist.map((r,i)=>`<tr onclick="openEditVent(${i})" style="cursor:pointer">
    <td class="hl">${r.hora}</td><td>${r.modo}</td><td>${r.fio2}%</td>
    <td>${r.vc}</td><td>${r.fr}</td><td>${r.peep}</td>
    <td class="${r.ppeak>30?'dc':''}">${r.ppeak}</td>
    <td class="${r.etco2>45||r.etco2<30?'wc':''}">${r.etco2}</td>
    <td>${r.vm}</td><td style="color:var(--cyan);font-size:16px;text-align:center">✏️</td>
  </tr>`).join('');
  if(navigator.vibrate) navigator.vibrate(30);
  try { debounceSave(); } catch(e) {}
}

// ═══════════════════════════════════════════════
