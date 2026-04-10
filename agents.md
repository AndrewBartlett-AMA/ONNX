# AGENTS.md

## Project

Quiet Scribe

## Mission

Build a local-first PWA transcription app that runs on GitHub Pages and supports browser-based local transcription runtimes.

## Stack

- React
- TypeScript
- Vite
- Tailwind
- shadcn/ui

## Product priorities

1. Premium UX
2. Static-host deployment compatibility
3. Offline-first behavior
4. Local persistence
5. Modular transcription runtime abstraction
6. Clean exports

## Coding rules

- Keep modules small and composable
- Prefer typed utilities and reusable hooks
- Do not tightly couple UI to a single STT backend
- Keep GitHub Pages compatibility in mind
- Preserve a polished UX at all times
- Use clear naming and low-complexity patterns

## Workflow

- Read docs before changing architecture
- Summarize plan before major refactors
- Leave concise notes for incomplete work
- Prefer incremental, testable progress
