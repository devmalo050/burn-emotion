type Ctx = AudioContext;

interface FireNodes {
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  crackleTimeout: ReturnType<typeof setTimeout> | null;
}

class AudioEngineImpl {
  private ctx: Ctx | null = null;
  private masterGain: GainNode | null = null;
  private fireNodes: FireNodes | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private bgmEl: HTMLAudioElement | null = null;

  ensure(): Ctx | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }

  private noiseBuffer(): AudioBuffer | null {
    const ctx = this.ensure();
    if (!ctx) return null;
    if (this.noise) return this.noise;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return buf;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(m ? 0 : 0.6, this.ctx.currentTime + 0.2);
    }
    if (this.bgmEl) {
      if (m) this.bgmEl.pause();
      else void this.bgmEl.play().catch(() => {});
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  startBgm(src = '/audio/fireplace-bgm.mp3', volume = 0.55): void {
    if (typeof window === 'undefined') return;
    if (!this.bgmEl) {
      const a = new Audio(src);
      a.loop = true;
      a.volume = volume;
      this.bgmEl = a;
    }
    if (this.muted) return;
    void this.bgmEl.play().catch(() => {});
  }

  stopBgm(): void {
    if (this.bgmEl) this.bgmEl.pause();
  }

  /** quick crackle burst for ambience or interaction */
  playCrackle(intensity = 1): void {
    if (this.muted) return;
    const ctx = this.ensure();
    const buf = this.noiseBuffer();
    if (!ctx || !buf || !this.masterGain) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 4000;
    bp.Q.value = 5 + Math.random() * 8;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    const peak = (0.05 + Math.random() * 0.1) * intensity;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04 + Math.random() * 0.06);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.15);
  }
}

export const AudioEngine = new AudioEngineImpl();
