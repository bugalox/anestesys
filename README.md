# AnesteSys Pro — Estructura de Archivos

## Árbol del proyecto

```
anestesys/
├── index.html          ← Shell principal (< 120 líneas)
├── css/
│   └── main.css        ← Todos los estilos (360 líneas)
├── html/               ← Partials HTML por pantalla
│   ├── page_monitor.html
│   ├── page_preopera.html
│   ├── page_liquidos.html
│   ├── page_ventilad.html
│   ├── page_farmacos.html
│   ├── page_alertas.html
│   ├── page_resumen.html
│   ├── page_laborat.html
│   ├── page_grande.html
│   └── modals.html     ← Todos los modales globales
└── js/                 ← Módulos JS por dominio
    ├── state.js         ← Objeto S (estado global)
    ├── utils.js         ← Helpers: get(), getT(), etc.
    ├── alerts.js        ← addAlert(), renderAlerts()
    ├── navigation.js    ← nav(), tab switching
    ├── clock.js         ← tick(), topbar clock, phases timer
    ├── paciente.js      ← openPacModal(), savePac()
    ├── vitals.js        ← addVital(), renderVitalTable()
    ├── chart.js         ← drawChart(), Chart.js logic
    ├── phases.js        ← startAn(), startCx(), fases
    ├── hourly.js        ← Alarma horaria automática
    ├── liquidos.js      ← calcLiq(), registro hora por hora
    ├── ventilador.js    ← upVent(), registro ventilador
    ├── farmacos.js      ← addFarm(), renderFarms()
    ├── aldrete.js       ← calcAld(), Aldrete score
    ├── pantalla.js      ← Modo pantalla grande
    ├── guardar.js       ← autoSave(), debounceSave()
    ├── editar_vital.js  ← openEditVital(), saveVitalEdit()
    ├── editar_farm.js   ← openEditFarm(), saveFarmEdit()
    ├── resumen.js       ← genRes(), print, PDF share
    ├── login.js         ← Firebase auth / login
    ├── historial.js     ← renderHistorial(), loadCaso()
    ├── delete.js        ← deleteCaso(), deleteVentRow()
    ├── alertas_del.js   ← deleteAlert()
    ├── laboratorios.js  ← Módulo laboratorios completo
    ├── agenda.js        ← Calendario y citas
    ├── startup.js       ← Lógica de inicio, restore state
    ├── init.js          ← DOMContentLoaded, hooks nav()
    └── sw.js            ← Service Worker registration
```

## Cómo ejecutar en desarrollo

```bash
# Opción 1 — Node
npx serve .

# Opción 2 — Python
python3 -m http.server 8080

# Opción 3 — VS Code
# Instalar extensión Live Server → clic derecho en index.html → Open with Live Server
```

> ⚠️ NO abrir index.html directamente como file:// — el fetch() de partials requiere HTTP.

## Flujo de carga

1. `index.html` renderiza el app shell (topbar + bottomnav)
2. El loader fetch paralelo carga todos los partials HTML
3. Se inyectan en `#pages-container` y `#modals-container`
4. Los módulos JS se cargan secuencialmente respetando dependencias
5. `startup.js` restaura el estado desde localStorage
6. `init.js` dispara `DOMContentLoaded` hooks y arranca el clock

## Reglas para editar

| Quieres cambiar... | Edita... |
|---|---|
| Estilos / colores / layout | `css/main.css` |
| Campos del formulario de paciente | `html/page_preopera.html` + `js/paciente.js` |
| Lógica de balance de líquidos | `js/liquidos.js` |
| Tabla de signos vitales | `js/vitals.js` + `html/page_monitor.html` |
| Cálculo de VSC/permisible | `js/phases.js` |
| Generación de PDF/reporte | `js/resumen.js` |
| Modales (editar fila, VSC, etc.) | `html/modals.html` + módulo JS correspondiente |
| Login / guardado en la nube | `js/login.js` |
| Agenda / citas | `js/agenda.js` |
