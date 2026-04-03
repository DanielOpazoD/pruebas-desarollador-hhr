/**
 * Legacy service worker cleanup stub.
 *
 * Older deployments registered `/sw.js`. We keep this file so those clients
 * receive a self-destructing worker that unregisters itself and clears stale
 * caches on the next update cycle.
 */

const deleteLegacyCaches = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await deleteLegacyCaches();
      await self.registration.unregister();
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
