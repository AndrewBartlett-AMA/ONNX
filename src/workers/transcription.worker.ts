export type TranscriptionWorkerMessage =
  | {
      type: 'warmup'
      runtime: 'webnn' | 'webgpu' | 'wasm'
      modelId?: string
    }
  | {
      type: 'transcribe-file'
      runtime: 'webnn' | 'webgpu' | 'wasm'
      sessionId: string
    }
  | {
      type: 'dispose'
      runtime: 'webnn' | 'webgpu' | 'wasm'
    }

export {}
