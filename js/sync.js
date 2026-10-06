import { state } from './state.js';

/**
 * Gestore per esportazione e importazione dati (JSON e CSV).
 */
export class SyncManager {
  static exportJSON() {
    const dataStr = state.exportDatabaseJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static importJSONFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = state.importDatabaseJSON(e.target.result);
        if (callback) callback(result);
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    };
    reader.onerror = () => {
      if (callback) callback({ success: false, error: 'Errore di lettura del file' });
    };
    reader.readAsText(file);
  }
}
