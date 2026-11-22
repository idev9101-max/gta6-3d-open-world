// SOLMAR NIGHTS - generic object pool for bullets, particles, shell casings, etc.

var Pool = function (create, onAcquire, onRelease, maxSize) {
    this.create = create;
    this.onAcquire = onAcquire || function () {};
    this.onRelease = onRelease || function () {};
    this.maxSize = maxSize || 512;
    this.available = [];
    this.inUse = [];
};

Pool.prototype.acquire = function () {
    var obj;
    if (this.available.length > 0) {
        obj = this.available.pop();
    } else if (this.inUse.length < this.maxSize) {
        obj = this.create();
    } else {
        return null;
    }
    this.inUse.push(obj);
    this.onAcquire(obj);
    return obj;
};

Pool.prototype.release = function (obj) {
    var idx = this.inUse.indexOf(obj);
    if (idx === -1) return;
    this.inUse.splice(idx, 1);
    this.available.push(obj);
    this.onRelease(obj);
};

Pool.prototype.releaseAll = function () {
    while (this.inUse.length > 0) {
        this.release(this.inUse[0]);
    }
};

Pool.prototype.update = function (dt, updateFn) {
    // updateFn(obj, dt) should return true if the object is dead and should be released
    for (var i = this.inUse.length - 1; i >= 0; i--) {
        var obj = this.inUse[i];
        if (updateFn(obj, dt) === true) {
            this.release(obj);
        }
    }
};

Pool.prototype.forEachActive = function (fn) {
    for (var i = 0; i < this.inUse.length; i++) {
        fn(this.inUse[i]);
    }
};

Pool.prototype.size = function () {
    return this.inUse.length;
};
