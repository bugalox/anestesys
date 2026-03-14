// STATE
// ═══════════════════════════════════════════════
const S = {
  vitals:      {tas:135, tad:91, fc:100, spo2:93, fr:17, temp:37.0},
  history:     [],
  farms:       [],
  phases:      {an:null, finAn:null, cx:null, finCx:null, isqIni:null, isqFin:null},
  ventHist:    [],
  liqHora:     [],
  alerts:      [],
  hrAlarms:    [],
  hourBuckets: {},
  autoInterval: null,
  alarmCfg:    {tHi:160, tLo:80, fHi:120, fLo:45, sLo:92, tpHi:38.5},
  pac: {
    nombre:'', edad:'', exp:'', sexo:'Masculino', peso:'', pesoI:'', pesoC:'', talla:'',
    dx:'', cx:'', tipoAn:'AGB — Anestesia General Balanceada', tipoAn2:'', tipoAnNota:'',
    asa:'II', med:'', medCed:'', medCedEsp:'',
    ciru:'', ciruCed:'', ciruCedEsp:'', inst:'',
    guia:'', anLocal:'', anLocalDosis:'',
    alergias:'', ayuno:'', ayunoTipo:'', antecedentes:'', medCronicos:'',
    mallampati:'', aperturaBucal:'', dtm:'', antID:'No', premed:'',
    categoria:'privado'
  },
  etco2:       38,
  bis:         null,
  _casoId:     null,
  _readOnly:   false,
  _frozenTan:  null,
  _frozenTcx:  null,
  _vscManual:  null,
  _vspManual:  null,
  _sangAlerted:false,
};



// ═══════════════════════════════════════════════
