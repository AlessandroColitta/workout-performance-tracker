import { state } from './state.js';
import { LandingView } from './views/landingView.js';
import { VolumeView } from './views/volumeView.js';
import { FundamentalsView } from './views/fundamentalsView.js';
import { SettingsView } from './views/settingsView.js';
import { cloudSync } from './cloudSync.js';
import { timer } from './timer.js';

/**
 * App Controller: gestisce la navigazione tra le schermate e la reattività dello stato.
 */
class App {
  static init() {
    try {
      // Inizializza il timer di recupero
      if (timer && typeof timer.init === 'function') {
        timer.init();
      }

      // Inizializza sincronizzazione Cloud se precedentemente configurata
      if (cloudSync && typeof cloudSync.init === 'function') {
        cloudSync.init();
      }

      // Sottoscrizione alle modifiche dello stato
      state.subscribe((currentState) => {
        this.render(currentState);
      });

      // Setup listener di navigazione
      this.setupNavigation();

      // Render iniziale
      this.render(state.state);

      // Registrazione Service Worker per PWA offline
      this.registerServiceWorker();
    } catch (err) {
      console.error('Errore critico durante App.init():', err);
      // Fallback: renderizza comunque la landing view se possibile
      try {
        LandingView.render();
      } catch (e) {}
    }
  }

  static render(currentState) {
    const user = state.getCurrentUser();

    const landingContainer = document.getElementById('landing-view');
    const volumeContainer = document.getElementById('volume-view');
    const fundamentalsContainer = document.getElementById('fundamentals-view');
    const settingsContainer = document.getElementById('settings-view');
    const navBar = document.getElementById('main-nav-bar');
    const headerUserBtn = document.getElementById('header-user-btn');
    const headerUserName = document.getElementById('header-user-name');
    const headerAvatar = document.getElementById('header-avatar');

    // SE NESSUN UTENTE È SELEZIONATO -> SCHERMATA INIZIALE (LANDING VIEW)
    if (!user) {
      if (landingContainer) landingContainer.classList.remove('hidden');
      if (volumeContainer) volumeContainer.classList.add('hidden');
      if (fundamentalsContainer) fundamentalsContainer.classList.add('hidden');
      if (settingsContainer) settingsContainer.classList.add('hidden');

      if (navBar) navBar.classList.add('hidden');
      if (headerUserBtn) headerUserBtn.classList.add('hidden');

      LandingView.render();
      return;
    }

    // UTENTE SELEZIONATO -> MOSTRA LE 2 SCHERMATE PRINCIPALI
    if (landingContainer) landingContainer.classList.add('hidden');
    if (navBar) navBar.classList.remove('hidden');
    if (headerUserBtn) headerUserBtn.classList.remove('hidden');

    // Aggiorna header profilo
    if (headerUserName) headerUserName.textContent = user.fullName;
    if (headerAvatar) {
      const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() || '?';
      headerAvatar.textContent = initials;
    }

    // Gestione Tab attiva
    const activeTab = currentState.activeTab || 'volume';

    // Nascondi tutti i container
    if (volumeContainer) volumeContainer.classList.add('hidden');
    if (fundamentalsContainer) fundamentalsContainer.classList.add('hidden');
    if (settingsContainer) settingsContainer.classList.add('hidden');

    // Aggiorna classi bottoni di navigazione
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab === activeTab) {
        btn.classList.add('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/40');
        btn.classList.remove('text-zinc-400', 'border-transparent');
      } else {
        btn.classList.remove('bg-emerald-500/15', 'text-emerald-400', 'border-emerald-500/40');
        btn.classList.add('text-zinc-400', 'border-transparent');
      }
    });

    // Renderizza la vista attiva
    if (activeTab === 'volume') {
      if (volumeContainer) volumeContainer.classList.remove('hidden');
      VolumeView.render();
    } else if (activeTab === 'fundamentals') {
      if (fundamentalsContainer) fundamentalsContainer.classList.remove('hidden');
      FundamentalsView.render();
    } else if (activeTab === 'settings') {
      if (settingsContainer) settingsContainer.classList.remove('hidden');
      SettingsView.render();
    }
  }

  static setupNavigation() {
    // Click sulle schede della barra di navigazione
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        state.setActiveTab(tab);
      });
    });

    // Click sul profilo in testata per cambiare atleta o andare alle impostazioni
    const headerUserBtn = document.getElementById('header-user-btn');
    if (headerUserBtn) {
      headerUserBtn.addEventListener('click', () => {
        state.logoutUser();
      });
    }

    // Click sul badge stato cloud -> Apre sempre il modale diagnostico interattivo
    const cloudBadge = document.getElementById('cloud-status-badge');
    if (cloudBadge) {
      cloudBadge.addEventListener('click', () => {
        cloudSync.showDiagnosticModal();
      });
    }
  }

  static registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('Service Worker registrato:', reg.scope);
          })
          .catch(err => {
            console.warn('Registrazione Service Worker fallita:', err);
          });
      });
    }
  }
}

// Avvio applicazione immediato o al caricamento del DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
