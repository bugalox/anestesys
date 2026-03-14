// ALDRETE
// ═══════════════════════════════════════════════
function calcAld() {
  // BUG-O FIX: null guard en getElementById para evitar crash si el elemento no existe
  const s=['al-act','al-resp','al-circ','al-conc','al-sat'].reduce((a,id)=>{
    var el=document.getElementById(id); return a+(el?+el.value:0);
  },0);
  document.getElementById('ald-score').textContent=s;
  const el=document.getElementById('ald-status');
  if(s>=9){el.textContent='✓ Alta Autorizada (≥9)';el.style.color='var(--green)';}
  else if(s>=7){el.textContent='⚠ Observación requerida';el.style.color='var(--yellow)';}
  else{el.textContent='✗ No dar de alta';el.style.color='var(--red)';}
  return s;
}

// ═══════════════════════════════════════════════
