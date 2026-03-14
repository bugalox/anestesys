// FÁRMACOS
// ═══════════════════════════════════════════════
function addFarm() {
  if(S._readOnly){showToast('🔒 Solo lectura — toca Editar caso');return;}
  const n=document.getElementById('fn').value.trim();
  const d=document.getElementById('fd').value.trim();
  const v=document.getElementById('fv').value;
  const nota=document.getElementById('fnota').value.trim();
  const hEl=document.getElementById('fh').value;
  const h=hEl||getT();
  const tipo=(document.getElementById('ftipo')||{value:'Bolo'}).value;
  const vel =(document.getElementById('fvel') ||{value:''}).value.trim();
  if(!n){showToast('⚠️ Escribe el nombre del fármaco');return;}
  S.farms.unshift({n,d:d||'—',v,h,nota,tipo,vel});
  renderFarms();
  renderFarmAcum();
  document.getElementById('fn').value='';
  document.getElementById('fd').value='';
  document.getElementById('fnota').value='';
  // FIX B: Limpiar hora y velocidad del formulario (quedaban del registro anterior)
  try{ document.getElementById('fh').value=''; }catch(e){}
  try{ document.getElementById('fvel').value=''; }catch(e){}
  document.getElementById('st-fm').textContent=S.farms.length;
  addAlert('info','💊 '+n+' '+d+' '+v+' — '+h,h);
  addToHourBucket('farm', {n,d,v,h,nota});
  if(navigator.vibrate) navigator.vibrate(30);
  try { debounceSave(); } catch(e) {}
}

function renderFarms() {
  const el=document.getElementById('farm-list');
  if(!S.farms.length){el.innerHTML='<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Sin medicamentos registrados</div>';return;}
  el.innerHTML=S.farms.map((f,i)=>`
    <div class="f-item" style="cursor:pointer" onclick="openEditFarm2(${i})">
      <div>
        <div class="f-name">${f.n}</div>
        <div class="f-dose">${f.d} · ${f.v}</div>
        ${f.nota?`<div class="f-note">${f.nota}</div>`:''}
      </div>
      <div class="f-meta"><div class="f-hour">${f.h}</div><div class="f-via">${f.v}</div></div>
    </div>`).join('');
  document.getElementById('farm-badge').textContent=S.farms.length;
  document.getElementById('st-fm').textContent=S.farms.length;
  try { renderFarmAcum(); } catch(e) {}
}
renderFarms();

// ═══════════════════════════════════════════════
