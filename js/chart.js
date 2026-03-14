// CHART
// ═══════════════════════════════════════════════
function drawChart() {
  const cv = document.getElementById('chart');
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.offsetWidth;
  const H = 320; // 4 paneles
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr,0,0,dpr,0,0);

  // Fondo
  c.fillStyle = '#04060d';
  c.fillRect(0,0,W,H);

  const d = S.history || [];
  if (d.length < 2) {
    c.fillStyle = 'rgba(61,90,120,.9)';
    c.font = '12px -apple-system,system-ui';
    c.textAlign = 'center';
    c.fillText('Sin datos para gráfica (registra al menos 2 puntos)', W/2, H/2);
    return;
  }

  // Helpers
  function line(vals, min, max, y0, ph, color) {
    const n = vals.length;
    c.beginPath();
    c.strokeStyle = color;
    c.lineWidth = 2;
    for (let i=0;i<n;i++) {
      const v = vals[i];
      const x = padL + (i/(n-1)) * plotW;
      const y = y0 + ph - ((v - min) / (max - min)) * ph;
      if (i===0) c.moveTo(x,y); else c.lineTo(x,y);
    }
    c.stroke();
    // last dot
    const lv = vals[n-1];
    const lx = padL + plotW;
    const ly = y0 + ph - ((lv - min) / (max - min)) * ph;
    c.beginPath();
    c.fillStyle = color;
    c.arc(lx,ly,3.5,0,Math.PI*2);
    c.fill();
  }

  function riskBand(min, max, y0, ph, bands) {
    // bands = [{lo,hi,color,alpha}]
    for (const b of bands) {
      const yHi = y0 + ph - ((b.hi - min)/(max-min))*ph;
      const yLo = y0 + ph - ((b.lo - min)/(max-min))*ph;
      c.fillStyle = b.color;
      c.globalAlpha = b.alpha;
      c.fillRect(padL, yHi, plotW, (yLo-yHi));
      c.globalAlpha = 1;
    }
  }

  function grid(min, max, y0, ph, ticks, labelColor='rgba(61,90,120,.9)') {
    c.strokeStyle = 'rgba(30,45,68,.6)';
    c.lineWidth = 0.7;
    c.fillStyle = labelColor;
    c.font = '10px Menlo, monospace';
    c.textAlign = 'left';
    ticks.forEach(v => {
      const y = y0 + ph - ((v - min)/(max-min))*ph;
      c.beginPath();
      c.moveTo(padL, y);
      c.lineTo(padL + plotW, y);
      c.stroke();
      c.fillText(String(v), 6, y+3);
    });
  }

  function title(txt, y0, color) {
    c.fillStyle = color;
    c.font = '11px -apple-system,system-ui';
    c.textAlign = 'left';
    c.fillText(txt, padL, y0 - 6);
  }

  // Layout
  const padL = 44; // espacio para etiquetas
  const padR = 10;
  const padT = 18;
  const gap = 16;
  const panelH = Math.floor((H - padT - gap*3) / 4);
  const plotW = W - padL - padR;

  // Datos
  const tas = d.map(r => +r.tas);
  const tad = d.map(r => +r.tad);
  const fc  = d.map(r => +r.fc);
  const sp  = d.map(r => +r.spo2);
  const tp  = d.map(r => +r.temp);

  // Panel 1: Presión
  let y0 = padT;
  title('TA (mmHg)', y0, '#00e5ff');
  riskBand(50,200,y0,panelH,[
    {lo: 90, hi: 160, color:'#00e676', alpha:0.08},
    {lo: 80, hi: 90,  color:'#ffd600', alpha:0.10},
    {lo: 160,hi: 190, color:'#ffd600', alpha:0.10},
    {lo: 50, hi: 80,  color:'#ff1744', alpha:0.08},
    {lo: 190,hi: 200, color:'#ff1744', alpha:0.08},
  ]);
  grid(50,200,y0,panelH,[80,100,120,140,160,180]);
  line(tas,50,200,y0,panelH,'#00e5ff');
  line(tad,50,200,y0,panelH,'#0099cc');

  // Panel 2: FC
  y0 = padT + (panelH + gap)*1;
  title('FC (lpm)', y0, '#ff6d00');
  riskBand(30,180,y0,panelH,[
    {lo: 60, hi: 110, color:'#00e676', alpha:0.08},
    {lo: 45, hi: 60,  color:'#ffd600', alpha:0.10},
    {lo: 110,hi: 130, color:'#ffd600', alpha:0.10},
    {lo: 30, hi: 45,  color:'#ff1744', alpha:0.08},
    {lo: 130,hi: 180, color:'#ff1744', alpha:0.08},
  ]);
  grid(30,180,y0,panelH,[45,60,90,120,150]);
  line(fc,30,180,y0,panelH,'#ff6d00');

  // Panel 3: SpO2
  y0 = padT + (panelH + gap)*2;
  title('SpO₂ (%)', y0, '#00e676');
  riskBand(70,100,y0,panelH,[
    {lo: 94, hi: 100, color:'#00e676', alpha:0.08},
    {lo: 92, hi: 94,  color:'#ffd600', alpha:0.12},
    {lo: 70, hi: 92,  color:'#ff1744', alpha:0.10},
  ]);
  grid(70,100,y0,panelH,[92,94,96,98,100]);
  line(sp,70,100,y0,panelH,'#00e676');

  // Panel 4: Temp
  y0 = padT + (panelH + gap)*3;
  title('Temp (°C)', y0, '#ffd600');
  riskBand(34,41,y0,panelH,[
    {lo: 36.0, hi: 37.8, color:'#00e676', alpha:0.07},
    {lo: 37.8, hi: 38.5, color:'#ffd600', alpha:0.10},
    {lo: 38.5, hi: 41.0, color:'#ff1744', alpha:0.08},
    {lo: 34.0, hi: 35.0, color:'#ffd600', alpha:0.08},
  ]);
  grid(34,41,y0,panelH,[35,36,37,38,39,40]);
  line(tp,34,41,y0,panelH,'#ffd600');

  // Eje X: marcas mínimas (inicio/medio/fin)
  c.fillStyle = 'rgba(61,90,120,.9)';
  c.font = '9px Menlo, monospace';
  c.textAlign = 'center';
  const n = d.length;
  const t0 = d[0].hora || '';
  const tm = d[Math.floor((n-1)/2)].hora || '';
  const tN = d[n-1].hora || '';
  const yLab = H - 6;
  c.fillText(t0, padL, yLab);
  c.fillText(tm, padL + plotW/2, yLab);
  c.fillText(tN, padL + plotW, yLab);
}

setTimeout(drawChart,200);
window.addEventListener('resize',()=>setTimeout(drawChart,100));

// ═══════════════════════════════════════════════
// AUTO-INTERVAL
// ═══════════════════════════════════════════════
function changeVitalInterval() {
  if(S.autoInterval) clearInterval(S.autoInterval);
  const mins = parseInt(document.getElementById('vi-interval').value);
  if(!mins) return;
  S.autoInterval = setInterval(()=>{
    if(S.phases.an && S._frozenTan == null){
      registrar();
      addAlert('info',`📊 Auto-registro c/${mins}min`,getT());
    }
  }, mins*60000);
}

// ═══════════════════════════════════════════════
