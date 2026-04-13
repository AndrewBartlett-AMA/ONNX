import type { LocalModelEntry } from '@/types/settings'

function createTimestamp() {
  return '2026-04-13T00:00:00.000Z'
}

export const curatedLocalModels: LocalModelEntry[] = [
  {
    id: 'webnn-whisper-base',
    repoId: 'webnn/whisper-base-webnn',
    label: 'Whisper Base WebNN',
    description: 'Curated WebNN Whisper model for Chromium builds with WebNN enabled.',
    sourceType: 'built-in',
    engine: 'webnn-ort',
    supportedRuntimeIds: ['webnn'],
    languageLabel: 'Multilingual',
    isDefault: false,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  },
  {
    id: 'hf-whisper-tiny-en',
    repoId: 'onnx-community/whisper-tiny.en',
    label: 'Whisper Tiny English',
    description: 'Default browser-safe local model with fast warmup for WebGPU or WASM.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    languageLabel: 'English',
    isDefault: true,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  },
  {
    id: 'hf-whisper-base',
    repoId: 'onnx-community/whisper-base',
    label: 'Whisper Base',
    description: 'Higher-accuracy local model for stronger devices using WebGPU or WASM.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    languageLabel: 'Multilingual',
    isDefault: false,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  }
]

export const defaultLocalModelId = curatedLocalModels.find((model) => model.isDefault)?.id ?? curatedLocalModels[0].id
