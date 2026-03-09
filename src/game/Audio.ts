export class AudioManager {
  ctx: AudioContext | null = null;
  initialized = false;
  bgmInterval: number | null = null;
  bgmNoteIndex = 0;
  nextNoteTime = 0;

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.initialized = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.playBGM();
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1, slideFreq?: number, startTime?: number) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const t = startTime ?? this.ctx.currentTime;

    osc.frequency.setValueAtTime(freq, t);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideFreq, t + duration);
    }

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.start(t);
    osc.stop(t + duration);
  }

  playNoise(duration: number, vol: number = 0.1) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.start(this.ctx.currentTime);
  }

  playHit() { this.playNoise(0.15, 0.3); }
  playPlayerHit() { this.playNoise(0.3, 0.5); }
  playJump() { this.playTone(300, 'sine', 0.2, 0.1, 600); }
  playDash() { this.playTone(150, 'triangle', 0.2, 0.1, 50); }
  playAttack() { this.playTone(800, 'sine', 0.1, 0.05, 200); }
  playItem() { this.playTone(600, 'sine', 0.1, 0.1, 1200); }
  
  playVictory() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playTone(261.63, 'sine', 0.2, 0.1, undefined, t);
    this.playTone(329.63, 'sine', 0.2, 0.1, undefined, t + 0.15);
    this.playTone(392.00, 'sine', 0.2, 0.1, undefined, t + 0.3);
    this.playTone(523.25, 'sine', 0.4, 0.1, undefined, t + 0.45);
  }
  
  playBGM() {
    if (!this.ctx) return;
    
    // A simple, slightly moody/adventurous arpeggio
    const notes = [
      220.00, // A3
      261.63, // C4
      329.63, // E4
      261.63, // C4
      220.00, // A3
      261.63, // C4
      329.63, // E4
      392.00, // G4
      196.00, // G3
      246.94, // B3
      293.66, // D4
      246.94, // B3
      196.00, // G3
      246.94, // B3
      293.66, // D4
      349.23, // F4
    ];
    
    const tempo = 140; 
    const noteDuration = 60 / tempo / 2; // 8th notes

    const schedule = () => {
      if (!this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
        const freq = notes[this.bgmNoteIndex % notes.length];
        
        // Play bass note
        this.playTone(freq / 2, 'triangle', noteDuration * 0.9, 0.01, undefined, this.nextNoteTime);
        // Play arpeggio note
        this.playTone(freq, 'square', noteDuration * 0.5, 0.005, undefined, this.nextNoteTime);
        
        this.nextNoteTime += noteDuration;
        this.bgmNoteIndex++;
      }
      this.bgmInterval = requestAnimationFrame(schedule);
    };
    schedule();
  }
}

export const audio = new AudioManager();
