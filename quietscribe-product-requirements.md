# Quiet Scribe - Product Requirements Document

## 1. Product summary

Quiet Scribe is a browser-based speech-to-text application that runs locally on the user's machine, can be installed as a Progressive Web App, and is deployable from a static host such as GitHub Pages.

The product is intended to provide private, fast, installable transcription for users who prefer local inference and offline-capable workflows.

## 2. Objectives

### Business objectives

- prove a browser-first transcription product can feel native and fast
- create a deployable MVP with no mandatory backend
- leverage local AI acceleration on supported hardware
- reduce privacy concerns by keeping audio processing on-device

### User objectives

- install the app easily
- record speech or upload audio
- receive fast transcription
- edit transcript comfortably
- save work without needing an account
- export transcript in useful formats

## 3. Target users

- solo professionals
- meeting note takers
- workshop or field users capturing verbal notes
- privacy-conscious users
- users with modern Windows devices and Intel acceleration support

## 4. Core use cases

1. User opens Quiet Scribe from browser or installed PWA.
2. User records from microphone or selects an audio file.
3. App transcribes locally using the best available inference backend.
4. User reviews and edits the transcript.
5. User saves the transcript locally.
6. User downloads transcript in preferred format.

## 5. Functional requirements

### FR-1 Installable PWA

The application must:

- provide a valid web app manifest
- register a service worker
- be installable from supported Chromium browsers
- function as a standalone app window after installation

### FR-2 Static-host deployment

The application must:

- build to static assets only
- run from GitHub Pages without a custom backend
- support a repository subpath deployment if required

### FR-3 Offline-capable shell

The application must:

- cache its application shell for offline launch
- cache core UI assets and icons
- allow access to previously downloaded models where feasible
- gracefully indicate when a model is not yet cached

### FR-4 Audio input

The application must support:

- microphone recording
- upload of common audio formats
- basic recording controls such as start, stop, cancel, and retry

### FR-5 Local transcription engine

The application must:

- run inference locally in browser
- prefer WebNN where supported
- support at least one fallback backend when WebNN is unavailable
- support English at minimum in the MVP
- support model selection appropriate to device capability

### FR-6 Transcript editing

The application must provide:

- readable transcript display
- manual editing
- copy to clipboard
- basic find or search within transcript in later phases

### FR-7 Local persistence

The application must:

- store transcripts locally in browser storage
- restore prior transcript sessions on the same device
- allow deletion of saved sessions

### FR-8 Export and download

The application must support export to:

- TXT
- Markdown
- JSON
- SRT in a later or near-term phase when timestamps are available

### FR-9 Settings and diagnostics

The application should provide:

- selected backend information
- model information
- cache status
- browser capability status
- storage usage estimate where possible

## 6. Non-functional requirements

### Performance

- app shell should load quickly from cache after initial install
- first transcription should begin as soon as the model is available
- UI must remain responsive during transcription
- heavy transcription tasks should execute in workers where possible

### Privacy

- no audio should be uploaded by default
- transcripts remain local unless the user explicitly exports them
- no account should be required for MVP operation

### Reliability

- app should continue functioning offline after initial setup
- failures in preferred backend should degrade cleanly to fallback engines when configured

### Usability

- interface should be simple enough for non-technical users
- important actions must be visible and clear
- progress, loading, and error states must be understandable

### Accessibility

- keyboard navigation support
- accessible labels for controls
- strong contrast in light and dark themes
- scalable typography

## 7. Technical requirements

- static hosting compatible
- PWA manifest and service worker
- IndexedDB for transcript persistence
- browser-based model loading and caching
- support for WebNN experimentation on supported browsers
- fallback execution path using WebGPU or WASM

## 8. Constraints

- GitHub Pages site size and bandwidth should be respected
- some hardware acceleration paths may require Canary browsers and enabled flags
- cross-origin isolation may be needed for high-performance threading scenarios
- initial model download size must be carefully controlled

## 9. MVP scope

### Included

- installable PWA
- GitHub Pages deployment
- microphone/file transcription
- local transcript save
- local download/export
- backend status display
- polished single-user UI

### Excluded

- user accounts
- cloud sync
- enterprise collaboration
- guaranteed real-time streaming accuracy
- large-model hosting strategy beyond initial practical limits

## 10. Success criteria

- app installs successfully as a PWA
- app launches offline after first load
- user can transcribe speech locally
- user can save and export transcript without backend dependency
- supported Intel/WebNN devices show materially better performance when WebNN is available
