# Quiet Scribe STT Runtime Plan

## Summary

- Current blocker: the app does not have a real transcription engine. `src/lib/transcription/*` is a mock adapter, `src/workers/transcription.worker.ts` emits scripted text, and no browser ML runtime is installed.
- The first working milestone will be `record/upload -> transcribe -> save locally`, not live partial streaming.
- The local path will support real WebNN in v1, but only through a curated WebNN Whisper model. Broader local model add/remove support will target Hugging Face ASR repos that are compatible with Transformers.js on WebGPU/WASM.
- The hosted fallback will support multiple saved OpenAI-compatible STT provider profiles, with API keys remembered locally in the browser.

## Implementation Changes

- Replace the mock runtime layer with a worker-owned engine that supports two local execution families:
  - `webnn-ort`: `onnxruntime-web/all` sessions for the curated WebNN Whisper model.
  - `hf-transformers`: `@huggingface/transformers` pipelines for Hugging Face browser-compatible ASR models on WebGPU/WASM.
- Keep `RuntimeId = 'webnn' | 'webgpu' | 'wasm'`, but stop treating it as the only model selector. Add a separate source layer so sessions record both `model source` and `execution runtime`.
- Add a curated local catalog with these built-ins:
  - `webnn/whisper-base-webnn` for WebNN only.
  - `onnx-community/whisper-tiny.en` as the default portable local model for WebGPU/WASM.
  - `onnx-community/whisper-base` as a higher-accuracy local option for stronger devices.
- Add custom local Hugging Face model registration in Settings, but only for repos that validate as browser-compatible ASR models for Transformers.js. WebNN custom-model registration stays off in v1; WebNN uses the curated `webnn/whisper-base-webnn` entry only.
- Add hosted provider profiles with an explicit v1 contract:
  - OpenAI-compatible `multipart/form-data` transcription endpoint.
  - Saved fields: profile label, base URL, model name, optional organization/header overrides, API key, and enabled state.
  - Multiple profiles can be stored, reselected, edited, removed, and chosen as the active hosted target.
- Move app settings out of `localStorage` into IndexedDB with a one-time migration from `quiet-scribe-ui-preferences`. New settings must include active target type, selected local model, selected hosted profile, selected hosted model, and existing mic/system-audio toggles.
- Extend IndexedDB with dedicated stores for `appSettings`, `providerProfiles`, `localModelEntries`, and `modelCacheMeta`. API keys are stored in IndexedDB on this device only and shown masked in the UI.
- Unify upload and microphone flows:
  - Upload keeps using the attached file blob.
  - Microphone flow records audio locally, stores it as an attachment, and sends the final blob to the worker after stop.
  - The worker normalizes audio to the local engine’s expected format before inference.
- Replace the fake segment stream with real result handling:
  - v1 stores a single transcript item for the returned transcript by default.
  - If the selected hosted provider returns segments, persist them.
  - Timestamp-rich local segmentation stays out of scope for this pass.
- Make model caching explicit:
  - For Transformers.js models, enable `env.useBrowserCache = true` and `env.useWasmCache = true`.
  - Use `ModelRegistry.is_pipeline_cached_files()` and `clear_pipeline_cache()` to drive cache status and deletion UI.
  - Track cache metadata in IndexedDB for display only; the actual model files stay in browser cache.
- Prevent duplicate model caching by narrowing the service worker:
  - Stop treating all remote `.json`, `.onnx`, and `.wasm` requests as Workbox-managed model assets.
  - Let the transcription runtime own model caching; keep Workbox focused on app shell/assets.
- Add an advanced remote-host override for local models:
  - Default source is Hugging Face Hub.
  - If direct Hub delivery is unreliable in the target browser or Pages deployment, switch local model downloads to a mirrored static host or CDN via runtime configuration instead of bundling model binaries into the repo.

## Settings and UX

- Rework Settings into three sections: `Local Models`, `Hosted Providers`, and `Runtime & Storage`.
- `Local Models` must show compatibility badges, runtime family, language scope, cache status, and actions for `Download`, `Prepare`, `Use`, and `Remove`.
- `Hosted Providers` must show saved profiles with masked keys, connection test status, selected model name, and actions for `Save`, `Use`, `Edit`, and `Forget`.
- `Runtime & Storage` must show detected WebNN/WebGPU/WASM support, active runtime, browser-cache status, and model cache controls.
- Update Home and Session so the user selects a `transcription target` instead of only a placeholder model ID.
- If the selected target is a WebNN-only local model and WebNN is unavailable, do not silently switch models. Block start with a clear message and suggest the portable local fallback `onnx-community/whisper-tiny.en`.
- If the selected target is a Transformers.js local model, runtime selection is `webgpu` first, then `wasm`.
- Status text must explicitly cover `downloading model`, `warming model`, `recording`, `transcribing`, `saved locally`, `provider auth failed`, and `switch to compatible model`.

## Test Plan

- Unit-test catalog validation for built-in and custom local models.
- Unit-test hosted-provider request building for OpenAI-compatible multipart uploads.
- Unit-test settings migration from `localStorage` to IndexedDB.
- Unit-test cache-status mapping and cache-clear actions.
- Integration-test microphone record-then-transcribe, audio upload, and hosted-provider transcription against the same session persistence path.
- Manual-test WebNN on a supported Chromium build with the WebNN flag enabled, using the curated WebNN model.
- Manual-test WebGPU and WASM fallbacks with the curated Hugging Face local models.
- Manual-test GitHub Pages deployment under the repo subpath, offline reopen after model download, and model reuse without a second download.
- Manual-test provider-profile persistence, masked key editing, 401/403 handling, and switching between multiple providers/models.

## Assumptions and Defaults

- WebNN is included in v1, but only through the curated `webnn/whisper-base-webnn` model and a direct ONNX Runtime Web path.
- The default local model is `onnx-community/whisper-tiny.en` because it is the safest browser-portable fallback.
- Saved API keys are remembered locally in IndexedDB on this device and are not passphrase-protected in v1.
- The first pass does not implement live partial transcript streaming.
- If Hugging Face direct delivery/caching is unstable in production, the fallback is a mirrored static model host, not committing model binaries into GitHub Pages.

## Primary Sources

- ONNX Runtime Web WebNN execution provider: https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html
- Transformers.js environment and browser cache controls: https://huggingface.co/docs/transformers.js/api/env
- Transformers.js model cache inspection/clearing: https://huggingface.co/docs/transformers.js/api/utils/model_registry
- WebNN Whisper model: https://hf.co/webnn/whisper-base-webnn
- Browser-local Hugging Face ASR models: https://hf.co/onnx-community/whisper-tiny.en and https://hf.co/onnx-community/whisper-base
