export interface ModelOption {
  id: string
  label: string
  description: string
}

export const modelOptions: ModelOption[] = [
  {
    id: 'whisper-small-local',
    label: 'Whisper Small Local',
    description: 'Balanced for browser-first transcription and fast warmup.'
  },
  {
    id: 'whisper-base-fast',
    label: 'Whisper Base Fast',
    description: 'Lighter model for faster startup on constrained devices.'
  },
  {
    id: 'meeting-notes-preview',
    label: 'Meeting Notes Preview',
    description: 'UI placeholder for a richer meeting-intelligence tuned model.'
  }
]
