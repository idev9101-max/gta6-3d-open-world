// Object Pool for performance
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 0) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = new Set();
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }

    acquire() {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            obj = this.createFn();
        }
        this.active.add(obj);
        return obj;
    }

    release(obj) {
        if (this.active.has(obj)) {
            this.active.delete(obj);
            if (this.resetFn) this.resetFn(obj);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        for (const obj of this.active) {
            if (this.resetFn) this.resetFn(obj);
            this.pool.push(obj);
        }
        this.active.clear();
    }

    getActive() {
        return Array.from(this.active);
    }

    getPoolSize() {
        return this.pool.length;
    }

    getActiveCount() {
        return this.active.size;
    }
}

// Pool manager for multiple pool types
class PoolManager {
    constructor() {
        this.pools = new Map();
    }

    createPool(name, createFn, resetFn, initialSize = 0) {
        this.pools.set(name, new ObjectPool(createFn, resetFn, initialSize));
        return this.pools.get(name);
    }

    getPool(name) {
        return this.pools.get(name);
    }

    acquire(name) {
        const pool = this.pools.get(name);
        return pool ? pool.acquire() : null;
    }

    release(name, obj) {
        const pool = this.pools.get(name);
        if (pool) pool.release(obj);
    }

    releaseAll(name) {
        const pool = this.pools.get(name);
        if (pool) pool.releaseAll();
    }
}

window.ObjectPool = ObjectPool;
window.PoolManager = PoolManager;