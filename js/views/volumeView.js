import { state } from '../state.js';
import { MUSCLE_GROUPS, INTENSITY_TECHNIQUES_SUGGESTIONS } from '../constants.js';
import { timer } from '../timer.js';

/**
 * Funzioni di supporto per la gestione della data (GG/MM/AAAA <-> AAAA-MM-GG)
 */
function formatIsoToItalianDate(isoStr) {
  if (!isoStr) return '';
  try {
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // YYYY-MM-DD -> DD/MM/YYYY
    }
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }
  } catch (e) {}
  return isoStr;
}

function parseItalianDateToIso(str) {
  if (!str) return null;
  const clean = str.trim();
  // Formato GG/MM/AAAA o GG-MM-AAAA o GG.MM.AAAA
  const itMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (itMatch) {
    const day = itMatch[1].padStart(2, '0');
    const month = itMatch[2].padStart(2, '0');
    const year = itMatch[3];
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    const yNum = parseInt(year, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31 && yNum >= 1970 && yNum <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }
  // Formato standard AAAA-MM-GG
  const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Schermata 1:
 * Volume totale per gruppo muscolare della sessione di allenamento, tenendo conto di tutti gli esercizi.
 * Modalità:
 * 1. Scheda Sessione Singola: inserimento e modifica esercizi per la seduta attiva.
 * 2. Andamento Volumi nel Tempo: grafico temporale continuo con asse X giorno per giorno per ciascuno degli 8 gruppi muscolari.
 */
export class VolumeView {
  static subTab = 'session'; // 'session' | 'trends'
  static selectedMuscleGroup = 'ALL'; // 'ALL' | nome gruppo (es. 'Petto', 'Quadricipiti', ecc.)
  static trendMetric = 'tonnage'; // 'tonnage' (kg) | 'sets' (serie)
  static currentTrendChart = null;

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
      return;
    }

    const currentSession = state.getCurrentSession() || user.sessions[0];

    // Sub-Navigation Bar Switcher
    const subNavHTML = `
      <div class="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-800/80">
        <div class="flex items-center gap-2">
          <button id="subtab-session-btn" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${this.subTab === 'session' ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'}">
            <span>📋</span>
            <span>Scheda Sessione Singola</span>
          </button>
          <button id="subtab-trends-btn" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${this.subTab === 'trends' ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'}">
            <span>📈</span>
            <span>Andamento Volumi nel Tempo</span>
          </button>
        </div>
      </div>
    `;

    if (this.subTab === 'trends') {
      this.renderTrendsView(container, user, subNavHTML);
    } else {
      this.renderSessionView(container, user, subNavHTML, currentSession);
    }
  }

  /* ========================================================
     MODALITÀ 1: SCHEDA SESSIONE SINGOLA
     ======================================================== */
  static renderSessionView(container, user, subNavHTML, currentSession) {
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

    // Lista esercizi della sessione (con nome modificabile direttamente!)
    const exercisesListHTML = (currentSession.exercises || []).map((ex, index) => {
      const exTonnage = (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);

      return `
        <div class="exercise-item-row bg-zinc-900 border ${ex.isFundamental ? 'border-amber-500/40 bg-zinc-900/90' : 'border-zinc-800'} rounded-2xl p-4 sm:p-5 space-y-3 transition-all" data-exid="${ex.id}">
          <!-- Intestazione Esercizio: Nome Modificabile Inline & Badge -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/80">
            <div class="flex items-center gap-2.5 flex-wrap flex-1">
              <span class="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">${index + 1}</span>
              
              <!-- Input Nome Esercizio Modificabile -->
              <div class="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-md">
                <input type="text" value="${ex.name}" class="edit-ex-name-input bg-zinc-800/40 hover:bg-zinc-800 focus:bg-zinc-800 border border-transparent hover:border-zinc-700 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-sm sm:text-base font-bold text-zinc-100 focus:outline-none transition-all w-full" data-exid="${ex.id}" placeholder="Nome esercizio..." title="Clicca per modificare il nome dell'esercizio">
                <button type="button" class="focus-name-btn p-1 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer" data-exid="${ex.id}" title="Modifica nome esercizio">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
              </div>

              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-emerald-400 border border-zinc-700 flex-shrink-0">
                ${ex.muscleGroup}
              </span>
              ${ex.isFundamental ? `
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 flex-shrink-0">
                  ⭐ Fondamentale
                </span>
              ` : ''}
              ${ex.intensityTechniqueUsed ? `
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 flex-shrink-0">
                  ⚡ ${ex.intensityTechniqueName || 'Tecnica Intensità'}
                </span>
              ` : ''}
            </div>

            <!-- Pulsanti di azione -->
            <div class="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              <button class="toggle-fund-star-btn p-1.5 rounded-lg text-xs font-bold transition-colors ${ex.isFundamental ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-500 hover:text-amber-400'}" data-exname="${ex.name}" data-group="${ex.muscleGroup}" title="${ex.isFundamental ? 'Rimuovi dai fondamentali' : 'Aggiungi agli esercizi fondamentali'}">
                <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              </button>
              <button class="quick-timer-btn p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer" data-name="${ex.name}" title="Avvia timer recupero (90s)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
              <button class="delete-ex-btn p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer" data-exid="${ex.id}" data-name="${ex.name}" title="Elimina esercizio">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Input Dati Modificabili Direttamente (Carico, Reps, Serie, Volume) -->
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
        ${subNavHTML}

        <!-- Barra di Controllo Sessione -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1 flex-1">
              <div class="flex items-center gap-3">
                <span class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </span>
                <div class="flex-1 max-w-xl">
                  <!-- Titolo Allenamento Direttamente Modificabile -->
                  <div class="flex items-center gap-2">
                    <input type="text" id="session-title-input" value="${currentSession.title}" placeholder="Nome dell'allenamento..." class="bg-zinc-800/40 hover:bg-zinc-800 focus:bg-zinc-800 border border-transparent hover:border-zinc-700 focus:border-emerald-500 rounded-xl px-3 py-1 text-base sm:text-xl font-heading font-black text-zinc-100 focus:outline-none transition-all w-full" title="Clicca per modificare il nome dell'allenamento">
                    <button type="button" id="focus-title-btn" class="p-1 text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer flex-shrink-0" title="Modifica nome allenamento">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                  </div>
                  <p class="text-xs text-zinc-400 mt-0.5">Sessione di allenamento di <strong>${user.fullName}</strong></p>
                </div>
              </div>
            </div>

            <!-- Pulsanti Nuova Sessione e Copia -->
            <div class="flex flex-wrap items-center gap-2">
              <button id="create-new-session-btn" class="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Nuovo Allenamento</span>
              </button>
              <button id="open-copy-session-modal-btn" class="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all flex items-center gap-1.5 border border-zinc-700 cursor-pointer" title="Scegli quale allenamento precedente copiare">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <span>Copia Allenamento</span>
              </button>
            </div>
          </div>

          <!-- Dettagli Sessione: Data e Selettore Storico Sessioni -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
            <div class="flex items-center gap-2.5">
              <!-- Unico Selettore Data Funzionante: Testo GG/MM/AAAA + Icona Calendario per scelta visuale -->
              <div class="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-1.5">
                <span class="text-xs text-zinc-400 font-semibold flex items-center gap-1.5 cursor-pointer" id="calendar-icon-btn" title="Apri calendario visuale">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span>Data:</span>
                </span>
                <input type="text" id="session-date-input" value="${formatIsoToItalianDate(currentSession.date)}" placeholder="GG/MM/AAAA" class="bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-100 w-28 text-center focus:outline-none focus:border-emerald-500" title="Digita la data nel formato GG/MM/AAAA">
                <button type="button" id="session-open-calendar-btn" class="p-1 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer text-sm" title="Apri calendario visuale">
                  📅
                </button>
                <input type="date" id="session-hidden-date-picker" value="${currentSession.date}" class="sr-only">
              </div>
            </div>

            <!-- Selettore Sessioni Precedenti -->
            ${user.sessions.length > 1 ? `
              <div class="flex items-center gap-2">
                <span class="text-xs text-zinc-500 font-semibold">Storico:</span>
                <select id="switch-session-select" class="bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 rounded-xl py-1.5 px-3 focus:outline-none">
                  ${user.sessions.map(s => `
                    <option value="${s.id}" ${s.id === currentSession.id ? 'selected' : ''}>
                      ${formatIsoToItalianDate(s.date)} - ${s.title} (${s.exercises?.length || 0} es.)
                    </option>
                  `).join('')}
                </select>
                <button id="duplicate-current-session-btn" class="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 cursor-pointer" title="Copia questo specifico allenamento in una nuova scheda per oggi">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
                <button id="delete-session-btn" class="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 cursor-pointer" title="Elimina questa sessione">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Box Guida Utente -->
        <div class="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-sm flex-shrink-0">
            💡
          </div>
          <div class="space-y-1 text-xs text-zinc-300">
            <span class="font-bold text-zinc-100 text-sm block">Guida alla gestione della sessione</span>
            <p class="text-zinc-400 leading-relaxed">
              In questa sezione puoi <strong>creare un nuovo allenamento</strong> o <strong>copiare qualsiasi allenamento precedente</strong> con il pulsante <em>"Copia Allenamento"</em>. Puoi anche selezionare le sedute passate dallo <strong>"Storico"</strong> per visualizzarle o modificarle.
            </p>
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

        <!-- SOTTOSEZIONE 1: ESERCIZI DELL'ALLENAMENTO (Rinominata da Esercizi della Sessione) -->
        <div class="space-y-4 pt-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
                <span>Esercizi dell'allenamento (${currentSession.exercises?.length || 0})</span>
              </h3>
              <p class="text-xs text-zinc-400">Inserisci o modifica carichi, ripetizioni, serie, nomi e tecniche di intensità di questa seduta.</p>
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
              <h4 class="text-sm font-bold text-zinc-200">Nessun esercizio ancora aggiunto a questo allenamento</h4>
              <p class="text-xs text-zinc-400 max-w-sm mx-auto">Aggiungi il primo esercizio oppure copia gli esercizi da un qualsiasi allenamento precedente.</p>
              <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button id="empty-add-ex-btn" class="py-2 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-md cursor-pointer">
                  + Aggiungi Esercizio
                </button>
                <button id="empty-copy-ex-btn" class="py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all border border-zinc-700 flex items-center gap-1.5 cursor-pointer">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  <span>Copia da Allenamento Precedente</span>
                </button>
              </div>
            </div>
          `}
        </div>

        <!-- SOTTOSEZIONE 2: VOLUME TOTALE PER GRUPPO MUSCOLARE (Posizionata DOPO gli esercizi) -->
        <div class="space-y-3 pt-4 border-t border-zinc-800/80">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
                <span>Volume Totale per Gruppo Muscolare</span>
              </h3>
              <p class="text-xs text-zinc-400">Ripartizione del volume (serie e tonnellaggio) tra gli 8 gruppi muscolari per gli esercizi di questa seduta.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${muscleCardsHTML}
          </div>
        </div>
      </div>

      <!-- MODALE AGGIUNGI ESERCIZIO (Prima Gruppo Muscolare, poi Nome con Suggerimenti Intelligenti) -->
      <div id="add-exercise-modal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-zinc-100">Nuovo Esercizio</h3>
                <p class="text-xs text-zinc-400">1° Scegli il gruppo muscolare • 2° Seleziona o digita l'esercizio</p>
              </div>
            </div>
            <button id="close-add-ex-modal-btn" class="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <form id="add-exercise-form" class="space-y-4">
            <!-- 1. PRIMA: Selezione Gruppo Muscolare -->
            <div>
              <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>1. Gruppo Muscolare (8 Gruppi Standard) *</span>
                <span class="text-[10px] text-emerald-400 font-semibold">Scegli prima il distretto</span>
              </label>
              <select id="modal-ex-group" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3.5 text-xs font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer">
                ${MUSCLE_GROUPS.map(mg => `<option value="${mg.name}">${mg.icon} ${mg.name}</option>`).join('')}
              </select>
            </div>

            <!-- 2. POI: Nome Esercizio con Datalist e Suggerimenti dei già eseguiti -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  2. Nome Esercizio *
                </label>
                <span class="text-[10px] text-zinc-400 font-medium">Scegli dai tuoi o scrivi nuovo</span>
              </div>
              <div class="relative">
                <input type="text" id="modal-ex-name" list="modal-ex-suggestions" required autocomplete="off" placeholder="Seleziona o digita il nome dell'esercizio..." class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-zinc-100 focus:outline-none focus:border-emerald-500">
                <datalist id="modal-ex-suggestions"></datalist>
              </div>

              <!-- Pillole suggerite rapide per il gruppo selezionato -->
              <div id="modal-ex-quick-pills-container" class="mt-2.5 space-y-1">
                <div class="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                  <span>💡 Esercizi già eseguiti per questo gruppo:</span>
                </div>
                <div id="modal-ex-quick-pills" class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none pt-0.5">
                </div>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Peso (kg) *</label>
                <input type="number" id="modal-ex-weight" step="0.5" min="0" required placeholder="Es. 60" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 text-center">
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Ripetizioni *</label>
                <input type="number" id="modal-ex-reps" min="1" max="99" required placeholder="Es. 8" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 text-center">
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Serie *</label>
                <input type="number" id="modal-ex-sets" min="1" max="20" required placeholder="Es. 3" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-sm font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 text-center">
              </div>
            </div>

            <!-- Tecniche di Intensità -->
            <div class="bg-zinc-850 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="modal-ex-tech-used" class="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500">
                  <span class="text-xs font-bold text-zinc-200">Applicata Tecnica di Intensità?</span>
                </label>
                <span class="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Facoltativo</span>
              </div>

              <div id="modal-tech-details" class="hidden space-y-2 pt-1 border-t border-zinc-800">
                <label class="block text-[11px] font-medium text-zinc-400">Quale tecnica hai utilizzato?</label>
                <input type="text" id="modal-ex-tech-name" placeholder="Es. Drop set, Rest-pause, Super set..." list="intensity-suggestions-list" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500">
                <datalist id="intensity-suggestions-list">
                  ${INTENSITY_TECHNIQUES_SUGGESTIONS.map(t => `<option value="${t}">`).join('')}
                </datalist>
              </div>
            </div>

            <!-- Checkbox Imposta come Fondamentale -->
            <div id="modal-fund-box" class="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 transition-all">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="modal-ex-is-fundamental" class="rounded border-amber-600 bg-zinc-800 text-amber-500 focus:ring-amber-500">
                <span id="modal-fund-label" class="text-xs font-bold text-amber-300">Imposta questo esercizio come Fondamentale (Benchmark)</span>
              </label>
              <div id="modal-fund-hint" class="hidden text-[11px] text-amber-400 font-semibold mt-1.5 pl-6 flex items-center gap-1">
                <span>⭐ Riconosciuto automaticamente tra i tuoi Fondamentali definiti.</span>
              </div>
            </div>

            <!-- Bottoni Salva -->
            <div class="pt-2 flex gap-3">
              <button type="button" id="cancel-add-ex-modal-btn" class="py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 transition-all cursor-pointer">
                Annulla
              </button>
              <button type="submit" class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer">
                Salva Esercizio nella Sessione
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODALE COPIA DA ALLENAMENTO PRECEDENTE -->
      <div id="copy-session-modal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-zinc-100">Copia Allenamento Precedente</h3>
                <p class="text-xs text-zinc-400">Scegli da quale allenamento passato copiare esercizi, carichi e serie</p>
              </div>
            </div>
            <button id="close-copy-modal-btn" class="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Barra di Ricerca / Filtro Rapido -->
          <div class="relative">
            <input type="text" id="copy-modal-search" placeholder="Cerca per titolo o data (es. 'Spalle', 'Quad', 'Week 2')..." class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500">
          </div>

          <!-- Lista degli Allenamenti -->
          <div id="copy-modal-sessions-list" class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            ${user.sessions.filter(s => (s.exercises?.length || 0) > 0).map(s => {
              const isCurrent = s.id === currentSession.id;
              const exNames = (s.exercises || []).map(e => e.name).slice(0, 4).join(', ');
              const moreCount = (s.exercises?.length || 0) - 4;
              const exSummary = moreCount > 0 ? `${exNames} + altri ${moreCount}` : exNames;
              const tonnage = (s.exercises || []).reduce((acc, e) => acc + ((e.sets || 0) * (e.reps || 0) * (e.weight || 0)), 0);

              return `
                <div class="copy-session-card bg-zinc-800/60 hover:bg-zinc-800 border ${isCurrent ? 'border-emerald-500/40 bg-zinc-800/80' : 'border-zinc-700/70'} rounded-xl p-3.5 transition-all space-y-2" data-search="${s.title.toLowerCase()} ${s.date}">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-zinc-100">${s.title}</span>
                        ${isCurrent ? '<span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Attivo</span>' : ''}
                      </div>
                      <div class="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                        <span>📅 ${formatIsoToItalianDate(s.date)}</span>
                        <span>•</span>
                        <span>🏋️ ${s.exercises?.length || 0} esercizi</span>
                        <span>•</span>
                        <span class="text-emerald-400 font-semibold">${tonnage.toLocaleString('it-IT')} kg</span>
                      </div>
                    </div>
                  </div>

                  <div class="text-[11px] text-zinc-400 truncate bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                    <span class="text-zinc-500 font-semibold">Esercizi:</span> ${exSummary || 'Nessuno'}
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-1 border-t border-zinc-700/40">
                    <button type="button" class="btn-import-into-current py-1.5 px-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-bold transition-all cursor-pointer" data-sid="${s.id}">
                      Importa in questa scheda
                    </button>
                    <button type="button" class="btn-copy-as-new py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-md cursor-pointer" data-sid="${s.id}">
                      Copia come Nuovo per Oggi
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
            ${user.sessions.filter(s => (s.exercises?.length || 0) > 0).length === 0 ? `
              <div class="text-center py-8 text-xs text-zinc-400">
                Non ci sono ancora allenamenti con esercizi registrati da poter copiare.
              </div>
            ` : ''}
          </div>

          <div class="pt-2 border-t border-zinc-800 flex justify-end">
            <button type="button" id="cancel-copy-modal-btn" class="py-2 px-4 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 transition-all cursor-pointer">
              Chiudi
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachSessionEventListeners(container, currentSession);
  }

  /* ========================================================
     MODALITÀ 2: ANDAMENTO VOLUMI NEL TEMPO (GRAFICO & STATS)
     ======================================================== */
  static renderTrendsView(container, user, subNavHTML) {
    const timeline = state.getMuscleGroupTimeline();

    // Filtro attivo
    const isAll = this.selectedMuscleGroup === 'ALL';
    const isTonnage = this.trendMetric === 'tonnage';

    // Calcolo statistiche generali o per gruppo specifico
    let statMax = 0;
    let statAvg = 0;
    let statTotal = 0;
    let statSessionCount = 0;

    if (timeline.length > 0) {
      if (!isAll) {
        // Singolo gruppo muscolare
        const groupSessions = timeline.filter(t => (t.volumes[this.selectedMuscleGroup]?.totalTonnage || 0) > 0);
        statSessionCount = groupSessions.length;
        groupSessions.forEach(t => {
          const v = t.volumes[this.selectedMuscleGroup];
          const val = isTonnage ? v.totalTonnage : v.totalSets;
          if (val > statMax) statMax = val;
          statTotal += val;
        });
        statAvg = statSessionCount > 0 ? Math.round(statTotal / statSessionCount) : 0;
      } else {
        // Tutti i gruppi
        timeline.forEach(t => {
          let sessTot = 0;
          Object.values(t.volumes).forEach(v => {
            const val = isTonnage ? v.totalTonnage : v.totalSets;
            sessTot += val;
            statTotal += val;
          });
          if (sessTot > statMax) statMax = sessTot;
        });
        statSessionCount = timeline.length;
        statAvg = statSessionCount > 0 ? Math.round(statTotal / statSessionCount) : 0;
      }
    }

    // Costruisci le pillole di selezione Gruppo Muscolare
    const musclePillsHTML = `
      <button class="trend-group-pill py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isAll ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 scale-102' : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'}" data-group="ALL">
        <span>🌐</span>
        <span>Tutti i Gruppi (Confronto)</span>
      </button>
      ${MUSCLE_GROUPS.map(mg => {
        const isSel = this.selectedMuscleGroup === mg.name;
        const totalWork = timeline.reduce((acc, t) => acc + (t.volumes[mg.name]?.totalSets || 0), 0);

        return `
          <button class="trend-group-pill py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isSel ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 scale-102' : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'}" data-group="${mg.name}">
            <span>${mg.icon}</span>
            <span>${mg.name}</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isSel ? 'bg-zinc-950/20 text-zinc-950 font-extrabold' : 'bg-zinc-700 text-zinc-400'}">${totalWork} set</span>
          </button>
        `;
      }).join('')}
    `;

    // Tabella delle sessioni per il gruppo attivo
    const tableSessions = timeline.filter(t => isAll ? true : (t.volumes[this.selectedMuscleGroup]?.totalTonnage || 0) > 0);
    const tableRowsHTML = tableSessions.slice().reverse().map(t => {
      const vol = isAll ? null : t.volumes[this.selectedMuscleGroup];
      const tonnage = isAll 
        ? Object.values(t.volumes).reduce((a, b) => a + b.totalTonnage, 0)
        : (vol?.totalTonnage || 0);
      const sets = isAll
        ? Object.values(t.volumes).reduce((a, b) => a + b.totalSets, 0)
        : (vol?.totalSets || 0);
      const exList = isAll
        ? Object.values(t.volumes).flatMap(v => v.exercises.map(e => e.name)).join(', ')
        : (vol?.exercises.map(e => `${e.name} (${e.sets}×${e.reps} @ ${e.weight}kg)`).join(', ') || '-');

      return `
        <tr class="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
          <td class="py-3 px-3 text-xs font-bold text-zinc-200">
            ${formatIsoToItalianDate(t.date)}
          </td>
          <td class="py-3 px-3 text-xs text-zinc-400">
            ${t.title}
          </td>
          <td class="py-3 px-3 text-xs text-center font-bold text-emerald-400">
            ${tonnage.toLocaleString('it-IT')} kg
          </td>
          <td class="py-3 px-3 text-xs text-center text-zinc-300">
            ${sets}
          </td>
          <td class="py-3 px-3 text-xs text-zinc-400 max-w-xs truncate">
            ${exList}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="space-y-6">
        ${subNavHTML}

        <!-- Header Andamento Volumi -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                </span>
                <div>
                  <h3 class="text-lg font-heading font-bold text-zinc-100">
                    Andamento Volume nel Tempo ${!isAll ? `• ${this.selectedMuscleGroup}` : '• Tutti i Gruppi'}
                  </h3>
                  <p class="text-xs text-zinc-400">Monitora i volumi seduta dopo seduta su una linea temporale continua proporzionata giorno per giorno.</p>
                </div>
              </div>
            </div>

            <!-- Switcher Metrica: Tonnellaggio kg vs Serie -->
            <div class="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
              <button id="trend-metric-tonnage-btn" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isTonnage ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}">
                📦 Tonnellaggio (kg)
              </button>
              <button id="trend-metric-sets-btn" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isTonnage ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}">
                🔢 Serie Allenanti
              </button>
            </div>
          </div>

          <!-- Selettore Pillole Gruppi Muscolari -->
          <div class="pt-3 border-t border-zinc-800/80">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Filtra per Gruppo Muscolare:</div>
            <div class="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              ${musclePillsHTML}
            </div>
          </div>
        </div>

        <!-- STAT CARDS -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Picco Massimo Singola Seduta</div>
            <div class="text-2xl font-heading font-black text-emerald-400 mt-1">
              ${statMax.toLocaleString('it-IT')} <span class="text-xs font-normal text-zinc-400">${isTonnage ? 'kg' : 'serie'}</span>
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">massimo volume raggiunto</div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Media per Seduta</div>
            <div class="text-2xl font-heading font-black text-teal-300 mt-1">
              ${statAvg.toLocaleString('it-IT')} <span class="text-xs font-normal text-zinc-400">${isTonnage ? 'kg' : 'serie'}</span>
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">volume medio allenante</div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Volume Totale Cumulativo</div>
            <div class="text-2xl font-heading font-black text-zinc-100 mt-1">
              ${statTotal.toLocaleString('it-IT')} <span class="text-xs font-normal text-zinc-400">${isTonnage ? 'kg' : 'serie'}</span>
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">somma di tutto il mesociclo</div>
          </div>

          <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Sedute con Stimolo</div>
            <div class="text-2xl font-heading font-black text-amber-400 mt-1">
              ${statSessionCount}
            </div>
            <div class="text-[10px] text-zinc-500 mt-0.5">allenamenti dedicati</div>
          </div>
        </div>

        <!-- GRAFICO TEMPORALE (CHART.JS) -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-bold text-zinc-100">
                Evoluzione Temporale Continua (${isTonnage ? 'Tonnellaggio in kg' : 'Serie Totali'})
              </h4>
              <p class="text-xs text-zinc-400">
                Ogni unità dell'asse X corrisponde a 1 giorno di calendario. Le pause (es. i 10 giorni) sono visibili proporzionalmente sul piano temporale.
              </p>
            </div>
          </div>

          <div class="relative h-72 sm:h-84 w-full bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60">
            <canvas id="volume-trend-canvas"></canvas>
          </div>
        </div>

        <!-- TABELLA STORICO VOLUME PER SEDUTA -->
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4 sm:p-5">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-bold text-zinc-100">Storico Dettagliato delle Sessioni</h4>
              <p class="text-xs text-zinc-400">Tutti i volumi registrati cronologicamente per ${isAll ? 'tutti i gruppi muscolari' : this.selectedMuscleGroup}.</p>
            </div>
            <span class="text-xs text-zinc-500 font-semibold">${tableSessions.length} sedute trovate</span>
          </div>

          ${tableSessions.length > 0 ? `
            <div class="overflow-x-auto pt-1">
              <table class="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr class="text-zinc-500 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-bold">
                    <th class="py-2.5 px-3">Data</th>
                    <th class="py-2.5 px-3">Sessione</th>
                    <th class="py-2.5 px-3 text-center">Volume (kg)</th>
                    <th class="py-2.5 px-3 text-center">Serie</th>
                    <th class="py-2.5 px-3">Esercizi Eseguiti</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHTML}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="text-center py-8 text-zinc-500 text-xs italic">
              Nessun allenamento registrato ancora per questo gruppo muscolare.
            </div>
          `}
        </div>
      </div>
    `;

    this.attachTrendsEventListeners(container, timeline);
    this.renderTrendsChart(timeline);
  }

  /* ========================================================
     RENDERING GRAFICO TEMPORALE VOLUMI (CHART.JS)
     ======================================================== */
  static renderTrendsChart(timeline) {
    const canvas = document.getElementById('volume-trend-canvas');
    if (!canvas || !window.Chart) return;

    if (this.currentTrendChart) {
      this.currentTrendChart.destroy();
      this.currentTrendChart = null;
    }

    if (!timeline || timeline.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#71717a';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Nessuna sessione registrata.', canvas.width / 2 || 150, 100);
      return;
    }

    const isAll = this.selectedMuscleGroup === 'ALL';
    const isTonnage = this.trendMetric === 'tonnage';

    // Base temporale lineare continua in giorni solari
    const sorted = [...timeline].sort((a, b) => new Date(a.date) - new Date(b.date));
    const minDateObj = new Date(sorted[0].date);
    minDateObj.setHours(0, 0, 0, 0);
    const minTime = minDateObj.getTime();

    const maxDateObj = new Date(sorted[sorted.length - 1].date);
    maxDateObj.setHours(0, 0, 0, 0);
    const totalSpanDays = Math.max(1, Math.round((maxDateObj.getTime() - minTime) / 86400000));

    const datasets = [];

    if (isAll) {
      // Disegna una linea per ciascuno degli 8 gruppi muscolari che hanno dati
      MUSCLE_GROUPS.forEach(mg => {
        const points = [];
        sorted.forEach(sess => {
          const v = sess.volumes[mg.name];
          if (v && v.totalSets > 0) {
            const d = new Date(sess.date);
            d.setHours(0, 0, 0, 0);
            const dayOffset = Math.round((d.getTime() - minTime) / 86400000);
            points.push({
              x: dayOffset,
              y: isTonnage ? v.totalTonnage : v.totalSets,
              rawItem: { date: sess.date, title: sess.title, mg: mg.name, vol: v }
            });
          }
        });

        if (points.length > 0) {
          datasets.push({
            label: mg.name,
            data: points,
            borderColor: mg.hex,
            backgroundColor: mg.hex + '20',
            borderWidth: 2.5,
            pointBackgroundColor: mg.hex,
            pointBorderColor: '#ffffff',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.2,
            fill: false
          });
        }
      });
    } else {
      // Disegna la curva dettagliata del singolo gruppo muscolare selezionato
      const targetMg = MUSCLE_GROUPS.find(m => m.name === this.selectedMuscleGroup) || { name: this.selectedMuscleGroup, hex: '#10b981' };
      const points = [];

      sorted.forEach(sess => {
        const v = sess.volumes[this.selectedMuscleGroup];
        if (v && v.totalSets > 0) {
          const d = new Date(sess.date);
          d.setHours(0, 0, 0, 0);
          const dayOffset = Math.round((d.getTime() - minTime) / 86400000);
          points.push({
            x: dayOffset,
            y: isTonnage ? v.totalTonnage : v.totalSets,
            rawItem: { date: sess.date, title: sess.title, mg: this.selectedMuscleGroup, vol: v }
          });
        }
      });

      datasets.push({
        label: `${this.selectedMuscleGroup} (${isTonnage ? 'Tonnellaggio kg' : 'Serie'})`,
        data: points,
        borderColor: targetMg.hex,
        backgroundColor: targetMg.hex + '25',
        borderWidth: 3,
        pointBackgroundColor: targetMg.hex,
        pointBorderColor: '#ffffff',
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.2,
        fill: true
      });
    }

    const ctx = canvas.getContext('2d');
    this.currentTrendChart = new window.Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isAll,
            position: 'top',
            labels: {
              color: '#d4d4d8',
              font: { size: 11, weight: '600' },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: '#18181b',
            titleColor: '#f4f4f5',
            bodyColor: '#e4e4e7',
            borderColor: '#3f3f46',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (ctxArr) => {
                const pt = ctxArr[0].raw;
                const item = pt.rawItem;
                const d = new Date(item.date);
                const dStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                return `📅 ${dStr} (Giorno +${pt.x} dall'inizio) • ${item.title}`;
              },
              label: (context) => {
                const pt = context.raw;
                const item = pt.rawItem;
                const v = item.vol;
                const exNames = v.exercises?.map(e => e.name).join(', ') || '';
                return [
                  ` Distretto: ${item.mg}`,
                  ` Tonnellaggio: ${v.totalTonnage.toLocaleString('it-IT')} kg`,
                  ` Serie Totali: ${v.totalSets} (Rip tot: ${v.totalReps})`,
                  exNames ? ` Esercizi: ${exNames}` : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: totalSpanDays + 1,
            title: {
              display: true,
              text: 'Linea Temporale Continua (1 unità = 1 giorno di calendario)',
              color: '#71717a',
              font: { size: 10, weight: 'bold' }
            },
            grid: {
              color: 'rgba(39, 39, 42, 0.45)'
            },
            ticks: {
              stepSize: totalSpanDays > 40 ? 5 : (totalSpanDays > 15 ? 2 : 1),
              color: '#a1a1aa',
              font: { size: 10 },
              callback: function(val) {
                if (!Number.isInteger(val) || val < 0) return '';
                const d = new Date(minTime + val * 86400000);
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
              }
            }
          },
          y: {
            grid: { color: 'rgba(39, 39, 42, 0.5)' },
            ticks: {
              color: '#a1a1aa',
              font: { size: 11 },
              callback: (val) => isTonnage ? `${val} kg` : `${val} set`
            }
          }
        }
      }
    });
  }

  /* ========================================================
     EVENT LISTENERS PER ANDAMENTO VOLUMI
     ======================================================== */
  static attachTrendsEventListeners(container, timeline) {
    // Switcher SubTab
    const sessionBtn = container.querySelector('#subtab-session-btn');
    if (sessionBtn) {
      sessionBtn.addEventListener('click', () => {
        this.subTab = 'session';
        this.render();
      });
    }

    // Selettore Pillole Gruppo Muscolare
    container.querySelectorAll('.trend-group-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedMuscleGroup = btn.getAttribute('data-group');
        this.render();
      });
    });

    // Switcher Metrica: Tonnellaggio vs Serie
    const tonnageBtn = container.querySelector('#trend-metric-tonnage-btn');
    const setsBtn = container.querySelector('#trend-metric-sets-btn');
    if (tonnageBtn) {
      tonnageBtn.addEventListener('click', () => {
        this.trendMetric = 'tonnage';
        this.render();
      });
    }
    if (setsBtn) {
      setsBtn.addEventListener('click', () => {
        this.trendMetric = 'sets';
        this.render();
      });
    }
  }

  /* ========================================================
     EVENT LISTENERS PER SCHEDA SESSIONE
     ======================================================== */
  static attachSessionEventListeners(container, currentSession) {
    // Switcher SubTab
    const trendsBtn = container.querySelector('#subtab-trends-btn');
    if (trendsBtn) {
      trendsBtn.addEventListener('click', () => {
        this.subTab = 'trends';
        this.render();
      });
    }

    // Pulsante Crea Nuova Sessione
    const createBtn = container.querySelector('#create-new-session-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        state.createSession();
      });
    }

    // GESTIONE MODALE COPIA DA QUALSIASI ALLENAMENTO PRECEDENTE
    const copyModal = container.querySelector('#copy-session-modal');
    const openCopyModalBtn = container.querySelector('#open-copy-session-modal-btn');
    const emptyCopyBtn = container.querySelector('#empty-copy-ex-btn');
    const closeCopyModalBtn = container.querySelector('#close-copy-modal-btn');
    const cancelCopyModalBtn = container.querySelector('#cancel-copy-modal-btn');
    const copySearchInput = container.querySelector('#copy-modal-search');
    const duplicateCurrentBtn = container.querySelector('#duplicate-current-session-btn');

    const showCopyModal = () => {
      if (copyModal) {
        copyModal.classList.remove('hidden');
        if (copySearchInput) {
          copySearchInput.value = '';
          copySearchInput.focus();
        }
        container.querySelectorAll('.copy-session-card').forEach(c => c.classList.remove('hidden'));
      }
    };

    const hideCopyModal = () => {
      if (copyModal) {
        copyModal.classList.add('hidden');
      }
    };

    if (openCopyModalBtn) openCopyModalBtn.addEventListener('click', showCopyModal);
    if (emptyCopyBtn) emptyCopyBtn.addEventListener('click', showCopyModal);
    if (closeCopyModalBtn) closeCopyModalBtn.addEventListener('click', hideCopyModal);
    if (cancelCopyModalBtn) cancelCopyModalBtn.addEventListener('click', hideCopyModal);

    if (copyModal) {
      copyModal.addEventListener('click', (e) => {
        if (e.target === copyModal) hideCopyModal();
      });
    }

    if (copySearchInput) {
      copySearchInput.addEventListener('input', () => {
        const query = copySearchInput.value.toLowerCase().trim();
        container.querySelectorAll('.copy-session-card').forEach(card => {
          const searchData = card.getAttribute('data-search') || '';
          if (!query || searchData.includes(query)) {
            card.classList.remove('hidden');
          } else {
            card.classList.add('hidden');
          }
        });
      });
    }

    // Copia come Nuovo Allenamento per Oggi
    container.querySelectorAll('.btn-copy-as-new').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        if (sid) {
          state.duplicateSession(sid);
          hideCopyModal();
        }
      });
    });

    // Importa nella Sessione Corrente Aperta
    container.querySelectorAll('.btn-import-into-current').forEach(btn => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-sid');
        if (sid) {
          if (currentSession.exercises && currentSession.exercises.length > 0) {
            if (!confirm('La scheda corrente contiene già degli esercizi. Vuoi sostituirli con gli esercizi di questa sessione?')) {
              return;
            }
          }
          state.duplicateSession(sid, { targetSessionId: currentSession.id, replaceExisting: true });
          hideCopyModal();
        }
      });
    });

    // Duplica rapido della sessione attualmente visualizzata
    if (duplicateCurrentBtn) {
      duplicateCurrentBtn.addEventListener('click', () => {
        state.duplicateSession(currentSession.id);
      });
    }

    // GESTIONE DATA SESSIONE: Unico campo data testuale GG/MM/AAAA + Calendario picker nativo
    const dateInput = container.querySelector('#session-date-input');
    const hiddenDatePicker = container.querySelector('#session-hidden-date-picker');
    const openCalendarBtn = container.querySelector('#session-open-calendar-btn');
    const calendarIconBtn = container.querySelector('#calendar-icon-btn');

    const applyDateChange = (isoDate) => {
      if (isoDate && isoDate !== currentSession.date) {
        state.updateSession(currentSession.id, { date: isoDate });
      }
    };

    const triggerCalendarPicker = () => {
      if (hiddenDatePicker) {
        try {
          if (typeof hiddenDatePicker.showPicker === 'function') {
            hiddenDatePicker.showPicker();
            return;
          }
        } catch (err) {
          console.warn('showPicker non supportato o limitato, fallback click:', err);
        }
        hiddenDatePicker.focus();
        hiddenDatePicker.click();
      }
    };

    if (openCalendarBtn) {
      openCalendarBtn.addEventListener('click', triggerCalendarPicker);
    }
    if (calendarIconBtn) {
      calendarIconBtn.addEventListener('click', triggerCalendarPicker);
    }

    if (hiddenDatePicker) {
      hiddenDatePicker.addEventListener('change', (e) => {
        if (e.target.value) {
          applyDateChange(e.target.value);
        }
      });
    }

    if (dateInput) {
      const saveDateFromInput = () => {
        const parsedIso = parseItalianDateToIso(dateInput.value);
        if (parsedIso) {
          applyDateChange(parsedIso);
        } else {
          // Ripristina valore formattato valido se il testo inserito non è una data corretta
          dateInput.value = formatIsoToItalianDate(currentSession.date);
        }
      };

      dateInput.addEventListener('change', saveDateFromInput);
      dateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveDateFromInput();
          dateInput.blur();
        }
      });
    }

    // GESTIONE TITOLO SESSIONE: Modifica diretta inline + tasto Enter + pulsante matita
    const titleInput = container.querySelector('#session-title-input');
    const focusTitleBtn = container.querySelector('#focus-title-btn');

    if (titleInput) {
      const saveTitle = () => {
        const newTitle = titleInput.value.trim() || 'Allenamento';
        if (newTitle !== currentSession.title) {
          state.updateSession(currentSession.id, { title: newTitle });
        }
      };

      titleInput.addEventListener('change', saveTitle);
      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveTitle();
          titleInput.blur();
        }
      });
    }

    if (focusTitleBtn && titleInput) {
      focusTitleBtn.addEventListener('click', () => {
        titleInput.focus();
        titleInput.select();
      });
    }

    // Cambio sessione dallo storico
    const switchSelect = container.querySelector('#switch-session-select');
    if (switchSelect) {
      switchSelect.addEventListener('change', (e) => {
        state.setCurrentSession(e.target.value);
      });
    }

    // Elimina sessione corrente
    const deleteSessionBtn = container.querySelector('#delete-session-btn');
    if (deleteSessionBtn) {
      deleteSessionBtn.addEventListener('click', () => {
        if (confirm(`Eliminare definitivamente l'allenamento "${currentSession.title}" del ${formatIsoToItalianDate(currentSession.date)}?`)) {
          state.deleteSession(currentSession.id);
        }
      });
    }

    // MODALE AGGIUNGI ESERCIZIO: Elementi Form
    const modal = container.querySelector('#add-exercise-modal');
    const openModalBtn = container.querySelector('#open-add-exercise-modal-btn');
    const emptyAddBtn = container.querySelector('#empty-add-ex-btn');
    const closeModalBtn = container.querySelector('#close-add-ex-modal-btn');
    const cancelModalBtn = container.querySelector('#cancel-add-ex-modal-btn');
    const techCheckbox = container.querySelector('#modal-ex-tech-used');
    const techDetails = container.querySelector('#modal-tech-details');
    const addForm = container.querySelector('#add-exercise-form');

    const groupSelect = container.querySelector('#modal-ex-group');
    const nameInput = container.querySelector('#modal-ex-name');
    const datalist = container.querySelector('#modal-ex-suggestions');
    const pillsContainer = container.querySelector('#modal-ex-quick-pills');
    const fundBox = container.querySelector('#modal-fund-box');
    const fundCheckbox = container.querySelector('#modal-ex-is-fundamental');
    const fundHint = container.querySelector('#modal-fund-hint');

    // Funzione per sincronizzare automaticamente lo stato di Fondamentale dell'esercizio
    const checkAndSyncFundamentalStatus = (name) => {
      if (!fundCheckbox) return;
      const isAlreadyFund = state.isFundamental(name);
      if (isAlreadyFund) {
        fundCheckbox.checked = true;
        if (fundHint) fundHint.classList.remove('hidden');
        if (fundBox) {
          fundBox.classList.add('bg-amber-500/15', 'border-amber-500/40');
          fundBox.classList.remove('bg-amber-500/5', 'border-amber-500/20');
        }
      } else {
        if (fundHint) fundHint.classList.add('hidden');
        if (fundBox) {
          fundBox.classList.remove('bg-amber-500/15', 'border-amber-500/40');
          fundBox.classList.add('bg-amber-500/5', 'border-amber-500/20');
        }
      }
    };

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        checkAndSyncFundamentalStatus(nameInput.value);
      });
      nameInput.addEventListener('change', () => {
        checkAndSyncFundamentalStatus(nameInput.value);
      });
    }

    // Funzione per aggiornare suggerimenti intelligenti e pillole in base al gruppo muscolare
    const updateSuggestionsForGroup = (selectedGroup) => {
      if (!datalist || !pillsContainer) return;
      const names = state.getExerciseNamesForMuscleGroup(selectedGroup);

      // Popola il datalist per il completamento automatico da tastiera
      datalist.innerHTML = names.map(n => `<option value="${n}">`).join('');

      // Popola le pillole cliccabili rapide
      if (names.length > 0) {
        pillsContainer.innerHTML = names.map(n => {
          const isFund = state.isFundamental(n);
          return `
            <button type="button" class="quick-suggest-pill px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 border ${isFund ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-700/80'} hover:border-emerald-500 font-medium transition-all cursor-pointer flex items-center gap-1" data-fill="${n}">
              ${isFund ? '<span>⭐</span>' : ''}
              <span>${n}</span>
            </button>
          `;
        }).join('');

        pillsContainer.querySelectorAll('.quick-suggest-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            const chosen = btn.getAttribute('data-fill');
            if (nameInput) {
              nameInput.value = chosen;
              checkAndSyncFundamentalStatus(chosen);
              const weightInput = container.querySelector('#modal-ex-weight');
              if (weightInput) weightInput.focus();
            }
          });
        });
      } else {
        pillsContainer.innerHTML = `<span class="text-[11px] text-zinc-500 italic">Nessun esercizio ancora registrato per questo gruppo. Scrivi liberamente il nome per aggiungerne uno nuovo!</span>`;
      }
    };

    if (groupSelect) {
      groupSelect.addEventListener('change', () => {
        updateSuggestionsForGroup(groupSelect.value);
      });
    }

    const showModal = () => { 
      if (modal) {
        modal.classList.remove('hidden');
        if (groupSelect) updateSuggestionsForGroup(groupSelect.value);
        if (nameInput) checkAndSyncFundamentalStatus(nameInput.value);
      }
    };
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

        if (!name || !name.trim()) return;

        state.addExerciseToSession(currentSession.id, {
          name: name.trim(),
          muscleGroup,
          weight,
          reps,
          sets,
          intensityTechniqueUsed,
          intensityTechniqueName,
          isFundamental: isFund
        });

        if (isFund && !state.isFundamental(name.trim())) {
          state.addFundamentalExercise(name.trim(), muscleGroup);
        }

        hideModal();
        addForm.reset();
        checkAndSyncFundamentalStatus('');
        if (techDetails) techDetails.classList.add('hidden');
      });
    }

    // MODIFICA DIRETTA DEL NOME ESERCIZIO INLINE
    container.querySelectorAll('.edit-ex-name-input').forEach(input => {
      const exId = input.getAttribute('data-exid');
      const saveName = () => {
        const val = input.value.trim();
        if (val) {
          state.updateExerciseInSession(currentSession.id, exId, { name: val });
        }
      };
      input.addEventListener('change', saveName);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveName();
          input.blur();
        }
      });
    });

    container.querySelectorAll('.focus-name-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-exid');
        const input = container.querySelector(`.edit-ex-name-input[data-exid="${exId}"]`);
        if (input) {
          input.focus();
          input.select();
        }
      });
    });

    // Modifica rapida inline di carico, serie, reps e tecniche
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
