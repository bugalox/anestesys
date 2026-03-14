// RESUMEN
// ═══════════════════════════════════════════════
function genRes() {
  const p = S.pac;
  const fecha = new Date().toLocaleString('es-MX');
  document.getElementById('res-fecha').textContent = fecha;
  const instEl = document.getElementById('res-inst-header');
  if (instEl) instEl.textContent = p.inst || 'Anestesiología · Registro Perioperatorio';

  // ── All data upfront, declared ONCE ──
  function getF(id) { const el = document.getElementById(id); return el ? (parseInt(el.value) || 0) : 0; }
  const nacl    = getF('in-nacl'), hart = getF('in-hart'), col = getF('in-col');
  const pg_ml   = getF('in-pg'),  med_ml = getF('in-med'), otro_in = getF('in-otro');
  const ins_ml  = getF('eg-ins'), bas_ml = getF('eg-bas');
  const sang_ml = getF('eg-sang'), diu_ml = getF('eg-diu');
  const trau_ml = getF('eg-trau'), otro_eg = getF('eg-otro');
  const ti  = nacl + hart + col + pg_ml + med_ml + otro_in;
  const te  = ins_ml + bas_ml + diu_ml + sang_ml + trau_ml + otro_eg;
  const bal = ti - te;
  // FIX J: vsp correcto = VSC × (Hto0 - 21) / Hto0 (igual que calcVSCyPermisible)
  var _resoPeso  = parseFloat(S.pac.pesoC) || parseFloat(S.pac.peso) || 70;
  var _resoEdad  = parseInt(S.pac.edad) || 30;
  var _resoSexo  = (S.pac.sexo||'Masculino').toLowerCase();
  var _resoFactor= (_resoSexo.includes('fem')||_resoSexo==='f') ? 65 : 70;
  if(_resoEdad<1) _resoFactor=80; else if(_resoEdad<=5) _resoFactor=75; else if(_resoEdad<12) _resoFactor=72;
  var _resoVSC   = Math.round(_resoPeso * _resoFactor);
  var _resoHto0  = (_resoSexo.includes('fem')||_resoSexo==='f') ? 42 : 45;
  if(_resoEdad<1) _resoHto0=44; else if(_resoEdad<=5) _resoHto0=40;
  var vsp = S._vspManual != null ? S._vspManual : Math.round(_resoVSC * (_resoHto0-21) / _resoHto0);
  const sangPct = Math.min(100, Math.round(sang_ml / vsp * 100));
  const lv  = S.history.length ? S.history[S.history.length - 1] : {};
  const vl  = S.ventHist.length ? S.ventHist[0] : null;
  const sc  = calcAld();
  const hrs = Object.keys(S.hourBuckets);
  // ── Tiempos: usar los valores reales de inicio/fin y duraciones congeladas ──
  function _gtv(id) { var e=document.getElementById(id); return e ? e.value || '--:--' : '--:--'; }
  function _tt(id) { var e=document.getElementById(id); return e ? e.textContent || '--:--' : '--:--'; }
  const tAN  = _gtv('time-an');
  const tCX  = _gtv('time-cx');
  // Hora fin: usar fin de anestesia si existe, si no usar fin de cirugía, si no '--:--'
  const tFinAN = _gtv('time-fin-an');
  const tFinCX = _gtv('time-fin-cx');
  const tFN  = tFinAN !== '--:--' ? tFinAN : (tFinCX !== '--:--' ? tFinCX : '--:--');
  // Duraciones: usar valores congelados si existen
  const durAN = S._frozenTan != null ? fmt2(S._frozenTan) : _tt('st-tan');
  const durCX = S._frozenTcx != null ? fmt2(S._frozenTcx) : _tt('st-tcx');
  // Tiempo total: desde inicio anestesia hasta fin más tardío de cualquier fase
  var _totalMs = null;
  if(S.phases.an) {
    var _finRef = null;
    if(S.phases.finAn && S.phases.finCx) _finRef = Math.max(S.phases.finAn.getTime(), S.phases.finCx.getTime());
    else if(S.phases.finAn) _finRef = S.phases.finAn.getTime();
    else if(S.phases.finCx) _finRef = S.phases.finCx.getTime();
    if(_finRef) _totalMs = _finRef - S.phases.an.getTime();
  }
  const durTotal = _totalMs != null ? fmt2(_totalMs) : '--:--';
  // ── Torniquete / Isquemia ──
  const tIsqIni  = S.phases.isqIni
    ? (function(d){ return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); })(S.phases.isqIni)
    : null;
  const tIsqFin  = S.phases.isqFin
    ? (function(d){ return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); })(S.phases.isqFin)
    : null;
  const durIsq   = (S.phases.isqIni && S.phases.isqFin)
    ? fmt2(S.phases.isqFin - S.phases.isqIni)
    : (S.phases.isqIni ? 'En curso' : null);

  // ── Screen version ──
  document.getElementById('res-pac').innerHTML = `
    <div class="res-title">DATOS DEL PACIENTE</div>
    <div class="res-row"><span>Paciente</span><span style="font-weight:800">${p.nombre||'—'}</span></div>
    <div class="res-row"><span>Edad / Sexo</span><span>${p.edad||'—'} a · ${p.sexo||'—'}</span></div>
    ${p.exp ? '<div class="res-row"><span>Expediente</span><span>' + p.exp + '</span></div>' : ''}
    <div class="res-row"><span>Diagnóstico</span><span style="max-width:55%;text-align:right">${p.dx||'—'}</span></div>
    <div class="res-row"><span><i class="ph ph-knife" style="font-size:10px;margin-right:3px"></i>Cirugía</span><span style="max-width:55%;text-align:right">${p.cx||'—'}</span></div>
    <div class="res-row"><span>Técnica</span><span style="color:var(--cyan);max-width:60%;text-align:right">${p.tipoAn||'—'}${p.tipoAn2 ? ' + ' + p.tipoAn2 : ''}</span></div>
    ${p.guia ? '<div class="res-row"><span>Guía</span><span>' + p.guia + '</span></div>' : ''}
    ${p.anLocal ? '<div class="res-row"><span>Anest. local</span><span>' + p.anLocal + (p.anLocalDosis ? ' · ' + p.anLocalDosis : '') + '</span></div>' : ''}
    ${p.tipoAnNota ? '<div class="res-row"><span>Notas técnica</span><span style="max-width:60%;text-align:right;font-size:11px">' + p.tipoAnNota + '</span></div>' : ''}
    <div class="res-row"><span>Peso / Talla</span><span>${p.peso ? p.peso + ' kg' : '—'}${p.talla ? ' · ' + p.talla + ' cm' : ''}</span></div>
    <div class="res-row"><span>ASA</span><span style="color:var(--yellow);font-weight:800">${p.asa||'—'}</span></div>
    <div class="res-row"><span>Anestesiólogo</span><span>${p.med||'—'}</span></div>
    ${S.pac.medCed ? `<div class="pr-row-sub">Céd. Prof: ${S.pac.medCed}${S.pac.medCedEsp ? ' / Esp: '+S.pac.medCedEsp : ''}</div>` : ''}
    ${p.ciru ? `<div class="res-row"><span>Cirujano</span><span>${p.ciru}</span></div>` : ''}
    ${S.pac.ciruCed ? `<div class="pr-row-sub">Céd. Prof: ${S.pac.ciruCed}${S.pac.ciruCedEsp ? ' / Esp: '+S.pac.ciruCedEsp : ''}</div>` : ''}
    ${p.inst ? '<div class="res-row"><span>Institución</span><span>' + p.inst + '</span></div>' : ''}
    ${p.alergias ? '<div class="res-row"><span>Alergias</span><span style="color:var(--red);font-weight:800">' + p.alergias + '</span></div>' : ''}
    ${p.mallampati ? '<div class="res-row"><span>Mallampati</span><span>' + p.mallampati + (p.antID&&p.antID!=='No'?' · ID previo: '+p.antID:'') + '</span></div>' : ''}
    ${p.aperturaBucal ? `<div class="res-row"><span>Apertura bucal</span><span>${p.aperturaBucal}${p.dtm ? ' · DTM: '+p.dtm : ''}</span></div>` : ''}
    ${p.ayuno ? '<div class="res-row"><span>Ayuno</span><span>' + p.ayuno + 'h ' + (p.ayunoTipo||'') + '</span></div>' : ''}
    ${p.antecedentes ? '<div class="res-row"><span>Antecedentes</span><span style="max-width:60%;text-align:right;font-size:11px">' + p.antecedentes + '</span></div>' : ''}
    ${p.medCronicos ? '<div class="res-row"><span>Medicamentos crónicos</span><span style="max-width:60%;text-align:right;font-size:11px">' + p.medCronicos + '</span></div>' : ''}
    ${p.premed ? '<div class="res-row"><span>Premedicación</span><span>' + p.premed + '</span></div>' : ''}
    <div class="res-row"><span>Inicio Anestesia</span><span>${tAN}</span></div>
    <div class="res-row"><span>Inicio Cirugía</span><span>${tCX}</span></div>
    <div class="res-row"><span>Fin</span><span>${tFN}</span></div>
    ${tIsqIni ? `<div class="res-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px"><span style="color:var(--orange)">🩺 Torniquete inicio</span><span>${tIsqIni}</span></div>` : ''}
    ${tIsqFin ? `<div class="res-row"><span style="color:var(--orange)">Torniquete liberado</span><span>${tIsqFin}</span></div>` : ''}
    ${durIsq ? `<div class="res-row"><span style="color:var(--orange)">Tiempo isquemia</span><span style="color:var(--orange);font-weight:800">${durIsq}</span></div>` : ''}` ;

  document.getElementById('res-vitales').innerHTML = `
    <div class="res-title">SIGNOS VITALES EGRESO (${S.history.length} registros)</div>
    <div class="res-row"><span>TA</span><span style="color:var(--cyan)">${lv.tas||'--'}/${lv.tad||'--'} mmHg</span></div>
    <div class="res-row"><span>FC / FR</span><span>${lv.fc||'--'} lpm / ${lv.fr||'--'} rpm</span></div>
    <div class="res-row"><span>SpO2 / Temp</span><span>${lv.spo2||'--'}% / ${lv.temp||'--'}°C</span></div>`;

  document.getElementById('res-liq').innerHTML = `
    <div class="res-title">BALANCE DE LÍQUIDOS</div>
    <div class="res-row"><span>Total Ingresos</span><span style="color:var(--green)">${ti} ml</span></div>
    <div class="res-row"><span>Total Egresos</span><span style="color:var(--red)">${te} ml</span></div>
    <div class="res-row"><span>Sangrado / Diuresis</span><span>${sang_ml} ml / ${diu_ml} ml</span></div>
    <div class="res-total"><span>BALANCE TOTAL</span><span style="color:${bal >= 0 ? 'var(--green)' : 'var(--yellow)'}">${bal >= 0 ? '+' : ''}${bal} ml</span></div>`;

  document.getElementById('res-farms').innerHTML = `
    <div class="res-title">FÁRMACOS (${S.farms.length})</div>
    ${[...S.farms].reverse().map(f => '<div class="res-row"><span>' + f.h + ' ' + f.n + '</span><span>' + f.d + ' ' + f.v + '</span></div>').join('')}`;

  document.getElementById('res-vent').innerHTML = vl ? `
    <div class="res-title">VENTILADOR</div>
    <div class="res-row"><span>Modo / FiO2</span><span>${vl.modo} · ${vl.fio2}%</span></div>
    <div class="res-row"><span>VC / FR / PEEP</span><span>${vl.vc}ml · ${vl.fr}rpm · ${vl.peep}cmH₂O</span></div>
    <div class="res-row"><span>P.Pico / EtCO2</span><span>${vl.ppeak}cmH₂O · ${vl.etco2}mmHg</span></div>` : '';

  document.getElementById('res-aldrete').innerHTML = (function(){
    var evaV = (document.getElementById('po-eva')||{value:'0'}).value;
    var nauV = (document.getElementById('po-nausea')||{value:'No'}).value;
    var angV = (document.getElementById('po-analgesia')||{value:''}).value;
    var ingV = (document.getElementById('po-ingucpa')||{value:''}).value;
    var egrV = (document.getElementById('po-egreso')||{value:''}).value;
    var dstV = (document.getElementById('po-destino')||{value:''}).value;
    var notV = (document.getElementById('po-notas')||{value:''}).value;
    return '<div class="res-title">ESCALA ALDRETE</div>' +
      '<div style="display:flex;align-items:center;gap:16px;padding:8px 0">' +
      '<div style="font-size:44px;font-weight:800;color:' + (sc>=9?'var(--green)':'var(--yellow)') + '">' + sc + '/10</div>' +
      '<div style="color:' + (sc>=9?'var(--green)':'var(--yellow)') + '">' + (sc>=9?'✓ Alta Autorizada':'⚠ Observación') + '</div></div>' +
      '<div class="res-title" style="margin-top:8px">POST-OPERATORIO / UCPA</div>' +
      '<div class="res-row"><span>Dolor EVA</span><span>' + evaV + '/10</span></div>' +
      '<div class="res-row"><span>Náusea/Vómito</span><span>' + nauV + '</span></div>' +
      (angV?'<div class="res-row"><span>Analgesia postop</span><span>'+angV+'</span></div>':'') +
      (ingV?'<div class="res-row"><span>Ingreso UCPA</span><span>'+ingV+'</span></div>':'') +
      (egrV?'<div class="res-row"><span>Egreso UCPA</span><span>'+egrV+'</span></div>':'') +
      '<div class="res-row"><span>Destino</span><span>'+dstV+'</span></div>' +
      (notV?'<div class="res-row"><span>Notas</span><span style="max-width:60%;text-align:right;font-size:11px">'+notV+'</span></div>':'');
  })();

  // ── PDF Helper ──
  function ST(t, color) { color = color || '#0077aa'; return '<div style="background:' + color + ';color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:4px 8px;border-radius:4px;margin:10px 0 5px">' + t + '</div>'; }
  function ROW(l, r) { return '<div style="display:flex;justify-content:space-between;padding:3px 4px;border-bottom:1px solid #eee;font-size:9px"><span style="color:#555">' + l + '</span><span style="font-weight:600">' + r + '</span></div>'; }

  // ── HOJA 1: Portada + Paciente + Signos Vitales ──
  const vitalRows = S.history.map(function(r, i) {
    const pam = r.pam || Math.round(r.tad + (r.tas - r.tad) / 3);
    const bg = i % 2 === 0 ? '#fff' : '#f8fbff';
    const tasCl = (r.tas > 160 || r.tas < 80) ? 'color:red;font-weight:800' : r.tas > 140 ? 'color:orange' : '';
    const fcCl  = (r.fc > 120 || r.fc < 45)  ? 'color:red;font-weight:800' : '';
    const spCl  = r.spo2 < 92 ? 'color:red;font-weight:800' : r.spo2 < 94 ? 'color:orange' : '';
    const tpCl  = parseFloat(r.temp) >= 38.5  ? 'color:orange' : '';
    return '<tr style="background:' + bg + '"><td style="padding:3px 5px;font-weight:700;color:#0077aa">' + r.hora +
      '</td><td style="padding:3px 5px;' + tasCl + '">' + r.tas +
      '</td><td style="padding:3px 5px">' + r.tad +
      '</td><td style="padding:3px 5px;font-weight:700">' + pam +
      '</td><td style="padding:3px 5px;' + fcCl + '">' + r.fc +
      '</td><td style="padding:3px 5px;' + spCl + '">' + r.spo2 +
      '</td><td style="padding:3px 5px;' + (r.etco2&&(r.etco2>50||r.etco2<28)?'color:orange;font-weight:800':'') + '">' + (r.etco2||'--') +
      '</td><td style="padding:3px 5px;' + tpCl + '">' + r.temp + '</td></tr>';
  }).join('');

  const pg1 = '<div style="font-family:Arial,sans-serif;color:#000;padding:14px 16px;font-size:9px">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0077aa;padding-bottom:8px;margin-bottom:10px">' +
      '<div><div style="font-size:20px;font-weight:900;color:#0077aa">REGISTRO ANESTÉSICO</div>' +
      '<div style="font-size:9px;color:#666;margin-top:2px">' + (p.inst || 'Anestesiología · Registro Perioperatorio') + '</div></div>' +
      '<div style="text-align:right;font-size:9px;color:#666"><div>' + fecha + '</div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">' +
      '<div style="border:1px solid #ddd;border-radius:6px;overflow:hidden">' +
        '<div style="background:#0077aa;color:#fff;font-size:9px;font-weight:800;padding:4px 8px">👤 PACIENTE</div>' +
        '<div style="padding:6px 8px">' +
          '<div style="font-size:14px;font-weight:900;margin-bottom:3px">' + (p.nombre || '—') + '</div>' +
          '<div>' + (p.edad || '—') + ' años · ' + (p.sexo || '—') + ' · ASA <b style="color:#d44">' + (p.asa || '—') + '</b></div>' +
          (p.exp ? '<div style="color:#666;font-size:8px">Exp: ' + p.exp + '</div>' : '') +
          '<div style="margin-top:4px;border-top:1px solid #eee;padding-top:3px"><b>Dx:</b> ' + (p.dx || '—') + '</div>' +
          '<div><b>Cx:</b> <i>' + (p.cx || '—') + '</i></div>' +
          '<div style="margin-top:3px;color:#0077aa;font-weight:700;font-size:8px">' + (p.tipoAn || '—') + (p.tipoAn2 ? ' + ' + p.tipoAn2 : '') + '</div>' +
          (p.guia ? '<div style="font-size:7px;color:#444">Guía: ' + p.guia + '</div>' : '') +
          (p.anLocal ? '<div style="font-size:7px;color:#444">An. local: ' + p.anLocal + (p.anLocalDosis ? ' · ' + p.anLocalDosis : '') + '</div>' : '') +
          (p.tipoAnNota ? '<div style="font-size:7px;color:#555;font-style:italic;margin-top:2px">' + p.tipoAnNota + '</div>' : '') +
          (p.alergias ? '<div style="font-size:7px;color:#c00;font-weight:800;margin-top:2px;background:#fee;padding:1px 3px;border-radius:2px">⚠ ALERGIA: ' + p.alergias + '</div>' : '') +
          (p.mallampati ? '<div style="font-size:7px;color:#444">Mallampati: ' + p.mallampati + (p.antID&&p.antID!=='No'?' · ID prev: '+p.antID:'') + '</div>' : '') +
          (p.ayuno ? '<div style="font-size:7px;color:#444">Ayuno: ' + p.ayuno + 'h ' + (p.ayunoTipo||'') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="border:1px solid #ddd;border-radius:6px;overflow:hidden">' +
        '<div style="background:#005f8a;color:#fff;font-size:9px;font-weight:800;padding:4px 8px">👨‍⚕️ EQUIPO MÉDICO</div>' +
        '<div style="padding:6px 8px">' +
          '<div style="margin-bottom:4px"><span style="color:#888">Anestesiólogo:</span><br><b>' + (p.med || '—') + '</b>'
          + (S.pac.medCed ? '<br><span style="font-size:8px;color:#0077aa">Céd: ' + S.pac.medCed + (S.pac.medCedEsp ? ' / Esp: ' + S.pac.medCedEsp : '') + '</span>' : '')
          + '</div>' +
          '<div style="margin-bottom:8px"><span style="color:#888">Cirujano:</span><br>' + (p.ciru || '—')
          + (S.pac.ciruCed ? '<br><span style="font-size:8px;color:#0077aa">Céd: ' + S.pac.ciruCed + (S.pac.ciruCedEsp ? ' / Esp: ' + S.pac.ciruCedEsp : '') + '</span>' : '')
          + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">' +
            '<div style="border:1px solid #0077aa;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Inicio Anest.</div><div style="font-weight:800;font-size:11px;color:#0077aa">' + tAN + '</div></div>' +
            '<div style="border:1px solid #e67300;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Inicio Cx</div><div style="font-weight:800;font-size:11px;color:#e67300">' + tCX + '</div></div>' +
            '<div style="border:1px solid #cc0033;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Fin</div><div style="font-weight:800;font-size:11px;color:#cc0033">' + tFN + '</div></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px">' +
            '<div style="background:#e8f4fb;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Dur. Anest.</div><div style="font-weight:800;font-size:11px;color:#0077aa">' + durAN + '</div></div>' +
            '<div style="background:#fff5ec;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Dur. Cx</div><div style="font-weight:800;font-size:11px;color:#e67300">' + durCX + '</div></div>' +
            '<div style="background:#f8ecec;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Tiempo Total</div><div style="font-weight:800;font-size:11px;color:#cc0033">' + durTotal + '</div></div>' +
          '</div>' +
          (tIsqIni ? (
            '<div style="margin-top:6px;border-top:1px solid #f0c040;padding-top:5px">' +
            '<div style="font-size:7px;font-weight:700;color:#e67300;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">🩺 Torniquete / Isquemia</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">' +
              '<div style="border:1px solid #e67300;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Inicio</div><div style="font-weight:800;font-size:11px;color:#e67300">' + tIsqIni + '</div></div>' +
              (tIsqFin ? '<div style="border:1px solid #e67300;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Liberado</div><div style="font-weight:800;font-size:11px;color:#e67300">' + tIsqFin + '</div></div>' : '<div style="border:1px solid #ccc;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Liberado</div><div style="font-size:10px;color:#aaa">En curso</div></div>') +
              (durIsq ? '<div style="background:#fff5ec;border-radius:4px;padding:3px 4px;text-align:center"><div style="font-size:7px;color:#888">Duración</div><div style="font-weight:800;font-size:11px;color:#e67300">' + durIsq + '</div></div>' : '') +
            '</div>' +
          '</div>'
          ) : '') +
          '<div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px">' +
            '<div style="background:#f0f8ff;border:1px solid #cde;border-radius:4px;padding:4px;text-align:center"><div style="font-size:7px;color:#888">Dur. Anest.</div><div style="font-weight:800;color:#0077aa">' + durAN + '</div></div>' +
            '<div style="background:#fff8f0;border:1px solid #edc;border-radius:4px;padding:4px;text-align:center"><div style="font-size:7px;color:#888">Dur. Cx</div><div style="font-weight:800;color:#e67300">' + durCX + '</div></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    ST('📊 SIGNOS VITALES — HOJA DE MONITOREO COMPLETA') +
    ST('📈 GRÁFICA DE SIGNOS VITALES') +
    (S.history.length ? (function() {
      // Build SVG chart
      const W=680, H=120, pad=30;
      const hours = S.history.map(r=>r.hora);
      const n = S.history.length;
      const xStep = n > 1 ? (W - pad*2) / (n-1) : 0;
      function xOf(i) { return pad + i * xStep; }
      // Normalize to chart height
      function line(vals, min, max, color, label) {
        if(n < 2) return '';
        const pts = vals.map((v,i) => xOf(i)+','+(pad + (H-pad*2) * (1-(v-min)/(max-min||1))));
        return '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linejoin="round"/>';
      }
      const tasV = S.history.map(r=>r.tas), tadV = S.history.map(r=>r.tad), pamV = S.history.map(r=>r.pam||Math.round(r.tad+(r.tas-r.tad)/3));
      const fcV  = S.history.map(r=>r.fc),  spV  = S.history.map(r=>r.spo2);
      // X axis labels (every 3rd)
      const xLabels = hours.map((h,i) => i%Math.max(1,Math.floor(n/8))===0 ? '<text x="'+xOf(i)+'" y="'+(H+8)+'" text-anchor="middle" font-size="7" fill="#888">'+h+'</text>' : '').join('');
      // Y axis lines
      const yLines = [60,80,100,120,140,160].map(v => {
        const y = pad + (H-pad*2)*(1-(v-50)/(200));
        return '<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+y+'" y2="'+y+'" stroke="#333" stroke-width="0.5"/><text x="'+(pad-4)+'" y="'+(y+3)+'" text-anchor="end" font-size="6" fill="#666">'+v+'</text>';
      }).join('');
      const svg = '<svg width="100%" viewBox="0 0 '+(W+20)+' '+(H+20)+'" xmlns="http://www.w3.org/2000/svg" style="display:block;margin-bottom:4px">'+
        '<rect width="100%" height="100%" fill="#111" rx="4"/>'+
        yLines+
        line(tasV,50,200,'#00e5ff','TAS')+
        line(tadV,50,200,'#0099cc','TAD')+
        line(pamV,50,200,'#aa00ff','PAM')+
        line(fcV,30,180,'#ff6d00','FC')+
        line(spV,70,100,'#00e676','SpO2')+
        xLabels+
        '<text x="10" y="12" font-size="8" fill="#00e5ff" font-weight="bold">TAS</text>'+
        '<text x="40" y="12" font-size="8" fill="#0099cc" font-weight="bold">TAD</text>'+
        '<text x="70" y="12" font-size="8" fill="#aa00ff" font-weight="bold">PAM</text>'+
        '<text x="100" y="12" font-size="8" fill="#ff6d00" font-weight="bold">FC</text>'+
        '<text x="125" y="12" font-size="8" fill="#00e676" font-weight="bold">SpO2</text>'+
      '</svg>';
      return svg;
    })() : '<div style="color:#999;padding:6px">Sin datos para gráfica</div>') +
    ST('📊 REGISTRO DE SIGNOS VITALES — TABLA COMPLETA') +
    (S.history.length ?
      '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
        '<thead><tr style="background:#0077aa;color:#fff">' +
          '<th style="padding:4px 5px">Hora</th><th style="padding:4px 5px">TA Sist.</th><th style="padding:4px 5px">TA Diast.</th>' +
          '<th style="padding:4px 5px">PAM</th><th style="padding:4px 5px">FC</th>' +
          '<th style="padding:4px 5px">SpO₂%</th><th style="padding:4px 5px">EtCO₂</th><th style="padding:4px 5px">Temp°C</th>' +
        '</tr></thead><tbody>' + vitalRows + '</tbody></table>' +
      '<div style="font-size:7px;color:#888;margin-top:3px">* Valores en rojo = fuera de límites</div>'
      : '<div style="color:#999;padding:8px;text-align:center">Sin registros de signos vitales</div>') +
  '</div>';

  // ── HOJA 2: Líquidos + Horario + Fármacos ──
  const hrsRows = hrs.map(function(hr, i) {
    const b = S.hourBuckets[hr];
    const bhr = b.liqIn - b.sang - b.diu;
    const bg2 = i % 2 === 0 ? '#fff' : '#f5f8ff';
    return '<tr style="background:' + bg2 + '">' +
      '<td style="padding:3px 5px;font-weight:700;color:#334455">' + hr + '</td>' +
      '<td style="padding:3px 5px;text-align:center;color:#006633;font-weight:700">' + b.liqIn + '</td>' +
      '<td style="padding:3px 5px;text-align:center;color:' + (b.sang > 0 ? '#cc0000' : '#666') + '">' + b.sang + '</td>' +
      '<td style="padding:3px 5px;text-align:center">' + b.diu + '</td>' +
      '<td style="padding:3px 5px;text-align:center;font-weight:800;color:' + (bhr >= 0 ? '#006633' : '#cc6600') + '">' + (bhr >= 0 ? '+' : '') + bhr + '</td>' +
      '<td style="padding:3px 5px;font-size:7px;color:#555">' + b.farms.map(function(f) { return '<b>' + f.n + '</b> ' + f.d; }).join(' · ') + '</td></tr>';
  }).join('');

  const pg2 = '<div style="font-family:Arial,sans-serif;color:#000;padding:14px 16px;font-size:9px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0077aa;padding-bottom:5px;margin-bottom:10px">' +
      '<div style="font-size:13px;font-weight:900;color:#0077aa">REGISTRO ANESTÉSICO — <span style="font-size:11px">' + (p.nombre || 'Paciente') + '</span></div>' +
      '<div style="font-size:8px;color:#666">' + fecha + '</div>' +
    '</div>' +
    ST('💧 BALANCE DE LÍQUIDOS') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">' +
      '<div>' +
        '<div style="font-size:8px;font-weight:700;color:#006633;text-transform:uppercase;margin-bottom:4px">📥 INGRESOS</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
          (nacl  ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">NaCl 0.9%</td><td style="padding:2px 5px;text-align:right">' + nacl + ' ml</td></tr>' : '') +
          (hart  ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Sol. Hartman</td><td style="padding:2px 5px;text-align:right">' + hart + ' ml</td></tr>' : '') +
          (col   ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Coloides</td><td style="padding:2px 5px;text-align:right">' + col + ' ml</td></tr>' : '') +
          (pg_ml ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Paq. Globular</td><td style="padding:2px 5px;text-align:right">' + pg_ml + ' ml</td></tr>' : '') +
          (med_ml ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Medicamentos</td><td style="padding:2px 5px;text-align:right">' + med_ml + ' ml</td></tr>' : '') +
          '<tr style="background:#e8f5e9"><td style="padding:3px 5px;font-weight:800;color:#006633">TOTAL</td><td style="padding:3px 5px;font-weight:900;color:#006633;text-align:right">' + ti + ' ml</td></tr>' +
        '</table>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:8px;font-weight:700;color:#cc0000;text-transform:uppercase;margin-bottom:4px">📤 EGRESOS</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
          (ins_ml ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">P. Insensibles</td><td style="padding:2px 5px;text-align:right">' + ins_ml + ' ml</td></tr>' : '') +
          (bas_ml ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Req. Basal</td><td style="padding:2px 5px;text-align:right">' + bas_ml + ' ml</td></tr>' : '') +
          (diu_ml ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Diuresis</td><td style="padding:2px 5px;text-align:right">' + diu_ml + ' ml</td></tr>' : '') +
          '<tr style="background:#fff0f0"><td style="padding:2px 5px;font-weight:700">🩸 Sangrado</td><td style="padding:2px 5px;text-align:right;font-weight:700;color:red">' + sang_ml + ' ml</td></tr>' +
          (trau_ml ? '<tr><td style="padding:2px 5px;border-bottom:1px solid #eee">Trauma Qx</td><td style="padding:2px 5px;text-align:right">' + trau_ml + ' ml</td></tr>' : '') +
          '<tr style="background:#ffeeee"><td style="padding:3px 5px;font-weight:800;color:#cc0000">TOTAL</td><td style="padding:3px 5px;font-weight:900;color:#cc0000;text-align:right">' + te + ' ml</td></tr>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '<div style="text-align:center;border:2px solid ' + (bal >= 0 ? '#006633' : '#cc6600') + ';border-radius:8px;padding:8px;margin-bottom:8px;background:' + (bal >= 0 ? '#f0fff4' : '#fff8ee') + '">' +
      '<div style="font-size:24px;font-weight:900;color:' + (bal >= 0 ? '#006633' : '#cc6600') + '">' + (bal >= 0 ? '+' : '') + bal + ' ml</div>' +
      '<div style="font-size:9px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:1px">Balance Hídrico Total</div>' +
      '<div style="font-size:8px;color:#888;margin-top:2px">VSP: ' + vsp + ' ml · Sangrado: ' + sang_ml + ' ml (' + sangPct + '% permisible)</div>' +
    '</div>' +
    (hrs.length ?
      ST('🕐 RESUMEN POR HORA', '#334455') +
      '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
        '<thead><tr style="background:#334455;color:#fff">' +
          '<th style="padding:4px 5px">Hora</th><th style="padding:4px 5px;text-align:center">Ingresos IV</th>' +
          '<th style="padding:4px 5px;text-align:center">Sangrado</th><th style="padding:4px 5px;text-align:center">Diuresis</th>' +
          '<th style="padding:4px 5px;text-align:center">Balance Hr</th><th style="padding:4px 5px">Fármacos</th>' +
        '</tr></thead><tbody>' + hrsRows + '</tbody></table>'
      : '') +
    (S.liqHora && S.liqHora.length ?
      ST('📋 BALANCE HORA POR HORA — REGISTRO MANUAL', '#005f8a') +
      '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
        '<thead><tr style="background:#005f8a;color:#fff">' +
          '<th style="padding:4px 5px">#</th>' +
          '<th style="padding:4px 5px">Hora</th>' +
          '<th style="padding:4px 5px;text-align:center">Ingresos (ml)</th>' +
          '<th style="padding:4px 5px;text-align:center">Detalle Ingresos</th>' +
          '<th style="padding:4px 5px;text-align:center">Egresos (ml)</th>' +
          '<th style="padding:4px 5px;text-align:center">Detalle Egresos</th>' +
          '<th style="padding:4px 5px;text-align:center">Bal. Hr</th>' +
          '<th style="padding:4px 5px;text-align:center">Acumulado</th>' +
        '</tr></thead><tbody>' +
        (function() {
          var _ordinals = ['1ª Hora','2ª Hora','3ª Hora','4ª Hora','5ª Hora','6ª Hora',
                           '7ª Hora','8ª Hora','9ª Hora','10ª Hora','11ª Hora','12ª Hora'];
          return S.liqHora.map(function(r, i) {
            var bg = i % 2 === 0 ? '#fff' : '#f0f8ff';
            var balCl = r.balHr < 0 ? 'color:#cc6600;font-weight:800' : 'color:#006633;font-weight:800';
            var acumCl = r.acum < -500 ? 'color:#cc0000;font-weight:900' : r.acum < 0 ? 'color:#cc6600;font-weight:800' : 'color:#006633;font-weight:800';
            var label = _ordinals[i] || ((i+1)+'ª Hora');
            var tIn = r.totalIn != null ? r.totalIn : (r.nacl||0)+(r.hart||0)+(r.col||0)+(r.pg||0)+(r.med||0)+(r.otro||0);
            var tEg = r.totalEg != null ? r.totalEg : (r.sang||0)+(r.diu||0)+(r.trau||0)+(r.ins||0)+(r.bas||0)+(r.oeg||0);
            var inD=[], egD=[];
            if(r.nacl) inD.push('NaCl:'+r.nacl);
            if(r.hart) inD.push('Hart:'+r.hart);
            if(r.col)  inD.push('Col:'+r.col);
            if(r.pg)   inD.push('PG:'+r.pg);
            if(r.med)  inD.push('Med:'+r.med);
            if(r.sang) egD.push('Sang:'+r.sang);
            if(r.diu)  egD.push('Diu:'+r.diu);
            if(r.trau) egD.push('Trau:'+r.trau);
            if(r.ins)  egD.push('Ins:'+r.ins);
            if(r.bas)  egD.push('Bas:'+r.bas);
            return '<tr style="background:'+bg+'">' +
              '<td style="padding:3px 5px;font-weight:800;color:#005f8a;font-size:7px">'+label+'</td>' +
              '<td style="padding:3px 5px;font-weight:700;color:#0077aa">'+r.hora+'</td>' +
              '<td style="padding:3px 5px;text-align:center;font-weight:800;color:#006633">'+tIn+'</td>' +
              '<td style="padding:3px 5px;font-size:7px;color:#555">'+inD.join(', ')+'</td>' +
              '<td style="padding:3px 5px;text-align:center;font-weight:800;color:#cc0000">'+tEg+'</td>' +
              '<td style="padding:3px 5px;font-size:7px;color:#555">'+egD.join(', ')+'</td>' +
              '<td style="padding:3px 5px;text-align:center;'+balCl+'">'+( r.balHr>=0?'+':'')+r.balHr+'</td>' +
              '<td style="padding:3px 5px;text-align:center;'+acumCl+'">'+( r.acum>=0?'+':'')+r.acum+'</td>' +
            '</tr>';
          }).join('');
        })() +
        '<tr style="background:#e8f4fb;border-top:2px solid #005f8a">' +
          '<td colspan="6" style="padding:4px 5px;font-weight:800;color:#005f8a;font-size:8px">BALANCE ACUMULADO FINAL</td>' +
          '<td></td>' +
          '<td style="padding:4px 5px;text-align:center;font-size:11px;font-weight:900;color:' +
            (S.liqHora[S.liqHora.length-1].acum >= 0 ? '#006633' : '#cc6600') + '">' +
            (S.liqHora[S.liqHora.length-1].acum >= 0 ? '+' : '') + S.liqHora[S.liqHora.length-1].acum + ' ml' +
          '</td>' +
        '</tr>' +
      '</tbody></table>'
      : '') +
    ST('💊 FÁRMACOS ADMINISTRADOS (' + S.farms.length + ')', '#5b2d8e') +
    (S.farms.length ?
      '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
        '<thead><tr style="background:#5b2d8e;color:#fff">' +
          '<th style="padding:4px 6px">Hora</th><th style="padding:4px 6px">Fármaco</th>' +
          '<th style="padding:4px 6px">Dosis</th><th style="padding:4px 6px">Vía</th><th style="padding:4px 6px">Indicación</th>' +
        '</tr></thead><tbody>' +
        [...S.farms].reverse().map(function(f, i) {
          return '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#faf7ff') + '">' +
            '<td style="padding:3px 6px;font-weight:800;color:#5b2d8e">' + f.h + '</td>' +
            '<td style="padding:3px 6px;font-weight:700">' + f.n + '</td>' +
            '<td style="padding:3px 6px;text-align:center;color:#0077aa;font-weight:700">' + f.d + '</td>' +
            '<td style="padding:3px 6px;text-align:center">' + f.v + '</td>' +
            '<td style="padding:3px 6px;color:#666">' + f.nota + '</td></tr>';
        }).join('') +
        '</tbody></table>'
      : '<div style="color:#999;padding:8px;text-align:center">Sin fármacos registrados</div>') +
  '</div>';

  // ── HOJA 3: Ventilador + Aldrete + Alertas + Firmas ──
  const aldIds   = ['al-act','al-resp','al-circ','al-conc','al-sat'];
  const aldLabls = ['Actividad','Respiración','Circulación','Conciencia','SpO2'];
  const aldVals  = aldIds.map(function(id) {
    const el = document.getElementById(id);
    return { lbl: el ? el.options[el.selectedIndex].text : '—', val: el ? el.value : '0' };
  });
  const aldScore = aldVals.reduce(function(a, v) { return a + parseInt(v.val); }, 0);
  const critAlerts = S.alerts.filter(function(a) { return a.type === 'danger' || a.type === 'warn'; }).slice(0, 20);

  const lv2 = S.history.length ? S.history[S.history.length - 1] : {};
  const pam2 = lv2.pam || Math.round((lv2.tad || 0) + ((lv2.tas || 0) - (lv2.tad || 0)) / 3);

  const pg3 = '<div style="font-family:Arial,sans-serif;color:#000;padding:14px 16px;font-size:9px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0077aa;padding-bottom:5px;margin-bottom:10px">' +
      '<div style="font-size:13px;font-weight:900;color:#0077aa">REGISTRO ANESTÉSICO — <span style="font-size:11px">' + (p.nombre || 'Paciente') + '</span></div>' +
      '<div style="font-size:8px;color:#666">' + fecha + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">' +
      '<div>' +
        ST('🫁 VENTILADOR', '#006644') +
        (S.ventHist.length ?
          '<table style="width:100%;border-collapse:collapse;font-size:8px">' +
            '<thead><tr style="background:#006644;color:#fff"><th style="padding:4px">Parámetro</th><th style="padding:4px;text-align:center">Valor</th></tr></thead>' +
            '<tbody>' +
              [['Modo',vl.modo],['FiO2',vl.fio2+'%'],['Vol. Corriente',vl.vc+' ml'],['Frecuencia',vl.fr+' rpm'],['PEEP',vl.peep+' cmH₂O'],['P. Pico',vl.ppeak+' cmH₂O'],['EtCO2',vl.etco2+' mmHg'],['VM',vl.vm+' L/min']].map(function(r, i) {
                return '<tr style="background:' + (i % 2 ? '#f0fff8' : '#fff') + '"><td style="padding:3px 5px;color:#555">' + r[0] + '</td><td style="padding:3px 5px;text-align:center;font-weight:700">' + r[1] + '</td></tr>';
              }).join('') +
            '</tbody></table>'
          : '<div style="color:#999;padding:10px;text-align:center">Sin registro ventilatorio</div>') +
      '</div>' +
      '<div>' +
        ST('📋 ALDRETE', '#8b4513') +
        '<table style="width:100%;border-collapse:collapse;font-size:8px;margin-bottom:8px">' +
          '<thead><tr style="background:#8b4513;color:#fff"><th style="padding:4px">Parámetro</th><th style="padding:4px">Selección</th><th style="padding:4px;text-align:center">Pts</th></tr></thead>' +
          '<tbody>' +
            aldVals.map(function(v, i) {
              return '<tr style="background:' + (i % 2 ? '#fff8f0' : '#fff') + '">' +
                '<td style="padding:3px 5px;font-weight:700">' + aldLabls[i] + '</td>' +
                '<td style="padding:3px 5px;color:#555">' + v.lbl + '</td>' +
                '<td style="padding:3px 5px;text-align:center;font-weight:800;color:' + (v.val === '2' ? '#006633' : v.val === '0' ? '#cc0000' : '#cc6600') + '">' + v.val + '</td></tr>';
            }).join('') +
            '<tr style="background:' + (aldScore >= 9 ? '#e8f5e9' : '#fff8ee') + ';font-weight:900">' +
              '<td colspan="2" style="padding:5px;font-size:11px">' + (aldScore >= 9 ? '✓ ALTA AUTORIZADA' : '⚠ OBSERVACIÓN') + '</td>' +
              '<td style="padding:5px;font-size:16px;text-align:center;color:' + (aldScore >= 9 ? '#006633' : '#cc6600') + '">' + aldScore + '/10</td>' +
            '</tr>' +
          '</tbody></table>' +
        ST('📊 SIGNOS VITALES EGRESO', '#004488') +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">' +
          [['TA Sist.',lv2.tas||'--','#0077aa','mmHg'],['TA Diast.',lv2.tad||'--','#0077aa','mmHg'],
           ['PAM',lv2.tas?pam2:'--','#004488','mmHg'],['FC',lv2.fc||'--','#e67300','lpm'],
           ['SpO2',lv2.spo2||'--','#006633','%'],['Temp',lv2.temp||'--','#aa7700','°C']].map(function(r) {
            return '<div style="border:1px solid #ddd;border-radius:4px;padding:5px;text-align:center">' +
              '<div style="font-size:7px;color:#888">' + r[0] + '</div>' +
              '<div style="font-size:16px;font-weight:900;color:' + r[2] + '">' + r[1] + '</div>' +
              '<div style="font-size:7px;color:#666">' + r[3] + '</div></div>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>' +
    (critAlerts.length ?
      ST('🚨 ALERTAS CLÍNICAS', '#aa0000') +
      '<table style="width:100%;border-collapse:collapse;font-size:8px;margin-bottom:10px">' +
        '<thead><tr style="background:#aa0000;color:#fff"><th style="padding:4px 6px">Hora</th><th style="padding:4px 6px">Tipo</th><th style="padding:4px 6px">Descripción</th></tr></thead>' +
        '<tbody>' +
          critAlerts.map(function(a, i) {
            return '<tr style="background:' + (i % 2 ? '#fff' : '#fff5f5') + '">' +
              '<td style="padding:3px 6px;text-align:center;font-weight:700;color:#aa0000">' + a.hora + '</td>' +
              '<td style="padding:3px 6px;text-align:center">' + (a.type === 'danger' ? '🚨 CRÍTICA' : '⚠️ Aviso') + '</td>' +
              '<td style="padding:3px 6px">' + a.msg.replace(/[🚨⚠️ℹ️🔔📊💊▶🔪■📌]/g, '') + '</td></tr>';
          }).join('') +
        '</tbody></table>'
      : '') +
    '<div style="margin-top:16px;border:1px solid #ddd;border-radius:6px;padding:12px">' +
      '<div style="font-size:10px;font-weight:800;color:#0077aa;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Firmas y Validación</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
        '<div><div style="border-bottom:1px solid #333;height:40px;margin-bottom:4px"></div>' +
          '<div style="font-size:9px;text-align:center"><b>' + (p.med || 'Anestesiólogo') + '</b></div>' +
          '<div style="font-size:8px;text-align:center;color:#666">Médico Anestesiólogo</div></div>' +
        '<div><div style="border-bottom:1px solid #333;height:40px;margin-bottom:4px"></div>' +
          '<div style="font-size:9px;text-align:center"><b>' + (p.ciru || 'Cirujano') + '</b></div>' +
          '<div style="font-size:8px;text-align:center;color:#666">Médico Cirujano</div></div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:8px;text-align:center;font-size:8px;color:#999;border-top:1px solid #eee;padding-top:6px">AnesteSys Pro · ' + fecha + ' · Uso exclusivo médico</div>' +
  '</div>';

  const sep = '<div style="page-break-before:always"></div>';

  var _ld2 = (typeof labGetDataForPDF==='function') ? labGetDataForPDF() : null;
  var labPdfSec = '';
  if (_ld2) {
    var _lf2 = [['Hemoglobina',_ld2.hb,'g/dL'],['Hematocrito',_ld2.hto,'%'],
      ['Plaquetas',_ld2.plt,'x10³'],['Leucocitos',_ld2.leu,'x10³'],
      ['TP',_ld2.tp,'seg'],['TPT',_ld2.tpt,'seg'],['INR',_ld2.inr,''],
      ['Glucosa',_ld2.glu,'mg/dL'],['Urea',_ld2.urea,'mg/dL'],
      ['Creatinina',_ld2.crea,'mg/dL'],['BUN',_ld2.bun,'mg/dL'],
      ['Colesterol',_ld2.col,'mg/dL'],['Triglicéridos',_ld2.tg,'mg/dL']];
    var _lr2 = _lf2.filter(function(x){return x[1]!==''&&x[1]!=null;});
    if (_ld2.extra) _ld2.extra.forEach(function(e){if(e.value!=='') _lr2.push([e.name,e.value,e.unit]);});
    if (_lr2.length) {
      labPdfSec = '<div class="pr-section"><div class="pr-title">Laboratorios'
        + (_ld2.fecha ? ' — ' + _ld2.fecha : '') + '</div>'
        + _lr2.map(function(r){return '<div class="pr-row"><span>'+r[0]+'</span><span>'+r[1]+(r[2]?' '+r[2]:'')+'</span></div>';}).join('')
        + (_ld2.notas ? '<div style="font-size:8px;color:#777;margin-top:4px">'+_ld2.notas+'</div>' : '')
        + '</div>';
    }
  }
  document.getElementById('print-area').innerHTML = pg1 + sep + labPdfSec + pg2 + sep + pg3;
}

function copiarRes() {
  const t=document.getElementById('res-content').innerText;
  if(navigator.share){
    navigator.share({title:'Registro Anestésico — AnesteSys',text:t});
  } else {
    navigator.clipboard.writeText(t).then(()=>showToast('✅ Copiado — pega en WhatsApp o correo'));
  }
}

function enviarPorCorreo() {
  var u = getUser();
  var email = u.email || '';
  var pac = S.pac || {};
  var nombre = pac.nombre || 'Paciente';
  var fecha = new Date().toLocaleDateString('es-MX');
  var subject = encodeURIComponent('Registro Anestésico — ' + nombre + ' — ' + fecha);
  var body = encodeURIComponent(
    'Registro Anestésico AnesteSys\n'
    + '================================\n'
    + 'Paciente: ' + nombre + '\n'
    + 'Edad: ' + (pac.edad||'') + ' años\n'
    + 'Expediente: ' + (pac.exp||'') + '\n'
    + 'Procedimiento: ' + (pac.cx||'') + '\n'
    + 'Anestesia: ' + (pac.tipoAn||'') + '\n'
    + 'Fecha: ' + fecha + '\n\n'
    + 'Adjunta el PDF generado con el botón "🖨 Imprimir / PDF" de la app.\n\n'
    + '-- Enviado desde AnesteSys Pro --'
  );
  if (!email) {
    // Open mailto picker without preset destination
    window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
    showToast('💡 Tip: guarda tu correo en tu perfil para tenerlo siempre listo');
  } else {
    window.location.href = 'mailto:' + email + '?subject=' + subject + '&body=' + body;
  }
}

// ═══════════════════════════════════════════════
