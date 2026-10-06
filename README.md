# ⚡ Workout Performance Tracker • Volume & Fondamentali

Applicazione web progressiva (PWA), mobile-first e installabile su smartphone e PC, progettata per monitorare:
1. **Il volume totale per gruppo muscolare della sessione di allenamento** (calcolando sia il tonnellaggio in kg che le serie allenanti complessive).
2. **Il peso per singola ripetizione e il volume totale per ciascun esercizio fondamentale** (definiti autonomamente dall'atleta, con grafici temporali dei progressi).

---

## 📱 Struttura delle Schermate

### 1. 👥 Schermata Iniziale (Selezione / Creazione Profilo)
- **Scelta del profilo**: una lista chiara di tutti gli atleti registrati con avatar, sessioni svolte e data dell'ultimo allenamento.
- **Creazione rapida**: sezione dedicata e snella per registrare nuovi atleti inserendo unicamente **Nome** e **Cognome**. Ciascun profilo è completamente isolato.

### 2. 📊 Schermata 1: Volume Totale per Gruppo Muscolare (Sessione)
- **Monitoraggio completo della seduta di allenamento** (con data e titolo sessione).
- **Ripartizione tra gli 8 gruppi muscolari**:
  1. *Petto*
  2. *Bicipiti*
  3. *Tricipiti*
  4. *Catena posteriore delle gambe*
  5. *Polpacci*
  6. *Quadricipiti*
  7. *Dorso*
  8. *Spalle*
- Per ciascun gruppo viene mostrato sia il **numero totale di serie** sia il **tonnellaggio complessivo in kg** ($\sum \text{serie} \times \text{rep} \times \text{peso}$).
- **Inserimento esercizi della seduta**:
  - Nome esercizio
  - Gruppo muscolare primario assegnato
  - Peso per ripetizione (kg)
  - Numero di ripetizioni per serie
  - Numero di serie
  - Tecniche di intensità (*Sì/No* con indicazione facoltativa della tecnica, es. Rest-Pause, Drop Set, Stripping, ecc.)
  - Stella ⭐ per contrassegnare rapidamente l'esercizio come fondamentale
  - Timer sonoro di recupero integrato (Web Audio API)
- **Pulsante "Duplica Ultimo Allenamento"**: consente di precompilare la nuova sessione con gli esercizi dell'ultima seduta per una compilazione istantanea in palestra.

### 3. 🎯 Schermata 2: Esercizi Fondamentali (Progressi & Trend)
- **Definizione autonoma**: l'atleta definisce quali sono i suoi esercizi fondamentali (quelli che ripete ad ogni seduta e usa come riferimento di progressione).
- **Metriche monitorate nel tempo**:
  - **Peso per singola ripetizione (kg)**: andamento del carico massimo o medio.
  - **Volume totale (kg)**: andamento del tonnellaggio nella sessione ($\text{serie} \times \text{rep} \times \text{peso}$).
- **Grafico temporale interattivo (Chart.js)** con date reali di esecuzione e tooltip dettagliati.
- **Record Personali (PR)**: Carico massimo registrato, Volume massimo in singola seduta, Progressione percentuale totale e storico completo.

---

## 🚀 Come Pubblicare su GitHub Pages (in 2 minuti)

1. Vai su [**github.com/new**](https://github.com/new) e crea un nuovo repository (es. `workout-performance-tracker`).
2. Clicca su **Add file** > **Upload files**.
3. Estrai l'archivio ZIP `workout-performance-tracker.zip` (presente nella tua cartella Download) e trascina tutti i file nel riquadro di GitHub.
4. Clicca su **Commit changes**.
5. Vai su **Settings** ⚙️ > **Pages** (nel menu laterale):
   - Sotto **Branch**, seleziona **`main`** e cartella **`/(root)`**.
   - Clicca su **Save**.
6. Dopo circa 60 secondi, il tuo sito sarà online al link:
   `https://alessandrocolitta.github.io/workout-performance-tracker/`

---

## ☁️ Sincronizzazione Cloud Automatica (Google Firebase)

1. Nel tuo progetto su [console.firebase.google.com](https://console.firebase.google.com/), apri **Impostazioni progetto** ⚙️ > scheda *Generale*.
2. In fondo, nella sezione *Le tue app*, copia il codice `firebaseConfig`.
3. Nel sito web, apri la scheda **"⚙️ Dati & Cloud"**, clicca su **"Configura Google Firebase"** e incolla il codice.
4. Apparirà il bollino verde `☁️ Cloud Attivo`: tutti i tuoi dispositivi saranno sincronizzati online in tempo reale!
