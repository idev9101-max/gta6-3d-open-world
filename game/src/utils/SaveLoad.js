// SOLMAR NIGHTS - save / load persistence via localStorage

var SaveLoad = {
    STORAGE_KEY: 'solmar_nights_save_v1',
    DEFAULTS: {
        money: 0,
        missionsCompleted: 0,
        missionFlags: {},
        highScore: 0,
        playedBefore: false,
        settings: {
            masterVolume: 0.8,
            sfxVolume: 1.0,
            musicVolume: 0.6,
            minimapToggle: true
        }
    },

    load: function () {
        try {
            var raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return JSON.parse(JSON.stringify(this.DEFAULTS));
            var data = JSON.parse(raw);
            var out = JSON.parse(JSON.stringify(this.DEFAULTS));
            for (var k in data) {
                if (k === 'settings') {
                    out.settings = out.settings || {};
                    for (var s in data.settings) out.settings[s] = data.settings[s];
                } else {
                    out[k] = data[k];
                }
            }
            return out;
        } catch (e) {
            console.warn('SaveLoad load failed', e);
            return JSON.parse(JSON.stringify(this.DEFAULTS));
        }
    },

    save: function (data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('SaveLoad save failed', e);
            return false;
        }
    },

    clear: function () {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) {}
    },

    hasSave: function () {
        try {
            return localStorage.getItem(this.STORAGE_KEY) !== null;
        } catch (e) {
            return false;
        }
    }
};
