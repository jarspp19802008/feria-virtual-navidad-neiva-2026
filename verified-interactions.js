/* Account-authenticated participation. Identity is a Google account, not a person. */
(function () {
  'use strict';
  const appCheckKey = '6LcX9-8tAAAAAO2wohzronQG8fwNiK20zNv4RPyD'; // Public, domain-restricted site key.
  function configureAppCheck() {
    if (new URLSearchParams(location.search).get('diagnostico') === '1') {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async function(input, init) {
        const response = await originalFetch(input, init);
        const url = typeof input === 'string' ? input : input.url || String(input);
        if (url.includes('firebaseappcheck.googleapis.com') && !response.ok) {
          response.clone().json().then(body => console.warn('Feria App Check diagnostic: ' + JSON.stringify({status: response.status, error: body.error?.message, code: body.error?.status}))).catch(() => {});
        }
        return response;
      };
    }
    if (appCheckKey && firebase.appCheck) {
      firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(appCheckKey), true);
    }
  }
  function create(options) {
    const { auth, db } = options;
    const state = { uid: null, google: false, ready: false, likes: {}, counts: {}, legacyCounts: {}, legacyReady: false, pending: new Set() };
    let account = null, mounted = null, ownListeners = [], storeKeys = [], signingIn = false;
    let generation = 0, legacyLoaded = false;
    const report = text => { if (mounted) mounted.querySelector('[data-integrity-message]').textContent = text; options.notice?.(text); };
    const emit = () => { updateAccountBar(); options.onChange?.(state); };
    function updateAccountBar() {
      if (!mounted) return;
      mounted.querySelector('[data-google-login]').hidden = state.google;
      mounted.querySelector('[data-google-logout]').hidden = !state.google;
      mounted.querySelector('[data-account-status]').textContent = state.google ? 'Cuenta Google conectada' : 'Ingresa con Google para apoyar';
    }
    function mount(id) {
      mounted = document.getElementById(id);
      if (!mounted) return;
      mounted.innerHTML = '<div class="integrity-account"><div><strong>Apoya al comercio local</strong><span data-account-status></span></div><button type="button" data-google-login>Ingresar con Google</button><button type="button" data-google-logout hidden>Salir de Google</button></div><p class="integrity-explanation">Un apoyo por cuenta Google y comercio durante el concurso. Los nuevos apoyos se conservan con fecha del servidor y no se pueden retirar. Una cuenta no acredita una persona única.</p><details class="integrity-history"><summary>Sobre los conteos anteriores y el uso de datos</summary><p>El total visible conserva los likes históricos y añade los nuevos apoyos con Google. El desglose distingue el historial anónimo, que no puede certificarse, de los nuevos apoyos autenticados. Una misma persona podría haber participado en ambas etapas; el total no acredita personas únicas. Al ingresar, Google y Firebase gestionan tu autenticación; la feria guarda el identificador de tu cuenta y la fecha, sin publicar tu correo. Las visitas conservan su base histórica y añaden cuentas Google que ingresan en la nueva etapa. El total combina dos métodos de conteo y no acredita visitantes únicos.</p></details><p data-integrity-message role="status" aria-live="polite"></p>';
      mounted.querySelector('[data-google-login]').onclick = login;
      mounted.querySelector('[data-google-logout]').onclick = async () => {
        try { await auth.signOut(); report('Sesión cerrada. Puedes seguir explorando la feria.'); }
        catch { report('No se pudo cerrar la sesión. Inténtalo nuevamente.'); }
      };
      updateAccountBar();
    }
    async function login() {
      if (state.google) return true;
      if (signingIn) return false;
      signingIn = true;
      const button = mounted?.querySelector('[data-google-login]');
      if (button) button.disabled = true;
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await auth.signInWithPopup(provider);
        report('Cuenta conectada. Ahora puedes registrar tu apoyo al comercio que elijas.');
        return true;
      } catch (error) {
        report(error.code === 'auth/popup-closed-by-user' ? 'Ingreso cancelado. No se registró ningún apoyo.' : 'No se pudo ingresar con Google. Permite la ventana de acceso e inténtalo de nuevo.');
        return false;
      } finally {
        signingIn = false;
        if (button) button.disabled = false;
      }
    }
    function detachOwnListeners() {
      ownListeners.forEach(({ ref, callback }) => ref.off('value', callback));
      ownListeners = [];
    }
    function listenToOwnSupports() {
      detachOwnListeners(); state.likes = {};
      if (!account) { emit(); return; }
      storeKeys.forEach(key => {
        const ref = db.ref('verifiedSupports/' + key + '/' + account);
        const callback = snap => { state.likes[key] = snap.exists(); emit(); };
        ref.on('value', callback, () => report('No pudimos comprobar tus apoyos. Recarga la página antes de continuar.'));
        ownListeners.push({ ref, callback });
      });
      emit();
    }
    function setStores(keys) {
      const next = [...new Set(keys)].sort();
      if (JSON.stringify(next) === JSON.stringify(storeKeys)) return;
      storeKeys = next; listenToOwnSupports();
    }
    async function recordVisit() {
      const currentAccount = account, currentUid = state.uid;
      if (!currentAccount) return;
      const ref = db.ref('verifiedVisitors/' + currentAccount);
      try {
        if ((await ref.once('value')).exists()) return;
        if (account !== currentAccount) return;
        await db.ref().update({
          ['verifiedVisitors/' + currentAccount]: { uid: currentUid, createdAt: firebase.database.ServerValue.TIMESTAMP },
          verifiedVisitorCount: firebase.database.ServerValue.increment(1)
        });
      } catch {
        // Another open tab can create this account's visit first.
        try { if (!(await ref.once('value')).exists()) report('No se pudo confirmar la visita autenticada.'); }
        catch { report('No se pudo confirmar la visita autenticada.'); }
      }
    }
    async function support(key) {
      if (!storeKeys.includes(key)) { report('Este comercio ya no está disponible para recibir apoyos.'); return; }
      if (!state.google) { await login(); return; }
      if (!account || state.pending.has(key)) return;
      if (state.likes[key]) { report('Tu cuenta ya registró un apoyo para este comercio.'); return; }
      const currentAccount = account, currentUid = state.uid;
      const ref = db.ref('verifiedSupports/' + key + '/' + currentAccount);
      state.pending.add(key); emit();
      try {
        if ((await ref.once('value')).exists()) { state.likes[key] = true; report('Tu apoyo ya estaba registrado.'); return; }
        if (account !== currentAccount) throw new Error('account-changed');
        await recordVisit();
        await db.ref().update({
          ['verifiedSupports/' + key + '/' + currentAccount]: { uid: currentUid, createdAt: firebase.database.ServerValue.TIMESTAMP },
          ['verifiedSupportCounts/' + key]: firebase.database.ServerValue.increment(1)
        });
        state.likes[key] = true;
        report('Apoyo registrado con tu cuenta Google y fecha del servidor. Gracias por participar.');
      } catch {
        try {
          if ((await ref.once('value')).exists()) { state.likes[key] = true; report('Tu apoyo ya estaba registrado y no se duplicó.'); }
          else report('No se pudo registrar tu apoyo. No se confirmó ningún voto; revisa la conexión e inténtalo de nuevo.');
        } catch { report('No se pudo confirmar tu apoyo. Revisa la conexión antes de continuar.'); }
      } finally { state.pending.delete(key); emit(); }
    }
    function start() {
      db.ref('verifiedSupportCounts').on('value', snap => { state.counts = snap.val() || {}; emit(); }, () => report('No se pudieron cargar los apoyos autenticados.'));
      db.ref('verifiedVisitorCount').on('value', snap => options.onVisitCount?.(Number(snap.val()) || 0), () => options.onVisitCount?.(null));
      auth.onAuthStateChanged(async user => {
        const currentGeneration = ++generation;
        account = null; state.google = false; state.uid = user?.uid || null; state.ready = Boolean(user); state.likes = {};
        detachOwnListeners(); emit();
        if (!user) {
          try { await auth.signInAnonymously(); }
          catch { report('Puedes explorar los comercios. Para apoyar o enviar una inscripción, permite la conexión con Firebase.'); }
          return;
        }
        if (!legacyLoaded) {
          legacyLoaded = true;
          db.ref('likesByStore').once('value').then(snap => { snap.forEach(shop => { state.legacyCounts[shop.key] = shop.numChildren(); }); state.legacyReady = true; emit(); }).catch(() => {});
          db.ref('visitsByDay').once('value').then(snap => { let n = 0; snap.forEach(day => { n += day.numChildren(); }); options.onLegacyVisits?.(n); }).catch(() => {});
        }
        try {
          const token = await user.getIdTokenResult();
          if (currentGeneration !== generation) return;
          const identity = token.claims.firebase;
          account = identity?.sign_in_provider === 'google.com' && token.claims.email_verified === true ? identity.identities?.['google.com']?.[0] || null : null;
          state.google = Boolean(account); listenToOwnSupports();
          if (account) await recordVisit();
        } catch { report('No se pudo comprobar la cuenta. Vuelve a ingresar con Google.'); }
      });
    }
    return { mount, start, support, setStores, state };
  }
  window.FeriaIntegrity = { create, configureAppCheck };
})();