/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const navigationRoute = new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/api\//]
})
registerRoute(navigationRoute)

registerRoute(
  ({ request }) => request.destination === 'audio',
  new CacheFirst({ cacheName: 'quietscribe-audio-assets' })
)

registerRoute(
  ({ url }) => url.pathname.endsWith('.json') || url.pathname.endsWith('.wasm'),
  new NetworkFirst({ cacheName: 'quietscribe-model-assets' })
)
