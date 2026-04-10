# Quiet Scribe

Quiet Scribe is an installable, browser-based, offline-capable speech-to-text Progressive Web App (PWA) designed to run primarily on the user's device with minimal or no server dependency.

## Vision

Build a fast, privacy-first transcription experience that can be:

- hosted as a static site on GitHub Pages
- installed locally as a desktop-style PWA
- used with or without a continuous internet connection after initial asset/model caching
- accelerated on supported hardware using WebNN, with fallbacks for broader compatibility
- used to record, transcribe, save, review, edit, and export transcripts locally

## Primary goals

- local-first speech-to-text
- modern, polished user interface
- offline-ready installation and usage
- transcription persistence in the browser
- downloadable outputs such as TXT, Markdown, JSON, and SRT
- zero mandatory backend for the core product

## Proposed technical direction

### Hosting

Quiet Scribe should be deployed as a static site to GitHub Pages for early-stage distribution and testing.

### Runtime model strategy

Use a tiered inference strategy:

1. **WebNN first** for supported Edge/Chrome Canary environments and supported Intel hardware
2. **WebGPU second** where available and beneficial
3. **WASM fallback** for maximum resilience and offline compatibility

### Product shape

Quiet Scribe should behave like a desktop-quality utility:

- open app
- pick microphone or audio file
- transcribe locally
- review and edit transcript
- save transcript locally in browser storage
- export/download transcript in multiple formats

## Documentation included

This repository starter pack includes:

- `docs/quietscribe-product-requirements.md`
- `docs/quietscribe-architecture-design.md`
- `docs/quietscribe-ui-descriptor.md`
- `docs/quietscribe-stitch-prompt.md`

## Initial build scope

### Phase 1

- static PWA on GitHub Pages
- app manifest
- service worker
- installable shell
- microphone and file upload input
- local transcription engine
- transcript editor
- local save and export

### Phase 2

- model/backend selection diagnostics
- chunked or near-real-time transcription
- session history
- transcript templates
- timestamps and speaker-note markers

### Phase 3

- advanced export workflows
- summarisation and cleanup tools
- optional secure sync
- optional domain hosting beyond GitHub Pages

## Non-goals for the first release

- mandatory cloud account
- mandatory server-side transcription
- complex multi-user collaboration
- enterprise admin tooling

## Recommended repo structure

```text
/
  index.html
  manifest.webmanifest
  service-worker.js
  404.html
  /assets
  /icons
  /models
  /src
  /docs
```

## Deployment note

GitHub Pages is suitable for the first production-style release of the static app, but model size, bandwidth, and cross-origin isolation constraints should be monitored closely as the app grows.
