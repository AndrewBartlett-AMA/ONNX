import {
  createContext,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react'
import { storage } from '@/lib/storage/repositories'
import {
  seedAttachments,
  seedNotes,
  seedOutputs,
  seedProjects,
  seedSessions,
  seedTags,
  seedTranscriptItems,
  seedWorkspaces
} from '@/lib/storage/seed-data'
import { modelOptions } from '@/lib/transcription/model-options'
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

const UI_PREFERENCES_KEY = 'quiet-scribe-ui-preferences'

interface UiPreferences {
  selectedModelId: string
  microphoneEnabled: boolean
  systemAudioEnabled: boolean
}

export interface SessionDetail {
  session: Session
  workspace?: Workspace
  project?: Project
  transcriptItems: TranscriptItem[]
  notes: Note[]
  attachments: Attachment[]
  outputs: Output[]
  tags: TagTemplate[]
}

interface AppDataContextValue {
  isReady: boolean
  workspaces: Workspace[]
  projects: Project[]
  sessions: Session[]
  tags: TagTemplate[]
  uiPreferences: UiPreferences
  modelOptions: typeof modelOptions
  setSelectedModelId: (modelId: string) => void
  setMicrophoneEnabled: (enabled: boolean) => void
  setSystemAudioEnabled: (enabled: boolean) => void
  getSessionDetail: (sessionId: string) => SessionDetail | undefined
  getProjectsForWorkspace: (workspaceId: string) => Project[]
  getSessionsForProject: (projectId: string) => Session[]
  createSession: (overrides?: Partial<Session>) => Promise<Session>
  createSessionFromUpload: (file: File) => Promise<Session>
  updateSession: (sessionId: string, patch: Partial<Session>) => Promise<void>
  addTranscriptItem: (
    sessionId: string,
    input: Pick<TranscriptItem, 'text'> &
      Partial<
        Pick<
          TranscriptItem,
          'speakerLabel' | 'occurredAt' | 'tagIds' | 'startedAtMs' | 'endedAtMs' | 'confidence'
        >
      >
  ) => Promise<TranscriptItem>
  updateTranscriptItem: (itemId: string, patch: Partial<TranscriptItem>) => Promise<void>
  addNote: (
    sessionId: string,
    input?: Partial<
      Pick<Note, 'title' | 'content' | 'kind' | 'occurredAt' | 'transcriptItemIds' | 'tagIds'>
    >
  ) => Promise<Note>
  updateNote: (noteId: string, patch: Partial<Note>) => Promise<void>
  addManualNote: (sessionId: string) => Promise<Note>
  addOutput: (
    sessionId: string,
    input: Pick<Output, 'format' | 'name'> & Partial<Pick<Output, 'content' | 'contentPreview' | 'size'>>
  ) => Promise<Output>
  addAttachmentFiles: (sessionId: string, files: File[]) => Promise<Attachment[]>
  toggleTagOnItem: (
    itemType: 'transcript' | 'note',
    itemId: string,
    tagId: string
  ) => Promise<void>
}

interface AppDataState {
  workspaces: Workspace[]
  projects: Project[]
  sessions: Session[]
  transcriptItems: TranscriptItem[]
  notes: Note[]
  attachments: Attachment[]
  outputs: Output[]
  tags: TagTemplate[]
}

const defaultUiPreferences: UiPreferences = {
  selectedModelId: modelOptions[0].id,
  microphoneEnabled: true,
  systemAudioEnabled: false
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

function readUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') {
    return defaultUiPreferences
  }

  const stored = window.localStorage.getItem(UI_PREFERENCES_KEY)

  if (!stored) {
    return defaultUiPreferences
  }

  try {
    return { ...defaultUiPreferences, ...(JSON.parse(stored) as Partial<UiPreferences>) }
  } catch {
    return defaultUiPreferences
  }
}

function createEmptyState(): AppDataState {
  return {
    workspaces: [],
    projects: [],
    sessions: [],
    transcriptItems: [],
    notes: [],
    attachments: [],
    outputs: [],
    tags: []
  }
}

async function ensureSeedData() {
  const workspaceCount = await storage.workspaces.count()

  if (workspaceCount > 0) {
    return
  }

  await Promise.all([
    ...seedWorkspaces.map((item) => storage.workspaces.put(item)),
    ...seedProjects.map((item) => storage.projects.put(item)),
    ...seedSessions.map((item) => storage.sessions.put(item)),
    ...seedTranscriptItems.map((item) => storage.transcriptItems.put(item)),
    ...seedNotes.map((item) => storage.notes.put(item)),
    ...seedAttachments.map((item) => storage.attachments.put(item)),
    ...seedOutputs.map((item) => storage.outputs.put(item)),
    ...seedTags.map((item) => storage.tagTemplates.put(item))
  ])
}

async function loadAllData(): Promise<AppDataState> {
  const [workspaces, projects, sessions, transcriptItems, notes, attachments, outputs, tags] =
    await Promise.all([
      storage.workspaces.list(),
      storage.projects.list(),
      storage.sessions.list(),
      storage.transcriptItems.list(),
      storage.notes.list(),
      storage.attachments.list(),
      storage.outputs.list(),
      storage.tagTemplates.list()
    ])

  return {
    workspaces: workspaces.sort((left, right) => left.name.localeCompare(right.name)),
    projects: projects.sort((left, right) => left.name.localeCompare(right.name)),
    sessions: sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    transcriptItems: transcriptItems.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
    notes: notes.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
    attachments: attachments.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
    outputs: outputs.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt)),
    tags: tags.sort((left, right) => left.name.localeCompare(right.name))
  }
}

function createDraftSession(overrides: Partial<Session>, state: AppDataState): Session {
  const workspaceId = overrides.workspaceId ?? state.workspaces[0]?.id ?? seedWorkspaces[0].id
  const defaultProject = state.projects.find((project) => project.workspaceId === workspaceId)
  const timestamp = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    workspaceId,
    projectId: overrides.projectId ?? defaultProject?.id ?? null,
    title: overrides.title ?? 'Untitled session',
    source: overrides.source ?? 'microphone',
    status: overrides.status ?? 'draft',
    runtime: overrides.runtime ?? 'wasm',
    modelId: overrides.modelId ?? modelOptions[0].id,
    participantNames: overrides.participantNames ?? ['Host'],
    audioSources: overrides.audioSources ?? ['Microphone'],
    summary: overrides.summary ?? '',
    taskList: overrides.taskList ?? [],
    transcriptItemIds: overrides.transcriptItemIds ?? [],
    noteIds: overrides.noteIds ?? [],
    attachmentIds: overrides.attachmentIds ?? [],
    outputIds: overrides.outputIds ?? [],
    durationMs: overrides.durationMs,
    startedAt: overrides.startedAt ?? timestamp,
    endedAt: overrides.endedAt,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppDataState>(createEmptyState)
  const [isReady, setIsReady] = useState(false)
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(readUiPreferences)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      await ensureSeedData()
      const loaded = await loadAllData()

      if (!cancelled) {
        startTransition(() => {
          setState(loaded)
          setIsReady(true)
        })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(uiPreferences))
  }, [uiPreferences])

  const setSelectedModelId = useCallback((modelId: string) => {
    setUiPreferences((current) => ({ ...current, selectedModelId: modelId }))
  }, [])

  const setMicrophoneEnabled = useCallback((enabled: boolean) => {
    setUiPreferences((current) => ({ ...current, microphoneEnabled: enabled }))
  }, [])

  const setSystemAudioEnabled = useCallback((enabled: boolean) => {
    setUiPreferences((current) => ({ ...current, systemAudioEnabled: enabled }))
  }, [])

  const getProjectsForWorkspace = useCallback(
    (workspaceId: string) => state.projects.filter((project) => project.workspaceId === workspaceId),
    [state.projects]
  )

  const getSessionsForProject = useCallback(
    (projectId: string) => state.sessions.filter((session) => session.projectId === projectId),
    [state.sessions]
  )

  const getSessionDetail = useCallback(
    (sessionId: string) => {
      const session = state.sessions.find((item) => item.id === sessionId)

      if (!session) {
        return undefined
      }

      return {
        session,
        workspace: state.workspaces.find((item) => item.id === session.workspaceId),
        project: state.projects.find((item) => item.id === session.projectId),
        transcriptItems: state.transcriptItems.filter((item) => item.sessionId === sessionId),
        notes: state.notes.filter((item) => item.sessionId === sessionId),
        attachments: state.attachments.filter((item) => item.sessionId === sessionId),
        outputs: state.outputs.filter((item) => item.sessionId === sessionId),
        tags: state.tags.filter((tag) => tag.workspaceId === session.workspaceId)
      }
    },
    [state]
  )

  const createSession = useCallback(
    async (overrides: Partial<Session> = {}) => {
      const session = createDraftSession(overrides, state)
      await storage.sessions.put(session)
      setState((current) => ({
        ...current,
        sessions: [session, ...current.sessions]
      }))
      return session
    },
    [state]
  )

  const updateSession = useCallback(async (sessionId: string, patch: Partial<Session>) => {
    let nextSession: Session | undefined

    setState((current) => {
      const sessions = current.sessions.map((session) => {
        if (session.id !== sessionId) {
          return session
        }

        nextSession = { ...session, ...patch, updatedAt: new Date().toISOString() }
        return nextSession
      })

      return {
        ...current,
        sessions: sessions.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      }
    })

    if (nextSession) {
      await storage.sessions.put(nextSession)
    }
  }, [])

  const addTranscriptItem = useCallback(
    async (
      sessionId: string,
      input: Pick<TranscriptItem, 'text'> &
        Partial<
          Pick<
            TranscriptItem,
            'speakerLabel' | 'occurredAt' | 'tagIds' | 'startedAtMs' | 'endedAtMs' | 'confidence'
          >
        >
    ) => {
      const timestamp = input.occurredAt ?? new Date().toISOString()
      const session = state.sessions.find((item) => item.id === sessionId)
      const currentItems = state.transcriptItems.filter((item) => item.sessionId === sessionId)
      const transcriptItem: TranscriptItem = {
        id: crypto.randomUUID(),
        sessionId,
        sequence: currentItems.length + 1,
        text: input.text,
        speakerLabel: input.speakerLabel,
        occurredAt: timestamp,
        tagIds: input.tagIds ?? [],
        startedAtMs: input.startedAtMs,
        endedAtMs: input.endedAtMs,
        confidence: input.confidence,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      await storage.transcriptItems.put(transcriptItem)

      setState((current) => {
        const nextSession = current.sessions.find((item) => item.id === sessionId)

        if (!nextSession) {
          return current
        }

        const updatedSession = {
          ...nextSession,
          transcriptItemIds: [...nextSession.transcriptItemIds, transcriptItem.id],
          updatedAt: timestamp
        }

        return {
          ...current,
          transcriptItems: [...current.transcriptItems, transcriptItem].sort((left, right) =>
            left.occurredAt.localeCompare(right.occurredAt)
          ),
          sessions: current.sessions
            .map((item) => (item.id === sessionId ? updatedSession : item))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        }
      })

      if (session) {
        await storage.sessions.put({
          ...session,
          transcriptItemIds: [...session.transcriptItemIds, transcriptItem.id],
          updatedAt: timestamp
        })
      }

      return transcriptItem
    },
    [state.sessions, state.transcriptItems]
  )

  const updateTranscriptItem = useCallback(
    async (itemId: string, patch: Partial<TranscriptItem>) => {
      let nextItem: TranscriptItem | undefined

      setState((current) => {
        const transcriptItems = current.transcriptItems.map((item) => {
          if (item.id !== itemId) {
            return item
          }

          nextItem = { ...item, ...patch, updatedAt: new Date().toISOString() }
          return nextItem
        })

        return { ...current, transcriptItems }
      })

      if (nextItem) {
        await storage.transcriptItems.put(nextItem)
      }
    },
    []
  )

  const addNote = useCallback(
    async (
      sessionId: string,
      input: Partial<
        Pick<Note, 'title' | 'content' | 'kind' | 'occurredAt' | 'transcriptItemIds' | 'tagIds'>
      > = {}
    ) => {
      const timestamp = input.occurredAt ?? new Date().toISOString()
      const note: Note = {
        id: crypto.randomUUID(),
        sessionId,
        title: input.title ?? 'Manual note',
        content: input.content ?? '',
        kind: input.kind ?? 'freeform',
        occurredAt: timestamp,
        transcriptItemIds: input.transcriptItemIds ?? [],
        tagIds: input.tagIds ?? [],
        createdAt: timestamp,
        updatedAt: timestamp
      }

      await storage.notes.put(note)

      setState((current) => {
        const session = current.sessions.find((item) => item.id === sessionId)

        if (!session) {
          return current
        }

        const nextSession = {
          ...session,
          noteIds: [...session.noteIds, note.id],
          updatedAt: timestamp
        }

        return {
          ...current,
          notes: [...current.notes, note].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
          sessions: current.sessions
            .map((item) => (item.id === sessionId ? nextSession : item))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        }
      })

      const currentSession = state.sessions.find((item) => item.id === sessionId)

      if (currentSession) {
        await storage.sessions.put({
          ...currentSession,
          noteIds: [...currentSession.noteIds, note.id],
          updatedAt: timestamp
        })
      }

      return note
    },
    [state.sessions]
  )

  const updateNote = useCallback(async (noteId: string, patch: Partial<Note>) => {
    let nextNote: Note | undefined

    setState((current) => {
      const notes = current.notes.map((note) => {
        if (note.id !== noteId) {
          return note
        }

        nextNote = { ...note, ...patch, updatedAt: new Date().toISOString() }
        return nextNote
      })

      return { ...current, notes }
    })

    if (nextNote) {
      await storage.notes.put(nextNote)
    }
  }, [])

  const addManualNote = useCallback(async (sessionId: string) => {
    return addNote(sessionId, {
      title: 'Manual note',
      content: '',
      kind: 'freeform'
    })
  }, [addNote])

  const addOutput = useCallback(
    async (
      sessionId: string,
      input: Pick<Output, 'format' | 'name'> &
        Partial<Pick<Output, 'content' | 'contentPreview' | 'size'>>
    ) => {
      const timestamp = new Date().toISOString()
      const output: Output = {
        id: crypto.randomUUID(),
        sessionId,
        format: input.format,
        name: input.name,
        generatedAt: timestamp,
        size: input.size,
        content: input.content,
        contentPreview: input.contentPreview,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      await storage.outputs.put(output)

      setState((current) => {
        const session = current.sessions.find((item) => item.id === sessionId)

        if (!session) {
          return current
        }

        const nextSession = {
          ...session,
          outputIds: [...session.outputIds, output.id],
          updatedAt: timestamp
        }

        return {
          ...current,
          outputs: [output, ...current.outputs].sort((left, right) =>
            right.generatedAt.localeCompare(left.generatedAt)
          ),
          sessions: current.sessions
            .map((item) => (item.id === sessionId ? nextSession : item))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        }
      })

      const currentSession = state.sessions.find((item) => item.id === sessionId)

      if (currentSession) {
        await storage.sessions.put({
          ...currentSession,
          outputIds: [...currentSession.outputIds, output.id],
          updatedAt: timestamp
        })
      }

      return output
    },
    [state.sessions]
  )

  const addAttachmentFiles = useCallback(
    async (sessionId: string, files: File[]) => {
      const createdAttachments: Attachment[] = files.map((file) => {
        const timestamp = new Date().toISOString()
        const isImage = file.type.startsWith('image/')
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

        return {
          id: crypto.randomUUID(),
          sessionId,
          kind: isImage ? 'image' : isPdf ? 'pdf' : file.type.startsWith('audio/') ? 'audio' : 'document',
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          occurredAt: timestamp,
          blob: file,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      })

      await Promise.all(createdAttachments.map((attachment) => storage.attachments.put(attachment)))

      const attachmentIds = createdAttachments.map((attachment) => attachment.id)

      setState((current) => {
        const session = current.sessions.find((item) => item.id === sessionId)

        if (!session) {
          return current
        }

        const nextSession = {
          ...session,
          attachmentIds: [...session.attachmentIds, ...attachmentIds],
          updatedAt: new Date().toISOString()
        }

        return {
          ...current,
          attachments: [...current.attachments, ...createdAttachments].sort((left, right) =>
            left.occurredAt.localeCompare(right.occurredAt)
          ),
          sessions: current.sessions
            .map((item) => (item.id === sessionId ? nextSession : item))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        }
      })

      const session = state.sessions.find((item) => item.id === sessionId)

      if (session) {
        await storage.sessions.put({
          ...session,
          attachmentIds: [...session.attachmentIds, ...attachmentIds],
          updatedAt: new Date().toISOString()
        })
      }

      return createdAttachments
    },
    [state.sessions]
  )

  const toggleTagOnItem = useCallback(
    async (itemType: 'transcript' | 'note', itemId: string, tagId: string) => {
      if (itemType === 'transcript') {
        const item = state.transcriptItems.find((entry) => entry.id === itemId)

        if (!item) {
          return
        }

        const tagIds = item.tagIds.includes(tagId)
          ? item.tagIds.filter((entry) => entry !== tagId)
          : [...item.tagIds, tagId]

        await updateTranscriptItem(itemId, { tagIds })
        return
      }

      const note = state.notes.find((entry) => entry.id === itemId)

      if (!note) {
        return
      }

      const tagIds = note.tagIds.includes(tagId)
        ? note.tagIds.filter((entry) => entry !== tagId)
        : [...note.tagIds, tagId]

      await updateNote(itemId, { tagIds })
    },
    [state.notes, state.transcriptItems, updateNote, updateTranscriptItem]
  )

  const createSessionFromUpload = useCallback(
    async (file: File) => {
      const session = await createSession({
        title: file.name.replace(/\.[^.]+$/, ''),
        source: 'upload',
        audioSources: [file.name],
        status: 'draft'
      })

      await addAttachmentFiles(session.id, [file])
      return session
    },
    [addAttachmentFiles, createSession]
  )

  const value = useMemo<AppDataContextValue>(
    () => ({
      isReady,
      workspaces: state.workspaces,
      projects: state.projects,
      sessions: state.sessions,
      tags: state.tags,
      uiPreferences,
      modelOptions,
      setSelectedModelId,
      setMicrophoneEnabled,
      setSystemAudioEnabled,
      getSessionDetail,
      getProjectsForWorkspace,
      getSessionsForProject,
      createSession,
      createSessionFromUpload,
      updateSession,
      addTranscriptItem,
      updateTranscriptItem,
      addNote,
      updateNote,
      addManualNote,
      addOutput,
      addAttachmentFiles,
      toggleTagOnItem
    }),
    [
      addAttachmentFiles,
      addManualNote,
      addNote,
      addOutput,
      addTranscriptItem,
      createSession,
      createSessionFromUpload,
      getProjectsForWorkspace,
      getSessionDetail,
      getSessionsForProject,
      isReady,
      setMicrophoneEnabled,
      setSelectedModelId,
      setSystemAudioEnabled,
      state.projects,
      state.sessions,
      state.tags,
      state.workspaces,
      toggleTagOnItem,
      uiPreferences,
      updateNote,
      updateSession,
      updateTranscriptItem
    ]
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export { AppDataContext }
