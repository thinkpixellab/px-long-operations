import SingleOperation from "./SingleOperation";

export default class MemoryCache {
    constructor({ defaultTTL = 5 * 60 * 1000, ttlByKey = {}, debug = false } = {}) {
        this.cache = {};
        this.singleOperation = new SingleOperation();

        // default time to live in ms
        this.ttlByKey = ttlByKey;
        this.defaultTTL = defaultTTL;

        // enable logging in debug mode
        this.debug = !!debug;
        //console.log('MemoryCache options: ' + JSON.stringify(options));
    }

    clear() {
        this.cache = {};
    }

    async ensure(key, valueFactory, { ttl, valueErrorRetries = 0, allowLazyRefresh = false } = {}) {
        var refreshValue = oldValue => {
            return this.singleOperation.run(key, async () => {
                let retry = 0;
                while (true) {
                    try {
                        const newValue = await valueFactory(oldValue);
                        this.set(key, newValue, ttl);
                        return newValue;
                    } catch (error) {
                        // automatically retry up to limit
                        retry++;
                        if (retry > valueErrorRetries) {
                            return Promise.reject(error);
                        }
                    }
                }
            });
        };

        var entry = key ? this.cache[key] : null;
        if (!entry) {
            return refreshValue();
        }

        if (Date.now() < entry.expires) {
            // not yet expired
            return entry.value;
        } else if (allowLazyRefresh) {
            // refresh in background, return expired result
            refreshValue(entry.value).catch(error => {
                // log but suppress any errors because they happen on a background thread
                console.error('Error refreshing cache value: ' + key);
                console.error(error);
            });
            return entry.value;
        } else {
            // refresh and wait
            return refreshValue(entry.value);
        }
    }

    ensureLazy(key, valueFactory, { ttl, valueErrorRetries = 0 } = {}) {
        return this.ensure(key, valueFactory, { ttl, valueErrorRetries, allowLazyRefresh: true });
    }

    get(key, allowExpired) {
        if (key) {
            var entry = this.cache[key];
            if (entry) {
                if (allowExpired || Date.now() < entry.expires) {
                    return entry.value;
                } else if (this.debug) {
                    console.log('expired cache entry: ' + key);
                }
            }
        }

        if (this.debug) {
            console.log('no cache entry: ' + key);
        }
        return undefined;
    }

    set(key, value, ttl) {
        // fallback to config then default ttl if not specified
        ttl = ttl || this.ttlByKey[key] || this.defaultTTL;

        var expires = Date.now() + ttl;
        this.cache[key] = new CacheEntry(value, expires);

        if (this.debug) {
            const ttlSeconds = Math.round(ttl / 1000);
            console.log('caching ' + key + ' (ttl:' + ttlSeconds + ' secs)');
        }
    }
}

class CacheEntry {
    constructor(value, expires) {
        this.value = value;
        this.expires = expires;
    }
}

