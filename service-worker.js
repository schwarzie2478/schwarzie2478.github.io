/* Treasure Hunter offline service worker.
 *
 * Strategy:
 *  - On install: pre-cache the app shell (the page, the Blazor _framework
 *    payload, the styles, the playfield background, the favicon, the
 *    card-back images) so the game can boot without a network connection.
 *  - On activate: clean up old caches.
 *  - On fetch:
 *      - For HTML navigations, fall back to the cached index.html so a
 *        cold-start offline still loads the app.
 *      - Everything else: cache-first, then network, then runtime-cache
 *        the response. The first time a card is seen it triggers a
 *        single network fetch; from then on it is served from cache.
 *  - The page can post a { type: 'WARMUP_CARDS', urls: [...] } message
 *    to populate the runtime cache with the full card set in one go.
 *
 * The cache names are versioned so a new deployment of the SW purges
 * the old caches.
 */

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `th-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `th-runtime-${CACHE_VERSION}`;

const SHELL_FILES = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/favicon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/css/app.css',
    '/PlayingField.png',
    '/TreasureHunter.styles.css',
    '/lib/bootstrap/dist/css/bootstrap.min.css',
];

const PRECACHE_CARDS = [
    // Card backs.
    '/cards/Cardbacks/Number%20Card%20Back.png',
    '/cards/Cardbacks/Boon%20Card%20Back.png',
    // Boon cards (face-up boon images, including Base Camp).
    '/cards/Boons/Boon%20Base%20Camp.png',
    '/cards/Boons/Boon%20Climbing%20rope.png',
    '/cards/Boons/Boon%20Flashlight.png',
    '/cards/Boons/Boon%20Local%20Guide.png',
    '/cards/Boons/Boon%20Map.png',
    // Number cards: Coin uses descriptive filenames; the other suits use
    // "{value:D2}-{folder}.png". This list must mirror AdventureCard.ImageFileName.
    '/cards/Number/1%20Card%20Skull%20Card%20Coin.png',
    '/cards/Number/2%20Card%20Luggage%20Coin.png',
    '/cards/Number/3%20Card%20Skull%20Card%20Coin.png',
    '/cards/Number/4%20Card%20Luggage%20Coin.png',
    '/cards/Number/5%20Card%20Skull%20Card%20Coin.png',
    '/cards/Number/6%20Card%20Luggage%20Coin.png',
    '/cards/Number/7%20Card%20Skull%20Card%20Coin.png',
    '/cards/Number/8%20Card%20Luggage%20Coin.png',
    '/cards/Number/9%20Card%20Skull%20Card%20Coin.png',
    '/cards/Number/10%20Card%20Totem%20Coin.png',
    '/cards/Number/01-grey-skull.png',
    '/cards/Number/02-grey-skull.png',
    '/cards/Number/03-grey-skull.png',
    '/cards/Number/04-grey-skull.png',
    '/cards/Number/05-grey-skull.png',
    '/cards/Number/06-grey-skull.png',
    '/cards/Number/07-grey-skull.png',
    '/cards/Number/08-grey-skull.png',
    '/cards/Number/09-grey-skull.png',
    '/cards/Number/10-grey-skull.png',
    '/cards/Number/01-red-diamond.png',
    '/cards/Number/02-red-diamond.png',
    '/cards/Number/03-red-diamond.png',
    '/cards/Number/04-red-diamond.png',
    '/cards/Number/05-red-diamond.png',
    '/cards/Number/06-red-diamond.png',
    '/cards/Number/07-red-diamond.png',
    '/cards/Number/08-red-diamond.png',
    '/cards/Number/09-red-diamond.png',
    '/cards/Number/10-red-diamond.png',
    '/cards/Number/01-blue-dagger.png',
    '/cards/Number/02-blue-dagger.png',
    '/cards/Number/03-blue-dagger.png',
    '/cards/Number/04-blue-dagger.png',
    '/cards/Number/05-blue-dagger.png',
    '/cards/Number/06-blue-dagger.png',
    '/cards/Number/07-blue-dagger.png',
    '/cards/Number/08-blue-dagger.png',
    '/cards/Number/09-blue-dagger.png',
    '/cards/Number/10-blue-dagger.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(SHELL_CACHE);
            await Promise.all(
                SHELL_FILES.map(async (url) => {
                    try {
                        const resp = await fetch(url, { cache: 'reload' });
                        if (resp.ok) await cache.put(url, resp.clone());
                    } catch (_) {}
                })
            );
            await Promise.all(
                PRECACHE_CARDS.map(async (url) => {
                    try {
                        const resp = await fetch(url, { cache: 'reload' });
                        if (resp.ok) await cache.put(url, resp.clone());
                    } catch (_) {}
                })
            );
            self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE && !k.endsWith(`-${CACHE_VERSION}`))
                    .map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    if (req.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const fresh = await fetch(req);
                    return fresh;
                } catch (_) {
                    const cache = await caches.open(SHELL_CACHE);
                    const cached = await cache.match('/index.html');
                    return cached ?? Response.error();
                }
            })()
        );
        return;
    }

    event.respondWith(
        (async () => {
            const cached = await caches.match(req);
            if (cached) return cached;
            try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok && fresh.type === 'basic') {
                    const cache = await caches.open(RUNTIME_CACHE);
                    cache.put(req, fresh.clone());
                }
                return fresh;
            } catch (_) {
                return Response.error();
            }
        })()
    );
});
