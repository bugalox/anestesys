import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
  import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }
    from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
  import { getFirestore, doc, getDoc }
    from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyBkukNH93KZYH_Nt9kSFUZxjLVJ5R_wufg",
    authDomain: "anestesys.firebaseapp.com",
    projectId: "anestesys",
    storageBucket: "anestesys.firebasestorage.app",
    messagingSenderId: "387101539211",
    appId: "1:387101539211:web:96667e3d8b6808c546cd8e",
    measurementId: "G-R8EXVZ9YMY"
  };

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  // ── helpers UI (siempre via window para cruzar el boundary module↔global) ──
  const _showLogin    = () => { if(typeof window.showLogin    === 'function') window.showLogin();        };
  const _hideLogin    = () => { if(typeof window.hideLogin    === 'function') window.hideLogin();        };
  const _setAccessUI  = (v) => { if(typeof window.setAccessUI === 'function') window.setAccessUI(v);    };
  const _setLoginBtn  = (loading) => {
    const btn = document.getElementById('login-btn');
    if (!btn) return;
    btn.disabled    = loading;
    btn.textContent = loading ? '⏳ Validando...' : 'Iniciar sesión';
    btn.style.opacity = loading ? '0.6' : '1';
  };

  function setAccessMsg(msg, color) {
    const el = document.getElementById('access-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.color = color || '#3d5a78';
  }
  // también en window para que el script global pueda usarla
  window.setAccessMsg = setAccessMsg;

  function todayYYYYMMDD() {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  async function isUserActive(user) {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return false;
    const data = snap.data() || {};
    if (data.active !== true) return false;
    if (data.paid_until && String(data.paid_until) < todayYYYYMMDD()) return false;
    return true;
  }

  // ── LOGIN ──
  window.doLogin = async function () {
    const email = (document.getElementById('auth-email')?.value || '').trim();
    const pass  = (document.getElementById('auth-pass')?.value  || '').trim();
    if (!email || !pass) {
      setAccessMsg('⚠️ Escribe tu email y contraseña.', '#ffd600');
      return;
    }
    _setLoginBtn(true);
    setAccessMsg('🔄 Iniciando sesión...', '#3d5a78');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged se encarga del resto
    } catch (e) {
      const msgs = {
        'auth/invalid-credential':    '🚫 Email o contraseña incorrectos.',
        'auth/user-not-found':        '🚫 Usuario no encontrado.',
        'auth/wrong-password':        '🚫 Contraseña incorrecta.',
        'auth/too-many-requests':     '⏳ Demasiados intentos. Espera unos minutos.',
        'auth/network-request-failed':'📶 Sin conexión. Verifica tu internet.',
      };
      setAccessMsg(msgs[e.code] || '🚫 Error: ' + e.message, '#ff1744');
      _setLoginBtn(false);
    }
  };

  // ── LOGOUT ──
  window.doLogout = async function () {
    try { await signOut(auth); } catch(e) {}
    _showLogin();
    _setAccessUI(false);
    setAccessMsg('🔐 Sesión cerrada.');
  };

  // ── AUTH STATE LISTENER (el corazón del sistema) ──
  onAuthStateChanged(auth, async (user) => {
    _setLoginBtn(false);

    if (!user) {
      // No hay sesión
      _showLogin();
      _setAccessUI(false);
      setAccessMsg('🔐 Inicia sesión para continuar.');
      return;
    }

    // Hay sesión → validar en Firestore
    setAccessMsg('🔄 Validando tu acceso...', '#3d5a78');
    try {
      const ok = await isUserActive(user);
      if (!ok) {
        await signOut(auth);
        _showLogin();
        _setAccessUI(false);
        setAccessMsg('⛔ Cuenta inactiva o suscripción vencida. Contacta al administrador.', '#ff1744');
        return;
      }
      // ✅ Autorizado
      _setAccessUI(true);
      _hideLogin();
      setAccessMsg('✅ Acceso autorizado — ' + (user.email || ''), '#00e676');
      try { if(typeof window.showToast === 'function') window.showToast('✅ Bienvenido, ' + (user.email || '')); } catch(e) {}
    } catch(e) {
      // Error de red o Firestore
      _showLogin();
      _setAccessUI(false);
      setAccessMsg('⚠️ No se pudo validar acceso. Verifica tu conexión.', '#ffd600');
    }
  });