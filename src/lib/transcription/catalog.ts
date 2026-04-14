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
    supportsRealtime: false,
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
    description: 'Fastest curated English Whisper profile for browser-local realtime ASR on WebGPU or WASM.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    supportsRealtime: true,
    languageLabel: 'English',
    isDefault: true,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  },
  {
    id: 'hf-whisper-tiny',
    repoId: 'onnx-community/whisper-tiny',
    label: 'Whisper Tiny Multilingual',
    description: 'Lightweight multilingual Whisper profile for low-latency browser ASR with broader language coverage.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    supportsRealtime: true,
    languageLabel: 'Multilingual',
    isDefault: false,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  },
  {
    id: 'hf-whisper-base-en',
    repoId: 'Xenova/whisper-base.en',
    label: 'Whisper Base English',
    description: 'Sharper English-only Whisper model with better live dictation quality on stronger devices.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    supportsRealtime: true,
    languageLabel: 'English',
    isDefault: false,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  },
  {
    id: 'hf-whisper-base',
    repoId: 'onnx-community/whisper-base',
    label: 'Whisper Base',
    description: 'Balanced multilingual Whisper model for better accuracy, including browser realtime ASR on stronger devices.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    supportsRealtime: true,
    languageLabel: 'Multilingual',
    isDefault: false,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  },
  {
    id: 'hf-wav2vec2-base-960h',
    repoId: 'Xenova/wav2vec2-base-960h',
    label: 'Wav2Vec2 Base 960h',
    description: 'English CTC ASR model that can be useful for lean browser live transcription experiments.',
    sourceType: 'built-in',
    engine: 'hf-transformers',
    supportedRuntimeIds: ['webgpu', 'wasm'],
    supportsRealtime: true,
    languageLabel: 'English',
    isDefault: false,
    enabled: true,
    isCurated: true,
    createdAt: createTimestamp(),
    updatedAt: createTimestamp()
  }
]

export const defaultLocalModelId = curatedLocalModels.find((model) => model.isDefault)?.id ?? curatedLocalModels[0].id
