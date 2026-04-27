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

### Real-time append-only ASR

Quiet Scribe treats transcription as an append-only stream of ASR messages:

- partial ASR results update a live draft segment
- final ASR results are committed as ordered transcript segments in IndexedDB
- existing final segments are not overwritten by later ASR output
- stopping recording, starting another chunk, or switching model/provider does not clear saved transcript segments
- deletion only happens from an explicit Delete transcript segment action

The session UI renders final transcript segments like a chat stream. The current live draft appears below the final list in a distinct live ASR colour so unstable text is visually separate from saved transcript text.

The browser-local path uses microphone capture through `navigator.mediaDevices.getUserMedia({ audio: ... })` and `MediaRecorder` timeslices for short live audio chunks. The chunked Transformers.js worker emits normalized internal ASR messages, and the app is prepared for true partial/final streaming providers through the shared `AsrProvider` interface. A local WebSocket ASR service can emit messages in this shape:

```json
{ "type": "partial", "sessionId": "session-id", "segmentId": "segment-id", "text": "live words" }
```

```json
{ "type": "final", "sessionId": "session-id", "segmentId": "segment-id", "text": "final words", "confidence": 0.92, "model": "granite-4.0-1b-speech" }
```

Configure ASR with Vite-exposed environment variables:

```bash
VITE_ASR_PROVIDER=local-websocket
VITE_ASR_MODEL=granite-4.0-1b-speech
VITE_ASR_WEBSOCKET_URL=ws://localhost:8765/asr
VITE_ASR_SAMPLE_RATE=16000
VITE_ASR_ENABLE_PARTIALS=true
```

`OPENAI_MODEL=gpt-5.5` is reserved for future non-ASR OpenAI chat, reasoning, or summarisation usage. ASR model selection stays separate through `VITE_ASR_PROVIDER` and `VITE_ASR_MODEL`.

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

## GitHub Pages deployment

This repo already contains a GitHub Pages workflow in [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml), but the repository must also be configured correctly in GitHub.

### Required GitHub setting

In `Settings -> Pages`, set **Source** to **GitHub Actions**.

If Pages is left on `Deploy from a branch`, GitHub will publish the raw repository root instead of the built `dist` artifact. In this repo that means GitHub serves the source [index.html](./index.html), which points at `/src/main.tsx`; browsers cannot run that file directly on Pages, so the app appears broken.

### Deploy flow

1. Push to `main`.
2. Open the `Actions` tab and confirm `Deploy Quiet Scribe to GitHub Pages` succeeds.
3. After deployment, load `https://andrewbartlett-ama.github.io/ONNX/`.

### Local Pages verification

Use the Pages-style build before pushing if you want to confirm the base path is correct:

```bash
npm run build:pages
npm run preview
```

Then open `/ONNX/` on the local preview server and verify the generated [dist/index.html](./dist/index.html) references `/ONNX/assets/...`.
