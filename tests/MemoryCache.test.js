import MemoryCache from '../src/MemoryCache';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const sleepSetValue = async (sleepMs, value) => {
    console.log('starting wait for sleepSetValue: ' + value);
    await sleep(sleepMs);
    console.log('setting sleepSetValue: ' + value);
    return value;
};

describe.concurrent('MemoryCache Tests', () => {
    test('Multiple lazy ensures', async () => {
        const cache = new MemoryCache();

        // set an item and wait for it to expire
        cache.set('test', 'start', 1);
        await sleep(10);

        expect(cache.get('test')).toBeUndefined();
        expect(cache.get('test', true)).equals('start');

        const lazy1 = cache.ensureLazy('test', () => sleepSetValue(100, 'lazy1'));
        const lazy2 = cache.ensureLazy('test', () => sleepSetValue(100, 'lazy2'));

        // wait a bit but lazy1 should not have completed yet
        await sleep(10);
        expect(cache.get('test', true)).equals('start');

        // wait more time and now lazy1 should have finished
        await sleep(100);
        expect(cache.get('test', true)).equals('lazy1');

        const lazy3 = cache.ensureLazy('test', () => sleepSetValue(100, 'lazy3'));

        // make sure lazy2 didn't run
        await sleep(100);
        expect(cache.get('test', true)).equals('lazy1');

        const [lazy1Result, lazy2Result, lazy3Result] = await Promise.all([lazy1, lazy2, lazy3]);
        expect(cache.get('test')).equals('lazy1');
        expect(lazy1Result).equals('start');
        expect(lazy2Result).equals('start');
        expect(lazy3Result).equals('lazy1');
    });
});
