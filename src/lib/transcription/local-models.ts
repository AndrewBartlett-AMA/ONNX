import { ModelRegistry, env } from '@huggingface/transformers'
import type { LocalModelEntry } from '@/types/settings'
import type { RuntimeId } from '@/types/transcription'

const HF_REPO_ID_PATTERN = /^[\w.-]+\/[\w.-]+$/

export function validateCustomLocalModelRepoId(repoId: string) {
  const trimmed = repoId.trim()

  if (!HF_REPO_ID_PATTERN.test(trimmed)) {
    throw new Error('Use a Hugging Face repo id in the form author/name.')
  }

  return trimmed
}

export function resolveLocalModelRuntime(model: LocalModelEntry, availableRuntimeIds: RuntimeId[]) {
  if (model.engine === 'webnn-ort') {
    return availableRuntimeIds.includes('webnn') ? 'webnn' : null
  }

  if (availableRuntimeIds.includes('webgpu')) {
    return 'webgpu'
  }

  if (availableRuntimeIds.includes('wasm')) {
    return 'wasm'
  }

  return null
}

export async function inspectTransformersJsCache(
  model: LocalModelEntry,
  runtime: RuntimeId,
  remoteHostOverride?: string
) {
  env.allowRemoteModels = true
  env.allowLocalModels = false
  env.useBrowserCache = true
  env.useWasmCache = true

  if (remoteHostOverride?.trim()) {
    env.remoteHost = remoteHostOverride.trim().replace(/\/$/, '')
  }

  const status = await ModelRegistry.is_pipeline_cached_files('automatic-speech-recognition', model.repoId, {
    device: runtime === 'webgpu' ? 'webgpu' : 'wasm'
  })

  return {
    filesCached: status.files.filter((file) => file.cached).length,
    totalFiles: status.files.length,
    allCached: status.allCached,
    detail: status.files.map((file) => `${file.file}:${file.cached ? 'cached' : 'missing'}`).join(', ')
  }
}

export async function clearTransformersJsCache(
  model: LocalModelEntry,
  runtime: RuntimeId,
  remoteHostOverride?: string
) {
  env.allowRemoteModels = true
  env.allowLocalModels = false
  env.useBrowserCache = true
  env.useWasmCache = true

  if (remoteHostOverride?.trim()) {
    env.remoteHost = remoteHostOverride.trim().replace(/\/$/, '')
  }

  return ModelRegistry.clear_pipeline_cache('automatic-speech-recognition', model.repoId, {
    device: runtime === 'webgpu' ? 'webgpu' : 'wasm'
  })
}
