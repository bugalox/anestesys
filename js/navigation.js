// NAVIGATION
// ═══════════════════════════════════════════════
function nav(id, btn) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
  window.scrollTo(0,0);
  if(id==='res')     { try{genRes();}catch(e){} }
  if(id==='monitor') { try{drawChart();}catch(e){} }
  if(id==='farm')    { try{renderFarmAcum();}catch(e){} }
  if(id==='vent')    { try{calcVentDerived();}catch(e){} }
  if(id==='lab')     { try{labLoad();}catch(e){} }
}

// ═══════════════════════════════════════════════
