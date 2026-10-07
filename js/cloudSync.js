import { state } from './state.js';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBx0vqA1ZlL_AYpz_43LyXXIsNPNfD-33A",
  authDomain: "gym-mesocycle.firebaseapp.com",
  projectId: "gym-mesocycle",
  storageBucket: "gym-mesocycle.firebasestorage.app",
  messagingSenderId: "473853059782",
  appId: "1:473853059782:web:70d070aba6d6a73eff6dc7",
  measurementId: "G-HWBNEKZLKE"
};

/**
 * Gestore Sincronizzazione Cloud Real-Time Automatica
 * Supporta Google Firebase Firestore e diagnostica interattiva dei permessi.
 */
export class CloudSync {
  constructor() {
    this.firebaseApp = null;
    this.firestore = null;
    this.unsubscribeFirestore = null;
    this.isSyncing = false;
    this.syncStatus = 'disconnected'; // 'connected' | 'syncing' | 'permission_denied' | 'offline' | 'disconnected'
    this.lastError = null;
    this.statusListeners = [];
    this.debounceTimer = null;
  }

  onStatusChange(listener) {
    this.statusListeners.push(listener);
    listener(this.syncStatus, this.lastError);
  }

  setStatus(status, errorMsg = null) {
    this.syncStatus = status;
    this.lastError = errorMsg;
    this.statusListeners.forEach(l => {
      try { l(status, errorMsg); } catch (e) {}
    });
    this.updateHeaderBadge();
  }

  updateHeaderBadge() {
    const badge = document.getElementById('cloud-status-badge');
    if (!badge) return;

    if (this.syncStatus === 'connected') {
      badge.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-emerald-400 font-semibold">Cloud Attivo</span>
      `;
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-500/20 transition-all';
      badge.title = '🟢 Cloud sincronizzato in tempo reale su tutti i dispositivi. Clicca per dettagli.';
    } else if (this.syncStatus === 'syncing') {
      badge.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
        <span class="text-teal-300 font-semibold">Sincronizzazione...</span>
      `;
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-teal-500/10 border border-teal-500/30 flex items-center gap-1.5 cursor-pointer';
      badge.title = 'Sincronizzazione dati in corso...';
    } else if (this.syncStatus === 'permission_denied') {
      badge.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span class="text-amber-300 font-bold">⚠️ Regole Cloud</span>
      `;
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-amber-500/20 border border-amber-500/50 flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/30 transition-all shadow-sm shadow-amber-500/20';
      badge.title = '⚠️ Firestore richiede di abilitare le Regole di Sicurezza in Firebase Console. Clicca per la guida rapida.';
    } else if (this.syncStatus === 'offline') {
      badge.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
        <span class="text-rose-300 font-medium">Cloud Offline</span>
      `;
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-rose-500/10 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-rose-500/20';
      badge.title = 'Connessione Cloud non riuscita. Clicca per verificare.';
    } else {
      badge.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-zinc-500"></span>
        <span class="text-zinc-400 font-medium">Locale</span>
      `;
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-zinc-800/80 border border-zinc-700/60 flex items-center gap-1.5 cursor-pointer hover:border-emerald-500/40';
      badge.title = 'Clicca per attivare la sincronizzazione online automatica';
    }
  }

  /**
   * Inizializza la sincronizzazione con la configurazione salvata o quella predefinita di Firebase.
   */
  async init() {
    let config = this.getSavedConfig();
    if (!config && DEFAULT_FIREBASE_CONFIG.projectId) {
      config = { type: 'firebase', firebaseConfig: DEFAULT_FIREBASE_CONFIG };
      this.saveConfig(config);
    }

    if (config && config.type === 'firebase' && config.firebaseConfig) {
      await this.connectFirebase(config.firebaseConfig);
    } else if (config && config.type === 'gas' && config.gasUrl) {
      await this.connectGoogleAppsScript(config.gasUrl);
    } else {
      this.setStatus('disconnected');
    }
  }

  getSavedConfig() {
    try {
      const raw = localStorage.getItem('recomp_cloud_config_v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  saveConfig(config) {
    try {
      localStorage.setItem('recomp_cloud_config_v1', JSON.stringify(config));
    } catch (e) {}
  }

  clearConfig() {
    try {
      localStorage.removeItem('recomp_cloud_config_v1');
      if (this.unsubscribeFirestore) {
        this.unsubscribeFirestore();
        this.unsubscribeFirestore = null;
      }
      this.setStatus('disconnected');
    } catch (e) {}
  }

  /**
   * Connessione a Google Firebase Firestore (Free Tier).
   */
  async connectFirebase(firebaseConfig) {
    try {
      this.setStatus('syncing');

      // Import dinamico SDK Firebase da CDN ES Modules
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { 
        getFirestore, 
        doc, 
        setDoc, 
        getDoc,
        onSnapshot, 
        enableIndexedDbPersistence 
      } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      // Riutilizza app o inizializzane una con nome stabile
      const appName = 'GymMesocycleSyncApp';
      const apps = getApps();
      const existing = apps.find(a => a.name === appName);
      this.firebaseApp = existing || initializeApp(firebaseConfig, appName);
      this.firestore = getFirestore(this.firebaseApp);

      // Persistenza offline opzionale
      try {
        await enableIndexedDbPersistence(this.firestore);
      } catch (err) {}

      // Documento condiviso in Firestore
      const docRef = doc(this.firestore, 'mesocycles', 'shared_workspace');

      if (this.unsubscribeFirestore) {
        this.unsubscribeFirestore();
        this.unsubscribeFirestore = null;
      }

      // Ascolto in tempo reale (Real-time listener)
      this.unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData && Array.isArray(cloudData.users)) {
            if (!this.isSyncing) {
              const currentId = state.state.currentUserId;
              state.state.users = cloudData.users;
              if (currentId && !cloudData.users.some(u => u.id === currentId)) {
                state.state.currentUserId = null;
              }
              try {
                localStorage.setItem('workout_tracker_app_v2', JSON.stringify({
                  users: state.state.users,
                  currentUserId: state.state.currentUserId,
                  lastUpdated: new Date().toISOString()
                }));
              } catch (err) {}
              state.notify();
            }
          }
        } else {
          // Documento cloud vuoto: se abbiamo utenti in locale, pushiamoli subito
          if (state.state.users && state.state.users.length > 0) {
            this.pushStateToFirestore();
          }
        }
        this.setStatus('connected');
      }, (error) => {
        console.error('Errore Firestore Snapshot:', error);
        if (error.code === 'permission-denied' || (error.message && error.message.includes('permission'))) {
          this.setStatus('permission_denied', error.message);
        } else {
          this.setStatus('offline', error.message);
        }
      });

      this.saveConfig({ type: 'firebase', firebaseConfig });
      return { success: true };
    } catch (e) {
      console.error('Errore connessione Firebase:', e);
      if (e.code === 'permission-denied' || (e.message && e.message.includes('permission'))) {
        this.setStatus('permission_denied', e.message);
      } else {
        this.setStatus('offline', e.message);
      }
      return { success: false, error: e.message };
    }
  }

  /**
   * Invia lo stato locale al Cloud Firestore (con debounce di 600ms).
   */
  pushStateToCloud() {
    const config = this.getSavedConfig();
    if (!config) return;

    if (config.type === 'firebase' && this.firestore) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.pushStateToFirestore();
      }, 600);
    } else if (config.type === 'gas' && config.gasUrl) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.pushStateToGoogleAppsScript(config.gasUrl);
      }, 1000);
    }
  }

  async pushStateToFirestore() {
    if (!this.firestore) return { success: false, error: 'Database non inizializzato' };
    try {
      this.isSyncing = true;
      this.setStatus('syncing');
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const docRef = doc(this.firestore, 'mesocycles', 'shared_workspace');
      await setDoc(docRef, {
        users: state.state.users,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      this.setStatus('connected');
      return { success: true };
    } catch (e) {
      console.warn('Sync cloud in background fallito:', e);
      if (e.code === 'permission-denied' || (e.message && e.message.includes('permission'))) {
        this.setStatus('permission_denied', e.message);
      } else {
        this.setStatus('offline', e.message);
      }
      return { success: false, error: e.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async pullStateFromFirestore() {
    if (!this.firestore) return { success: false, error: 'Database non inizializzato' };
    try {
      this.setStatus('syncing');
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const docRef = doc(this.firestore, 'mesocycles', 'shared_workspace');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.users)) {
          state.state.users = data.users;
          if (!state.state.currentUserId && data.users.length > 0) {
            state.state.currentUserId = data.users[0].id;
          }
          state.save();
          this.setStatus('connected');
          return { success: true, count: data.users.length };
        }
      }
      this.setStatus('connected');
      return { success: true, count: 0 };
    } catch (e) {
      console.warn('Pull cloud fallito:', e);
      if (e.code === 'permission-denied' || (e.message && e.message.includes('permission'))) {
        this.setStatus('permission_denied', e.message);
      } else {
        this.setStatus('offline', e.message);
      }
      return { success: false, error: e.message };
    }
  }

  /**
   * Connessione a Google Apps Script
   */
  async connectGoogleAppsScript(gasUrl) {
    try {
      this.setStatus('syncing');
      const res = await fetch(gasUrl + '?action=get');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          state.state.users = data.users;
          state.save();
        }
        this.saveConfig({ type: 'gas', gasUrl });
        this.setStatus('connected');
        return { success: true };
      }
      throw new Error('Risposta server non valida');
    } catch (e) {
      this.setStatus('offline', e.message);
      return { success: false, error: e.message };
    }
  }

  async pushStateToGoogleAppsScript(gasUrl) {
    try {
      this.isSyncing = true;
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: state.state.users,
          updatedAt: new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('Sync GAS:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Mostra il modale diagnostico interattivo quando si clicca sul badge Cloud o da Impostazioni.
   */
  showDiagnosticModal() {
    let modal = document.getElementById('cloud-diagnostic-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cloud-diagnostic-modal';
      modal.className = 'fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4';
      document.body.appendChild(modal);
    }

    const projectId = DEFAULT_FIREBASE_CONFIG.projectId || 'gym-mesocycle';
    const isPermissionError = this.syncStatus === 'permission_denied';
    const isConnected = this.syncStatus === 'connected';

    modal.innerHTML = `
      <div class="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">${isConnected ? '🟢' : (isPermissionError ? '⚠️' : '⚡')}</span>
            <div>
              <h3 class="text-base font-heading font-bold text-zinc-100">Stato Sincronizzazione Cloud</h3>
              <p class="text-xs text-zinc-400">Progetto: <strong class="text-emerald-400">${projectId}</strong></p>
            </div>
          </div>
          <button id="close-cloud-diag-btn" class="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        ${isConnected ? `
          <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 space-y-2">
            <div class="font-bold flex items-center gap-2 text-emerald-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>Connessione Cloud Perfetta & Operativa!</span>
            </div>
            <p class="text-zinc-300 text-xs leading-relaxed">
              Tutti i profili, le sessioni e gli esercizi fondamentali sono sincronizzati in tempo reale tra tutti i tuoi dispositivi senza richiedere backup manuali.
            </p>
          </div>
        ` : `
          <div class="p-4 rounded-xl ${isPermissionError ? 'bg-amber-950/30 border border-amber-500/40 text-amber-200' : 'bg-zinc-800/80 border border-zinc-700 text-zinc-300'} text-xs space-y-2.5">
            <div class="font-bold flex items-center gap-2 ${isPermissionError ? 'text-amber-400' : 'text-zinc-200'}">
              <span>${isPermissionError ? '⚠️ Firestore richiede le Regole di Sicurezza' : 'ℹ️ Connessione in corso o non stabilita'}</span>
            </div>
            <p class="leading-relaxed text-zinc-300">
              Firebase Firestore viene creato di default in modalità protetta, bloccando lettura e scrittura con errore <em>PERMISSION_DENIED</em>.
              Per abilitare la sincronizzazione automatica tra tutti i dispositivi senza login e password:
            </p>

            <div class="space-y-2 pt-1 text-zinc-200">
              <div class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <div>
                  Apri la scheda <strong>Regole (Rules)</strong> del database:
                  <a href="https://console.firebase.google.com/project/${projectId}/firestore/rules" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold underline mt-1">
                    <span>Apri Regole Firebase Console (${projectId})</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <div class="w-full">
                  <span>Sostituisci il testo con queste regole:</span>
                  <div class="relative mt-1">
                    <pre class="bg-zinc-950 p-2.5 rounded-lg border border-zinc-700 text-[11px] font-mono text-emerald-400 overflow-x-auto selection:bg-emerald-500 selection:text-zinc-950">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}</pre>
                    <button id="copy-rules-code-btn" class="absolute top-2 right-2 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 rounded border border-zinc-600 transition-colors">
                      Copia Codice
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <div>Clicca sul pulsante azzurro <strong>Publish (Pubblica)</strong> in alto a destra su Firebase.</div>
              </div>
            </div>
          </div>
        `}

        <div class="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button id="retry-cloud-connect-btn" class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Testa & Sincronizza Ora</span>
            </button>
            <button id="force-push-cloud-btn" class="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              <span>Invia Dati Locali al Cloud</span>
            </button>
          </div>
          <button id="force-pull-cloud-btn" class="py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Scarica Dati dal Cloud su Questo Dispositivo</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    // Listener chiusura
    const closeBtn = modal.querySelector('#close-cloud-diag-btn');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    // Copia regole
    const copyBtn = modal.querySelector('#copy-rules-code-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
        navigator.clipboard.writeText(rulesText).then(() => {
          copyBtn.textContent = 'Copiato! ✓';
          setTimeout(() => { copyBtn.textContent = 'Copia Codice'; }, 2000);
        });
      };
    }

    // Riprova connessione
    const retryBtn = modal.querySelector('#retry-cloud-connect-btn');
    if (retryBtn) {
      retryBtn.onclick = async () => {
        retryBtn.innerHTML = `<span>Verifica in corso...</span>`;
        const res = await this.connectFirebase(DEFAULT_FIREBASE_CONFIG);
        if (res.success) {
          await this.pullStateFromFirestore();
        }
        this.showDiagnosticModal(); // rinfresca modale con il nuovo stato
      };
    }

    // Forza invio
    const pushBtn = modal.querySelector('#force-push-cloud-btn');
    if (pushBtn) {
      pushBtn.onclick = async () => {
        pushBtn.innerHTML = `<span>Invio in corso...</span>`;
        const res = await this.pushStateToFirestore();
        if (res.success) {
          alert('✅ Dati inviati con successo al Cloud Firebase!');
        } else {
          alert('❌ Errore durante l\'invio: ' + (res.error || 'Verifica le regole di sicurezza Firestore.'));
        }
        this.showDiagnosticModal();
      };
    }

    // Forza download
    const pullBtn = modal.querySelector('#force-pull-cloud-btn');
    if (pullBtn) {
      pullBtn.onclick = async () => {
        pullBtn.innerHTML = `<span>Download in corso...</span>`;
        const res = await this.pullStateFromFirestore();
        if (res.success) {
          alert(`✅ Dati scaricati dal Cloud! (${res.count || 0} profili atleti aggiornati)`);
        } else {
          alert('❌ Errore durante lo scaricamento: ' + (res.error || 'Verifica le regole di sicurezza Firestore.'));
        }
        this.showDiagnosticModal();
      };
    }
  }
}

export const cloudSync = new CloudSync();
