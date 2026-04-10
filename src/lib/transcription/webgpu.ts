import { createRuntimeAdapter } from '@/lib/transcription/base'

function detectWebGPUSupport() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return 'gpu' in (navigator as Navigator & { gpu?: unknown })
}

export const webgpuRuntime = createRuntimeAdapter({
  id: 'webgpu',
  label: 'WebGPU',
  detectSupport: detectWebGPUSupport
})
