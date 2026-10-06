import { state } from '../state.js';
import { MUSCLE_GROUPS, INTENSITY_TECHNIQUES_SUGGESTIONS } from '../constants.js';
import { timer } from '../timer.js';

/**
 * Schermata 1:
 * Volume totale per gruppo muscolare della sessione di allenamento, tenendo conto di tutti gli esercizi.
 * Campi per ciascun esercizio:
 * - Nome
 * - Gruppo muscolare (8 gruppi)
 * - Peso per ripetizione (kg)
 * - Numero di ripetizioni per serie
 * - Numero di serie
 * - Tecniche di intensità (Sì/No; quale facoltativo)
 */
export class VolumeView {
  static render() {
    const container = document.getElementById('volume-view');
    if (!container) return;

    const user = state.getCurrentUser();
    if (!user) {
      container.innerHTML = `<div class="text-center py-12 text-zinc-400">Nessun atleta selezionato.</div>`;
      return;
    }

    // Se l'utente non ha alcuna sessione, creiamone una automaticamente per la data odierna
    if (!user.sessions || user.sessions.length === 0) {
      state.createSession();
      return; // notify re-renderà
    }

    const currentSession = state.getCurrentSession() || user.sessions[0];
    const sessionVolumes = state.getSessionMuscleVolumes(currentSession);

    // Calcolo totali generali sessione
    let grandTotalTonnage = 0;
    let grandTotalSets = 0;
    let grandTotalReps = 0;
    Object.values(sessionVolumes).forEach(v => {
      grandTotalTonnage += v.totalTonnage;
      grandTotalSets += v.totalSets;
      grandTotalReps += v.totalReps;
    });

    // Costruisci le cards per gli 8 Gruppi Muscolari
    const muscleCardsHTML = MUSCLE_GROUPS.map(mg => {
      const data = sessionVolumes[mg.name] || { totalTonnage: 0, totalSets: 0, totalReps: 0, exerciseCount: 0, exercises: [] };
      const hasWork = data.totalSets > 0;
      const pct = grandTotalTonnage > 0 ? Math.round((data.totalTonnage / grandTotalTonnage) * 100) : 0;

      return `
        <div class="rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${hasWork ? 'bg-zinc-900 border-zinc-700/90 shadow-lg shadow-zinc-950/40' : 'bg-zinc-900/40 border-zinc-800/60 opacity-60 hover:opacity-100'}">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xl">${mg.icon}</span>
                <span class="font-heading font-bold text-sm text-zinc-100 truncate">${mg.name}</span>
              </div>
              ${hasWork ? `
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ${pct}% vol
                </span>
              ` : `
                <span class="text-[10px] text-zinc-600 font-semibold">Inattivo</span>
              `}
            </div>

            <div class="grid grid-cols-2 gap-2 my-3">
              <div class="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                <div class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Serie Totali</div>
                <div class="text-xl font-heading font-black ${hasWork ? 'text-emerald-400' : 'text-zinc-500'}">
                  ${data.totalSets}
                </div>
              </div>
              <div class="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                <div class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Tonnellaggio</div>
                <div class="text-base sm:text-lg font-heading font-black ${hasWork ? 'text-zinc-100' : 'text-zinc-500'}">
                  ${data.totalTonnage.toLocaleString('it-IT')} <span class="text-[10px] font-normal text-zinc-400">kg</span>
                </div>
              </div>
            </div>

            <!-- Mini progress bar -->
            <div class="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-2">
              <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%;"></div>
            </div>
          </div>

          <!-- Dettaglio Esercizi nel gruppo -->
          <div class="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            ${data.exercises.length > 0 ? `
              <div class="font-medium text-zinc-300 truncate">
                ${data.exercises.map(e => e.name).join(', ')}
              </div>
            ` : `
              <div class="text-zinc-600 italic">Nessun esercizio registrato</div>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Lista esercizi della sessione
    const exercisesListHTML = (currentSession.exercises || []).map((ex, index) => {
      const exTonnage = (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);
      const isFund = state.isFundamental(ex.name);

      return `
        <div class="exercise-item-row bg-zinc-900 border ${ex.isFundamental ? 'border-amber-500/40 bg-zinc-900/90' : 'border-zinc-800'} rounded-2xl p-4 sm:p-5 space-y-3 transition-all" data-exid="${ex.id}">
          <!-- Intestazione Esercizio -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/80">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span class="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 text-xs font-bold flex items-center justify-center">${index + 1}</span>
              <h4 class="text-base font-bold text-zinc-100">${ex.name}</h4>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-emerald-400 border border-zinc-700">
                ${ex.muscleGroup}
              </span>
              ${ex.isFundamental ? `
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  ⭐ Fondamentale
                </span>
              ` : ''}
              ${ex.intensityTechniqueUsed ? `
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  ⚡ ${ex.intensityTechniqueName || 'Tecnica Intensità'}
                </span>
              ` : ''}
            </div>

            <!-- Pulsanti di azione -->
            <div class="flex items-center gap-2 self-end sm:self-center">
              <button class="toggle-fund-star-btn p-1.5 rounded-lg text-xs font-bold transition-colors ${ex.isFundamental ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-amber-400'}" data-exname="${ex.name}" data-group="${ex.muscleGroup}" title="${ex.isFundamental ? 'Rimuovi dai fondamentali' : 'Aggiungi agli esercizi fondamentali'}">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              </button>
              <button class="quick-timer-btn p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors" data-name="${ex.name}" title="Avvia timer recupero (90s)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
              <button class="delete-ex-btn p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors" data-exid="${ex.id}" data-name="${ex.name}" title="Elimina esercizio">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Input Dati Modificabili Direttamente -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="bg-zinc-800/40 rounded-xl p-2.5 border border-zinc-800">
              <label class="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Carico per rip (kg)</label>
              <div class="flex items-center gap-1">
                <input type="number" step="0.5" min="0" value="${ex.weight}" class="edit-ex-input w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500 rounded-lg py-1 px-2 text-sm font-bold text-zinc-100 text-center" data-exid="${ex.id}" data-field="weight">
                <span class="text-xs text-zinc-400">kg</span>
              </div>
            </div>

            <div class="bg-zinc-800/40 rounded-xl p-2.5 border border-zinc-800">
              <label class="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Ripetizioni per serie</label>
              <input type="number" min="1" max="99" value="${ex.reps}" class="edit-ex-input w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500 rounded-lg py-1 px-2 text-sm font-bold text-zinc-100 text-center" data-exid="${ex.id}" data-field="reps">
            </div>

            <div class="bg-zinc-800/40 rounded-xl p-2.5 border border-zinc-800">
              <label class="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Numero di serie</label>
              <input type="number" min="1" max="20" value="${ex.sets}" class="edit-ex-input w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500 rounded-lg py-1 px-2 text-sm font-bold text-zinc-100 text-center" data-exid="${ex.id}" data-field="sets">
            </div>

            <div class="bg-emerald-950/20 rounded-xl p-2.5 border border-emerald-500/20 text-center flex flex-col justify-center">
              <div class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Volume Esercizio</div>
              <div class="text-base font-black text-emerald-300">
                ${exTonnage.toLocaleString('it-IT')} <span class="text-xs font-normal text-zinc-400">kg</span>
              </div>
            </div>
          </div>

          <!-- Barra Tecnica di Intensità -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div class="flex items-center gap-2">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" ${ex.intensityTechniqueUsed ? 'checked' : ''} class="toggle-tech-checkbox rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500" data-exid="${ex.id}">
                <span class="text-xs font-semibold text-zinc-300">Tecnica di intensità applicata</span>
              </label>
            </div>

            ${ex.intensityTechniqueUsed ? `
              <div class="flex items-center gap-1.5 w-full sm:w-auto">
                <span class="text-[11px] text-zinc-400">Specifica tecnica:</span>
                <input type="text" placeholder="Es. Rest-Pause, Drop set..." value="${ex.intensityTechniqueName || ''}" class="edit-ex-input bg-zinc-800 border border-zinc-700 rounded-lg py-1 px-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none w-full sm:w-48" data-exid="${ex.id}" data-field="intensityTechniqueName">
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Barra di Controllo Sessione -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </span>
                <div>
                  <h3 class="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <span>${currentSession.title}</span>
                  </h3>
                  <p class="text-xs text-zinc-400">Sessione di allenamento di <strong>${user.fullName}</strong></p>
                </div>
              </div>
            </div>

            <!-- Pulsanti Nuova Sessione e Duplica -->
            <div class="flex flex-wrap items-center gap-2">
              <button id="create-new-session-btn" class="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Nuovo Allenamento</span>
              </button>
              <button id="duplicate-session-btn" class="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer" title="Copia gli esercizi dell'ultimo allenamento per iniziare subito">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <span>Duplica Ultimo</span>
              </button>
            </div>
          </div>

          <!-- Dettagli Sessione: Data e Selettore Storico Sessioni -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
            <div class="flex items-center gap-3">
              <!-- Selettore Data Sessione -->
              <div class="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-1.5">
                <label for="session-date-picker" class="text-xs text-zinc-400 font-semibold flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span>Data:</span>
                </label>
                <input type="date" id="session-date-picker" value="${currentSession.date}" class="bg-transparent text-xs font-bold text-zinc-100 focus:outline-none cursor-pointer">
              </div>

              <!-- Titolo Sessione Modificabile -->
              <input type="text" id="session-title-input" value="${currentSession.title}" placeholder="Titolo sessione..." class="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-200 focus:outline-none focus:border-emerald-500 max-w-[180px]">
            </div>

            <!-- Selettore Sessioni Precedenti -->
            ${user.sessions.length > 1 ? `
              <div class="flex items-center gap-2">
                <span class="text-xs text-zinc-500 font-semibold">Storico:</span>
                <select id="switch-session-select" class="bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 rounded-xl py-1.5 px-3 focus:outline-none">
                  ${user.sessions.map(s => `
                    <option value="${s.id}" ${s.id === currentSession.id ? 'selected' : ''}>
                      ${s.date} - ${s.title} (${s.exercises?.length || 0} es.)
                    </option>
                  `).join('')}
                </select>
                <button id="delete-session-btn" class="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800" title="Elimina questa sessione">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- RIEPILOGO TOTALI SESSIONE -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tonnellaggio Totale</div>
            <div class="text-2xl font-heading font-black text-emerald-400 mt-1">
              ${grandTotalTonnage.toLocaleString('it-IT')} <span class="text-xs font-normal text-zinc-400">kg</span>
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">kg sollevati nella seduta</div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Serie Totali</div>
            <div class="text-2xl font-heading font-black text-teal-300 mt-1">
              ${grandTotalSets}
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">serie allenanti complessive</div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ripetizioni Totali</div>
            <div class="text-2xl font-heading font-black text-zinc-200 mt-1">
              ${grandTotalReps}
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">rip eseguite nella sessione</div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Esercizi Svolti</div>
            <div class="text-2xl font-heading font-black text-amber-300 mt-1">
              ${currentSession.exercises?.length || 0}
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">esercizi in questa seduta</div>
          </div>
        </div>

        <!-- GRIGLIA DEGLI 8 GRUPPI MUSCOLARI (VOLUME TOTALE SESSIONE) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
                <span>Volume Totale per Gruppo Muscolare</span>
              </h3>
              <p class="text-xs text-zinc-400">Ripartizione del volume (serie e tonnellaggio) tra gli 8 gruppi muscolari per questa sessione.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${muscleCardsHTML}
          </div>
        </div>

        <!-- SEZIONE ESERCIZI DELLA SESSIONE -->
        <div class="space-y-4 pt-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
                <span>Esercizi della Sessione (${currentSession.exercises?.length || 0})</span>
              </h3>
              <p class="text-xs text-zinc-400">Inserisci o modifica carichi, ripetizioni, serie e tecniche di intensità.</p>
            </div>

            <button id="open-add-exercise-modal-btn" class="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer self-start sm:self-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>Aggiungi Esercizio</span>
            </button>
          </div>

          ${currentSession.exercises && currentSession.exercises.length > 0 ? `
            <div class="space-y-3">
              ${exercisesListHTML}
            </div>
          ` : `
            <div class="text-center py-12 px-4 bg-zinc-900/60 border-2 border-dashed border-zinc-800 rounded-2xl space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-zinc-800 text-emerald-400 flex items-center justify-center mx-auto">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              </div>
              <h4 class="text-sm font-bold text-zinc-200">Nessun esercizio ancora aggiunto a questa sessione</h4>
              <p class="text-xs text-zinc-400 max-w-sm mx-auto">Aggiungi il primo esercizio oppure duplica gli esercizi dell'ultimo allenamento.</p>
              <div class="flex items-center justify-center gap-2 pt-2">
                <button id="empty-add-ex-btn" class="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-md">
                  + Aggiungi Esercizio
                </button>
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- MODALE AGGIUNGI ESERCIZIO -->
      <div id="add-exercise-modal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-zinc-100">Nuovo Esercizio</h3>
                <p class="text-xs text-zinc-400">Inserisci i parametri per calcolare il volume muscolare</p>
              </div>
            </div>
            <button id="close-add-ex-modal-btn" class="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form id="add-exercise-form" class="space-y-4">
            <!-- Nome Esercizio -->
            <div>
              <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Nome Esercizio *</label>
              <input type="text" id="modal-ex-name" required placeholder="Es. Panca Piana Bilanciere, Squat, Trazioni..." class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-emerald-500">
            </div>

            <!-- Gruppo Muscolare (8 gruppi) -->
            <div>
              <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Gruppo Muscolare Primario *</label>
              <select id="modal-ex-group" required class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-100 focus:outline-none focus:border-emerald-500">
                ${MUSCLE_GROUPS.map(mg => `
                  <option value="${mg.name}">${mg.icon} ${mg.name}</option>
                `).join('')}
              </select>
            </div>

            <!-- Serie, Ripetizioni, Carico -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Carico (kg) *</label>
                <input type="number" step="0.5" min="0" id="modal-ex-weight" required placeholder="70" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-xs font-bold text-zinc-100 text-center">
              </div>
              <div>
                <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Ripetizioni *</label>
                <input type="number" min="1" max="99" id="modal-ex-reps" required value="8" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-xs font-bold text-zinc-100 text-center">
              </div>
              <div>
                <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Serie *</label>
                <input type="number" min="1" max="20" id="modal-ex-sets" required value="4" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-xs font-bold text-zinc-100 text-center">
              </div>
            </div>

            <!-- Tecniche di Intensità -->
            <div class="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/80 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-zinc-200">Tecniche di Intensità</span>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="modal-ex-tech-used" class="sr-only peer">
                  <div class="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span class="text-xs font-semibold text-zinc-300 peer-checked:text-indigo-400">Sì / No</span>
                </label>
              </div>

              <div id="modal-tech-details" class="hidden space-y-2 pt-1 border-t border-zinc-700/60">
                <label class="block text-[11px] text-zinc-400">Indica quale tecnica hai utilizzato (facoltativo):</label>
                <input type="text" id="modal-ex-tech-name" placeholder="Es. Rest-Pause, Drop Set, Stripping..." list="tech-suggestions" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500">
                <datalist id="tech-suggestions">
                  ${INTENSITY_TECHNIQUES_SUGGESTIONS.map(t => `<option value="${t}">`).join('')}
                </datalist>
              </div>
            </div>

            <!-- Checkbox Esercizio Fondamentale -->
            <div>
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-ex-is-fundamental" class="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500">
                <span class="text-xs text-zinc-300">Contrassegna come <strong>Esercizio Fondamentale</strong> (da monitorare nei progressi)</span>
              </label>
            </div>

            <div class="pt-2 flex gap-3">
              <button type="button" id="cancel-add-ex-modal-btn" class="py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 transition-all">
                Annulla
              </button>
              <button type="submit" class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20">
                Aggiungi all'Allenamento
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners(container, currentSession);
  }

  static attachEventListeners(container, currentSession) {
    // Cambio Data Sessione
    const datePicker = container.querySelector('#session-date-picker');
    if (datePicker) {
      datePicker.addEventListener('change', () => {
        state.updateSessionInfo(currentSession.id, { date: datePicker.value });
      });
    }

    // Modifica Titolo Sessione
    const titleInput = container.querySelector('#session-title-input');
    if (titleInput) {
      titleInput.addEventListener('change', () => {
        state.updateSessionInfo(currentSession.id, { title: titleInput.value });
      });
    }

    // Cambio sessione da selettore storico
    const switchSelect = container.querySelector('#switch-session-select');
    if (switchSelect) {
      switchSelect.addEventListener('change', () => {
        state.setCurrentSession(switchSelect.value);
      });
    }

    // Pulsante Elimina Sessione
    const delSessBtn = container.querySelector('#delete-session-btn');
    if (delSessBtn) {
      delSessBtn.addEventListener('click', () => {
        if (confirm(`Eliminare la sessione "${currentSession.title}" del ${currentSession.date}?`)) {
          state.deleteSession(currentSession.id);
        }
      });
    }

    // Crea Nuova Sessione
    const newSessBtn = container.querySelector('#create-new-session-btn');
    if (newSessBtn) {
      newSessBtn.addEventListener('click', () => {
        state.createSession();
      });
    }

    // Duplica Ultimo Allenamento
    const dupBtn = container.querySelector('#duplicate-session-btn');
    if (dupBtn) {
      dupBtn.addEventListener('click', () => {
        const dup = state.duplicateLastSession();
        if (dup) {
          alert(`Esercizi dell'ultimo allenamento copiati nella nuova sessione!`);
        }
      });
    }

    // Modale Aggiungi Esercizio
    const modal = container.querySelector('#add-exercise-modal');
    const openModalBtn = container.querySelector('#open-add-exercise-modal-btn');
    const emptyAddBtn = container.querySelector('#empty-add-ex-btn');
    const closeModalBtn = container.querySelector('#close-add-ex-modal-btn');
    const cancelModalBtn = container.querySelector('#cancel-add-ex-modal-btn');
    const techCheckbox = container.querySelector('#modal-ex-tech-used');
    const techDetails = container.querySelector('#modal-tech-details');
    const addForm = container.querySelector('#add-exercise-form');

    const showModal = () => { if (modal) modal.classList.remove('hidden'); };
    const hideModal = () => { if (modal) modal.classList.add('hidden'); };

    if (openModalBtn) openModalBtn.addEventListener('click', showModal);
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', showModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

    if (techCheckbox && techDetails) {
      techCheckbox.addEventListener('change', () => {
        if (techCheckbox.checked) {
          techDetails.classList.remove('hidden');
        } else {
          techDetails.classList.add('hidden');
        }
      });
    }

    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = container.querySelector('#modal-ex-name').value;
        const muscleGroup = container.querySelector('#modal-ex-group').value;
        const weight = container.querySelector('#modal-ex-weight').value;
        const reps = container.querySelector('#modal-ex-reps').value;
        const sets = container.querySelector('#modal-ex-sets').value;
        const intensityTechniqueUsed = container.querySelector('#modal-ex-tech-used').checked;
        const intensityTechniqueName = container.querySelector('#modal-ex-tech-name').value;
        const isFund = container.querySelector('#modal-ex-is-fundamental').checked;

        if (!name) return;

        state.addExerciseToSession(currentSession.id, {
          name,
          muscleGroup,
          weight,
          reps,
          sets,
          intensityTechniqueUsed,
          intensityTechniqueName
        });

        if (isFund) {
          state.addFundamentalExercise(name, muscleGroup);
        }

        hideModal();
        addForm.reset();
        if (techDetails) techDetails.classList.add('hidden');
      });
    }

    // Modifica rapida inline di carico, serie, reps
    container.querySelectorAll('.edit-ex-input').forEach(input => {
      input.addEventListener('change', () => {
        const exId = input.getAttribute('data-exid');
        const field = input.getAttribute('data-field');
        const val = input.value;
        state.updateExerciseInSession(currentSession.id, exId, { [field]: val });
      });
    });

    // Checkbox tecnica inline
    container.querySelectorAll('.toggle-tech-checkbox').forEach(chk => {
      chk.addEventListener('change', () => {
        const exId = chk.getAttribute('data-exid');
        state.updateExerciseInSession(currentSession.id, exId, { intensityTechniqueUsed: chk.checked });
      });
    });

    // Toggle stella fondamentale
    container.querySelectorAll('.toggle-fund-star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-exname');
        const group = btn.getAttribute('data-group');
        const nowFund = state.toggleFundamentalForExercise(name, group);
        if (nowFund) {
          alert(`"${name}" aggiunto agli Esercizi Fondamentali! Potrai monitorarne i progressi nella schermata dedicata.`);
        }
      });
    });

    // Eliminazione esercizio
    container.querySelectorAll('.delete-ex-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-exid');
        const name = btn.getAttribute('data-name');
        if (confirm(`Rimuovere "${name}" da questo allenamento?`)) {
          state.deleteExerciseFromSession(currentSession.id, exId);
        }
      });
    });

    // Timer rapido
    container.querySelectorAll('.quick-timer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name') || 'Recupero';
        timer.start(90, name);
      });
    });
  }
}
