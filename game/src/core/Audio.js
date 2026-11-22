// SOLMAR NIGHTS - WebAudio synth engine (no assets). Engine hum, gunshots, sirens, thumps, blips.

var Audio = function () {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOscL = null;
    this.sirenOscH = null;
    this.sirenGain = null;
    this.sirenActive = false;
    this.enabled = false;
    this.volume = 1.0;
    this.engineTarget = 0;
    this.engineCurrent = 0;
};

Audio.prototype.init = function () {
    try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        this.ctx = new Ctx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = this.volume;
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);
        this.sfxGain.gain.value = 1.0;
        this.enabled = true;
        return true;
    } catch (e) {
        console.warn('Audio init failed', e);
        this.enabled = false;
        return false;
    }
};

Audio.prototype._ensure = function () {
    if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
    }
};

Audio.prototype.setVolume = function (v) {
    this.volume = MathUtils.clamp(v, 0, 1);
    if (this.masterGain) this.masterGain.gain.value = this.volume;
};

// ---- Engine hum (driving) ----
Audio.prototype.engineStart = function () {
    if (!this.enabled) return;
    this._ensure();
    if (this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 110;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);
    this.engineOsc.start();
    this.engineCurrent = 0;
    this.engineTarget = 0.02;
};

Audio.prototype.engineStop = function () {
    if (!this.engineGain) return;
    this.engineTarget = 0;
    var self = this;
    setTimeout(function () {
        if (self.engineOsc) {
            try { self.engineOsc.stop(); } catch (e) {}
            self.engineOsc = null;
            self.engineGain = null;
        }
    }, 600);
};

Audio.prototype.engineSetSpeed = function (normalizedSpeed) {
    if (!this.enabled) return;
    if (!this.engineOsc) this.engineStart();
    var t = MathUtils.clamp(normalizedSpeed, 0, 1);
    this.engineTarget = 0.02 + t * 0.18;
    // pitch rises with speed
    var freq = 110 + t * 260;
    if (this.engineOsc) this.engineOsc.frequency.value = freq;
};

Audio.prototype.update = function (dt) {
    if (!this.enabled || !this.engineGain) return;
    this.engineCurrent = MathUtils.lerp(this.engineCurrent, this.engineTarget, dt * 6);
    this.engineGain.gain.value = this.engineCurrent;
};

// ---- Gunshots ----
Audio.prototype.gunshot = function (type) {
    if (!this.enabled) return;
    this._ensure();
    var t = this.ctx.currentTime;
    var noise = this.ctx.createBufferSource();
    var buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i * 40);
    noise.buffer = buffer;
    var g = this.ctx.createGain();
    g.gain.value = 0.25;
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);
    // body click
    var osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = type === 'smg' ? 400 : 120;
    var og = this.ctx.createGain();
    og.gain.value = 0.08;
    og.gain.setValueAtTime(0.08, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(og);
    og.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
};

// ---- Siren wail (wanted) ----
Audio.prototype.sirenStart = function () {
    if (!this.enabled || this.sirenActive) return;
    this._ensure();
    this.sirenActive = true;
    this.sirenOscL = this.ctx.createOscillator();
    this.sirenOscL.type = 'square';
    this.sirenOscH = this.ctx.createOscillator();
    this.sirenOscH.type = 'square';
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.12;
    this.sirenOscL.connect(this.sirenGain);
    this.sirenOscH.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOscL.start();
    this.sirenOscH.start();
    this._sirenSweep();
};

Audio.prototype._sirenSweep = function () {
    if (!this.enabled || !this.sirenActive || !this.sirenOscL) return;
    var t = this.ctx.currentTime;
    this.sirenOscL.frequency.setValueAtTime(550, t);
    this.sirenOscL.frequency.exponentialRampToValueAtTime(900, t + 0.5);
    this.sirenOscH.frequency.setValueAtTime(900, t);
    this.sirenOscH.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
    var self = this;
    setTimeout(function () { self._sirenSweep(); }, 1000);
};

Audio.prototype.sirenStop = function () {
    this.sirenActive = false;
    if (this.sirenOscL) { try { this.sirenOscL.stop(); } catch (e) {} this.sirenOscL = null; }
    if (this.sirenOscH) { try { this.sirenOscH.stop(); } catch (e) {} this.sirenOscH = null; }
    if (this.sirenGain) this.sirenGain = null;
};

// ---- Collision thump ----
Audio.prototype.thump = function (intensity) {
    if (!this.enabled) return;
    this._ensure();
    var t = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60 + intensity * 80;
    var g = this.ctx.createGain();
    g.gain.value = 0.15 * intensity;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
};

// ---- Mission blip ----
Audio.prototype.blip = function (high) {
    if (!this.enabled) return;
    this._ensure();
    var t = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = high ? 1200 : 600;
    var g = this.ctx.createGain();
    g.gain.value = 0.12;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
};

// ---- Hit / hurt ----
Audio.prototype.hurt = function () {
    if (!this.enabled) return;
    this._ensure();
    var t = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    var g = this.ctx.createGain();
    g.gain.value = 0.2;
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
};
