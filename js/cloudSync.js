import { state } from './state.js';

/**
 * Gestore Sincronizzazione Cloud Real-Time Automatica
 * Supporta Google Firebase Firestore (100% gratuito) e Google Apps Script / Google Drive.
 */
export class CloudSync {
  constructor() {
    this.firebaseApp = null;
    this.firestore = null;
    this.unsubscribeFirestore = null;
    this.isSyncing = false;
    this.syncStatus = 'disconnected'; // 'connected' | 'syncing' | 'offline' | 'disconnected'
    this.statusListeners = [];
    this.debounceTimer = null;
  }

  onStatusChange(listener) {
    this.statusListeners.push(listener);
    listener(this.syncStatus);
  }

  setStatus(status) {
    this.syncStatus = status;
    this.statusListeners.forEach(l => {
      try { l(status); } catch (e) {}
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
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer';
      badge.title = 'Sincronizzazione automatica attiva su tutti i dispositivi';
    } else if (this.syncStatus === 'syncing') {
      badge.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
        <span class="text-teal-300 font-semibold">Sincronizzazione...</span>
      `;
      badge.className = 'px-2.5 py-1 rounded-lg text-[11px] bg-teal-500/10 border border-teal-500/30 flex items-center gap-1.5 cursor-pointer';
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
   * Inizializza la sincronizzazione se una configurazione è salvata.
   */
  async init() {
    const config = this.getSavedConfig();
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
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { 
        getFirestore, 
        doc, 
        setDoc, 
        onSnapshot, 
        enableIndexedDbPersistence 
      } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      // Inizializza o riusa istanza app
      this.firebaseApp = initializeApp(firebaseConfig, 'MesocycleTrackerApp_' + Date.now());
      this.firestore = getFirestore(this.firebaseApp);

      // Abilita persistenza offline nativa Firebase se possibile
      try {
        await enableIndexedDbPersistence(this.firestore);
      } catch (err) {}

      // Documento condiviso nel database Firestore (es. collezione 'mesocycles', doc 'shared_data')
      const docRef = doc(this.firestore, 'mesocycles', 'shared_workspace');

      // Ascolto in tempo reale (Real-time listener): ogni modifica da qualsiasi telefono aggiorna la pagina
      if (this.unsubscribeFirestore) this.unsubscribeFirestore();
      
      this.unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData && Array.isArray(cloudData.users)) {
            // Se non stiamo salvando in questo istante, aggiorna lo stato locale
            if (!this.isSyncing) {
              const currentId = state.state.currentUserId;
              state.state.users = cloudData.users;
              // Mantieni l'utente selezionato se esiste ancora
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
              this.setStatus('connected');
            }
          }
        } else {
          // Documento non ancora esistente nel cloud, carichiamo lo stato locale iniziale
          this.pushStateToFirestore();
        }
        this.setStatus('connected');
      }, (error) => {
        console.error('Errore Firestore:', error);
        this.setStatus('offline');
      });

      this.saveConfig({ type: 'firebase', firebaseConfig });
      return { success: true };
    } catch (e) {
      console.error('Errore connessione Firebase:', e);
      this.setStatus('offline');
      return { success: false, error: e.message };
    }
  }

  /**
   * Invia lo stato locale al Cloud Firestore (con debounce di 800ms per evitare scritture multiple durante la digitazione).
   */
  pushStateToCloud() {
    const config = this.getSavedConfig();
    if (!config) return;

    if (config.type === 'firebase' && this.firestore) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.pushStateToFirestore();
      }, 800);
    } else if (config.type === 'gas' && config.gasUrl) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.pushStateToGoogleAppsScript(config.gasUrl);
      }, 1000);
    }
  }

  async pushStateToFirestore() {
    if (!this.firestore) return;
    try {
      this.isSyncing = true;
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const docRef = doc(this.firestore, 'mesocycles', 'shared_workspace');
      await setDoc(docRef, {
        users: state.state.users,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Sync cloud in background:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Connessione a Google Apps Script (salvataggio automatico su Google Drive / Google Fogli).
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
      this.setStatus('offline');
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
}

export const cloudSync = new CloudSync();
