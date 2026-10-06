import { state } from '../state.js';

/**
 * Schermata Iniziale:
 * L'utente sceglie il suo profilo da una lista di atleti registrati.
 * Se non presente, una sezione dedicata e snella permette di creare un nuovo profilo con Nome e Cognome.
 */
export class LandingView {
  static render() {
    const container = document.getElementById('landing-view');
    if (!container) return;

    const users = state.state.users || [];

    const usersListHTML = users.length > 0 ? `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        ${users.map(u => {
          const initials = `${(u.firstName || '').charAt(0)}${(u.lastName || '').charAt(0)}`.toUpperCase() || '?';
          const sessionCount = (u.sessions || []).length;
          const lastSessionDate = u.sessions && u.sessions[0]?.date ? new Date(u.sessions[0].date).toLocaleDateString('it-IT') : 'Nessuna';

          return `
            <div class="user-card group bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 shadow-lg hover:shadow-emerald-950/20 flex flex-col justify-between cursor-pointer" data-userid="${u.id}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 font-black text-base flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    ${initials}
                  </div>
                  <div>
                    <h4 class="font-heading font-bold text-base text-zinc-100 group-hover:text-emerald-400 transition-colors">${u.fullName}</h4>
                    <span class="text-xs text-zinc-400 font-medium">Registrato</span>
                  </div>
                </div>
                <button class="delete-user-quick-btn text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors" data-userid="${u.id}" data-name="${u.fullName}" title="Elimina profilo">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>

              <div class="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>${sessionCount} sessioni</span>
                </div>
                <div>Ultimo: <strong class="text-zinc-300">${lastSessionDate}</strong></div>
              </div>

              <div class="mt-3">
                <button class="select-user-action-btn w-full py-2 px-3 rounded-xl bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-zinc-950 text-zinc-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm">
                  <span>Accedi al Profilo</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : `
      <div class="text-center py-10 px-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
        <div class="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        </div>
        <p class="text-sm font-bold text-zinc-200">Nessun profilo registrato</p>
        <p class="text-xs text-zinc-400 mt-1">Crea il tuo profilo atleta qui sotto per iniziare a monitorare i tuoi allenamenti.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-8 py-4 sm:py-8">
        <!-- Banner Intestazione -->
        <div class="text-center space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-2">
            <span>⚡ Workout Performance Tracker</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-heading font-black text-zinc-100 tracking-tight">
            Seleziona il tuo Profilo Atleta
          </h2>
          <p class="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Scegli il tuo nome dalla lista per visualizzare i volumi della sessione e l'andamento degli esercizi fondamentali.
          </p>
        </div>

        <!-- Lista Profili Esistenti -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              <span>Atleti Registrati (${users.length})</span>
            </h3>
          </div>
          ${usersListHTML}
        </div>

        <!-- Sezione Limitata e Dedicata per Creare Nuovo Profilo -->
        <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-zinc-100">Non sei in lista? Crea Nuovo Profilo</h3>
              <p class="text-xs text-zinc-400">Inserisci solo nome e cognome per creare il tuo spazio isolato.</p>
            </div>
          </div>

          <form id="landing-create-user-form" class="space-y-4 pt-1">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="new-first-name" class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Nome *</label>
                <input type="text" id="new-first-name" required placeholder="Es. Alessandro" class="w-full bg-zinc-800 border border-zinc-700/80 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-zinc-100 focus:outline-none transition-colors">
              </div>
              <div>
                <label for="new-last-name" class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Cognome *</label>
                <input type="text" id="new-last-name" required placeholder="Es. Rossi" class="w-full bg-zinc-800 border border-zinc-700/80 focus:border-emerald-500 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-zinc-100 focus:outline-none transition-colors">
              </div>
            </div>

            <div class="pt-1">
              <button type="submit" class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Crea Profilo ed Entra</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  }

  static attachEventListeners(container) {
    // Click su card utente
    container.querySelectorAll('.user-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Se ha cliccato sul cestino di eliminazione, non aprire
        if (e.target.closest('.delete-user-quick-btn')) return;
        const userId = card.getAttribute('data-userid');
        state.selectUser(userId);
      });
    });

    // Eliminazione utente
    container.querySelectorAll('.delete-user-quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = btn.getAttribute('data-userid');
        const userName = btn.getAttribute('data-name');
        if (confirm(`Sei sicuro di voler eliminare il profilo di "${userName}" e tutti i suoi dati di allenamento?`)) {
          state.deleteUser(userId);
        }
      });
    });

    // Form di creazione nuovo utente
    const form = container.querySelector('#landing-create-user-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const first = container.querySelector('#new-first-name').value;
        const last = container.querySelector('#new-last-name').value;
        if (first.trim() && last.trim()) {
          state.createUser(first, last);
        }
      });
    }
  }
}
