import { createRuntimeAdapter } from '@/lib/transcription/base'

function detectWasmSupport() {
  return typeof WebAssembly !== 'undefined'
}

export const wasmRuntime = createRuntimeAdapter({
  id: 'wasm',
  label: 'WASM',
  detectSupport: detectWasmSupport
})
