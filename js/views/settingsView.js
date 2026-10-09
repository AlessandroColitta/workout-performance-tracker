import { state } from '../state.js';
import { MUSCLE_GROUPS } from '../constants.js';
import { SyncManager } from '../sync.js';
import { cloudSync } from '../cloudSync.js';

/**
 * Vista Impostazioni & Gestione Dati:
 * - Profilo atleta attivo e cambio/uscita
 * - Gestione rapida esercizi fondamentali
 * - Sincronizzazione Cloud automatica (Firebase / Google Drive)
 * - Backup e ripristino manuale
 */
export class SettingsView {
  static render() {
    const container = document.getElementById('settings-view');
    if (!container) return;

    const user = state.getCurrentUser();
    const allUsers = state.state.users || [];
    const cloudConfig = cloudSync.getSavedConfig();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Scheda Profilo Atleta Attivo -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-zinc-950 text-xl shadow-lg shadow-emerald-500/20">
                ${user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '?'}
              </div>
              <div>
                <h3 class="text-lg font-bold text-zinc-100">${user ? user.fullName : 'Nessun atleta'}</h3>
                <p class="text-xs text-zinc-400">
                  ${user ? `${(user.sessions || []).length} sessioni registrate • ${(user.fundamentalExercises || []).length} fondamentali` : ''}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <button id="settings-logout-btn" class="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span>Cambia / Esci dal Profilo</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Scheda Sincronizzazione Cloud Multi-Dispositivo -->
        <div class="bg-gradient-to-br from-zinc-900 to-zinc-950 border ${cloudConfig ? 'border-emerald-500/40 shadow-emerald-950/20' : 'border-zinc-800'} rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl ${cloudConfig ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <span>Sincronizzazione Cloud Real-Time</span>
                  ${cloudConfig ? `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ATTIVA</span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400">DISATTIVA</span>
                  `}
                </h3>
                <p class="text-xs text-zinc-400">Salva e sincronizza automaticamente i dati su tutti i tuoi dispositivi senza dover fare backup manuali.</p>
              </div>
            </div>

            ${cloudConfig ? `
              <button id="disconnect-cloud-btn" class="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 text-xs font-semibold border border-zinc-700 transition-all self-start sm:self-auto cursor-pointer">
                Disconnetti Cloud
              </button>
            ` : ''}
          </div>

          ${cloudConfig ? `
            <div class="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 space-y-2">
              <div class="font-bold flex items-center justify-between gap-1.5 flex-wrap">
                <div class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  <span>Connessione Cloud: ${cloudConfig.type === 'firebase' ? 'Google Firebase Firestore (gym-mesocycle)' : 'Google Drive / Apps Script'}</span>
                </div>
                <button id="open-cloud-diag-btn" class="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/40 transition-all cursor-pointer">
                  🔍 Diagnostica & Regole
                </button>
              </div>
              <p class="text-zinc-400 text-[11px]">Ogni allenamento, esercizio e fondamentale aggiunto viene sincronizzato online istantaneamente su qualsiasi smartphone o PC.</p>
            </div>
          ` : `
            <div class="space-y-3 pt-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Google Firebase Firestore</span>
                    <span class="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">100% Gratis</span>
                  </div>
                  <p class="text-xs text-zinc-300 leading-relaxed">
                    Database in tempo reale gratuito. Incolla il testo del tuo <code class="text-emerald-400">firebaseConfig</code> per collegarlo all'istante.
                  </p>
                  <button id="open-firebase-setup-btn" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    <span>Configura Google Firebase</span>
                  </button>
                </div>

                <div class="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/80 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-teal-400 uppercase tracking-wider">Google Drive / Apps Script</span>
                    <span class="text-[10px] font-extrabold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">Incluso Google</span>
                  </div>
                  <p class="text-xs text-zinc-300 leading-relaxed">
                    Salva automaticamente su Google Drive o Google Fogli usando uno script web associato al tuo account Google.
                  </p>
                  <button id="open-gas-setup-btn" class="w-full py-2.5 px-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-zinc-600 cursor-pointer">
                    <svg class="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                    <span>Configura Google Drive Script</span>
                  </button>
                </div>
              </div>
            </div>
          `}
        </div>

        <!-- Scheda Scarica & Installa App PWA -->
        <div class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shadow-md shadow-emerald-500/10">
                ⚡
              </div>
              <div>
                <h3 class="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <span>Scarica & Installa App</span>
                  ${isStandalone ? `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">APP GIÀ INSTALLATA</span>
                  ` : `
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-emerald-400 border border-zinc-700">INSTALLABILE</span>
                  `}
                </h3>
                <p class="text-xs text-zinc-400">Installa Workout Tracker sulla schermata iniziale del tuo telefono o PC</p>
              </div>
            </div>

            <button id="open-install-guide-btn" class="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-zinc-700 self-start sm:self-auto cursor-pointer">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Guida Installazione</span>
            </button>
          </div>

          <div class="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-3">
            <p class="text-xs text-zinc-300 leading-relaxed">
              ${isStandalone 
                ? 'Stai già utilizzando Workout Tracker come applicazione installata su questo dispositivo. Si aggiorna automaticamente e funziona a schermo intero!'
                : 'Puoi installare Workout Tracker sulla schermata Home del tuo smartphone (Android o iPhone) o computer. Funziona a schermo intero senza barra degli indirizzi, offline e con la velocità di una vera app nativa.'}
            </p>

            ${!isStandalone ? `
              <div class="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button id="install-app-btn" class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  <span>Installa Workout Tracker sul Telefono</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Backup Manuale & Esportazione JSON -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h4 class="text-base font-bold text-zinc-100">Backup & Esportazione</h4>
            <p class="text-xs text-zinc-400 mt-0.5">Scarica una copia dei tuoi dati sul computer o ripristina un salvataggio precedente.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button id="export-json-btn" class="p-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-left transition-all space-y-1 group cursor-pointer">
              <div class="text-xs font-bold text-zinc-200">💾 Scarica Backup JSON</div>
              <div class="text-[11px] text-zinc-500">Salva file sul tuo computer</div>
            </button>

            <label class="p-3.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-left transition-all space-y-1 group cursor-pointer block">
              <input type="file" id="import-json-input" accept=".json" class="hidden">
              <div class="text-xs font-bold text-zinc-200">📂 Ripristina da Backup</div>
              <div class="text-[11px] text-zinc-500">Carica file JSON</div>
            </label>
          </div>
        </div>

        <!-- Modal Guida Installazione PWA -->
        <div id="pwa-install-guide-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg">⚡</div>
                <div>
                  <h3 class="text-base font-bold text-zinc-100">Installa Workout Tracker</h3>
                  <p class="text-xs text-zinc-400">Guida per salvare l'app sulla Home</p>
                </div>
              </div>
              <button id="close-install-modal-btn" class="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Tab Switcher -->
            <div class="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400">
              <button type="button" class="pwa-tab-btn py-2 rounded-lg transition-all" data-target="ios-tab">🍏 iPhone</button>
              <button type="button" class="pwa-tab-btn py-2 rounded-lg transition-all" data-target="android-tab">🤖 Android</button>
              <button type="button" class="pwa-tab-btn py-2 rounded-lg transition-all" data-target="desktop-tab">💻 PC / Mac</button>
            </div>

            <!-- Tab iOS -->
            <div id="ios-tab" class="pwa-tab-content space-y-3 text-xs text-zinc-300">
              <p class="text-zinc-400">Su iOS (Safari) Apple non supporta il popup automatico, ma puoi installarla in 3 semplici passaggi:</p>
              <ol class="space-y-2.5 pl-1">
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                  <span>Apri la pagina in <strong>Safari</strong> e tocca il tasto <strong>Condividi</strong> in basso (icona quadrato con freccia in su <span class="text-sm">⎋</span>).</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                  <span>Scorri verso il basso e tocca <strong>"Aggiungi alla schermata Home"</strong> (icona <strong>➕</strong>).</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                  <span>Tocca <strong>"Aggiungi"</strong> in alto a destra. L'app ⚡ <strong>Workout</strong> apparirà subito sulla tua Home!</span>
                </li>
              </ol>
            </div>

            <!-- Tab Android -->
            <div id="android-tab" class="pwa-tab-content space-y-3 text-xs text-zinc-300 hidden">
              <p class="text-zinc-400">Se hai chiuso l'avviso iniziale o non compare:</p>
              <ol class="space-y-2.5 pl-1">
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                  <span>Tocca i <strong>3 puntini verticali ⋮</strong> in alto a destra in Google Chrome o Edge.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                  <span>Seleziona <strong>"Installa app"</strong> oppure <strong>"Aggiungi a schermata Home"</strong>.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                  <span>Conferma cliccando <strong>"Installa"</strong>.</span>
                </li>
              </ol>
            </div>

            <!-- Tab Desktop -->
            <div id="desktop-tab" class="pwa-tab-content space-y-3 text-xs text-zinc-300 hidden">
              <p class="text-zinc-400">Su Chrome, Edge o Brave da computer:</p>
              <ol class="space-y-2.5 pl-1">
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                  <span>Guarda la barra degli indirizzi URL in alto a destra.</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                  <span>Clicca sull'icona <strong>Installa</strong> (icona schermo con freccia ⬇️).</span>
                </li>
                <li class="flex items-start gap-2.5">
                  <span class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                  <span>Conferma <strong>Installa</strong> per aprirla come finestra applicazione separata.</span>
                </li>
              </ol>
            </div>

            <div class="pt-2">
              <button id="cancel-install-modal-btn" class="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer">
                Ho Capito
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  }

  static attachEventListeners(container) {
    // Logout / Torna a selezione profilo
    const logoutBtn = container.querySelector('#settings-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        state.logoutUser();
      });
    }

    // Disconnetti cloud
    const disconnectBtn = container.querySelector('#disconnect-cloud-btn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        if (confirm('Vuoi disconnettere la sincronizzazione cloud? I dati rimarranno comunque salvati su questo dispositivo locale.')) {
          cloudSync.clearConfig();
          this.render();
        }
      });
    }

    // Diagnostica Cloud
    const diagBtn = container.querySelector('#open-cloud-diag-btn');
    if (diagBtn) {
      diagBtn.addEventListener('click', () => {
        cloudSync.showDiagnosticModal();
      });
    }

    // Configurazione Firebase
    const openFirebaseBtn = container.querySelector('#open-firebase-setup-btn');
    if (openFirebaseBtn) {
      openFirebaseBtn.addEventListener('click', () => {
        const configStr = prompt(
          'Incolla il testo del tuo oggetto "firebaseConfig" (da console.firebase.google.com):\n\nEsempio:\n{\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "..."\n}'
        );
        if (configStr) {
          try {
            let clean = configStr.trim();
            if (clean.startsWith('const firebaseConfig =')) {
              clean = clean.replace('const firebaseConfig =', '').replace(/;$/, '').trim();
            }
            const parsed = new Function('return ' + clean)();
            if (parsed && parsed.projectId) {
              cloudSync.connectFirebase(parsed).then(res => {
                if (res.success) {
                  alert('🎉 Connessione Cloud Firebase stabilita con successo!');
                  this.render();
                } else {
                  alert('Errore connessione: ' + res.error);
                }
              });
            } else {
              alert('Configurazione non valida: projectId mancante.');
            }
          } catch (e) {
            alert('Errore nel formato della configurazione: ' + e.message);
          }
        }
      });
    }

    // Configurazione Google Apps Script
    const openGasBtn = container.querySelector('#open-gas-setup-btn');
    if (openGasBtn) {
      openGasBtn.addEventListener('click', () => {
        const url = prompt('Inserisci l\'URL della tua Web App Google Apps Script:');
        if (url && url.startsWith('http')) {
          cloudSync.connectGoogleAppsScript(url).then(res => {
            if (res.success) {
              alert('Connessione stabilita con successo!');
              this.render();
            } else {
              alert('Errore: ' + res.error);
            }
          });
        }
      });
    }

    // Esporta JSON
    const exportJsonBtn = container.querySelector('#export-json-btn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        SyncManager.exportJSON();
      });
    }

    // Importa JSON
    const importInput = container.querySelector('#import-json-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          SyncManager.importJSONFile(file, (res) => {
            if (res.success) {
              alert(`Database ripristinato con successo! (${res.count} atleti caricati)`);
            } else {
              alert('Errore: ' + res.error);
            }
          });
        }
      });
    }

    // Modal & Installazione PWA
    const modal = container.querySelector('#pwa-install-guide-modal');
    const openGuideBtn = container.querySelector('#open-install-guide-btn');
    const closeGuideBtn = container.querySelector('#close-install-modal-btn');
    const cancelGuideBtn = container.querySelector('#cancel-install-modal-btn');
    const installAppBtn = container.querySelector('#install-app-btn');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);

    const selectTab = (tabId) => {
      if (!modal) return;
      modal.querySelectorAll('.pwa-tab-content').forEach(c => c.classList.add('hidden'));
      modal.querySelectorAll('.pwa-tab-btn').forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-zinc-950', 'shadow-md');
        b.classList.add('text-zinc-400');
      });
      const activeContent = modal.querySelector(`#${tabId}`);
      if (activeContent) activeContent.classList.remove('hidden');
      const activeBtn = modal.querySelector(`[data-target="${tabId}"]`);
      if (activeBtn) {
        activeBtn.classList.add('bg-emerald-500', 'text-zinc-950', 'shadow-md');
        activeBtn.classList.remove('text-zinc-400');
      }
    };

    const showModal = () => {
      if (!modal) return;
      modal.classList.remove('hidden');
      if (isIOS) {
        selectTab('ios-tab');
      } else if (isAndroid) {
        selectTab('android-tab');
      } else {
        selectTab('desktop-tab');
      }
    };

    const hideModal = () => {
      if (modal) modal.classList.add('hidden');
    };

    if (openGuideBtn) {
      openGuideBtn.addEventListener('click', showModal);
    }
    if (closeGuideBtn) {
      closeGuideBtn.addEventListener('click', hideModal);
    }
    if (cancelGuideBtn) {
      cancelGuideBtn.addEventListener('click', hideModal);
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
      });
      modal.querySelectorAll('.pwa-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectTab(btn.dataset.target);
        });
      });
    }

    if (installAppBtn) {
      installAppBtn.addEventListener('click', async () => {
        if (window.deferredPwaPrompt) {
          try {
            window.deferredPwaPrompt.prompt();
            const choiceResult = await window.deferredPwaPrompt.userChoice;
            if (choiceResult && choiceResult.outcome === 'accepted') {
              console.log('PWA installation accepted');
            }
            window.deferredPwaPrompt = null;
          } catch (err) {
            console.warn('Errore prompt installazione:', err);
            showModal();
          }
        } else {
          // Nessun evento nativo salvato (iOS o prompt già mostrato/ignorato)
          showModal();
        }
      });
    }
  }
}
