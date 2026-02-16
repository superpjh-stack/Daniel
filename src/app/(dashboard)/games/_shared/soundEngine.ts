/**
 * Game Sound Engine - Web Audio API synthesized sounds
 * Singleton, SSR-safe, fire-and-forget methods
 */

class GameSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  // --- Helpers ---

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15, startTime?: number) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = startTime ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  private noise(duration: number, gain = 0.08, startTime?: number) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = startTime ?? ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buffer;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + duration);
  }

  private sweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', gain = 0.12, startTime?: number) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = startTime ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  // === Shared sounds ===

  playQuizCorrect() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(523, 0.12, 'sine', 0.15, t);
    this.tone(659, 0.12, 'sine', 0.15, t + 0.1);
    this.tone(784, 0.18, 'sine', 0.18, t + 0.2);
  }

  playQuizIncorrect() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(300, 0.15, 'sawtooth', 0.1, t);
    this.tone(250, 0.2, 'sawtooth', 0.1, t + 0.12);
  }

  playStageClear() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    // C5 E5 G5 C6 ascending arpeggio
    this.tone(523, 0.15, 'triangle', 0.15, t);
    this.tone(659, 0.15, 'triangle', 0.15, t + 0.12);
    this.tone(784, 0.15, 'triangle', 0.15, t + 0.24);
    this.tone(1047, 0.3, 'triangle', 0.18, t + 0.36);
  }

  playAllClear() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    // Full celebratory sequence
    this.tone(523, 0.12, 'triangle', 0.12, t);
    this.tone(659, 0.12, 'triangle', 0.12, t + 0.1);
    this.tone(784, 0.12, 'triangle', 0.12, t + 0.2);
    this.tone(1047, 0.15, 'triangle', 0.15, t + 0.3);
    this.tone(1319, 0.15, 'triangle', 0.15, t + 0.42);
    this.tone(1568, 0.3, 'sine', 0.18, t + 0.54);
    this.noise(0.15, 0.04, t + 0.5);
  }

  playGameOver() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    // Descending minor pattern
    this.tone(400, 0.25, 'sawtooth', 0.1, t);
    this.tone(350, 0.25, 'sawtooth', 0.1, t + 0.2);
    this.tone(300, 0.25, 'sawtooth', 0.1, t + 0.4);
    this.tone(200, 0.5, 'sawtooth', 0.12, t + 0.6);
  }

  playGameStart() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(440, 0.1, 'square', 0.08, t);
    this.tone(554, 0.1, 'square', 0.08, t + 0.08);
    this.tone(659, 0.15, 'square', 0.1, t + 0.16);
  }

  playRewardClaim() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    // Coin/reward jingle
    this.tone(880, 0.08, 'sine', 0.12, t);
    this.tone(1175, 0.08, 'sine', 0.12, t + 0.06);
    this.tone(1397, 0.08, 'sine', 0.12, t + 0.12);
    this.tone(1760, 0.2, 'sine', 0.15, t + 0.18);
  }

  // === Brick Breaker ===

  playWallBounce() {
    this.tone(300, 0.04, 'sine', 0.08);
  }

  playPaddleHit() {
    this.tone(500, 0.06, 'triangle', 0.12);
  }

  playBrickBreak(type: string) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    if (type === 'quiz') {
      this.tone(700, 0.08, 'square', 0.1, t);
      this.tone(900, 0.1, 'square', 0.1, t + 0.06);
    } else if (type === 'verse') {
      this.sweep(600, 1200, 0.15, 'sine', 0.1, t);
    } else if (type === 'strong') {
      this.noise(0.06, 0.06, t);
      this.tone(400, 0.1, 'sawtooth', 0.1, t);
    } else {
      this.sweep(600, 200, 0.08, 'square', 0.08, t);
      this.noise(0.04, 0.04, t);
    }
  }

  playBrickDamage() {
    this.tone(350, 0.05, 'square', 0.06);
  }

  playBallLost() {
    this.sweep(600, 150, 0.3, 'sine', 0.12);
  }

  // === Noah's Ark ===

  playBlockMove() {
    this.tone(200, 0.03, 'sine', 0.06);
  }

  playBlockRotate() {
    this.tone(400, 0.05, 'triangle', 0.08);
  }

  playHardDrop() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(150, 0.08, 'square', 0.12, t);
    this.noise(0.06, 0.06, t);
  }

  playBlockLock() {
    this.tone(250, 0.06, 'triangle', 0.08);
  }

  playLineClear(count: number) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    if (count >= 4) {
      // Tetris! Big fanfare
      this.tone(523, 0.1, 'square', 0.12, t);
      this.tone(659, 0.1, 'square', 0.12, t + 0.08);
      this.tone(784, 0.1, 'square', 0.12, t + 0.16);
      this.tone(1047, 0.2, 'square', 0.15, t + 0.24);
      this.noise(0.1, 0.05, t + 0.2);
    } else if (count >= 2) {
      this.sweep(400, 800, 0.15, 'triangle', 0.1, t);
      this.tone(800, 0.12, 'triangle', 0.1, t + 0.12);
    } else {
      this.sweep(400, 700, 0.12, 'triangle', 0.08, t);
    }
  }

  playBalanceWarning() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(200, 0.15, 'sawtooth', 0.08, t);
    this.tone(180, 0.15, 'sawtooth', 0.08, t + 0.2);
  }

  // === David's Sling ===

  playSlingFire(power: number) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const freq = 300 + power * 400;
    const dur = 0.08 + power * 0.12;
    this.sweep(freq, freq * 1.5, dur, 'triangle', 0.12);
  }

  playWeakPointHit(subtype: string) {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    if (subtype === 'forehead') {
      // Critical hit - dramatic impact
      this.tone(800, 0.06, 'square', 0.15, t);
      this.tone(1200, 0.1, 'sine', 0.12, t + 0.04);
      this.noise(0.08, 0.08, t);
    } else {
      // Arm hit
      this.tone(600, 0.06, 'square', 0.12, t);
      this.tone(900, 0.08, 'sine', 0.1, t + 0.04);
      this.noise(0.05, 0.05, t);
    }
  }

  playBodyBounce() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(200, 0.06, 'sine', 0.08, t);
    this.tone(150, 0.08, 'sine', 0.06, t + 0.04);
  }

  playDavidDamage() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.sweep(500, 200, 0.15, 'sawtooth', 0.1, t);
    this.noise(0.08, 0.06, t);
  }

  playGoliathAttack() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.sweep(300, 100, 0.12, 'sawtooth', 0.08, t);
  }

  playPrayerPickup() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.tone(600, 0.08, 'sine', 0.1, t);
    this.tone(800, 0.1, 'sine', 0.12, t + 0.06);
  }

  playFaithActivate() {
    const ctx = this.getCtx();
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    this.sweep(400, 1200, 0.3, 'sine', 0.12, t);
    this.tone(1200, 0.2, 'triangle', 0.08, t + 0.2);
  }

  playFaithDeactivate() {
    this.sweep(800, 300, 0.2, 'sine', 0.08);
  }
}

export const soundEngine = typeof window !== 'undefined' ? new GameSoundEngine() : (new Proxy({} as GameSoundEngine, {
  get: () => () => {},
}) as GameSoundEngine);
