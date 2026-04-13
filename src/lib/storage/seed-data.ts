import type {
  Attachment,
  Note,
  Output,
  Project,
  Session,
  TagTemplate,
  TranscriptItem,
  Workspace
} from '@/types/domain'

const workspaceId = 'workspace-product'
const secondaryWorkspaceId = 'workspace-research'
const projectId = 'project-phoenix'
const secondaryProjectId = 'project-interviews'

const actionTagId = 'tag-action'
const insightTagId = 'tag-insight'
const quoteTagId = 'tag-quote'
const followUpTagId = 'tag-followup'

const now = '2026-04-10T09:45:00.000Z'

function createSvgDataUrl(title: string, subtitle: string, accent: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <rect width="1200" height="720" fill="#f7f8fa"/>
      <rect x="64" y="64" width="1072" height="592" rx="36" fill="#ffffff"/>
      <rect x="112" y="128" width="976" height="180" rx="28" fill="${accent}" opacity="0.12"/>
      <rect x="112" y="352" width="640" height="26" rx="13" fill="#d7dce4"/>
      <rect x="112" y="404" width="840" height="18" rx="9" fill="#e4e8ef"/>
      <rect x="112" y="442" width="760" height="18" rx="9" fill="#e4e8ef"/>
      <rect x="112" y="480" width="620" height="18" rx="9" fill="#e4e8ef"/>
      <text x="112" y="198" fill="#0f1720" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="700">${title}</text>
      <text x="112" y="250" fill="#4a5565" font-family="Inter, Arial, sans-serif" font-size="28">${subtitle}</text>
    </svg>
  `)}`
}

export const seedWorkspaces: Workspace[] = [
  {
    id: workspaceId,
    name: 'Product Engineering',
    description: 'Planning, roadmap, and delivery conversations.',
    themeColor: '#2563eb',
    createdAt: now,
    updatedAt: now
  },
  {
    id: secondaryWorkspaceId,
    name: 'Research Studio',
    description: 'Customer interviews and qualitative synthesis.',
    themeColor: '#b45309',
    createdAt: now,
    updatedAt: now
  }
]

export const seedTags: TagTemplate[] = [
  {
    id: actionTagId,
    workspaceId,
    name: 'Action',
    emoji: '✅',
    color: '#2563eb',
    description: 'Captures action items and ownership.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: insightTagId,
    workspaceId,
    name: 'Insight',
    emoji: '💡',
    color: '#7c3aed',
    description: 'Key synthesis or observation.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: quoteTagId,
    workspaceId,
    name: 'Quote',
    emoji: '🗣️',
    color: '#0f766e',
    description: 'A notable quote worth carrying forward.',
    createdAt: now,
    updatedAt: now
  },
  {
    id: followUpTagId,
    workspaceId,
    name: 'Follow-up',
    emoji: '📌',
    color: '#c2410c',
    description: 'Needs a follow-up after the meeting.',
    createdAt: now,
    updatedAt: now
  }
]

export const seedProjects: Project[] = [
  {
    id: projectId,
    workspaceId,
    name: 'Phoenix Rollout',
    description: 'Migration workstream and launch coordination.',
    defaultTagTemplateIds: [actionTagId, insightTagId, quoteTagId, followUpTagId],
    createdAt: now,
    updatedAt: now
  },
  {
    id: secondaryProjectId,
    workspaceId: secondaryWorkspaceId,
    name: 'Research Archive',
    description: 'Interviews, notes, and evidence collection.',
    defaultTagTemplateIds: [],
    createdAt: now,
    updatedAt: now
  }
]

export const seedSessions: Session[] = [
  {
    id: 'session-phoenix-sync',
    workspaceId,
    projectId,
    title: 'Phoenix rollout sync',
    source: 'system-audio',
    status: 'completed',
    runtime: 'wasm',
    targetType: 'local',
    targetId: 'hf-whisper-tiny-en',
    modelId: 'onnx-community/whisper-tiny.en',
    participantNames: ['Jordan Dale', 'Sarah Chen', 'Priya Kapoor'],
    audioSources: ['Zoom virtual audio', 'Desk microphone'],
    summary:
      'The team aligned on the staging latency issue, agreed to prioritize query optimization, and captured a supporting dashboard screenshot plus the latest migration brief.',
    taskList: [
      { id: 'task-1', label: 'Review database query plan for ticket #402', completed: false },
      { id: 'task-2', label: 'Validate Redis cache settings in staging', completed: true },
      { id: 'task-3', label: 'Attach rollout brief to workspace notes', completed: false }
    ],
    transcriptItemIds: ['transcript-1', 'transcript-2', 'transcript-3'],
    noteIds: ['note-1', 'note-2'],
    attachmentIds: ['attachment-image-1', 'attachment-pdf-1'],
    outputIds: ['output-1', 'output-2'],
    durationMs: 3120000,
    startedAt: '2026-04-10T08:00:00.000Z',
    endedAt: '2026-04-10T08:52:00.000Z',
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T09:20:00.000Z'
  },
  {
    id: 'session-user-interview',
    workspaceId: secondaryWorkspaceId,
    projectId: secondaryProjectId,
    title: 'Customer interview: Sarah Jenkins',
    source: 'microphone',
    status: 'completed',
    runtime: 'wasm',
    targetType: 'local',
    targetId: 'hf-whisper-base',
    modelId: 'onnx-community/whisper-base',
    participantNames: ['Elena Vance', 'Sarah Jenkins'],
    audioSources: ['USB microphone'],
    summary: 'Customer feedback focused on clarity, reduced clutter, and stronger hierarchy.',
    taskList: [{ id: 'task-4', label: 'Pull three representative quotes into design review', completed: false }],
    transcriptItemIds: [],
    noteIds: [],
    attachmentIds: [],
    outputIds: [],
    durationMs: 1510000,
    startedAt: '2026-04-09T13:00:00.000Z',
    endedAt: '2026-04-09T13:25:10.000Z',
    createdAt: '2026-04-09T13:00:00.000Z',
    updatedAt: '2026-04-09T14:00:00.000Z'
  },
  {
    id: 'session-design-review',
    workspaceId,
    projectId,
    title: 'Design review: sanctuary theme',
    source: 'upload',
    status: 'completed',
    runtime: 'webgpu',
    targetType: 'local',
    targetId: 'hf-whisper-base',
    modelId: 'onnx-community/whisper-base',
    participantNames: ['Ariana Moss', 'Noah Patel', 'Jordan Dale'],
    audioSources: ['Uploaded M4A'],
    summary: 'Design review focused on spacing, tonal depth, and the no-line layout rule.',
    taskList: [{ id: 'task-5', label: 'Refine metadata inspector spacing before handoff', completed: true }],
    transcriptItemIds: [],
    noteIds: [],
    attachmentIds: [],
    outputIds: [],
    durationMs: 2140000,
    startedAt: '2026-04-08T10:30:00.000Z',
    endedAt: '2026-04-08T11:05:40.000Z',
    createdAt: '2026-04-08T10:30:00.000Z',
    updatedAt: '2026-04-08T12:00:00.000Z'
  }
]

export const seedTranscriptItems: TranscriptItem[] = [
  {
    id: 'transcript-1',
    sessionId: 'session-phoenix-sync',
    sequence: 1,
    text: 'We are still seeing latency spikes in staging, so the immediate priority is query optimization before the next rollout window.',
    speakerLabel: 'Jordan Dale',
    occurredAt: '2026-04-10T08:02:00.000Z',
    tagIds: [insightTagId],
    createdAt: '2026-04-10T08:02:00.000Z',
    updatedAt: '2026-04-10T08:02:00.000Z'
  },
  {
    id: 'transcript-2',
    sessionId: 'session-phoenix-sync',
    sequence: 2,
    text: 'I captured the dashboard during the spike, and the database call time jumps sharply while cache hit rate drops.',
    speakerLabel: 'Sarah Chen',
    occurredAt: '2026-04-10T08:07:00.000Z',
    tagIds: [quoteTagId],
    createdAt: '2026-04-10T08:07:00.000Z',
    updatedAt: '2026-04-10T08:07:00.000Z'
  },
  {
    id: 'transcript-3',
    sessionId: 'session-phoenix-sync',
    sequence: 3,
    text: 'Let’s move ticket #402 into the current sprint and make sure the rollout brief reflects the mitigation plan.',
    speakerLabel: 'Priya Kapoor',
    occurredAt: '2026-04-10T08:12:00.000Z',
    tagIds: [actionTagId, followUpTagId],
    createdAt: '2026-04-10T08:12:00.000Z',
    updatedAt: '2026-04-10T08:12:00.000Z'
  }
]

export const seedNotes: Note[] = [
  {
    id: 'note-1',
    sessionId: 'session-phoenix-sync',
    title: 'Manual note',
    content: 'Sarah will own the Redis validation and post the findings in the Phoenix workspace before end of day.',
    kind: 'action-item',
    occurredAt: '2026-04-10T08:10:00.000Z',
    transcriptItemIds: ['transcript-2'],
    tagIds: [actionTagId],
    createdAt: '2026-04-10T08:10:00.000Z',
    updatedAt: '2026-04-10T08:10:00.000Z'
  },
  {
    id: 'note-2',
    sessionId: 'session-phoenix-sync',
    title: 'Decision',
    content: 'The rollout brief should include dashboard evidence so the mitigation plan is visible to leadership.',
    kind: 'decision',
    occurredAt: '2026-04-10T08:15:00.000Z',
    transcriptItemIds: ['transcript-3'],
    tagIds: [insightTagId],
    createdAt: '2026-04-10T08:15:00.000Z',
    updatedAt: '2026-04-10T08:15:00.000Z'
  }
]

export const seedAttachments: Attachment[] = [
  {
    id: 'attachment-image-1',
    sessionId: 'session-phoenix-sync',
    kind: 'image',
    name: 'staging-latency-dashboard.png',
    mimeType: 'image/svg+xml',
    size: 32800,
    occurredAt: '2026-04-10T08:08:00.000Z',
    previewUrl: createSvgDataUrl('Staging latency spike', 'Dashboard snapshot captured during the call', '#2563eb'),
    createdAt: '2026-04-10T08:08:00.000Z',
    updatedAt: '2026-04-10T08:08:00.000Z'
  },
  {
    id: 'attachment-pdf-1',
    sessionId: 'session-phoenix-sync',
    kind: 'pdf',
    name: 'phoenix-rollout-brief.pdf',
    mimeType: 'application/pdf',
    size: 512000,
    occurredAt: '2026-04-10T08:18:00.000Z',
    createdAt: '2026-04-10T08:18:00.000Z',
    updatedAt: '2026-04-10T08:18:00.000Z'
  }
]

export const seedOutputs: Output[] = [
  {
    id: 'output-1',
    sessionId: 'session-phoenix-sync',
    format: 'md',
    name: 'phoenix-sync-summary.md',
    generatedAt: '2026-04-10T09:00:00.000Z',
    size: 2800,
    contentPreview: 'Summary, tasks, and key decisions captured for the workspace.',
    createdAt: '2026-04-10T09:00:00.000Z',
    updatedAt: '2026-04-10T09:00:00.000Z'
  },
  {
    id: 'output-2',
    sessionId: 'session-phoenix-sync',
    format: 'json',
    name: 'phoenix-sync-structured.json',
    generatedAt: '2026-04-10T09:02:00.000Z',
    size: 4200,
    contentPreview: 'Structured session artifact ready for future automation.',
    createdAt: '2026-04-10T09:02:00.000Z',
    updatedAt: '2026-04-10T09:02:00.000Z'
  }
]
