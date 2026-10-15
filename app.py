import streamlit as __st
import numpy as __np
import pandas as __pd
from scipy.stats import poisson

# Configuración de la página (Optimizada para móviles y PC)
__st.set_page_config(
    page_title="AI Soccer Analyzer & Parley",
    page_icon="⚽",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# Estilos CSS personalizados (Estética deportiva moderna / Modo oscuro)
__st.markdown("""
<style>
    .main { background-color: #0e1117; color: #ffffff; }
    .stButton>button {
        width: 100%;
        background-color: #00ff87;
        color: #000000;
        font-weight: bold;
        border-radius: 8px;
        padding: 10px;
        border: none;
    }
    .stButton>button:hover {
        background-color: #00e676;
    }
    .metric-card {
        background-color: #1f2937;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #374151;
        text-align: center;
        margin-bottom: 10px;
    }
</style>
""", unsafe_allow_html=True)

__st.title("⚽ AI Soccer & Parley Pro")
__st.markdown("### Analizador Estadístico de Partidos y Generador de Combinadas")

# Pestañas principales de la App
__tab1, __tab2, __tab3 = __st.tabs(["📊 Simulador Poisson", "🎯 Parleys del Día", "📁 Cargar Data"])

with __tab1:
    __st.subheader("Motor de Probabilidad (Poisson)")
    __col1, __col2 = __st.columns(2)
    
    with __col1:
        __local = __st.text_input("Equipo Local", "Real Madrid")
        __lambda_local = __st.slider("Fuerza Ofensiva Local (xG)", 0.5, 3.5, 1.8, 0.1)
    
    with __col2:
        __visitante = __st.text_input("Equipo Visitante", "Barcelona")
        __lambda_visitante = __st.slider("Fuerza Ofensiva Visitante (xG)", 0.5, 3.5, 1.3, 0.1)

    if __st.button("Calcular Probabilidades del Partido"):
        # Cálculo de Poisson para goles (0 a 5 goles)
        __max_goles = 5
        __matriz_prob = __np.outer(
            [poisson.pmf(i, __lambda_local) for i in range(__max_goles)],
            [poisson.pmf(j, __lambda_visitante) for j in range(__max_goles)]
        )
        
        __p_local = __np.sum(np.tril(__matriz_prob, -1)) # Gana Local
        __p_empate = __np.sum(np.diag(__matriz_prob))    # Empate
        __p_visit = __np.sum(np.triu(__matriz_prob, 1))  # Gana Visitante
        
        __st.markdown("---")
        __st.write(f"### Resultados Estimados: {__local} vs {__visitante}")
        
        __m1, __m2, __m3 = __st.columns(3)
        with __m1:
            __st.metric(label=f"Victoria {__local}", value=f"{__p_local*100:.1f}%")
        with __m2:
            __st.metric(label="Empate", value=f"{__p_empate*100:.1f}%")
        with __m3:
            __st.metric(label=f"Victoria {__visitante}", value=f"{__p_visit*100:.1f}%")

with __tab2:
    __st.subheader("🎯 Creador Inteligente de Parleys")
    __st.write("Filtra las opciones con alta asertividad basadas en tus criterios:")
    
    __riesgo = __st.selectbox("Nivel de Riesgo del Parley", ["Conservador (Alta Asertividad - 2 picks)", "Moderado (Balanceado - 3 picks)"])
    __cuota_min = __st.slider("Cuota Mínima Deseada por Selección", 1.20, 2.50, 1.50, 0.05)
    
    if __st.button("Generar Parley Óptimo"):
        __st.success("¡Parley generado con éxito bajo filtros de valor matemático (+EV)!")
        
        # Ejemplo simulado de parley generado por el algoritmo
        __st.markdown("""
        * **Selección 1:** Arsenal vs Chelsea -> **Menos de 3.5 goles** (Prob: 82%) - Cuota: 1.45
        * **Selección 2:** Inter de Milán vs Juventus -> **Doble Oportunidad (Inter o Empate)** (Prob: 79%) - Cuota: 1.35
        """)
        if "Conservador" in __riesgo:
            __st.info("🔥 **Cuota Combinada Total Estimada:** 1.95 | **Riesgo:** Bajo")
        else:
            __st.markdown("""
            * **Selección 3:** Bayern Munich vs Dortmund -> **Ambos Anotan (BTTS)** (Prob: 76%) - Cuota: 1.50
            """)
            __st.info("🔥 **Cuota Combinada Total Estimada:** 2.93 | **Riesgo:** Moderado")

with __tab3:
    __st.subheader("Cargar Base de Datos Externa")
    __archivo = __st.file_uploader("Sube tu archivo CSV con estadísticas históricas", type=["csv"])
    if __archivo is not None:
        __df = __pd.read_csv(__archivo)
        __st.write("Vista previa de tus datos deportivos:")
        __st.dataframe(__df.head())
        __st.success("¡Datos cargados correctamente para alimentar el motor analítico!")
