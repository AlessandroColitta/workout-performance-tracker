/**
 * Timer di recupero sonoro per la palestra con sintesi audio Web Audio API e vibrazione mobile.
 */
export class WorkoutTimer {
  constructor() {
    this.duration = 90;
    this.remaining = 90;
    this.isRunning = false;
    this.intervalId = null;
    this.audioCtx = null;
    this.exerciseName = '';
    this.onTick = null;
    this.onComplete = null;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Genera un beep acustico chiaro e piacevole.
   */
  playBeep(frequency = 880, duration = 0.15, type = 'sine') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio non riproducibile:', e);
    }
  }

  playCompletionSequence() {
    // 3 beep ascendenti
    this.playBeep(659.25, 0.12); // E5
    setTimeout(() => this.playBeep(830.61, 0.12), 150); // G#5
    setTimeout(() => this.playBeep(1046.50, 0.35), 300); // C6

    // Vibrazione smartphone
    if (navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch (e) {}
    }
  }

  start(seconds, exerciseName = '') {
    this.stop();
    this.duration = Math.max(5, parseInt(seconds, 10) || 90);
    this.remaining = this.duration;
    this.exerciseName = exerciseName;
    this.isRunning = true;
    this.getAudioContext();

    this.updateUI();

    this.intervalId = setInterval(() => {
      this.remaining--;
      
      // Beep per ultimi 3 secondi di countdown
      if (this.remaining === 3 || this.remaining === 2 || this.remaining === 1) {
        this.playBeep(523.25, 0.08); // C5 tick
      }

      this.updateUI();

      if (this.remaining <= 0) {
        this.complete();
      }
    }, 1000);
  }

  pause() {
    if (this.isRunning) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      this.updateUI();
    }
  }

  resume() {
    if (!this.isRunning && this.remaining > 0) {
      this.isRunning = true;
      this.intervalId = setInterval(() => {
        this.remaining--;
        if (this.remaining === 3 || this.remaining === 2 || this.remaining === 1) {
          this.playBeep(523.25, 0.08);
        }
        this.updateUI();
        if (this.remaining <= 0) {
          this.complete();
        }
      }, 1000);
      this.updateUI();
    }
  }

  addTime(seconds) {
    this.remaining = Math.max(5, this.remaining + seconds);
    this.duration = Math.max(this.duration, this.remaining);
    this.updateUI();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.remaining = 0;
    this.updateUI();
  }

  complete() {
    this.stop();
    this.playCompletionSequence();
    const container = document.getElementById('floating-timer');
    if (container) {
      container.classList.add('animate-bounce');
      setTimeout(() => container.classList.remove('animate-bounce'), 2500);
    }
    if (this.onComplete) this.onComplete();
  }

  formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  updateUI() {
    const container = document.getElementById('floating-timer');
    if (!container) return;

    if (this.remaining <= 0 && !this.isRunning) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');

    const timeDisplay = document.getElementById('timer-countdown-display');
    const labelDisplay = document.getElementById('timer-exercise-label');
    const playPauseBtn = document.getElementById('timer-play-pause-btn');
    const progressBar = document.getElementById('timer-progress-fill');

    if (timeDisplay) timeDisplay.textContent = this.formatTime(this.remaining);
    if (labelDisplay) labelDisplay.textContent = this.exerciseName ? `Recupero: ${this.exerciseName}` : 'Timer di Recupero';

    const percent = Math.min(100, Math.max(0, ((this.duration - this.remaining) / this.duration) * 100));
    if (progressBar) progressBar.style.width = `${percent}%`;

    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isRunning
        ? `<svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>`
        : `<svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }
  }
}

export const timer = new WorkoutTimer();
