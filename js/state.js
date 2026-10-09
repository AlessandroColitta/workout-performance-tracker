import { MUSCLE_GROUPS } from './constants.js';
import { cloudSync } from './cloudSync.js';

const STORAGE_KEY = 'workout_tracker_app_v2';

/**
 * Gestore globale dello stato applicativo:
 * - Profili utenti (Nome e Cognome)
 * - Sessioni di allenamento con data e lista esercizi
 * - Volume totale per gruppo muscolare (Tonnellaggio e Serie)
 * - Esercizi fondamentali definiti autonomamente e loro progressi
 * - Sincronizzazione Cloud automatica
 */
class StateManager {
  constructor() {
    this.listeners = [];
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.users)) {
          return {
            users: parsed.users,
            currentUserId: parsed.currentUserId || null,
            currentSessionId: null,
            activeTab: 'volume'
          };
        }
      }
    } catch (e) {
      console.error('Errore nel caricamento del database locale:', e);
    }

    // Se esiste una versione precedente v1, effettua la migrazione morbida degli utenti
    try {
      const oldV1 = localStorage.getItem('recomp_mesocycle_app_v1');
      if (oldV1) {
        const parsedV1 = JSON.parse(oldV1);
        if (parsedV1 && Array.isArray(parsedV1.users) && parsedV1.users.length > 0) {
          const migratedUsers = parsedV1.users.map(u => ({
            id: u.id || ('usr_' + Date.now()),
            firstName: u.firstName || 'Atleta',
            lastName: u.lastName || '',
            fullName: u.fullName || `${u.firstName || 'Atleta'} ${u.lastName || ''}`.trim(),
            createdAt: u.createdAt || new Date().toISOString(),
            fundamentalExercises: [
              { id: 'fund_panca', name: 'Panca Piana Bilanciere', muscleGroup: 'Petto' },
              { id: 'fund_squat', name: 'Squat Bilanciere (Back)', muscleGroup: 'Quadricipiti' },
              { id: 'fund_trazioni', name: 'Trazioni alla Sbarra', muscleGroup: 'Dorso' }
            ],
            sessions: []
          }));
          return {
            users: migratedUsers,
            currentUserId: null,
            currentSessionId: null,
            activeTab: 'volume'
          };
        }
      }
    } catch (err) {}

    return {
      users: [],
      currentUserId: null,
      currentSessionId: null,
      activeTab: 'volume'
    };
  }

  save() {
    try {
      const dataToSave = {
        users: this.state.users,
        currentUserId: this.state.currentUserId,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      cloudSync.pushStateToCloud();
    } catch (e) {
      console.error('Errore nel salvataggio:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Errore listener stato:', err);
      }
    }
  }

  getCurrentUser() {
    if (!this.state.currentUserId) return null;
    return this.state.users.find(u => u.id === this.state.currentUserId) || null;
  }

  /**
   * Crea un nuovo atleta con solo Nome e Cognome.
   */
  createUser(firstName, lastName) {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst || !cleanLast) return null;

    const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newUser = {
      id,
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName: `${cleanFirst} ${cleanLast}`,
      createdAt: new Date().toISOString(),
      fundamentalExercises: [
        { id: 'fund_' + Date.now() + '_1', name: 'Panca Piana Bilanciere', muscleGroup: 'Petto' },
        { id: 'fund_' + Date.now() + '_2', name: 'Squat Bilanciere', muscleGroup: 'Quadricipiti' },
        { id: 'fund_' + Date.now() + '_3', name: 'Trazioni alla Sbarra', muscleGroup: 'Dorso' }
      ],
      sessions: []
    };

    this.state.users.push(newUser);
    this.state.currentUserId = newUser.id;
    this.state.currentSessionId = null;
    this.state.activeTab = 'volume';
    this.save();
    return newUser;
  }

  selectUser(userId) {
    if (this.state.users.some(u => u.id === userId)) {
      this.state.currentUserId = userId;
      this.state.currentSessionId = null;
      this.state.activeTab = 'volume';
      this.save();
    }
  }

  logoutUser() {
    this.state.currentUserId = null;
    this.state.currentSessionId = null;
    this.save();
  }

  deleteUser(userId) {
    this.state.users = this.state.users.filter(u => u.id !== userId);
    if (this.state.currentUserId === userId) {
      this.state.currentUserId = null;
      this.state.currentSessionId = null;
    }
    this.save();
  }

  setActiveTab(tab) {
    this.state.activeTab = tab;
    this.notify();
  }

  /* ========================================================
     GESTIONE SESSIONI DI ALLENAMENTO
     ======================================================== */

  getCurrentSession() {
    const user = this.getCurrentUser();
    if (!user || !user.sessions) return null;

    if (this.state.currentSessionId) {
      const found = user.sessions.find(s => s.id === this.state.currentSessionId);
      if (found) return found;
    }

    // Se nessuna sessione è selezionata esplicitamente, prendi la più recente
    if (user.sessions.length > 0) {
      return user.sessions[0];
    }

    return null;
  }

  setCurrentSession(sessionId) {
    this.state.currentSessionId = sessionId;
    this.notify();
  }

  /**
   * Crea una nuova sessione per l'atleta.
   */
  createSession(date = null, title = '') {
    const user = this.getCurrentUser();
    if (!user) return null;

    if (!Array.isArray(user.sessions)) user.sessions = [];

    const sessDate = date || new Date().toISOString().split('T')[0];
    const sessionCount = user.sessions.length + 1;
    const newSession = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: sessDate,
      title: title ? title.trim() : `Allenamento #${sessionCount}`,
      notes: '',
      exercises: []
    };

    user.sessions.unshift(newSession); // Metti in cima per ordine cronologico
    this.state.currentSessionId = newSession.id;
    this.save();
    return newSession;
  }

  /**
   * Duplica una qualsiasi sessione specifica (identificata da sourceSessionId).
   * @param {string} sourceSessionId - ID della sessione sorgente da cui copiare gli esercizi.
   * @param {object} options - Opzioni:
   *   - targetSessionId: se specificato, importa/copia gli esercizi nella sessione indicata.
   *   - replaceExisting: boolean, se true sostituisce gli esercizi esistenti nella sessione target.
   *   - date: data YYYY-MM-DD per la nuova sessione (default: oggi).
   *   - title: titolo per la nuova sessione (default: `${sourceSession.title} (Copia)`).
   */
  duplicateSession(sourceSessionId, options = {}) {
    const user = this.getCurrentUser();
    if (!user || !user.sessions || user.sessions.length === 0) return null;

    const sourceSession = user.sessions.find(s => s.id === sourceSessionId);
    if (!sourceSession || !Array.isArray(sourceSession.exercises)) return null;

    const clonedExercises = sourceSession.exercises.map(ex => ({
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      weight: ex.weight || 0,
      reps: ex.reps || 8,
      sets: ex.sets || 3,
      intensityTechniqueUsed: !!ex.intensityTechniqueUsed,
      intensityTechniqueName: ex.intensityTechniqueName || '',
      isFundamental: !!ex.isFundamental
    }));

    // Se è specificata una sessione di destinazione esistente (es. importa in questa scheda)
    if (options.targetSessionId) {
      const targetSession = user.sessions.find(s => s.id === options.targetSessionId);
      if (targetSession) {
        if (!Array.isArray(targetSession.exercises) || options.replaceExisting) {
          targetSession.exercises = clonedExercises;
        } else {
          targetSession.exercises.push(...clonedExercises);
        }
        this.save();
        return targetSession;
      }
    }

    // Altrimenti crea una nuova sessione (default: per la data odierna)
    const today = options.date || new Date().toISOString().split('T')[0];
    const newTitle = options.title || `${sourceSession.title} (Copia)`;

    const newSession = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: today,
      title: newTitle,
      notes: sourceSession.notes || '',
      exercises: clonedExercises
    };

    user.sessions.unshift(newSession);
    user.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.state.currentSessionId = newSession.id;
    this.save();
    return newSession;
  }

  /**
   * Duplica gli esercizi dell'ultima sessione creandone una nuova per oggi.
   */
  duplicateLastSession() {
    const user = this.getCurrentUser();
    if (!user || !user.sessions || user.sessions.length === 0) return null;
    return this.duplicateSession(user.sessions[0].id);
  }

  deleteSession(sessionId) {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.sessions)) return;

    user.sessions = user.sessions.filter(s => s.id !== sessionId);
    if (this.state.currentSessionId === sessionId) {
      this.state.currentSessionId = user.sessions[0]?.id || null;
    }
    this.save();
  }

  updateSessionInfo(sessionId, { date, title, notes }) {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.sessions)) return;

    const sess = user.sessions.find(s => s.id === sessionId);
    if (!sess) return;

    if (date !== undefined) sess.date = date;
    if (title !== undefined) sess.title = title;
    if (notes !== undefined) sess.notes = notes;

    // Ordina le sessioni per data decrescente
    user.sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    this.save();
  }

  updateSession(sessionId, data) {
    this.updateSessionInfo(sessionId, data);
  }

  /* ========================================================
     GESTIONE ESERCIZI NELLA SESSIONE
     ======================================================== */

  addExerciseToSession(sessionId, { name, muscleGroup, weight, reps, sets, intensityTechniqueUsed, intensityTechniqueName, isFundamental }) {
    const user = this.getCurrentUser();
    if (!user) return null;

    const sess = user.sessions.find(s => s.id === sessionId);
    if (!sess) return null;

    if (!Array.isArray(sess.exercises)) sess.exercises = [];

    // Se l'esercizio è già impostato come fondamentale nell'account, o se è stato spuntato
    const isFund = this.isFundamental(name) || !!isFundamental;
    const newEx = {
      id: 'ex_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      muscleGroup: muscleGroup || 'Petto',
      weight: parseFloat(weight) || 0,
      reps: parseInt(reps, 10) || 8,
      sets: parseInt(sets, 10) || 3,
      intensityTechniqueUsed: !!intensityTechniqueUsed,
      intensityTechniqueName: intensityTechniqueName ? intensityTechniqueName.trim() : '',
      isFundamental: isFund
    };

    sess.exercises.push(newEx);
    this.save();
    return newEx;
  }

  updateExerciseInSession(sessionId, exerciseId, data) {
    const user = this.getCurrentUser();
    if (!user) return;

    const sess = user.sessions.find(s => s.id === sessionId);
    if (!sess || !sess.exercises) return;

    const ex = sess.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    if (data.name !== undefined) {
      ex.name = data.name.trim();
      ex.isFundamental = this.isFundamental(ex.name);
    }
    if (data.muscleGroup !== undefined) ex.muscleGroup = data.muscleGroup;
    if (data.weight !== undefined) ex.weight = parseFloat(data.weight) || 0;
    if (data.reps !== undefined) ex.reps = parseInt(data.reps, 10) || 0;
    if (data.sets !== undefined) ex.sets = parseInt(data.sets, 10) || 0;
    if (data.intensityTechniqueUsed !== undefined) ex.intensityTechniqueUsed = !!data.intensityTechniqueUsed;
    if (data.intensityTechniqueName !== undefined) ex.intensityTechniqueName = data.intensityTechniqueName.trim();
    if (data.isFundamental !== undefined) ex.isFundamental = !!data.isFundamental;

    this.save();
  }

  deleteExerciseFromSession(sessionId, exerciseId) {
    const user = this.getCurrentUser();
    if (!user) return;

    const sess = user.sessions.find(s => s.id === sessionId);
    if (!sess || !sess.exercises) return;

    sess.exercises = sess.exercises.filter(e => e.id !== exerciseId);
    this.save();
  }

  /**
   * Restituisce tutti i nomi di esercizi unici già registrati dall'utente per uno specifico gruppo muscolare.
   * Include gli esercizi delle sessioni passate e quelli fondamentali, utile per l'autocompletamento intelligente.
   */
  getExerciseNamesForMuscleGroup(muscleGroupName) {
    const user = this.getCurrentUser();
    if (!user) return [];

    const namesSet = new Set();
    const cleanGroup = (muscleGroupName || '').toLowerCase().trim();

    // 1. Cerca nei fondamentali definiti
    (user.fundamentalExercises || []).forEach(f => {
      if (!cleanGroup || (f.muscleGroup || '').toLowerCase().trim() === cleanGroup) {
        if (f.name) namesSet.add(f.name.trim());
      }
    });

    // 2. Cerca in tutte le sessioni registrate
    (user.sessions || []).forEach(sess => {
      (sess.exercises || []).forEach(ex => {
        if (!cleanGroup || (ex.muscleGroup || '').toLowerCase().trim() === cleanGroup) {
          if (ex.name) namesSet.add(ex.name.trim());
        }
      });
    });

    return Array.from(namesSet).sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
  }

  /* ========================================================
     GESTIONE ESERCIZI FONDAMENTALI
     ======================================================== */

  isFundamental(exerciseName) {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.fundamentalExercises)) return false;
    const clean = (exerciseName || '').trim().toLowerCase();
    return user.fundamentalExercises.some(f => f.name.trim().toLowerCase() === clean);
  }

  addFundamentalExercise(name, muscleGroup = 'Petto') {
    const user = this.getCurrentUser();
    if (!user) return null;

    if (!Array.isArray(user.fundamentalExercises)) user.fundamentalExercises = [];

    const clean = name.trim();
    if (!clean) return null;

    // Se esiste già, non duplicare
    const existing = user.fundamentalExercises.find(f => f.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;

    const newFund = {
      id: 'fund_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: clean,
      muscleGroup: muscleGroup || 'Petto',
      createdAt: new Date().toISOString()
    };

    user.fundamentalExercises.push(newFund);

    // Aggiorna flag su tutti gli esercizi esistenti nelle sessioni
    if (user.sessions) {
      user.sessions.forEach(s => {
        if (s.exercises) {
          s.exercises.forEach(e => {
            if (e.name.toLowerCase() === clean.toLowerCase()) {
              e.isFundamental = true;
            }
          });
        }
      });
    }

    this.save();
    return newFund;
  }

  removeFundamentalExercise(fundIdOrName) {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.fundamentalExercises)) return;

    const clean = (fundIdOrName || '').toLowerCase();
    const removed = user.fundamentalExercises.find(f => f.id === fundIdOrName || f.name.toLowerCase() === clean);
    if (!removed) return;

    user.fundamentalExercises = user.fundamentalExercises.filter(f => f.id !== removed.id);

    // Aggiorna flag nelle sessioni
    if (user.sessions) {
      user.sessions.forEach(s => {
        if (s.exercises) {
          s.exercises.forEach(e => {
            if (e.name.toLowerCase() === removed.name.toLowerCase()) {
              e.isFundamental = false;
            }
          });
        }
      });
    }

    this.save();
  }

  toggleFundamentalForExercise(name, muscleGroup) {
    if (this.isFundamental(name)) {
      this.removeFundamentalExercise(name);
      return false;
    } else {
      this.addFundamentalExercise(name, muscleGroup);
      return true;
    }
  }

  /**
   * Estrae lo storico cronologico di un esercizio fondamentale:
   * restituisce un array ordinato per data con: { date, weight, reps, sets, totalVolume, intensityUsed, intensityName, sessionTitle }
   */
  getFundamentalHistory(fundamentalName) {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.sessions)) return [];

    const clean = (fundamentalName || '').toLowerCase().trim();
    const history = [];

    // Esamina le sessioni in ordine cronologico ascendente per il grafico
    const sorted = [...user.sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(sess => {
      const match = (sess.exercises || []).find(e => e.name.toLowerCase().trim() === clean);
      if (match) {
        const weight = parseFloat(match.weight) || 0;
        const reps = parseInt(match.reps, 10) || 0;
        const sets = parseInt(match.sets, 10) || 0;
        const totalVolume = weight * reps * sets; // Tonnellaggio = serie * rep * kg

        history.push({
          date: sess.date,
          sessionTitle: sess.title,
          exerciseName: match.name,
          muscleGroup: match.muscleGroup,
          weight,
          reps,
          sets,
          totalVolume: Math.round(totalVolume),
          intensityTechniqueUsed: !!match.intensityTechniqueUsed,
          intensityTechniqueName: match.intensityTechniqueName || ''
        });
      }
    });

    return history;
  }

  /* ========================================================
     CALCOLO VOLUMI PER GRUPPO MUSCOLARE DELLA SESSIONE
     ======================================================== */

  /**
   * Calcola il Volume Totale per ciascuno degli 8 Gruppi Muscolari nella sessione fornita:
   * - Tonnellaggio totale in kg (somma di: serie * rip * peso)
   * - Serie allenanti totali
   * - Numero di esercizi
   */
  getSessionMuscleVolumes(session) {
    const result = {};
    MUSCLE_GROUPS.forEach(m => {
      result[m.name] = {
        group: m,
        totalTonnage: 0, // kg totali sollevati
        totalSets: 0,    // serie totali
        totalReps: 0,    // ripetizioni totali
        exerciseCount: 0,
        exercises: []
      };
    });

    if (!session || !Array.isArray(session.exercises)) {
      return result;
    }

    session.exercises.forEach(ex => {
      const gName = ex.muscleGroup || 'Petto';
      if (!result[gName]) {
        result[gName] = {
          group: { id: 'altro', name: gName, color: 'zinc', hex: '#71717a', icon: '⚡' },
          totalTonnage: 0,
          totalSets: 0,
          totalReps: 0,
          exerciseCount: 0,
          exercises: []
        };
      }

      const w = parseFloat(ex.weight) || 0;
      const r = parseInt(ex.reps, 10) || 0;
      const s = parseInt(ex.sets, 10) || 0;
      const tonnage = s * r * w;

      result[gName].totalTonnage += tonnage;
      result[gName].totalSets += s;
      result[gName].totalReps += (s * r);
      result[gName].exerciseCount += 1;
      result[gName].exercises.push(ex);
    });

    return result;
  }

  /**
   * Restituisce la cronologia temporale ordinata dei volumi per ciascun gruppo muscolare attraverso tutte le sessioni:
   */
  getMuscleGroupTimeline() {
    const user = this.getCurrentUser();
    if (!user || !Array.isArray(user.sessions) || user.sessions.length === 0) return [];

    const sorted = [...user.sessions].sort((a, b) => new Date(a.date) - new Date(b.date));

    return sorted.map(sess => {
      const volMap = this.getSessionMuscleVolumes(sess);
      return {
        sessionId: sess.id,
        date: sess.date,
        title: sess.title,
        volumes: volMap
      };
    });
  }

  /* ========================================================
     BACKUP & EXPORT JSON
     ======================================================== */

  exportDatabaseJSON() {
    return JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      users: this.state.users,
      currentUserId: this.state.currentUserId
    }, null, 2);
  }

  importDatabaseJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data && Array.isArray(data.users)) {
        this.state.users = data.users;
        this.state.currentUserId = data.currentUserId || (data.users[0]?.id || null);
        this.state.currentSessionId = null;
        this.save();
        return { success: true, count: data.users.length };
      }
      return { success: false, error: 'Formato file JSON non valido' };
    } catch (e) {
      return { success: false, error: 'Errore di parsing JSON: ' + e.message };
    }
  }
}

export const state = new StateManager();
