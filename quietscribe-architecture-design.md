# Quiet Scribe - Architecture Design Document

## 1. Architectural intent

Quiet Scribe is designed as a local-first, browser-native AI application delivered from a static web host. The architecture should prioritize privacy, responsiveness, and resilience while remaining compatible with GitHub Pages.

## 2. High-level architecture

```text
GitHub Pages
  -> Static assets
  -> PWA manifest
  -> Service worker
  -> JavaScript application
  -> AI model files

Browser runtime
  -> UI layer
  -> App state layer
  -> Audio capture layer
  -> Inference orchestration layer
  -> Backend adapters
      -> WebNN adapter
      -> WebGPU adapter
      -> WASM adapter
  -> Storage layer
      -> IndexedDB
      -> Cache Storage
  -> Export layer
```

## 3. Architectural principles

- local-first by default
- static hosting first
- progressive enhancement
- fast startup with cached shell
- graceful degradation by backend capability
- no required server for core transcription workflow

## 4. Deployment model

### Host

GitHub Pages hosts only static files.

### Build output

The application should build into a static `dist` bundle containing:

- HTML
- CSS
- JavaScript
- manifest
- service worker
- icons
- model metadata
- optionally model assets or model download references

## 5. Inference strategy

### Preferred execution order

1. WebNN
2. WebGPU
3. WASM

### Why

- WebNN can exploit supported CPU, GPU, or NPU acceleration on compatible systems.
- WebGPU can provide broader acceleration where available.
- WASM offers the most dependable fallback path for browser-only delivery.

## 6. Backend adapter model

The transcription engine should be abstracted behind a common adapter interface.

### Example interface

```ts
interface TranscriptionBackend {
  id: 'webnn' | 'webgpu' | 'wasm';
  isSupported(): Promise<boolean>;
  warmup(): Promise<void>;
  transcribe(input: AudioBuffer | Blob, options?: TranscribeOptions): Promise<TranscriptionResult>;
  dispose?(): Promise<void>;
}
```

This allows the UI and application logic to remain stable while experimentation continues.

## 7. Recommended implementation path

### Option A - ONNX Runtime Web + WebNN/WebGPU + fallback

Best fit for experimental hardware acceleration and future extensibility.

- package ONNX models
- use ONNX Runtime Web
- select `webnn` execution provider where supported
- fallback to `wasm` or `webgpu`

### Option B - whisper.cpp WASM fallback path

Best fit for reliability and static-host simplicity.

- compile or adopt a browser-compatible whisper.cpp build
- run in worker
- use quantized small models for realistic browser delivery

### Recommended product approach

Use a hybrid design:

- primary path: ONNX Runtime Web with WebNN on supported devices
- fallback path: whisper.cpp or ONNX/WASM runtime

## 8. Service worker strategy

The service worker should:

- precache core app shell files
- cache icons, styles, and static assets
- cache model files after first successful download
- support offline app reopening
- provide version-aware cache invalidation

## 9. Storage strategy

### Cache Storage

Use for:

- app shell
- static assets
- model files

### IndexedDB

Use for:

- transcript documents
- session metadata
- settings
- model registry metadata

### Suggested document model

```json
{
  "id": "uuid",
  "title": "Session 2026-04-10 10-30",
  "createdAt": "ISO_DATE",
  "updatedAt": "ISO_DATE",
  "sourceType": "microphone",
  "backend": "webnn",
  "model": "whisper-base-en-q8",
  "language": "en",
  "text": "...",
  "segments": [],
  "durationSeconds": 0,
  "exportFormats": ["txt", "md", "json"]
}
```

## 10. Audio pipeline

### Microphone flow

```text
User grants microphone permission
  -> MediaRecorder or Web Audio capture
  -> normalize audio
  -> chunk or finalize recording
  -> send to inference adapter
  -> receive transcription result
  -> persist locally
  -> render in editor
```

### File upload flow

```text
User selects audio file
  -> decode audio
  -> normalize or resample if required
  -> send to inference adapter
  -> receive result
  -> persist locally
  -> render in editor
```

## 11. Performance model

### Use workers

Inference should execute in a Web Worker where possible so the main UI thread stays responsive.

### Warmup

On first model selection, perform a warmup run to reduce the visible delay on first real transcription.

### Model sizing

Prefer:

- tiny or small-footprint English models first
- quantized variants where accuracy remains acceptable
- optional advanced model pack later

## 12. GitHub Pages considerations

### Strengths

- ideal for static deployment
- HTTPS available
- simple repo-based publishing

### Constraints

- custom response headers are not under normal direct control
- model and asset sizes must be kept practical
- repeated model downloads can create bandwidth pressure

### Mitigation

- keep the initial model small
- cache model assets aggressively
- support optional alternate hosting for larger models later
- use cross-origin-isolation workarounds if threaded WASM is required

## 13. Security and privacy

- default to local-only processing
- avoid outbound audio transmission
- avoid analytics in the MVP unless clearly optional
- expose clear storage controls to users

## 14. UI architecture

### Recommended stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui style primitives

### Major UI modules

- App shell
- Recorder panel
- Upload panel
- Transcript editor
- Session history
- Export actions
- Diagnostics panel
- Settings modal

## 15. Suggested release roadmap

### Release 0.1

- GitHub Pages deploy
- installable PWA
- file upload transcription
- local save/export

### Release 0.2

- microphone transcription
- capability detection
- WebNN preference logic
- model cache management

### Release 0.3

- timestamped segments
- better diagnostics
- optional speaker markers
- multi-format export polish
