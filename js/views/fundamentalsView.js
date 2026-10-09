import { state } from '../state.js';
import { MUSCLE_GROUPS } from '../constants.js';

/**
 * Schermata 2:
 * Peso per singola ripetizione e volume totale per ogni esercizio fondamentale.
 * L'utente definisce autonomamente i suoi esercizi fondamentali e ne monitora i progressi nel tempo
 * sia a livello di carico per singola ripetizione che di volume totale (tonnellaggio).
 */
export class FundamentalsView {
  static currentChart = null;
  static selectedFundamentalName = null;
  static metricMode = 'weight'; // 'weight' (kg per rip) | 'volume' (volume totale kg)

  static render() {
    const container = document.getElementById('fundamentals-view');
    if (!container) return;

    const user = state.getCurrentUser();
    if (!user) {
      container.innerHTML = `<div class="text-center py-12 text-zinc-400">Nessun atleta selezionato.</div>`;
      return;
    }

    const fundamentals = user.fundamentalExercises || [];

    // Se non è selezionato nessun fondamentale o quello selezionato non esiste, prendi il primo
    if (!this.selectedFundamentalName && fundamentals.length > 0) {
      this.selectedFundamentalName = fundamentals[0].name;
    } else if (fundamentals.length > 0 && !fundamentals.some(f => f.name.toLowerCase() === this.selectedFundamentalName?.toLowerCase())) {
      this.selectedFundamentalName = fundamentals[0].name;
    }

    // Estrai lo storico per l'esercizio selezionato
    const activeHistory = this.selectedFundamentalName ? state.getFundamentalHistory(this.selectedFundamentalName) : [];

    // Calcolo statistiche record
    let maxWeight = 0;
    let maxVolume = 0;
    let firstWeight = 0;
    let lastWeight = 0;

    if (activeHistory.length > 0) {
      firstWeight = activeHistory[0].weight;
      lastWeight = activeHistory[activeHistory.length - 1].weight;
      activeHistory.forEach(h => {
        if (h.weight > maxWeight) maxWeight = h.weight;
        if (h.totalVolume > maxVolume) maxVolume = h.totalVolume;
      });
    }

    const deltaPct = firstWeight > 0 ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) : 0;

    // Tabella Storica delle sessioni per questo esercizio
    const tableRowsHTML = activeHistory.slice().reverse().map(item => `
      <tr class="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
        <td class="py-3 px-3 text-xs font-bold text-zinc-200">
          ${new Date(item.date).toLocaleDateString('it-IT')}
        </td>
        <td class="py-3 px-3 text-xs text-zinc-400">
          ${item.sessionTitle}
        </td>
        <td class="py-3 px-3 text-xs text-center font-bold text-emerald-400">
          ${item.weight} kg
        </td>
        <td class="py-3 px-3 text-xs text-center text-zinc-300">
          ${item.sets} × ${item.reps}
        </td>
        <td class="py-3 px-3 text-xs text-center font-bold text-zinc-100">
          ${item.totalVolume.toLocaleString('it-IT')} kg
        </td>
        <td class="py-3 px-3 text-xs text-center">
          ${item.intensityTechniqueUsed ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              ⚡ ${item.intensityTechniqueName || 'Sì'}
            </span>
          ` : `
            <span class="text-zinc-600">-</span>
          `}
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Banner e Spiegazione Fondamentali -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                </span>
                <div>
                  <h3 class="text-lg font-heading font-bold text-zinc-100">Esercizi Fondamentali</h3>
                  <p class="text-xs text-zinc-400">Gli esercizi che ripeti a ogni allenamento e usi come riferimento per monitorare i tuoi progressi.</p>
                </div>
              </div>
            </div>

            <!-- Pulsante Aggiungi Nuovo Fondamentale -->
            <button id="open-add-fund-modal-btn" class="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>Aggiungi Fondamentale</span>
            </button>
          </div>

          <!-- Barra Selettore Esercizi Fondamentali: Menu a Tendina (Mobile-Friendly) -->
          <div class="pt-3 border-t border-zinc-800/80 space-y-3">
            <div class="flex items-center justify-between">
              <label for="select-fund-dropdown" class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                I tuoi Fondamentali definiti (${fundamentals.length}):
              </label>
              ${this.selectedFundamentalName ? `
                <span class="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                  <span>Attivo:</span>
                  <strong class="text-zinc-200">${this.selectedFundamentalName}</strong>
                </span>
              ` : ''}
            </div>

            ${fundamentals.length > 0 ? `
              <!-- Menu a Tendina (Comodo e Immediato da Mobile) -->
              <div class="flex items-center gap-2">
                <div class="relative flex-1">
                  <select id="select-fund-dropdown" class="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-bold text-xs sm:text-sm py-2.5 px-3.5 pr-10 rounded-xl border border-zinc-700 focus:outline-none focus:border-amber-400 cursor-pointer appearance-none transition-all shadow-sm">
                    ${fundamentals.map(f => {
                      const isSelected = f.name.toLowerCase() === this.selectedFundamentalName?.toLowerCase();
                      const historyCount = state.getFundamentalHistory(f.name).length;
                      return `
                        <option value="${f.name}" ${isSelected ? 'selected' : ''}>
                          ${f.name} (${f.muscleGroup || 'Fondamentale'} • ${historyCount} sedute)
                        </option>
                      `;
                    }).join('')}
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>

                ${this.selectedFundamentalName ? `
                  <button id="remove-current-fund-btn" class="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-500/30 transition-all cursor-pointer flex-shrink-0" title="Rimuovi '${this.selectedFundamentalName}' dai fondamentali">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                ` : ''}
              </div>
            ` : `
              <div class="text-xs text-zinc-500 italic">Nessun esercizio fondamentale ancora registrato. Clicca su "+ Aggiungi Fondamentale" per iniziare.</div>
            `}
          </div>
        </div>

        ${this.selectedFundamentalName ? `
          <!-- DASHBOARD PROGRESSI ESERCIZIO SELEZIONATO -->
          <div class="space-y-6">
            <!-- Record Cards dell'Esercizio -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Record Carico (1 Rep)</div>
                <div class="text-2xl font-heading font-black text-emerald-400 mt-1">
                  ${maxWeight} <span class="text-xs font-normal text-zinc-400">kg</span>
                </div>
                <div class="text-[10px] text-zinc-500 mt-0.5">massimo peso sollevato</div>
              </div>

              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Record Volume Singola Seduta</div>
                <div class="text-2xl font-heading font-black text-teal-300 mt-1">
                  ${maxVolume.toLocaleString('it-IT')} <span class="text-xs font-normal text-zinc-400">kg</span>
                </div>
                <div class="text-[10px] text-zinc-500 mt-0.5">massimo tonnellaggio (serie×rep×kg)</div>
              </div>

              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ultimo Carico Eseguito</div>
                <div class="text-2xl font-heading font-black text-zinc-100 mt-1">
                  ${lastWeight} <span class="text-xs font-normal text-zinc-400">kg</span>
                </div>
                <div class="text-[10px] text-zinc-500 mt-0.5">nella seduta più recente</div>
              </div>

              <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <div class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Progressione Totale</div>
                <div class="text-2xl font-heading font-black ${deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-1">
                  ${deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                </div>
                <div class="text-[10px] text-zinc-500 mt-0.5">dalla prima sessione registrata</div>
              </div>
            </div>

            <!-- GRAFICO TEMPORALE INTERATTIVO (CHART.JS) -->
            <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
                    <span>Andamento Temporale: ${this.selectedFundamentalName}</span>
                  </h3>
                  <p class="text-xs text-zinc-400">Monitoraggio grafico delle prestazioni registrate nel corso delle sessioni di allenamento.</p>
                </div>

                <!-- Switcher Metrica: Carico per rip (kg) vs Volume Totale (kg) -->
                <div class="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
                  <button id="fund-metric-weight-btn" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${this.metricMode === 'weight' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}">
                    🏋️‍♂️ Peso per Rip (kg)
                  </button>
                  <button id="fund-metric-volume-btn" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${this.metricMode === 'volume' ? 'bg-emerald-500 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}">
                    📦 Volume Totale (kg)
                  </button>
                </div>
              </div>

              <!-- Canvas Grafico -->
              <div class="relative h-72 sm:h-80 w-full bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60">
                <canvas id="fundamental-trend-canvas"></canvas>
              </div>
            </div>

            <!-- TABELLA STORICO CRONOLOGICO -->
            <div class="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4 sm:p-5">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-base font-bold text-zinc-100">Storico delle Sessioni</h4>
                  <p class="text-xs text-zinc-400">Tutti i carichi, serie e tecniche registrati per "${this.selectedFundamentalName}".</p>
                </div>
                <span class="text-xs text-zinc-500 font-semibold">${activeHistory.length} sedute svolte</span>
              </div>

              ${activeHistory.length > 0 ? `
                <div class="overflow-x-auto pt-1">
                  <table class="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr class="text-zinc-500 border-b border-zinc-800 text-[11px] uppercase tracking-wider font-bold">
                        <th class="py-2.5 px-3">Data</th>
                        <th class="py-2.5 px-3">Sessione</th>
                        <th class="py-2.5 px-3 text-center">Carico (kg)</th>
                        <th class="py-2.5 px-3 text-center">Serie × Rep</th>
                        <th class="py-2.5 px-3 text-center">Volume Totale</th>
                        <th class="py-2.5 px-3 text-center">Tecnica Intensità</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tableRowsHTML}
                    </tbody>
                  </table>
                </div>
              ` : `
                <div class="text-center py-8 text-zinc-500 text-xs italic">
                  Non hai ancora registrato questo esercizio in nessuna sessione di allenamento.
                  Aggiungilo alla tua sessione in "Volume Sessione" per iniziare a tracciare i dati!
                </div>
              `}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- MODALE AGGIUNGI FONDAMENTALE -->
      <div id="add-fund-modal" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">⭐</span>
              <h3 class="text-lg font-bold text-zinc-100">Nuovo Esercizio Fondamentale</h3>
            </div>
            <button id="close-add-fund-modal-btn" class="text-zinc-400 hover:text-zinc-200 p-1 rounded-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <p class="text-xs text-zinc-400">
            Definisci un esercizio chiave che ripeti a ogni allenamento e vuoi usare come punto di riferimento per i progressi.
          </p>

          <form id="add-fund-form" class="space-y-4 pt-1">
            <div>
              <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Nome Esercizio *</label>
              <input type="text" id="fund-input-name" required placeholder="Es. Panca Piana Bilanciere, Squat, Military Press..." class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500">
            </div>

            <div>
              <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Gruppo Muscolare</label>
              <select id="fund-input-group" class="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-100 focus:outline-none focus:border-emerald-500">
                ${MUSCLE_GROUPS.map(mg => `<option value="${mg.name}">${mg.icon} ${mg.name}</option>`).join('')}
              </select>
            </div>

            <div class="pt-2 flex gap-3">
              <button type="button" id="cancel-fund-modal-btn" class="py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs hover:bg-zinc-700 transition-all">
                Annulla
              </button>
              <button type="submit" class="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-zinc-950 font-bold text-xs hover:from-amber-400 hover:to-emerald-400 transition-all shadow-lg shadow-amber-500/20">
                Salva Fondamentale
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners(container, activeHistory);
    this.renderChart(activeHistory);
  }

  static attachEventListeners(container, activeHistory) {
    // Cambio fondamentale selezionato tramite Menu a Tendina
    const fundDropdown = container.querySelector('#select-fund-dropdown');
    if (fundDropdown) {
      fundDropdown.addEventListener('change', (e) => {
        this.selectedFundamentalName = e.target.value;
        this.render();
      });
    }

    // Rimozione fondamentale selezionato tramite pulsante dropdown
    const removeCurrentBtn = container.querySelector('#remove-current-fund-btn');
    if (removeCurrentBtn && this.selectedFundamentalName) {
      removeCurrentBtn.addEventListener('click', () => {
        const name = this.selectedFundamentalName;
        if (confirm(`Rimuovere "${name}" dalla lista degli esercizi fondamentali?`)) {
          state.removeFundamentalExercise(name);
          this.selectedFundamentalName = null;
          this.render();
        }
      });
    }

    // Toggle metrica grafico
    const weightBtn = container.querySelector('#fund-metric-weight-btn');
    const volumeBtn = container.querySelector('#fund-metric-volume-btn');

    if (weightBtn && volumeBtn) {
      weightBtn.addEventListener('click', () => {
        this.metricMode = 'weight';
        this.render();
      });
      volumeBtn.addEventListener('click', () => {
        this.metricMode = 'volume';
        this.render();
      });
    }

    // Modale Aggiungi Fondamentale
    const modal = container.querySelector('#add-fund-modal');
    const openBtn = container.querySelector('#open-add-fund-modal-btn');
    const closeBtn = container.querySelector('#close-add-fund-modal-btn');
    const cancelBtn = container.querySelector('#cancel-fund-modal-btn');
    const form = container.querySelector('#add-fund-form');

    const showModal = () => { if (modal) modal.classList.remove('hidden'); };
    const hideModal = () => { if (modal) modal.classList.add('hidden'); };

    if (openBtn) openBtn.addEventListener('click', showModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = container.querySelector('#fund-input-name').value;
        const group = container.querySelector('#fund-input-group').value;
        if (name.trim()) {
          state.addFundamentalExercise(name, group);
          this.selectedFundamentalName = name.trim();
          hideModal();
          this.render();
        }
      });
    }
  }

  static renderChart(history) {
    const canvas = document.getElementById('fundamental-trend-canvas');
    if (!canvas || !window.Chart) return;

    if (this.currentChart) {
      this.currentChart.destroy();
      this.currentChart = null;
    }

    if (!history || history.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#71717a';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Nessuna sessione registrata ancora per questo esercizio.', canvas.width / 2 || 150, 100);
      return;
    }

    const isVolume = this.metricMode === 'volume';

    // Ordina in senso cronologico ascendente
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Base temporale in giorni: la prima sessione è il Giorno 0
    const minDateObj = new Date(sorted[0].date);
    minDateObj.setHours(0, 0, 0, 0);
    const minTime = minDateObj.getTime();

    const maxDateObj = new Date(sorted[sorted.length - 1].date);
    maxDateObj.setHours(0, 0, 0, 0);
    const totalSpanDays = Math.max(1, Math.round((maxDateObj.getTime() - minTime) / 86400000));

    // Punti reali mappati su scala lineare continua (1 unità = 1 giorno solare)
    const dataPoints = sorted.map(h => {
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      const dayOffset = Math.round((d.getTime() - minTime) / 86400000);
      return {
        x: dayOffset,
        y: isVolume ? h.totalVolume : h.weight,
        rawItem: h
      };
    });

    const datasets = [
      {
        label: isVolume ? 'Volume Totale Effettivo (kg)' : 'Carico Eseguito (kg)',
        data: dataPoints,
        borderColor: isVolume ? '#14b8a6' : '#10b981',
        backgroundColor: isVolume ? 'rgba(20, 184, 166, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        borderWidth: 3,
        pointBackgroundColor: isVolume ? '#14b8a6' : '#10b981',
        pointBorderColor: '#ffffff',
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.2,
        fill: true,
        order: 2
      }
    ];

    // Predizione sovraccarico progressivo per la prossima seduta (se abbiamo almeno 2 sessioni)
    let maxChartDays = totalSpanDays;
    if (sorted.length >= 2) {
      const lastPoint = dataPoints[dataPoints.length - 1];
      const avgInterval = Math.max(2, Math.round(totalSpanDays / (sorted.length - 1)));
      const nextDayOffset = lastPoint.x + avgInterval;
      maxChartDays = nextDayOffset;

      const lastVal = lastPoint.y;
      const trendDiff = (lastVal - dataPoints[0].y) / Math.max(1, (sorted.length - 1));
      const predictedVal = isVolume
        ? Math.round(lastVal + Math.max(lastVal * 0.03, trendDiff > 0 ? trendDiff * 0.7 : 10))
        : Math.round((lastVal + (lastVal >= 40 ? 2.5 : 1.25)) * 10) / 10;

      const projectedDate = new Date(minTime + nextDayOffset * 86400000);

      datasets.push({
        label: isVolume ? '🔮 Predizione Volume (+3/5%)' : '🔮 Predizione Carico (+2.5kg)',
        data: [
          { x: lastPoint.x, y: lastPoint.y, isProjectionAnchor: true, rawItem: lastPoint.rawItem },
          { x: nextDayOffset, y: predictedVal, isProjection: true, projectedDate, rawItem: { date: projectedDate.toISOString().slice(0, 10), sessionTitle: 'Prossima Sessione Stimata', weight: predictedVal, reps: lastPoint.rawItem.reps, sets: lastPoint.rawItem.sets, totalVolume: predictedVal } }
        ],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0,
        fill: false,
        order: 1
      });
    }

    const ctx = canvas.getContext('2d');
    this.currentChart = new window.Chart(ctx, {
      type: 'line',
      data: {
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: {
              color: '#d4d4d8',
              font: { size: 11, weight: '600' },
              boxWidth: 14
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
                if (pt.isProjection) {
                  const d = pt.projectedDate;
                  const dStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                  return `🔮 PROIEZIONE STIMATA: ${dStr} (Giorno +${pt.x})`;
                }
                const item = pt.rawItem;
                const d = new Date(item.date);
                const dStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                return `📅 ${dStr} (Giorno +${pt.x} dall'inizio) • ${item.sessionTitle}`;
              },
              label: (context) => {
                const pt = context.raw;
                if (pt.isProjection) {
                  return [
                    ` Target Previsto: ${pt.y} kg`,
                    ` Stima basata sul sovraccarico progressivo`
                  ];
                }
                const item = pt.rawItem;
                return [
                  ` Carico: ${item.weight} kg`,
                  ` Serie e Rip: ${item.sets} × ${item.reps}`,
                  ` Volume Seduta: ${item.totalVolume.toLocaleString('it-IT')} kg`,
                  item.intensityTechniqueUsed ? ` ⚡ Tecnica: ${item.intensityTechniqueName || 'Sì'}` : ''
                ].filter(Boolean);
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: maxChartDays + 1,
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
              callback: (val) => `${val} kg`
            }
          }
        }
      }
    });
  }
}
