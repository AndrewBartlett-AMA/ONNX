# Quiet Scribe starter files

This starter is designed for a static GitHub Pages deployment with:

- React + TypeScript + Vite
- installable PWA support
- offline shell caching
- a custom service worker via `vite-plugin-pwa`
- a deployment workflow for GitHub Pages

## Notes

- `public/manifest.webmanifest` is included because you asked for a standalone manifest file. The active production manifest is also defined inside `vite.config.ts` through `vite-plugin-pwa`, so you can manage it in one place while still keeping a visible manifest file in the repo.
- `src/service-worker.ts` is the service worker source file. The built output will become a generated service worker in `dist`.
- Replace the placeholder icons in `public/icons` with your final branding assets.
- Next step: add a transcription worker and model runtime adapter for WebNN, WebGPU, and WASM fallback.
