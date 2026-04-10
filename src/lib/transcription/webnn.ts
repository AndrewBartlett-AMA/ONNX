import { createRuntimeAdapter } from '@/lib/transcription/base'

function detectWebNNSupport() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return 'ml' in (navigator as Navigator & { ml?: unknown })
}

export const webnnRuntime = createRuntimeAdapter({
  id: 'webnn',
  label: 'WebNN',
  detectSupport: detectWebNNSupport
})
