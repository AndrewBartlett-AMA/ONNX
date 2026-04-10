# Quiet Scribe - User Interface Descriptor

## 1. UI vision

Quiet Scribe should feel like a premium, focused productivity utility:

- calm
- fast
- minimal
- polished
- trustworthy
- technical without feeling complicated

The interface should feel closer to a refined desktop tool than a generic web form.

## 2. Design direction

### Tone

- quiet confidence
- privacy-first
- modern intelligence
- minimal visual noise

### Visual style

- clean layout
- restrained color palette
- soft surface hierarchy
- rounded cards
- generous spacing
- prominent primary actions
- strong typography hierarchy

## 3. Primary screens

### A. Landing / App shell

Purpose:

- communicate what the app does immediately
- show installability and local-first promise
- direct the user to record or upload

Key elements:

- app title and short privacy statement
- primary action: start recording
- secondary action: upload audio
- install app callout
- recent transcripts preview
- backend status badge

### B. Recording screen

Purpose:

- let the user capture speech simply and confidently

Key elements:

- large microphone button
- timer and recording state
- input meter or subtle waveform
- pause, stop, cancel controls
- selected backend badge
- model badge

### C. Transcription workspace

Purpose:

- show transcript generation and editing in a focused environment

Key elements:

- transcript title field
- editable transcript area
- status strip with backend, model, duration, and save state
- right-side or bottom export actions
- clear loading and progress messaging

### D. History view

Purpose:

- let the user reopen prior transcripts stored locally

Key elements:

- searchable list of sessions
- date/time metadata
- duration and backend used
- quick actions: open, duplicate, delete, export

### E. Settings / diagnostics

Purpose:

- expose useful technical controls without cluttering main workflow

Key elements:

- backend preference
- model selection
- cache size/status
- browser capability checks
- theme selection
- storage clear actions

## 4. Layout model

### Desktop

Use a two-panel layout:

- left: actions, recorder, history navigation
- right: primary transcript workspace

### Tablet

Use a stacked but roomy layout with sticky action bar.

### Mobile

Use single-column cards with a persistent bottom action area.

## 5. Information hierarchy

The user should always know:

1. what the app is doing now
2. where the transcript is
3. whether it is saved locally
4. which backend is active
5. what action to take next

## 6. Interaction guidelines

### Primary CTA

The primary action should usually be one of:

- Start recording
- Transcribe file
- Export transcript

### Feedback

Use explicit status messaging for:

- model downloading
- model warming up
- transcribing
- saved locally
- export complete
- backend fallback triggered

### Error handling

Errors should be calm and actionable:

- WebNN unavailable - switched to fallback backend
- Model not yet cached - connect once to download
- Microphone permission denied - use file upload or enable permission

## 7. Theming

### Light theme

- white or soft neutral background
- charcoal text
- subtle gray borders
- single strong accent for actions and progress

### Dark theme

- deep charcoal or slate surfaces
- soft off-white typography
- muted contrast layers
- accent color retained for continuity

## 8. Suggested component list

- AppFrame
- TopBar
- InstallPromptCard
- BackendBadge
- ModelBadge
- RecorderCard
- UploadCard
- TranscriptEditorCard
- HistoryList
- SessionRow
- ExportMenu
- DiagnosticsDrawer
- SettingsDialog
- EmptyState
- ProgressBanner

## 9. Brand language

Suggested keywords for all UI generation tools:

- premium productivity app
- local-first AI
- private transcription workspace
- modern desktop utility
- elegant minimalism
- technical but approachable

## 10. Motion

Motion should be subtle and purposeful:

- soft fades
- light scale on card entrance
- smooth progress states
- no flashy animation

## 11. UX anti-patterns to avoid

- crowded dashboards
- too many technical toggles on first screen
- overwhelming charts or diagnostics in the main workflow
- large blocks of explanatory text
- noisy gradients that reduce readability

## 12. Desired emotional result

The user should feel:

- this is fast
- this is private
- this is under control
- this feels like a real app, not a demo
