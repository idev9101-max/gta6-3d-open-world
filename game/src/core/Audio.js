// Web Audio API synth-based sound system
const ENGINE_BASE_FREQ = 60;
const ENGINE_MAX_FREQ_MULT = 120;
const ENGINE_VOLUME_BASE = 0.1;

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 1.0;
        this.sfxVolume = 1.0;
        this.musicVolume = 0.5;
        this.ambientInterval = null;
        this.init();
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = this.volume;
            
            // Resume on user interaction
            const resume = () => {
                if (this.ctx.state === 'suspended') this.ctx.resume();
                document.removeEventListener('click', resume);
                document.removeEventListener('keydown', resume);
            };
            document.addEventListener('click', resume);
            document.addEventListener('keydown', resume);
        } catch (e) {
            console.warn('Web Audio not supported:', e);
            this.enabled = false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    createOscillator(type, freq, duration, gain = 0.3, freqEnd = null) {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
        }
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    createNoise(duration, gain = 0.2, filterFreq = 2000, filterType = 'lowpass') {
        if (!this.enabled || !this.ctx) return;
        
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        source.buffer = buffer;
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        
        gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start();
    }

    // Engine sound - expected API
    createEngineSound(id) {
        if (!this.enabled || !this.ctx) return null;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = 60;
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        gain.gain.value = 0;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        this.sounds.set(id, { osc, gain, filter, baseFreq: 60 });
        return this.sounds.get(id);
    }

    stopEngineSound(id) {
        const sound = this.sounds.get(id);
        if (sound) {
            sound.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
            setTimeout(() => {
                try { sound.osc.stop(); } catch (e) {}
                this.sounds.delete(id);
            }, 500);
        }
    }

    updateEngineSound(id, rpm, speed, isPlayerVehicle = false) {
        const sound = this.sounds.get(id);
        if (!sound) return;
        const targetFreq = sound.baseFreq + rpm * ENGINE_MAX_FREQ_MULT;
        sound.osc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.1);
        const vol = MathUtils.clamp(ENGINE_VOLUME_BASE + rpm * 0.5 + Math.abs(speed) * 0.02, 0, isPlayerVehicle ? 0.6 : 0.3);
        sound.gain.gain.exponentialRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
        sound.filter.frequency.exponentialRampToValueAtTime(400 + rpm * 1500, this.ctx.currentTime + 0.1);
    }

    // Gunshot
    playGunshot(position = null) {
        if (!this.enabled) return;
        this.createOscillator('square', 150, 0.05, 0.4, 50);
        this.createNoise(0.1, 0.3, 1000, 'highpass');
        setTimeout(() => this.createOscillator('sine', 80, 0.2, 0.15), 10);
    }

    // Footstep
    playFootstep(position, isRunning = false) {
        if (!this.enabled) return;
        this.createNoise(0.05, isRunning ? 0.15 : 0.08, 800, 'bandpass');
    }

    // Collision
    playCollision(intensity) {
        if (!this.enabled) return;
        const vol = MathUtils.clamp(intensity * 0.3, 0.1, 0.6);
        this.createNoise(0.2, vol, 1000, 'bandpass');
        this.createOscillator('triangle', 120, 0.15, vol * 0.5, 60);
    }

    // Explosion
    playExplosion(position) {
        if (!this.enabled) return;
        this.createNoise(1.5, 0.5, 200, 'lowpass');
        this.createOscillator('sine', 60, 1.0, 0.4, 20);
    }

    // Siren - expected API
    createSiren(id) {
        if (!this.enabled || !this.ctx) return null;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 600;
        gain.gain.value = 0.3;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        this.sounds.set(id, { osc, gain, phase: 0 });
        return this.sounds.get(id);
    }

    updateSiren(id, active) {
        const sound = this.sounds.get(id);
        if (!sound) return;
        if (active) {
            sound.gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
            const t = this.ctx.currentTime;
            sound.osc.frequency.setValueAtTime(600 + Math.sin(sound.phase) * 400, t);
            sound.phase += 0.3;
        } else {
            sound.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
            setTimeout(() => {
                try { sound.osc.stop(); } catch (e) {}
                this.sounds.delete(id);
            }, 600);
        }
    }

    // Pickup chime
    playPickup() {
        if (!this.enabled) return;
        [523, 659, 784, 1047].forEach((freq, i) => {
            setTimeout(() => this.createOscillator('sine', freq, 0.15, 0.2), i * 50);
        });
    }

    // Mission complete
    playMissionComplete() {
        if (!this.enabled) return;
        [523, 659, 784, 1047, 1319].forEach((freq, i) => {
            setTimeout(() => this.createOscillator('triangle', freq, 0.2, 0.15), i * 80);
        });
    }

    // Busted sound
    playBusted() {
        if (!this.enabled) return;
        this.createOscillator('sawtooth', 200, 0.3, 0.3, 80);
        setTimeout(() => this.createOscillator('sawtooth', 150, 0.3, 0.3, 60), 300);
    }

    // Ambient ocean waves
    startAmbient() {
        if (!this.enabled || !this.ctx || this.ambientInterval) return;
        
        this.ambientInterval = setInterval(() => {
            if (Math.random() < 0.3) {
                this.createNoise(1.5, 0.02, 200, 'lowpass');
            }
        }, 4000);
    }

    stopAmbient() {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
    }

    setVolume(vol) {
        this.volume = MathUtils.clamp(vol, 0, 1);
        if (this.masterGain) this.masterGain.gain.value = this.volume;
    }

    setSFXVolume(vol) {
        this.sfxVolume = MathUtils.clamp(vol, 0, 1);
    }

    setMusicVolume(vol) {
        this.musicVolume = MathUtils.clamp(vol, 0, 1);
    }
}

window.AudioManager = AudioManager;