import type { RuntimeId, RuntimeSnapshot } from '@/types/transcription'
import { wasmRuntime } from '@/lib/transcription/wasm'
import { webgpuRuntime } from '@/lib/transcription/webgpu'
import { webnnRuntime } from '@/lib/transcription/webnn'

export const runtimeOrder: RuntimeId[] = ['webnn', 'webgpu', 'wasm']
export const runtimeLabels: Record<RuntimeId, string> = {
  webnn: 'WebNN',
  webgpu: 'WebGPU',
  wasm: 'WASM'
}

const runtimes = {
  webnn: webnnRuntime,
  webgpu: webgpuRuntime,
  wasm: wasmRuntime
} as const

export function getRuntimeById(runtimeId: RuntimeId) {
  return runtimes[runtimeId]
}

export async function getRuntimeSnapshot(): Promise<RuntimeSnapshot> {
  const capabilitiesEntries = await Promise.all(
    runtimeOrder.map(async (runtimeId) => [
      runtimeId,
      await runtimes[runtimeId].getCapabilities()
    ] as const)
  )

  const statusesEntries = await Promise.all(
    runtimeOrder.map(async (runtimeId) => [runtimeId, await runtimes[runtimeId].getStatus()] as const)
  )

  const capabilities = Object.fromEntries(capabilitiesEntries) as RuntimeSnapshot['capabilities']
  const statuses = Object.fromEntries(statusesEntries) as RuntimeSnapshot['statuses']
  const availableRuntimeIds = runtimeOrder.filter((runtimeId) => capabilities[runtimeId].supported)

  return {
    preferredRuntime: availableRuntimeIds[0] ?? 'wasm',
    availableRuntimeIds,
    capabilities,
    statuses
  }
}
