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
  }
}
