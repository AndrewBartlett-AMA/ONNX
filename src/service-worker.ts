/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

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
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new StaleWhileRevalidate({ cacheName: 'quietscribe-app-assets' })
)

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.pdf') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com'),
  new CacheFirst({ cacheName: 'quietscribe-static-assets' })
)

registerRoute(
  ({ url }) =>
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.onnx'),
  new NetworkFirst({ cacheName: 'quietscribe-model-assets' })
)
