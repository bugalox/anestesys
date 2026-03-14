<script>// ═══════════════════════════════════════════════════════════════
// AGENDA MÉDICA v2 — Vista Mes / Semana / Lista + Swipe
// ═══════════════════════════════════════════════════════════════
var AG_KEY  = 'anestesys_agenda';
var _agView = 'mes';         // 'mes' | 'semana' | 'lista'
var _agAnchor = new Date();  // fecha ancla (hoy o semana actual)
var _agSelDay = null;
var _agEditId = null;
var _agTipoSel   = 'cirugia';
var _agRemindSel = 30;
var _agTimers    = {};
var _agSwipeX    = 0;
var _agSwipeY    = 0;
var _agSwipeLock = false;

var AG_MESES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
var AG_MESES3 = ['Ene','Feb','Mar','Abr','May','Jun',
                 'Jul','Ago','Sep','Oct','Nov','Dic'];
var AG_DIAS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
var AG_DIASL  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

var AG_CFG = {
  cirugia:     { bg:'rgba(255,23,68,.14)',  brd:'#ff1744', icon:'🔪', lbl:'Cirugía'    },
  consulta:    { bg:'rgba(0,229,255,.12)',  brd:'#00e5ff', icon:'🩺', lbl:'Consulta'   },
  seguimiento: { bg:'rgba(0,230,118,.11)', brd:'#00e676', icon:'📋', lbl:'Seguim.'    },
  urgencia:    { bg:'rgba(255,109,0,.16)', brd:'#ff6d00', icon:'🚨', lbl:'Urgencia'   },
  revision:    { bg:'rgba(213,0,249,.12)', brd:'#d500f9', icon:'🔬', lbl:'Revisión'   },
  otro:        { bg:'rgba(61,90,120,.18)', brd:'#3d5a78', icon:'📌', lbl:'Otro'       }
};

// ── Helpers básicos ──────────────────────────────────────────
function agGet()  { try { return JSON.parse(localStorage.getItem(AG_KEY)||'[]'); } catch(e) { return []; } }
function agPut(a) { try { localStorage.setItem(AG_KEY, JSON.stringify(a)); } catch(e) {} }
function agUID()  { return 'ag_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }
function agCfg(t) { return AG_CFG[t] || AG_CFG.otro; }
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function agTodayStr() {
  var d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function agDateStr(d) {
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function agParseDate(s) {
  var p = s.split('-');
  return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
}
function agFmtFull(ds) {
  var d = agParseDate(ds);
  return AG_DIASL[d.getDay()]+' '+d.getDate()+' de '+AG_MESES[d.getMonth()].toLowerCase()+' '+d.getFullYear();
}

// ── Construir mapa fecha→citas ──────────────────────────────
function agBuildMap(citas) {
  var m = {};
  for (var i=0; i<citas.length; i++) {
    var ds = citas[i].fecha;
    if (!m[ds]) m[ds] = [];
    m[ds].push(citas[i]);
  }
  return m;
}

// ─────────────────────────────────────────────────────────────
// VISTA MES
// ─────────────────────────────────────────────────────────────
function agRenderMes() {
  var y    = _agAnchor.getFullYear();
  var mo   = _agAnchor.getMonth();
  var hoy  = agTodayStr();
  var cmap = agBuildMap(agGet());

  var lbl = document.getElementById('ag-periodo-label');
  if (lbl) lbl.textContent = AG_MESES[mo]+' '+y;

  var grid = document.getElementById('ag-cal-grid');
  if (!grid) return;
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(7,1fr)';
  grid.style.gap = '3px';

  var firstDow = new Date(y, mo, 1).getDay();
  var nDays    = new Date(y, mo+1, 0).getDate();
  var html     = '';

  for (var pad=0; pad<firstDow; pad++) html += '<div></div>';

  for (var d=1; d<=nDays; d++) {
    var ds    = y+'-'+String(mo+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var isHoy = ds === hoy;
    var isSel = ds === _agSelDay;
    var list  = cmap[ds] || [];
    var isPast= ds < hoy;

    var bg, brd, col;
    if (isSel)      { bg='#ff6d00'; brd='#ff6d00'; col='#fff'; }
    else if (isHoy) { bg='rgba(255,109,0,.2)'; brd='#ff6d00'; col='#ff9100'; }
    else            { bg='transparent'; brd='transparent'; col=isPast?'#3d5a78':'#dde8ff'; }

    var dots = '';
    for (var k=0; k<Math.min(list.length,3); k++) {
      dots += '<div style="width:5px;height:5px;border-radius:50%;background:'+agCfg(list[k].tipo).brd+';flex-shrink:0"></div>';
    }
    if (list.length>3) dots += '<div style="font-size:7px;color:#3d5a78;line-height:1">+</div>';

    html += '<div onclick="agSelDay(\''+ds+'\')" style="'+
      'min-height:42px;border-radius:8px;background:'+bg+';border:1.5px solid '+brd+';'+
      'display:flex;flex-direction:column;align-items:center;justify-content:center;'+
      'cursor:pointer;gap:2px;transition:all .15s;padding:2px 1px">'+
      '<span style="font-size:13px;font-weight:'+(isHoy||isSel?'900':'500')+';color:'+col+'">'+d+'</span>'+
      (dots ? '<div style="display:flex;gap:2px;justify-content:center;flex-wrap:wrap;padding:0 2px">'+dots+'</div>' : '')+
      '</div>';
  }
  grid.innerHTML = html;
  agUpdateDaySection();
}

// ─────────────────────────────────────────────────────────────
// VISTA SEMANA
// ─────────────────────────────────────────────────────────────
function agGetWeekStart(d) {
  var dow  = d.getDay();
  var copy = new Date(d.getFullYear(), d.getMonth(), d.getDate()-dow);
  return copy;
}

function agRenderSemana() {
  var ws   = agGetWeekStart(_agAnchor);
  var hoy  = agTodayStr();
  var cmap = agBuildMap(agGet());

  // Label: "3–9 Mar 2026"
  var we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()+6);
  var lbl = document.getElementById('ag-periodo-label');
  if (lbl) {
    var sameMon = ws.getMonth()===we.getMonth();
    lbl.textContent = ws.getDate()+(sameMon?'':'&nbsp;'+AG_MESES3[ws.getMonth()])+
                      '–'+we.getDate()+'&nbsp;'+AG_MESES3[we.getMonth()]+'&nbsp;'+we.getFullYear();
    lbl.innerHTML = lbl.textContent; // allow entities
  }

  var grid = document.getElementById('ag-cal-grid');
  if (!grid) return;
  grid.style.display = 'block';
  grid.style.gridTemplateColumns = '';

  var html = '<div style="display:flex;gap:4px;width:100%">';
  for (var i=0; i<7; i++) {
    var day  = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()+i);
    var ds   = agDateStr(day);
    var isHoy= ds===hoy;
    var isSel= ds===_agSelDay;
    var list = (cmap[ds]||[]).sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });
    var isPast=ds<hoy;

    var headBg = isSel ? '#ff6d00' : isHoy ? 'rgba(255,109,0,.18)' : 'transparent';
    var headCol= isSel ? '#fff'    : isHoy ? '#ff9100' : isPast ? '#3d5a78' : '#dde8ff';
    var headBrd= isSel||isHoy ? '#ff6d00' : '#1e2d44';

    html += '<div onclick="agSelDay(\''+ds+'\')" style="flex:1;min-width:0;cursor:pointer">'+
      '<div style="text-align:center;padding:4px 2px;border-radius:8px;background:'+headBg+
      ';border:1.5px solid '+headBrd+';margin-bottom:4px">'+
      '<div style="font-size:8px;font-weight:700;color:'+headCol+';text-transform:uppercase">'+AG_DIAS[day.getDay()]+'</div>'+
      '<div style="font-size:15px;font-weight:'+(isHoy||isSel?'900':'600')+';color:'+headCol+'">'+day.getDate()+'</div>'+
      '</div>';

    // Chips de citas ese día
    for (var k=0; k<list.length; k++) {
      var ct  = list[k];
      var cfg = agCfg(ct.tipo);
      var op  = ct.estado==='cancelada'?'opacity:.45;':'';
      html += '<div onclick="event.stopPropagation();agEditCita(\''+ct.id+'\')" style="'+op+
        'background:'+cfg.bg+';border-left:3px solid '+cfg.brd+';border-radius:0 6px 6px 0;'+
        'padding:3px 5px;margin-bottom:3px;cursor:pointer;overflow:hidden">'+
        '<div style="font-size:9px;font-weight:800;color:'+cfg.brd+'">'+ct.hora+'</div>'+
        '<div style="font-size:9px;color:#dde8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+
          escHtml(ct.pacNombre||'—')+'</div>'+
        '</div>';
    }
    if (!list.length) {
      html += '<div style="text-align:center;padding:6px 2px">'+
        '<div style="width:20px;height:1px;background:#1e2d44;margin:0 auto"></div></div>';
    }
    html += '</div>';
  }
  html += '</div>';
  grid.innerHTML = html;
  agUpdateDaySection();
}

// ─────────────────────────────────────────────────────────────
// VISTA LISTA
// ─────────────────────────────────────────────────────────────
function agRenderLista() {
  var lbl = document.getElementById('ag-periodo-label');
  if (lbl) lbl.textContent = 'Todas las citas';

  var grid = document.getElementById('ag-cal-grid');
  if (!grid) return;
  // Lista necesita display:block, no grid
  grid.style.display = 'block';

  var hoy   = agTodayStr();
  var citas = agGet();
  citas.sort(function(a,b) {
    return ((a.fecha||'')+(a.hora||'')).localeCompare((b.fecha||'')+(b.hora||''));
  });

  if (!citas.length) {
    grid.innerHTML = '<div style="text-align:center;color:#3d5a78;padding:32px;font-size:14px">Sin citas registradas</div>';
    return;
  }

  // Agrupar por mes-año
  var groups = {}, order = [];
  for (var i=0; i<citas.length; i++) {
    var ct = citas[i];
    var key = ct.fecha ? ct.fecha.slice(0,7) : '0000-00';
    if (!groups[key]) { groups[key]=[]; order.push(key); }
    groups[key].push(ct);
  }

  var html = '';
  for (var j=0; j<order.length; j++) {
    var key  = order[j];
    var parts= key.split('-');
    var isPast = key < hoy.slice(0,7);
    var label  = AG_MESES[parseInt(parts[1])-1]+' '+parts[0];
    html += '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;'+
            'color:'+(isPast?'#3d5a78':'#ff6d00')+';margin:12px 0 6px;padding:0 2px">'+label+'</div>';
    var group = groups[key];
    for (var k=0; k<group.length; k++) {
      html += agCard(group[k], false);
    }
  }
  grid.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// RENDER PRINCIPAL (dispatcher)
// ─────────────────────────────────────────────────────────────
function agRender() {
  // Actualizar tabs de vista
  var views = ['mes','semana','lista'];
  for (var i=0; i<views.length; i++) {
    var btn = document.getElementById('ag-vbtn-'+views[i]);
    if (!btn) continue;
    var active = views[i]===_agView;
    btn.style.background  = active ? '#ff6d00' : 'transparent';
    btn.style.color       = active ? '#fff' : '#3d5a78';
    btn.style.borderColor = active ? '#ff6d00' : '#1e2d44';
  }

  // Ocultar/mostrar la sección del día (solo mes y semana)
  var daySec = document.getElementById('ag-day-section');
  if (daySec) daySec.style.display = (_agView==='lista') ? 'none' : 'block';

  // Mostrar/ocultar cabecera de días semana
  var dowH = document.getElementById('ag-dow-header');
  if (dowH) dowH.style.display = (_agView==='lista') ? 'none' : 'grid';

  if (_agView==='mes')         agRenderMes();
  else if (_agView==='semana') agRenderSemana();
  else                         agRenderLista();

  agRenderProximas();
}

// ─────────────────────────────────────────────────────────────
// NAVEGACIÓN
// ─────────────────────────────────────────────────────────────
function agNavPrev() {
  if (_agView==='mes') {
    _agAnchor = new Date(_agAnchor.getFullYear(), _agAnchor.getMonth()-1, 1);
  } else if (_agView==='semana') {
    _agAnchor = new Date(_agAnchor.getFullYear(), _agAnchor.getMonth(), _agAnchor.getDate()-7);
  } else {
    // lista: scroll to top / no-op
    var grid = document.getElementById('ag-cal-grid');
    if (grid) grid.scrollTop = 0;
  }
  agRender();
}

function agNavNext() {
  if (_agView==='mes') {
    _agAnchor = new Date(_agAnchor.getFullYear(), _agAnchor.getMonth()+1, 1);
  } else if (_agView==='semana') {
    _agAnchor = new Date(_agAnchor.getFullYear(), _agAnchor.getMonth(), _agAnchor.getDate()+7);
  }
  agRender();
}

function agNavMes(d) { // compat con onclick anterior
  if (d<0) agNavPrev(); else agNavNext();
}

function agHoy() {
  _agAnchor = new Date();
  _agSelDay = agTodayStr();
  agRender();
}

function agSetView(v) {
  _agView = v;
  agRender();
}

// ─────────────────────────────────────────────────────────────
// SWIPE (iOS nativo-feel)
// ─────────────────────────────────────────────────────────────
function agInitSwipe() {
  var el = document.getElementById('ag-swipe-zone');
  if (!el || el._swipeInit) return;
  el._swipeInit = true;

  el.addEventListener('touchstart', function(e) {
    _agSwipeX = e.touches[0].clientX;
    _agSwipeY = e.touches[0].clientY;
    _agSwipeLock = false;
  }, {passive:true});

  el.addEventListener('touchend', function(e) {
    if (_agSwipeLock) return;
    var dx = e.changedTouches[0].clientX - _agSwipeX;
    var dy = e.changedTouches[0].clientY - _agSwipeY;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)*0.8) return;
    _agSwipeLock = true;
    if (dx < 0) agNavNext();
    else         agNavPrev();
  }, {passive:true});
}

// ─────────────────────────────────────────────────────────────
// SECCIÓN DÍA
// ─────────────────────────────────────────────────────────────
function agSelDay(ds) {
  _agSelDay = ds;
  // En vista semana, si el día está fuera de la semana visible, ajustar ancla
  if (_agView==='semana') {
    var ws = agGetWeekStart(_agAnchor);
    var we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()+6);
    var dt = agParseDate(ds);
    if (dt < ws || dt > we) _agAnchor = dt;
  }
  agRender();
  // Scroll a la sección del día
  var sec = document.getElementById('ag-day-section');
  if (sec && _agView!=='lista') setTimeout(function(){ sec.scrollIntoView({behavior:'smooth',block:'start'}); }, 80);
}

function agUpdateDaySection() {
  var sec   = document.getElementById('ag-day-section');
  var list  = document.getElementById('ag-day-list');
  var title = document.getElementById('ag-day-title');
  if (!sec || !list) return;

  if (!_agSelDay || _agView==='lista') { sec.style.display='none'; return; }
  sec.style.display='block';

  if (title) title.innerHTML = '<i class="ph ph-calendar-blank" style="margin-right:6px"></i>'+agFmtFull(_agSelDay);

  var citas = agGet().filter(function(ct){ return ct.fecha===_agSelDay; });
  citas.sort(function(a,b){ return (a.hora||'').localeCompare(b.hora||''); });

  var html='';
  for (var i=0; i<citas.length; i++) html += agCard(citas[i], true);
  html += '<button onclick="agOpenNew(\''+_agSelDay+'\')" style="width:100%;margin-top:8px;padding:10px;'+
    'border:1.5px dashed rgba(255,109,0,.4);border-radius:10px;background:transparent;'+
    'color:#ff6d00;font-size:13px;font-weight:700;cursor:pointer">+ Agregar cita aquí</button>';
  list.innerHTML = html;
  setTimeout(function(){ try{ sec.scrollIntoView({behavior:"smooth",block:"nearest"}); }catch(e){} },60);
}

// ─────────────────────────────────────────────────────────────
// CARD DE UNA CITA
// ─────────────────────────────────────────────────────────────
function agCard(ct, compact) {
  var cfg   = agCfg(ct.tipo);
  var ahora = new Date();
  var cdt   = new Date(ct.fecha+'T'+(ct.hora||'00:00'));
  var mins  = Math.round((cdt-ahora)/60000);
  var hoy   = agTodayStr();

  var tag = '';
  if (ct.estado==='completada') {
    tag = '<span style="font-size:9px;padding:2px 8px;border-radius:6px;background:rgba(0,230,118,.15);color:#00e676;font-weight:800">✓ Completada</span>';
  } else if (ct.estado==='cancelada') {
    tag = '<span style="font-size:9px;padding:2px 8px;border-radius:6px;background:rgba(61,90,120,.2);color:#3d5a78;font-weight:800">✗ Cancelada</span>';
  } else if (mins>0 && mins<=60) {
    tag = '<span style="font-size:9px;padding:2px 8px;border-radius:6px;background:rgba(255,214,0,.15);color:#ffd600;font-weight:800">⚡ En '+mins+' min</span>';
  } else if (ct.fecha < hoy) {
    tag = '<span style="font-size:9px;padding:2px 8px;border-radius:6px;background:rgba(255,23,68,.12);color:#ff5252;font-weight:800">Pasada</span>';
  }

  var dateStr = ct.fecha ? ct.fecha.split('-').reverse().join('/') : '';
  var op = ct.estado==='cancelada' ? 'opacity:.5;' : '';

  return '<div onclick="agEditCita(\''+ct.id+'\')" style="'+op+
    'background:'+cfg.bg+';border:1.5px solid '+cfg.brd+';border-radius:12px;'+
    'padding:12px 14px;cursor:pointer;margin-bottom:6px">'+
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'+
          '<span style="font-size:15px">'+cfg.icon+'</span>'+
          '<span style="font-size:13px;font-weight:800;color:#dde8ff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(ct.pacNombre||'Sin nombre')+'</span>'+
        '</div>'+
        (ct.pacDx ? '<div style="font-size:11px;color:'+cfg.brd+';font-weight:600;margin-bottom:3px">'+escHtml(ct.pacDx)+(ct.pacEdad?'<span style="font-size:10px;color:#3d5a78;font-weight:500"> · '+ct.pacEdad+' '+({'anios':'a','meses':'m','semanas':'sem','dias':'d'}[ct.pacEdadUnit]||'a')+'</span>':'')+'</div>' : '')+
        '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">'+
          '<span style="font-size:11px;font-weight:700;color:'+cfg.brd+'">🕐 '+(ct.hora||'—')+'</span>'+
          (!compact ? '<span style="font-size:10px;color:#3d5a78">📅 '+dateStr+'</span>' : '')+
          (ct.sala ? '<span style="font-size:10px;color:#3d5a78">🏥 '+escHtml(ct.sala)+'</span>' : '')+
          (ct.duracion ? '<span style="font-size:10px;color:#3d5a78">⏱ '+ct.duracion+' min</span>' : '')+
        '</div>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">'+
        tag+
        '<span style="font-size:9px;padding:2px 8px;border-radius:6px;color:'+cfg.brd+';font-weight:700;border:1px solid '+cfg.brd+'">'+cfg.lbl+'</span>'+
      '</div>'+
    '</div>'+
    (ct.notas ? '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);font-size:11px;color:#3d5a78">📝 '+escHtml(ct.notas)+'</div>' : '')+
  '</div>';
}

// ─────────────────────────────────────────────────────────────
// PRÓXIMAS CITAS
// ─────────────────────────────────────────────────────────────
function agRenderProximas() {
  var el = document.getElementById('ag-proximas-list');
  if (!el) return;
  var hoy   = agTodayStr();
  var citas = agGet().filter(function(ct){ return ct.fecha>=hoy && ct.estado!=='cancelada'; });
  citas.sort(function(a,b){ return ((a.fecha||'')+(a.hora||'')).localeCompare((b.fecha||'')+(b.hora||'')); });

  var pend = citas.filter(function(ct){ return ct.estado!=='completada'; });
  var badge = document.getElementById('agenda-badge');
  if (badge) { badge.textContent=pend.length; badge.style.display=pend.length?'block':'none'; }
  var lsBadge = document.getElementById('ls-agenda-badge');
  if (lsBadge) { lsBadge.textContent=pend.length; lsBadge.style.display=pend.length?'inline-block':'none'; }

  if (!citas.length) {
    el.innerHTML = '<div style="text-align:center;color:#3d5a78;padding:20px;font-size:13px">Sin citas próximas</div>';
    return;
  }

  var groups={}, order=[];
  for (var i=0; i<citas.length; i++) {
    var ds=citas[i].fecha;
    if (!groups[ds]){ groups[ds]=[]; order.push(ds); }
    groups[ds].push(citas[i]);
  }

  var html='';
  for (var j=0; j<order.length; j++) {
    var ds  = order[j];
    var dt  = agParseDate(ds);
    var isH = ds===hoy;
    html += '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;'+
            'color:'+(isH?'#ff6d00':'#3d5a78')+';margin:8px 0 4px">'+
            (isH?'📍 HOY — ':'')+AG_DIAS[dt.getDay()]+' '+dt.getDate()+' '+AG_MESES3[dt.getMonth()]+'</div>';
    for (var k=0; k<groups[ds].length; k++) html += agCard(groups[ds][k], false);
  }
  el.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// MODAL NUEVA / EDITAR CITA
// ─────────────────────────────────────────────────────────────
function agOpenNew(fechaDefault) {
  _agEditId = null;
  var ids=['ag-pac-nombre','ag-pac-edad','ag-pac-exp','ag-pac-dx','ag-sala','ag-duracion','ag-notas'];
  for (var i=0; i<ids.length; i++) { var e=document.getElementById(ids[i]); if(e) e.value=''; }
  var ds  = fechaDefault || agTodayStr();
  var fe  = document.getElementById('ag-fecha'); if(fe) fe.value=ds;
  var he  = document.getElementById('ag-hora');
  if(he) { var h=new Date(); he.value=String(h.getHours()).padStart(2,'0')+':00'; }
  var t  =document.getElementById('ag-modal-title'); if(t)  t.textContent='📅 Nueva Cita';
  var db =document.getElementById('ag-del-btn');     if(db) db.style.display='none';
  var sb =document.getElementById('ag-save-btn');    if(sb) sb.style.gridColumn='1/-1';
  var es =document.getElementById('ag-estado-sec');  if(es) es.style.display='none';
  agSetTipo(null,'cirugia');
  agSetRemind(null,30);
  var m=document.getElementById('ag-modal');
  if(m){ m.style.display='block'; document.body.style.overflow='hidden'; }
}

function agEditCita(id) {
  var ct = null;
  var lista = agGet();
  for (var i=0; i<lista.length; i++) { if(lista[i].id===id){ ct=lista[i]; break; } }
  if(!ct) return;
  _agEditId = id;
  var sv=function(eid,v){ var e=document.getElementById(eid); if(e) e.value=(v||''); };
  sv('ag-pac-nombre',ct.pacNombre); sv('ag-pac-edad',ct.pacEdad);
  (function(){ var e=document.getElementById('ag-pac-edad-unit'); if(e) e.value=ct.pacEdadUnit||'anios'; })();
  sv('ag-pac-exp',ct.pacExp);       sv('ag-pac-dx',ct.pacDx);
  sv('ag-fecha',ct.fecha);          sv('ag-hora',ct.hora);
  sv('ag-sala',ct.sala);            sv('ag-duracion',ct.duracion);
  sv('ag-notas',ct.notas);
  var t =document.getElementById('ag-modal-title'); if(t)  t.textContent='✏️ Editar Cita';
  var db=document.getElementById('ag-del-btn');     if(db) db.style.display='block';
  var sb=document.getElementById('ag-save-btn');    if(sb) sb.style.gridColumn='auto';
  var es=document.getElementById('ag-estado-sec');  if(es) es.style.display='block';
  agSetTipo(null, ct.tipo||'cirugia');
  agSetRemind(null, ct.recordatorio!=null?ct.recordatorio:30);
  var m=document.getElementById('ag-modal');
  if(m){ m.style.display='block'; document.body.style.overflow='hidden'; }
}

function agCloseModal() {
  var m=document.getElementById('ag-modal'); if(m) m.style.display='none';
  document.body.style.overflow='';
}

function agSaveCita() {
  var gv=function(id){ var e=document.getElementById(id); return e?e.value.trim():''; };
  var nombre=gv('ag-pac-nombre'), fecha=gv('ag-fecha');
  if(!nombre){ showToast('⚠️ Escribe el nombre del paciente'); return; }
  if(!fecha) { showToast('⚠️ Selecciona una fecha');           return; }
  var edadUnit = (function(){ var e=document.getElementById('ag-pac-edad-unit'); return e?e.value:'anios'; })();
  var ct = {
    id: _agEditId||agUID(), tipo:_agTipoSel,
    pacNombre:nombre, pacEdad:gv('ag-pac-edad'), pacEdadUnit:edadUnit, pacExp:gv('ag-pac-exp'), pacDx:gv('ag-pac-dx'),
    fecha:fecha, hora:gv('ag-hora'), sala:gv('ag-sala'), duracion:gv('ag-duracion'),
    recordatorio:_agRemindSel, notas:gv('ag-notas'),
    estado:'pendiente', creado:new Date().toISOString()
  };
  var lista=agGet();
  if(_agEditId) {
    var orig=null;
    for(var i=0;i<lista.length;i++){ if(lista[i].id===_agEditId){ orig=lista[i]; break; } }
    if(orig) ct.estado=orig.estado;
    lista=lista.map(function(x){ return x.id===_agEditId?ct:x; });
    showToast('✅ Cita actualizada');
  } else {
    lista.push(ct);
    showToast('✅ Cita guardada');
  }
  agPut(lista);
  // Cancelar y reprogramar ANTES de cerrar el modal (ct aún en scope limpio)
  agCancelReminder(ct.id);
  (function(cita) {
    setTimeout(function() {
      console.log('[Agenda] agSchedReminder para:', cita.id, 'recordatorio:', cita.recordatorio, 'fecha:', cita.fecha, 'hora:', cita.hora);
      agSchedReminder(cita);
      // Verificar qué quedó en ag_sched
      try {
        var s = JSON.parse(localStorage.getItem('ag_sched') || '{}');
        console.log('[Agenda] ag_sched tras guardar:', JSON.stringify(s[cita.id]));
      } catch(e) {}
    }, 150);
  })(ct);
  agCloseModal();
  agRender();
}

function agDelCita() {
  if(!_agEditId) return;
  var _id=_agEditId;
  showConfirm('¿Eliminar esta cita?','','🗑 Eliminar','#ff1744',function(){
    agPut(agGet().filter(function(x){ return x.id!==_id; }));
    agCloseModal(); agRender();
    showToast('🗑 Cita eliminada');
  });
}

function agSetEstado(estado) {
  if(!_agEditId) return;
  var _id=_agEditId;
  agPut(agGet().map(function(x){
    return x.id===_id ? (function(o){ o.estado=estado; return o; })(Object.assign({},x)) : x;
  }));
  agCloseModal(); agRender();
  showToast(estado==='completada'?'✅ Marcada como completada':'✗ Marcada como cancelada');
}

function agSetTipo(btn,tipo) {
  _agTipoSel=tipo;
  var btns=document.querySelectorAll('#ag-tipo-btns button');
  for(var i=0;i<btns.length;i++){
    var bt=btns[i].getAttribute('data-tipo'), cfg=agCfg(bt);
    if(bt===tipo){ btns[i].style.borderColor=cfg.brd; btns[i].style.background=cfg.bg; btns[i].style.color=cfg.brd; }
    else         { btns[i].style.borderColor='#1e2d44'; btns[i].style.background='transparent'; btns[i].style.color='#3d5a78'; }
  }
}

function agSetRemind(btn,mins) {
  _agRemindSel=mins;
  var btns=document.querySelectorAll('#ag-remind-btns button');
  for(var i=0;i<btns.length;i++){
    var bm=parseInt(btns[i].getAttribute('data-min'));
    if(bm===mins){ btns[i].style.borderColor='#ffd600'; btns[i].style.background='rgba(255,214,0,.15)'; btns[i].style.color='#ffd600'; }
    else         { btns[i].style.borderColor='#1e2d44'; btns[i].style.background='transparent'; btns[i].style.color='#3d5a78'; }
  }
}

// ─────────────────────────────────────────────────────────────
// RECORDATORIOS
// ─────────────────────────────────────────────────────────────

// ── Cancelar recordatorio (al editar o eliminar cita) ──
// agCancelReminder defined above in agSchedReminder block
// ── IDs ya disparados en esta sesión (evita doble disparo) ──
var _agFired = {};

// ── Registrar recordatorio: guarda en SW + marca hora de disparo en localStorage ──
function agSchedReminder(ct) {
  if(!ct.recordatorio || !ct.fecha || !ct.hora) {
    console.log('[Agenda] agSchedReminder: salió por guard — recordatorio:', ct.recordatorio, 'fecha:', ct.fecha, 'hora:', ct.hora);
    return;
  }

  var cdt = new Date(ct.fecha + 'T' + ct.hora + ':00');
  if(isNaN(cdt.getTime())) {
    console.log('[Agenda] agSchedReminder: fecha inválida:', ct.fecha, ct.hora);
    return;
  }
  var alertT = new Date(cdt.getTime() - ct.recordatorio * 60000);
  var ms = alertT.getTime() - Date.now();
  console.log('[Agenda] agSchedReminder: ms calculado =', ms, '| fireAt:', new Date(Date.now()+ms).toLocaleTimeString());
  if(!isFinite(ms) || ms <= 0) {
    console.log('[Agenda] agSchedReminder: ms <= 0, ya pasó el momento de alerta');
    return;
  }

  // Persistir fireAt en localStorage para que el polling lo detecte
  try {
    var sched = JSON.parse(localStorage.getItem('ag_sched') || '{}');
    sched[ct.id] = { fireAt: Date.now() + ms, cita: ct };
    localStorage.setItem('ag_sched', JSON.stringify(sched));
  } catch(e) {}

  // También enviar al SW (backup para cuando la app está cerrada)
  if(navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(function(reg) {
      var target = reg.active || navigator.serviceWorker.controller;
      if(target) target.postMessage({ type:'SCHEDULE_REMINDER', cita:ct, ms:ms });
    }).catch(function(){});
  }
}

// ── Cancelar recordatorio ──
function agCancelReminder(id) {
  if(!id) return;
  // Limpiar localStorage
  try {
    var sched = JSON.parse(localStorage.getItem('ag_sched') || '{}');
    delete sched[id];
    localStorage.setItem('ag_sched', JSON.stringify(sched));
  } catch(e) {}
  delete _agFired[id];
  // Avisar al SW
  if(navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(function(reg) {
      var target = reg.active || navigator.serviceWorker.controller;
      if(target) target.postMessage({ type:'CANCEL_REMINDER', citaId:id });
    }).catch(function(){});
  }
}

// ── Disparar notificación de recordatorio ──
function agFireReminderNow(ct) {
  var iconos  = { cirugia:'🔪', consulta:'🩺', seguimiento:'📋', urgencia:'🚨', revision:'🔬', otro:'📌' };
  var nombres = { cirugia:'Cirugía', consulta:'Consulta', seguimiento:'Seguimiento', urgencia:'Urgencia', revision:'Revisión', otro:'Cita' };
  var pacN  = (ct.pacNombre && ct.pacNombre !== 'undefined') ? ct.pacNombre : 'Paciente';
  var tipo  = nombres[ct.tipo] || ct.tipo || 'Cita';
  var icono = iconos[ct.tipo] || '📅';
  var hora  = ct.hora || '--:--';
  var sala  = ct.sala ? ' · ' + ct.sala : '';
  var dx    = ct.pacDx || tipo;

  var diff = new Date(ct.fecha + 'T' + ct.hora + ':00').getTime() - Date.now();
  var mins = Math.round(diff / 60000);
  var tiempoRestante = mins <= 0 ? 'ahora' : mins < 60 ? 'en ' + mins + ' min' : mins < 120 ? 'en 1 hora' : 'en ' + Math.round(mins/60) + ' horas';

  var title = icono + ' ' + tipo + '  —  ' + tiempoRestante;
  var body  = '👤 ' + pacN + '\n' + dx + '\n🕐 ' + hora + sala;

  // Notificación nativa
  if(typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/anestesys/icon.svg',
        tag: 'ag-' + ct.id,
        requireInteraction: true,
        vibrate: [300,100,300,100,300,200,500]
      });
    } catch(e) {
      // Fallback via SW si la API directa falla (iOS)
      if(navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(function(reg) {
          reg.showNotification(title, {
            body: body, icon: '/anestesys/icon.svg',
            tag: 'ag-' + ct.id, requireInteraction: true,
            vibrate: [300,100,300,100,300,200,500]
          });
        }).catch(function(){});
      }
    }
  }
  // Toast + alerta en la app
  try { showToast('🔔 ' + icono + ' ' + pacN + ' — ' + tiempoRestante); } catch(e) {}
  try { addAlert('info', 'Recordatorio: ' + icono + ' ' + pacN + ' — ' + dx + ' a las ' + hora); } catch(e) {}
  if(navigator.vibrate) navigator.vibrate([300,100,300,100,300]);
}

// ── Polling: se llama cada 30 seg desde tick() ──
function agCheckReminders() {
  try {
    var sched = JSON.parse(localStorage.getItem('ag_sched') || '{}');
    var now   = Date.now();
    var changed = false;

    for(var id in sched) {
      var entry = sched[id];
      if(!entry || !entry.fireAt) continue;
      // Disparar si ya llegó la hora (con ±2 min de tolerancia hacia atrás)
      if(entry.fireAt <= now + 120000 && entry.fireAt > now - 120000) {
        if(!_agFired[id]) {
          _agFired[id] = true;
          agFireReminderNow(entry.cita);
        }
      }
      // Limpiar entradas que ya pasaron hace más de 5 min
      if(entry.fireAt < now - 300000) {
        delete sched[id];
        changed = true;
      }
    }
    if(changed) localStorage.setItem('ag_sched', JSON.stringify(sched));
  } catch(e) {}
}
function agInitReminders() {
  // Re-programar citas pendientes que aún no han disparado
  var lista = agGet();
  for(var i = 0; i < lista.length; i++) {
    if(lista[i].estado === 'pendiente') agSchedReminder(lista[i]);
  }
  // Disparar inmediatamente cualquier recordatorio vencido
  try { agCheckReminders(); } catch(e) {}
}

// ─────────────────────────────────────────────────────────────
